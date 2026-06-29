import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/format";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted",
        "focus:border-accent/60 focus:ring-2 focus:ring-accent/15",
        className
      )}
      {...props}
    />
  );
}
