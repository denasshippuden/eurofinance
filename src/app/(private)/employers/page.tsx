"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Ban, BriefcaseBusiness, CheckCircle2, Clock3, Eye, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFinance } from "@/components/providers/finance-provider";
import {
  createBlankEmployer,
  deleteEmployer,
  loadEmployers,
  loadPayments,
  loadReceivables,
  migrateLegacyReceivables,
  persistEmployer
} from "@/lib/employer-data";
import {
  getReceivableBalance,
  isReceivableOverdue,
  normalizeEmployerName,
  type Employer,
  type EmployerPaymentType,
  type Payment,
  type Receivable
} from "@/lib/employers";
import { formatMoney, parseAmount, toInputDate } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatBelgiumDate, getWorkMinutes, type WorkEntry } from "@/lib/work-hours";

type EmployerForm = {
  name: string;
  companyName: string;
  phone: string;
  email: string;
  defaultDailyRate: string;
  defaultHourlyRate: string;
  paymentType: EmployerPaymentType;
  expectedPaymentDay: string;
  notes: string;
  active: boolean;
};

type WorkEntryRow = {
  id: string;
  app_user_id: string;
  group_id: string;
  user_name: string;
  employer_id?: string | null;
  work_date: string;
  clock_in_at: string;
  clock_in_time: string;
  clock_out_at: string | null;
  clock_out_time: string | null;
  interval_minutes?: number | null;
  payment_type?: "hourly" | "daily" | null;
  hourly_rate?: number | null;
  daily_rate?: number | null;
  notes?: string | null;
  entry_source?: "clock" | "manual" | "automatic" | null;
  closed_automatically: boolean;
  created_at: string;
  updated_at: string;
};

const paymentTypeLabels: Record<EmployerPaymentType, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  custom: "Personalizado"
};

function toWorkEntry(row: WorkEntryRow): WorkEntry {
  return {
    id: row.id,
    appUserId: row.app_user_id,
    groupId: row.group_id,
    userName: row.user_name,
    employerId: row.employer_id ?? undefined,
    workDate: row.work_date,
    clockInAt: row.clock_in_at,
    clockInTime: row.clock_in_time,
    clockOutAt: row.clock_out_at ?? undefined,
    clockOutTime: row.clock_out_time ?? undefined,
    intervalMinutes: row.interval_minutes ?? 0,
    paymentType: row.payment_type ?? "hourly",
    hourlyRate: row.hourly_rate ?? undefined,
    dailyRate: row.daily_rate ?? undefined,
    notes: row.notes ?? undefined,
    entrySource: row.entry_source ?? "clock",
    closedAutomatically: row.closed_automatically,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getWorkStorageKey(appUserId: string) {
  return `financeos:work-hours:${appUserId}`;
}

function createForm(employer?: Employer): EmployerForm {
  return {
    name: employer?.name ?? "",
    companyName: employer?.companyName ?? "",
    phone: employer?.phone ?? "",
    email: employer?.email ?? "",
    defaultDailyRate: employer ? String(employer.defaultDailyRate) : "",
    defaultHourlyRate: employer?.defaultHourlyRate ? String(employer.defaultHourlyRate) : "",
    paymentType: employer?.paymentType ?? "daily",
    expectedPaymentDay: employer?.expectedPaymentDay ? String(employer.expectedPaymentDay) : "",
    notes: employer?.notes ?? "",
    active: employer?.active ?? true
  };
}

function getWorkAmount(entry: WorkEntry) {
  if (entry.paymentType === "daily") {
    return entry.dailyRate ?? 0;
  }

  return (getWorkMinutes(entry) / 60) * (entry.hourlyRate ?? 0);
}

export default function EmployersPage() {
  const { profile } = useFinance();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Employer | null>(null);
  const [selected, setSelected] = useState<Employer | null>(null);
  const [form, setForm] = useState<EmployerForm>(() => createForm());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const useSupabase = process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase";
  const today = toInputDate();

  const filteredEmployers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return employers
      .filter((employer) => {
        if (!query) {
          return true;
        }

        return employer.name.toLocaleLowerCase("pt-BR").includes(query) || Boolean(employer.companyName?.toLocaleLowerCase("pt-BR").includes(query));
      })
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  }, [employers, search]);

  const metricsByEmployer = useMemo(() => {
    const map = new Map<string, { open: number; overdue: number; received: number; records: number; worked: number; days: number }>();

    for (const employer of employers) {
      map.set(employer.id, { open: 0, overdue: 0, received: 0, records: 0, worked: 0, days: 0 });
    }

    for (const item of receivables) {
      if (!item.employerId) {
        continue;
      }

      const metrics = map.get(item.employerId) ?? { open: 0, overdue: 0, received: 0, records: 0, worked: 0, days: 0 };
      metrics.records += 1;
      metrics.open += item.status === "open" ? getReceivableBalance(item) : 0;
      metrics.overdue += isReceivableOverdue(item, today) ? getReceivableBalance(item) : 0;
      metrics.received += item.receivedAmount ?? (item.status === "received" ? item.amount : 0);
      map.set(item.employerId, metrics);
    }

    for (const entry of workEntries) {
      if (!entry.employerId) {
        continue;
      }

      const metrics = map.get(entry.employerId) ?? { open: 0, overdue: 0, received: 0, records: 0, worked: 0, days: 0 };
      metrics.worked += getWorkAmount(entry);
      metrics.days += 1;
      map.set(entry.employerId, metrics);
    }

    return map;
  }, [employers, receivables, today, workEntries]);

  const selectedReceivables = selected ? receivables.filter((item) => item.employerId === selected.id) : [];
  const selectedWorkEntries = selected ? workEntries.filter((entry) => entry.employerId === selected.id) : [];
  const selectedPayments = selected ? payments.filter((payment) => payment.employerId === selected.id) : [];
  const selectedMonthlyHistory = useMemo(() => {
    const map = new Map<string, { worked: number; received: number; open: number }>();

    for (const entry of selectedWorkEntries) {
      const month = entry.workDate.slice(0, 7);
      const row = map.get(month) ?? { worked: 0, received: 0, open: 0 };
      row.worked += getWorkAmount(entry);
      map.set(month, row);
    }

    for (const item of selectedReceivables) {
      const month = (item.dueDate ?? item.createdAt.slice(0, 10)).slice(0, 7);
      const row = map.get(month) ?? { worked: 0, received: 0, open: 0 };
      row.open += item.status === "open" ? getReceivableBalance(item) : 0;
      row.received += item.receivedAmount ?? (item.status === "received" ? item.amount : 0);
      map.set(month, row);
    }

    for (const payment of selectedPayments) {
      const month = payment.receivedAt.slice(0, 7);
      const row = map.get(month) ?? { worked: 0, received: 0, open: 0 };
      row.received += payment.amount;
      map.set(month, row);
    }

    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [selectedPayments, selectedReceivables, selectedWorkEntries]);

  async function loadWorkEntries() {
    if (!useSupabase) {
      const stored = window.localStorage.getItem(getWorkStorageKey(profile.appUserId));
      return stored ? (JSON.parse(stored) as WorkEntry[]) : [];
    }

    const client = getSupabaseBrowserClient();

    if (!client) {
      return [];
    }

    const { data, error } = await client.from("time_entries").select("*").eq("group_id", profile.groupId).order("work_date", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as WorkEntryRow[]).map(toWorkEntry);
  }

  async function loadAll() {
    const [loadedEmployers, loadedReceivables, loadedWorkEntries, paymentData] = await Promise.all([
      loadEmployers(profile, useSupabase),
      loadReceivables(profile, useSupabase),
      loadWorkEntries(),
      loadPayments(profile, useSupabase)
    ]);
    const migration = await migrateLegacyReceivables(profile, useSupabase, loadedEmployers, loadedReceivables);

    setEmployers(migration.employers);
    setReceivables(migration.receivables);
    setWorkEntries(loadedWorkEntries);
    setPayments(paymentData.payments);
  }

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        await loadAll();
      } catch (error) {
        if (mounted) {
          setMessage({ tone: "error", text: error instanceof Error ? error.message : "Nao foi possivel carregar patroes." });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      mounted = false;
    };
  }, [profile.appUserId, profile.groupId]);

  function startEdit(employer: Employer) {
    setEditing(employer);
    setForm(createForm(employer));
    setMessage(null);
  }

  function resetForm() {
    setEditing(null);
    setForm(createForm());
  }

  function updateField<Key extends keyof EmployerForm>(key: Key, value: EmployerForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const normalizedName = normalizeEmployerName(form.name);
    const duplicated = employers.some((employer) => employer.id !== editing?.id && employer.normalizedName === normalizedName);
    const defaultDailyRate = parseAmount(form.defaultDailyRate || "0");
    const defaultHourlyRate = form.defaultHourlyRate ? parseAmount(form.defaultHourlyRate) : undefined;
    const expectedPaymentDay = form.expectedPaymentDay ? Number(form.expectedPaymentDay) : undefined;

    if (!normalizedName) {
      setMessage({ tone: "error", text: "Informe o nome do patrao." });
      return;
    }

    if (duplicated) {
      setMessage({ tone: "error", text: "Ja existe um patrao com esse nome." });
      return;
    }

    if (!Number.isFinite(defaultDailyRate) || defaultDailyRate < 0) {
      setMessage({ tone: "error", text: "Informe uma diaria padrao valida." });
      return;
    }

    if (defaultHourlyRate !== undefined && (!Number.isFinite(defaultHourlyRate) || defaultHourlyRate < 0)) {
      setMessage({ tone: "error", text: "Informe um valor por hora valido." });
      return;
    }

    if (expectedPaymentDay !== undefined && (!Number.isInteger(expectedPaymentDay) || expectedPaymentDay < 1 || expectedPaymentDay > 31)) {
      setMessage({ tone: "error", text: "O dia previsto deve ficar entre 1 e 31." });
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date().toISOString();
      const saved: Employer = {
        ...(editing ?? createBlankEmployer(profile)),
        name: form.name.trim().replace(/\s+/g, " "),
        normalizedName,
        companyName: form.companyName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        defaultDailyRate,
        defaultHourlyRate,
        paymentType: form.paymentType,
        expectedPaymentDay,
        notes: form.notes.trim() || undefined,
        active: form.active,
        updatedAt: now
      };
      const next = editing ? employers.map((employer) => (employer.id === editing.id ? saved : employer)) : [saved, ...employers];

      await persistEmployer(profile, useSupabase, saved);
      setEmployers(next);
      setSelected((current) => (current?.id === saved.id ? saved : current));
      resetForm();
      setMessage({ tone: "success", text: editing ? "Patrao atualizado." : "Patrao cadastrado." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Nao foi possivel salvar o patrao." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(employer: Employer) {
    const hasHistory =
      receivables.some((item) => item.employerId === employer.id) ||
      workEntries.some((entry) => entry.employerId === employer.id) ||
      payments.some((payment) => payment.employerId === employer.id);

    setSubmitting(true);
    setMessage(null);

    try {
      if (hasHistory) {
        const inactive = { ...employer, active: false, updatedAt: new Date().toISOString() };
        await persistEmployer(profile, useSupabase, inactive);
        setEmployers((current) => current.map((item) => (item.id === employer.id ? inactive : item)));
        setSelected((current) => (current?.id === employer.id ? inactive : current));
        setMessage({ tone: "success", text: "Patrao desativado para preservar o historico." });
      } else {
        await deleteEmployer(profile, useSupabase, employer.id);
        setEmployers((current) => current.filter((item) => item.id !== employer.id));
        setSelected((current) => (current?.id === employer.id ? null : current));
        setMessage({ tone: "success", text: "Patrao excluido." });
      }
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Nao foi possivel alterar o patrao." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Cadastro central</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Patroes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Cadastre responsaveis, valores padrao e acompanhe horas, valores em aberto e pagamentos por pessoa.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Badge>{employers.filter((item) => item.active).length} ativos</Badge>
          <Badge>{formatMoney([...metricsByEmployer.values()].reduce((total, item) => total + item.open, 0), profile.defaultCurrency)}</Badge>
          <Badge>{formatMoney([...metricsByEmployer.values()].reduce((total, item) => total + item.overdue, 0), profile.defaultCurrency)} vencido</Badge>
        </div>
      </header>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>{editing ? "Editar patrao" : "Novo patrao"}</CardTitle>
              {editing ? (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field label="Nome">
                <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Ex: Ueslei" required />
              </Field>
              <Field label="Empresa opcional">
                <Input value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} placeholder="Nome da empresa" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Telefone">
                  <Input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Diaria padrao">
                  <Input inputMode="decimal" value={form.defaultDailyRate} onChange={(event) => updateField("defaultDailyRate", event.target.value)} placeholder="80,00" />
                </Field>
                <Field label="Valor por hora">
                  <Input inputMode="decimal" value={form.defaultHourlyRate} onChange={(event) => updateField("defaultHourlyRate", event.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo de pagamento">
                  <Select value={form.paymentType} onChange={(event) => updateField("paymentType", event.target.value as EmployerPaymentType)}>
                    {Object.entries(paymentTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Dia previsto">
                  <Input type="number" min={1} max={31} value={form.expectedPaymentDay} onChange={(event) => updateField("expectedPaymentDay", event.target.value)} />
                </Field>
              </div>
              <Field label="Status">
                <Select value={form.active ? "active" : "inactive"} onChange={(event) => updateField("active", event.target.value === "active")}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </Select>
              </Field>
              <Field label="Observacoes">
                <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
              </Field>
              <Button type="submit" className="w-full" disabled={submitting}>
                {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {submitting ? "Salvando..." : editing ? "Salvar patrao" : "Cadastrar patrao"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-border bg-panel p-4 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Pesquisar por nome">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar patrao ou empresa" />
            </Field>
            <Badge>{loading ? "Carregando..." : `${filteredEmployers.length} exibido(s)`}</Badge>
          </div>

          <div className="grid gap-3">
            {filteredEmployers.map((employer) => {
              const metrics = metricsByEmployer.get(employer.id) ?? { open: 0, overdue: 0, received: 0, records: 0, worked: 0, days: 0 };

              return (
                <Card key={employer.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{employer.name}</p>
                          <Badge>{employer.active ? "Ativo" : "Inativo"}</Badge>
                          <Badge>{paymentTypeLabels[employer.paymentType]}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted">{employer.companyName || "Sem empresa"} - diaria {formatMoney(employer.defaultDailyRate, profile.defaultCurrency)}</p>
                        <p className="mt-1 text-xs text-muted">
                          {metrics.records} recebivel(is), {metrics.days} dia(s) trabalhado(s)
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[360px]">
                        <Badge>{formatMoney(metrics.open, profile.defaultCurrency)} aberto</Badge>
                        <Badge>{formatMoney(metrics.overdue, profile.defaultCurrency)} vencido</Badge>
                        <Badge>{formatMoney(metrics.received, profile.defaultCurrency)} recebido</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(employer)}>
                          <Eye className="h-4 w-4" />
                          Detalhes
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(employer)}>
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button variant={employer.active ? "danger" : "secondary"} size="sm" onClick={() => void handleRemove(employer)} disabled={submitting}>
                          {employer.active ? <Ban className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                          {employer.active ? "Desativar" : "Excluir"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!loading && filteredEmployers.length === 0 ? (
              <EmptyState title="Nenhum patrao encontrado." description="Cadastre o primeiro patrao ou ajuste a pesquisa." icon={<BriefcaseBusiness className="h-5 w-5" />} />
            ) : null}
          </div>
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="max-h-[92vh] w-full max-w-5xl overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate">{selected.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted">{selected.companyName || "Sem empresa cadastrada"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Fechar detalhes">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-elevated p-4">
                  <p className="text-xs uppercase text-muted">Total trabalhado</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatMoney(metricsByEmployer.get(selected.id)?.worked ?? 0, profile.defaultCurrency)}</p>
                </div>
                <div className="rounded-lg border border-border bg-elevated p-4">
                  <p className="text-xs uppercase text-muted">Em aberto</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatMoney(metricsByEmployer.get(selected.id)?.open ?? 0, profile.defaultCurrency)}</p>
                </div>
                <div className="rounded-lg border border-border bg-elevated p-4">
                  <p className="text-xs uppercase text-muted">Vencido</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatMoney(metricsByEmployer.get(selected.id)?.overdue ?? 0, profile.defaultCurrency)}</p>
                </div>
                <div className="rounded-lg border border-border bg-elevated p-4">
                  <p className="text-xs uppercase text-muted">Dias</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{metricsByEmployer.get(selected.id)?.days ?? 0}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => window.location.assign(`/work-hours?employerId=${selected.id}`)}>
                  <Clock3 className="h-4 w-4" />
                  Adicionar horas
                </Button>
                <Button variant="secondary" onClick={() => window.location.assign(`/receivables?employerId=${selected.id}`)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Registrar pagamento
                </Button>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Historico por mes</p>
                  {selectedMonthlyHistory.map(([month, row]) => (
                    <div key={month} className="rounded-lg border border-border bg-elevated p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-foreground">{month}</span>
                        <span className="text-muted">{formatMoney(row.worked, profile.defaultCurrency)} trabalhado</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatMoney(row.open, profile.defaultCurrency)} aberto - {formatMoney(row.received, profile.defaultCurrency)} recebido
                      </p>
                    </div>
                  ))}
                  {selectedMonthlyHistory.length === 0 ? <p className="text-sm text-muted">Sem historico financeiro.</p> : null}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Obras e locais</p>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(selectedReceivables.map((item) => item.workOrService))].map((place) => (
                      <Badge key={place}>{place}</Badge>
                    ))}
                  </div>
                  {selectedReceivables.length === 0 ? <p className="text-sm text-muted">Sem obras cadastradas.</p> : null}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Registros de horas</p>
                  {selectedWorkEntries.slice(0, 12).map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border bg-elevated p-3 text-sm">
                      <p className="font-medium text-foreground">{formatBelgiumDate(entry.workDate)}</p>
                      <p className="mt-1 text-xs text-muted">
                        {entry.clockInTime} - {entry.clockOutTime ?? "Aberto"} - {formatMoney(getWorkAmount(entry), profile.defaultCurrency)}
                      </p>
                    </div>
                  ))}
                  {selectedWorkEntries.length === 0 ? <p className="text-sm text-muted">Sem horas vinculadas.</p> : null}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Pagamentos</p>
                  {selectedPayments.slice(0, 12).map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-border bg-elevated p-3 text-sm">
                      <p className="font-medium text-foreground">{formatMoney(payment.amount, payment.currency)}</p>
                      <p className="mt-1 text-xs text-muted">
                        {payment.receivedAt} {payment.notes ? `- ${payment.notes}` : ""}
                      </p>
                    </div>
                  ))}
                  {selectedPayments.length === 0 ? <p className="text-sm text-muted">Sem pagamentos registrados.</p> : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
