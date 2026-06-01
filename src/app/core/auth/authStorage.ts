import type { AuthenticatedUser, SignInSession } from "./types";

const TOKEN_KEY = "auth_token";
const SESSION_KEY = "auth_session";
const AUTH_FLAG_KEY = "isAuthenticated";

export function loadStoredSession(): SignInSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as SignInSession;
    if (!session?.token?.trim()) return null;
    return session;
  } catch {
    return null;
  }
}

export function persistSession(session: SignInSession): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(AUTH_FLAG_KEY, "true");
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(AUTH_FLAG_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthenticatedUser(): AuthenticatedUser | null {
  return loadStoredSession()?.authenticatedUser ?? null;
}
