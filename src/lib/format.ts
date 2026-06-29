import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Currency } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency: Currency, compact = false) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: compact ? 0 : 2
  }).format(amount);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

export function toInputDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function parseAmount(value: string) {
  return Number(value.replace(",", "."));
}

export function parseHours(value: string) {
  const trimmed = value.trim();

  if (trimmed.includes(":")) {
    const [hourPart, minutePart = "0"] = trimmed.split(":");
    const hours = Number(hourPart);
    const minutes = Number(minutePart);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes >= 60) {
      return Number.NaN;
    }

    return hours + minutes / 60;
  }

  return parseAmount(trimmed);
}
