import { catalogConfig, catalogUrl } from "../../config/catalog";
import { catalogRequest } from "./catalogApiClient";
import { mapListItemsToCatalogClients } from "./mappers/clientListMapper";
import {
  isFullCatalogClient,
  normalizeCatalogClient,
} from "./mappers/normalizeCatalogClient";
import { dataUrlToBase64, dataUrlToExtension } from "./utils/clientPhoto";
import type {
  AddClientInput,
  CatalogClient,
  CatalogClientListData,
  CatalogClientListItem,
  CatalogClientWritePayload,
  UpdateClientInput,
} from "./types";

function toIsoDateTime(dateIso: string): string {
  return new Date(`${dateIso}T12:00:00`).toISOString();
}

/** Vencimiento: último día del mes de la fecha de renovación. */
function expirationFromRenewalIso(renewalDateIso: string): string {
  const d = new Date(`${renewalDateIso}T12:00:00`);
  d.setMonth(d.getMonth() + 1, 0);
  return toIsoDateTime(d.toISOString().slice(0, 10));
}

function dashStr(value?: string | null): string {
  const v = value?.trim();
  return v ? v : "-";
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function formatPhoneCode(phoneCodeNumber: string): string {
  const digits = phoneCodeNumber.trim().replace(/\D/g, "");
  return digits ? `+${digits}` : "-";
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
};

/**
 * JSON Client para POST /Add y PUT /Update.
 * DocFileName vacío/nulo (lo genera el API); teléfono de emergencia en campos dedicados.
 */
export function buildClientPayload(
  input: AddClientInput,
  scope: BuildClientScope,
): CatalogClientWritePayload {
  const clientId = scope.clientId ?? 0;

  const firstName = input.firstName.trim().slice(0, 50);
  const lastName = input.lastName.trim().slice(0, 50);
  const email = input.email?.trim();
  const phoneCode = formatPhoneCode(input.phoneCodeNumber);
  const phone = nationalPhoneNumber(input.phoneNumber, input.phoneCodeNumber);
  const fullName = buildFullName(firstName, lastName);
  const fullAddress = dashStr(input.fullAddress);

  const emergencyNationalRaw = input.emergencyPhoneNumber?.trim() ?? "";
  const emergencyNational = emergencyNationalRaw
    ? nationalPhoneNumber(
        emergencyNationalRaw,
        input.emergencyPhoneCodeNumber ?? input.phoneCodeNumber,
      )
    : "";
  const emergencyCode = emergencyNational
    ? formatPhoneCode(input.emergencyPhoneCodeNumber ?? input.phoneCodeNumber)
    : "-";

  const hasPhoto = Boolean(input.idDocumentDataUrl?.trim());
  const docExtension = hasPhoto
    ? dataUrlToExtension(input.idDocumentDataUrl!)
    : null;
  const docBase64 = hasPhoto ? dataUrlToBase64(input.idDocumentDataUrl!) : null;

  const renewalIso = toIsoDateTime(input.renewalDate);
  const isDirectDebit = Boolean(input.isDirectDebit);

  return {
    clientID: clientId,
    companyID: scope.companyId,
    branchID: scope.branchId,

    rfc: "-",
    curp: "-",
    fullName,
    firstName,
    middleName: "-",
    lastName,

    countryID: catalogConfig.defaults.countryId,
    stateID: catalogConfig.defaults.stateId,
    municipalityID: catalogConfig.defaults.municipalityId,

    email: email ?? "",
    phoneCodeNumber: phone ? phoneCode : emergencyNational ? emergencyCode : phoneCode,
    phoneNumber: phone || "-",
    phoneCodeNumberEmergency: emergencyCode,
    phoneNumberEmergency: emergencyNational || "-",

    statusID: catalogConfig.defaults.statusId,
    fullAddress,

    planID: input.planID,
    DateEnrollment: toIsoDateTime(input.enrollmentDate),
    DateRenewal: renewalIso,
    DateExpiration: expirationFromRenewalIso(input.renewalDate),

    DocFileName: null,
    DocExtensionName: docExtension,
    DocBase64: docBase64,

    isDirectDebit,
    priceRegular: Math.max(0, input.priceRegular ?? 0),
    priceDirectDebit: Math.max(0, input.priceDirectDebit ?? 0),
    isPromotionalSubscription: Boolean(input.isPromotionalSubscription),
    priceSubscription: Math.max(0, input.priceSubscription ?? 200),
    priceBranchFrequencyID: Math.max(1, input.priceBranchFrequencyID ?? 1),

    ...(input.faceID != null && String(input.faceID).trim()
      ? { faceID: String(input.faceID).trim() }
      : {}),
    ...(input.memberID != null && String(input.memberID).trim()
      ? { memberID: String(input.memberID).trim() }
      : {}),
  };
}

function normalizeClientList(
  data: unknown,
  scope: { companyId: number; branchId: number },
): CatalogClient[] {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    if (isFullCatalogClient(data[0])) {
      return data.map(normalizeCatalogClient);
    }
    return mapListItemsToCatalogClients(data as CatalogClientListItem[], scope);
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const genericList = obj.genericList ?? obj.GenericList;
    if (Array.isArray(genericList)) {
      if (genericList.length > 0 && isFullCatalogClient(genericList[0])) {
        return genericList.map(normalizeCatalogClient);
      }
      return mapListItemsToCatalogClients(
        genericList as CatalogClientListItem[],
        scope,
      );
    }
    for (const key of ["items", "clients", "client", "list"]) {
      if (Array.isArray(obj[key])) {
        const arr = obj[key] as unknown[];
        if (arr.length > 0 && isFullCatalogClient(arr[0])) {
          return arr.map(normalizeCatalogClient);
        }
        return mapListItemsToCatalogClients(arr as CatalogClientListItem[], scope);
      }
    }
    if (isFullCatalogClient(data)) {
      return [normalizeCatalogClient(data)];
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
    url: catalogUrl(catalogConfig.paths.viewAll(companyId, branchId)),
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
  payload: CatalogClientWritePayload,
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
  payload: CatalogClientWritePayload,
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
  scope: { companyId: number; branchId: number },
): CatalogClientWritePayload {
  return buildClientPayload(input, {
    companyId: scope.companyId,
    branchId: scope.branchId,
    clientId: input.clientID,
  });
}
