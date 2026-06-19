import { getSessionUserId } from "../auth/authStorage";
import { catalogConfig, catalogUrl } from "../../config/catalog";
import { catalogRequest } from "./catalogApiClient";
import type { AddClientInput, CatalogClient, UpdateClientInput } from "./types";

function toIsoDateTime(dateIso: string): string {
  return new Date(`${dateIso}T12:00:00`).toISOString();
}

function emptyStr(value?: string | null): string {
  return value?.trim() ?? "";
}

function strOrDash(value?: string | null, maxLen?: number): string {
  const result = emptyStr(value) || "-";
  return maxLen ? result.slice(0, maxLen) : result;
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export type BuildClientScope = {
  companyId: number;
  branchId: number;
  clientId?: number;
  /** Alta (POST) o edición (PUT). */
  mode?: "add" | "update";
  /** Auditoría previa al actualizar. */
  existing?: Pick<
    CatalogClient,
    "userAdded" | "dateAdded" | "userEdited" | "dateEdited"
  >;
};

/**
 * Arma el JSON completo de Client para POST /Add y PUT /Update.
 * Los campos sin equivalente en el formulario se envían vacíos o con valor por defecto.
 */
export function buildClientPayload(
  input: AddClientInput,
  scope: BuildClientScope,
): CatalogClient {
  const isAdd = scope.mode !== "update";
  const clientId = scope.clientId ?? 0;
  const nowIso = new Date().toISOString();
  const sessionUserId = getSessionUserId();

  const firstName = input.firstName.trim().slice(0, 50);
  const lastName = input.lastName.trim().slice(0, 50);
  const email = emptyStr(input.email);
  const phone = input.phoneNumber.trim();
  const street = emptyStr(input.street).slice(0, 250);
  const colony = strOrDash(input.colony, 250);
  const zip = emptyStr(input.zip);
  const fullAddress = strOrDash(input.fullAddress ?? input.street, 250);
  const photo =
    emptyStr(input.photoFileName) || catalogConfig.defaults.photoPlaceholder;

  const dateAdded = isAdd ? nowIso : scope.existing?.dateAdded ?? nowIso;
  const userAdded = sessionUserId;
  const userEdited = sessionUserId;

  return {
    isEnabled: true,
    isNew: isAdd,
    userAdded,
    dateAdded,
    userEdited,
    dateEdited: dateAdded,

    clientID: clientId,
    companyID: scope.companyId,
    branchID: scope.branchId,

    isPersonaFisica: true,
    nombreDenominacionRazonSocial: "-",
    fullName: buildFullName(firstName, lastName),

    firstName,
    lastName,
    regimenCapitalID: 0,

    email,
    isEmailFavorite: false,
    phoneNumber: phone,
    isPhoneFavorite: true,

    countryID: catalogConfig.defaults.countryId,
    stateID: catalogConfig.defaults.stateId,
    municipalityID: catalogConfig.defaults.municipalityId,

    street,
    colony,
    zip,
    fullAddress,

    statusID: catalogConfig.defaults.statusId,
    enrollment: toIsoDateTime(input.enrollmentDate),
    renewal: toIsoDateTime(input.renewalDate),

    photoClientIdentificationFileName: photo,
  };
}

function normalizeClientList(data: unknown): CatalogClient[] {
  if (Array.isArray(data)) return data as CatalogClient[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "clients", "list", "data"]) {
      if (Array.isArray(obj[key])) return obj[key] as CatalogClient[];
    }
  }
  return [];
}

export async function fetchClientsList(
  companyId: number,
  branchId: number,
): Promise<CatalogClient[]> {
  const data = await catalogRequest<unknown>({
    method: "GET",
    url: catalogUrl(catalogConfig.paths.listAll(companyId, branchId)),
  });
  return normalizeClientList(data);
}

export async function fetchClientById(clientId: number): Promise<CatalogClient> {
  return catalogRequest<CatalogClient>({
    method: "GET",
    url: catalogUrl(catalogConfig.paths.getData(clientId)),
  });
}

export async function postClientAdd(
  payload: CatalogClient,
): Promise<CatalogClient> {
  const data = await catalogRequest<CatalogClient | unknown>({
    method: "POST",
    url: catalogUrl(catalogConfig.paths.add),
    body: payload,
  });
  if (data && typeof data === "object" && "clientID" in data) {
    return data as CatalogClient;
  }
  return payload;
}

export async function putClientUpdate(
  payload: CatalogClient,
): Promise<CatalogClient> {
  const data = await catalogRequest<CatalogClient | unknown>({
    method: "PUT",
    url: catalogUrl(catalogConfig.paths.update),
    body: payload,
  });
  if (data && typeof data === "object" && "clientID" in data) {
    return data as CatalogClient;
  }
  return payload;
}

export async function deleteClientById(clientId: number): Promise<void> {
  await catalogRequest<unknown>({
    method: "DELETE",
    url: catalogUrl(catalogConfig.paths.delete(clientId)),
  });
}

export function buildUpdatePayload(
  input: UpdateClientInput,
  scope: { companyId: number; branchId: number; existing?: CatalogClient },
): CatalogClient {
  return buildClientPayload(input, {
    companyId: scope.companyId,
    branchId: scope.branchId,
    clientId: input.clientID,
    mode: "update",
    existing: scope.existing,
  });
}
