import type { StarkMission, StarkMissionContext, StarkMissionStatus, StarkMissionType } from "@/lib/stark/types";

interface MissionTemplate {
  key: string;
  title: string;
  description: string;
  type: StarkMissionType;
  target: number;
  pointsReward: number;
  progress(context: StarkMissionContext): number;
}

const automaticMissions: MissionTemplate[] = [
  {
    key: "register-income",
    title: "Registrar uma entrada",
    description: "Cadastre pelo menos uma entrada confirmada no mes.",
    type: "registerIncome",
    target: 1,
    pointsReward: 20,
    progress: (context) => (context.monthlyIncome > 0 ? 1 : 0)
  },
  {
    key: "register-expense",
    title: "Registrar uma despesa",
    description: "Inclua pelo menos uma despesa do mes para manter o saldo realista.",
    type: "registerExpense",
    target: 1,
    pointsReward: 20,
    progress: (context) => (context.monthlyExpenses > 0 ? 1 : 0)
  },
  {
    key: "review-transactions",
    title: "Revisar movimentacoes recentes",
    description: "Confira se existem movimentacoes recentes registradas no grupo.",
    type: "reviewTransactions",
    target: 1,
    pointsReward: 15,
    progress: (context) => (context.hasRecentTransactions || context.transactionCount >= 3 ? 1 : 0)
  },
  {
    key: "complete-work-hours",
    title: "Preencher horas trabalhadas",
    description: "Registre ou revise horas trabalhadas deste mes.",
    type: "completeWorkHours",
    target: 1,
    pointsReward: 25,
    progress: (context) => (context.hasWorkHoursThisMonth ? 1 : 0)
  },
  {
    key: "check-monthly-summary",
    title: "Abrir o resumo mensal",
    description: "Veja os totais agregados do mes no dashboard.",
    type: "checkMonthlySummary",
    target: 1,
    pointsReward: 10,
    progress: (context) => (context.hasReviewedMonthlySummary ? 1 : 0)
  },
  {
    key: "review-recurring-expenses",
    title: "Revisar contas recorrentes",
    description: "Confira se as contas fixas ativas estao atualizadas antes de gerar novas ocorrencias.",
    type: "reviewTransactions",
    target: 1,
    pointsReward: 15,
    progress: (context) => (context.hasRecurringExpensesToReview ? 1 : 0)
  }
];

function resolveStatus(progress: number, target: number, claimed: boolean): StarkMissionStatus {
  if (claimed) {
    return "claimed";
  }

  if (progress >= target) {
    return "completed";
  }

  return progress > 0 ? "inProgress" : "available";
}

export function buildAutomaticStarkMissions(context: StarkMissionContext, claimedMissionIds: string[]): StarkMission[] {
  const claimed = new Set(claimedMissionIds);
  const createdAt = `${context.monthKey}-01T00:00:00.000Z`;

  return automaticMissions.map((template) => {
    const id = `stark:auto:${template.key}:${context.monthKey}:${context.userId}`;
    const progress = Math.min(Math.max(template.progress(context), 0), template.target);
    const wasClaimed = claimed.has(id);
    const status = resolveStatus(progress, template.target, wasClaimed);

    return {
      id,
      groupId: context.groupId,
      assignedUserId: context.userId,
      title: template.title,
      description: template.description,
      type: template.type,
      status,
      progress,
      target: template.target,
      pointsReward: template.pointsReward,
      createdByUserId: context.createdByUserId,
      createdAt,
      completedAt: progress >= template.target ? createdAt : undefined,
      claimedAt: wasClaimed ? createdAt : undefined
    };
  });
}
