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
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    complaint_id: complaintId,
    title,
    message,
    type,
  });
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
