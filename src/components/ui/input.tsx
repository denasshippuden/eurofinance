import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/format";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border bg-elevated px-3 text-sm text-foreground outline-none transition placeholder:text-muted",
        "focus:border-accent/60 focus:ring-2 focus:ring-accent/15",
        className
      )}
      {...props}
    />
  );
}
