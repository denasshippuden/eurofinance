"use client";

import { FormEvent, useEffect, useState } from "react";
import { Monitor, Moon, RotateCcw, Save, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { currencyOptions } from "@/lib/constants";
import { cn } from "@/lib/format";
import { useFinance } from "@/components/providers/finance-provider";
import type { Currency, ThemePreference } from "@/lib/types";

const themeOptions: Array<{ value: ThemePreference; label: string; description: string; icon: typeof Moon }> = [
  { value: "dark", label: "Escuro", description: "Painel premium preto", icon: Moon },
  { value: "light", label: "Claro", description: "Tela branca clean", icon: Sun },
  { value: "system", label: "Sistema", description: "Segue seu dispositivo", icon: Monitor }
];

export default function SettingsPage() {
  const { profile, updateProfile, resetDemoData } = useFinance();
  const [name, setName] = useState(profile.name);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(profile.defaultCurrency);
  const [theme, setTheme] = useState<ThemePreference>(profile.theme);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setDefaultCurrency(profile.defaultCurrency);
    setTheme(profile.theme);
  }, [profile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await updateProfile({ name: name.trim() || "FinanceOS Private", defaultCurrency, theme });
      setMessage({ tone: "success", text: "Configurações salvas." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível salvar." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm("Restaurar os dados demonstrativos?");

    if (!confirmed) {
      return;
    }

    await resetDemoData();
    setMessage({ tone: "success", text: "Dados demonstrativos restaurados." });
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-xs text-subtle">
          <Settings className="h-4 w-4" />
          Preferências
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Configurações</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Ajuste o nome exibido, moeda principal e tema visual do FinanceOS Private.
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-[520px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Perfil financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field label="Nome do usuário ou empresa">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="FinanceOS Private" />
              </Field>

              <Field label="Moeda principal padrão">
                <Select value={defaultCurrency} onChange={(event) => setDefaultCurrency(event.target.value as Currency)}>
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-normal text-muted">Tema visual</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const active = theme === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTheme(option.value)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition",
                          active ? "border-foreground bg-foreground text-background" : "border-border bg-elevated text-foreground hover:bg-muted/10"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="mt-3 block text-sm font-medium">{option.label}</span>
                        <span className={cn("mt-1 block text-xs", active ? "text-background/70" : "text-muted")}>{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                <Save className="h-4 w-4" />
                {submitting ? "Salvando..." : "Salvar configurações"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ambiente local</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted">
              A primeira versão usa dados locais no navegador quando Supabase não está ativo. Depois de conectar o banco, a mesma interface passa a usar a camada de dados remota.
            </p>
            <Button variant="secondary" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Restaurar dados demo
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
