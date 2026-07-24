"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { AiFinancialAssistant } from "@/components/finance/ai-financial-assistant";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useFinance } from "@/components/providers/finance-provider";
import { getBalanceByCurrency, getMonthlySummary } from "@/lib/finance";
import { getVisibleWalletUsers } from "@/lib/users";

export default function AiInvestmentsPage() {
  const router = useRouter();
  const { profile, transactions, walletUsers } = useFinance();
  const [scope, setScope] = useState("group");
  const currency = profile.defaultCurrency;
  const visibleWalletUsers = getVisibleWalletUsers(profile, walletUsers);

  useEffect(() => {
    if (profile.role !== "master") {
      router.replace("/dashboard");
    }
  }, [profile.role, router]);

  const scopedTransactions = useMemo(
    () => (scope === "group" ? transactions : transactions.filter((transaction) => transaction.walletUserId === scope)),
    [scope, transactions]
  );
  const monthly = getMonthlySummary(scopedTransactions, currency);
  const balances = getBalanceByCurrency(scopedTransactions);
  const scopeLabel = scope === "group" ? profile.groupName : walletUsers.find((user) => user.id === scope)?.name ?? "Carteira";

  if (profile.role !== "master") {
    return (
      <Card>
        <CardContent className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-danger" />
          <div>
            <p className="text-sm font-medium text-foreground">Acesso restrito</p>
            <p className="mt-1 text-sm text-muted">Esta area esta disponivel somente para o Administrador.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">Assistente financeiro IA</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Analise educacional gerada sob demanda a partir dos totais agregados ja calculados.
          </p>
        </div>
        <div className="w-full md:w-64">
          <Select value={scope} onChange={(event) => setScope(event.target.value)} aria-label="Visao da analise">
            <option value="group">Grupo completo</option>
            {visibleWalletUsers.map((user) => (
              <option key={user.id} value={user.id}>
                Carteira: {user.name}
              </option>
            ))}
          </Select>
        </div>
      </header>

      <AiFinancialAssistant
        monthlyIncome={monthly.income}
        monthlyExpenses={monthly.expenses}
        monthlyBalance={monthly.net}
        emergencyReserve={Math.max(0, balances[currency])}
        currency={currency}
        scopeLabel={scopeLabel}
        isAdmin={profile.role === "master"}
      />
    </div>
  );
}
