"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAuth } from "@/components/providers/auth-provider";
import { FinanceProvider } from "@/components/providers/finance-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const redirecting = useRef(false);

  useEffect(() => {
    if (!loading && !user && !redirecting.current) {
      redirecting.current = true;
      void logout().finally(() => router.replace("/login"));
    }
  }, [loading, logout, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        Verificando acesso...
      </div>
    );
  }

  return (
    <FinanceProvider>
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar />
        <main className="px-4 py-6 sm:px-6 lg:ml-72 lg:px-10 lg:py-10">{children}</main>
      </div>
    </FinanceProvider>
  );
}
