"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, HandCoins, Pencil, Plus, Save, Trash2, X } from "lucide-react";
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
import { formatDate, formatMoney, parseAmount, toInputDate } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Currency } from "@/lib/types";

type ReceivableStatus = "open" | "received";

type Receivable = {
  id: string;
  appUserId: string;
  groupId: string;
  payerName: string;
  workOrService: string;
  amount: number;
  currency: Currency;
  dueDate?: string;
  status: ReceivableStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type ReceivableRow = {
  id: string;
  app_user_id: string;
  group_id: string;
  payer_name: string;
  work_or_service: string;
  amount: number | string;
  currency: Currency;
  due_date: string | null;
  status: ReceivableStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  payerName: string;
  workOrService: string;
  amount: string;
  currency: Currency;
  dueDate: string;
  status: ReceivableStatus;
  notes: string;
};

type StatusFilter = ReceivableStatus | "all";

function createReceivableId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createInitialForm(currency: Currency): FormState {
  return {
    payerName: "",
    workOrService: "",
    amount: "",
    currency,
    dueDate: toInputDate(),
    status: "open",
    notes: ""
  };
}

function toReceivable(row: ReceivableRow): Receivable {
  return {
    id: row.id,
    appUserId: row.app_user_id,
    groupId: row.group_id,
    payerName: row.payer_name,
    workOrService: row.work_or_service,
    amount: Number(row.amount),
    currency: row.currency,
    dueDate: row.due_date ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toReceivableRow(item: Receivable, authUserId: string) {
  return {
    id: item.id,
    auth_user_id: authUserId,
    app_user_id: item.appUserId,
    group_id: item.groupId,
    payer_name: item.payerName,
    work_or_service: item.workOrService,
    amount: item.amount,
    currency: item.currency,
    due_date: item.dueDate ?? null,
    status: item.status,
    notes: item.notes ?? null,
    updated_at: item.updatedAt
  };
}

function getStorageKey(appUserId: string) {
  return `financeos:receivables:${appUserId}`;
}

function getReceivablesErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("receivables") || message.includes("schema cache")) {
    return "A tabela de valores a receber ainda não existe no Supabase. Rode o arquivo supabase/receivables.sql no SQL Editor e recarregue esta página.";
  }

  return "Não foi possível atualizar os valores a receber.";
}

function toFormState(item: Receivable): FormState {
  return {
    payerName: item.payerName,
    workOrService: item.workOrService,
    amount: String(item.amount),
    currency: item.currency,
    dueDate: item.dueDate ?? "",
    status: item.status,
    notes: item.notes ?? ""
  };
}

export default function ReceivablesPage() {
  const { profile } = useFinance();
  const [items, setItems] = useState<Receivable[]>([]);
  const [editing, setEditing] = useState<Receivable | null>(null);
  const [form, setForm] = useState<FormState>(() => createInitialForm(profile.defaultCurrency));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const useSupabase = process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase";

  const visibleItems = useMemo(
    () => (statusFilter === "all" ? items : items.filter((item) => item.status === statusFilter)),
    [items, statusFilter]
  );
  const openItems = useMemo(() => items.filter((item) => item.status === "open"), [items]);
  const openTotal = useMemo(
    () => openItems.filter((item) => item.currency === profile.defaultCurrency).reduce((total, item) => total + item.amount, 0),
    [openItems, profile.defaultCurrency]
  );
  const overdueCount = useMemo(() => {
    const today = toInputDate();
    return openItems.filter((item) => item.dueDate && item.dueDate < today).length;
  }, [openItems]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditing(null);
    setForm(createInitialForm(profile.defaultCurrency));
  }

  async function getAuthUserId() {
    const client = getSupabaseBrowserClient();

    if (!client) {
      throw new Error("Supabase não está configurado.");
    }

    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      throw new Error("Sessão Supabase não encontrada.");
    }

    return data.user.id;
  }

  async function loadItems() {
    if (!useSupabase) {
      const stored = window.localStorage.getItem(getStorageKey(profile.appUserId));
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

  function persistLocal(nextItems: Receivable[]) {
    if (!useSupabase) {
      window.localStorage.setItem(getStorageKey(profile.appUserId), JSON.stringify(nextItems));
    }
  }

  async function persistItem(item: Receivable) {
    if (!useSupabase) {
      return;
    }

    const client = getSupabaseBrowserClient();

    if (!client) {
      return;
    }

    const authUserId = await getAuthUserId();
    const { error } = await client.from("receivables").upsert(toReceivableRow(item, authUserId));

    if (error) {
      throw new Error(error.message);
    }
  }

  async function deletePersistedItem(item: Receivable) {
    if (!useSupabase) {
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

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const loaded = await loadItems();

        if (mounted) {
          setItems(loaded);
        }
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

    const amount = parseAmount(form.amount);

    if (!form.payerName.trim()) {
      setMessage({ tone: "error", text: "Informe de quem falta receber." });
      return;
    }

    if (!form.workOrService.trim()) {
      setMessage({ tone: "error", text: "Informe a obra ou serviço." });
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
        id: editing?.id ?? createReceivableId(),
        appUserId: profile.appUserId,
        groupId: profile.groupId,
        payerName: form.payerName.trim(),
        workOrService: form.workOrService.trim(),
        amount,
        currency: form.currency,
        dueDate: form.dueDate || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
        createdAt: editing?.createdAt ?? now,
        updatedAt: now
      };
      const nextItems = editing ? items.map((item) => (item.id === editing.id ? saved : item)) : [saved, ...items];

      persistLocal(nextItems);
      await persistItem(saved);
      setItems(nextItems);
      resetForm();
      setMessage({ tone: "success", text: editing ? "Valor a receber atualizado." : "Valor a receber anotado." });
    } catch (error) {
      setMessage({ tone: "error", text: getReceivablesErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function markAsReceived(item: Receivable) {
    const saved = { ...item, status: "received" as const, updatedAt: new Date().toISOString() };
    const nextItems = items.map((current) => (current.id === item.id ? saved : current));

    setSubmitting(true);
    setMessage(null);

    try {
      persistLocal(nextItems);
      await persistItem(saved);
      setItems(nextItems);
      setMessage({ tone: "success", text: "Marcado como recebido. Se quiser registrar no caixa, crie a entrada na aba Entradas." });
    } catch (error) {
      setMessage({ tone: "error", text: getReceivablesErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: Receivable) {
    if (!window.confirm(`Excluir "${item.workOrService}"?`)) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const nextItems = items.filter((current) => current.id !== item.id);
      persistLocal(nextItems);
      await deletePersistedItem(item);
      setItems(nextItems);
      setMessage({ tone: "success", text: "Registro excluído." });
    } catch (error) {
      setMessage({ tone: "error", text: getReceivablesErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Controle de pendências</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Falta receber</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Anote valores pendentes por pessoa, obra ou serviço sem registrar entrada no caixa antes do recebimento.
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
              <Field label="De quem">
                <Input value={form.payerName} onChange={(event) => updateField("payerName", event.target.value)} placeholder="Nome do cliente ou responsável" required />
              </Field>
              <Field label="Obra ou serviço">
                <Input value={form.workOrService} onChange={(event) => updateField("workOrService", event.target.value)} placeholder="Ex: Pintura, diária, reforma..." required />
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
                <Field label="Previsão de recebimento">
                  <Input type="date" value={form.dueDate} onChange={(event) => updateField("dueDate", event.target.value)} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={(event) => updateField("status", event.target.value as ReceivableStatus)}>
                    <option value="open">Em aberto</option>
                    <option value="received">Recebido</option>
                  </Select>
                </Field>
              </div>
              <Field label="Observação opcional">
                <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Detalhes da obra, combinado, etapa ou referência." />
              </Field>
              <Button type="submit" className="w-full" disabled={submitting}>
                {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {submitting ? "Salvando..." : editing ? "Salvar valor" : "Anotar valor"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-panel p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-foreground">Valores cadastrados</p>
              <p className="mt-1 text-xs text-muted">{loading ? "Carregando..." : `${visibleItems.length} item(ns) exibido(s)`}</p>
            </div>
            <Select className="w-full sm:w-48" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="open">Em aberto</option>
              <option value="received">Recebidos</option>
              <option value="all">Todos</option>
            </Select>
          </div>

          <div className="grid gap-3">
            {visibleItems.map((item) => {
              const isOverdue = item.status === "open" && item.dueDate && item.dueDate < toInputDate();

              return (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{item.workOrService}</p>
                          <Badge>{item.status === "open" ? "Em aberto" : "Recebido"}</Badge>
                          {isOverdue ? <Badge>Vencido</Badge> : null}
                        </div>
                        <p className="mt-2 text-xs text-muted">De: {item.payerName}</p>
                        <p className="mt-1 text-xs text-muted">
                          Previsão: {item.dueDate ? formatDate(item.dueDate) : "Sem data"}{item.notes ? ` - ${item.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <p className="text-base font-semibold text-foreground">{formatMoney(item.amount, item.currency)}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          {item.status === "open" ? (
                            <Button variant="secondary" size="sm" onClick={() => void markAsReceived(item)} disabled={submitting}>
                              <CheckCircle2 className="h-4 w-4" />
                              Recebido
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
            })}
            {!loading && visibleItems.length === 0 ? (
              <EmptyState
                title="Nenhum valor neste filtro."
                description="Use o formulário ao lado para anotar o que ainda falta receber."
                icon={<HandCoins className="h-5 w-5" />}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
