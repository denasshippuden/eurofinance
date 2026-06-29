"use client";

import { useMemo, useState } from "react";
import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionTable } from "@/components/finance/transaction-table";
import { Badge } from "@/components/ui/badge";
import { useFinance } from "@/components/providers/finance-provider";
import type { Transaction } from "@/lib/types";

export default function IncomePage() {
  const { transactions } = useFinance();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const income = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === "income")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );

  return (
    <div className="space-y-8">
      <header>
        <Badge>Receitas e origens</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Entradas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Registre pagamentos, salários, projetos, reembolsos e outras fontes de renda.
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <TransactionForm type="income" editing={editing} onCancelEdit={() => setEditing(null)} onSaved={() => setEditing(null)} />
        <TransactionTable transactions={income} onEdit={setEditing} emptyTitle="Nenhuma entrada registrada." />
      </section>
    </div>
  );
}
