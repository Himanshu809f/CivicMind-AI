import { useState } from "react";
import { AlertTriangle, ChevronDown, RefreshCw, ServerCog } from "lucide-react";
import { Logo } from "@/components/civic/Logo";
import { cn } from "@/lib/utils";

const CONFIG_HINTS = [
  "Missing Supabase environment variable",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "Connect Supabase in Lovable Cloud",
];

/** True when the error is a missing-backend-configuration failure, not a normal app error. */
export function isBackendConfigError(error: unknown): boolean {
  const message =
    error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error ?? "");
  return CONFIG_HINTS.some((hint) => message.includes(hint));
}

export function BackendRecoveryScreen({
  error,
  onRetry,
  className,
}: {
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const details = error instanceof Error ? (error.stack ?? error.message) : String(error ?? "");

  function retry() {
    if (onRetry) {
      onRetry();
      return;
    }
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex min-h-screen items-center justify-center bg-background px-4 py-10",
        className,
      )}
    >
      <div className="glass w-full max-w-lg rounded-2xl border border-border/60 p-7 shadow-lg">
        <Logo />

        <div className="mt-6 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              CivicMind AI can't reach its services
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The app's secure connection details are missing, so complaints, sign-in and dashboards
              can't load right now. Your saved data is safe — nothing has been lost.
            </p>
          </div>
        </div>

        <ul className="mt-6 space-y-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <ServerCog className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              If this is a freshly published site, publish it again so it picks up the connection
              details.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <RefreshCw className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>If the connection was briefly interrupted, retrying usually restores it.</span>
          </li>
        </ul>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Retry connection
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Back to home
          </a>
        </div>

        {details && (
          <div className="mt-6 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              aria-expanded={showDetails}
              aria-controls="civicmind-recovery-details"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", showDetails && "rotate-180")}
                aria-hidden="true"
              />
              Technical details
            </button>
            {showDetails && (
              <pre
                id="civicmind-recovery-details"
                className="mt-3 max-h-40 overflow-auto rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground"
              >
                {details}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
