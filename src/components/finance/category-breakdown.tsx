import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/types";

interface BreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

interface CategoryBreakdownProps {
  items: BreakdownItem[];
  currency: Currency;
}

export function CategoryBreakdown({ items, currency }: CategoryBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={<ChartNoAxesColumnIncreasing className="h-5 w-5" />}
            title="Sem gastos nessa moeda"
            description="Registre despesas para visualizar a distribuição por categoria."
          />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-foreground">{item.category}</span>
                  <span className="text-muted">{formatMoney(item.amount, currency)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-elevated">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
