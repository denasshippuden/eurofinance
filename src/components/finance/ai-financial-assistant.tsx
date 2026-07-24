"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, CalendarClock, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthProvider } from "@/lib/auth";
import { cn, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/types";
import {
  aiFinancialAnalysisSchema,
  type AiFinancialAnalysis,
  type AiFinancialSummary,
  type AiProfile
} from "@/lib/ai-financial-analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";

interface AiFinancialAssistantProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBalance: number;
  emergencyReserve: number;
  currency: Currency;
  scopeLabel: string;
  isAdmin: boolean;
}

const profileOptions: Array<{ value: AiProfile; label: string }> = [
  { value: "conservador", label: "Conservador" },
  { value: "equilibrado", label: "Equilibrado" },
  { value: "agressivo", label: "Agressivo" }
];

const riskLabels: Record<AiFinancialAnalysis["riskLevel"], string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto"
};

const riskStyles: Record<AiFinancialAnalysis["riskLevel"], string> = {
  low: "border-success/30 bg-success/10 text-success",
  medium: "border-warning/30 bg-warning/10 text-warning",
  high: "border-danger/30 bg-danger/10 text-danger"
};

function formatGeneratedAt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

async function getAuthorizationHeader() {
  if (getAuthProvider() !== "supabase") {
    return undefined;
  }

  const session = await getSupabaseBrowserClient()?.auth.getSession();
  const token = session?.data.session?.access_token;

  return token ? `Bearer ${token}` : undefined;
}

export function AiFinancialAssistant({
  monthlyIncome,
  monthlyExpenses,
  monthlyBalance,
  emergencyReserve,
  currency,
  scopeLabel,
  isAdmin
}: AiFinancialAssistantProps) {
  const [selectedProfile, setSelectedProfile] = useState<AiProfile>("conservador");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiFinancialAnalysis | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const requestBody = useMemo<AiFinancialSummary>(
    () => ({
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance,
      emergencyReserve,
      currency,
      profile: selectedProfile
    }),
    [currency, emergencyReserve, monthlyBalance, monthlyExpenses, monthlyIncome, selectedProfile]
  );

  if (!isAdmin) {
    return null;
  }

  async function handleGenerate() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authorization = await getAuthorizationHeader();
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };

      if (authorization) {
        headers.Authorization = authorization;
      }

      const response = await fetch("/api/ai-investments", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
      });
      const payload = (await response.json().catch(() => null)) as { analysis?: unknown; error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Nao foi possivel gerar a analise.");
      }

      const parsed = aiFinancialAnalysisSchema.safeParse(payload?.analysis);

      if (!parsed.success) {
        throw new Error("Nao foi possivel interpretar a analise.");
      }

      setAnalysis(parsed.data);
      setGeneratedAt(new Date());
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Nao foi possivel gerar a analise.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>Somente Administrador</Badge>
            <Badge>Visao: {scopeLabel}</Badge>
            {generatedAt ? <Badge>{formatGeneratedAt(generatedAt)}</Badge> : null}
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-normal text-foreground">Assistente financeiro IA</h2>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-[1fr_auto] md:w-auto">
          <Select
            value={selectedProfile}
            onChange={(event) => setSelectedProfile(event.target.value as AiProfile)}
            aria-label="Perfil da analise"
            disabled={loading}
            className="md:w-48"
          >
            {profileOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Gerando..." : "Gerar análise com IA"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border bg-elevated p-4">
            <p className="text-xs uppercase text-muted">Entradas mensais</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{formatMoney(monthlyIncome, currency)}</p>
          </div>
          <div className="rounded-lg border border-border bg-elevated p-4">
            <p className="text-xs uppercase text-muted">Despesas mensais</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{formatMoney(monthlyExpenses, currency)}</p>
          </div>
          <div className="rounded-lg border border-border bg-elevated p-4">
            <p className="text-xs uppercase text-muted">Saldo mensal</p>
            <p className={cn("mt-2 text-lg font-semibold", monthlyBalance >= 0 ? "text-success" : "text-danger")}>
              {formatMoney(monthlyBalance, currency)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-elevated p-4">
            <p className="text-xs uppercase text-muted">Reserva financeira</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{formatMoney(emergencyReserve, currency)}</p>
          </div>
        </CardContent>
      </Card>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {analysis ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Cartão de resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
                  <BrainCircuit className="h-4 w-4 text-foreground" />
                </div>
                <p className="text-sm leading-6 text-muted">{analysis.summary}</p>
              </div>
              <div className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm", riskStyles[analysis.riskLevel])}>
                <ShieldAlert className="h-4 w-4" />
                <span>Nível de atenção: {riskLabels[analysis.riskLevel]}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Análise gerada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted">
                <CalendarClock className="h-4 w-4 text-subtle" />
                <span>{generatedAt ? formatGeneratedAt(generatedAt) : "Nao gerada"}</span>
              </div>
              <p className="text-xs leading-5 text-muted">{analysis.disclaimer}</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Exemplo educacional de alocação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.allocations.map((item) => (
                <div key={`${item.category}-${item.percentage}`} className="rounded-lg border border-border bg-elevated p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.category}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">{item.rationale}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground">{Math.round(item.percentage)}%</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.warnings.map((warning) => (
                <div key={warning} className="flex gap-3 rounded-lg border border-border bg-elevated p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p className="text-xs leading-5 text-muted">{warning}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proximos passos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.nextSteps.map((step) => (
                <div key={step} className="rounded-lg border border-border bg-elevated p-3">
                  <p className="text-xs leading-5 text-muted">{step}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
