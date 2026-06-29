"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createFinanceRepository } from "@/lib/data";
import type { FinanceRepository } from "@/lib/data/finance-repository";
import type { Category, FinanceSnapshot, Profile, Transaction, TransactionDraft } from "@/lib/types";

interface FinanceContextValue {
  loading: boolean;
  profile: Profile;
  transactions: Transaction[];
  categories: Category[];
  addTransaction(input: TransactionDraft): Promise<Transaction>;
  updateTransaction(id: string, input: TransactionDraft): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
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
  const repository = useRef<FinanceRepository | null>(null);
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    repository.current = createFinanceRepository();

    repository.current
      .load()
      .then((data) => {
        if (mounted) {
          setSnapshot(data);
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
  }, []);

  const value = useMemo<FinanceContextValue | undefined>(() => {
    if (!snapshot) {
      return undefined;
    }

    return {
      loading,
      profile: snapshot.profile,
      transactions: snapshot.transactions,
      categories: snapshot.categories,
      async addTransaction(input) {
        const transaction = await repository.current!.addTransaction(input);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                transactions: [transaction, ...current.transactions]
              }
            : current
        );
        return transaction;
      },
      async updateTransaction(id, input) {
        const transaction = await repository.current!.updateTransaction(id, input);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                transactions: current.transactions.map((item) => (item.id === id ? transaction : item))
              }
            : current
        );
        return transaction;
      },
      async deleteTransaction(id) {
        await repository.current!.deleteTransaction(id);
        setSnapshot((current) =>
          current
            ? {
                ...current,
                transactions: current.transactions.filter((transaction) => transaction.id !== id)
              }
            : current
        );
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
