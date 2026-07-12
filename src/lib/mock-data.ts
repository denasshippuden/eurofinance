import { expenseCategories, incomeSources } from "@/lib/constants";
import type { AuditEntry, Category, FinanceSnapshot, FinanceUser, Profile, Transaction } from "@/lib/types";
import { appUsers, financeGroups, getUsersByGroup } from "@/lib/users";

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

function buildProfile(user: FinanceUser): Profile {
  return {
    id: user.id,
    appUserId: user.id,
    email: user.email,
    name: user.name,
    groupId: user.groupId,
    groupName: user.groupName,
    role: user.role,
    defaultCurrency: "EUR",
    theme: "dark",
    createdAt: timestamp(21)
  };
}

function buildCategories(user: FinanceUser): Category[] {
  return [
    ...expenseCategories.map((name, index) => ({
      id: `${user.groupId}-expense-${index}`,
      userId: user.id,
      groupId: user.groupId,
      name,
      type: "expense" as const,
      createdAt: timestamp(21)
    })),
    ...incomeSources.map((name, index) => ({
      id: `${user.groupId}-income-${index}`,
      userId: user.id,
      groupId: user.groupId,
      name,
      type: "income" as const,
      createdAt: timestamp(21)
    }))
  ];
}

function transaction(input: {
  id: string;
  actor: FinanceUser;
  wallet: FinanceUser;
  type: Transaction["type"];
  description: string;
  amount: number;
  currency: Transaction["currency"];
  category: string;
  daysAgo: number;
  paymentMethod?: string;
  source?: string;
  notes?: string;
}): Transaction {
  return {
    id: input.id,
    userId: input.actor.id,
    groupId: input.actor.groupId,
    walletUserId: input.wallet.id,
    walletUserName: input.wallet.name,
    type: input.type,
    description: input.description,
    amount: input.amount,
    currency: input.currency,
    category: input.category,
    paymentMethod: input.paymentMethod,
    source: input.source,
    notes: input.notes,
    date: isoDate(input.daysAgo),
    createdByUserId: input.actor.id,
    createdByName: input.actor.name,
    updatedByUserId: input.actor.id,
    updatedByName: input.actor.name,
    createdAt: timestamp(input.daysAgo),
    updatedAt: timestamp(input.daysAgo)
  };
}

function audit(transactionItem: Transaction, action: AuditEntry["action"]): AuditEntry {
  return {
    id: `audit-${transactionItem.id}-${action}`,
    groupId: transactionItem.groupId,
    transactionId: transactionItem.id,
    transactionDescription: transactionItem.description,
    action,
    actorUserId: transactionItem.updatedByUserId,
    actorName: transactionItem.updatedByName,
    createdAt: transactionItem.updatedAt
  };
}

export function createMockSnapshot(user: FinanceUser = appUsers[0]): FinanceSnapshot {
  const groupUsers = getUsersByGroup(user.groupId);
  const [masterUser, eduarda] = getUsersByGroup("group-a");
  const [pedro, gabrielle] = getUsersByGroup("group-b");

  const allTransactions = [
    transaction({
      id: "tx-a-001",
      actor: masterUser,
      wallet: masterUser,
      type: "income",
      description: "Retainer mensal",
      amount: 2400,
      currency: "EUR",
      category: "Cliente",
      source: "Cliente",
      notes: "Contrato recorrente",
      daysAgo: 2
    }),
    transaction({
      id: "tx-a-002",
      actor: eduarda,
      wallet: eduarda,
      type: "expense",
      description: "Assinatura de software",
      amount: 79,
      currency: "EUR",
      category: "Software",
      paymentMethod: "Cartão de crédito",
      notes: "Ferramentas de produtividade",
      daysAgo: 4
    }),
    transaction({
      id: "tx-a-003",
      actor: masterUser,
      wallet: eduarda,
      type: "expense",
      description: "Campanha de anuncios",
      amount: 320,
      currency: "EUR",
      category: "Marketing",
      paymentMethod: "Cartão de crédito",
      daysAgo: 7
    }),
    transaction({
      id: "tx-b-001",
      actor: pedro,
      wallet: pedro,
      type: "income",
      description: "Projeto pontual",
      amount: 1250,
      currency: "USD",
      category: "Projeto",
      source: "Projeto",
      daysAgo: 10
    }),
    transaction({
      id: "tx-b-002",
      actor: gabrielle,
      wallet: gabrielle,
      type: "expense",
      description: "Almoco com cliente",
      amount: 138,
      currency: "BRL",
      category: "Alimentação",
      paymentMethod: "Cartão de débito",
      daysAgo: 12
    })
  ];

  const transactions = allTransactions.filter((item) => item.groupId === user.groupId);

  return {
    profile: buildProfile(user),
    groups: financeGroups,
    walletUsers: groupUsers,
    categories: buildCategories(user),
    transactions,
    auditEntries: transactions.map((item) => audit(item, "created")),
    recurringExpenses: []
  };
}
