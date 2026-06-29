import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
}

export function MetricCard({ label, value, detail, icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{label}</p>
          {icon ? <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-elevated text-subtle">{icon}</div> : null}
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-normal text-foreground">{value}</p>
          {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
