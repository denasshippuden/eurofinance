import type { Currency, FinanceUser, Transaction, TransactionFilters } from "@/lib/types";

export function getBalanceByCurrency(transactions: Transaction[]) {
  return transactions.reduce<Record<Currency, number>>(
    (totals, transaction) => {
      const direction = transaction.type === "income" ? 1 : -1;
      totals[transaction.currency] += transaction.amount * direction;
      return totals;
    },
    { EUR: 0, BRL: 0, USD: 0 }
  );
}

export function getTotalsByCurrency(transactions: Transaction[], type?: "income" | "expense") {
  return transactions.reduce<Record<Currency, number>>(
    (totals, transaction) => {
      if (!type || transaction.type === type) {
        totals[transaction.currency] += transaction.amount;
      }

      return totals;
    },
    { EUR: 0, BRL: 0, USD: 0 }
  );
}

export function getMonthlySummary(transactions: Transaction[], currency: Currency, month = new Date()) {
  const monthTransactions = transactions.filter((transaction) => {
    const date = new Date(`${transaction.date}T00:00:00`);
    return (
      transaction.currency === currency &&
      date.getMonth() === month.getMonth() &&
      date.getFullYear() === month.getFullYear()
    );
  });

  const income = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    income,
    expenses,
    net: income - expenses
  };
}

export function getExpenseBreakdown(transactions: Transaction[], currency: Currency) {
  const totals = transactions
    .filter((transaction) => transaction.type === "expense" && transaction.currency === currency)
    .reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] ?? 0) + transaction.amount;
      return acc;
    }, {});

  const entries = Object.entries(totals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const max = Math.max(...entries.map((entry) => entry.amount), 1);

  return entries.map((entry) => ({
    ...entry,
    percentage: Math.round((entry.amount / max) * 100)
  }));
}

export function getLatestTransactions(transactions: Transaction[], limit = 5) {
  return [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function filterTransactions(transactions: Transaction[], filters: TransactionFilters) {
  const search = filters.search?.trim().toLowerCase();

  return [...transactions]
    .filter((transaction) => {
      const matchesType = !filters.type || filters.type === "all" || transaction.type === filters.type;
      const matchesCurrency =
        !filters.currency || filters.currency === "all" || transaction.currency === filters.currency;
      const matchesCategory = !filters.category || filters.category === "all" || transaction.category === filters.category;
      const matchesWallet =
        !filters.walletUserId || filters.walletUserId === "all" || transaction.walletUserId === filters.walletUserId;
      const matchesStartDate = !filters.startDate || transaction.date >= filters.startDate;
      const matchesEndDate = !filters.endDate || transaction.date <= filters.endDate;
      const matchesSearch =
        !search ||
        transaction.description.toLowerCase().includes(search) ||
        transaction.category.toLowerCase().includes(search) ||
        transaction.notes?.toLowerCase().includes(search);

      return matchesType && matchesCurrency && matchesCategory && matchesWallet && matchesStartDate && matchesEndDate && matchesSearch;
    })
    .sort((a, b) => {
      const direction = filters.sort === "oldest" ? 1 : -1;
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * direction;
    });
}

export function calculateHourly(amount: number, hours: number) {
  const hourly = hours > 0 ? amount / hours : 0;

  return {
    hourly,
    daily: hourly * 8,
    weekly: hourly * 40,
    monthly: hourly * 160
  };
}

export function calculateReturnFromHourly(hourlyRate: number, hours: number) {
  return {
    total: hourlyRate * hours,
    hourly: hourlyRate,
    daily: hourlyRate * 8,
    weekly: hourlyRate * 40,
    monthly: hourlyRate * 160
  };
}

export function getSavingsSuggestion(income: number, expenses: number) {
  const net = income - expenses;
  const suggestedMonthlySaving = net > 0 ? net * 0.3 : 0;
  const emergencyReserveTarget = expenses * 6;
  const savingRate = income > 0 ? (suggestedMonthlySaving / income) * 100 : 0;

  return {
    net,
    suggestedMonthlySaving,
    emergencyReserveTarget,
    savingRate
  };
}

export function getWalletSummaries(transactions: Transaction[], users: FinanceUser[], currency: Currency) {
  return users.map((user) => {
    const walletTransactions = transactions.filter(
      (transaction) => transaction.walletUserId === user.id && transaction.currency === currency
    );
    const income = walletTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = walletTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const savings = getSavingsSuggestion(income, expenses);

    return {
      user,
      income,
      expenses,
      net: income - expenses,
      suggestedSaving: savings.suggestedMonthlySaving
    };
  });
}
