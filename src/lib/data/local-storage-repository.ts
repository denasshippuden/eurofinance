import { createMockSnapshot } from "@/lib/mock-data";
import type { FinanceRepository } from "@/lib/data/finance-repository";
import type { FinanceSnapshot, Profile, Transaction, TransactionDraft } from "@/lib/types";

const STORAGE_KEY = "financeos:snapshot";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStoredSnapshot(): FinanceSnapshot {
  if (typeof window === "undefined") {
    return createMockSnapshot();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    const initial = createMockSnapshot();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(stored) as FinanceSnapshot;
  } catch {
    const initial = createMockSnapshot();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function persist(snapshot: FinanceSnapshot) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }
}

export function createLocalStorageRepository(): FinanceRepository {
  return {
    async load() {
      return getStoredSnapshot();
    },

    async addTransaction(input: TransactionDraft) {
      const snapshot = getStoredSnapshot();
      const now = new Date().toISOString();
      const transaction: Transaction = {
        ...input,
        id: createId("tx"),
        userId: snapshot.profile.id,
        createdAt: now,
        updatedAt: now
      };
      const next = {
        ...snapshot,
        transactions: [transaction, ...snapshot.transactions]
      };
      persist(next);
      return transaction;
    },

    async updateTransaction(id: string, input: TransactionDraft) {
      const snapshot = getStoredSnapshot();
      let updated: Transaction | undefined;
      const transactions = snapshot.transactions.map((transaction) => {
        if (transaction.id !== id) {
          return transaction;
        }

        updated = {
          ...transaction,
          ...input,
          updatedAt: new Date().toISOString()
        };
        return updated;
      });

      if (!updated) {
        throw new Error("Transação não encontrada.");
      }

      persist({ ...snapshot, transactions });
      return updated;
    },

    async deleteTransaction(id: string) {
      const snapshot = getStoredSnapshot();
      persist({
        ...snapshot,
        transactions: snapshot.transactions.filter((transaction) => transaction.id !== id)
      });
    },

    async updateProfile(input: Pick<Profile, "name" | "defaultCurrency" | "theme">) {
      const snapshot = getStoredSnapshot();
      const profile = {
        ...snapshot.profile,
        ...input
      };

      persist({ ...snapshot, profile });
      return profile;
    },

    async resetDemoData() {
      const snapshot = createMockSnapshot();
      persist(snapshot);
      return snapshot;
    }
  };
}
