/**
 * Shared CivicMind domain types.
 *
 * Database row types and civic enums live in `src/lib/civic.ts` (derived from
 * the generated database types); AI response shapes live in
 * `src/lib/ai.functions.ts`. This barrel re-exports both so feature code can
 * import everything from `@/types`.
 */

export type {
  AppRole,
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
  Department,
  NotificationRow,
  Profile,
  TimelineRow,
} from "@/lib/civic";

export type { AiSource, ClassifyResult } from "@/lib/ai.functions";

export type { MapMarker } from "@/components/civic/ComplaintMap";

/** Priority prediction returned by /ai/priority (or the built-in fallback). */
export type PriorityResult = {
  source: import("@/lib/ai.functions").AiSource;
  priority: string | null;
  score: number | null;
  reason: string | null;
  confidence: number | null;
  note?: string;
};

/** Plain-language summary returned by /ai/summary. */
export type SummaryResult = {
  source: import("@/lib/ai.functions").AiSource;
  summary: string | null;
  language: string;
  note?: string;
};
