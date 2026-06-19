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

function mockEnrollmentIso(clientId: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - (clientId % 6) - 1);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function mockRenewalIso(clientId: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + (clientId % 8) + 1);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/** Completa campos ausentes en el listado resumido (solo lectura en UI). */
export function mapListItemToCatalogClient(
  item: CatalogClientListItem,
  scope: { companyId: number; branchId: number },
): CatalogClient {
  const clientId = Number(readItemField(item, "ClientID", "clientID")) || 0;
  const fullName = String(readItemField(item, "FullName", "fullName") ?? "").trim();
  const isEnabled = readItemField(item, "IsEnabled", "isEnabled") !== false;
  const { firstName, lastName } = splitFullName(fullName || "Sin nombre");

  const phoneSuffix = String(clientId).padStart(4, "0");
  const nowIso = new Date().toISOString();

  return {
    isEnabled,
    isNew: false,
    userAdded: "-",
    dateAdded: mockEnrollmentIso(clientId),
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

    email: `cliente${clientId}@elitegym.mx`,
    phoneNumber: `555100${phoneSuffix}`,
    phoneCodeNumber: "52",

    photoClientIDFileName: "-",
    photoClientIDBase64: "-",

    statusID: catalogConfig.defaults.statusId,
    fullAddress: "-",

    planID: 0,
    enrollment: mockEnrollmentIso(clientId),
    renewal: mockRenewalIso(clientId),
  };
}

export function mapListItemsToCatalogClients(
  items: CatalogClientListItem[],
  scope: { companyId: number; branchId: number },
): CatalogClient[] {
  return items.map((item) => mapListItemToCatalogClient(item, scope));
}
