"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_COOKIE, AUTH_STORAGE_KEY, type AuthUser, getAuthProvider } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface LoginResult {
  ok: boolean;
  message?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login(email: string, password: string): Promise<LoginResult>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function setSessionCookie() {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE}=active; Path=/; Max-Age=2592000; SameSite=Lax${secure}`;
}

function clearSessionCookie() {
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function getDisplayName(email: string) {
  return email.split("@")[0]?.replace(/[._-]/g, " ") || "Usuário";
}

function hasSessionCookie() {
  return document.cookie.split("; ").some((cookie) => cookie.startsWith(`${AUTH_COOKIE}=`));
}

function getFallbackLocalUser(): AuthUser {
  return {
    email: "admin@financeos.local",
    name: "admin"
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authProvider = getAuthProvider();

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        if (authProvider === "supabase") {
          const supabase = getSupabaseBrowserClient();

          if (!supabase) {
            return;
          }

          const { data } = await supabase.auth.getUser();

          if (mounted && data.user?.email) {
            setUser({
              email: data.user.email,
              name: data.user.user_metadata?.name ?? getDisplayName(data.user.email)
            });
            setSessionCookie();
          }

          const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user.email) {
              setUser({
                email: session.user.email,
                name: session.user.user_metadata?.name ?? getDisplayName(session.user.email)
              });
              setSessionCookie();
            } else {
              setUser(null);
              clearSessionCookie();
            }
          });

          return () => listener.subscription.unsubscribe();
        }

        const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);

        if (stored) {
          setUser(JSON.parse(stored) as AuthUser);
          setSessionCookie();
          return;
        }

        if (hasSessionCookie()) {
          const fallbackUser = getFallbackLocalUser();
          setUser(fallbackUser);
          try {
            window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fallbackUser));
          } catch {
            setSessionCookie();
          }
        }
      } catch {
        if (authProvider === "local" && hasSessionCookie()) {
          setUser(getFallbackLocalUser());
        } else {
          clearSessionCookie();
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    const cleanupPromise = loadSession();

    return () => {
      mounted = false;
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [authProvider]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email: string, password: string) {
        if (!email.includes("@")) {
          return { ok: false, message: "Informe um email válido." };
        }

        if (password.length < 6) {
          return { ok: false, message: "A senha precisa ter pelo menos 6 caracteres." };
        }

        if (authProvider === "supabase") {
          const supabase = getSupabaseBrowserClient();

          if (!supabase) {
            return { ok: false, message: "Configure as variáveis do Supabase para entrar." };
          }

          const { data, error } = await supabase.auth.signInWithPassword({ email, password });

          if (error || !data.user?.email) {
            return { ok: false, message: error?.message ?? "Não foi possível entrar." };
          }

          const signedUser = {
            email: data.user.email,
            name: data.user.user_metadata?.name ?? getDisplayName(data.user.email)
          };
          setUser(signedUser);
          setSessionCookie();
          return { ok: true };
        }

        const localUser = { email, name: getDisplayName(email) };
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(localUser));
        setUser(localUser);
        setSessionCookie();
        return { ok: true };
      },
      async logout() {
        if (authProvider === "supabase") {
          await getSupabaseBrowserClient()?.auth.signOut();
        }

        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        clearSessionCookie();
        setUser(null);
      }
    }),
    [authProvider, loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa estar dentro de AuthProvider.");
  }

  return context;
}
