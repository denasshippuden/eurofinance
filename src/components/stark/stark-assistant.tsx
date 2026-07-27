"use client";

import Link from "next/link";
import { CheckCircle2, Home, PanelRightClose, Sparkles, Target, Trophy, X } from "lucide-react";
import { StarkPet } from "@/components/stark/stark-pet";
import { useAuth } from "@/components/providers/auth-provider";
import { useStark } from "@/components/providers/stark-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/format";

export function StarkAssistant() {
  const { user } = useAuth();
  const {
    animationState,
    isAssistantOpen,
    activeTip,
    activeMissions,
    rewardAccount,
    openAssistant,
    closeAssistant,
    claimMissionReward
  } = useStark();
  const completedMissions = activeMissions.filter((mission) => mission.status === "completed");
  const visibleMissions = activeMissions.filter((mission) => mission.status !== "claimed").slice(0, 3);
  const displayState = isAssistantOpen ? "waving" : completedMissions.length > 0 ? "waiting" : animationState;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-end px-4 lg:bottom-6 lg:right-6 lg:inset-x-auto lg:px-0">
      <div className="pointer-events-auto flex max-w-full flex-col items-end gap-3">
        {isAssistantOpen ? (
          <aside
            className={cn(
              "max-h-[72vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-panel shadow-premium",
              "sm:w-[26rem]"
            )}
            aria-label="Painel interno do Stark"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>Stark</Badge>
                  <Badge>{rewardAccount.points} pontos</Badge>
                  <Badge>Nivel {rewardAccount.level}</Badge>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-foreground">Ola, {user?.name ?? "usuario"}</h2>
                <p className="mt-1 text-xs leading-5 text-muted">Pontos internos, sem valor monetario nesta fase.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeAssistant} aria-label="Fechar Stark">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 p-4">
              <div className="rounded-lg border border-border bg-elevated p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{activeTip?.title ?? "Rotina financeira"}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{activeTip?.message ?? "Mantenha seus registros atualizados."}</p>
                    {activeTip?.actionHref ? (
                      <Link className="mt-3 inline-flex text-xs font-medium text-foreground hover:underline" href={activeTip.actionHref}>
                        {activeTip.actionLabel ?? "Abrir"}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Missoes ativas</p>
                  <Link className="text-xs text-muted hover:text-foreground" href="/missions">
                    Ver todas
                  </Link>
                </div>
                {visibleMissions.length > 0 ? (
                  visibleMissions.map((mission) => (
                    <div key={mission.id} className="rounded-lg border border-border bg-elevated p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{mission.title}</p>
                          <p className="mt-1 text-xs text-muted">
                            {mission.progress}/{mission.target} - {mission.pointsReward} pts
                          </p>
                        </div>
                        {mission.status === "completed" ? (
                          <Button size="sm" onClick={() => claimMissionReward(mission.id)}>
                            Resgatar
                          </Button>
                        ) : (
                          <Badge>{mission.status === "inProgress" ? "Em andamento" : "Disponivel"}</Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-border bg-elevated p-3 text-xs text-muted">Nenhuma missao ativa agora.</div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Link href="/stark-home" className="rounded-md border border-border bg-elevated p-3 text-center text-xs text-subtle hover:text-foreground">
                  <Home className="mx-auto mb-2 h-4 w-4" />
                  Casa
                </Link>
                <Link href="/missions" className="rounded-md border border-border bg-elevated p-3 text-center text-xs text-subtle hover:text-foreground">
                  <Target className="mx-auto mb-2 h-4 w-4" />
                  Missoes
                </Link>
                <Link href="/rewards" className="rounded-md border border-border bg-elevated p-3 text-center text-xs text-subtle hover:text-foreground">
                  <Trophy className="mx-auto mb-2 h-4 w-4" />
                  Pontos
                </Link>
              </div>
            </div>
          </aside>
        ) : null}

        <div className="flex items-center gap-2 rounded-full border border-border bg-panel/90 p-2 shadow-line backdrop-blur">
          {completedMissions.length > 0 ? (
            <span className="hidden items-center gap-1 pl-2 text-xs text-success sm:inline-flex">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completedMissions.length} pronta(s)
            </span>
          ) : null}
          <StarkPet
            state={displayState}
            size="sm"
            interactive
            label={isAssistantOpen ? "Fechar painel do Stark" : "Abrir painel do Stark"}
            onClick={isAssistantOpen ? closeAssistant : openAssistant}
          />
          {isAssistantOpen ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeAssistant} aria-label="Recolher painel do Stark">
              <PanelRightClose className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
