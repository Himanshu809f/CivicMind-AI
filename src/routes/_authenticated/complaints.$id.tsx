import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Copy,
  Loader2,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  Timer,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PriorityBadge, StatusBadge } from "@/components/civic/badges";
import { ComplaintMap } from "@/components/civic/ComplaintMap";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  STATUS_FLOW,
  STATUS_META,
  categoryMeta,
  slaState,
  type Complaint,
  type ComplaintStatus,
} from "@/lib/civic";
import { addTimeline, updateComplaintStatus } from "@/services/complaintService";

export const Route = createFileRoute("/_authenticated/complaints/$id")({
  head: () => ({
    meta: [
      { title: "Complaint details — CivicMind AI" },
      { name: "description", content: "Full complaint record: media, AI analysis, timeline and live status updates." },
      { property: "og:title", content: "Complaint details — CivicMind AI" },
      { property: "og:description", content: "Full complaint record: media, AI analysis, timeline and live status updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintDetail,
});

function ComplaintDetail() {
  const { id } = Route.useParams();
  const { user, primaryRole } = useAuth();
  const isStaff = primaryRole !== "CITIZEN";
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState<ComplaintStatus | "">("");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const complaintQuery = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("complaints").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Complaint | null;
    },
  });

  const mediaQuery = useQuery({
    queryKey: ["complaint-media", id],
    queryFn: async () => {
      const { data } = await supabase.from("complaint_media").select("*").eq("complaint_id", id);
      const withUrls = await Promise.all(
        (data ?? []).map(async (m) => {
          const { data: signed } = await supabase.storage
            .from("complaint-media")
            .createSignedUrl(m.file_url, 3600);
          return { ...m, url: signed?.signedUrl ?? null };
        }),
      );
      return withUrls;
    },
  });

  const timelineQuery = useQuery({
    queryKey: ["complaint-timeline", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("complaint_timeline")
        .select("*")
        .eq("complaint_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const deptQuery = useQuery({
    queryKey: ["departments-min"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name");
      return data ?? [];
    },
  });

  const feedbackQuery = useQuery({
    queryKey: ["feedback", id],
    queryFn: async () => {
      const { data } = await supabase.from("feedback").select("*").eq("complaint_id", id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`complaint-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints", filter: `id=eq.${id}` }, () => {
        void complaintQuery.refetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "complaint_timeline", filter: `complaint_id=eq.${id}` }, () => {
        void timelineQuery.refetch();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const complaint = complaintQuery.data;

  async function applyStatus() {
    if (!complaint || !nextStatus) return;
    setBusy(true);
    try {
      await updateComplaintStatus(complaint.id, nextStatus, note, complaint.citizen_id, complaint.complaint_number);
      toast.success("Status updated");
      setNote("");
      setNextStatus("");
      void complaintQuery.refetch();
      void timelineQuery.refetch();
    } catch (error) {
      console.error(error);
      toast.error("Could not update the status.");
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!complaint || !note.trim()) return;
    setBusy(true);
    try {
      await addTimeline(complaint.id, null, note.trim());
      toast.success("Note added");
      setNote("");
      void timelineQuery.refetch();
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback() {
    if (!complaint || !user || rating === 0) return;
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({
      complaint_id: complaint.id,
      citizen_id: user.id,
      rating,
      comment: comment || null,
      resolved_satisfactorily: rating >= 3,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not save your feedback.");
      return;
    }
    toast.success("Thanks for your feedback!");
    void feedbackQuery.refetch();
  }

  if (complaintQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <AlertTriangle className="mx-auto size-8 text-warning-foreground" />
        <h1 className="font-display mt-3 text-xl font-semibold">Complaint not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been removed, or you don't have permission to view it.
        </p>
        <Button asChild className="mt-5" variant="outline">
          <Link to="/complaints">Back to complaints</Link>
        </Button>
      </div>
    );
  }

  const sla = slaState(complaint);
  const ai = complaint.ai_classification as Record<string, unknown> | null;
  const aiSource = ai?.["source"] as string | undefined;
  const isOwner = complaint.citizen_id === user?.id;
  const canRate = isOwner && ["RESOLVED", "CLOSED"].includes(complaint.status) && !feedbackQuery.data;
  const dept = deptQuery.data?.find((d) => d.id === complaint.assigned_department_id);

  return (
    <div className="space-y-6">
      <Link to="/complaints" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All complaints
      </Link>

      <div className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{complaint.complaint_number}</span>
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
          <span className={`ml-auto flex items-center gap-1 text-xs ${sla.tone}`}>
            <Timer className="size-3.5" /> {sla.label}
          </span>
        </div>
        <h1 className="font-display mt-3 text-2xl font-bold sm:text-3xl">{complaint.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{complaint.description}</p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Meta icon={Building2} label="Department" value={dept?.name ?? categoryMeta(complaint.category).department} />
          <Meta icon={MapPin} label="Location" value={complaint.address ?? complaint.city ?? "Captured on map"} />
          <Meta icon={UserRound} label="Ward" value={complaint.ward ?? "—"} />
          <Meta icon={Timer} label="Category" value={categoryMeta(complaint.category).label} />
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* media */}
          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Photos</h2>
            {mediaQuery.isLoading ? (
              <Skeleton className="mt-3 h-40" />
            ) : (mediaQuery.data?.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No photos were attached.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {mediaQuery.data!.map((m) => (
                  <li key={m.id} className="overflow-hidden rounded-xl border">
                    {m.url ? (
                      <a href={m.url} target="_blank" rel="noreferrer">
                        <img src={m.url} alt={m.file_name ?? "Complaint photo"} loading="lazy" className="h-32 w-full object-cover" />
                      </a>
                    ) : (
                      <div className="grid h-32 place-items-center text-xs text-muted-foreground">Preview unavailable</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* AI card */}
          <section className="rounded-2xl border border-ai/30 bg-ai/6 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2 text-lg font-semibold text-ai">
                <Sparkles className="size-4.5" /> AI analysis
              </h2>
              {aiSource && (
                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  {aiSource === "python-backend" ? "Python AI backend" : aiSource === "lovable-ai" ? "Lovable AI" : "Not connected"}
                </span>
              )}
            </div>
            {!ai || aiSource === "unavailable" ? (
              <p className="mt-2 text-sm text-muted-foreground">
                AI service not connected for this complaint — it was routed using the citizen's chosen
                category.
              </p>
            ) : (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Meta label="Classification" value={String(ai["category"] ?? complaint.category)} />
                <Meta label="Suggested department" value={String(ai["department"] ?? "—")} />
                <Meta
                  label="Confidence"
                  value={complaint.confidence_score != null ? `${Math.round(Number(complaint.confidence_score) * 100)}%` : "Not reported"}
                />
                <Meta
                  label="Priority score"
                  value={complaint.ai_priority_score != null ? `${complaint.ai_priority_score}/100` : "Not reported"}
                />
              </dl>
            )}
            {complaint.ai_priority_reason && (
              <p className="mt-3 text-sm text-muted-foreground">
                <strong className="text-foreground">Why this priority: </strong>
                {complaint.ai_priority_reason}
              </p>
            )}
            {complaint.duplicate_of && (
              <p className="mt-3 flex items-start gap-2 text-sm text-warning-foreground">
                <Copy className="mt-0.5 size-4" /> Linked as a possible duplicate of an earlier complaint.
              </p>
            )}
          </section>

          {/* timeline */}
          <section className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Timeline</h2>
            {timelineQuery.isLoading ? (
              <Skeleton className="mt-3 h-32" />
            ) : (
              <ol className="mt-4 space-y-4 border-l pl-5">
                {(timelineQuery.data ?? []).map((t) => (
                  <li key={t.id} className="relative">
                    <span className="absolute -left-[26px] top-1.5 size-3 rounded-full bg-primary" />
                    <p className="text-sm font-medium">
                      {t.status ? STATUS_META[t.status as ComplaintStatus]?.label ?? t.status : "Note"}
                    </p>
                    <p className="text-sm text-muted-foreground">{t.message}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {complaint.latitude != null && complaint.longitude != null && (
            <ComplaintMap
              className="h-56"
              center={[Number(complaint.latitude), Number(complaint.longitude)]}
              zoom={16}
              markers={[
                {
                  id: complaint.id,
                  lat: Number(complaint.latitude),
                  lng: Number(complaint.longitude),
                  title: complaint.title,
                  subtitle: complaint.complaint_number,
                },
              ]}
            />
          )}

          {isStaff && (
            <section className="rounded-2xl border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">Officer actions</h2>
              <div className="mt-3 space-y-3">
                <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as ComplaintStatus)}>
                  <SelectTrigger><SelectValue placeholder="Change status" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_FLOW.concat(["REJECTED", "DUPLICATE"]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for the citizen…"
                />
                <div className="flex flex-wrap gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button disabled={!nextStatus || busy}>
                        {busy && <Loader2 className="size-4 animate-spin" />} Update status
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Update this complaint?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The citizen will be notified that the status changed to{" "}
                          {nextStatus ? STATUS_META[nextStatus].label : ""}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void applyStatus()}>Confirm</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="outline" onClick={() => void addNote()} disabled={!note.trim() || busy}>
                    <MessageSquare className="size-4" /> Add note only
                  </Button>
                </div>
              </div>
            </section>
          )}

          {canRate && (
            <section className="rounded-2xl border border-success/40 bg-success/8 p-5">
              <h2 className="font-display text-lg font-semibold">Was your issue resolved?</h2>
              <div className="mt-3 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`}>
                    <Star className={`size-7 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                rows={3}
                className="mt-3"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Anything you'd like the department to know?"
              />
              <Button className="mt-3 w-full" disabled={rating === 0 || busy} onClick={() => void submitFeedback()}>
                Submit feedback
              </Button>
            </section>
          )}

          {feedbackQuery.data && (
            <section className="rounded-2xl border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold">Citizen feedback</h2>
              <p className="mt-2 text-sm">Rating: {feedbackQuery.data.rating}/5</p>
              {feedbackQuery.data.comment && (
                <p className="mt-1 text-sm text-muted-foreground">{feedbackQuery.data.comment}</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="size-3.5" />} {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
