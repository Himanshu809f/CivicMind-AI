import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading,
  accent = "primary",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
  accent?: "primary" | "signal" | "ai" | "success" | "warning" | "critical";
}) {
  const accents: Record<string, string> = {
    primary: "bg-primary/12 text-primary",
    signal: "bg-signal/20 text-signal-foreground",
    ai: "bg-ai/12 text-ai",
    success: "bg-success/12 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    critical: "bg-critical/12 text-critical",
  };
  return (
    <div className="card-lift rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className="font-display mt-1 text-3xl font-bold">{value}</p>
          )}
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn("grid size-10 place-items-center rounded-xl", accents[accent])}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
