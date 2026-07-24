import { z } from "zod";

export const aiProfileSchema = z.enum(["conservador", "equilibrado", "agressivo"]);

export const aiFinancialSummarySchema = z
  .strictObject({
    monthlyIncome: z.number().finite().nonnegative(),
    monthlyExpenses: z.number().finite().nonnegative(),
    monthlyBalance: z.number().finite(),
    emergencyReserve: z.number().finite().nonnegative(),
    debts: z.number().finite().nonnegative().optional(),
    currency: z.enum(["EUR", "BRL", "USD"]),
    profile: aiProfileSchema
  })
  .refine((input) => Math.abs(input.monthlyIncome - input.monthlyExpenses - input.monthlyBalance) <= 1, {
    message: "Resumo financeiro inconsistente.",
    path: ["monthlyBalance"]
  });

export const aiFinancialAnalysisSchema = z.strictObject({
  summary: z.string().min(1),
  riskLevel: z.enum(["low", "medium", "high"]),
  allocations: z.array(
    z.strictObject({
      category: z.string().min(1),
      percentage: z.number().finite().min(0).max(100),
      rationale: z.string().min(1)
    })
  ),
  warnings: z.array(z.string().min(1)),
  nextSteps: z.array(z.string().min(1)),
  disclaimer: z.string().min(1)
});

export type AiProfile = z.infer<typeof aiProfileSchema>;
export type AiFinancialSummary = z.infer<typeof aiFinancialSummarySchema>;
export type AiFinancialAnalysis = z.infer<typeof aiFinancialAnalysisSchema>;
