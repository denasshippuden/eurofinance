import type { FinanceUser } from "@/lib/types";

export const AUTH_COOKIE = "financeos_session";
export const AUTH_STORAGE_KEY = "financeos:user";

export type AuthUser = FinanceUser;

export function getAuthProvider() {
  return process.env.NEXT_PUBLIC_AUTH_PROVIDER === "supabase" ? "supabase" : "local";
}
