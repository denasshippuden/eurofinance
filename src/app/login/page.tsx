"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { useAuth } from "@/components/providers/auth-provider";
import { getAuthProvider } from "@/lib/auth";
import { appUsers } from "@/lib/users";

const localPassword = "financeos123";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isLocalAuth = getAuthProvider() === "local";

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const result = await login(email, password);

    if (!result.ok) {
      setMessage(result.message ?? "Não foi possível entrar.");
      setSubmitting(false);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-panel shadow-premium">
            <LockKeyhole className="h-5 w-5 text-foreground" />
          </div>
          <p className="text-sm uppercase tracking-normal text-muted">Acesso privado</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">{APP_NAME}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Entre com email e senha para acessar seu painel financeiro.
          </p>
        </div>

        <Card>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>

              <Field label="Senha">
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>

              {message ? <Notice tone="error">{message}</Notice> : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Entrando..." : "Entrar"}
              </Button>

              {isLocalAuth ? (
                <div className="rounded-lg border border-border bg-elevated p-3">
                  <p className="text-xs font-medium uppercase tracking-normal text-muted">Acessos locais rápidos</p>
                  <div className="mt-3 grid gap-2">
                    {appUsers.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setEmail(item.email);
                          setPassword(localPassword);
                        }}
                        className="rounded-md border border-border px-3 py-2 text-left text-xs text-subtle transition hover:bg-muted/10 hover:text-foreground"
                      >
                        <span className="block font-medium text-foreground">{item.name}</span>
                        <span>
                          {item.groupName} · {item.email}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="text-center text-xs leading-5 text-muted">
                {isLocalAuth
                  ? "No modo local, use qualquer email válido e senha com 6 ou mais caracteres."
                  : "Use o email e a senha cadastrados no Supabase Authentication."}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
