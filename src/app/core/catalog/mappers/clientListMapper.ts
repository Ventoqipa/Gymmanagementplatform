import { catalogConfig } from "../../../config/catalog";
import type { CatalogClient, CatalogClientListItem } from "../types";

function readItemField(
  item: CatalogClientListItem,
  pascal: keyof CatalogClientListItem,
  camel: keyof CatalogClientListItem,
): unknown {
  const raw = item as Record<string, unknown>;
  return raw[pascal as string] ?? raw[camel as string];
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "—", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** Fallback si el API devuelve listado resumido (ListAll) en lugar de ViewAll. */
export function mapListItemToCatalogClient(
  item: CatalogClientListItem,
  scope: { companyId: number; branchId: number },
): CatalogClient {
  const clientId = Number(readItemField(item, "ClientID", "clientID")) || 0;
  const fullName = String(readItemField(item, "FullName", "fullName") ?? "").trim();
  const isEnabled = readItemField(item, "IsEnabled", "isEnabled") !== false;
  const { firstName, lastName } = splitFullName(fullName || "Sin nombre");
  const nowIso = new Date().toISOString();

  return {
    isEnabled,
    isNew: false,
    userAdded: "-",
    dateAdded: nowIso,
    userEdited: "-",
    dateEdited: nowIso,

    clientID: clientId,
    companyID: scope.companyId,
    branchID: scope.branchId,

    rfc: "-",
    curp: "-",
    fullName: fullName || `${firstName} ${lastName}`.trim(),
    firstName,
    middleName: "-",
    lastName,

    countryID: catalogConfig.defaults.countryId,
    stateID: catalogConfig.defaults.stateId,
    municipalityID: catalogConfig.defaults.municipalityId,

    email: "-",
    phoneNumber: "-",
    phoneCodeNumber: "-",

    statusID: catalogConfig.defaults.statusId,
    fullAddress: "-",

    planID: 0,
    DateEnrollment: nowIso,
    DateRenewal: nowIso,
    phoneCodeNumberEmergency: "-",
    phoneNumberEmergency: "-",
    DocFileName: null,
    DocExtensionName: "-",
    DocBase64: "-",
  };
}

export function mapListItemsToCatalogClients(
  items: CatalogClientListItem[],
  scope: { companyId: number; branchId: number },
): CatalogClient[] {
  return items.map((item) => mapListItemToCatalogClient(item, scope));
}
