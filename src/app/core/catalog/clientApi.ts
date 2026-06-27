import { catalogConfig, catalogUrl } from "../../config/catalog";
import { catalogRequest } from "./catalogApiClient";
import { mapListItemsToCatalogClients } from "./mappers/clientListMapper";
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
    : "-";
  const docBase64 = hasPhoto ? dataUrlToBase64(input.idDocumentDataUrl!) : "-";

  const renewalIso = toIsoDateTime(input.renewalDate);

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

    email: dashStr(email),
    phoneCodeNumber: phoneCode,
    phoneNumber: phone,
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
  };
}

function isCatalogClient(value: unknown): value is CatalogClient {
  return (
    value !== null &&
    typeof value === "object" &&
    "clientID" in value &&
    ("planID" in value || "DateEnrollment" in value || "enrollment" in value)
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
