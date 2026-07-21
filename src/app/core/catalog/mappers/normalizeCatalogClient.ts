import type { CatalogClient } from "../types";

function readField(
  raw: Record<string, unknown>,
  pascal: string,
  camel: string,
): unknown {
  return raw[pascal] ?? raw[camel];
}

function readString(
  raw: Record<string, unknown>,
  pascal: string,
  camel: string,
): string | undefined {
  const value = readField(raw, pascal, camel);
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function readNumber(
  raw: Record<string, unknown>,
  pascal: string,
  camel: string,
): number | undefined {
  const value = readField(raw, pascal, camel);
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function readBool(
  raw: Record<string, unknown>,
  pascal: string,
  camel: string,
): boolean | undefined {
  const value = readField(raw, pascal, camel);
  if (typeof value === "boolean") return value;
  return undefined;
}

/** Unifica PascalCase/camelCase del API ViewAll → CatalogClient interno. */
export function normalizeCatalogClient(rawInput: unknown): CatalogClient {
  const raw =
    rawInput && typeof rawInput === "object"
      ? (rawInput as Record<string, unknown>)
      : {};

  const clientID = readNumber(raw, "ClientID", "clientID") ?? 0;

  return {
    isEnabled: readBool(raw, "IsEnabled", "isEnabled"),
    isNew: readBool(raw, "IsNew", "isNew"),
    userAdded: readString(raw, "UserAdded", "userAdded") ?? null,
    dateAdded: readString(raw, "DateAdded", "dateAdded") ?? null,
    userEdited: readString(raw, "UserEdited", "userEdited") ?? null,
    dateEdited: readString(raw, "DateEdited", "dateEdited") ?? null,

    clientID,
    companyID: readNumber(raw, "CompanyID", "companyID"),
    branchID: readNumber(raw, "BranchID", "branchID"),

    rfc: readString(raw, "Rfc", "rfc"),
    curp: readString(raw, "Curp", "curp"),
    fullName: readString(raw, "FullName", "fullName"),
    firstName: readString(raw, "FirstName", "firstName"),
    middleName: readString(raw, "MiddleName", "middleName"),
    lastName: readString(raw, "LastName", "lastName"),

    countryID: readNumber(raw, "CountryID", "countryID"),
    stateID: readNumber(raw, "StateID", "stateID"),
    municipalityID: readNumber(raw, "MunicipalityID", "municipalityID"),

    email: readString(raw, "Email", "email"),
    phoneCodeNumber: readString(raw, "PhoneCodeNumber", "phoneCodeNumber"),
    phoneNumber: readString(raw, "PhoneNumber", "phoneNumber"),
    phoneCodeNumberEmergency: readString(
      raw,
      "PhoneCodeNumberEmergency",
      "phoneCodeNumberEmergency",
    ),
    phoneNumberEmergency: readString(
      raw,
      "PhoneNumberEmergency",
      "phoneNumberEmergency",
    ),

    statusID: readNumber(raw, "StatusID", "statusID"),
    fullAddress: readString(raw, "FullAddress", "fullAddress"),

    planID: readNumber(raw, "PlanID", "planID"),
    DateEnrollment:
      readString(raw, "DateEnrollment", "dateEnrollment") ??
      readString(raw, "Enrollment", "enrollment"),
    DateRenewal:
      readString(raw, "DateRenewal", "dateRenewal") ??
      readString(raw, "Renewal", "renewal") ??
      null,
    DateExpiration: readString(raw, "DateExpiration", "dateExpiration"),

    DocFileName:
      (readString(raw, "DocFileName", "docFileName") as string | null) ?? null,
    DocExtensionName: readString(raw, "DocExtensionName", "docExtensionName"),
    DocBase64: readString(raw, "DocBase64", "docBase64"),

    isDirectDebit: readBool(raw, "IsDirectDebit", "isDirectDebit"),
    priceRegular:
      readNumber(raw, "PriceRegular", "priceRegular") ??
      readNumber(raw, "RegularPrice", "regularPrice"),
    priceDirectDebit:
      readNumber(raw, "PriceDirectDebit", "priceDirectDebit") ??
      readNumber(raw, "DirectDebitPrice", "directDebitPrice"),
    isPromotionalSubscription: readBool(
      raw,
      "IsPromotionalSubscription",
      "isPromotionalSubscription",
    ),
    priceSubscription: readNumber(
      raw,
      "PriceSubscription",
      "priceSubscription",
    ),
    priceBranchFrequencyID: readNumber(
      raw,
      "PriceBranchFrequencyID",
      "priceBranchFrequencyID",
    ),

    memberID: readString(raw, "MemberID", "memberID"),
    faceID: readString(raw, "FaceID", "faceID"),
  };
}

export function isFullCatalogClient(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  const hasId = "clientID" in raw || "ClientID" in raw;
  const hasDetail =
    "planID" in raw ||
    "PlanID" in raw ||
    "dateEnrollment" in raw ||
    "DateEnrollment" in raw ||
    "enrollment" in raw ||
    "phoneNumber" in raw ||
    "PhoneNumber" in raw ||
    "email" in raw ||
    "Email" in raw;
  return hasId && hasDetail;
}
