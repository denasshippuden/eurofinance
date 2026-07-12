"use client";

import { useEffect, useState } from "react";
import { PeriodFilter } from "@/components/finance/period-filter";
import { TransactionForm } from "@/components/finance/transaction-form";
import { TransactionTable } from "@/components/finance/transaction-table";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useFinance } from "@/components/providers/finance-provider";
import { getVisibleWalletUsers } from "@/lib/users";
import { getBusinessMonthKey } from "@/lib/date-period";
import { useUrlTransactionFilters } from "@/lib/use-url-transaction-filters";
import type { Transaction } from "@/lib/types";

export default function ExpensesPage() {
  const { ensureRecurringExpensesForMonth, listTransactions, profile, walletUsers } = useFinance();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const { filters, setFilters, commitFilters } = useUrlTransactionFilters();
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const visibleWalletUsers = getVisibleWalletUsers(profile, walletUsers);
  const walletLabel = filters.walletUserId === "all" ? "Grupo completo" : visibleWalletUsers.find((user) => user.id === filters.walletUserId)?.name;

  async function reloadExpenses(nextFilters = filters) {
    setLoadingList(true);
    try {
      const data = await listTransactions({
        type: "expense",
        walletUserId: nextFilters.walletUserId,
        startDate: nextFilters.startDate,
        endDate: nextFilters.endDate,
        sort: "newest"
      });
      setExpenses(data);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void reloadExpenses();
  }, [filters.walletUserId, filters.startDate, filters.endDate]);

  useEffect(() => {
    void ensureRecurringExpensesForMonth(getBusinessMonthKey()).then(() => reloadExpenses()).catch(() => undefined);
  }, [ensureRecurringExpensesForMonth]);

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
            <Select value={filters.walletUserId} onChange={(event) => commitFilters({ ...filters, walletUserId: event.target.value })}>
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
      <PeriodFilter
        value={filters}
        onChange={(period) => setFilters((current) => ({ ...current, ...period }))}
        onApply={() => commitFilters(filters)}
        onClear={() => commitFilters({ walletUserId: "all" })}
      />
      <Badge>{loadingList ? "Atualizando registros..." : `${expenses.length} gastos no periodo`}</Badge>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <TransactionForm
          type="expense"
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reloadExpenses();
          }}
        />
        <TransactionTable
          transactions={expenses}
          onEdit={setEditing}
          onDeleted={(transactionId) => setExpenses((current) => current.filter((transaction) => transaction.id !== transactionId))}
          emptyTitle="Nenhum gasto registrado."
        />
      </section>
    </div>
  );
}
