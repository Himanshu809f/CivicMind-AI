import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type ComplaintStatus = Database["public"]["Enums"]["complaint_status"];
export type ComplaintPriority = Database["public"]["Enums"]["complaint_priority"];
export type Complaint = Database["public"]["Tables"]["complaints"]["Row"];
export type Department = Database["public"]["Tables"]["departments"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type TimelineRow = Database["public"]["Tables"]["complaint_timeline"]["Row"];

export const CATEGORIES: {
  value: string;
  label: string;
  department: string;
  slaHours: number;
  subcategories: string[];
}[] = [
  {
    value: "ROAD",
    label: "Road & Infrastructure",
    department: "Public Works",
    slaHours: 48,
    subcategories: ["Pothole", "Damaged road", "Broken footpath", "Open manhole"],
  },
  {
    value: "GARBAGE",
    label: "Garbage & Sanitation",
    department: "Sanitation",
    slaHours: 24,
    subcategories: ["Uncollected garbage", "Illegal dumping", "Overflowing bin", "Dead animal"],
  },
  {
    value: "WATER",
    label: "Water Supply",
    department: "Water Supply",
    slaHours: 24,
    subcategories: ["Water leakage", "No water supply", "Contaminated water", "Burst pipeline"],
  },
  {
    value: "STREETLIGHT",
    label: "Streetlight & Electrical",
    department: "Electricity",
    slaHours: 72,
    subcategories: ["Streetlight not working", "Exposed wiring", "Damaged pole", "Power outage"],
  },
  {
    value: "DRAINAGE",
    label: "Drainage & Flooding",
    department: "Drainage",
    slaHours: 24,
    subcategories: ["Blocked drain", "Waterlogging", "Sewage overflow", "Broken drain cover"],
  },
  {
    value: "TRAFFIC",
    label: "Traffic & Safety",
    department: "Traffic",
    slaHours: 12,
    subcategories: ["Signal not working", "Missing signage", "Illegal parking", "Road hazard"],
  },
  {
    value: "PARKS",
    label: "Parks & Trees",
    department: "Parks",
    slaHours: 96,
    subcategories: ["Fallen tree", "Damaged park equipment", "Unkempt green space"],
  },
  {
    value: "OTHER",
    label: "Other civic issue",
    department: "Municipal Administration",
    slaHours: 72,
    subcategories: ["General", "Noise", "Encroachment", "Stray animals"],
  },
];

const FALLBACK_CATEGORY = {
  value: "OTHER",
  label: "Other civic issue",
  department: "Municipal Administration",
  slaHours: 72,
  subcategories: ["General"],
};

export function categoryMeta(value: string | null | undefined) {
  return CATEGORIES.find((c) => c.value === value) ?? FALLBACK_CATEGORY;
}

export const STATUS_META: Record<ComplaintStatus, { label: string; tone: string; step: number }> = {
  SUBMITTED: { label: "Submitted", tone: "bg-muted text-muted-foreground", step: 1 },
  AI_ANALYZED: { label: "AI analysed", tone: "bg-ai/15 text-ai", step: 2 },
  ASSIGNED: { label: "Assigned", tone: "bg-primary/15 text-primary", step: 3 },
  IN_PROGRESS: { label: "In progress", tone: "bg-signal/20 text-signal-foreground", step: 4 },
  RESOLVED: { label: "Resolved", tone: "bg-success/15 text-success", step: 5 },
  CLOSED: { label: "Closed", tone: "bg-secondary text-secondary-foreground", step: 6 },
  REJECTED: { label: "Rejected", tone: "bg-destructive/15 text-destructive", step: 6 },
  DUPLICATE: { label: "Duplicate", tone: "bg-warning/20 text-warning-foreground", step: 6 },
};

export const PRIORITY_META: Record<ComplaintPriority, { label: string; tone: string }> = {
  LOW: { label: "Low", tone: "bg-muted text-muted-foreground" },
  MEDIUM: { label: "Medium", tone: "bg-signal/20 text-signal-foreground" },
  HIGH: { label: "High", tone: "bg-warning/25 text-warning-foreground" },
  CRITICAL: { label: "Critical", tone: "bg-critical/15 text-critical" },
};

export const STATUS_FLOW: ComplaintStatus[] = [
  "SUBMITTED",
  "AI_ANALYZED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export const ROLE_LABEL: Record<AppRole, string> = {
  CITIZEN: "Citizen",
  OFFICER: "Officer",
  DEPARTMENT_ADMIN: "Department Admin",
  SUPER_ADMIN: "Super Admin",
};

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "mr", label: "मराठी (Marathi)" },
  { value: "ta", label: "தமிழ் (Tamil)" },
];

export function slaState(complaint: Pick<Complaint, "sla_deadline" | "status">) {
  if (!complaint.sla_deadline) return { label: "No SLA", tone: "text-muted-foreground" };
  if (complaint.status === "RESOLVED" || complaint.status === "CLOSED")
    return { label: "Met", tone: "text-success" };
  const ms = new Date(complaint.sla_deadline).getTime() - Date.now();
  const hours = Math.round(ms / 3_600_000);
  if (ms < 0) return { label: `Overdue by ${Math.abs(hours)}h`, tone: "text-destructive" };
  if (hours <= 12) return { label: `${hours}h left`, tone: "text-warning-foreground" };
  return { label: `${hours}h left`, tone: "text-muted-foreground" };
}

export function isOverdue(c: Pick<Complaint, "sla_deadline" | "status">) {
  if (!c.sla_deadline) return false;
  if (c.status === "RESOLVED" || c.status === "CLOSED") return false;
  return new Date(c.sla_deadline).getTime() < Date.now();
}
