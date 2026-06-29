import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinanceRepository } from "@/lib/data/finance-repository";
import { expenseCategories, incomeSources } from "@/lib/constants";
import { createMockSnapshot } from "@/lib/mock-data";
import type { Category, Currency, FinanceSnapshot, Profile, ThemePreference, Transaction, TransactionDraft } from "@/lib/types";

type TransactionRow = {
  id: string;
  user_id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  currency: Currency;
  category: string;
  payment_method: string | null;
  source: string | null;
  notes: string | null;
  date: string;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  name: string;
  default_currency: Currency;
  theme: ThemePreference;
  created_at: string;
};

type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense" | "both";
  created_at: string;
};

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    paymentMethod: row.payment_method ?? undefined,
    source: row.source ?? undefined,
    notes: row.notes ?? undefined,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    defaultCurrency: row.default_currency,
    theme: row.theme,
    createdAt: row.created_at
  };
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    createdAt: row.created_at
  };
}

function toTransactionRow(input: TransactionDraft, userId: string) {
  return {
    user_id: userId,
    type: input.type,
    description: input.description,
    amount: input.amount,
    currency: input.currency,
    category: input.category,
    payment_method: input.paymentMethod ?? null,
    source: input.source ?? null,
    notes: input.notes ?? null,
    date: input.date
  };
}

async function getUserId(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Error("Sessão Supabase não encontrada.");
  }

  return data.user.id;
}

async function ensureProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("id,name,default_currency,theme,created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return toProfile(data as ProfileRow);
  }

  const { data: inserted, error: insertError } = await client
    .from("profiles")
    .insert({
      id: userId,
      name: "FinanceOS Private",
      default_currency: "EUR",
      theme: "dark"
    })
    .select("id,name,default_currency,theme,created_at")
    .single();

  if (insertError) {
    throw insertError;
  }

  return toProfile(inserted as ProfileRow);
}

async function ensureCategories(client: SupabaseClient, userId: string, rows: CategoryRow[]) {
  if (rows.length > 0) {
    return rows.map(toCategory);
  }

  const defaults = [
    ...expenseCategories.map((name) => ({ user_id: userId, name, type: "expense" })),
    ...incomeSources.map((name) => ({ user_id: userId, name, type: "income" }))
  ];

  const { data, error } = await client.from("categories").insert(defaults).select("*").order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CategoryRow[]).map(toCategory);
}

export function createSupabaseRepository(client: SupabaseClient): FinanceRepository {
  return {
    async load() {
      const userId = await getUserId(client);
      const profile = await ensureProfile(client, userId);
      const [{ data: transactions, error: transactionError }, { data: categories, error: categoryError }] = await Promise.all([
        client.from("transactions").select("*").order("date", { ascending: false }),
        client.from("categories").select("*").order("name", { ascending: true })
      ]);

      if (transactionError) {
        throw transactionError;
      }

      if (categoryError) {
        throw categoryError;
      }

      return {
        profile,
        transactions: ((transactions ?? []) as TransactionRow[]).map(toTransaction),
        categories: await ensureCategories(client, userId, (categories ?? []) as CategoryRow[])
      };
    },

    async addTransaction(input: TransactionDraft) {
      const userId = await getUserId(client);
      const { data, error } = await client
        .from("transactions")
        .insert(toTransactionRow(input, userId))
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return toTransaction(data as TransactionRow);
    },

    async updateTransaction(id: string, input: TransactionDraft) {
      const userId = await getUserId(client);
      const { data, error } = await client
        .from("transactions")
        .update({
          ...toTransactionRow(input, userId),
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return toTransaction(data as TransactionRow);
    },

    async deleteTransaction(id: string) {
      const { error } = await client.from("transactions").delete().eq("id", id);

      if (error) {
        throw error;
      }
    },

    async updateProfile(input: Pick<Profile, "name" | "defaultCurrency" | "theme">) {
      const userId = await getUserId(client);
      const { data, error } = await client
        .from("profiles")
        .upsert({
          id: userId,
          name: input.name,
          default_currency: input.defaultCurrency,
          theme: input.theme
        })
        .select("id,name,default_currency,theme,created_at")
        .single();

      if (error) {
        throw error;
      }

      return toProfile(data as ProfileRow);
    },

    async resetDemoData(): Promise<FinanceSnapshot> {
      const userId = await getUserId(client);
      const snapshot = createMockSnapshot();

      await client.from("transactions").delete().eq("user_id", userId);

      const { error } = await client.from("transactions").insert(
        snapshot.transactions.map((transaction) =>
          toTransactionRow(
            {
              type: transaction.type,
              description: transaction.description,
              amount: transaction.amount,
              currency: transaction.currency,
              category: transaction.category,
              paymentMethod: transaction.paymentMethod,
              source: transaction.source,
              notes: transaction.notes,
              date: transaction.date
            },
            userId
          )
        )
      );

      if (error) {
        throw error;
      }

      return this.load();
    }
  };
}
