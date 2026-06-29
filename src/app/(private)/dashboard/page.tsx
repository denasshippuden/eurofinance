"use client";

import { ArrowDownCircle, ArrowUpCircle, BadgeEuro, WalletCards } from "lucide-react";
import { CategoryBreakdown } from "@/components/finance/category-breakdown";
import { MetricCard } from "@/components/finance/metric-card";
import { TransactionTable } from "@/components/finance/transaction-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currencyOptions } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { getBalanceByCurrency, getExpenseBreakdown, getLatestTransactions, getMonthlySummary } from "@/lib/finance";
import { useFinance } from "@/components/providers/finance-provider";

export default function DashboardPage() {
  const { profile, transactions } = useFinance();
  const currency = profile.defaultCurrency;
  const balances = getBalanceByCurrency(transactions);
  const monthly = getMonthlySummary(transactions, currency);
  const latest = getLatestTransactions(transactions, 6);
  const breakdown = getExpenseBreakdown(transactions, currency).slice(0, 6);

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Moeda principal: {currency}</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Dashboard financeiro</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Visão consolidada do saldo, entradas, gastos e movimentações recentes.
          </p>
        </div>
        <div className="text-sm text-muted">
          {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date())}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Saldo atual"
          value={formatMoney(balances[currency], currency)}
          detail="Moeda principal, sem conversão cambial"
          icon={<WalletCards className="h-4 w-4" />}
        />
        <MetricCard
          label="Entradas no mês"
          value={formatMoney(monthly.income, currency)}
          detail="Total registrado no mês"
          icon={<ArrowUpCircle className="h-4 w-4" />}
        />
        <MetricCard
          label="Gastos no mês"
          value={formatMoney(monthly.expenses, currency)}
          detail="Despesas registradas no mês"
          icon={<ArrowDownCircle className="h-4 w-4" />}
        />
        <MetricCard
          label="Resultado mensal"
          value={formatMoney(monthly.net, currency)}
          detail={monthly.net >= 0 ? "Resultado positivo" : "Resultado negativo"}
          icon={<BadgeEuro className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Saldos por moeda</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {currencyOptions.map((option) => (
              <div key={option.value} className="rounded-lg border border-border bg-elevated p-4">
                <p className="text-xs uppercase text-muted">{option.label}</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{formatMoney(balances[option.value], option.value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <CategoryBreakdown items={breakdown} currency={currency} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-foreground">Últimas transações</h2>
          <Badge>{latest.length} registros</Badge>
        </div>
        <TransactionTable transactions={latest} showActions={false} emptyTitle="Nenhuma movimentação recente." />
      </section>
    </div>
  );
}
