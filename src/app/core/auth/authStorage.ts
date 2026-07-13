import type { AuthenticatedUser, SignInSession } from "./types";

const TOKEN_KEY = "auth_token";
const SESSION_KEY = "auth_session";
const COMPANY_ID_KEY = "auth_company_id";
const BRANCH_ID_KEY = "auth_branch_id";
const USER_ID_KEY = "auth_user_id";
const USER_NAME_KEY = "auth_user_name";
const REMEMBER_KEY = "auth_remember_me";
const AUTH_FLAG_KEY = "isAuthenticated";

type StorageScope = Storage;

function rememberMeEnabled(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

function primaryStorage(): StorageScope {
  return rememberMeEnabled() ? localStorage : sessionStorage;
}

function allStorages(): StorageScope[] {
  return rememberMeEnabled()
    ? [localStorage, sessionStorage]
    : [sessionStorage, localStorage];
}

function readJsonSession(storage: StorageScope): SignInSession | null {
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as SignInSession;
    if (!session?.token?.trim()) return null;
    return session;
  } catch {
    return null;
  }
}

export function loadStoredSession(): SignInSession | null {
  for (const storage of allStorages()) {
    const session = readJsonSession(storage);
    if (session) return session;
  }
  return null;
}

export function persistSession(
  session: SignInSession,
  options: { rememberMe: boolean },
): void {
  clearSession();

  const storage = options.rememberMe ? localStorage : sessionStorage;
  const companyId = session.authenticatedUser?.companyID;
  const branchId = session.authenticatedUser?.branchID;
  const userId = session.authenticatedUser?.hermesID?.trim();
  const userName = session.authenticatedUser?.userFullName?.trim();

  storage.setItem(TOKEN_KEY, session.token);
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  storage.setItem(AUTH_FLAG_KEY, "true");

  if (userId) {
    storage.setItem(USER_ID_KEY, userId);
  }
  if (userName) {
    storage.setItem(USER_NAME_KEY, userName);
  }

  if (companyId != null) {
    storage.setItem(COMPANY_ID_KEY, String(companyId));
  }
  if (branchId != null) {
    storage.setItem(BRANCH_ID_KEY, String(branchId));
  }

  if (options.rememberMe) {
    localStorage.setItem(REMEMBER_KEY, "true");
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export function clearSession(): void {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(SESSION_KEY);
    storage.removeItem(COMPANY_ID_KEY);
    storage.removeItem(BRANCH_ID_KEY);
    storage.removeItem(USER_ID_KEY);
    storage.removeItem(USER_NAME_KEY);
    storage.removeItem(AUTH_FLAG_KEY);
  }
  localStorage.removeItem(REMEMBER_KEY);
}

export function getAuthToken(): string | null {
  for (const storage of allStorages()) {
    const token = storage.getItem(TOKEN_KEY);
    if (token?.trim()) return token;
  }
  return null;
}

export function getCompanyId(): number | null {
  for (const storage of allStorages()) {
    const raw = storage.getItem(COMPANY_ID_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  const fromUser = loadStoredSession()?.authenticatedUser?.companyID;
  return fromUser != null && fromUser > 0 ? fromUser : null;
}

export function getBranchId(): number | null {
  for (const storage of allStorages()) {
    const raw = storage.getItem(BRANCH_ID_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  const fromUser = loadStoredSession()?.authenticatedUser?.branchID;
  return fromUser != null && fromUser > 0 ? fromUser : null;
}

export function isRememberMeEnabled(): boolean {
  return rememberMeEnabled();
}

export function getAuthenticatedUser(): AuthenticatedUser | null {
  return loadStoredSession()?.authenticatedUser ?? null;
}

/** Identificador del usuario con sesión iniciada (hermesID del SignIn). */
export function getSessionUserId(): string {
  for (const storage of allStorages()) {
    const fromKey = storage.getItem(USER_ID_KEY)?.trim();
    if (fromKey) return fromKey;
  }
  return loadStoredSession()?.authenticatedUser?.hermesID?.trim() ?? "";
}

/** Nombre completo del usuario con sesión iniciada (userFullName del SignIn). */
export function getSessionUserName(): string {
  for (const storage of allStorages()) {
    const fromKey = storage.getItem(USER_NAME_KEY)?.trim();
    if (fromKey) return fromKey;
  }
  return loadStoredSession()?.authenticatedUser?.userFullName?.trim() ?? "";
}

/** Usuario de caja que registra la venta (payer en POS). */
export function getSessionPayer(): { id: string; name: string } | null {
  const id = getSessionUserId();
  const name = getSessionUserName();
  if (!id && !name) return null;
  return { id, name: name || id };
}
