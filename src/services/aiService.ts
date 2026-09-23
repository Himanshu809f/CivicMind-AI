/**
 * CivicMind AI — client-side AI service facade.
 *
 * The browser never talks to a model provider directly. Every call here goes to
 * a server function in `src/lib/ai.functions.ts`, which tries the external
 * Python/FastAPI service (AI_BACKEND_URL) first and otherwise uses the built-in
 * Lovable AI gateway. Results always carry a `source` field:
 *   "python-backend" | "lovable-ai" | "unavailable"
 * The UI must show "AI service not connected" whenever source is "unavailable"
 * instead of inventing confidence values.
 *
 * FastAPI contract: see /ai-backend/README.md
 */
import {
  analyzeImage as analyzeImageFn,
  askAssistant as askAssistantFn,
  aiHealth as aiHealthFn,
  classifyComplaint as classifyComplaintFn,
  detectDuplicate as detectDuplicateFn,
  generateSummary as generateSummaryFn,
  predictPriority as predictPriorityFn,
  type ClassifyResult,
  type PriorityResult,
  type SummaryResult,
} from "@/lib/ai.functions";

export type { PriorityResult, SummaryResult };

export type { ClassifyResult };

export function classifyComplaint(input: {
  title?: string;
  description: string;
  language?: string;
  imageUrl?: string;
}) {
  return classifyComplaintFn({ data: input });
}

export function analyzeImage(input: { complaintId?: string; imageUrl: string }) {
  return analyzeImageFn({ data: input });
}

export function detectDuplicate(input: {
  description: string;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
  candidates: {
    id: string;
    complaint_number: string;
    description: string;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
  }[];
}) {
  return detectDuplicateFn({ data: input });
}

export function askAssistant(input: {
  messages: { role: "user" | "assistant"; content: string }[];
  context?: string;
}) {
  return askAssistantFn({ data: input });
}

export function aiHealth() {
  return aiHealthFn();
}

export function predictPriority(input: {
  category: string;
  description: string;
  severity?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  return predictPriorityFn({ data: input });
}

export function generateSummary(input: { description: string; language?: string }) {
  return generateSummaryFn({ data: input });
}
