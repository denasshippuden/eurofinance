"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, BadgeEuro, PiggyBank, WalletCards } from "lucide-react";
import { AiFinancialAssistant } from "@/components/finance/ai-financial-assistant";
import { CategoryBreakdown } from "@/components/finance/category-breakdown";
import { MetricCard } from "@/components/finance/metric-card";
import { TransactionTable } from "@/components/finance/transaction-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { currencyOptions } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import {
  getBalanceByCurrency,
  getExpenseBreakdown,
  getLatestTransactions,
  getMonthlySummary,
  getSavingsSuggestion,
  getWalletSummaries
} from "@/lib/finance";
import { useFinance } from "@/components/providers/finance-provider";
import { getVisibleWalletUsers } from "@/lib/users";
import { getBusinessMonthKey } from "@/lib/date-period";

export default function DashboardPage() {
  const { profile, transactions, walletUsers, auditEntries, ensureRecurringExpensesForMonth } = useFinance();
  const [scope, setScope] = useState("group");
  const currency = profile.defaultCurrency;
  const visibleWalletUsers = getVisibleWalletUsers(profile, walletUsers);
  const scopedTransactions = useMemo(
    () => (scope === "group" ? transactions : transactions.filter((transaction) => transaction.walletUserId === scope)),
    [scope, transactions]
  );
  const balances = getBalanceByCurrency(scopedTransactions);
  const monthly = getMonthlySummary(scopedTransactions, currency);
  const savings = getSavingsSuggestion(monthly.income, monthly.expenses);
  const walletSummaries = getWalletSummaries(transactions, visibleWalletUsers, currency);
  const latest = getLatestTransactions(scopedTransactions, 6);
  const breakdown = getExpenseBreakdown(scopedTransactions, currency).slice(0, 6);
  const scopeLabel = scope === "group" ? profile.groupName : walletUsers.find((user) => user.id === scope)?.name ?? "Carteira";

  useEffect(() => {
    void ensureRecurringExpensesForMonth(getBusinessMonthKey()).catch(() => undefined);
  }, [ensureRecurringExpensesForMonth]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{profile.groupName}</Badge>
            <Badge>Moeda principal: {currency}</Badge>
            <Badge>Visão: {scopeLabel}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Dashboard financeiro</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Visão consolidada por grupo ou por carteira individual, com autoria das alterações.
          </p>
        </div>
        <div className="w-full md:w-64">
          <Select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="group">Grupo completo</option>
            {visibleWalletUsers.map((user) => (
              <option key={user.id} value={user.id}>
                Carteira: {user.name}
              </option>
            ))}
          </Select>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
        <MetricCard
          label="Guardar sugerido"
          value={formatMoney(savings.suggestedMonthlySaving, currency)}
          detail={
            monthly.net > 0
              ? `${Math.round(savings.savingRate)}% das entradas · reserva alvo ${formatMoney(savings.emergencyReserveTarget, currency)}`
              : "Sem sobra mensal nesta visão"
          }
          icon={<PiggyBank className="h-4 w-4" />}
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

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{profile.role === "master" ? "Carteiras do grupo" : "Sua carteira"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {walletSummaries.map((wallet) => (
              <div key={wallet.user.id} className="rounded-lg border border-border bg-elevated p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{wallet.user.name}</p>
                    <p className="mt-1 text-xs text-muted">Guardar sugerido: {formatMoney(wallet.suggestedSaving, currency)}</p>
                  </div>
                  <p className={wallet.net >= 0 ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>
                    {formatMoney(wallet.net, currency)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas alterações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border bg-elevated p-3">
                <p className="text-sm font-medium text-foreground">{entry.actorName}</p>
                <p className="mt-1 text-xs text-muted">
                  {entry.action === "created" ? "Criou" : entry.action === "updated" ? "Editou" : "Excluiu"} · {entry.transactionDescription}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-foreground">Últimas transações</h2>
          <Badge>{latest.length} registros</Badge>
        </div>
        <TransactionTable transactions={latest} showActions={false} emptyTitle="Nenhuma movimentação recente." />
      </section>
      <AiFinancialAssistant
        monthlyIncome={monthly.income}
        monthlyExpenses={monthly.expenses}
        monthlyBalance={monthly.net}
        emergencyReserve={Math.max(0, balances[currency])}
        currency={currency}
        scopeLabel={scopeLabel}
        isAdmin={profile.role === "master"}
      />
    </div>
  );
}
