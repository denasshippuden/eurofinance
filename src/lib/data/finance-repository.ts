import type { AuditEntry, FinanceSnapshot, Profile, Transaction, TransactionDraft } from "@/lib/types";

export interface TransactionMutationResult {
  transaction: Transaction;
  auditEntry: AuditEntry;
}

export interface FinanceRepository {
  load(): Promise<FinanceSnapshot>;
  addTransaction(input: TransactionDraft): Promise<TransactionMutationResult>;
  updateTransaction(id: string, input: TransactionDraft): Promise<TransactionMutationResult>;
  deleteTransaction(id: string): Promise<AuditEntry>;
  updateProfile(input: Pick<Profile, "name" | "defaultCurrency" | "theme">): Promise<Profile>;
  resetDemoData(): Promise<FinanceSnapshot>;
}
