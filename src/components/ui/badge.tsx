import type { HTMLAttributes } from "react";
import { cn } from "@/lib/format";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "success" | "danger";
}

const tones = {
  neutral: "border-border bg-muted/10 text-subtle",
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/30 bg-danger/10 text-danger"
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
