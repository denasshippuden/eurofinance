"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, Pause, Play, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { currencyOptions, expenseCategories, paymentMethods } from "@/lib/constants";
import { getBusinessMonthKey, getDueDateForMonth, shiftBusinessMonth } from "@/lib/date-period";
import { formatDate, formatMoney, parseAmount, toInputDate } from "@/lib/format";
import { useFinance } from "@/components/providers/finance-provider";
import { getVisibleWalletUsers } from "@/lib/users";
import type { Currency, RecurringExpense, RecurringExpenseDraft, RecurringExpenseStatus } from "@/lib/types";

type StatusFilter = RecurringExpenseStatus | "all";

interface FormState {
  description: string;
  amount: string;
  currency: Currency;
  category: string;
  paymentMethod: string;
  walletUserId: string;
  dueDay: string;
  startDate: string;
  endDate: string;
  notes: string;
  status: RecurringExpenseStatus;
  autoGenerate: boolean;
}

function createInitialState(defaultCurrency: Currency, walletUserId: string): FormState {
  return {
    description: "",
    amount: "",
    currency: defaultCurrency,
    category: "Casa",
    paymentMethod: paymentMethods[0] ?? "Outro",
    walletUserId,
    dueDay: "10",
    startDate: toInputDate(),
    endDate: "",
    notes: "",
    status: "active",
    autoGenerate: true
  };
}

function toFormState(item: RecurringExpense): FormState {
  return {
    description: item.description,
    amount: String(item.amount),
    currency: item.currency,
    category: item.category,
    paymentMethod: item.paymentMethod,
    walletUserId: item.walletUserId,
    dueDay: String(item.dueDay),
    startDate: item.startDate,
    endDate: item.endDate ?? "",
    notes: item.notes ?? "",
    status: item.status,
    autoGenerate: item.autoGenerate
  };
}

function nextDueDate(item: RecurringExpense) {
  const monthKey = getBusinessMonthKey();
  const dueDate = getDueDateForMonth(monthKey, item.dueDay);
  return dueDate < toInputDate() ? getDueDateForMonth(shiftBusinessMonth(monthKey, 1), item.dueDay) : dueDate;
}

export default function FixedExpensesPage() {
  const {
    profile,
    walletUsers,
    recurringExpenses,
    listRecurringExpenses,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    ensureRecurringExpensesForMonth
  } = useFinance();
  const visibleWalletUsers = getVisibleWalletUsers(profile, walletUsers);
  const [items, setItems] = useState(recurringExpenses);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [form, setForm] = useState<FormState>(() => createInitialState(profile.defaultCurrency, visibleWalletUsers[0]?.id ?? profile.appUserId));
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const visibleItems = useMemo(
    () => (statusFilter === "all" ? items : items.filter((item) => item.status === statusFilter)),
    [items, statusFilter]
  );

  useEffect(() => {
    void listRecurringExpenses("all").then(setItems).catch(() => undefined);
    void ensureRecurringExpensesForMonth(getBusinessMonthKey()).catch(() => undefined);
  }, [ensureRecurringExpensesForMonth, listRecurringExpenses]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(item: RecurringExpense) {
    setEditing(item);
    setForm(toFormState(item));
    setMessage(null);
  }

  function resetForm() {
    setEditing(null);
    setForm(createInitialState(profile.defaultCurrency, visibleWalletUsers[0]?.id ?? profile.appUserId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const amount = parseAmount(form.amount);
    const dueDay = Number(form.dueDay);
    const walletUser = visibleWalletUsers.find((user) => user.id === form.walletUserId);

    if (!form.description.trim()) {
      setMessage({ tone: "error", text: "Informe uma descricao." });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ tone: "error", text: "Informe um valor maior que zero." });
      return;
    }

    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      setMessage({ tone: "error", text: "O vencimento precisa estar entre 1 e 31." });
      return;
    }

    if (!walletUser) {
      setMessage({ tone: "error", text: "Selecione uma carteira." });
      return;
    }

    if (form.endDate && form.endDate < form.startDate) {
      setMessage({ tone: "error", text: "A data final nao pode ser anterior a data inicial." });
      return;
    }

    const draft: RecurringExpenseDraft = {
      walletUserId: walletUser.id,
      description: form.description.trim(),
      amount,
      currency: form.currency,
      category: form.category,
      paymentMethod: form.paymentMethod,
      dueDay,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      notes: form.notes.trim() || undefined,
      status: form.status,
      autoGenerate: form.autoGenerate
    };

    setSubmitting(true);

    try {
      const saved = editing ? await updateRecurringExpense(editing.id, draft) : await addRecurringExpense(draft);
      setItems((current) => (editing ? current.map((item) => (item.id === editing.id ? saved : item)) : [saved, ...current]));
      resetForm();
      setMessage({ tone: "success", text: editing ? "Conta fixa atualizada." : "Conta fixa criada." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Nao foi possivel salvar." });
    } finally {
      setSubmitting(false);
    }
  }

  async function setItemStatus(item: RecurringExpense, status: RecurringExpenseStatus) {
    const updated = await updateRecurringExpense(item.id, {
      walletUserId: item.walletUserId,
      description: item.description,
      amount: item.amount,
      currency: item.currency,
      category: item.category,
      paymentMethod: item.paymentMethod,
      dueDay: item.dueDay,
      startDate: item.startDate,
      endDate: item.endDate,
      notes: item.notes,
      status,
      autoGenerate: item.autoGenerate
    });
    setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? updated : currentItem)));
  }

  async function handleDelete(item: RecurringExpense) {
    if (!window.confirm(`Excluir "${item.description}"?`)) {
      return;
    }

    await deleteRecurringExpense(item.id);
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    setMessage({ tone: "success", text: "Conta fixa excluida." });
  }

  async function handleGenerateCurrentMonth() {
    setSubmitting(true);
    setMessage(null);

    try {
      const generated = await ensureRecurringExpensesForMonth(getBusinessMonthKey(), "manual");
      setMessage({ tone: "success", text: generated.length === 0 ? "Contas do mes ja estavam geradas." : `${generated.length} conta(s) gerada(s).` });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Nao foi possivel gerar as contas." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Recorrencias mensais</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Contas fixas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Cadastre despesas recorrentes e gere ocorrencias mensais sem duplicidade.
          </p>
        </div>
        <Button variant="secondary" onClick={handleGenerateCurrentMonth} disabled={submitting}>
          <RefreshCw className="h-4 w-4" />
          Gerar contas deste mes
        </Button>
      </header>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>{editing ? "Editar conta fixa" : "Nova conta fixa"}</CardTitle>
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
              <Field label="Descricao">
                <Input value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Ex: Aluguel" required />
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
              <Field label="Carteira responsavel">
                <Select value={form.walletUserId} onChange={(event) => updateField("walletUserId", event.target.value)}>
                  {visibleWalletUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Categoria">
                  <Select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Metodo de pagamento">
                  <Select value={form.paymentMethod} onChange={(event) => updateField("paymentMethod", event.target.value)}>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Vencimento">
                  <Input type="number" min={1} max={31} value={form.dueDay} onChange={(event) => updateField("dueDay", event.target.value)} required />
                </Field>
                <Field label="Inicio">
                  <Input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} required />
                </Field>
                <Field label="Fim opcional">
                  <Input type="date" value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status">
                  <Select value={form.status} onChange={(event) => updateField("status", event.target.value as RecurringExpenseStatus)}>
                    <option value="active">Ativa</option>
                    <option value="paused">Pausada</option>
                  </Select>
                </Field>
                <label className="flex min-h-10 items-center gap-3 rounded-md border border-border bg-elevated px-3 text-sm text-subtle">
                  <input
                    type="checkbox"
                    checked={form.autoGenerate}
                    onChange={(event) => updateField("autoGenerate", event.target.checked)}
                  />
                  Geracao automatica mensal
                </label>
              </div>
              <Field label="Observacao opcional">
                <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Contrato, referencia ou detalhes internos." />
              </Field>
              <Button type="submit" className="w-full" disabled={submitting}>
                {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {submitting ? "Salvando..." : editing ? "Salvar conta fixa" : "Criar conta fixa"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-panel p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-foreground">Contas cadastradas</p>
              <p className="mt-1 text-xs text-muted">{visibleItems.length} item(ns) exibido(s)</p>
            </div>
            <Select className="w-full sm:w-48" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="active">Ativas</option>
              <option value="paused">Pausadas</option>
              <option value="all">Todas</option>
            </Select>
          </div>

          <div className="grid gap-3">
            {visibleItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.description}</p>
                        <Badge>{item.status === "active" ? "Ativa" : "Pausada"}</Badge>
                        {item.autoGenerate ? <Badge>Auto</Badge> : null}
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {item.walletUserName} - {item.category} - vence dia {item.dueDay}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Proximo vencimento: {formatDate(nextDueDate(item))} - inicio: {formatDate(item.startDate)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <p className="text-base font-semibold text-foreground">{formatMoney(item.amount, item.currency)}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                          Editar
                        </Button>
                        {item.status === "active" ? (
                          <Button variant="secondary" size="sm" onClick={() => void setItemStatus(item, "paused")}>
                            <Pause className="h-4 w-4" />
                            Pausar
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => void setItemStatus(item, "active")}>
                            <Play className="h-4 w-4" />
                            Reativar
                          </Button>
                        )}
                        <Button variant="danger" size="sm" onClick={() => void handleDelete(item)}>
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {visibleItems.length === 0 ? (
              <Card>
                <CardContent className="p-5 text-sm text-muted">
                  <CalendarClock className="mb-3 h-5 w-5" />
                  Nenhuma conta fixa neste filtro.
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
