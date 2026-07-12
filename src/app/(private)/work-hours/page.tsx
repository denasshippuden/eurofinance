"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Banknote, CalendarDays, ChevronLeft, ChevronRight, Clock3, Download, Pencil, Save, TimerReset, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/textarea";
import { useFinance } from "@/components/providers/finance-provider";
import { formatMoney, parseAmount } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  BELGIUM_TIME_ZONE,
  DAILY_CLOSING_TIME,
  buildMonthCalendar,
  closeEntryAtDayEnd,
  closeEntryNow,
  createWorkEntryId,
  formatBelgiumDate,
  formatDuration,
  getBelgiumDateKey,
  getBelgiumTime,
  getWorkMinutes,
  shiftMonth,
  shouldAutoCloseEntry,
  type WorkEntry
} from "@/lib/work-hours";

type WorkEntryRow = {
  id: string;
  app_user_id: string;
  group_id: string;
  user_name: string;
  work_date: string;
  clock_in_at: string;
  clock_in_time: string;
  clock_out_at: string | null;
  clock_out_time: string | null;
  interval_minutes?: number | null;
  hourly_rate?: number | null;
  notes?: string | null;
  entry_source?: "clock" | "manual" | "automatic" | null;
  closed_automatically: boolean;
  created_at: string;
  updated_at: string;
};

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEditedTimestamp(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}:00Z`).toISOString();
}

function getWorkHoursErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("time_entries") || message.includes("schema cache")) {
    return "A tabela de horas ainda não existe no Supabase. Rode o arquivo supabase/time_entries.sql no SQL Editor e recarregue esta página.";
  }

  return error instanceof Error ? error.message : "Não foi possível carregar as horas trabalhadas.";
}

function toWorkEntry(row: WorkEntryRow): WorkEntry {
  return {
    id: row.id,
    appUserId: row.app_user_id,
    groupId: row.group_id,
    userName: row.user_name,
    workDate: row.work_date,
    clockInAt: row.clock_in_at,
    clockInTime: row.clock_in_time,
    clockOutAt: row.clock_out_at ?? undefined,
    clockOutTime: row.clock_out_time ?? undefined,
    intervalMinutes: row.interval_minutes ?? 0,
    hourlyRate: row.hourly_rate ?? undefined,
    notes: row.notes ?? undefined,
    entrySource: row.entry_source ?? "clock",
    closedAutomatically: row.closed_automatically,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toWorkEntryRow(entry: WorkEntry, authUserId: string) {
  return {
    id: entry.id,
    auth_user_id: authUserId,
    app_user_id: entry.appUserId,
    group_id: entry.groupId,
    user_name: entry.userName,
    work_date: entry.workDate,
    clock_in_at: entry.clockInAt,
    clock_in_time: entry.clockInTime,
    clock_out_at: entry.clockOutAt ?? null,
    clock_out_time: entry.clockOutTime ?? null,
    interval_minutes: entry.intervalMinutes ?? 0,
    hourly_rate: entry.hourlyRate ?? null,
    notes: entry.notes ?? null,
    entry_source: entry.entrySource ?? "clock",
    closed_automatically: entry.closedAutomatically,
    updated_at: entry.updatedAt
  };
}

function getStorageKey(appUserId: string) {
  return `financeos:work-hours:${appUserId}`;
}

function getHourlyRateStorageKey(appUserId: string) {
  return `financeos:work-hours-rate:${appUserId}`;
}

export default function WorkHoursPage() {
  const { profile } = useFinance();
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [hourlyRate, setHourlyRate] = useState("0");
  const [selectedMonth, setSelectedMonth] = useState(() => getBelgiumDateKey().slice(0, 7));
  const [currentBelgiumTime, setCurrentBelgiumTime] = useState(() => getBelgiumTime());
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editIntervalMinutes, setEditIntervalMinutes] = useState("0");
  const [editHourlyRate, setEditHourlyRate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const useSupabase = process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase";
  const today = getBelgiumDateKey();
  const calendarDays = useMemo(() => buildMonthCalendar(selectedMonth), [selectedMonth]);
  const entriesByDate = useMemo(() => new Map(entries.map((entry) => [entry.workDate, entry])), [entries]);
  const selectedMonthEntries = useMemo(
    () => entries.filter((entry) => entry.workDate.startsWith(selectedMonth)).sort((a, b) => a.workDate.localeCompare(b.workDate)),
    [entries, selectedMonth]
  );
  const todayEntry = entriesByDate.get(today);
  const activeEntry = entries.find((entry) => !entry.clockOutTime);
  const monthMinutes = selectedMonthEntries.reduce((total, entry) => total + getWorkMinutes(entry), 0);
  const parsedHourlyRate = parseAmount(hourlyRate);
  const hasValidHourlyRate = Number.isFinite(parsedHourlyRate) && parsedHourlyRate > 0;
  const monthValue = selectedMonthEntries.reduce((total, entry) => {
    const rate = entry.hourlyRate ?? (hasValidHourlyRate ? parsedHourlyRate : 0);
    return total + (getWorkMinutes(entry) / 60) * rate;
  }, 0);
  const isAfterClosing = currentBelgiumTime >= DAILY_CLOSING_TIME;
  const canStartToday = !todayEntry && !isAfterClosing;

  async function getAuthUserId() {
    const client = getSupabaseBrowserClient();

    if (!client) {
      throw new Error("Supabase não está configurado.");
    }

    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      throw new Error("Sessão Supabase não encontrada.");
    }

    return data.user.id;
  }

  async function loadEntries() {
    if (!useSupabase) {
      const stored = window.localStorage.getItem(getStorageKey(profile.appUserId));
      return stored ? (JSON.parse(stored) as WorkEntry[]) : [];
    }

    const client = getSupabaseBrowserClient();

    if (!client) {
      return [];
    }

    const { data, error } = await client
      .from("time_entries")
      .select("*")
      .eq("app_user_id", profile.appUserId)
      .order("work_date", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as WorkEntryRow[]).map(toWorkEntry);
  }

  async function persistEntry(entry: WorkEntry) {
    if (!useSupabase) {
      return;
    }

    const client = getSupabaseBrowserClient();

    if (!client) {
      return;
    }

    const authUserId = await getAuthUserId();
    const { error } = await client.from("time_entries").upsert(toWorkEntryRow(entry, authUserId));

    if (error) {
      throw new Error(error.message);
    }
  }

  async function deletePersistedEntry(entry: WorkEntry) {
    if (!useSupabase) {
      return;
    }

    const client = getSupabaseBrowserClient();

    if (!client) {
      return;
    }

    const { error } = await client.from("time_entries").delete().eq("id", entry.id).eq("group_id", profile.groupId);

    if (error) {
      throw new Error(error.message);
    }
  }

  function persistLocal(nextEntries: WorkEntry[]) {
    if (!useSupabase) {
      window.localStorage.setItem(getStorageKey(profile.appUserId), JSON.stringify(nextEntries));
    }
  }

  function handleHourlyRateChange(value: string) {
    setHourlyRate(value);
    window.localStorage.setItem(getHourlyRateStorageKey(profile.appUserId), value);
  }

  async function normalizeEntries(nextEntries: WorkEntry[]) {
    const normalized = nextEntries.map((entry) => (shouldAutoCloseEntry(entry) ? closeEntryAtDayEnd(entry) : entry));
    const changed = normalized.filter((entry, index) => entry !== nextEntries[index]);

    if (changed.length > 0) {
      persistLocal(normalized);
      await Promise.all(changed.map(persistEntry));
    }

    return normalized;
  }

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const loadedEntries = await loadEntries();
        const normalizedEntries = await normalizeEntries(loadedEntries);

        if (mounted) {
          setEntries(normalizedEntries);
        }
      } catch (error) {
        if (mounted) {
          setMessage({
            tone: "error",
            text: getWorkHoursErrorMessage(error)
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      mounted = false;
    };
  }, [profile.appUserId]);

  useEffect(() => {
    const storedRate = window.localStorage.getItem(getHourlyRateStorageKey(profile.appUserId));
    setHourlyRate(storedRate ?? "0");
  }, [profile.appUserId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentBelgiumTime(getBelgiumTime());
      setEntries((current) => {
        const normalized = current.map((entry) => (shouldAutoCloseEntry(entry) ? closeEntryAtDayEnd(entry) : entry));
        const changed = normalized.filter((entry, index) => entry !== current[index]);

        if (changed.length > 0) {
          persistLocal(normalized);
          void Promise.all(changed.map(persistEntry)).catch((error) => {
            setMessage({
              tone: "error",
              text: getWorkHoursErrorMessage(error)
            });
          });
        }

        return normalized;
      });
    }, 60000);

    return () => window.clearInterval(timer);
  }, [profile.appUserId, useSupabase]);

  async function handlePunch() {
    setSubmitting(true);
    setMessage(null);

    try {
      const now = new Date();
      const openEntry = entries.find((entry) => !entry.clockOutTime);
      let nextEntry: WorkEntry;
      let nextEntries: WorkEntry[];

      if (openEntry) {
        nextEntry = closeEntryNow(openEntry, now);
        nextEntries = entries.map((entry) => (entry.id === openEntry.id ? nextEntry : entry));
        setMessage({ tone: "success", text: "Ponto encerrado." });
      } else {
        if (!canStartToday) {
          setMessage({ tone: "error", text: "O ponto de hoje já foi encerrado às 20:00 na Bélgica." });
          return;
        }

        nextEntry = {
          id: createWorkEntryId(),
          appUserId: profile.appUserId,
          groupId: profile.groupId,
          userName: profile.name,
          workDate: today,
          clockInAt: now.toISOString(),
          clockInTime: getBelgiumTime(now),
          intervalMinutes: 0,
          entrySource: "clock",
          closedAutomatically: false,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };
        nextEntries = [nextEntry, ...entries];
        setMessage({ tone: "success", text: "Ponto iniciado." });
      }

      persistLocal(nextEntries);
      await persistEntry(nextEntry);
      setEntries(nextEntries);
    } catch (error) {
      setMessage({
        tone: "error",
        text: getWorkHoursErrorMessage(error)
      });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(date: string) {
    const entry = entriesByDate.get(date);

    setEditingDate(date);
    setEditClockIn(entry?.clockInTime ?? "09:00");
    setEditClockOut(entry?.clockOutTime ?? "18:00");
    setEditIntervalMinutes(String(entry?.intervalMinutes ?? 0));
    setEditHourlyRate(String(entry?.hourlyRate ?? (hasValidHourlyRate ? parsedHourlyRate : "")));
    setEditNotes(entry?.notes ?? "");
    setEditError(null);
    setMessage(null);
  }

  function closeEdit() {
    setEditingDate(null);
    setEditClockIn("");
    setEditClockOut("");
    setEditIntervalMinutes("0");
    setEditHourlyRate("");
    setEditNotes("");
    setEditError(null);
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingDate) {
      return;
    }

    if (!editClockIn || !editClockOut) {
      setEditError("Informe entrada e saída.");
      return;
    }

    if (editClockOut <= editClockIn) {
      setEditError("A saída precisa ser depois da entrada.");
      return;
    }

    const intervalMinutes = Number(editIntervalMinutes || 0);
    const entryHourlyRate = parseAmount(editHourlyRate || "0");

    if (!Number.isInteger(intervalMinutes) || intervalMinutes < 0) {
      setEditError("O intervalo precisa ser um numero de minutos valido.");
      return;
    }

    if (editHourlyRate && (!Number.isFinite(entryHourlyRate) || entryHourlyRate < 0)) {
      setEditError("Informe um valor de hora valido.");
      return;
    }

    setSubmitting(true);
    setEditError(null);
    setMessage(null);

    try {
      const now = new Date();
      const currentEntry = entriesByDate.get(editingDate);
      const editedEntry: WorkEntry = {
        id: currentEntry?.id ?? createWorkEntryId(),
        appUserId: profile.appUserId,
        groupId: profile.groupId,
        userName: profile.name,
        workDate: editingDate,
        clockInAt: buildEditedTimestamp(editingDate, editClockIn),
        clockInTime: editClockIn,
        clockOutAt: buildEditedTimestamp(editingDate, editClockOut),
        clockOutTime: editClockOut,
        intervalMinutes,
        hourlyRate: editHourlyRate ? entryHourlyRate : undefined,
        notes: editNotes.trim() || undefined,
        entrySource: "manual",
        closedAutomatically: false,
        createdAt: currentEntry?.createdAt ?? now.toISOString(),
        updatedAt: now.toISOString()
      };
      const nextEntries = currentEntry
        ? entries.map((entry) => (entry.id === currentEntry.id ? editedEntry : entry))
        : [editedEntry, ...entries];

      persistLocal(nextEntries);
      await persistEntry(editedEntry);
      setEntries(nextEntries);
      closeEdit();
      setMessage({ tone: "success", text: "Horas atualizadas." });
    } catch (error) {
      setEditError(getWorkHoursErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEdit() {
    if (!editingDate) {
      return;
    }

    const currentEntry = entriesByDate.get(editingDate);

    if (!currentEntry) {
      return;
    }

    if (!window.confirm(`Excluir o registro de ${formatBelgiumDate(editingDate)}?`)) {
      return;
    }

    setSubmitting(true);
    setEditError(null);
    setMessage(null);

    try {
      const nextEntries = entries.filter((entry) => entry.id !== currentEntry.id);
      persistLocal(nextEntries);
      await deletePersistedEntry(currentEntry);
      setEntries(nextEntries);
      closeEdit();
      setMessage({ tone: "success", text: "Registro excluido." });
    } catch (error) {
      setEditError(getWorkHoursErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function handleExportPdf() {
    if (selectedMonthEntries.length === 0) {
      setMessage({ tone: "error", text: "Não há horas registradas neste mês para exportar." });
      return;
    }

    const reportWindow = window.open("", "_blank", "width=900,height=700");

    if (!reportWindow) {
      setMessage({ tone: "error", text: "O navegador bloqueou a janela do PDF. Permita pop-ups e tente novamente." });
      return;
    }

    const rows = selectedMonthEntries
      .map((entry) => {
        const minutes = getWorkMinutes(entry);
        const rate = entry.hourlyRate ?? (hasValidHourlyRate ? parsedHourlyRate : 0);
        const value = (minutes / 60) * rate;

        return `
          <tr>
            <td>${escapeHtml(formatBelgiumDate(entry.workDate))}</td>
            <td>${escapeHtml(entry.clockInTime)}</td>
            <td>${escapeHtml(entry.clockOutTime ?? "Aberto")}</td>
            <td>${escapeHtml(formatDuration(minutes))}</td>
            <td>${escapeHtml(formatMoney(value, profile.defaultCurrency))}</td>
          </tr>
        `;
      })
      .join("");

    reportWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Horas trabalhadas - ${escapeHtml(formatBelgiumDate(`${selectedMonth}-01`))}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 32px; color: #111; font-family: Arial, sans-serif; }
            header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d6d6d6; padding-bottom: 18px; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 0; color: #555; font-size: 13px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
            .box { border: 1px solid #d6d6d6; border-radius: 8px; padding: 12px; }
            .label { color: #666; font-size: 11px; text-transform: uppercase; }
            .value { margin-top: 6px; color: #111; font-size: 18px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f1f1f1; color: #444; font-size: 11px; text-transform: uppercase; }
            th, td { border: 1px solid #d6d6d6; padding: 9px; text-align: left; }
            @media print {
              body { margin: 18mm; }
            }
          </style>
        </head>
        <body>
          <header>
            <div>
              <h1>Horas trabalhadas</h1>
              <p>${escapeHtml(profile.name)} · ${escapeHtml(formatBelgiumDate(`${selectedMonth}-01`))}</p>
            </div>
            <p>Gerado em ${escapeHtml(new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()))}</p>
          </header>
          <section class="summary">
            <div class="box">
              <div class="label">Total de horas</div>
              <div class="value">${escapeHtml(formatDuration(monthMinutes))}</div>
            </div>
            <div class="box">
              <div class="label">Valor da hora</div>
              <div class="value">${escapeHtml(formatMoney(hasValidHourlyRate ? parsedHourlyRate : 0, profile.defaultCurrency))}</div>
            </div>
            <div class="box">
              <div class="label">Valor final</div>
              <div class="value">${escapeHtml(formatMoney(monthValue, profile.defaultCurrency))}</div>
            </div>
          </section>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Horas</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>
            window.addEventListener("load", () => {
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    reportWindow.document.close();
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-xs text-subtle">
            <Clock3 className="h-4 w-4" />
            Horário oficial: Bélgica
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-foreground">Horas trabalhadas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Calendário de ponto baseado em {BELGIUM_TIME_ZONE}, com encerramento automático diário às 20:00.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Hoje: {formatBelgiumDate(today)}</Badge>
          <Badge>Agora: {currentBelgiumTime}</Badge>
          <Button variant="secondary" onClick={handleExportPdf} disabled={loading || selectedMonthEntries.length === 0}>
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </header>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {editingDate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="max-h-[92vh] w-full max-w-md overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Editar jornada</CardTitle>
                <Button variant="ghost" size="icon" onClick={closeEdit} aria-label="Fechar edição">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSaveEdit}>
                <div className="rounded-lg border border-border bg-elevated p-4">
                  <p className="text-xs uppercase text-muted">Data</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatBelgiumDate(editingDate)}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Entrada">
                    <Input type="time" value={editClockIn} onChange={(event) => setEditClockIn(event.target.value)} />
                  </Field>
                  <Field label="Saída">
                    <Input type="time" value={editClockOut} onChange={(event) => setEditClockOut(event.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Intervalo em minutos">
                    <Input
                      type="number"
                      min={0}
                      value={editIntervalMinutes}
                      onChange={(event) => setEditIntervalMinutes(event.target.value)}
                    />
                  </Field>
                  <Field label="Valor da hora">
                    <Input inputMode="decimal" value={editHourlyRate} onChange={(event) => setEditHourlyRate(event.target.value)} />
                  </Field>
                </div>
                <Field label="Observação opcional">
                  <Textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} placeholder="Ajuste manual, contexto ou observação." />
                </Field>
                {editError ? <Notice tone="error">{editError}</Notice> : null}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  {entriesByDate.has(editingDate) ? (
                    <Button variant="danger" onClick={handleDeleteEdit} disabled={submitting}>
                      <Trash2 className="h-4 w-4" />
                      Excluir registro
                    </Button>
                  ) : (
                    <span />
                  )}
                  <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={closeEdit} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    <Save className="h-4 w-4" />
                    {submitting ? "Salvando..." : "Salvar jornada"}
                  </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:items-start">
        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden shadow-line">
            <CardHeader>
              <CardTitle>Ponto do dia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-lg border border-border bg-elevated p-4">
                  <p className="text-xs uppercase text-muted">Entrada</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{todayEntry?.clockInTime ?? "--:--"}</p>
                </div>
                <div className="rounded-lg border border-border bg-elevated p-4">
                  <p className="text-xs uppercase text-muted">Saída</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{todayEntry?.clockOutTime ?? "--:--"}</p>
                </div>
              </div>
              <Button className="h-12 w-full text-base" onClick={handlePunch} disabled={loading || submitting || (!activeEntry && !canStartToday)}>
                <TimerReset className="h-5 w-5" />
                {submitting ? "Registrando..." : activeEntry ? "Encerrar ponto" : "Bater ponto"}
              </Button>
              <p className="text-xs leading-5 text-muted">
                Se houver ponto aberto, o sistema encerra automaticamente às {DAILY_CLOSING_TIME} no horário da Bélgica.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden shadow-line">
            <CardHeader>
              <CardTitle>Resumo do mês</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Valor da hora">
                <Input
                  inputMode="decimal"
                  value={hourlyRate}
                  onChange={(event) => handleHourlyRateChange(event.target.value)}
                  placeholder="12,50"
                />
              </Field>
              <div className="rounded-lg border border-border bg-elevated p-4">
                <p className="text-xs uppercase text-muted">Total registrado</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{formatDuration(monthMinutes)}</p>
              </div>
              <div className="rounded-lg border border-border bg-elevated p-4">
                <p className="flex items-center gap-2 text-xs uppercase text-muted">
                  <Banknote className="h-4 w-4" />
                  Valor final
                </p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{formatMoney(monthValue, profile.defaultCurrency)}</p>
              </div>
              {!hasValidHourlyRate ? <p className="text-xs leading-5 text-muted">Defina um valor da hora maior que zero para calcular o total financeiro.</p> : null}
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0 overflow-hidden rounded-xl shadow-line">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex min-w-0 items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span className="truncate">{formatBelgiumDate(`${selectedMonth}-01`)}</span>
              </CardTitle>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button className="justify-center" variant="secondary" size="sm" onClick={() => setSelectedMonth((current) => shiftMonth(current, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button className="justify-center" variant="secondary" size="sm" onClick={() => setSelectedMonth((current) => shiftMonth(current, 1))}>
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
            <div className="grid min-w-0 grid-cols-7 gap-1.5 sm:gap-2">
              {weekDays.map((day) => (
                <div key={day} className="min-w-0 px-1 text-center text-[10px] font-medium uppercase text-muted sm:px-2 sm:text-xs">
                  {day}
                </div>
              ))}
              {calendarDays.map((day) => {
                const entry = entriesByDate.get(day.date);
                const minutes = entry ? getWorkMinutes(entry) : 0;

                return (
                  <div
                    key={day.date}
                    role="button"
                    tabIndex={0}
                    onClick={() => startEdit(day.date)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        startEdit(day.date);
                      }
                    }}
                    className={[
                      "min-w-0 cursor-pointer overflow-hidden rounded-md border p-2 transition sm:min-h-28 sm:rounded-lg sm:p-3",
                      day.inCurrentMonth ? "border-border bg-elevated" : "border-border/50 bg-panel/50 opacity-50",
                      day.isToday ? "ring-2 ring-foreground/30" : ""
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-1">
                      <span className="text-sm font-medium text-foreground">{day.dayNumber}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        {entry?.closedAutomatically ? <span className="hidden sm:inline-flex"><Badge>20h</Badge></span> : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 sm:h-7 sm:w-7"
                            onClick={(event) => {
                              event.stopPropagation();
                              startEdit(day.date);
                            }}
                            aria-label={`Editar horas de ${formatBelgiumDate(day.date)}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                      </div>
                    </div>
                    {entry ? (
                      <div className="mt-2 min-w-0 space-y-1 text-[10px] text-muted [&>p:nth-child(-n+2)]:hidden [&>p]:truncate [&>p:last-child]:hidden sm:mt-3 sm:text-xs sm:[&>p:nth-child(-n+2)]:block sm:[&>p:last-child]:block">
                        <p>Entrada: {entry.clockInTime}</p>
                        <p>Saída: {entry.clockOutTime ?? "Aberto"}</p>
                        <p className="font-medium text-foreground">{formatDuration(minutes)}</p>
                        <p className="font-medium text-foreground">
                          {formatMoney((minutes / 60) * (entry.hourlyRate ?? (hasValidHourlyRate ? parsedHourlyRate : 0)), profile.defaultCurrency)}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 hidden truncate text-xs text-muted sm:block">Sem ponto</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
