import type { Profile } from "@/lib/types";
import {
  createEntityId,
  migrateEmployersFromNames,
  type Employer,
  type EmployerPaymentType,
  type Payment,
  type PaymentItem,
  type Receivable,
  type ReceivableStatus
} from "@/lib/employers";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type EmployerRow = {
  id: string;
  group_id: string;
  name: string;
  normalized_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  default_daily_rate: number | string;
  default_hourly_rate: number | string | null;
  payment_type: EmployerPaymentType;
  expected_payment_day: number | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ReceivableRow = {
  id: string;
  app_user_id: string;
  group_id: string;
  employer_id?: string | null;
  payment_id?: string | null;
  payer_name: string;
  work_or_service: string;
  amount: number | string;
  received_amount?: number | string | null;
  currency: Receivable["currency"];
  due_date: string | null;
  received_at?: string | null;
  status: ReceivableStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentRow = {
  id: string;
  group_id: string;
  employer_id: string | null;
  amount: number | string;
  currency: Payment["currency"];
  received_at: string;
  notes: string | null;
  created_at: string;
};

type PaymentItemRow = {
  payment_id: string;
  receivable_id: string;
  applied_amount: number | string;
};

export function getEmployersStorageKey(groupId: string) {
  return `financeos:employers:${groupId}`;
}

export function getReceivablesStorageKey(appUserId: string) {
  return `financeos:receivables:${appUserId}`;
}

function getPaymentsStorageKey(groupId: string) {
  return `financeos:payments:${groupId}`;
}

function getPaymentItemsStorageKey(groupId: string) {
  return `financeos:payment-items:${groupId}`;
}

async function getAuthUserId() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error("Supabase nao esta configurado.");
  }

  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Error("Sessao Supabase nao encontrada.");
  }

  return data.user.id;
}

export function toEmployer(row: EmployerRow): Employer {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    normalizedName: row.normalized_name,
    companyName: row.company_name ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    defaultDailyRate: Number(row.default_daily_rate),
    defaultHourlyRate: row.default_hourly_rate === null || row.default_hourly_rate === undefined ? undefined : Number(row.default_hourly_rate),
    paymentType: row.payment_type,
    expectedPaymentDay: row.expected_payment_day ?? undefined,
    notes: row.notes ?? undefined,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toEmployerRow(employer: Employer) {
  return {
    id: employer.id,
    group_id: employer.groupId,
    name: employer.name,
    normalized_name: employer.normalizedName,
    company_name: employer.companyName ?? null,
    phone: employer.phone ?? null,
    email: employer.email ?? null,
    default_daily_rate: employer.defaultDailyRate,
    default_hourly_rate: employer.defaultHourlyRate ?? null,
    payment_type: employer.paymentType,
    expected_payment_day: employer.expectedPaymentDay ?? null,
    notes: employer.notes ?? null,
    active: employer.active,
    updated_at: employer.updatedAt
  };
}

export function toReceivable(row: ReceivableRow): Receivable {
  return {
    id: row.id,
    appUserId: row.app_user_id,
    groupId: row.group_id,
    employerId: row.employer_id ?? undefined,
    paymentId: row.payment_id ?? undefined,
    payerName: row.payer_name,
    workOrService: row.work_or_service,
    amount: Number(row.amount),
    receivedAmount: row.received_amount === null || row.received_amount === undefined ? 0 : Number(row.received_amount),
    currency: row.currency,
    dueDate: row.due_date ?? undefined,
    receivedAt: row.received_at ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toReceivableRow(item: Receivable, authUserId: string) {
  return {
    id: item.id,
    auth_user_id: authUserId,
    app_user_id: item.appUserId,
    group_id: item.groupId,
    employer_id: item.employerId ?? null,
    payment_id: item.paymentId ?? null,
    payer_name: item.payerName,
    work_or_service: item.workOrService,
    amount: item.amount,
    received_amount: item.receivedAmount ?? 0,
    currency: item.currency,
    due_date: item.dueDate ?? null,
    received_at: item.receivedAt ?? null,
    status: item.status,
    notes: item.notes ?? null,
    updated_at: item.updatedAt
  };
}

export function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    groupId: row.group_id,
    employerId: row.employer_id ?? undefined,
    amount: Number(row.amount),
    currency: row.currency,
    receivedAt: row.received_at,
    notes: row.notes ?? undefined,
    createdAt: row.created_at
  };
}

export function toPaymentItem(row: PaymentItemRow): PaymentItem {
  return {
    paymentId: row.payment_id,
    receivableId: row.receivable_id,
    appliedAmount: Number(row.applied_amount)
  };
}

export async function loadEmployers(profile: Profile, useSupabase: boolean) {
  if (!useSupabase) {
    const stored = window.localStorage.getItem(getEmployersStorageKey(profile.groupId));
    return stored ? (JSON.parse(stored) as Employer[]) : [];
  }

  const client = getSupabaseBrowserClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client.from("employers").select("*").eq("group_id", profile.groupId).order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as EmployerRow[]).map(toEmployer);
}

export async function persistEmployer(profile: Profile, useSupabase: boolean, employer: Employer) {
  if (!useSupabase) {
    const employers = await loadEmployers(profile, false);
    const next = employers.some((item) => item.id === employer.id)
      ? employers.map((item) => (item.id === employer.id ? employer : item))
      : [employer, ...employers];
    window.localStorage.setItem(getEmployersStorageKey(profile.groupId), JSON.stringify(next));
    return;
  }

  const client = getSupabaseBrowserClient();

  if (!client) {
    return;
  }

  const { error } = await client.from("employers").upsert(toEmployerRow(employer));

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteEmployer(profile: Profile, useSupabase: boolean, employerId: string) {
  if (!useSupabase) {
    const employers = await loadEmployers(profile, false);
    window.localStorage.setItem(getEmployersStorageKey(profile.groupId), JSON.stringify(employers.filter((item) => item.id !== employerId)));
    return;
  }

  const client = getSupabaseBrowserClient();

  if (!client) {
    return;
  }

  const { error } = await client.from("employers").delete().eq("id", employerId).eq("group_id", profile.groupId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadReceivables(profile: Profile, useSupabase: boolean) {
  if (!useSupabase) {
    const stored = window.localStorage.getItem(getReceivablesStorageKey(profile.appUserId));
    return stored ? (JSON.parse(stored) as Receivable[]) : [];
  }

  const client = getSupabaseBrowserClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("receivables")
    .select("*")
    .eq("group_id", profile.groupId)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ReceivableRow[]).map(toReceivable);
}

export async function persistReceivables(profile: Profile, useSupabase: boolean, receivables: Receivable[]) {
  if (!useSupabase) {
    window.localStorage.setItem(getReceivablesStorageKey(profile.appUserId), JSON.stringify(receivables));
    return;
  }

  if (receivables.length === 0) {
    return;
  }

  const client = getSupabaseBrowserClient();

  if (!client) {
    return;
  }

  const authUserId = await getAuthUserId();
  const { error } = await client.from("receivables").upsert(receivables.map((item) => toReceivableRow(item, authUserId)));

  if (error) {
    throw new Error(error.message);
  }
}

export async function persistReceivable(profile: Profile, useSupabase: boolean, receivable: Receivable) {
  if (useSupabase) {
    const client = getSupabaseBrowserClient();

    if (!client) {
      return;
    }

    const authUserId = await getAuthUserId();
    const { error } = await client.from("receivables").upsert(toReceivableRow(receivable, authUserId));

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const current = await loadReceivables(profile, useSupabase);
  const next = current.some((item) => item.id === receivable.id)
    ? current.map((item) => (item.id === receivable.id ? receivable : item))
    : [receivable, ...current];
  await persistReceivables(profile, false, next);
}

export async function deleteReceivable(profile: Profile, useSupabase: boolean, item: Receivable) {
  if (!useSupabase) {
    const current = await loadReceivables(profile, false);
    await persistReceivables(profile, false, current.filter((receivable) => receivable.id !== item.id));
    return;
  }

  const client = getSupabaseBrowserClient();

  if (!client) {
    return;
  }

  const { error } = await client.from("receivables").delete().eq("id", item.id).eq("group_id", profile.groupId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadPayments(profile: Profile, useSupabase: boolean) {
  if (!useSupabase) {
    const payments = window.localStorage.getItem(getPaymentsStorageKey(profile.groupId));
    const paymentItems = window.localStorage.getItem(getPaymentItemsStorageKey(profile.groupId));
    return {
      payments: payments ? (JSON.parse(payments) as Payment[]) : [],
      paymentItems: paymentItems ? (JSON.parse(paymentItems) as PaymentItem[]) : []
    };
  }

  const client = getSupabaseBrowserClient();

  if (!client) {
    return { payments: [], paymentItems: [] };
  }

  const [{ data: payments, error: paymentsError }, { data: paymentItems, error: itemsError }] = await Promise.all([
    client.from("payments").select("*").eq("group_id", profile.groupId).order("received_at", { ascending: false }),
    client.from("payment_items").select("*")
  ]);

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return {
    payments: ((payments ?? []) as PaymentRow[]).map(toPayment),
    paymentItems: ((paymentItems ?? []) as PaymentItemRow[]).map(toPaymentItem)
  };
}

export async function persistPayment(profile: Profile, useSupabase: boolean, payment: Payment, items: PaymentItem[]) {
  if (!useSupabase) {
    const current = await loadPayments(profile, false);
    window.localStorage.setItem(getPaymentsStorageKey(profile.groupId), JSON.stringify([payment, ...current.payments]));
    window.localStorage.setItem(getPaymentItemsStorageKey(profile.groupId), JSON.stringify([...items, ...current.paymentItems]));
    return;
  }

  const client = getSupabaseBrowserClient();

  if (!client) {
    return;
  }

  const { error: paymentError } = await client.from("payments").insert({
    id: payment.id,
    group_id: payment.groupId,
    employer_id: payment.employerId ?? null,
    amount: payment.amount,
    currency: payment.currency,
    received_at: payment.receivedAt,
    notes: payment.notes ?? null,
    created_at: payment.createdAt
  });

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  const { error: itemsError } = await client.from("payment_items").insert(
    items.map((item) => ({
      payment_id: item.paymentId,
      receivable_id: item.receivableId,
      applied_amount: item.appliedAmount
    }))
  );

  if (itemsError) {
    throw new Error(itemsError.message);
  }
}

export async function migrateLegacyReceivables(profile: Profile, useSupabase: boolean, employers: Employer[], receivables: Receivable[]) {
  const migration = migrateEmployersFromNames(receivables, employers, profile.groupId);
  const changedReceivables = migration.records.filter((item, index) => item.employerId !== receivables[index]?.employerId);

  if (migration.createdEmployers.length > 0) {
    await Promise.all(migration.createdEmployers.map((employer) => persistEmployer(profile, useSupabase, employer)));
  }

  if (changedReceivables.length > 0) {
    await persistReceivables(profile, useSupabase, migration.records);
  }

  return {
    employers: migration.employers,
    receivables: migration.records
  };
}

export function createBlankEmployer(profile: Profile): Employer {
  const now = new Date().toISOString();
  return {
    id: createEntityId("employer"),
    groupId: profile.groupId,
    name: "",
    normalizedName: "",
    defaultDailyRate: 0,
    paymentType: "daily",
    active: true,
    createdAt: now,
    updatedAt: now
  };
}
