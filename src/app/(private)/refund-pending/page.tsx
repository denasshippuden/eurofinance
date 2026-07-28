"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Clipboard, FileImage, ImagePlus, Printer, RotateCcw, Send, Trash2 } from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type RefundStatus = "pending" | "sent" | "resolved";

interface RefundPhoto {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  createdAt: string;
}

interface RefundItem {
  id: string;
  groupId: string;
  createdByUserId: string;
  createdByName: string;
  ownerName: string;
  description: string;
  status: RefundStatus;
  photos: RefundPhoto[];
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  ownerName: string;
  description: string;
}

const statusLabels: Record<RefundStatus, string> = {
  pending: "Pendente",
  sent: "Enviado ao proprietario",
  resolved: "Resolvido"
};

const statusTones: Record<RefundStatus, "neutral" | "success" | "danger"> = {
  pending: "danger",
  sent: "neutral",
  resolved: "success"
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStorageKey(groupId: string) {
  return `financeos:refund-pending:${groupId}`;
}

function readStoredItems(groupId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(getStorageKey(groupId));

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RefundItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(getStorageKey(groupId));
    return [];
  }
}

function persistItems(groupId: string, items: RefundItem[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getStorageKey(groupId), JSON.stringify(items));
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitialForm(): FormState {
  return {
    ownerName: "",
    description: ""
  };
}

function formatBytes(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function buildShareText(item: RefundItem) {
  return [
    `Proprietario: ${item.ownerName}`,
    `Status: ${statusLabels[item.status]}`,
    `Observacao: ${item.description}`,
    `Fotos anexadas: ${item.photos.length}`
  ].join("\n");
}

export default function RefundPendingPage() {
  const { profile } = useFinance();
  const [items, setItems] = useState<RefundItem[]>([]);
  const [form, setForm] = useState<FormState>(() => getInitialForm());
  const [photos, setPhotos] = useState<RefundPhoto[]>([]);
  const [filter, setFilter] = useState<RefundStatus | "all">("pending");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setItems(readStoredItems(profile.groupId));
  }, [profile.groupId]);

  const visibleItems = useMemo(
    () =>
      [...items]
        .filter((item) => filter === "all" || item.status === filter)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [filter, items]
  );

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function persistNext(nextItems: RefundItem[]) {
    setItems(nextItems);
    persistItems(profile.groupId, nextItems);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setMessage(null);

    if (files.length === 0) {
      return;
    }

    if (photos.length + files.length > 6) {
      setMessage({ tone: "error", text: "Anexe no maximo 6 fotos por item." });
      return;
    }

    const invalid = files.find((file) => !file.type.startsWith("image/") || file.size > 2 * 1024 * 1024);

    if (invalid) {
      setMessage({ tone: "error", text: "Use somente imagens de ate 2 MB cada." });
      return;
    }

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise<RefundPhoto>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: createId("photo"),
                name: file.name,
                type: file.type,
                size: file.size,
                dataUrl: String(reader.result),
                createdAt: new Date().toISOString()
              });
            };
            reader.onerror = () => reject(new Error("Nao foi possivel ler uma das imagens."));
            reader.readAsDataURL(file);
          })
      )
    );

    setPhotos((current) => [...current, ...loaded]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!form.ownerName.trim()) {
      setMessage({ tone: "error", text: "Informe o proprietario responsavel." });
      return;
    }

    if (!form.description.trim()) {
      setMessage({ tone: "error", text: "Informe uma observacao." });
      return;
    }

    if (photos.length === 0) {
      setMessage({ tone: "error", text: "Adicione pelo menos uma foto." });
      return;
    }

    const now = new Date().toISOString();
    const item: RefundItem = {
      id: createId("refund"),
      groupId: profile.groupId,
      createdByUserId: profile.appUserId,
      createdByName: profile.name,
      ownerName: form.ownerName.trim(),
      description: form.description.trim(),
      status: "pending",
      photos,
      createdAt: now,
      updatedAt: now
    };

    persistNext([item, ...items]);
    setForm(getInitialForm());
    setPhotos([]);
    setMessage({ tone: "success", text: "Pendencia de estorno salva." });
  }

  function updateStatus(id: string, status: RefundStatus) {
    const nextItems = items.map((item) => (item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
    persistNext(nextItems);
  }

  function deleteItem(id: string) {
    const item = items.find((current) => current.id === id);

    if (!item || !window.confirm(`Excluir pendencia de "${item.ownerName}"?`)) {
      return;
    }

    persistNext(items.filter((current) => current.id !== id));
  }

  async function copySummary(item: RefundItem) {
    try {
      await navigator.clipboard.writeText(buildShareText(item));
      setMessage({ tone: "success", text: "Resumo copiado. As fotos continuam disponiveis nesta tela." });
    } catch {
      setMessage({ tone: "error", text: "Nao foi possivel copiar o resumo automaticamente." });
    }
  }

  function printItem(item: RefundItem) {
    const reportWindow = window.open("", "_blank", "width=960,height=720");

    if (!reportWindow) {
      setMessage({ tone: "error", text: "O navegador bloqueou a janela de impressao." });
      return;
    }

    const photosHtml = item.photos
      .map(
        (photo) => `
          <figure>
            <img src="${photo.dataUrl}" alt="${escapeHtml(photo.name)}" />
            <figcaption>${escapeHtml(photo.name)} - ${escapeHtml(formatBytes(photo.size))}</figcaption>
          </figure>
        `
      )
      .join("");

    reportWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Pendente estorno - ${escapeHtml(item.ownerName)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 32px; color: #111; font-family: Arial, sans-serif; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 0 0 8px; color: #444; font-size: 13px; }
            .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 24px 0; }
            .box { border: 1px solid #d6d6d6; border-radius: 8px; padding: 12px; }
            .label { color: #666; font-size: 11px; text-transform: uppercase; }
            .value { margin-top: 6px; color: #111; font-size: 15px; font-weight: 700; }
            .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px; }
            figure { margin: 0; break-inside: avoid; }
            img { width: 100%; max-height: 420px; object-fit: contain; border: 1px solid #d6d6d6; border-radius: 8px; }
            figcaption { margin-top: 6px; color: #555; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Pendente Estorno</h1>
          <p>${escapeHtml(item.description)}</p>
          <section class="meta">
            <div class="box"><div class="label">Proprietario</div><div class="value">${escapeHtml(item.ownerName)}</div></div>
            <div class="box"><div class="label">Status</div><div class="value">${escapeHtml(statusLabels[item.status])}</div></div>
            <div class="box"><div class="label">Fotos</div><div class="value">${escapeHtml(String(item.photos.length))}</div></div>
            <div class="box"><div class="label">Registrado por</div><div class="value">${escapeHtml(item.createdByName)}</div></div>
          </section>
          <p>Registrado por ${escapeHtml(item.createdByName)} em ${escapeHtml(new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt)))}</p>
          <section class="photos">${photosHtml}</section>
        </body>
      </html>
    `);
    reportWindow.document.close();
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge>Controle interno</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Pendente Estorno</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Registre pendencias de estorno por proprietario, com foto e observacao.
          </p>
        </div>
        <Badge>{visibleItems.length} pendencia(s)</Badge>
      </header>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nova pendencia</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field label="Proprietario">
                <Input value={form.ownerName} onChange={(event) => updateField("ownerName", event.target.value)} placeholder="Nome do proprietario" />
              </Field>
              <Field label="Observacao">
                <Textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Escreva a observacao do estorno." />
              </Field>

              <div className="space-y-3 rounded-lg border border-border bg-elevated p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Fotos</p>
                    <p className="mt-1 text-xs text-muted">Ate 6 imagens, 2 MB cada.</p>
                  </div>
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-panel px-3 text-xs font-medium text-foreground transition hover:bg-muted/10">
                    <ImagePlus className="h-4 w-4" />
                    Adicionar
                    <input className="sr-only" type="file" accept="image/*" multiple onChange={handlePhotoChange} />
                  </label>
                </div>

                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="overflow-hidden rounded-md border border-border bg-panel">
                        <img className="h-28 w-full object-cover" src={photo.dataUrl} alt={`Foto ${photo.name}`} />
                        <div className="flex items-center justify-between gap-2 p-2">
                          <p className="min-w-0 truncate text-xs text-muted">{photo.name}</p>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))} aria-label={`Remover foto ${photo.name}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted">
                    <Camera className="mx-auto mb-2 h-4 w-4" />
                    Nenhuma foto adicionada.
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">
                <RotateCcw className="h-4 w-4" />
                Salvar pendencia
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-panel p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-foreground">Pendencias registradas</p>
              <p className="mt-1 text-xs text-muted">Fotos e dados ficam no armazenamento local deste grupo.</p>
            </div>
            <Select className="w-full sm:w-52" value={filter} onChange={(event) => setFilter(event.target.value as RefundStatus | "all")}>
              <option value="pending">Pendentes</option>
              <option value="sent">Enviados</option>
              <option value="resolved">Resolvidos</option>
              <option value="all">Todos</option>
            </Select>
          </div>

          <div className="grid gap-3">
            {visibleItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.ownerName}</p>
                        <Badge tone={statusTones[item.status]}>{statusLabels[item.status]}</Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted">{item.description}</p>
                      <p className="mt-2 text-xs text-muted">
                        Registrado por {item.createdByName}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => void copySummary(item)}>
                        <Clipboard className="h-4 w-4" />
                        Copiar
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => printItem(item)}>
                        <Printer className="h-4 w-4" />
                        Imprimir
                      </Button>
                      {item.status === "pending" ? (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, "sent")}>
                          <Send className="h-4 w-4" />
                          Enviado
                        </Button>
                      ) : null}
                      {item.status !== "resolved" ? (
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(item.id, "resolved")}>
                          <CheckCircle2 className="h-4 w-4" />
                          Resolvido
                        </Button>
                      ) : null}
                      <Button variant="danger" size="sm" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {item.photos.map((photo) => (
                      <a key={photo.id} href={photo.dataUrl} target="_blank" rel="noreferrer" className="overflow-hidden rounded-md border border-border bg-elevated">
                        <img className="h-32 w-full object-cover" src={photo.dataUrl} alt={`Foto ${photo.name}`} />
                        <div className="flex items-center gap-2 p-2 text-xs text-muted">
                          <FileImage className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{photo.name}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {visibleItems.length === 0 ? (
              <EmptyState
                icon={<RotateCcw className="h-5 w-5" />}
                title="Nenhuma pendencia neste filtro."
                description="Cadastre uma pendencia de estorno com proprietario, foto e observacao."
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
