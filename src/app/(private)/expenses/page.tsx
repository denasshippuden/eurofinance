"use client";

import { useMemo, useState } from "react";
import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionTable } from "@/components/finance/transaction-table";
import { Badge } from "@/components/ui/badge";
import { useFinance } from "@/components/providers/finance-provider";
import type { Transaction } from "@/lib/types";

export default function ExpensesPage() {
  const { transactions } = useFinance();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const expenses = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === "expense")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );

  return (
    <div className="space-y-8">
      <header>
        <Badge>Controle manual</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Gastos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Registre despesas, organize categorias e mantenha o histórico limpo para análise.
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <TransactionForm type="expense" editing={editing} onCancelEdit={() => setEditing(null)} onSaved={() => setEditing(null)} />
        <TransactionTable transactions={expenses} onEdit={setEditing} emptyTitle="Nenhum gasto registrado." />
      </section>
    </div>
  );
}
