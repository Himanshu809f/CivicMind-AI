import { cn } from "@/lib/utils";
import { BrainCircuit } from "lucide-react";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="brand-gradient grid size-9 place-items-center rounded-xl shadow-glow">
        <BrainCircuit className="size-5 text-primary-foreground" strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="font-display block text-base font-bold tracking-tight">CivicMind AI</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Complaint to action
          </span>
        </span>
      )}
    </span>
  );
}
