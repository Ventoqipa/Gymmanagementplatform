import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  clearSession,
  getAuthenticatedUser,
  loadStoredSession,
  persistSession,
} from "../core/auth/authStorage";
import { signInUseCase } from "../core/auth/signInUseCase";
import type { AuthenticatedUser, SignInSession } from "../core/auth/types";

export type LoginResult = {
  success: boolean;
  error?: string;
};

interface AuthContextType {
  isAuthenticated: boolean;
  session: SignInSession | null;
  user: AuthenticatedUser | null;
  login: (
    usuario: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SignInSession | null>(() =>
    loadStoredSession(),
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const login = useCallback(
    async (
      usuario: string,
      password: string,
      rememberMe = false,
    ): Promise<LoginResult> => {
      const result = await signInUseCase({
        hermesID: usuario,
        userPass: password,
      });

      if (!result.ok) {
        return { success: false, error: result.message };
      }

      const sessionWithUser: SignInSession = {
        ...result.session,
        authenticatedUser: {
          ...result.session.authenticatedUser,
          hermesID:
            result.session.authenticatedUser?.hermesID?.trim() || usuario.trim(),
          userFullName:
            result.session.authenticatedUser?.userFullName?.trim() ||
            result.session.authenticatedUser?.hermesID?.trim() ||
            usuario.trim(),
        },
      };

      persistSession(sessionWithUser, { rememberMe });
      setSession(sessionWithUser);
      return { success: true };
    },
    [],
  );

  const user = session?.authenticatedUser ?? getAuthenticatedUser();

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(session?.token),
        session,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
