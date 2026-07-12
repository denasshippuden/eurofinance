export const currencies = ["EUR", "BRL", "USD"] as const;
export type Currency = (typeof currencies)[number];

export const transactionTypes = ["income", "expense"] as const;
export type TransactionType = (typeof transactionTypes)[number];

export type CategoryType = TransactionType | "both";
export type ThemePreference = "dark" | "light" | "system";
export type WorkPeriod = "day" | "week" | "month" | "project";
export type UserRole = "master" | "member";
export type AuditAction = "created" | "updated" | "deleted";
export type RecurringExpenseStatus = "active" | "paused";
export type RecurringGenerationSource = "manual" | "automatic";

export interface FinanceGroup {
  id: string;
  key: "group-a" | "group-b";
  name: string;
}

export interface FinanceUser {
  id: string;
  email: string;
  name: string;
  groupId: string;
  groupName: string;
  role: UserRole;
}

export interface Profile {
  id: string;
  appUserId: string;
  email?: string;
  name: string;
  groupId: string;
  groupName: string;
  role: UserRole;
  defaultCurrency: Currency;
  theme: ThemePreference;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  groupId?: string;
  name: string;
  type: CategoryType;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  groupId: string;
  walletUserId: string;
  walletUserName: string;
  type: TransactionType;
  description: string;
  amount: number;
  currency: Currency;
  category: string;
  paymentMethod?: string;
  source?: string;
  notes?: string;
  date: string;
  recurringExpenseId?: string;
  recurrenceMonth?: string;
  isRecurringInstance?: boolean;
  generationSource?: RecurringGenerationSource;
  createdByUserId: string;
  createdByName: string;
  updatedByUserId: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionDraft = Omit<
  Transaction,
  | "id"
  | "userId"
  | "groupId"
  | "createdByUserId"
  | "createdByName"
  | "updatedByUserId"
  | "updatedByName"
  | "createdAt"
  | "updatedAt"
>;

export interface AuditEntry {
  id: string;
  groupId: string;
  transactionId: string;
  transactionDescription: string;
  action: AuditAction;
  actorUserId: string;
  actorName: string;
  createdAt: string;
}

export interface FinanceSnapshot {
  profile: Profile;
  groups: FinanceGroup[];
  walletUsers: FinanceUser[];
  transactions: Transaction[];
  categories: Category[];
  auditEntries: AuditEntry[];
  recurringExpenses: RecurringExpense[];
}

export interface TransactionFilters {
  type?: TransactionType | "all";
  currency?: Currency | "all";
  category?: string;
  walletUserId?: string;
  search?: string;
  sort?: "newest" | "oldest";
  startDate?: string;
  endDate?: string;
}

export interface DatePeriod {
  startDate?: string;
  endDate?: string;
}

export interface RecurringExpense {
  id: string;
  groupId: string;
  walletUserId: string;
  walletUserName: string;
  description: string;
  amount: number;
  currency: Currency;
  category: string;
  paymentMethod: string;
  dueDay: number;
  startDate: string;
  endDate?: string;
  notes?: string;
  status: RecurringExpenseStatus;
  autoGenerate: boolean;
  createdByUserId: string;
  createdByName: string;
  updatedByUserId: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
}

export type RecurringExpenseDraft = Omit<
  RecurringExpense,
  | "id"
  | "groupId"
  | "walletUserName"
  | "createdByUserId"
  | "createdByName"
  | "updatedByUserId"
  | "updatedByName"
  | "createdAt"
  | "updatedAt"
>;
