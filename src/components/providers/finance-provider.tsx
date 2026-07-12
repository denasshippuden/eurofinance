"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { createFinanceRepository } from "@/lib/data";
import type { FinanceRepository } from "@/lib/data/finance-repository";
import type {
  AuditEntry,
  Category,
  FinanceSnapshot,
  FinanceUser,
  Profile,
  RecurringExpense,
  RecurringExpenseDraft,
  Transaction,
  TransactionDraft,
  TransactionFilters
} from "@/lib/types";

interface FinanceContextValue {
  loading: boolean;
  profile: Profile;
  walletUsers: FinanceUser[];
  transactions: Transaction[];
  categories: Category[];
  auditEntries: AuditEntry[];
  recurringExpenses: RecurringExpense[];
  listTransactions(filters?: TransactionFilters): Promise<Transaction[]>;
  addTransaction(input: TransactionDraft): Promise<Transaction>;
  updateTransaction(id: string, input: TransactionDraft): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  listRecurringExpenses(status?: "active" | "paused" | "all"): Promise<RecurringExpense[]>;
  addRecurringExpense(input: RecurringExpenseDraft): Promise<RecurringExpense>;
  updateRecurringExpense(id: string, input: RecurringExpenseDraft): Promise<RecurringExpense>;
  deleteRecurringExpense(id: string): Promise<void>;
  ensureRecurringExpensesForMonth(monthKey: string, source?: "manual" | "automatic"): Promise<Transaction[]>;
  updateProfile(input: Pick<Profile, "name" | "defaultCurrency" | "theme">): Promise<Profile>;
  resetDemoData(): Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

function applyTheme(theme: Profile["theme"]) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : theme;

  document.documentElement.dataset.theme = resolved;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const repository = useRef<FinanceRepository | null>(null);
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    repository.current = createFinanceRepository(user);

    repository.current
      .load()
      .then((data) => {
        if (mounted) {
          setSnapshot({ ...data, recurringExpenses: data.recurringExpenses ?? [] });
          applyTheme(data.profile.theme);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const value = useMemo<FinanceContextValue | undefined>(() => {
    if (!snapshot) {
      return undefined;
    }

    return {
      loading,
      profile: snapshot.profile,
      walletUsers: snapshot.walletUsers,
      transactions: snapshot.transactions,
      categories: snapshot.categories,
      auditEntries: snapshot.auditEntries,
      recurringExpenses: snapshot.recurringExpenses,
      async listTransactions(filters) {
        return repository.current!.listTransactions(filters);
      },
      async addTransaction(input) {
        const result = await repository.current!.addTransaction(input);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                transactions: [result.transaction, ...current.transactions],
                auditEntries: [result.auditEntry, ...current.auditEntries]
              }
            : current
        );
        return result.transaction;
      },
      async updateTransaction(id, input) {
        const result = await repository.current!.updateTransaction(id, input);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                transactions: current.transactions.map((item) => (item.id === id ? result.transaction : item)),
                auditEntries: [result.auditEntry, ...current.auditEntries]
              }
            : current
        );
        return result.transaction;
      },
      async deleteTransaction(id) {
        const auditEntry = await repository.current!.deleteTransaction(id);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                transactions: current.transactions.filter((transaction) => transaction.id !== id),
                auditEntries: [auditEntry, ...current.auditEntries]
              }
            : current
        );
      },
      async listRecurringExpenses(status = "all") {
        return repository.current!.listRecurringExpenses(status);
      },
      async addRecurringExpense(input) {
        const recurringExpense = await repository.current!.addRecurringExpense(input);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                recurringExpenses: [recurringExpense, ...current.recurringExpenses]
              }
            : current
        );
        return recurringExpense;
      },
      async updateRecurringExpense(id, input) {
        const recurringExpense = await repository.current!.updateRecurringExpense(id, input);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                recurringExpenses: current.recurringExpenses.map((item) => (item.id === id ? recurringExpense : item))
              }
            : current
        );
        return recurringExpense;
      },
      async deleteRecurringExpense(id) {
        await repository.current!.deleteRecurringExpense(id);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                recurringExpenses: current.recurringExpenses.filter((item) => item.id !== id)
              }
            : current
        );
      },
      async ensureRecurringExpensesForMonth(monthKey, source = "automatic") {
        const generated = await repository.current!.ensureRecurringExpensesForMonth(monthKey, source);

        if (generated.length > 0) {
          setSnapshot((current) =>
            current
              ? {
                  ...current,
                  transactions: [...generated, ...current.transactions]
                }
              : current
          );
        }

        return generated;
      },
      async updateProfile(input) {
        const profile = await repository.current!.updateProfile(input);
        applyTheme(profile.theme);
        setSnapshot((current) => (current ? { ...current, profile } : current));
        return profile;
      },
      async resetDemoData() {
        const data = await repository.current!.resetDemoData();
        applyTheme(data.profile.theme);
        setSnapshot(data);
      }
    };
  }, [loading, snapshot]);

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        Carregando FinanceOS Private...
      </div>
    );
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error("useFinance precisa estar dentro de FinanceProvider.");
  }

  return context;
}
