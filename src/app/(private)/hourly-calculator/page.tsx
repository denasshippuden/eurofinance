"use client";

import { FormEvent, useState } from "react";
import { Calculator, Clock, CalendarDays, Banknote } from "lucide-react";
import { MetricCard } from "@/components/finance/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { currencyOptions, periodOptions } from "@/lib/constants";
import { calculateHourly, calculateReturnFromHourly } from "@/lib/finance";
import { cn, formatMoney, parseAmount, parseHours } from "@/lib/format";
import { useFinance } from "@/components/providers/finance-provider";
import type { Currency, WorkPeriod } from "@/lib/types";

type CalculatorMode = "amount-to-hourly" | "hourly-to-return";

export default function HourlyCalculatorPage() {
  const { profile } = useFinance();
  const [mode, setMode] = useState<CalculatorMode>("amount-to-hourly");
  const [amount, setAmount] = useState("2000");
  const [hourlyRate, setHourlyRate] = useState("12,50");
  const [currency, setCurrency] = useState<Currency>(profile.defaultCurrency);
  const [hours, setHours] = useState("160");
  const [period, setPeriod] = useState<WorkPeriod>("month");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState({
    total: 2000,
    ...calculateHourly(2000, 160)
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseAmount(amount);
    const parsedHourlyRate = parseAmount(hourlyRate);
    const parsedHours = parseHours(hours);

    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      setError("Informe uma quantidade de horas válida. Exemplo: 1,5 ou 1:30.");
      return;
    }

    if (mode === "amount-to-hourly") {
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setError("Informe um valor recebido maior que zero.");
        return;
      }

      setError(null);
      setResult({
        total: parsedAmount,
        ...calculateHourly(parsedAmount, parsedHours)
      });
      return;
    }

    if (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0) {
      setError("Informe um valor da hora maior que zero.");
      return;
    }

    setError(null);
    setResult(calculateReturnFromHourly(parsedHourlyRate, parsedHours));
  }

  const periodLabel = periodOptions.find((item) => item.value === period)?.label.toLowerCase() ?? "período";
  const parsedHours = parseHours(hours);
  const safeHours = Number.isFinite(parsedHours) ? parsedHours : 0;

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-xs text-subtle">
          <Calculator className="h-4 w-4" />
          Calculadora por Hora
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Cálculo por hora</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Converta renda e horas trabalhadas em valores por hora, dia, semana e mês.
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dados do cálculo</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-elevated p-1">
                <button
                  type="button"
                  onClick={() => setMode("amount-to-hourly")}
                  className={cn(
                    "h-9 rounded-md text-xs font-medium text-muted transition",
                    mode === "amount-to-hourly" && "bg-foreground text-background"
                  )}
                >
                  Descobrir hora
                </button>
                <button
                  type="button"
                  onClick={() => setMode("hourly-to-return")}
                  className={cn(
                    "h-9 rounded-md text-xs font-medium text-muted transition",
                    mode === "hourly-to-return" && "bg-foreground text-background"
                  )}
                >
                  Calcular retorno
                </button>
              </div>

              {mode === "amount-to-hourly" ? (
                <Field label="Valor recebido">
                  <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="2000" />
                </Field>
              ) : (
                <Field label="Valor da hora">
                  <Input inputMode="decimal" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} placeholder="12,50" />
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Moeda">
                  <Select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Horas trabalhadas">
                  <Input inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value)} placeholder="160 ou 1:30" />
                </Field>
              </div>

              <Field label="Período">
                <Select value={period} onChange={(event) => setPeriod(event.target.value as WorkPeriod)}>
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {error ? <Notice tone="error">{error}</Notice> : null}

              <Button type="submit" className="w-full">
                <Calculator className="h-4 w-4" />
                Calcular
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {mode === "hourly-to-return" ? (
              <MetricCard label="Retorno calculado" value={formatMoney(result.total, currency)} detail={`${safeHours} horas trabalhadas`} icon={<Calculator className="h-4 w-4" />} />
            ) : null}
            <MetricCard label="Valor por hora" value={formatMoney(result.hourly, currency)} icon={<Clock className="h-4 w-4" />} />
            <MetricCard label="Dia de 8 horas" value={formatMoney(result.daily, currency)} icon={<CalendarDays className="h-4 w-4" />} />
            <MetricCard label="Semana estimada" value={formatMoney(result.weekly, currency)} detail="Base de 40 horas" icon={<Banknote className="h-4 w-4" />} />
            <MetricCard label="Mês estimado" value={formatMoney(result.monthly, currency)} detail="Base de 160 horas" icon={<Banknote className="h-4 w-4" />} />
          </div>

          <Card>
            <CardContent>
              {mode === "amount-to-hourly" ? (
                <p className="text-sm leading-6 text-subtle">
                  Com {formatMoney(parseAmount(amount) || 0, currency)} no período de {periodLabel} e {safeHours} horas,
                  sua referência atual é {formatMoney(result.hourly, currency)} por hora.
                </p>
              ) : (
                <p className="text-sm leading-6 text-subtle">
                  Com {safeHours} horas trabalhadas a {formatMoney(parseAmount(hourlyRate) || 0, currency)} por hora,
                  o retorno estimado para este {periodLabel} é {formatMoney(result.total, currency)}.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
