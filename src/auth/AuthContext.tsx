import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./context";

function mensagemErro(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Ocorreu um erro. Tente novamente.";
}

function resolverStatus(session: Session | null): AuthStatus {
  return session ? "ready" : "signedOut";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      setStatus(resolverStatus(data.session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!ativo) return;
      setSession(newSession);
      setStatus(resolverStatus(newSession));
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(emailArg: string, password: string): Promise<void> {
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: emailArg,
      password,
    });
    if (err) {
      setError(mensagemErro(err));
      throw err;
    }
    setSession(data.session);
    setStatus(resolverStatus(data.session));
  }

  async function signOut(): Promise<void> {
    setError(null);
    await supabase.auth.signOut();
    setSession(null);
    setStatus("signedOut");
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      email: session?.user.email ?? null,
      error,
      signIn,
      signOut,
      clearError: () => setError(null),
    }),
    [status, session, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
