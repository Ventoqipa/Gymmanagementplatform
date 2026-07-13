import type { AuthenticatedUser, SignInSuccessData } from "./types";

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
): string {
  const value = readField(raw, pascal, camel);
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readNumber(raw: Record<string, unknown>, pascal: string, camel: string): number {
  const value = readField(raw, pascal, camel);
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function readBool(raw: Record<string, unknown>, pascal: string, camel: string): boolean {
  const value = readField(raw, pascal, camel);
  return value === true;
}

/** Unifica PascalCase/camelCase del SignIn → sesión interna estable. */
export function normalizeSignInSession(rawInput: unknown): SignInSuccessData {
  const raw =
    rawInput && typeof rawInput === "object"
      ? (rawInput as Record<string, unknown>)
      : {};

  const token = readString(raw, "Token", "token");
  const duration = readString(raw, "Duration", "duration");

  const userRaw = readField(raw, "AuthenticatedUser", "authenticatedUser");
  const userObj =
    userRaw && typeof userRaw === "object"
      ? (userRaw as Record<string, unknown>)
      : {};

  const authenticatedUser: AuthenticatedUser = {
    hermesID: readString(userObj, "HermesID", "hermesID"),
    userFullName: readString(userObj, "UserFullName", "userFullName"),
    email: readString(userObj, "Email", "email"),
    companyID: readNumber(userObj, "CompanyID", "companyID"),
    companyName: readString(userObj, "CompanyName", "companyName"),
    regimenCapitalID: readNumber(userObj, "RegimenCapitalID", "regimenCapitalID"),
    regimenCapitalName: readString(userObj, "RegimenCapitalName", "regimenCapitalName"),
    isPersonaFisica: readBool(userObj, "IsPersonaFisica", "isPersonaFisica"),
    namePersonResponsible: readString(userObj, "NamePersonResponsible", "namePersonResponsible"),
    logo: readString(userObj, "Logo", "logo"),
    extensionName: readString(userObj, "ExtensionName", "extensionName"),
    branchID: readNumber(userObj, "BranchID", "branchID"),
    branchName: readString(userObj, "BranchName", "branchName"),
    statusID: readNumber(userObj, "StatusID", "statusID"),
    statusName: readString(userObj, "StatusName", "statusName"),
    isEnabled: readBool(userObj, "IsEnabled", "isEnabled"),
    companyBranches: [],
    companyProfiles: [],
    profilesUser: [],
  };

  return {
    token,
    duration,
    authenticatedUser,
  };
}
