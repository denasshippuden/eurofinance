import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthUser } from "@/lib/auth";
import { expenseCategories, incomeSources } from "@/lib/constants";
import type { FinanceRepository } from "@/lib/data/finance-repository";
import { getDueDateForMonth } from "@/lib/date-period";
import { createMockSnapshot } from "@/lib/mock-data";
import type {
  AuditAction,
  AuditEntry,
  Category,
  Currency,
  FinanceSnapshot,
  Profile,
  RecurringExpense,
  RecurringExpenseDraft,
  ThemePreference,
  Transaction,
  TransactionDraft,
  TransactionFilters,
  UserRole
} from "@/lib/types";
import { financeGroups, getUsersByGroup, getWalletUserName } from "@/lib/users";

type TransactionRow = {
  id: string;
  user_id: string;
  group_id: string;
  wallet_user_id: string;
  wallet_user_name: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  currency: Currency;
  category: string;
  payment_method: string | null;
  source: string | null;
  notes: string | null;
  date: string;
  recurring_expense_id?: string | null;
  recurrence_month?: string | null;
  is_recurring_instance?: boolean | null;
  generation_source?: "manual" | "automatic" | null;
  created_by_user_id: string;
  created_by_name: string;
  updated_by_user_id: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
};

type RecurringExpenseRow = {
  id: string;
  group_id: string;
  wallet_user_id: string;
  wallet_user_name: string;
  description: string;
  amount: number;
  currency: Currency;
  category: string;
  payment_method: string;
  due_day: number;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  status: "active" | "paused";
  auto_generate: boolean;
  created_by_user_id: string;
  created_by_name: string;
  updated_by_user_id: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
};

type RecurringExpenseInstanceRow = {
  id: string;
  recurring_expense_id: string;
  group_id: string;
  recurrence_month: string;
  transaction_id: string | null;
  status: "generated" | "deleted" | "skipped";
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  app_user_id: string | null;
  email: string | null;
  name: string;
  group_id: string;
  group_name: string;
  role: UserRole;
  default_currency: Currency;
  theme: ThemePreference;
  created_at: string;
};

type CategoryRow = {
  id: string;
  user_id: string;
  group_id: string | null;
  name: string;
  type: "income" | "expense" | "both";
  created_at: string;
};

type AuditRow = {
  id: string;
  group_id: string;
  transaction_id: string;
  transaction_description: string;
  action: AuditAction;
  actor_user_id: string;
  actor_name: string;
  created_at: string;
};

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id,
    walletUserId: row.wallet_user_id,
    walletUserName: row.wallet_user_name,
    type: row.type,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    paymentMethod: row.payment_method ?? undefined,
    source: row.source ?? undefined,
    notes: row.notes ?? undefined,
    date: row.date,
    recurringExpenseId: row.recurring_expense_id ?? undefined,
    recurrenceMonth: row.recurrence_month ?? undefined,
    isRecurringInstance: row.is_recurring_instance ?? false,
    generationSource: row.generation_source ?? undefined,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    updatedByUserId: row.updated_by_user_id,
    updatedByName: row.updated_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRecurringExpense(row: RecurringExpenseRow): RecurringExpense {
  return {
    id: row.id,
    groupId: row.group_id,
    walletUserId: row.wallet_user_id,
    walletUserName: row.wallet_user_name,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    paymentMethod: row.payment_method,
    dueDay: row.due_day,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    autoGenerate: row.auto_generate,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    updatedByUserId: row.updated_by_user_id,
    updatedByName: row.updated_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toProfile(row: ProfileRow, actor: AuthUser): Profile {
  return {
    id: row.id,
    appUserId: row.app_user_id ?? actor.id,
    email: row.email ?? actor.email,
    name: row.name,
    groupId: row.group_id,
    groupName: row.group_name,
    role: row.role,
    defaultCurrency: row.default_currency,
    theme: row.theme,
    createdAt: row.created_at
  };
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id ?? undefined,
    name: row.name,
    type: row.type,
    createdAt: row.created_at
  };
}

function toAuditEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    groupId: row.group_id,
    transactionId: row.transaction_id,
    transactionDescription: row.transaction_description,
    action: row.action,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    createdAt: row.created_at
  };
}

function toTransactionRow(input: TransactionDraft, authUserId: string, actor: AuthUser) {
  return {
    user_id: authUserId,
    group_id: actor.groupId,
    wallet_user_id: input.walletUserId,
    wallet_user_name: input.walletUserName || getWalletUserName(input.walletUserId),
    type: input.type,
    description: input.description,
    amount: input.amount,
    currency: input.currency,
    category: input.category,
    payment_method: input.paymentMethod ?? null,
    source: input.source ?? null,
    notes: input.notes ?? null,
    date: input.date,
    recurring_expense_id: input.recurringExpenseId ?? null,
    recurrence_month: input.recurrenceMonth ?? null,
    is_recurring_instance: input.isRecurringInstance ?? false,
    generation_source: input.generationSource ?? null
  };
}

function toRecurringExpenseRow(input: RecurringExpenseDraft, actor: AuthUser) {
  return {
    group_id: actor.groupId,
    wallet_user_id: input.walletUserId,
    wallet_user_name: getWalletUserName(input.walletUserId),
    description: input.description,
    amount: input.amount,
    currency: input.currency,
    category: input.category,
    payment_method: input.paymentMethod,
    due_day: input.dueDay,
    start_date: input.startDate,
    end_date: input.endDate ?? null,
    notes: input.notes ?? null,
    status: input.status,
    auto_generate: input.autoGenerate
  };
}

async function getAuthUserId(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Error("Sessão Supabase não encontrada.");
  }

  return data.user.id;
}

async function ensureProfile(client: SupabaseClient, authUserId: string, actor: AuthUser) {
  const { data, error } = await client
    .from("profiles")
    .select("id,app_user_id,email,name,group_id,group_name,role,default_currency,theme,created_at")
    .eq("id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return toProfile(data as ProfileRow, actor);
  }

  const { data: inserted, error: insertError } = await client
    .from("profiles")
    .insert({
      id: authUserId,
      app_user_id: actor.id,
      email: actor.email,
      name: actor.name,
      group_id: actor.groupId,
      group_name: actor.groupName,
      role: actor.role,
      default_currency: "EUR",
      theme: "dark"
    })
    .select("id,app_user_id,email,name,group_id,group_name,role,default_currency,theme,created_at")
    .single();

  if (insertError) {
    throw insertError;
  }

  return toProfile(inserted as ProfileRow, actor);
}

function getActorFromProfile(profile: Profile, fallback: AuthUser): AuthUser {
  return {
    ...fallback,
    id: profile.appUserId || fallback.id,
    email: profile.email ?? fallback.email,
    groupId: profile.groupId,
    groupName: profile.groupName,
    role: profile.role
  };
}

async function getSessionContext(client: SupabaseClient, actor: AuthUser) {
  const authUserId = await getAuthUserId(client);
  const profile = await ensureProfile(client, authUserId, actor);

  return {
    authUserId,
    profile,
    actor: getActorFromProfile(profile, actor)
  };
}

async function ensureCategories(client: SupabaseClient, authUserId: string, actor: AuthUser, rows: CategoryRow[]) {
  if (rows.length > 0) {
    return rows.map(toCategory);
  }

  const defaults = [
    ...expenseCategories.map((name) => ({ user_id: authUserId, group_id: actor.groupId, name, type: "expense" })),
    ...incomeSources.map((name) => ({ user_id: authUserId, group_id: actor.groupId, name, type: "income" }))
  ];

  const { data, error } = await client
    .from("categories")
    .insert(defaults)
    .select("*")
    .eq("group_id", actor.groupId)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CategoryRow[]).map(toCategory);
}

async function createAuditEntry(
  client: SupabaseClient,
  actor: AuthUser,
  transaction: Transaction,
  action: AuditAction
): Promise<AuditEntry> {
  const { data, error } = await client
    .from("audit_entries")
    .insert({
      group_id: actor.groupId,
      transaction_id: transaction.id,
      transaction_description: transaction.description,
      action,
      actor_user_id: actor.id,
      actor_name: actor.name
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toAuditEntry(data as AuditRow);
}

async function queryTransactions(client: SupabaseClient, groupId: string, filters: TransactionFilters = {}) {
  let query = client.from("transactions").select("*").eq("group_id", groupId);

  if (filters.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  if (filters.currency && filters.currency !== "all") {
    query = query.eq("currency", filters.currency);
  }

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  if (filters.walletUserId && filters.walletUserId !== "all") {
    query = query.eq("wallet_user_id", filters.walletUserId);
  }

  if (filters.startDate) {
    query = query.gte("date", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("date", filters.endDate);
  }

  const { data, error } = await query.order("date", { ascending: filters.sort === "oldest" });

  if (error) {
    throw error;
  }

  let rows = ((data ?? []) as TransactionRow[]).map(toTransaction);
  const search = filters.search?.trim().toLowerCase();

  if (search) {
    rows = rows.filter(
      (transaction) =>
        transaction.description.toLowerCase().includes(search) ||
        transaction.category.toLowerCase().includes(search) ||
        transaction.notes?.toLowerCase().includes(search)
    );
  }

  return rows;
}

async function queryRecurringExpenses(
  client: SupabaseClient,
  groupId: string,
  status: "active" | "paused" | "all" = "all"
) {
  let query = client.from("recurring_expenses").select("*").eq("group_id", groupId);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("recurring_expenses") || error.message.includes("schema cache")) {
      return [];
    }

    throw error;
  }

  return ((data ?? []) as RecurringExpenseRow[]).map(toRecurringExpense);
}

function isRecurringExpenseDueForMonth(expense: RecurringExpense, monthKey: string) {
  const monthStart = `${monthKey}-01`;
  const dueDate = getDueDateForMonth(monthKey, expense.dueDay);

  if (expense.status !== "active" || !expense.autoGenerate) {
    return false;
  }

  if (expense.startDate > dueDate) {
    return false;
  }

  if (expense.endDate && expense.endDate < monthStart) {
    return false;
  }

  return true;
}

export function createSupabaseRepository(client: SupabaseClient, actor: AuthUser): FinanceRepository {
  return {
    async load() {
      const { authUserId, profile, actor: sessionActor } = await getSessionContext(client, actor);
      const [
        transactions,
        { data: categories, error: categoryError },
        { data: audits, error: auditError },
        recurringExpenses
      ] =
        await Promise.all([
          queryTransactions(client, sessionActor.groupId),
          client.from("categories").select("*").eq("group_id", sessionActor.groupId).order("name", { ascending: true }),
          client.from("audit_entries").select("*").eq("group_id", sessionActor.groupId).order("created_at", { ascending: false }).limit(20),
          queryRecurringExpenses(client, sessionActor.groupId)
        ]);

      if (categoryError) {
        throw categoryError;
      }

      if (auditError) {
        throw auditError;
      }

      return {
        profile,
        groups: financeGroups,
        walletUsers: getUsersByGroup(sessionActor.groupId),
        transactions,
        categories: await ensureCategories(client, authUserId, sessionActor, (categories ?? []) as CategoryRow[]),
        auditEntries: ((audits ?? []) as AuditRow[]).map(toAuditEntry),
        recurringExpenses
      };
    },

    async listTransactions(filters = {}) {
      const { actor: sessionActor } = await getSessionContext(client, actor);
      return queryTransactions(client, sessionActor.groupId, filters);
    },

    async addTransaction(input: TransactionDraft) {
      const { authUserId, actor: sessionActor } = await getSessionContext(client, actor);
      const { data, error } = await client
        .from("transactions")
        .insert({
          ...toTransactionRow(input, authUserId, sessionActor),
          created_by_user_id: sessionActor.id,
          created_by_name: sessionActor.name,
          updated_by_user_id: sessionActor.id,
          updated_by_name: sessionActor.name
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const transaction = toTransaction(data as TransactionRow);
      const auditEntry = await createAuditEntry(client, sessionActor, transaction, "created");
      return { transaction, auditEntry };
    },

    async updateTransaction(id: string, input: TransactionDraft) {
      const { authUserId, actor: sessionActor } = await getSessionContext(client, actor);
      const { data, error } = await client
        .from("transactions")
        .update({
          ...toTransactionRow(input, authUserId, sessionActor),
          updated_by_user_id: sessionActor.id,
          updated_by_name: sessionActor.name,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("group_id", sessionActor.groupId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const transaction = toTransaction(data as TransactionRow);
      const auditEntry = await createAuditEntry(client, sessionActor, transaction, "updated");
      return { transaction, auditEntry };
    },

    async deleteTransaction(id: string) {
      const { actor: sessionActor } = await getSessionContext(client, actor);
      const { data: existing, error: findError } = await client
        .from("transactions")
        .select("*")
        .eq("id", id)
        .eq("group_id", sessionActor.groupId)
        .single();

      if (findError) {
        throw findError;
      }

      const transaction = toTransaction(existing as TransactionRow);
      const { error } = await client.from("transactions").delete().eq("id", id).eq("group_id", sessionActor.groupId);

      if (error) {
        throw error;
      }

      if (transaction.isRecurringInstance && transaction.recurringExpenseId && transaction.recurrenceMonth) {
        await client.from("recurring_expense_instances").upsert(
          {
            recurring_expense_id: transaction.recurringExpenseId,
            group_id: sessionActor.groupId,
            recurrence_month: transaction.recurrenceMonth,
            transaction_id: null,
            status: "deleted"
          },
          { onConflict: "recurring_expense_id,recurrence_month" }
        );
      }

      return createAuditEntry(client, sessionActor, transaction, "deleted");
    },

    async listRecurringExpenses(status = "all") {
      const { actor: sessionActor } = await getSessionContext(client, actor);
      return queryRecurringExpenses(client, sessionActor.groupId, status);
    },

    async addRecurringExpense(input) {
      const { actor: sessionActor } = await getSessionContext(client, actor);
      const { data, error } = await client
        .from("recurring_expenses")
        .insert({
          ...toRecurringExpenseRow(input, sessionActor),
          created_by_user_id: sessionActor.id,
          created_by_name: sessionActor.name,
          updated_by_user_id: sessionActor.id,
          updated_by_name: sessionActor.name
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return toRecurringExpense(data as RecurringExpenseRow);
    },

    async updateRecurringExpense(id, input) {
      const { actor: sessionActor } = await getSessionContext(client, actor);
      const { data, error } = await client
        .from("recurring_expenses")
        .update({
          ...toRecurringExpenseRow(input, sessionActor),
          updated_by_user_id: sessionActor.id,
          updated_by_name: sessionActor.name,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("group_id", sessionActor.groupId)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return toRecurringExpense(data as RecurringExpenseRow);
    },

    async deleteRecurringExpense(id) {
      const { actor: sessionActor } = await getSessionContext(client, actor);
      const { error } = await client.from("recurring_expenses").delete().eq("id", id).eq("group_id", sessionActor.groupId);

      if (error) {
        throw error;
      }
    },

    async ensureRecurringExpensesForMonth(monthKey, source = "automatic") {
      const { authUserId, actor: sessionActor } = await getSessionContext(client, actor);
      const recurrenceMonth = `${monthKey}-01`;
      const expenses = (await queryRecurringExpenses(client, sessionActor.groupId, "active")).filter(
        (expense) =>
          isRecurringExpenseDueForMonth(expense, monthKey) &&
          (sessionActor.role === "master" || expense.walletUserId === sessionActor.id)
      );

      if (expenses.length === 0) {
        return [];
      }

      const { data: instances, error: instanceError } = await client
        .from("recurring_expense_instances")
        .select("*")
        .eq("group_id", sessionActor.groupId)
        .eq("recurrence_month", recurrenceMonth);

      if (instanceError) {
        throw instanceError;
      }

      const instancesByRecurringId = new Map(
        ((instances ?? []) as RecurringExpenseInstanceRow[]).map((instance) => [instance.recurring_expense_id, instance])
      );
      const generated: Transaction[] = [];

      for (const expense of expenses) {
        const instance = instancesByRecurringId.get(expense.id);

        if (instance?.status === "deleted" || instance?.status === "skipped" || instance?.transaction_id) {
          continue;
        }

        const dueDate = getDueDateForMonth(monthKey, expense.dueDay);
        const { data, error } = await client
          .from("transactions")
          .insert({
            user_id: authUserId,
            group_id: sessionActor.groupId,
            wallet_user_id: expense.walletUserId,
            wallet_user_name: expense.walletUserName,
            type: "expense",
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency,
            category: expense.category,
            payment_method: expense.paymentMethod,
            source: null,
            notes: expense.notes ?? null,
            date: dueDate,
            recurring_expense_id: expense.id,
            recurrence_month: recurrenceMonth,
            is_recurring_instance: true,
            generation_source: source,
            created_by_user_id: sessionActor.id,
            created_by_name: sessionActor.name,
            updated_by_user_id: sessionActor.id,
            updated_by_name: sessionActor.name
          })
          .select("*")
          .single();

        if (error) {
          if (error.code === "23505") {
            continue;
          }

          throw error;
        }

        const transaction = toTransaction(data as TransactionRow);
        generated.push(transaction);
        await client.from("recurring_expense_instances").upsert(
          {
            recurring_expense_id: expense.id,
            group_id: sessionActor.groupId,
            recurrence_month: recurrenceMonth,
            transaction_id: transaction.id,
            status: "generated"
          },
          { onConflict: "recurring_expense_id,recurrence_month" }
        );
        await createAuditEntry(client, sessionActor, transaction, "created");
      }

      return generated;
    },

    async updateProfile(input: Pick<Profile, "name" | "defaultCurrency" | "theme">) {
      const { authUserId, actor: sessionActor } = await getSessionContext(client, actor);
      const { data, error } = await client
        .from("profiles")
        .upsert({
          id: authUserId,
          app_user_id: sessionActor.id,
          email: sessionActor.email,
          name: input.name,
          group_id: sessionActor.groupId,
          group_name: sessionActor.groupName,
          role: sessionActor.role,
          default_currency: input.defaultCurrency,
          theme: input.theme
        })
        .select("id,app_user_id,email,name,group_id,group_name,role,default_currency,theme,created_at")
        .single();

      if (error) {
        throw error;
      }

      return toProfile(data as ProfileRow, actor);
    },

    async resetDemoData(): Promise<FinanceSnapshot> {
      const { authUserId, actor: sessionActor } = await getSessionContext(client, actor);
      const snapshot = createMockSnapshot(sessionActor);

      await client.from("transactions").delete().eq("group_id", sessionActor.groupId);

      const { error } = await client.from("transactions").insert(
        snapshot.transactions.map((transaction) => ({
          ...toTransactionRow(
            {
              type: transaction.type,
              description: transaction.description,
              amount: transaction.amount,
              currency: transaction.currency,
              category: transaction.category,
              walletUserId: transaction.walletUserId,
              walletUserName: transaction.walletUserName,
              paymentMethod: transaction.paymentMethod,
              source: transaction.source,
              notes: transaction.notes,
              date: transaction.date
            },
            authUserId,
            sessionActor
          ),
          created_by_user_id: sessionActor.id,
          created_by_name: sessionActor.name,
          updated_by_user_id: sessionActor.id,
          updated_by_name: sessionActor.name
        }))
      );

      if (error) {
        throw error;
      }

      return this.load();
    }
  };
}
