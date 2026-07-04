"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export function InstallCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const isiOS = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstallPrompt(null);
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (isInstalled) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
            <Smartphone className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Instalar no celular</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Para instalar no celular: toque no menu do navegador e escolha Instalar app ou Adicionar à tela inicial.
            </p>
          </div>
        </div>

        {installPrompt ? (
          <Button className="w-full" onClick={handleInstall}>
            <Download className="h-4 w-4" />
            Instalar app
          </Button>
        ) : null}

        {isiOS ? (
          <div className="flex gap-3 rounded-lg border border-border bg-elevated p-3">
            <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
            <p className="text-xs leading-5 text-muted">No iPhone, use o Safari: toque em compartilhar e depois em Adicionar à Tela de Início.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
