import { createLocalStorageRepository } from "@/lib/data/local-storage-repository";
import type { FinanceRepository } from "@/lib/data/finance-repository";
import { createSupabaseRepository } from "@/lib/data/supabase-repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function createFinanceRepository(): FinanceRepository {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase") {
    const client = getSupabaseBrowserClient();

    if (client) {
      return createSupabaseRepository(client);
    }
  }

  return createLocalStorageRepository();
}
