import type { StarkContextualTipInput, StarkTip } from "@/lib/stark/types";

export function getContextualTips(input: StarkContextualTipInput): StarkTip[] {
  const tips: StarkTip[] = [];

  if (input.monthlyIncome <= 0) {
    tips.push({
      id: "no-income",
      title: "Registre as entradas do mes",
      message: "Sem entradas registradas, o resumo mensal fica incompleto. Cadastre apenas valores confirmados.",
      priority: "high",
      actionLabel: "Registrar entrada",
      actionHref: "/income"
    });
  }

  if (input.monthlyExpenses <= 0) {
    tips.push({
      id: "no-expenses",
      title: "Inclua suas despesas",
      message: "Registrar despesas ajuda a comparar o planejado com o realizado sem expor detalhes desnecessarios.",
      priority: "medium",
      actionLabel: "Registrar despesa",
      actionHref: "/expenses"
    });
  }

  if (input.monthlyBalance < 0) {
    tips.push({
      id: "negative-balance",
      title: "Resultado mensal negativo",
      message: "Revise categorias e contas recorrentes antes de assumir novos compromissos. Esta dica e educativa e nao recomenda investimentos.",
      priority: "high",
      actionLabel: "Ver transacoes",
      actionHref: "/transactions"
    });
  }

  if (input.transactionCount > 0 && !input.hasRecentTransactions) {
    tips.push({
      id: "stale-transactions",
      title: "Movimentacoes sem atualizacao recente",
      message: "Confira se os registros dos ultimos dias estao completos para manter o painel confiavel.",
      priority: "medium",
      actionLabel: "Revisar agora",
      actionHref: "/transactions"
    });
  }

  if (input.hasWorkHoursThisMonth === false) {
    tips.push({
      id: "missing-work-hours",
      title: "Horas do mes ainda vazias",
      message: "Preencher horas trabalhadas ajuda no acompanhamento interno. Isso nao altera transacoes nem pontos automaticamente.",
      priority: "medium",
      actionLabel: "Abrir horas",
      actionHref: "/work-hours"
    });
  }

  if (input.monthlyBalance > 0 && input.monthlyExpenses > 0) {
    tips.push({
      id: "positive-balance-reserve",
      title: "Sobrou no mes",
      message: "Com saldo positivo, vale revisar a reserva de emergencia de forma conservadora. Nenhuma rentabilidade e prometida.",
      priority: "low",
      actionLabel: "Abrir assistente",
      actionHref: "/dashboard#assistente-financeiro"
    });
  }

  if (input.hasRecurringExpensesDueSoon) {
    tips.push({
      id: "recurring-due-soon",
      title: "Contas recorrentes pedem revisao",
      message: "Veja se as contas fixas ativas ainda fazem sentido antes de gerar novos registros.",
      priority: "medium",
      actionLabel: "Ver contas",
      actionHref: "/fixed-expenses"
    });
  }

  if (input.hasReviewedMonthlySummary === false) {
    tips.push({
      id: "review-monthly-summary",
      title: "Resumo mensal pendente",
      message: "Abra o dashboard e revise os totais agregados do mes para fechar a leitura financeira.",
      priority: "low",
      actionLabel: "Abrir dashboard",
      actionHref: "/dashboard"
    });
  }

  return tips.length > 0
    ? tips
    : [
        {
          id: "steady-routine",
          title: "Rotina em dia",
          message: "Continue revisando os totais agregados e mantendo os registros atualizados. Pontos internos nao representam dinheiro.",
          priority: "low",
          actionLabel: "Ver missoes",
          actionHref: "/missions"
        }
      ];
}
