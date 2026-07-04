import { createLocalStorageRepository } from "@/lib/data/local-storage-repository";
import type { FinanceRepository } from "@/lib/data/finance-repository";
import { createSupabaseRepository } from "@/lib/data/supabase-repository";
import type { AuthUser } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveAppUser } from "@/lib/users";

export function createFinanceRepository(user: AuthUser | null): FinanceRepository {
  const actor = user ?? resolveAppUser("admin@financeos.local", "Usuario master");

  if (process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase") {
    const client = getSupabaseBrowserClient();

    if (client) {
      return createSupabaseRepository(client, actor);
    }
  }

  return createLocalStorageRepository(actor);
}
