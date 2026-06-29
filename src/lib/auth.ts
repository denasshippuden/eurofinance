export const AUTH_COOKIE = "financeos_session";
export const AUTH_STORAGE_KEY = "financeos:user";

export interface AuthUser {
  email: string;
  name: string;
}

export function getAuthProvider() {
  return process.env.NEXT_PUBLIC_AUTH_PROVIDER === "supabase" ? "supabase" : "local";
}
