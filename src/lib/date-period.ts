export const BUSINESS_TIME_ZONE = "Europe/Brussels";

export interface PeriodValue {
  startDate?: string;
  endDate?: string;
}

function getDateParts(date = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
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

export function getBusinessDateKey(date = new Date()) {
  const parts = getDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getBusinessMonthKey(date = new Date()) {
  return getBusinessDateKey(date).slice(0, 7);
}

export function getMonthBounds(monthKey = getBusinessMonthKey()): Required<PeriodValue> {
  const [year, month] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startDate: start,
    endDate: `${monthKey}-${String(lastDay).padStart(2, "0")}`
  };
}

export function shiftBusinessMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function getPreviousMonthBounds() {
  return getMonthBounds(shiftBusinessMonth(getBusinessMonthKey(), -1));
}

export function getCurrentYearBounds() {
  const year = getBusinessDateKey().slice(0, 4);
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`
  };
}

export function getTodayBounds() {
  const today = getBusinessDateKey();
  return {
    startDate: today,
    endDate: today
  };
}

export function isValidDateKey(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function normalizePeriod(period: PeriodValue): PeriodValue {
  const startDate = isValidDateKey(period.startDate) ? period.startDate : undefined;
  const endDate = isValidDateKey(period.endDate) ? period.endDate : undefined;

  if (startDate && endDate && endDate < startDate) {
    return { startDate: endDate, endDate: startDate };
  }

  return { startDate, endDate };
}

export function getDueDateForMonth(monthKey: string, dueDay: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Math.max(Math.trunc(dueDay), 1), lastDay);
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}
