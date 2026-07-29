import type { Currency } from "@/lib/types";

export type PdfLanguage = "pt-BR" | "fr-FR";

export const pdfLanguageLabels: Record<PdfLanguage, string> = {
  "pt-BR": "Portugu\u00eas",
  "fr-FR": "Fran\u00e7ais"
};

export function getPdfHtmlLang(language: PdfLanguage) {
  return language;
}

export function formatPdfDate(dateKey: string, language: PdfLanguage) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatPdfDateTime(date: Date, language: PdfLanguage) {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function formatPdfMoney(amount: number, currency: Currency, language: PdfLanguage) {
  return new Intl.NumberFormat(language, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}
