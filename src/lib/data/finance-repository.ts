import type {
  AuditEntry,
  FinanceSnapshot,
  Profile,
  RecurringExpense,
  RecurringExpenseDraft,
  Transaction,
  TransactionDraft,
  TransactionFilters
} from "@/lib/types";

export interface TransactionMutationResult {
  transaction: Transaction;
  auditEntry: AuditEntry;
}

export interface FinanceRepository {
  load(): Promise<FinanceSnapshot>;
  listTransactions(filters?: TransactionFilters): Promise<Transaction[]>;
  addTransaction(input: TransactionDraft): Promise<TransactionMutationResult>;
  updateTransaction(id: string, input: TransactionDraft): Promise<TransactionMutationResult>;
  deleteTransaction(id: string): Promise<AuditEntry>;
  listRecurringExpenses(status?: "active" | "paused" | "all"): Promise<RecurringExpense[]>;
  addRecurringExpense(input: RecurringExpenseDraft): Promise<RecurringExpense>;
  updateRecurringExpense(id: string, input: RecurringExpenseDraft): Promise<RecurringExpense>;
  deleteRecurringExpense(id: string): Promise<void>;
  ensureRecurringExpensesForMonth(monthKey: string, source?: "manual" | "automatic"): Promise<Transaction[]>;
  updateProfile(input: Pick<Profile, "name" | "defaultCurrency" | "theme">): Promise<Profile>;
  resetDemoData(): Promise<FinanceSnapshot>;
}
