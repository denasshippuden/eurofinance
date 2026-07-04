"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_COOKIE, AUTH_STORAGE_KEY, type AuthUser, getAuthProvider } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveAppUser } from "@/lib/users";
import type { UserRole } from "@/lib/types";

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

function getStringMetadata(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getRoleMetadata(metadata: Record<string, unknown> | null | undefined) {
  const role = getStringMetadata(metadata, "role");
  return role === "master" || role === "member" ? (role as UserRole) : undefined;
}

function toAuthUser(email: string, fallbackName?: string, metadata?: Record<string, unknown> | null): AuthUser {
  return resolveAppUser(email, fallbackName, {
    id: getStringMetadata(metadata, "app_user_id"),
    groupId: getStringMetadata(metadata, "group_id"),
    groupName: getStringMetadata(metadata, "group_name"),
    role: getRoleMetadata(metadata)
  });
}

function normalizeStoredUser(user: Partial<AuthUser> | null): AuthUser | null {
  if (!user?.email) {
    return null;
  }

  return toAuthUser(user.email, user.name);
}

function hasSessionCookie() {
  return document.cookie.split("; ").some((cookie) => cookie.startsWith(`${AUTH_COOKIE}=`));
}

function getFallbackLocalUser(): AuthUser {
  return toAuthUser("admin@financeos.local", "Usuário master");
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
            setUser(
              toAuthUser(
                data.user.email,
                data.user.user_metadata?.name ?? getDisplayName(data.user.email),
                data.user.user_metadata
              )
            );
            setSessionCookie();
          }

          const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user.email) {
              setUser(
                toAuthUser(
                  session.user.email,
                  session.user.user_metadata?.name ?? getDisplayName(session.user.email),
                  session.user.user_metadata
                )
              );
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
          const storedUser = normalizeStoredUser(JSON.parse(stored) as Partial<AuthUser>);

          if (!storedUser) {
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
            clearSessionCookie();
            return;
          }

          setUser(storedUser);
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedUser));
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

          const signedUser = toAuthUser(
            data.user.email,
            data.user.user_metadata?.name ?? getDisplayName(data.user.email),
            data.user.user_metadata
          );
          setUser(signedUser);
          setSessionCookie();
          return { ok: true };
        }

        const localUser = toAuthUser(email, getDisplayName(email));
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
