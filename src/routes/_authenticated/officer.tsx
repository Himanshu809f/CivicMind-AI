import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Clock, Inbox, Timer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/civic/StatCard";
import { EmptyState } from "@/components/civic/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/civic/badges";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  STATUS_FLOW,
  categoryMeta,
  isOverdue,
  slaState,
  type Complaint,
  type ComplaintStatus,
} from "@/lib/civic";
import { updateComplaintStatus } from "@/services/complaintService";

export const Route = createFileRoute("/_authenticated/officer")({
  head: () => ({
    meta: [
      { title: "CivicMind AI | Officer queue" },
      {
        name: "description",
        content:
          "Field officer work queue with SLA countdowns, priority triage and one-click status updates for assigned civic complaints.",
      },
      { property: "og:title", content: "Officer queue — CivicMind AI" },
      {
        property: "og:description",
        content: "Work through assigned civic complaints with live SLA tracking and status updates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OfficerQueue,
});

type Filter = "ALL" | "NEW" | "HIGH" | "CRITICAL" | "SLA" | "OVERDUE" | "RESOLVED";

function OfficerQueue() {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [active, setActive] = useState<Complaint | null>(null);
  const [nextStatus, setNextStatus] = useState<ComplaintStatus>("IN_PROGRESS");
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["officer-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      return data as Complaint[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("officer-queue-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["officer-queue"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const mine = useMemo(() => {
    const list = data ?? [];
    if (hasRole("DEPARTMENT_ADMIN", "SUPER_ADMIN")) return list;
    return list.filter((c) => c.assigned_officer_id === user?.id);
  }, [data, hasRole, user?.id]);

  const stats = useMemo(() => {
    const open = mine.filter((c) => c.status !== "RESOLVED" && c.status !== "CLOSED");
    return {
      assigned: mine.length,
      fresh: mine.filter((c) => c.status === "SUBMITTED" || c.status === "AI_ANALYZED" || c.status === "ASSIGNED").length,
      high: open.filter((c) => c.priority === "HIGH").length,
      critical: open.filter((c) => c.priority === "CRITICAL").length,
      approaching: open.filter((c) => {
        if (!c.sla_deadline || isOverdue(c)) return false;
        return new Date(c.sla_deadline).getTime() - Date.now() < 12 * 3_600_000;
      }).length,
      overdue: open.filter(isOverdue).length,
      resolved: mine.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length,
    };
  }, [mine]);

  const rows = useMemo(() => {
    const open = (c: Complaint) => c.status !== "RESOLVED" && c.status !== "CLOSED";
    switch (filter) {
      case "NEW":
        return mine.filter((c) => c.status === "SUBMITTED" || c.status === "AI_ANALYZED" || c.status === "ASSIGNED");
      case "HIGH":
        return mine.filter((c) => open(c) && c.priority === "HIGH");
      case "CRITICAL":
        return mine.filter((c) => open(c) && c.priority === "CRITICAL");
      case "SLA":
        return mine.filter(
          (c) =>
            open(c) &&
            c.sla_deadline !== null &&
            !isOverdue(c) &&
            new Date(c.sla_deadline).getTime() - Date.now() < 12 * 3_600_000,
        );
      case "OVERDUE":
        return mine.filter((c) => open(c) && isOverdue(c));
      case "RESOLVED":
        return mine.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED");
      default:
        return mine;
    }
  }, [mine, filter]);

  const update = useMutation({
    mutationFn: async () => {
      if (!active) return;
      await updateComplaintStatus(active.id, nextStatus, note, active.citizen_id, active.complaint_number);
    },
    onSuccess: () => {
      toast.success("Complaint updated", { description: "The citizen has been notified." });
      setActive(null);
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["officer-queue"] });
    },
    onError: (e: Error) => toast.error("Could not update complaint", { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Officer queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Work through the issues assigned to you. SLA clocks update live.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned to me" value={stats.assigned} icon={ClipboardList} loading={isLoading} />
        <StatCard label="Awaiting first action" value={stats.fresh} icon={Inbox} accent="signal" loading={isLoading} />
        <StatCard label="SLA approaching" value={stats.approaching} icon={Timer} accent="warning" loading={isLoading} />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} accent="critical" loading={isLoading} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="High priority" value={stats.high} icon={Clock} accent="warning" loading={isLoading} />
        <StatCard label="Critical" value={stats.critical} icon={AlertTriangle} accent="critical" loading={isLoading} />
        <StatCard label="Resolved / closed" value={stats.resolved} icon={CheckCircle2} accent="success" loading={isLoading} />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="NEW">New</TabsTrigger>
          <TabsTrigger value="HIGH">High</TabsTrigger>
          <TabsTrigger value="CRITICAL">Critical</TabsTrigger>
          <TabsTrigger value="SLA">SLA approaching</TabsTrigger>
          <TabsTrigger value="OVERDUE">Overdue</TabsTrigger>
          <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing in this queue"
          description="When complaints are routed to you they appear here with their SLA countdown."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Complaint ID</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const sla = slaState(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.complaint_number}</TableCell>
                    <TableCell className="max-w-56 truncate font-medium">{c.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{categoryMeta(c.category).label}</TableCell>
                    <TableCell><PriorityBadge priority={c.priority} /></TableCell>
                    <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                      {c.address ?? c.ward ?? c.city ?? "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className={`text-xs ${sla.tone}`}>{sla.label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/complaints/$id" params={{ id: c.id }}>View</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActive(c);
                            setNextStatus(c.status === "RESOLVED" ? "CLOSED" : "IN_PROGRESS");
                            setNote("");
                          }}
                        >
                          Update
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {active?.complaint_number}</DialogTitle>
            <DialogDescription>
              The citizen receives a notification with your note as soon as you save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as ComplaintStatus)}>
              <SelectTrigger><SelectValue placeholder="New status" /></SelectTrigger>
              <SelectContent>
                {STATUS_FLOW.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                ))}
                <SelectItem value="REJECTED">REJECTED</SelectItem>
                <SelectItem value="DUPLICATE">DUPLICATE</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the citizen (what was done, next steps)…"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={() => update.mutate()} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
