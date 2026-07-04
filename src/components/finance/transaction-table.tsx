"use client";

import { Pencil, ReceiptText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useFinance } from "@/components/providers/finance-provider";
import { cn, formatDate, formatMoney } from "@/lib/format";
import type { Transaction } from "@/lib/types";

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  showActions?: boolean;
  emptyTitle?: string;
}

export function TransactionTable({
  transactions,
  onEdit,
  showActions = true,
  emptyTitle = "Nenhuma transação encontrada."
}: TransactionTableProps) {
  const { deleteTransaction, profile } = useFinance();

  async function handleDelete(transaction: Transaction) {
    const confirmed = window.confirm(`Excluir "${transaction.description}"?`);

    if (confirmed) {
      await deleteTransaction(transaction.id);
    }
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={<ReceiptText className="h-5 w-5" />}
          title={emptyTitle}
          description="Os registros aparecerão aqui assim que forem criados."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-elevated text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Moeda</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              {showActions ? <th className="px-4 py-3 text-right font-medium">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const canManageTransaction = profile.role === "master" || transaction.walletUserId === profile.appUserId;

              return (
                  <tr key={transaction.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDate(transaction.date)}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">{transaction.description}</p>
                      <p className="mt-1 max-w-md truncate text-xs text-muted">
                        Carteira: {transaction.walletUserName} · Alterado por: {transaction.updatedByName}
                      </p>
                      {transaction.notes ? <p className="mt-1 max-w-md truncate text-xs text-muted">{transaction.notes}</p> : null}
                    </td>
                    <td className="px-4 py-4">
                      <Badge>{transaction.category}</Badge>
                    </td>
                    <td className="px-4 py-4 text-muted">{transaction.currency}</td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-4 py-4 text-right font-medium",
                        transaction.type === "income" ? "text-success" : "text-danger"
                      )}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatMoney(transaction.amount, transaction.currency)}
                    </td>
                    {showActions ? (
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {onEdit && canManageTransaction ? (
                            <Button variant="ghost" size="icon" onClick={() => onEdit(transaction)} aria-label="Editar transação">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canManageTransaction ? (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(transaction)} aria-label="Excluir transação">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
