import { supabase } from "@/integrations/supabase/client";
import { categoryMeta, type ComplaintPriority, type ComplaintStatus } from "@/lib/civic";
import type { ClassifyResult } from "@/lib/ai.functions";

export async function fetchDepartments() {
  const { data, error } = await supabase.from("departments").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function logAudit(action: string, entityType: string, entityId: string, newValue?: unknown) {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    user_id: auth.user?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    new_value: (newValue ?? null) as never,
  });
}

export async function notify(
  userId: string,
  complaintId: string | null,
  title: string,
  message: string,
  type = "INFO",
  eventId?: string,
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    complaint_id: complaintId,
    title,
    message,
    type,
    event_id: eventId ?? null,
  } as never);
  // A repeated event (same unique event id) is intentionally ignored, not an error.
  if (error && error.code !== "23505") throw error;
}

export async function addTimeline(
  complaintId: string,
  status: ComplaintStatus | null,
  message: string,
  metadata?: unknown,
) {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("complaint_timeline").insert({
    complaint_id: complaintId,
    status,
    message,
    changed_by: auth.user?.id ?? null,
    metadata: (metadata ?? null) as never,
  });
}

/** Deterministic routing: routing_rules table first, then the category map. */
export async function resolveDepartment(category: string) {
  const { data: rules } = await supabase
    .from("routing_rules")
    .select("department_id, sla_hours, priority_boost, category")
    .eq("category", category)
    .limit(1);
  if (rules && rules.length > 0 && rules[0]) {
    return { departmentId: rules[0].department_id, slaHours: rules[0].sla_hours };
  }
  const meta = categoryMeta(category);
  const { data: dept } = await supabase
    .from("departments")
    .select("id")
    .eq("name", meta.department)
    .maybeSingle();
  return { departmentId: dept?.id ?? null, slaHours: meta.slaHours };
}

export type NewComplaintInput = {
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  language: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  ward: string | null;
  landmark: string | null;
  files: { path: string; name: string; size: number; type: string }[];
  ai: ClassifyResult | null;
  duplicateOf: string | null;
  duplicateScore: number | null;
};

function toPriority(value: string | null | undefined): ComplaintPriority {
  const upper = (value ?? "").toUpperCase();
  return upper === "LOW" || upper === "MEDIUM" || upper === "HIGH" || upper === "CRITICAL"
    ? (upper as ComplaintPriority)
    : "MEDIUM";
}

export async function createComplaint(input: NewComplaintInput) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("You need to be signed in to submit a complaint.");

  const routing = await resolveDepartment(input.category);
  const aiUsable = input.ai && input.ai.source !== "unavailable";

  const { data: complaint, error } = await supabase
    .from("complaints")
    .insert({
      complaint_number: "",
      citizen_id: userId,
      title: input.title,
      description: input.description,
      category: input.category,
      subcategory: input.subcategory,
      language: input.language,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      city: input.city,
      ward: input.ward,
      landmark: input.landmark,
      status: aiUsable ? "AI_ANALYZED" : "SUBMITTED",
      priority: aiUsable ? toPriority(input.ai?.priority) : "MEDIUM",
      severity_score: input.ai?.severity ?? null,
      confidence_score: input.ai?.confidence ?? null,
      ai_classification: (input.ai ?? null) as never,
      ai_priority_score: input.ai?.priority_score ?? null,
      ai_priority_reason: input.ai?.priority_reason ?? null,
      ai_summary: input.ai?.summary ?? null,
      assigned_department_id: routing.departmentId,
      sla_hours: routing.slaHours,
      duplicate_of: input.duplicateOf,
    })
    .select("*")
    .single();
  if (error) throw error;

  if (input.files.length > 0) {
    const { error: mediaError } = await supabase.from("complaint_media").insert(
      input.files.map((f) => ({
        complaint_id: complaint.id,
        file_url: f.path,
        file_name: f.name,
        file_size: f.size,
        file_type: f.type,
      })),
    );
    if (mediaError) console.error(mediaError);
  }

  await addTimeline(complaint.id, "SUBMITTED", "Complaint submitted by citizen.");
  if (aiUsable) {
    await addTimeline(complaint.id, "AI_ANALYZED", "AI analysis completed.", input.ai);
    await supabase.from("ai_predictions").insert({
      complaint_id: complaint.id,
      model_name: input.ai?.source === "python-backend" ? "python-ai-backend" : "lovable-ai",
      prediction_type: "classification+priority",
      prediction: (input.ai ?? null) as never,
      confidence: input.ai?.confidence ?? null,
    });
  }
  if (input.duplicateOf) {
    await supabase.from("complaint_duplicates").insert({
      complaint_id: complaint.id,
      matched_complaint_id: input.duplicateOf,
      similarity_score: input.duplicateScore,
      detection_method: input.ai?.source ?? "unknown",
    });
  }
  if (routing.departmentId) {
    await supabase.from("complaint_assignments").insert({
      complaint_id: complaint.id,
      department_id: routing.departmentId,
      assigned_by: userId,
      reason: "Automatic routing rule",
    });
  }

  await notify(
    userId,
    complaint.id,
    `Complaint ${complaint.complaint_number} received`,
    "We have received your complaint and routed it to the responsible department.",
    "SUCCESS",
  );
  await logAudit("complaint.created", "complaint", complaint.id, { category: input.category });

  return complaint;
}

export async function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
  note: string,
  citizenId: string,
  complaintNumber: string,
) {
  const patch: Record<string, unknown> = { status };
  if (status === "RESOLVED") patch["resolved_at"] = new Date().toISOString();
  if (status === "CLOSED") patch["closed_at"] = new Date().toISOString();

  const { error } = await supabase.from("complaints").update(patch as never).eq("id", complaintId);
  if (error) throw error;

  await addTimeline(complaintId, status, note || `Status changed to ${status}.`);
  await notify(
    citizenId,
    complaintId,
    `Complaint ${complaintNumber} is now ${status.replace("_", " ").toLowerCase()}`,
    note || "An officer updated your complaint.",
    status === "RESOLVED" ? "SUCCESS" : "INFO",
  );
  await logAudit("complaint.status_changed", "complaint", complaintId, { status, note });
}

export async function assignComplaint(
  complaintId: string,
  officerId: string | null,
  departmentId: string | null,
  reason: string,
) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("complaints")
    .update({
      assigned_officer_id: officerId,
      assigned_department_id: departmentId,
      status: "ASSIGNED",
    } as never)
    .eq("id", complaintId);
  if (error) throw error;

  await supabase.from("complaint_assignments").insert({
    complaint_id: complaintId,
    officer_id: officerId,
    department_id: departmentId,
    assigned_by: auth.user?.id ?? null,
    reason,
  });
  await addTimeline(complaintId, "ASSIGNED", reason || "Complaint assigned.");
  await logAudit("complaint.assigned", "complaint", complaintId, { officerId, departmentId });
}

export async function signedMediaUrl(path: string) {
  const { data } = await supabase.storage.from("complaint-media").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Department admins of a given department (used to notify supervisors). */
async function departmentAdminIds(departmentId: string | null): Promise<string[]> {
  if (!departmentId) return [];
  const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "DEPARTMENT_ADMIN");
  const ids = (roles ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: staff } = await supabase
    .from("profiles")
    .select("user_id")
    .in("user_id", ids)
    .eq("department_id", departmentId);
  return (staff ?? []).map((s) => s.user_id);
}

const MAX_PROOF_BYTES = 10 * 1024 * 1024; // matches the complaint-media bucket limit

type ProofUpload = { path: string; name: string; size: number; type: string; kind: "BEFORE" | "AFTER" };

async function uploadProof(complaintId: string, file: File, kind: "BEFORE" | "AFTER"): Promise<ProofUpload> {
  if (file.size > MAX_PROOF_BYTES) throw new Error(`${file.name} is larger than the 10 MB upload limit.`);
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${complaintId}/${kind.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("complaint-media").upload(path, file, { upsert: false });
  if (error) throw error;
  return { path, name: file.name, size: file.size, type: file.type, kind };
}

export type ResolveComplaintInput = {
  complaint: Complaint;
  remarks: string;
  beforeFiles: File[];
  afterFiles: File[];
};

/**
 * Mark a complaint resolved. Requires resolution remarks; optionally stores
 * before/after proof photos; notifies the citizen exactly once per resolution.
 */
export async function resolveComplaint({ complaint, remarks, beforeFiles, afterFiles }: ResolveComplaintInput) {
  if (!remarks.trim()) throw new Error("Resolution remarks are required before a complaint can be marked resolved.");
  const { data: auth } = await supabase.auth.getUser();
  const officerId = auth.user?.id ?? null;
  if (!officerId) throw new Error("Sign in required to resolve a complaint.");

  const uploaded: ProofUpload[] = [];
  for (const f of beforeFiles) uploaded.push(await uploadProof(complaint.id, f, "BEFORE"));
  for (const f of afterFiles) uploaded.push(await uploadProof(complaint.id, f, "AFTER"));

  const resolvedAt = new Date().toISOString();
  const { error } = await supabase
    .from("complaints")
    .update({
      status: "RESOLVED",
      resolved_at: resolvedAt,
      resolved_by: officerId,
      resolution_remarks: remarks.trim(),
    } as never)
    .eq("id", complaint.id);
  if (error) throw error;

  if (uploaded.length > 0) {
    const { error: mediaError } = await supabase.from("complaint_media").insert(
      uploaded.map((u) => ({
        complaint_id: complaint.id,
        file_url: u.path,
        file_name: u.name,
        file_size: u.size,
        file_type: u.type,
        media_kind: u.kind,
      })),
    );
    if (mediaError) console.error(mediaError);
  }

  await addTimeline(complaint.id, "RESOLVED", `Marked resolved by the department. ${remarks.trim()}`);
  await notify(
    complaint.citizen_id,
    complaint.id,
    "Your complaint has been successfully resolved!",
    `Complaint ${complaint.complaint_number} (${complaint.title}) was resolved by the concerned department on ${new Date(resolvedAt).toLocaleString()}. Officer remarks: ${remarks.trim()}. Please review the resolution details.`,
    "SUCCESS",
    `resolved:${complaint.id}:${complaint.reopen_count ?? 0}`,
  );
  await logAudit("complaint.resolved", "complaint", complaint.id, {
    remarks: remarks.trim(),
    proofPhotos: uploaded.length,
  });
  return { resolvedAt, proofCount: uploaded.length };
}

/** Citizen reopens their own complaint when the reported issue persists. */
export async function reopenComplaint(complaint: Complaint, reason: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== complaint.citizen_id) {
    throw new Error("Only the citizen who reported this issue can reopen it.");
  }
  const attempt = (complaint.reopen_count ?? 0) + 1;
  const { error } = await supabase
    .from("complaints")
    .update({
      status: "REOPENED",
      reopened_at: new Date().toISOString(),
      reopen_reason: reason.trim() || null,
      reopen_count: attempt,
      resolved_at: null,
    } as never)
    .eq("id", complaint.id);
  if (error) throw error;

  await addTimeline(
    complaint.id,
    "REOPENED",
    reason.trim()
      ? `Citizen reopened the complaint: ${reason.trim()}`
      : "Citizen reopened the complaint — the issue was not fully resolved.",
  );
  await notify(
    complaint.citizen_id,
    complaint.id,
    `Complaint ${complaint.complaint_number} reopened`,
    "Your complaint has been reopened and sent back to the department for another look.",
    "INFO",
    `reopened:${complaint.id}:${attempt}`,
  );
  const targets = new Set<string>();
  if (complaint.assigned_officer_id) targets.add(complaint.assigned_officer_id);
  for (const id of await departmentAdminIds(complaint.assigned_department_id)) targets.add(id);
  for (const t of targets) {
    await notify(
      t,
      complaint.id,
      `Complaint ${complaint.complaint_number} reopened by the citizen`,
      `The citizen reports this issue is still not resolved${reason.trim() ? `: ${reason.trim()}` : "."} Please take action again.`,
      "WARNING",
      `reopened-staff:${complaint.id}:${t}:${attempt}`,
    );
  }
  await logAudit("complaint.reopened", "complaint", complaint.id, { reason: reason.trim() });
}

/** Escalate an overdue complaint to higher authorities and record the history. */
export async function escalateComplaint(complaint: Complaint, reason: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in required to escalate a complaint.");
  const level = (complaint.escalation_level ?? 0) + 1;
  const { error } = await supabase.from("complaint_escalations").insert({
    complaint_id: complaint.id,
    level,
    reason: reason.trim() || null,
    escalated_by: auth.user.id,
    from_department_id: complaint.assigned_department_id,
  });
  if (error) throw error;
  const { error: upErr } = await supabase
    .from("complaints")
    .update({ escalated: true, escalation_level: level } as never)
    .eq("id", complaint.id);
  if (upErr) throw upErr;

  await addTimeline(complaint.id, null, `Escalated to level ${level} authorities.`, { level, reason: reason.trim() });
  const targets = new Set<string>();
  for (const id of await departmentAdminIds(complaint.assigned_department_id)) targets.add(id);
  const { data: supers } = await supabase.from("user_roles").select("user_id").eq("role", "SUPER_ADMIN");
  for (const s of supers ?? []) targets.add(s.user_id);
  for (const t of targets) {
    await notify(
      t,
      complaint.id,
      `Complaint ${complaint.complaint_number} escalated (level ${level})`,
      `${complaint.title} has crossed its resolution deadline and was escalated${reason.trim() ? `: ${reason.trim()}` : "."}`,
      "WARNING",
      `escalated:${complaint.id}:${level}:${t}`,
    );
  }
  await logAudit("complaint.escalated", "complaint", complaint.id, { level, reason: reason.trim() });
  return level;
}

/** Downloadable complaint receipt for citizens. */
export function downloadReceipt(complaint: Complaint, departmentName: string | null) {
  const lines = [
    "CIVICMIND AI — COMPLAINT RECEIPT",
    "================================",
    "",
    `Complaint ID:      ${complaint.complaint_number}`,
    `Title:             ${complaint.title}`,
    `Category:          ${categoryMeta(complaint.category).label}${complaint.subcategory ? ` / ${complaint.subcategory}` : ""}`,
    `Status:            ${complaint.status.replace("_", " ")}`,
    `Priority:          ${complaint.priority}`,
    `Department:        ${departmentName ?? categoryMeta(complaint.category).department}`,
    `Location:          ${[complaint.address, complaint.ward, complaint.city].filter(Boolean).join(", ") || "Captured on map"}`,
    "",
    `Submitted:         ${new Date(complaint.created_at).toLocaleString()}`,
    complaint.resolved_at ? `Resolved:          ${new Date(complaint.resolved_at).toLocaleString()}` : "",
    complaint.reopened_at ? `Reopened:          ${new Date(complaint.reopened_at).toLocaleString()}` : "",
    `SLA deadline:      ${complaint.sla_deadline ? new Date(complaint.sla_deadline).toLocaleString() : "—"}`,
    "",
    complaint.resolution_remarks ? `Resolution remarks: ${complaint.resolution_remarks}` : "",
    "",
    "Track this complaint any time in the CivicMind AI app.",
    `Issued: ${new Date().toLocaleString()}`,
  ].filter(Boolean);
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${complaint.complaint_number}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
