import type { Currency } from "@/lib/types";

export type EmployerPaymentType = "daily" | "weekly" | "biweekly" | "monthly" | "custom";
export type ReceivableStatus = "open" | "received";

export interface Employer {
  id: string;
  groupId: string;
  name: string;
  normalizedName: string;
  companyName?: string;
  phone?: string;
  email?: string;
  defaultDailyRate: number;
  defaultHourlyRate?: number;
  paymentType: EmployerPaymentType;
  expectedPaymentDay?: number;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Receivable {
  id: string;
  appUserId: string;
  groupId: string;
  employerId?: string;
  paymentId?: string;
  payerName: string;
  workOrService: string;
  amount: number;
  receivedAmount?: number;
  currency: Currency;
  dueDate?: string;
  receivedAt?: string;
  status: ReceivableStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  groupId: string;
  employerId?: string;
  amount: number;
  currency: Currency;
  receivedAt: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentItem {
  paymentId: string;
  receivableId: string;
  appliedAmount: number;
}

export function createEntityId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeEmployerName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function getEmployerDisplayName(employers: Employer[], employerId?: string, fallbackName?: string) {
  const employer = employerId ? employers.find((item) => item.id === employerId) : undefined;
  return employer?.name ?? fallbackName?.trim() ?? "Patrao nao definido";
}

export function getReceivableBalance(item: Receivable) {
  return Math.max(item.amount - (item.receivedAmount ?? 0), 0);
}

export function isReceivableOverdue(item: Receivable, today: string) {
  return item.status === "open" && Boolean(item.dueDate && item.dueDate < today);
}

export function migrateEmployersFromNames<T extends { payerName?: string; employerId?: string; groupId: string }>(
  records: T[],
  existingEmployers: Employer[],
  groupId: string,
  now = new Date().toISOString()
) {
  const employersByNormalizedName = new Map(existingEmployers.map((employer) => [employer.normalizedName, employer]));
  const createdEmployers: Employer[] = [];
  const migratedRecords = records.map((record) => {
    if (record.employerId) {
      return record;
    }

    const normalizedName = normalizeEmployerName(record.payerName ?? "");

    if (!normalizedName) {
      return record;
    }

    let employer = employersByNormalizedName.get(normalizedName);

    if (!employer) {
      const displayName = record.payerName?.trim().replace(/\s+/g, " ") ?? "Patrao";
      employer = {
        id: createEntityId("employer"),
        groupId,
        name: displayName,
        normalizedName,
        defaultDailyRate: 0,
        paymentType: "custom",
        active: true,
        createdAt: now,
        updatedAt: now
      };
      employersByNormalizedName.set(normalizedName, employer);
      createdEmployers.push(employer);
    }

    return {
      ...record,
      employerId: employer.id
    };
  });

  return {
    employers: [...existingEmployers, ...createdEmployers],
    records: migratedRecords,
    createdEmployers
  };
}
