"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Search, WalletCards } from "lucide-react";
import { MetricCard } from "@/components/finance/metric-card";
import { PeriodFilter } from "@/components/finance/period-filter";
import { TransactionTable } from "@/components/finance/transaction-table";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { currencyOptions } from "@/lib/constants";
import { getTotalsByCurrency } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { useFinance } from "@/components/providers/finance-provider";
import { getVisibleWalletUsers } from "@/lib/users";
import { useUrlTransactionFilters } from "@/lib/use-url-transaction-filters";
import type { Currency, TransactionFilters, TransactionType } from "@/lib/types";

export default function TransactionsPage() {
  const { transactions: allTransactions, listTransactions, profile, walletUsers } = useFinance();
  const [type, setType] = useState<TransactionType | "all">("all");
  const [currency, setCurrency] = useState<Currency | "all">("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<NonNullable<TransactionFilters["sort"]>>("newest");
  const [filtered, setFiltered] = useState(allTransactions);
  const [loadingList, setLoadingList] = useState(false);
  const { filters, setFilters, commitFilters } = useUrlTransactionFilters();
  const visibleWalletUsers = getVisibleWalletUsers(profile, walletUsers);

  const categories = useMemo(() => {
    const names = allTransactions
      .filter((transaction) => type === "all" || transaction.type === type)
      .map((transaction) => transaction.category);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [allTransactions, type]);

  useEffect(() => {
    let mounted = true;
    setLoadingList(true);
    listTransactions({
      type,
      currency,
      category,
      walletUserId: filters.walletUserId,
      search,
      sort,
      startDate: filters.startDate,
      endDate: filters.endDate
    })
      .then((data) => {
        if (mounted) {
          setFiltered(data);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingList(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [category, currency, filters.endDate, filters.startDate, filters.walletUserId, listTransactions, search, sort, type]);

  const activeCurrency: Currency = currency === "all" ? profile.defaultCurrency : currency;
  const metricsBase = filtered.filter((transaction) => transaction.currency === activeCurrency);
  const incomeTotal = getTotalsByCurrency(metricsBase, "income")[activeCurrency];
  const expenseTotal = getTotalsByCurrency(metricsBase, "expense")[activeCurrency];

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Historico financeiro</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Transacoes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Filtre movimentacoes por tipo, moeda, categoria, periodo e descricao.
          </p>
        </div>
        <Badge>{loadingList ? "Atualizando registros..." : `${filtered.length} registros filtrados`}</Badge>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label={`Entradas em ${activeCurrency}`}
          value={formatMoney(incomeTotal, activeCurrency)}
          icon={<ArrowUpCircle className="h-4 w-4" />}
        />
        <MetricCard
          label={`Gastos em ${activeCurrency}`}
          value={formatMoney(expenseTotal, activeCurrency)}
          icon={<ArrowDownCircle className="h-4 w-4" />}
        />
        <MetricCard
          label={`Resultado em ${activeCurrency}`}
          value={formatMoney(incomeTotal - expenseTotal, activeCurrency)}
          icon={<WalletCards className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-4 rounded-lg border border-border bg-panel p-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_0.9fr_0.8fr]">
        <Field label="Busca">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Descricao ou categoria" />
          </div>
        </Field>

        <Field label="Tipo">
          <Select value={type} onChange={(event) => setType(event.target.value as TransactionType | "all")}>
            <option value="all">Todos</option>
            <option value="income">Entrada</option>
            <option value="expense">Gasto</option>
          </Select>
        </Field>

        <Field label="Moeda">
          <Select value={currency} onChange={(event) => setCurrency(event.target.value as Currency | "all")}>
            <option value="all">Todas</option>
            {currencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Categoria">
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Todas</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>

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

        <Field label="Ordenacao">
          <Select value={sort} onChange={(event) => setSort(event.target.value as NonNullable<TransactionFilters["sort"]>)}>
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
          </Select>
        </Field>
      </section>

      <PeriodFilter
        value={filters}
        onChange={(period) => setFilters((current) => ({ ...current, ...period }))}
        onApply={() => commitFilters(filters)}
        onClear={() => commitFilters({ walletUserId: "all" })}
      />

      <TransactionTable transactions={filtered} showActions={false} emptyTitle="Nenhuma transacao corresponde aos filtros." />
    </div>
  );
}
