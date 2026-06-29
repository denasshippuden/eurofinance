import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/format";

interface NoticeProps {
  tone: "success" | "error";
  children: React.ReactNode;
}

export function Notice({ tone, children }: NoticeProps) {
  const isSuccess = tone === "success";

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        isSuccess ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"
      )}
    >
      {isSuccess ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
      <span>{children}</span>
    </div>
  );
}
