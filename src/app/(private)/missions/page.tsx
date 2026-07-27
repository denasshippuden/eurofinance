"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Lock, Target, Trophy } from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import { useStark } from "@/components/providers/stark-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getBusinessMonthKey } from "@/lib/date-period";
import { getMonthlySummary } from "@/lib/finance";
import { buildAutomaticStarkMissions } from "@/lib/stark/missions";
import type { StarkMission, StarkMissionStatus } from "@/lib/stark/types";

type MissionFilter = "active" | "completed";

const statusLabels: Record<StarkMissionStatus, string> = {
  available: "Disponivel",
  inProgress: "Em andamento",
  completed: "Concluida",
  claimed: "Resgatada"
};

function MissionCard({ mission, onClaim }: { mission: StarkMission; onClaim?: (missionId: string) => void }) {
  const percentage = Math.min(Math.round((mission.progress / mission.target) * 100), 100);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{mission.title}</p>
              <Badge tone={mission.status === "claimed" ? "success" : "neutral"}>{statusLabels[mission.status]}</Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">{mission.description}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/15">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${percentage}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              Progresso: {mission.progress}/{mission.target}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-md border border-border bg-elevated px-3 py-2 text-sm font-semibold text-foreground">
              {mission.pointsReward} pts
            </div>
            {mission.status === "completed" && onClaim ? (
              <Button size="sm" onClick={() => onClaim(mission.id)}>
                <Trophy className="h-4 w-4" />
                Resgatar
              </Button>
            ) : null}
            {mission.status === "claimed" ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MissionsPage() {
  const { activeMissions, claimMissionReward } = useStark();
  const { profile, walletUsers, transactions, recurringExpenses } = useFinance();
  const [filter, setFilter] = useState<MissionFilter>("active");
  const visibleMissions = activeMissions.filter((mission) =>
    filter === "active" ? mission.status !== "claimed" : mission.status === "claimed"
  );

  const groupSummary = useMemo(() => {
    if (profile.role !== "master") {
      return [];
    }

    const monthKey = getBusinessMonthKey();

    return walletUsers.map((walletUser) => {
      const walletTransactions = transactions.filter((transaction) => transaction.walletUserId === walletUser.id);
      const monthly = getMonthlySummary(walletTransactions, profile.defaultCurrency);
      const missions = buildAutomaticStarkMissions(
        {
          groupId: profile.groupId,
          userId: walletUser.id,
          monthKey,
          monthlyIncome: monthly.income,
          monthlyExpenses: monthly.expenses,
          transactionCount: walletTransactions.length,
          hasRecentTransactions: walletTransactions.some((transaction) => {
            const age = Date.now() - new Date(`${transaction.date}T00:00:00`).getTime();
            return age >= 0 && age <= 7 * 86400000;
          }),
          hasWorkHoursThisMonth: walletUser.id === profile.appUserId && activeMissions.some((mission) => mission.type === "completeWorkHours" && mission.progress > 0),
          hasReviewedMonthlySummary: walletUser.id === profile.appUserId && activeMissions.some((mission) => mission.type === "checkMonthlySummary" && mission.progress > 0),
          hasRecurringExpensesToReview: recurringExpenses.some((item) => item.status === "active" && item.autoGenerate),
          createdByUserId: profile.appUserId
        },
        []
      );

      return {
        user: walletUser,
        completed: missions.filter((mission) => mission.status === "completed").length,
        total: missions.length
      };
    });
  }, [activeMissions, profile, recurringExpenses, transactions, walletUsers]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Stark</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Missões</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Complete tarefas internas simples sem criar, editar ou excluir transações. Pontos internos, sem valor monetário nesta fase.
          </p>
        </div>
        <div className="flex rounded-md border border-border bg-panel p-1">
          <Button variant={filter === "active" ? "primary" : "ghost"} size="sm" onClick={() => setFilter("active")}>
            <Circle className="h-4 w-4" />
            Ativas
          </Button>
          <Button variant={filter === "completed" ? "primary" : "ghost"} size="sm" onClick={() => setFilter("completed")}>
            <CheckCircle2 className="h-4 w-4" />
            Concluidas
          </Button>
        </div>
      </header>

      <section className="grid gap-3">
        {visibleMissions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} onClaim={claimMissionReward} />
        ))}
        {visibleMissions.length === 0 ? (
          <EmptyState
            icon={<Target className="h-5 w-5" />}
            title={filter === "active" ? "Nenhuma missão ativa neste filtro." : "Nenhuma missão resgatada ainda."}
            description="As missões são recalculadas a partir dos dados agregados existentes."
          />
        ) : null}
      </section>

      {profile.role === "master" ? (
        <Card>
          <CardHeader>
            <CardTitle>Resumo dos integrantes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groupSummary.map((item) => (
              <div key={item.user.id} className="rounded-lg border border-border bg-elevated p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.user.name}</p>
                    <p className="mt-1 text-xs text-muted">{item.user.role === "master" ? "Master" : "Membro"}</p>
                  </div>
                  <Badge>
                    {item.completed}/{item.total}
                  </Badge>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-border bg-elevated p-4 text-xs leading-5 text-muted">
              <Lock className="mb-2 h-4 w-4" />
              Criacao de missoes personalizadas e validacao no servidor ficam para a fase Supabase.
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
