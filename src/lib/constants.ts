import type { Currency, WorkPeriod } from "@/lib/types";

export const APP_NAME = "FinanceOS Private";

export const currencyOptions: Array<{ label: string; value: Currency }> = [
  { label: "EUR", value: "EUR" },
  { label: "BRL", value: "BRL" },
  { label: "USD", value: "USD" }
];

export const expenseCategories = [
  "Operacional",
  "Software",
  "Marketing",
  "Impostos",
  "Viagens",
  "Alimentação",
  "Casa",
  "Saúde",
  "Educação",
  "Outro"
];

export const incomeSources = [
  "Cliente",
  "Salário",
  "Freelancer",
  "Projeto",
  "Reembolso",
  "Outro"
];

export const paymentMethods = [
  "Cartão de crédito",
  "Cartão de débito",
  "Transferência",
  "Dinheiro",
  "PayPal",
  "Outro"
];

export const periodOptions: Array<{ label: string; value: WorkPeriod }> = [
  { label: "Dia", value: "day" },
  { label: "Semana", value: "week" },
  { label: "Mês", value: "month" },
  { label: "Projeto", value: "project" }
];
