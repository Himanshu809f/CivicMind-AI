/**
 * CivicMind AI — AI service boundary.
 *
 * Every function here first tries the external Python/FastAPI service when
 * AI_BACKEND_URL (or VITE_AI_BACKEND_URL) is configured. If it is not
 * configured, or the call fails, we fall back to Lovable AI so the platform
 * stays useful. The response always reports which provider produced it, so the
 * UI never presents a fake model as a real one.
 *
 * FastAPI contract: see /ai-backend/README.md
 *   POST /ai/analyze-image  POST /ai/classify  POST /ai/priority
 *   POST /ai/duplicate      POST /ai/summary   GET  /health
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-6-astra";

export type AiSource = "python-backend" | "lovable-ai" | "unavailable";

function backendUrl() {
  return process.env["AI_BACKEND_URL"] ?? process.env["VITE_AI_BACKEND_URL"] ?? "";
}

async function callBackend<T>(path: string, body: unknown): Promise<T | null> {
  const base = backendUrl();
  if (!base) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`AI backend ${path} failed [${res.status}]: ${await res.text()}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`AI backend ${path} unreachable`, error);
    return null;
  }
}

type GatewayMessage = {
  role: "system" | "user";
  content: string | Array<Record<string, unknown>>;
};

async function callLovableAi(messages: GatewayMessage[]): Promise<Record<string, unknown> | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    console.error("LOVABLE_API_KEY is not configured");
    return null;
  }
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: "low",
      max_completion_tokens: 1200,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Lovable AI failed [${res.status}]: ${text}`);
    throw new Response(text || "AI request failed", { status: res.status });
  }
  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    console.error("AI returned non-JSON content");
    return null;
  }
}

const CATEGORY_LIST = "ROAD, GARBAGE, WATER, STREETLIGHT, DRAINAGE, TRAFFIC, PARKS, OTHER";
const DEPARTMENTS =
  "Public Works (ROAD), Sanitation (GARBAGE), Water Supply (WATER), Electricity (STREETLIGHT), Drainage (DRAINAGE), Traffic (TRAFFIC), Parks (PARKS), Municipal Administration (OTHER)";

/* ------------------------------ classify ------------------------------ */

const ClassifyInput = z.object({
  description: z.string().min(3),
  title: z.string().optional().default(""),
  language: z.string().optional().default("en"),
  imageUrl: z.string().optional(),
});

export type ClassifyResult = {
  source: AiSource;
  category: string;
  subcategory: string | null;
  department: string | null;
  confidence: number | null;
  entities: string[];
  summary: string | null;
  priority: string | null;
  priority_score: number | null;
  priority_reason: string | null;
  severity: number | null;
  detected_objects: string[];
  issue_type: string | null;
  note?: string;
};

export const classifyComplaint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ClassifyInput.parse(raw))
  .handler(async ({ data }): Promise<ClassifyResult> => {
    const remote = await callBackend<Partial<ClassifyResult>>("/ai/classify", data);
    if (remote) return { ...emptyClassify("python-backend"), ...remote, source: "python-backend" };

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Citizen complaint (language: ${data.language}).
Title: ${data.title}
Description: ${data.description}

Classify it for an Indian municipal grievance system.
Allowed categories: ${CATEGORY_LIST}.
Departments: ${DEPARTMENTS}.
If an image is attached, also list the civic problems visible in it.

Reply as strict JSON:
{"category":"","subcategory":"","department":"","confidence":0.0,"entities":[],"summary":"",
 "priority":"LOW|MEDIUM|HIGH|CRITICAL","priority_score":0,"priority_reason":"","severity":0,
 "detected_objects":[],"issue_type":""}
confidence is 0-1, priority_score and severity are 0-100.`,
      },
    ];
    if (data.imageUrl) {
      userContent.push({ type: "image_url", image_url: { url: data.imageUrl } });
    }

    const json = await callLovableAi([
      {
        role: "system",
        content:
          "You are CivicMind AI, a municipal complaint triage engine. You reply with strict JSON only, no prose. You understand English, Hindi and other Indian languages.",
      },
      { role: "user", content: userContent },
    ]);

    if (!json) return { ...emptyClassify("unavailable"), note: "AI service not connected" };

    return {
      source: "lovable-ai",
      category: str(json["category"]) ?? "OTHER",
      subcategory: str(json["subcategory"]),
      department: str(json["department"]),
      confidence: num(json["confidence"]),
      entities: arr(json["entities"]),
      summary: str(json["summary"]),
      priority: str(json["priority"]),
      priority_score: num(json["priority_score"]),
      priority_reason: str(json["priority_reason"]),
      severity: num(json["severity"]),
      detected_objects: arr(json["detected_objects"]),
      issue_type: str(json["issue_type"]),
    };
  });

function emptyClassify(source: AiSource): ClassifyResult {
  return {
    source,
    category: "OTHER",
    subcategory: null,
    department: null,
    confidence: null,
    entities: [],
    summary: null,
    priority: null,
    priority_score: null,
    priority_reason: null,
    severity: null,
    detected_objects: [],
    issue_type: null,
  };
}

/* ------------------------------ image ------------------------------ */

const ImageInput = z.object({ complaintId: z.string().optional(), imageUrl: z.string().min(5) });

export const analyzeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ImageInput.parse(raw))
  .handler(async ({ data }) => {
    const remote = await callBackend<Record<string, unknown>>("/ai/analyze-image", {
      complaint_id: data.complaintId,
      image_url: data.imageUrl,
    });
    if (remote) return { source: "python-backend" as AiSource, ...remote };

    const json = await callLovableAi([
      {
        role: "system",
        content:
          "You inspect photos of public infrastructure problems and reply with strict JSON only.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Describe the civic issue in this photo. Reply as JSON:
{"detected_objects":[],"issue_type":"","severity":0,"confidence":0.0,"explanation":""}
severity 0-100, confidence 0-1. Possible issue types: pothole, garbage, broken streetlight, water leakage, drainage blockage, damaged road, illegal dumping, traffic issue, public infrastructure damage, unclear.`,
          },
          { type: "image_url", image_url: { url: data.imageUrl } },
        ],
      },
    ]);
    if (!json) return { source: "unavailable" as AiSource, note: "AI service not connected" };
    return { source: "lovable-ai" as AiSource, ...json };
  });

/* ------------------------------ duplicate ------------------------------ */

const DuplicateInput = z.object({
  description: z.string(),
  category: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  candidates: z
    .array(
      z.object({
        id: z.string(),
        complaint_number: z.string(),
        description: z.string(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
        created_at: z.string(),
      }),
    )
    .default([]),
});

export const detectDuplicate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DuplicateInput.parse(raw))
  .handler(async ({ data }) => {
    const remote = await callBackend<Record<string, unknown>>("/ai/duplicate", data);
    if (remote) return { source: "python-backend" as AiSource, ...remote };

    if (data.candidates.length === 0) {
      return {
        source: "lovable-ai" as AiSource,
        is_duplicate: false,
        matched_complaint_id: null,
        similarity_score: 0,
        detection_method: "no-nearby-open-complaints",
      };
    }

    const json = await callLovableAi([
      {
        role: "system",
        content: "You detect duplicate civic complaints. Reply with strict JSON only.",
      },
      {
        role: "user",
        content: `New complaint (${data.category}) at ${data.latitude ?? "?"},${data.longitude ?? "?"}:
${data.description}

Existing nearby open complaints of the same category:
${data.candidates
  .map(
    (c) =>
      `- id=${c.id} number=${c.complaint_number} created=${c.created_at} coords=${c.latitude},${c.longitude} :: ${c.description.slice(0, 400)}`,
  )
  .join("\n")}

Decide whether the new complaint reports the same real-world issue.
JSON: {"is_duplicate":false,"matched_complaint_id":null,"similarity_score":0.0,"detection_method":"text+geo heuristic reasoning"}`,
      },
    ]);
    if (!json) return { source: "unavailable" as AiSource, note: "AI service not connected" };
    return { source: "lovable-ai" as AiSource, ...json };
  });

/* ------------------------------ chatbot ------------------------------ */

const ChatInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).min(1),
  context: z.string().optional().default(""),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ChatInput.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { reply: "The assistant is not configured yet.", source: "unavailable" };

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        reasoning_effort: "low",
        max_completion_tokens: 900,
        messages: [
          {
            role: "system",
            content: `You are CivicMind Assistant, a helpful civic services guide inside a municipal grievance platform.
Help citizens report issues, understand statuses (SUBMITTED, AI_ANALYZED, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED), and know which department handles what: ${DEPARTMENTS}.
Answer briefly, in the language the user writes in. Never invent a complaint status you were not given.
${data.context ? `Context about this user's complaints:\n${data.context}` : ""}`,
          },
          ...data.messages,
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Assistant failed [${res.status}]: ${text}`);
      throw new Response(text || "Assistant request failed", { status: res.status });
    }
    const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return {
      reply: payload.choices?.[0]?.message?.content ?? "I could not generate an answer.",
      source: "lovable-ai" as AiSource,
    };
  });

/* ------------------------------ health ------------------------------ */

export const aiHealth = createServerFn({ method: "GET" }).handler(async () => {
  const base = backendUrl();
  if (!base) return { pythonBackend: "not-configured" as const, lovableAi: Boolean(process.env["LOVABLE_API_KEY"]) };
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/health`);
    return {
      pythonBackend: res.ok ? ("healthy" as const) : ("unhealthy" as const),
      lovableAi: Boolean(process.env["LOVABLE_API_KEY"]),
    };
  } catch {
    return { pythonBackend: "unreachable" as const, lovableAi: Boolean(process.env["LOVABLE_API_KEY"]) };
  }
});

/* ------------------------------ helpers ------------------------------ */

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
