export const currencies = ["EUR", "BRL", "USD"] as const;
export type Currency = (typeof currencies)[number];

export const transactionTypes = ["income", "expense"] as const;
export type TransactionType = (typeof transactionTypes)[number];

export type CategoryType = TransactionType | "both";
export type ThemePreference = "dark" | "light" | "system";
export type WorkPeriod = "day" | "week" | "month" | "project";

export interface Profile {
  id: string;
  name: string;
  defaultCurrency: Currency;
  theme: ThemePreference;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  description: string;
  amount: number;
  currency: Currency;
  category: string;
  paymentMethod?: string;
  source?: string;
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionDraft = Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt">;

export interface FinanceSnapshot {
  profile: Profile;
  transactions: Transaction[];
  categories: Category[];
}

export interface TransactionFilters {
  type?: TransactionType | "all";
  currency?: Currency | "all";
  category?: string;
  search?: string;
  sort?: "newest" | "oldest";
}
