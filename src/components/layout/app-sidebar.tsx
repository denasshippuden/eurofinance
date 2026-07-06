"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowRightLeft,
  ArrowUpCircle,
  Calculator,
  Clock3,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { useFinance } from "@/components/providers/finance-provider";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Gastos", icon: ArrowDownCircle },
  { href: "/income", label: "Entradas", icon: ArrowUpCircle },
  { href: "/transactions", label: "Transações", icon: ArrowRightLeft },
  { href: "/hourly-calculator", label: "Calculadora", icon: Calculator },
  { href: "/work-hours", label: "Horas trabalhadas", icon: Clock3 },
  { href: "/settings", label: "Configurações", icon: Settings }
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { profile, updateProfile } = useFinance();
  const isLightTheme = profile.theme === "light";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleThemeToggle() {
    await updateProfile({
      name: profile.name,
      defaultCurrency: profile.defaultCurrency,
      theme: isLightTheme ? "dark" : "light"
    });
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-panel/85 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="border-b border-border px-6 py-6">
          <Link href="/dashboard" className="block">
            <p className="text-sm font-semibold text-foreground">{APP_NAME}</p>
            <p className="mt-1 text-xs text-muted">CRM financeiro privado</p>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition",
                  active ? "bg-foreground text-background" : "text-subtle hover:bg-muted/10 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 rounded-lg border border-border bg-elevated p-3">
            <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
            <p className="mt-1 truncate text-xs text-muted">
              {user?.groupName} · {user?.role === "master" ? "Master" : "Membro"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            className="mb-2 w-full justify-start"
            onClick={handleThemeToggle}
            aria-label={isLightTheme ? "Usar tema escuro" : "Usar tema claro"}
          >
            {isLightTheme ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span>{isLightTheme ? "Usar tema escuro" : "Usar tema claro"}</span>
          </Button>
          <Button variant="ghost" size="md" className="w-full justify-start" onClick={handleLogout} aria-label="Sair">
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-sm font-semibold text-foreground">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleThemeToggle} aria-label={isLightTheme ? "Usar tema escuro" : "Usar tema claro"}>
              {isLightTheme ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs transition",
                  active ? "bg-foreground text-background" : "border border-border bg-panel text-subtle"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
