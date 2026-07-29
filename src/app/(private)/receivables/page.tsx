"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, HandCoins, Pencil, Plus, Save, Trash2, X } from "lucide-react";
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
import { currencyOptions } from "@/lib/constants";
import {
  deleteReceivable,
  loadEmployers,
  loadReceivables,
  migrateLegacyReceivables,
  persistPayment,
  persistReceivable,
  persistReceivables
} from "@/lib/employer-data";
import {
  createEntityId,
  getEmployerDisplayName,
  getReceivableBalance,
  isReceivableOverdue,
  type Employer,
  type Payment,
  type PaymentItem,
  type Receivable,
  type ReceivableStatus
} from "@/lib/employers";
import { formatDate, formatMoney, parseAmount, toInputDate } from "@/lib/format";
import type { Currency } from "@/lib/types";

type FormState = {
  employerId: string;
  workOrService: string;
  amount: string;
  currency: Currency;
  dueDate: string;
  status: ReceivableStatus;
  notes: string;
};

type StatusFilter = ReceivableStatus | "open_overdue" | "all";
type ViewMode = "grouped" | "individual";

type EmployerGroup = {
  key: string;
  employer?: Employer;
  items: Receivable[];
  totalOpen: number;
  totalOverdue: number;
  totalReceived: number;
  overdueCount: number;
  nextDueDate?: string;
};

type PaymentForm = {
  ids: string[];
  amount: string;
  receivedAt: string;
  notes: string;
};

function createInitialForm(currency: Currency, employerId = ""): FormState {
  return {
    employerId,
    workOrService: "",
    amount: "",
    currency,
    dueDate: toInputDate(),
    status: "open",
    notes: ""
  };
}

function toFormState(item: Receivable): FormState {
  return {
    employerId: item.employerId ?? "",
    workOrService: item.workOrService,
    amount: String(item.amount),
    currency: item.currency,
    dueDate: item.dueDate ?? "",
    status: item.status,
    notes: item.notes ?? ""
  };
}

function getReceivablesErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("receivables") || message.includes("employers") || message.includes("payments") || message.includes("schema cache")) {
    return "Atualize o banco rodando supabase/employers_payments.sql no SQL Editor e recarregue esta pagina.";
  }

  return error instanceof Error ? error.message : "Nao foi possivel atualizar os valores a receber.";
}

function getGroupKey(item: Receivable) {
  return item.employerId ?? "undefined";
}

export default function ReceivablesPage() {
  const { profile } = useFinance();
  const [items, setItems] = useState<Receivable[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [editing, setEditing] = useState<Receivable | null>(null);
  const [form, setForm] = useState<FormState>(() => createInitialForm(profile.defaultCurrency));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [employerFilter, setEmployerFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const useSupabase = process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase";
  const today = toInputDate();
  const activeEmployers = useMemo(() => employers.filter((employer) => employer.active), [employers]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const comparisonDate = item.dueDate ?? item.createdAt.slice(0, 10);

      if (statusFilter === "open" && item.status !== "open") {
        return false;
      }

      if (statusFilter === "received" && item.status !== "received") {
        return false;
      }

      if (statusFilter === "open_overdue" && !isReceivableOverdue(item, today)) {
        return false;
      }

      if (employerFilter !== "all" && (item.employerId ?? "undefined") !== employerFilter) {
        return false;
      }

      if (monthFilter && !comparisonDate.startsWith(monthFilter)) {
        return false;
      }

      if (startDate && comparisonDate < startDate) {
        return false;
      }

      if (endDate && comparisonDate > endDate) {
        return false;
      }

      if (locationFilter.trim() && !item.workOrService.toLocaleLowerCase("pt-BR").includes(locationFilter.trim().toLocaleLowerCase("pt-BR"))) {
        return false;
      }

      return true;
    });
  }, [employerFilter, endDate, items, locationFilter, monthFilter, startDate, statusFilter, today]);

  const groups = useMemo(() => {
    const map = new Map<string, EmployerGroup>();

    for (const item of visibleItems) {
      const key = getGroupKey(item);
      const employer = employers.find((candidate) => candidate.id === item.employerId);
      const group = map.get(key) ?? {
        key,
        employer,
        items: [],
        totalOpen: 0,
        totalOverdue: 0,
        totalReceived: 0,
        overdueCount: 0,
        nextDueDate: undefined
      };

      group.items.push(item);
      group.totalOpen += item.status === "open" ? getReceivableBalance(item) : 0;
      group.totalOverdue += isReceivableOverdue(item, today) ? getReceivableBalance(item) : 0;
      group.totalReceived += item.receivedAmount ?? (item.status === "received" ? item.amount : 0);
      group.overdueCount += isReceivableOverdue(item, today) ? 1 : 0;

      if (item.status === "open" && item.dueDate && (!group.nextDueDate || item.dueDate < group.nextDueDate)) {
        group.nextDueDate = item.dueDate;
      }

      map.set(key, group);
    }

    return [...map.values()].sort((a, b) => a.employer?.name.localeCompare(b.employer?.name ?? "") ?? 1);
  }, [employers, today, visibleItems]);

  const openItems = useMemo(() => items.filter((item) => item.status === "open"), [items]);
  const openTotal = useMemo(() => openItems.reduce((total, item) => total + getReceivableBalance(item), 0), [openItems]);
  const overdueCount = useMemo(() => openItems.filter((item) => isReceivableOverdue(item, today)).length, [openItems, today]);
  const selectedItems = useMemo(() => items.filter((item) => selectedIds.has(item.id)), [items, selectedIds]);
  const selectedBalance = useMemo(() => selectedItems.reduce((total, item) => total + getReceivableBalance(item), 0), [selectedItems]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    const queryEmployerId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("employerId") ?? "" : "";
    setEditing(null);
    setForm(createInitialForm(profile.defaultCurrency, queryEmployerId));
  }

  async function loadAll() {
    const [loadedEmployers, loadedItems] = await Promise.all([loadEmployers(profile, useSupabase), loadReceivables(profile, useSupabase)]);
    const migration = await migrateLegacyReceivables(profile, useSupabase, loadedEmployers, loadedItems);

    setEmployers(migration.employers);
    setItems(migration.receivables);

    const queryEmployerId = new URLSearchParams(window.location.search).get("employerId");
    if (queryEmployerId) {
      setEmployerFilter(queryEmployerId);
      setForm((current) => ({ ...current, employerId: queryEmployerId }));
    }
  }

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        await loadAll();
      } catch (error) {
        if (mounted) {
          setMessage({ tone: "error", text: getReceivablesErrorMessage(error) });
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

  function startEdit(item: Receivable) {
    setEditing(item);
    setForm(toFormState(item));
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const employer = employers.find((item) => item.id === form.employerId);
    const amount = parseAmount(form.amount);

    if (!employer) {
      setMessage({ tone: "error", text: "Selecione um patrao." });
      return;
    }

    if (!form.workOrService.trim()) {
      setMessage({ tone: "error", text: "Informe a obra ou servico." });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ tone: "error", text: "Informe um valor maior que zero." });
      return;
    }

    setSubmitting(true);

    try {
      const now = new Date().toISOString();
      const saved: Receivable = {
        id: editing?.id ?? createEntityId("receivable"),
        appUserId: profile.appUserId,
        groupId: profile.groupId,
        employerId: employer.id,
        paymentId: editing?.paymentId,
        payerName: employer.name,
        workOrService: form.workOrService.trim(),
        amount,
        receivedAmount: editing?.receivedAmount ?? (form.status === "received" ? amount : 0),
        currency: form.currency,
        dueDate: form.dueDate || undefined,
        receivedAt: editing?.receivedAt,
        status: form.status,
        notes: form.notes.trim() || undefined,
        createdAt: editing?.createdAt ?? now,
        updatedAt: now
      };
      const nextItems = editing ? items.map((item) => (item.id === editing.id ? saved : item)) : [saved, ...items];

      await persistReceivable(profile, useSupabase, saved);
      setItems(nextItems);
      resetForm();
      setMessage({ tone: "success", text: editing ? "Valor a receber atualizado." : "Valor a receber anotado." });
    } catch (error) {
      setMessage({ tone: "error", text: getReceivablesErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  function toggleGroup(key: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectGroup(group: EmployerGroup) {
    const openIds = group.items.filter((item) => item.status === "open" && getReceivableBalance(item) > 0).map((item) => item.id);
    setSelectedIds((current) => new Set([...current, ...openIds]));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function openPayment(ids: string[]) {
    const targets = items.filter((item) => ids.includes(item.id) && item.status === "open" && getReceivableBalance(item) > 0);
    const amount = targets.reduce((total, item) => total + getReceivableBalance(item), 0);

    if (targets.length === 0 || amount <= 0) {
      setMessage({ tone: "error", text: "Selecione registros em aberto." });
      return;
    }

    setPaymentForm({
      ids: targets.map((item) => item.id),
      amount: String(amount),
      receivedAt: toInputDate(),
      notes: ""
    });
  }

  async function applyPaymentFromForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!paymentForm) {
      return;
    }

    const amount = parseAmount(paymentForm.amount);
    const targets = items
      .filter((item) => paymentForm.ids.includes(item.id) && item.status === "open" && getReceivableBalance(item) > 0)
      .sort((a, b) => (a.dueDate ?? a.createdAt).localeCompare(b.dueDate ?? b.createdAt));

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ tone: "error", text: "Informe um valor recebido maior que zero." });
      return;
    }

    if (!paymentForm.receivedAt) {
      setMessage({ tone: "error", text: "Informe a data do recebimento." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const paymentId = createEntityId("payment");
      const now = new Date().toISOString();
      let remaining = amount;
      const paymentItems: PaymentItem[] = [];
      const touched = new Map<string, Receivable>();

      for (const item of targets) {
        if (remaining <= 0) {
          break;
        }

        const balance = getReceivableBalance(item);
        const appliedAmount = Math.min(balance, remaining);
        const receivedAmount = (item.receivedAmount ?? 0) + appliedAmount;
        const paid = receivedAmount >= item.amount;
        const updated: Receivable = {
          ...item,
          paymentId,
          receivedAmount,
          receivedAt: paymentForm.receivedAt,
          status: paid ? "received" : "open",
          notes: paymentForm.notes.trim() ? [item.notes, paymentForm.notes.trim()].filter(Boolean).join(" | ") : item.notes,
          updatedAt: now
        };

        paymentItems.push({ paymentId, receivableId: item.id, appliedAmount });
        touched.set(item.id, updated);
        remaining -= appliedAmount;
      }

      const payment: Payment = {
        id: paymentId,
        groupId: profile.groupId,
        employerId: targets.every((item) => item.employerId === targets[0]?.employerId) ? targets[0]?.employerId : undefined,
        amount: amount - Math.max(remaining, 0),
        currency: profile.defaultCurrency,
        receivedAt: paymentForm.receivedAt,
        notes: paymentForm.notes.trim() || undefined,
        createdAt: now
      };
      const nextItems = items.map((item) => touched.get(item.id) ?? item);

      await persistPayment(profile, useSupabase, payment, paymentItems);
      await persistReceivables(profile, useSupabase, useSupabase ? [...touched.values()] : nextItems);
      setItems(nextItems);
      setPaymentForm(null);
      clearSelection();
      setMessage({ tone: "success", text: remaining > 0 ? "Pagamento registrado. Parte do valor ficou sem aplicacao por falta de saldo aberto." : "Pagamento registrado." });
    } catch (error) {
      setMessage({ tone: "error", text: getReceivablesErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function markAsReceived(item: Receivable) {
    openPayment([item.id]);
  }

  async function handleDelete(item: Receivable) {
    if (!window.confirm(`Excluir "${item.workOrService}"?`)) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const nextItems = items.filter((current) => current.id !== item.id);
      await deleteReceivable(profile, useSupabase, item);
      setItems(nextItems);
      setMessage({ tone: "success", text: "Registro excluido." });
    } catch (error) {
      setMessage({ tone: "error", text: getReceivablesErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  function renderReceivable(item: Receivable) {
    const isOverdue = isReceivableOverdue(item, today);
    const balance = getReceivableBalance(item);

    return (
      <Card key={item.id}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {item.status === "open" ? (
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-current"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelected(item.id)}
                    aria-label={`Selecionar ${item.workOrService}`}
                  />
                ) : null}
                <p className="text-sm font-semibold text-foreground">{item.workOrService}</p>
                <Badge>{item.status === "open" ? "Em aberto" : "Recebido"}</Badge>
                {isOverdue ? <Badge>Vencido</Badge> : null}
              </div>
              <p className="mt-2 text-xs text-muted">De: {getEmployerDisplayName(employers, item.employerId, item.payerName)}</p>
              <p className="mt-1 text-xs text-muted">
                Previsao: {item.dueDate ? formatDate(item.dueDate) : "Sem data"}{item.notes ? ` - ${item.notes}` : ""}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="text-left sm:text-right">
                <p className="text-base font-semibold text-foreground">{formatMoney(item.amount, item.currency)}</p>
                {balance !== item.amount ? <p className="text-xs text-muted">{formatMoney(balance, item.currency)} em aberto</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                {item.status === "open" ? (
                  <Button variant="secondary" size="sm" onClick={() => void markAsReceived(item)} disabled={submitting}>
                    <CheckCircle2 className="h-4 w-4" />
                    Receber
                  </Button>
                ) : null}
                <Button variant="danger" size="sm" onClick={() => void handleDelete(item)} disabled={submitting}>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Controle de pendencias</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Falta receber</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Valores pendentes agrupados por patrao, com registros individuais e pagamentos parciais.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Badge>{openItems.length} em aberto</Badge>
          <Badge>{overdueCount} vencido(s)</Badge>
          <Badge>{formatMoney(openTotal, profile.defaultCurrency)}</Badge>
        </div>
      </header>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>{editing ? "Editar valor" : "Novo valor a receber"}</CardTitle>
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
              <Field label="Patrao">
                <Select value={form.employerId} onChange={(event) => updateField("employerId", event.target.value)} required>
                  <option value="">Selecione um patrao</option>
                  {activeEmployers.map((employer) => (
                    <option key={employer.id} value={employer.id}>
                      {employer.name}
                    </option>
                  ))}
                  {editing?.employerId && !activeEmployers.some((employer) => employer.id === editing.employerId) ? (
                    <option value={editing.employerId}>{getEmployerDisplayName(employers, editing.employerId)}</option>
                  ) : null}
                </Select>
              </Field>
              <Field label="Obra ou servico">
                <Input value={form.workOrService} onChange={(event) => updateField("workOrService", event.target.value)} placeholder="Ex: Hambeek, Juffern..." required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor">
                  <Input inputMode="decimal" value={form.amount} onChange={(event) => updateField("amount", event.target.value)} placeholder="0,00" required />
                </Field>
                <Field label="Moeda">
                  <Select value={form.currency} onChange={(event) => updateField("currency", event.target.value as Currency)}>
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Previsao">
                  <Input type="date" value={form.dueDate} onChange={(event) => updateField("dueDate", event.target.value)} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={(event) => updateField("status", event.target.value as ReceivableStatus)}>
                    <option value="open">Em aberto</option>
                    <option value="received">Recebido</option>
                  </Select>
                </Field>
              </div>
              <Field label="Observacao opcional">
                <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Detalhes da obra, combinado, etapa ou referencia." />
              </Field>
              <Button type="submit" className="w-full" disabled={submitting}>
                {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {submitting ? "Salvando..." : editing ? "Salvar valor" : "Anotar valor"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-panel p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Patrao">
                <Select value={employerFilter} onChange={(event) => setEmployerFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  <option value="undefined">Patrao nao definido</option>
                  {employers.map((employer) => (
                    <option key={employer.id} value={employer.id}>
                      {employer.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Mes">
                <Input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} />
              </Field>
              <Field label="Local da obra">
                <Input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="Buscar local" />
              </Field>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <Field label="Inicio">
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </Field>
              <Field label="Fim">
                <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                  <option value="open">Em aberto</option>
                  <option value="open_overdue">Vencido</option>
                  <option value="received">Recebido</option>
                  <option value="all">Todos</option>
                </Select>
              </Field>
              <Field label="Visualizacao">
                <Select value={viewMode} onChange={(event) => setViewMode(event.target.value as ViewMode)}>
                  <option value="grouped">Agrupar por patrao</option>
                  <option value="individual">Exibir individualmente</option>
                </Select>
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">{loading ? "Carregando..." : `${visibleItems.length} registro(s) exibido(s)`}</p>
              <div className="flex flex-wrap gap-2">
                {selectedIds.size > 0 ? (
                  <>
                    <Badge>{selectedIds.size} selecionado(s) - {formatMoney(selectedBalance, profile.defaultCurrency)}</Badge>
                    <Button size="sm" variant="secondary" onClick={() => openPayment([...selectedIds])}>
                      <CheckCircle2 className="h-4 w-4" />
                      Receber selecionados
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearSelection}>
                      Limpar
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {viewMode === "grouped"
              ? groups.map((group) => {
                  const expanded = expandedGroups.has(group.key);

                  return (
                    <Card key={group.key}>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <button type="button" className="flex min-w-0 items-start gap-3 text-left" onClick={() => toggleGroup(group.key)}>
                            {expanded ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" />}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">{group.employer?.name ?? "Patrao nao definido"}</span>
                              <span className="mt-1 block text-xs text-muted">{group.employer?.companyName ?? "Sem empresa"} - {group.items.length} registro(s)</span>
                            </span>
                          </button>
                          <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                            <Badge>{formatMoney(group.totalOpen, profile.defaultCurrency)} aberto</Badge>
                            <Badge>{formatMoney(group.totalOverdue, profile.defaultCurrency)} vencido</Badge>
                            <Badge>{group.overdueCount} vencido(s)</Badge>
                            <Badge>Prox: {group.nextDueDate ? formatDate(group.nextDueDate) : "Sem data"}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => selectGroup(group)}>
                              Selecionar todos
                            </Button>
                            <Button size="sm" onClick={() => openPayment(group.items.map((item) => item.id))}>
                              Receber
                            </Button>
                          </div>
                        </div>
                        {expanded ? <div className="mt-4 grid gap-3">{group.items.map(renderReceivable)}</div> : null}
                      </CardContent>
                    </Card>
                  );
                })
              : visibleItems.map(renderReceivable)}
            {!loading && visibleItems.length === 0 ? (
              <EmptyState title="Nenhum valor neste filtro." description="Use o formulario ao lado para anotar o que ainda falta receber." icon={<HandCoins className="h-5 w-5" />} />
            ) : null}
          </div>
        </div>
      </section>

      {paymentForm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Registrar pagamento</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setPaymentForm(null)} aria-label="Fechar pagamento">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={applyPaymentFromForm}>
                <div className="rounded-lg border border-border bg-elevated p-4">
                  <p className="text-xs uppercase text-muted">Selecionados</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{paymentForm.ids.length} registro(s)</p>
                  <p className="mt-1 text-xs text-muted">Saldo: {formatMoney(selectedBalance, profile.defaultCurrency)}</p>
                </div>
                <Field label="Valor recebido">
                  <Input inputMode="decimal" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => current ? { ...current, amount: event.target.value } : current)} required />
                </Field>
                <Field label="Data do recebimento">
                  <Input type="date" value={paymentForm.receivedAt} onChange={(event) => setPaymentForm((current) => current ? { ...current, receivedAt: event.target.value } : current)} required />
                </Field>
                <Field label="Observacao">
                  <Textarea value={paymentForm.notes} onChange={(event) => setPaymentForm((current) => current ? { ...current, notes: event.target.value } : current)} />
                </Field>
                <Button type="submit" className="w-full" disabled={submitting}>
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? "Registrando..." : "Salvar pagamento"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
