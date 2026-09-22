import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Building2, Gauge, Star, Timer, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/civic/StatCard";
import { EmptyState } from "@/components/civic/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/civic/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORIES, STATUS_FLOW, categoryMeta, isOverdue, type Complaint, type Profile } from "@/lib/civic";
import { assignComplaint } from "@/services/complaintService";

export const Route = createFileRoute("/_authenticated/department")({
  head: () => ({
    meta: [
      { title: "Department analytics — CivicMind AI" },
      {
        name: "description",
        content:
          "Department admin control room: complaint volume trends, SLA compliance, officer performance, resolution times and citizen satisfaction.",
      },
      { property: "og:title", content: "Department analytics — CivicMind AI" },
      {
        property: "og:description",
        content: "Monitor SLA compliance, officer workload and resolution performance across your department.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DepartmentDashboard,
});

const PIE_COLORS = ["#2f5bd7", "#22b8cf", "#d98a1a", "#d14033", "#7c5cf0", "#1f9d6b"];

function DepartmentDashboard() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [ward, setWard] = useState("");
  const [from, setFrom] = useState("");
  const [assignTarget, setAssignTarget] = useState<string>("");

  const complaintsQuery = useQuery({
    queryKey: ["dept-complaints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(600);
      if (error) throw error;
      return data as Complaint[];
    },
  });

  const staffQuery = useQuery({
    queryKey: ["dept-officers", profile?.department_id],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").eq("role", "OFFICER");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [] as Profile[];
      const { data } = await supabase.from("profiles").select("*").in("user_id", ids);
      return (data ?? []) as Profile[];
    },
  });

  const feedbackQuery = useQuery({
    queryKey: ["dept-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feedback").select("rating, comment, created_at").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    let list = complaintsQuery.data ?? [];
    if (category !== "ALL") list = list.filter((c) => c.category === category);
    if (status !== "ALL") list = list.filter((c) => c.status === status);
    if (priority !== "ALL") list = list.filter((c) => c.priority === priority);
    if (ward.trim()) {
      const needle = ward.trim().toLowerCase();
      list = list.filter((c) => (c.ward ?? "").toLowerCase().includes(needle));
    }
    if (from) {
      const start = new Date(from).getTime();
      list = list.filter((c) => new Date(c.created_at).getTime() >= start);
    }
    return list;
  }, [complaintsQuery.data, category, status, priority, ward, from]);

  const kpi = useMemo(() => {
    const total = rows.length;
    const resolved = rows.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED");
    const overdue = rows.filter(isOverdue);
    const durations = resolved
      .filter((c) => c.resolved_at)
      .map((c) => new Date(c.resolved_at as string).getTime() - new Date(c.created_at).getTime());
    const avgHours = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 3_600_000)
      : null;
    const slaMet = resolved.filter(
      (c) => !c.sla_deadline || !c.resolved_at || new Date(c.resolved_at) <= new Date(c.sla_deadline),
    ).length;
    const ratings = (feedbackQuery.data ?? []).map((f) => f.rating);
    return {
      total,
      open: total - resolved.length,
      resolutionRate: total ? Math.round((resolved.length / total) * 100) : 0,
      avgHours,
      slaCompliance: resolved.length ? Math.round((slaMet / resolved.length) * 100) : 0,
      overdue: overdue.length,
      avgRating: ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null,
      ratingCount: ratings.length,
    };
  }, [rows, feedbackQuery.data]);

  const volume = useMemo(() => {
    const byDay = new Map<string, { day: string; received: number; resolved: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      byDay.set(d, { day: d.slice(5), received: 0, resolved: 0 });
    }
    for (const c of rows) {
      const key = c.created_at.slice(0, 10);
      const entry = byDay.get(key);
      if (entry) entry.received += 1;
      if (c.resolved_at) {
        const rk = byDay.get(c.resolved_at.slice(0, 10));
        if (rk) rk.resolved += 1;
      }
    }
    return [...byDay.values()];
  }, [rows]);

  const byCategory = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        name: c.label.split(" ")[0],
        complaints: rows.filter((r) => r.category === c.value).length,
      })).filter((c) => c.complaints > 0),
    [rows],
  );

  const byPriority = useMemo(
    () =>
      ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => ({
        name: p,
        value: rows.filter((r) => r.priority === p).length,
      })).filter((p) => p.value > 0),
    [rows],
  );

  const officerPerf = useMemo(() => {
    const staff = staffQuery.data ?? [];
    return staff
      .map((s) => {
        const assigned = rows.filter((c) => c.assigned_officer_id === s.user_id);
        const done = assigned.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED");
        return {
          id: s.user_id,
          name: s.full_name ?? "Officer",
          assigned: assigned.length,
          resolved: done.length,
          overdue: assigned.filter(isOverdue).length,
          rate: assigned.length ? Math.round((done.length / assigned.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.assigned - a.assigned);
  }, [staffQuery.data, rows]);

  const unassigned = useMemo(
    () => rows.filter((c) => !c.assigned_officer_id && c.status !== "RESOLVED" && c.status !== "CLOSED"),
    [rows],
  );

  const assign = useMutation({
    mutationFn: async ({ complaint, officerId }: { complaint: Complaint; officerId: string }) => {
      await assignComplaint(
        complaint.id,
        officerId,
        complaint.assigned_department_id ?? profile?.department_id ?? null,
        "Assigned by department admin",
      );
    },
    onSuccess: () => {
      toast.success("Officer assigned");
      setAssignTarget("");
      void queryClient.invalidateQueries({ queryKey: ["dept-complaints"] });
    },
    onError: (e: Error) => toast.error("Could not assign officer", { description: e.message }),
  });

  const loading = complaintsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Department control room</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Volume, SLA compliance and officer performance for the complaints your role can see.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft md:grid-cols-5">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_FLOW.map((s) => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All priorities</SelectItem>
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="Ward" />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Complaints" value={kpi.total} icon={BarChart3} loading={loading} hint={`${kpi.open} still open`} />
        <StatCard label="Resolution rate" value={`${kpi.resolutionRate}%`} icon={Gauge} accent="success" loading={loading} />
        <StatCard
          label="Avg resolution"
          value={kpi.avgHours === null ? "—" : `${kpi.avgHours}h`}
          icon={Timer}
          accent="signal"
          loading={loading}
        />
        <StatCard
          label="SLA compliance"
          value={`${kpi.slaCompliance}%`}
          icon={Building2}
          accent={kpi.slaCompliance >= 80 ? "success" : "warning"}
          loading={loading}
          hint={`${kpi.overdue} overdue now`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg font-semibold">Volume, last 14 days</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volume}>
                <defs>
                  <linearGradient id="received" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f5bd7" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#2f5bd7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <ChartTooltip />
                <Area type="monotone" dataKey="received" stroke="#2f5bd7" fill="url(#received)" />
                <Area type="monotone" dataKey="resolved" stroke="#1f9d6b" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg font-semibold">Priority mix</h2>
          <div className="mt-4 h-64">
            {byPriority.length === 0 ? (
              <p className="text-sm text-muted-foreground">No complaints in this selection yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byPriority} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                    {byPriority.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg font-semibold">Category distribution</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <ChartTooltip />
                <Bar dataKey="complaints" fill="#7c5cf0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg font-semibold">Resolutions trend</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <ChartTooltip />
                <Line type="monotone" dataKey="resolved" stroke="#1f9d6b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
          <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
            <Users className="size-5 text-primary" /> Officer performance
          </h2>
          {staffQuery.isLoading ? (
            <Skeleton className="mt-4 h-40 rounded-xl" />
          ) : officerPerf.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No officer accounts found yet.</p>
          ) : (
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>Officer</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {officerPerf.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>{o.assigned}</TableCell>
                    <TableCell>{o.resolved}</TableCell>
                    <TableCell className={o.overdue > 0 ? "text-destructive" : ""}>{o.overdue}</TableCell>
                    <TableCell>{o.rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
            <Star className="size-5 text-warning-foreground" /> Citizen satisfaction
          </h2>
          <p className="font-display mt-3 text-4xl font-bold">{kpi.avgRating ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {kpi.ratingCount > 0 ? `${kpi.ratingCount} rating(s) out of 5` : "No feedback submitted yet"}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {(feedbackQuery.data ?? [])
              .filter((f) => f.comment)
              .slice(0, 4)
              .map((f, i) => (
                <li key={i} className="rounded-xl bg-muted/60 p-2.5">
                  <span className="font-semibold">{f.rating}/5</span> — {f.comment}
                </li>
              ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Awaiting officer assignment</h2>
        {loading ? (
          <Skeleton className="mt-4 h-32 rounded-xl" />
        ) : unassigned.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Every open complaint has an officer"
            description="New complaints appear here the moment they are routed to your department."
          />
        ) : (
          <ul className="mt-3 divide-y">
            {unassigned.slice(0, 12).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <Link
                  to="/complaints/$id"
                  params={{ id: c.id }}
                  className="text-sm font-medium hover:text-primary"
                >
                  <span className="font-mono text-xs text-muted-foreground">{c.complaint_number}</span> {c.title}
                </Link>
                <StatusBadge status={c.status} />
                <PriorityBadge priority={c.priority} />
                <span className="text-xs text-muted-foreground">{categoryMeta(c.category).label}</span>
                <div className="ml-auto flex items-center gap-2">
                  <Select value={assignTarget} onValueChange={setAssignTarget}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Select officer" /></SelectTrigger>
                    <SelectContent>
                      {(staffQuery.data ?? []).map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.full_name ?? "Officer"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!assignTarget || assign.isPending}
                    onClick={() => assign.mutate({ complaint: c, officerId: assignTarget })}
                  >
                    Assign
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
