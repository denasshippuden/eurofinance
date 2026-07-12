import { createMockSnapshot } from "@/lib/mock-data";
import type { FinanceRepository } from "@/lib/data/finance-repository";
import { getDueDateForMonth } from "@/lib/date-period";
import { filterTransactions } from "@/lib/finance";
import type { AuditEntry, FinanceSnapshot, Profile, RecurringExpense, RecurringExpenseDraft, Transaction, TransactionDraft } from "@/lib/types";
import type { AuthUser } from "@/lib/auth";
import { getWalletUserName } from "@/lib/users";

function getStorageKey(actor: AuthUser) {
  return `financeos:snapshot:${actor.groupId}`;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createAuditEntry(actor: AuthUser, transaction: Transaction, action: AuditEntry["action"]): AuditEntry {
  return {
    id: createId("audit"),
    groupId: actor.groupId,
    transactionId: transaction.id,
    transactionDescription: transaction.description,
    action,
    actorUserId: actor.id,
    actorName: actor.name,
    createdAt: new Date().toISOString()
  };
}

function getStoredSnapshot(actor: AuthUser): FinanceSnapshot {
  if (typeof window === "undefined") {
    return createMockSnapshot(actor);
  }

  const storageKey = getStorageKey(actor);
  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    const initial = createMockSnapshot(actor);
    window.localStorage.setItem(storageKey, JSON.stringify(initial));
    return initial;
  }

  try {
    const snapshot = JSON.parse(stored) as FinanceSnapshot;

    if (!snapshot.profile?.groupId || !snapshot.walletUsers || !snapshot.auditEntries) {
      const initial = createMockSnapshot(actor);
      window.localStorage.setItem(storageKey, JSON.stringify(initial));
      return initial;
    }

    return {
      ...snapshot,
      recurringExpenses: snapshot.recurringExpenses ?? [],
      profile: {
        ...snapshot.profile,
        id: actor.id,
        appUserId: actor.id,
        email: actor.email,
        name: actor.name,
        groupId: actor.groupId,
        groupName: actor.groupName,
        role: actor.role
      }
    };
  } catch {
    const initial = createMockSnapshot(actor);
    window.localStorage.setItem(storageKey, JSON.stringify(initial));
    return initial;
  }
}

function persist(actor: AuthUser, snapshot: FinanceSnapshot) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getStorageKey(actor), JSON.stringify(snapshot));
  }
}

export function createLocalStorageRepository(actor: AuthUser): FinanceRepository {
  return {
    async load() {
      return getStoredSnapshot(actor);
    },

    async listTransactions(filters = {}) {
      return filterTransactions(getStoredSnapshot(actor).transactions, filters);
    },

    async addTransaction(input: TransactionDraft) {
      const snapshot = getStoredSnapshot(actor);
      const now = new Date().toISOString();
      const transaction: Transaction = {
        ...input,
        id: createId("tx"),
        userId: actor.id,
        groupId: actor.groupId,
        walletUserName: input.walletUserName || getWalletUserName(input.walletUserId),
        createdByUserId: actor.id,
        createdByName: actor.name,
        updatedByUserId: actor.id,
        updatedByName: actor.name,
        createdAt: now,
        updatedAt: now
      };
      const auditEntry = createAuditEntry(actor, transaction, "created");
      const next = {
        ...snapshot,
        transactions: [transaction, ...snapshot.transactions],
        auditEntries: [auditEntry, ...snapshot.auditEntries]
      };
      persist(actor, next);
      return { transaction, auditEntry };
    },

    async updateTransaction(id: string, input: TransactionDraft) {
      const snapshot = getStoredSnapshot(actor);
      let updated: Transaction | undefined;
      const transactions = snapshot.transactions.map((transaction) => {
        if (transaction.id !== id) {
          return transaction;
        }

        updated = {
          ...transaction,
          ...input,
          walletUserName: input.walletUserName || getWalletUserName(input.walletUserId),
          updatedByUserId: actor.id,
          updatedByName: actor.name,
          updatedAt: new Date().toISOString()
        };
        return updated;
      });

      if (!updated) {
        throw new Error("Transação não encontrada.");
      }

      const auditEntry = createAuditEntry(actor, updated, "updated");
      persist(actor, { ...snapshot, transactions, auditEntries: [auditEntry, ...snapshot.auditEntries] });
      return { transaction: updated, auditEntry };
    },

    async deleteTransaction(id: string) {
      const snapshot = getStoredSnapshot(actor);
      const transaction = snapshot.transactions.find((item) => item.id === id);

      if (!transaction) {
        throw new Error("Transação não encontrada.");
      }

      const auditEntry = createAuditEntry(actor, transaction, "deleted");
      persist(actor, {
        ...snapshot,
        transactions: snapshot.transactions.filter((item) => item.id !== id),
        auditEntries: [auditEntry, ...snapshot.auditEntries]
      });
      return auditEntry;
    },

    async listRecurringExpenses(status = "all") {
      const items = getStoredSnapshot(actor).recurringExpenses ?? [];
      return status === "all" ? items : items.filter((item) => item.status === status);
    },

    async addRecurringExpense(input: RecurringExpenseDraft) {
      const snapshot = getStoredSnapshot(actor);
      const now = new Date().toISOString();
      const recurringExpense: RecurringExpense = {
        ...input,
        id: createId("recurring"),
        groupId: actor.groupId,
        walletUserName: getWalletUserName(input.walletUserId),
        createdByUserId: actor.id,
        createdByName: actor.name,
        updatedByUserId: actor.id,
        updatedByName: actor.name,
        createdAt: now,
        updatedAt: now
      };

      persist(actor, {
        ...snapshot,
        recurringExpenses: [recurringExpense, ...(snapshot.recurringExpenses ?? [])]
      });
      return recurringExpense;
    },

    async updateRecurringExpense(id: string, input: RecurringExpenseDraft) {
      const snapshot = getStoredSnapshot(actor);
      let updated: RecurringExpense | undefined;
      const recurringExpenses = (snapshot.recurringExpenses ?? []).map((item) => {
        if (item.id !== id) {
          return item;
        }

        updated = {
          ...item,
          ...input,
          walletUserName: getWalletUserName(input.walletUserId),
          updatedByUserId: actor.id,
          updatedByName: actor.name,
          updatedAt: new Date().toISOString()
        };
        return updated;
      });

      if (!updated) {
        throw new Error("Conta fixa nao encontrada.");
      }

      persist(actor, { ...snapshot, recurringExpenses });
      return updated;
    },

    async deleteRecurringExpense(id: string) {
      const snapshot = getStoredSnapshot(actor);
      persist(actor, {
        ...snapshot,
        recurringExpenses: (snapshot.recurringExpenses ?? []).filter((item) => item.id !== id)
      });
    },

    async ensureRecurringExpensesForMonth(monthKey: string, source = "automatic") {
      const snapshot = getStoredSnapshot(actor);
      const recurrenceMonth = `${monthKey}-01`;
      const generated: Transaction[] = [];
      const existingKeys = new Set(
        snapshot.transactions
          .filter((item) => item.recurringExpenseId && item.recurrenceMonth)
          .map((item) => `${item.recurringExpenseId}:${item.recurrenceMonth}`)
      );

      const active = (snapshot.recurringExpenses ?? []).filter(
        (item) => item.status === "active" && item.autoGenerate && (actor.role === "master" || item.walletUserId === actor.id)
      );
      for (const item of active) {
        const dueDate = getDueDateForMonth(monthKey, item.dueDay);
        const key = `${item.id}:${recurrenceMonth}`;

        if (existingKeys.has(key) || item.startDate > dueDate || (item.endDate && item.endDate < recurrenceMonth)) {
          continue;
        }

        const now = new Date().toISOString();
        const transaction: Transaction = {
          id: createId("tx"),
          userId: actor.id,
          groupId: actor.groupId,
          walletUserId: item.walletUserId,
          walletUserName: item.walletUserName,
          type: "expense",
          description: item.description,
          amount: item.amount,
          currency: item.currency,
          category: item.category,
          paymentMethod: item.paymentMethod,
          notes: item.notes,
          date: dueDate,
          recurringExpenseId: item.id,
          recurrenceMonth,
          isRecurringInstance: true,
          generationSource: source,
          createdByUserId: actor.id,
          createdByName: actor.name,
          updatedByUserId: actor.id,
          updatedByName: actor.name,
          createdAt: now,
          updatedAt: now
        };
        generated.push(transaction);
        existingKeys.add(key);
      }

      if (generated.length > 0) {
        persist(actor, {
          ...snapshot,
          transactions: [...generated, ...snapshot.transactions],
          auditEntries: [...generated.map((item) => createAuditEntry(actor, item, "created")), ...snapshot.auditEntries]
        });
      }

      return generated;
    },

    async updateProfile(input: Pick<Profile, "name" | "defaultCurrency" | "theme">) {
      const snapshot = getStoredSnapshot(actor);
      const profile = {
        ...snapshot.profile,
        ...input
      };

      persist(actor, { ...snapshot, profile });
      return profile;
    },

    async resetDemoData() {
      const snapshot = createMockSnapshot(actor);
      persist(actor, snapshot);
      return snapshot;
    }
  };
}
