import { getSessionUserId } from "../auth/authStorage";
import { catalogConfig, catalogUrl } from "../../config/catalog";
import { catalogRequest } from "./catalogApiClient";
import { mapListItemsToCatalogClients } from "./mappers/clientListMapper";
import {
  buildPhotoClientIdFileName,
  dataUrlToBase64,
} from "./utils/clientPhoto";
import { encodeEmergencyPhone } from "./utils/emergencyPhone";
import type {
  AddClientInput,
  CatalogClient,
  CatalogClientListData,
  CatalogClientListItem,
  UpdateClientInput,
} from "./types";

function toIsoDateTime(dateIso: string): string {
  return new Date(`${dateIso}T12:00:00`).toISOString();
}

function dashStr(value?: string | null): string {
  const v = value?.trim();
  return v ? v : "-";
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function nationalPhoneNumber(phoneNumber: string, phoneCodeNumber: string): string {
  const code = phoneCodeNumber.trim().replace(/\D/g, "");
  let digits = phoneNumber.trim().replace(/\D/g, "");
  if (code && digits.startsWith(code)) {
    digits = digits.slice(code.length);
  }
  return digits;
}

export type BuildClientScope = {
  companyId: number;
  branchId: number;
  clientId?: number;
  mode?: "add" | "update";
  existing?: Pick<
    CatalogClient,
    "userAdded" | "dateAdded" | "userEdited" | "dateEdited"
  >;
};

/**
 * JSON Client para POST /Add y PUT /Update.
 * Solo valores del formulario; el resto "-" (string) o 0 (numérico requerido).
 */
export function buildClientPayload(
  input: AddClientInput,
  scope: BuildClientScope,
): CatalogClient {
  const isAdd = scope.mode !== "update";
  const clientId = scope.clientId ?? 0;
  const nowIso = new Date().toISOString();
  const sessionUserId = getSessionUserId() || "-";

  const firstName = input.firstName.trim().slice(0, 50);
  const lastName = input.lastName.trim().slice(0, 50);
  const email = input.email?.trim();
  const phoneCode = input.phoneCodeNumber.trim().replace(/\D/g, "").slice(0, 5);
  const phone = nationalPhoneNumber(input.phoneNumber, phoneCode);
  const fullName = buildFullName(firstName, lastName);
  const fullAddress = dashStr(input.fullAddress);

  const dateAdded = isAdd ? nowIso : scope.existing?.dateAdded ?? nowIso;
  const userAdded = isAdd ? sessionUserId : scope.existing?.userAdded ?? sessionUserId;

  const hasPhoto = Boolean(input.idDocumentDataUrl?.trim());
  const photoFileName = hasPhoto
    ? buildPhotoClientIdFileName(fullName, input.enrollmentDate)
    : "-";
  const photoBase64 = hasPhoto
    ? dataUrlToBase64(input.idDocumentDataUrl!)
    : "-";

  return {
    isEnabled: true,
    isNew: isAdd,
    userAdded,
    dateAdded,
    userEdited: sessionUserId,
    dateEdited: nowIso,

    clientID: clientId,
    companyID: scope.companyId,
    branchID: scope.branchId,

    rfc: "-",
    curp: "-",
    fullName,
    firstName,
    middleName:
      encodeEmergencyPhone(
        input.emergencyPhoneCodeNumber ?? "",
        input.emergencyPhoneNumber ?? "",
      ) ?? "-",
    lastName,

    countryID: catalogConfig.defaults.countryId,
    stateID: catalogConfig.defaults.stateId,
    municipalityID: catalogConfig.defaults.municipalityId,

    email: dashStr(email),
    phoneNumber: phone,
    phoneCodeNumber: phoneCode || "-",

    photoClientIDFileName: photoFileName,
    photoClientIDBase64: photoBase64,

    statusID: catalogConfig.defaults.statusId,
    fullAddress,

    planID: input.planID,
    enrollment: toIsoDateTime(input.enrollmentDate),
    renewal: toIsoDateTime(input.renewalDate),
  };
}

function isCatalogClient(value: unknown): value is CatalogClient {
  return (
    value !== null &&
    typeof value === "object" &&
    "clientID" in value &&
    "planID" in value
  );
}

function normalizeClientList(
  data: unknown,
  scope: { companyId: number; branchId: number },
): CatalogClient[] {
  if (Array.isArray(data)) {
    if (data.length > 0 && isCatalogClient(data[0])) {
      return data as CatalogClient[];
    }
    return mapListItemsToCatalogClients(data as CatalogClientListItem[], scope);
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const genericList = obj.genericList ?? obj.GenericList;
    if (Array.isArray(genericList)) {
      return mapListItemsToCatalogClients(
        genericList as CatalogClientListItem[],
        scope,
      );
    }
    for (const key of ["items", "clients", "list"]) {
      if (Array.isArray(obj[key])) {
        const arr = obj[key] as unknown[];
        if (arr.length > 0 && isCatalogClient(arr[0])) {
          return arr as CatalogClient[];
        }
        return mapListItemsToCatalogClients(arr as CatalogClientListItem[], scope);
      }
    }
    if (isCatalogClient(data)) {
      return [data];
    }
  }

  return [];
}

export async function fetchClientsList(
  companyId: number,
  branchId: number,
): Promise<CatalogClient[]> {
  const data = await catalogRequest<CatalogClientListData | CatalogClient[] | unknown>({
    method: "GET",
    url: catalogUrl(catalogConfig.paths.listAll(companyId, branchId)),
  });
  return normalizeClientList(data, { companyId, branchId });
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
