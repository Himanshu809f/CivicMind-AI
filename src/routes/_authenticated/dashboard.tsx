import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileQuestion,
  Loader2,
  MapPin,
  PlusCircle,
  Star,
  Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/civic/StatCard";
import { EmptyState } from "@/components/civic/EmptyState";
import { StatusBadge, PriorityBadge } from "@/components/civic/badges";
import { ComplaintMap } from "@/components/civic/ComplaintMap";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryMeta, slaState, type Complaint } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "CivicMind AI | Dashboard" },
      { name: "description", content: "Track your reported civic issues, statuses and resolution progress." },
      { property: "og:title", content: "Dashboard — CivicMind AI" },
      { property: "og:description", content: "Track your reported civic issues, statuses and resolution progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile, primaryRole } = useAuth();

  const complaintsQuery = useQuery({
    queryKey: ["my-complaints", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Complaint[];
    },
  });

  const activityQuery = useQuery({
    queryKey: ["my-activity", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaint_timeline")
        .select("id, message, status, created_at, complaint_id")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const feedbackQuery = useQuery({
    queryKey: ["pending-feedback", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: resolved } = await supabase
        .from("complaints")
        .select("id, complaint_number, title")
        .eq("citizen_id", user!.id)
        .in("status", ["RESOLVED", "CLOSED"]);
      if (!resolved || resolved.length === 0) return [];
      const { data: given } = await supabase
        .from("feedback")
        .select("complaint_id")
        .in("complaint_id", resolved.map((r) => r.id));
      const rated = new Set((given ?? []).map((g) => g.complaint_id));
      return resolved.filter((r) => !rated.has(r.id));
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-complaints")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => {
        void complaintsQuery.refetch();
        void activityQuery.refetch();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const list = complaintsQuery.data ?? [];
  const count = (predicate: (c: Complaint) => boolean) => list.filter(predicate).length;
  const loading = complaintsQuery.isLoading;

  const markers = list
    .filter((c) => c.latitude != null && c.longitude != null)
    .slice(0, 40)
    .map((c) => ({
      id: c.id,
      lat: Number(c.latitude),
      lng: Number(c.longitude),
      title: c.title,
      subtitle: `${c.complaint_number} · ${c.status}`,
      tone:
        c.priority === "CRITICAL"
          ? ("critical" as const)
          : c.priority === "HIGH"
            ? ("warning" as const)
            : c.status === "RESOLVED" || c.status === "CLOSED"
              ? ("success" as const)
              : ("primary" as const),
      href: `/complaints/${c.id}`,
    }));

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {primaryRole === "CITIZEN"
              ? "Here is what is happening with the issues you reported."
              : "Overview of the complaints visible to your role."}
          </p>
        </div>
        <Button asChild>
          <Link to="/complaints/new">
            <PlusCircle className="size-4" /> Report new issue
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open"
          value={count((c) => ["SUBMITTED", "AI_ANALYZED", "ASSIGNED"].includes(c.status))}
          icon={ClipboardList}
          loading={loading}
        />
        <StatCard
          label="In progress"
          value={count((c) => c.status === "IN_PROGRESS")}
          icon={Loader2}
          accent="signal"
          loading={loading}
        />
        <StatCard
          label="Resolved"
          value={count((c) => c.status === "RESOLVED")}
          icon={CheckCircle2}
          accent="success"
          loading={loading}
        />
        <StatCard
          label="Closed"
          value={count((c) => c.status === "CLOSED")}
          icon={Clock}
          accent="ai"
          loading={loading}
        />
      </div>

      {(feedbackQuery.data?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-success/40 bg-success/8 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              <Star className="mt-0.5 size-5 text-success" />
              <div>
                <p className="text-sm font-semibold">Was your issue resolved?</p>
                <p className="text-sm text-muted-foreground">
                  {feedbackQuery.data?.length} resolved complaint(s) are waiting for your rating.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/complaints/$id" params={{ id: feedbackQuery.data![0]!.id }}>
                Give feedback
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent complaints</h2>
            <Link to="/complaints" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title="No complaints yet"
              description="Report your first civic issue and CivicMind AI will route it to the right department."
              action={
                <Button asChild>
                  <Link to="/complaints/new">Report an issue</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {list.slice(0, 6).map((c) => {
                const sla = slaState(c);
                return (
                  <li key={c.id}>
                    <Link
                      to="/complaints/$id"
                      params={{ id: c.id }}
                      className="card-lift block rounded-2xl border bg-card p-4 shadow-soft"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.complaint_number}
                        </span>
                        <StatusBadge status={c.status} />
                        <PriorityBadge priority={c.priority} />
                        <span className={`ml-auto flex items-center gap-1 text-xs ${sla.tone}`}>
                          <Timer className="size-3.5" /> {sla.label}
                        </span>
                      </div>
                      <p className="mt-2 font-semibold">{c.title}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {c.address ?? c.ward ?? c.city ?? "Location captured"} ·{" "}
                        {categoryMeta(c.category).label}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="font-display mb-3 text-lg font-semibold">Issue map</h2>
            <ComplaintMap
              markers={markers}
              className="h-64"
              {...(markers[0] ? { center: [markers[0].lat, markers[0].lng] as [number, number] } : {})}
            />
          </div>
          <div>
            <h2 className="font-display mb-3 text-lg font-semibold">Recent activity</h2>
            <div className="rounded-2xl border bg-card p-4 shadow-soft">
              {activityQuery.isLoading ? (
                <Skeleton className="h-28" />
              ) : (activityQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activityQuery.data!.map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <Activity className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm">{a.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
