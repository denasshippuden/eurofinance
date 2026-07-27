"use client";

import { Gift, Lock, Trophy } from "lucide-react";
import { useStark } from "@/components/providers/stark-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function RewardsPage() {
  const { rewardAccount, rewardEvents } = useStark();

  return (
    <div className="space-y-8">
      <header>
        <Badge>Stark</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Recompensas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Pontos internos, sem valor monetário nesta fase. Não há cashback real, saque ou conversão financeira.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted">Saldo de pontos</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{rewardAccount.points}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted">Acumulado</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{rewardAccount.lifetimePoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted">Nivel</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{rewardAccount.level}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted">Sequencia</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{rewardAccount.currentStreak}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Historico de pontos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rewardEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-elevated p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{event.reason}</p>
                  <p className="mt-1 text-xs text-muted">{formatEventDate(event.createdAt)}</p>
                </div>
                <Badge tone="success">+{event.points} pts</Badge>
              </div>
            ))}
            {rewardEvents.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-5 w-5" />}
                title="Nenhum ponto resgatado ainda."
                description="Conclua uma missao e resgate a recompensa interna uma unica vez."
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalogo futuro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Itens da Casa do Stark", "Decoracoes", "Efeitos visuais"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-border bg-elevated p-4 opacity-70">
                <Lock className="h-4 w-4 text-muted" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item}</p>
                  <p className="mt-1 text-xs text-muted">Em breve</p>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-border bg-elevated p-4 text-xs leading-5 text-muted">
              <Gift className="mb-2 h-4 w-4" />
              Nenhum item possui valor financeiro, moeda real ou promessa de beneficio externo nesta fase.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
