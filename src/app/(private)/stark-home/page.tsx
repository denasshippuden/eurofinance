"use client";

import Link from "next/link";
import { Home, Lock, Sparkles, Target, Trophy } from "lucide-react";
import { StarkPet } from "@/components/stark/stark-pet";
import { useAuth } from "@/components/providers/auth-provider";
import { useStark } from "@/components/providers/stark-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StarkHomePage() {
  const { user } = useAuth();
  const { rewardAccount, activeMissions } = useStark();
  const nextLevelProgress = rewardAccount.lifetimePoints % 100;
  const completed = activeMissions.filter((mission) => mission.status === "completed" || mission.status === "claimed").length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 rounded-lg border border-border bg-panel p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge>Casa do Stark</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Stark de {user?.name ?? "usuario"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Um espaço interno para acompanhar nivel, pontos e progresso. Novos itens serao desbloqueados posteriormente.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>Nivel {rewardAccount.level}</Badge>
            <Badge>{rewardAccount.points} pontos</Badge>
            <Badge>Sequencia {rewardAccount.currentStreak}</Badge>
          </div>
        </div>
        <StarkPet state="working" size="lg" label="Stark em sua casa" />
      </header>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Progresso do nivel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-3 overflow-hidden rounded-full bg-muted/15">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${nextLevelProgress}%` }} />
            </div>
            <p className="text-sm text-muted">{nextLevelProgress}/100 pontos para o proximo nivel interno.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-elevated p-4">
                <Trophy className="mb-3 h-4 w-4 text-muted" />
                <p className="text-xs uppercase text-muted">Acumulado</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{rewardAccount.lifetimePoints}</p>
              </div>
              <div className="rounded-lg border border-border bg-elevated p-4">
                <Target className="mb-3 h-4 w-4 text-muted" />
                <p className="text-xs uppercase text-muted">Missoes</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {completed}/{activeMissions.length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-elevated p-4">
                <Sparkles className="mb-3 h-4 w-4 text-muted" />
                <p className="text-xs uppercase text-muted">Saldo</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{rewardAccount.points}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/missions" className="flex items-center gap-3 rounded-md border border-border bg-elevated p-3 text-sm text-subtle hover:text-foreground">
              <Target className="h-4 w-4" />
              Ver missoes
            </Link>
            <Link href="/rewards" className="flex items-center gap-3 rounded-md border border-border bg-elevated p-3 text-sm text-subtle hover:text-foreground">
              <Trophy className="h-4 w-4" />
              Ver recompensas
            </Link>
            <Link href="/dashboard" className="flex items-center gap-3 rounded-md border border-border bg-elevated p-3 text-sm text-subtle hover:text-foreground">
              <Home className="h-4 w-4" />
              Voltar ao dashboard
            </Link>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Itens e decoracao</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {["Prateleira", "Mesa de trabalho", "Luzes ciano"].map((item) => (
            <div key={item} className="min-h-32 rounded-lg border border-dashed border-border bg-elevated p-4 text-sm text-muted">
              <Lock className="mb-3 h-4 w-4" />
              <p className="font-medium text-foreground">{item}</p>
              <p className="mt-1 text-xs">Em breve</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
