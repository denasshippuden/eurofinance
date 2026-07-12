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
import { useUrlTransactionFilters } from "@/lib/use-url-transaction-filters";
import type { Transaction } from "@/lib/types";

export default function IncomePage() {
  const { listTransactions, profile, walletUsers } = useFinance();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const { filters, setFilters, commitFilters } = useUrlTransactionFilters();
  const [income, setIncome] = useState<Transaction[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const visibleWalletUsers = getVisibleWalletUsers(profile, walletUsers);
  const walletLabel = filters.walletUserId === "all" ? "Grupo completo" : visibleWalletUsers.find((user) => user.id === filters.walletUserId)?.name;

  async function reloadIncome(nextFilters = filters) {
    setLoadingList(true);
    try {
      const data = await listTransactions({
        type: "income",
        walletUserId: nextFilters.walletUserId,
        startDate: nextFilters.startDate,
        endDate: nextFilters.endDate,
        sort: "newest"
      });
      setIncome(data);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void reloadIncome();
  }, [filters.walletUserId, filters.startDate, filters.endDate]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Receitas e origens</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Entradas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Registre pagamentos, salários, projetos, reembolsos e outras fontes de renda.
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
      <Badge>{loadingList ? "Atualizando registros..." : `${income.length} entradas no periodo`}</Badge>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <TransactionForm
          type="income"
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reloadIncome();
          }}
        />
        <TransactionTable
          transactions={income}
          onEdit={setEditing}
          onDeleted={(transactionId) => setIncome((current) => current.filter((transaction) => transaction.id !== transactionId))}
          emptyTitle="Nenhuma entrada registrada."
        />
      </section>
    </div>
  );
}
