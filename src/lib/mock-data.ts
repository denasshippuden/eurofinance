import { expenseCategories, incomeSources } from "@/lib/constants";
import type { Category, FinanceSnapshot, Profile, Transaction } from "@/lib/types";

const userId = "local-user";

function isoDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function timestamp(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

export function createMockSnapshot(): FinanceSnapshot {
  const profile: Profile = {
    id: userId,
    name: "FinanceOS Private",
    defaultCurrency: "EUR",
    theme: "dark",
    createdAt: timestamp(21)
  };

  const categories: Category[] = [
    ...expenseCategories.map((name, index) => ({
      id: `expense-${index}`,
      userId,
      name,
      type: "expense" as const,
      createdAt: timestamp(21)
    })),
    ...incomeSources.map((name, index) => ({
      id: `income-${index}`,
      userId,
      name,
      type: "income" as const,
      createdAt: timestamp(21)
    }))
  ];

  const transactions: Transaction[] = [
    {
      id: "tx-001",
      userId,
      type: "income",
      description: "Retainer mensal",
      amount: 2400,
      currency: "EUR",
      category: "Cliente",
      source: "Cliente",
      notes: "Contrato recorrente",
      date: isoDate(2),
      createdAt: timestamp(2),
      updatedAt: timestamp(2)
    },
    {
      id: "tx-002",
      userId,
      type: "expense",
      description: "Assinatura de software",
      amount: 79,
      currency: "EUR",
      category: "Software",
      paymentMethod: "Cartão de crédito",
      notes: "Ferramentas de produtividade",
      date: isoDate(4),
      createdAt: timestamp(4),
      updatedAt: timestamp(4)
    },
    {
      id: "tx-003",
      userId,
      type: "expense",
      description: "Campanha de anúncios",
      amount: 320,
      currency: "EUR",
      category: "Marketing",
      paymentMethod: "Cartão de crédito",
      date: isoDate(7),
      createdAt: timestamp(7),
      updatedAt: timestamp(7)
    },
    {
      id: "tx-004",
      userId,
      type: "income",
      description: "Projeto pontual",
      amount: 1250,
      currency: "USD",
      category: "Projeto",
      source: "Projeto",
      date: isoDate(10),
      createdAt: timestamp(10),
      updatedAt: timestamp(10)
    },
    {
      id: "tx-005",
      userId,
      type: "expense",
      description: "Almoço com cliente",
      amount: 138,
      currency: "BRL",
      category: "Alimentação",
      paymentMethod: "Cartão de débito",
      date: isoDate(12),
      createdAt: timestamp(12),
      updatedAt: timestamp(12)
    }
  ];

  return { profile, categories, transactions };
}
