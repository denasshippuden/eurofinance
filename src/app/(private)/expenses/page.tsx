"use client";

import { useMemo, useState } from "react";
import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionTable } from "@/components/finance/transaction-table";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useFinance } from "@/components/providers/finance-provider";
import { getVisibleWalletUsers } from "@/lib/users";
import type { Transaction } from "@/lib/types";

export default function ExpensesPage() {
  const { transactions, profile, walletUsers } = useFinance();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [walletUserId, setWalletUserId] = useState("all");
  const visibleWalletUsers = getVisibleWalletUsers(profile, walletUsers);
  const expenses = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === "expense")
        .filter((transaction) => walletUserId === "all" || transaction.walletUserId === walletUserId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, walletUserId]
  );
  const walletLabel = walletUserId === "all" ? "Grupo completo" : visibleWalletUsers.find((user) => user.id === walletUserId)?.name;

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Controle manual</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Gastos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Registre despesas, organize categorias e mantenha o histórico limpo para análise.
          </p>
        </div>
        <div className="w-full md:w-64">
          <Field label="Carteira">
            <Select value={walletUserId} onChange={(event) => setWalletUserId(event.target.value)}>
              <option value="all">Grupo completo</option>
              {visibleWalletUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </header>

      <Badge>{walletLabel}</Badge>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <TransactionForm type="expense" editing={editing} onCancelEdit={() => setEditing(null)} onSaved={() => setEditing(null)} />
        <TransactionTable transactions={expenses} onEdit={setEditing} emptyTitle="Nenhum gasto registrado." />
      </section>
    </div>
  );
}
