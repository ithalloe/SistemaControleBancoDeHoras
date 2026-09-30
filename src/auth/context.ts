import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

/**
 * Estados de autenticação:
 * - loading: ainda verificando a sessão inicial
 * - signedOut: sem sessão
 * - ready: autenticado (e-mail + senha)
 */
export type AuthStatus = "loading" | "signedOut" | "ready";

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  email: string | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}
