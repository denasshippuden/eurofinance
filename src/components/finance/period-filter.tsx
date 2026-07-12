"use client";

import { CalendarDays, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getCurrentYearBounds, getMonthBounds, getPreviousMonthBounds, getTodayBounds, normalizePeriod, type PeriodValue } from "@/lib/date-period";

interface PeriodFilterProps {
  value: PeriodValue;
  onChange(value: PeriodValue): void;
  onApply(): void;
  onClear(): void;
}

const shortcuts = [
  { label: "Hoje", getValue: getTodayBounds },
  { label: "Este mes", getValue: getMonthBounds },
  { label: "Mes anterior", getValue: getPreviousMonthBounds },
  { label: "Este ano", getValue: getCurrentYearBounds }
];

export function PeriodFilter({ value, onChange, onApply, onClear }: PeriodFilterProps) {
  function update(next: PeriodValue) {
    onChange(normalizePeriod({ ...value, ...next }));
  }

  return (
    <section className="rounded-lg border border-border bg-panel p-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label="Data inicial">
            <Input type="date" value={value.startDate ?? ""} onChange={(event) => update({ startDate: event.target.value || undefined })} />
          </Field>
          <Field label="Data final">
            <Input type="date" value={value.endDate ?? ""} onChange={(event) => update({ endDate: event.target.value || undefined })} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          <Button className="justify-center" onClick={onApply}>
            <Search className="h-4 w-4" />
            Aplicar
          </Button>
          <Button className="justify-center" variant="secondary" onClick={onClear}>
            <RotateCcw className="h-4 w-4" />
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex h-8 items-center gap-2 text-xs text-muted">
          <CalendarDays className="h-3.5 w-3.5" />
          Atalhos
        </span>
        {shortcuts.map((shortcut) => (
          <Button key={shortcut.label} variant="ghost" size="sm" onClick={() => onChange(shortcut.getValue())}>
            {shortcut.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
