"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { currencyOptions, incomeSources, paymentMethods } from "@/lib/constants";
import { parseAmount, toInputDate } from "@/lib/format";
import type { Currency, Transaction, TransactionDraft, TransactionType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFinance } from "@/components/providers/finance-provider";
import { getVisibleWalletUsers } from "@/lib/users";

interface TransactionFormProps {
  type: TransactionType;
  editing?: Transaction | null;
  onCancelEdit?: () => void;
  onSaved?: () => void;
}

interface FormState {
  description: string;
  amount: string;
  currency: Currency;
  category: string;
  paymentMethod: string;
  source: string;
  walletUserId: string;
  date: string;
  notes: string;
}

function createInitialState(currency: Currency, type: TransactionType, walletUserId: string): FormState {
  return {
    description: "",
    amount: "",
    currency,
    category: type === "expense" ? "Operacional" : "Cliente",
    paymentMethod: "Cartão de crédito",
    source: "Cliente",
    walletUserId,
    date: toInputDate(),
    notes: ""
  };
}

export function TransactionForm({ type, editing, onCancelEdit, onSaved }: TransactionFormProps) {
  const { addTransaction, updateTransaction, profile, categories, walletUsers } = useFinance();
  const visibleWalletUsers = getVisibleWalletUsers(profile, walletUsers);
  const [form, setForm] = useState<FormState>(() => createInitialState(profile.defaultCurrency, type, profile.appUserId));
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.type === type || category.type === "both")
        .map((category) => category.name),
    [categories, type]
  );

  useEffect(() => {
    if (editing) {
      setForm({
        description: editing.description,
        amount: String(editing.amount),
        currency: editing.currency,
        category: editing.category,
        paymentMethod: editing.paymentMethod ?? "Cartão de crédito",
        source: editing.source ?? editing.category,
        walletUserId: editing.walletUserId,
        date: editing.date,
        notes: editing.notes ?? ""
      });
      setMessage(null);
      return;
    }

    setForm(createInitialState(profile.defaultCurrency, type, profile.appUserId));
  }, [editing, profile.appUserId, profile.defaultCurrency, type]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const amount = parseAmount(form.amount);
    const description = form.description.trim();
    const notes = form.notes.trim();

    if (!description) {
      setMessage({ tone: "error", text: "Informe uma descrição." });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ tone: "error", text: "Informe um valor maior que zero." });
      return;
    }

    if (!form.date) {
      setMessage({ tone: "error", text: "Informe uma data." });
      return;
    }

    const walletUser = visibleWalletUsers.find((user) => user.id === form.walletUserId);

    if (!walletUser) {
      setMessage({ tone: "error", text: "Selecione uma carteira." });
      return;
    }

    if (type === "expense" && !form.category) {
      setMessage({ tone: "error", text: "Selecione uma categoria." });
      return;
    }

    if (type === "income" && !form.source) {
      setMessage({ tone: "error", text: "Selecione uma origem." });
      return;
    }

    const draft: TransactionDraft = {
      type,
      description,
      amount,
      currency: form.currency,
      walletUserId: walletUser.id,
      walletUserName: walletUser.name,
      category: type === "income" ? form.source : form.category,
      paymentMethod: type === "expense" ? form.paymentMethod : undefined,
      source: type === "income" ? form.source : undefined,
      notes: notes || undefined,
      date: form.date
    };

    setSubmitting(true);

    try {
      if (editing) {
        await updateTransaction(editing.id, draft);
        setMessage({ tone: "success", text: "Transação atualizada." });
      } else {
        await addTransaction(draft);
        setForm(createInitialState(profile.defaultCurrency, type, profile.appUserId));
        setMessage({ tone: "success", text: "Transação registrada." });
      }

      onSaved?.();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Não foi possível salvar."
      });
    } finally {
      setSubmitting(false);
    }
  }

  const title = editing ? "Editar registro" : type === "expense" ? "Novo gasto" : "Nova entrada";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{title}</CardTitle>
          {editing ? (
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Descrição">
            <Input
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder={type === "expense" ? "Ex: Assinatura de software" : "Ex: Pagamento de cliente"}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor">
              <Input
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                placeholder="0,00"
                required
              />
            </Field>
            <Field label="Moeda">
              <Select value={form.currency} onChange={(event) => updateField("currency", event.target.value as Currency)}>
                {currencyOptions.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Carteira do usuário">
            <Select value={form.walletUserId} onChange={(event) => updateField("walletUserId", event.target.value)}>
              {visibleWalletUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </Field>

          {type === "expense" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoria">
                <Select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Método de pagamento">
                <Select value={form.paymentMethod} onChange={(event) => updateField("paymentMethod", event.target.value)}>
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <Field label="Origem da entrada">
              <Select value={form.source} onChange={(event) => updateField("source", event.target.value)}>
                {incomeSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Data">
            <Input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} required />
          </Field>

          <Field label="Observação opcional">
            <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Contexto, recibo, cliente ou detalhes internos." />
          </Field>

          {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            <Save className="h-4 w-4" />
            {submitting ? "Salvando..." : editing ? "Salvar alterações" : "Registrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
