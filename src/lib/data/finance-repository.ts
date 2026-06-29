import type { FinanceSnapshot, Profile, Transaction, TransactionDraft } from "@/lib/types";

export interface FinanceRepository {
  load(): Promise<FinanceSnapshot>;
  addTransaction(input: TransactionDraft): Promise<Transaction>;
  updateTransaction(id: string, input: TransactionDraft): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  updateProfile(input: Pick<Profile, "name" | "defaultCurrency" | "theme">): Promise<Profile>;
  resetDemoData(): Promise<FinanceSnapshot>;
}
