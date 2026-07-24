export const BELGIUM_TIME_ZONE = "Europe/Brussels";
export const DAILY_CLOSING_TIME = "20:00";

export interface WorkEntry {
  id: string;
  appUserId: string;
  groupId: string;
  userName: string;
  workDate: string;
  clockInAt: string;
  clockInTime: string;
  clockOutAt?: string;
  clockOutTime?: string;
  intervalMinutes?: number;
  paymentType?: "hourly" | "daily";
  hourlyRate?: number;
  dailyRate?: number;
  notes?: string;
  entrySource?: "clock" | "manual" | "automatic";
  closedAutomatically: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDay {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

function getBelgiumDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BELGIUM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01"
  };
}

export function getBelgiumDateKey(date = new Date()) {
  const parts = getBelgiumDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getBelgiumTime(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BELGIUM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date);
}

export function formatBelgiumDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function createWorkEntryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function getWorkMinutes(entry: WorkEntry) {
  if (!entry.clockOutTime) {
    return 0;
  }

  return Math.max(parseMinutes(entry.clockOutTime) - parseMinutes(entry.clockInTime) - (entry.intervalMinutes ?? 0), 0);
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}h${String(rest).padStart(2, "0")}`;
}

export function shouldAutoCloseEntry(entry: WorkEntry, now = new Date()) {
  if (entry.clockOutTime) {
    return false;
  }

  if (entry.entrySource === "manual") {
    return false;
  }

  const today = getBelgiumDateKey(now);
  const currentTime = getBelgiumTime(now);
  return entry.workDate < today || (entry.workDate === today && currentTime >= DAILY_CLOSING_TIME);
}

export function closeEntryAtDayEnd(entry: WorkEntry, now = new Date()): WorkEntry {
  return {
    ...entry,
    clockOutAt: now.toISOString(),
    clockOutTime: DAILY_CLOSING_TIME,
    entrySource: "automatic",
    closedAutomatically: true,
    updatedAt: now.toISOString()
  };
}

export function closeEntryNow(entry: WorkEntry, now = new Date()): WorkEntry {
  const currentTime = getBelgiumTime(now);
  const clockOutTime = currentTime >= DAILY_CLOSING_TIME ? DAILY_CLOSING_TIME : currentTime;

  return {
    ...entry,
    clockOutAt: now.toISOString(),
    clockOutTime,
    entrySource: currentTime >= DAILY_CLOSING_TIME ? "automatic" : entry.entrySource ?? "clock",
    closedAutomatically: currentTime >= DAILY_CLOSING_TIME,
    updatedAt: now.toISOString()
  };
}

export function buildMonthCalendar(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = (firstDay.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month - 1, 1 - firstWeekday));
  const today = getBelgiumDateKey();

  return Array.from({ length: 42 }, (_, index): CalendarDay => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);

    return {
      date: dateKey,
      dayNumber: date.getUTCDate(),
      inCurrentMonth: date.getUTCMonth() === month - 1,
      isToday: dateKey === today
    };
  });
}

export function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}
