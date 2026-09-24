import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BrainCircuit,
  Building2,
  CopyCheck,
  FileClock,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/civic/StatCard";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CATEGORIES,
  ROLE_LABEL,
  isOverdue,
  type AppRole,
  type Complaint,
  type Department,
  type Profile,
} from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "CivicMind AI | Administration" },
      {
        name: "description",
        content:
          "Super admin console for users and roles, departments, routing rules, AI activity, SLA breaches and the full civic audit trail.",
      },
      { property: "og:title", content: "Administration — CivicMind AI" },
      {
        property: "og:description",
        content: "Govern users, departments, routing rules and audit history across CivicMind AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminConsole,
});

const PIE_COLORS = ["#2f5bd7", "#22b8cf", "#7c5cf0", "#d98a1a", "#d14033", "#1f9d6b"];
const ROLES: AppRole[] = ["CITIZEN", "OFFICER", "DEPARTMENT_ADMIN", "SUPER_ADMIN"];

function AdminConsole() {
  const queryClient = useQueryClient();
  const [newDept, setNewDept] = useState("");
  const [ruleCategory, setRuleCategory] = useState("ROAD");
  const [ruleDept, setRuleDept] = useState("");
  const [ruleSla, setRuleSla] = useState("48");

  const complaints = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: async () => {
      const { data, error } = await supabase.from("complaints").select("*").limit(1000);
      if (error) throw error;
      return data as Complaint[];
    },
  });

  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").limit(1000);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const roles = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const departments = useQuery({
    queryKey: ["admin-departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Department[];
    },
  });

  const rules = useQuery({
    queryKey: ["admin-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("routing_rules").select("*").order("category");
      if (error) throw error;
      return data ?? [];
    },
  });

  const audits = useQuery({
    queryKey: ["admin-audits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) throw error;
      return data ?? [];
    },
  });

  const predictions = useQuery({
    queryKey: ["admin-predictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_predictions")
        .select("id, model_name, prediction_type, confidence, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const duplicates = useQuery({
    queryKey: ["admin-duplicates"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("complaint_duplicates")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const feedback = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feedback").select("rating, comment, created_at").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const roleByUser = useMemo(() => {
    const map = new Map<string, AppRole>();
    const rank: AppRole[] = ["SUPER_ADMIN", "DEPARTMENT_ADMIN", "OFFICER", "CITIZEN"];
    for (const r of roles.data ?? []) {
      const current = map.get(r.user_id);
      const next = r.role as AppRole;
      if (!current || rank.indexOf(next) < rank.indexOf(current)) map.set(r.user_id, next);
    }
    return map;
  }, [roles.data]);

  const kpi = useMemo(() => {
    const list = complaints.data ?? [];
    const resolved = list.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED");
    const ratings = (feedback.data ?? []).map((f) => f.rating);
    let citizens = 0;
    let officers = 0;
    for (const p of profiles.data ?? []) {
      const role = roleByUser.get(p.user_id) ?? "CITIZEN";
      if (role === "CITIZEN") citizens += 1;
      else officers += 1;
    }
    return {
      citizens,
      staff: officers,
      departments: (departments.data ?? []).length,
      complaints: list.length,
      open: list.length - resolved.length,
      resolved: resolved.length,
      breaches: list.filter(isOverdue).length,
      aiRuns: (predictions.data ?? []).length,
      duplicates: duplicates.data ?? 0,
      avgRating: ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null,
      ratingCount: ratings.length,
    };
  }, [complaints.data, feedback.data, profiles.data, roleByUser, departments.data, predictions.data, duplicates.data]);

  const statusMix = useMemo(() => {
    const list = complaints.data ?? [];
    const counts = new Map<string, number>();
    for (const c of list) counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
    return [...counts.entries()].map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [complaints.data]);

  const ratingMix = useMemo(
    () =>
      [1, 2, 3, 4, 5].map((r) => ({
        name: `${r}★`,
        count: (feedback.data ?? []).filter((f) => f.rating === r).length,
      })),
    [feedback.data],
  );

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        action: "user.role_changed",
        entity_type: "user_role",
        entity_id: userId,
        new_value: { role } as never,
      });
    },
    onSuccess: () => {
      toast.success("Role updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e: Error) => toast.error("Could not change role", { description: e.message }),
  });

  const addDepartment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("departments").insert({ name: newDept.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department created");
      setNewDept("");
      void queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
    },
    onError: (e: Error) => toast.error("Could not create department", { description: e.message }),
  });

  const addRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("routing_rules").insert({
        category: ruleCategory,
        department_id: ruleDept,
        sla_hours: Number(ruleSla) || 48,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Routing rule saved");
      void queryClient.invalidateQueries({ queryKey: ["admin-rules"] });
    },
    onError: (e: Error) => toast.error("Could not save rule", { description: e.message }),
  });

  const deptName = (id: string | null) =>
    (departments.data ?? []).find((d) => d.id === id)?.name ?? "Unassigned";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide governance: people, departments, routing, AI activity and the audit trail.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Citizens" value={kpi.citizens} icon={Users} loading={profiles.isLoading} />
        <StatCard label="Staff accounts" value={kpi.staff} icon={ShieldCheck} accent="ai" loading={profiles.isLoading} />
        <StatCard label="Departments" value={kpi.departments} icon={Building2} accent="signal" loading={departments.isLoading} />
        <StatCard label="Complaints" value={kpi.complaints} icon={Activity} loading={complaints.isLoading} hint={`${kpi.open} open`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Resolved" value={kpi.resolved} icon={CopyCheck} accent="success" loading={complaints.isLoading} />
        <StatCard label="SLA breaches" value={kpi.breaches} icon={FileClock} accent="critical" loading={complaints.isLoading} />
        <StatCard label="AI classifications" value={kpi.aiRuns} icon={BrainCircuit} accent="ai" loading={predictions.isLoading} />
        <StatCard
          label="Avg satisfaction"
          value={kpi.avgRating ?? "—"}
          icon={Star}
          accent="warning"
          loading={feedback.isLoading}
          hint={`${kpi.ratingCount} rating(s) · ${kpi.duplicates} duplicates flagged`}
        />
      </div>

      <Tabs defaultValue="people">
        <TabsList className="flex-wrap">
          <TabsTrigger value="people">Users &amp; roles</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="routing">Routing rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-4">
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
            {profiles.isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Ward / City</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Change role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(profiles.data ?? []).map((p) => {
                    const role = roleByUser.get(p.user_id) ?? "CITIZEN";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {[p.ward, p.city].filter(Boolean).join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{deptName(p.department_id)}</TableCell>
                        <TableCell>{ROLE_LABEL[role]}</TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={role}
                            onValueChange={(v) => setRole.mutate({ userId: p.user_id, role: v as AppRole })}
                          >
                            <SelectTrigger className="ml-auto w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="departments" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-4 shadow-soft">
            <Input
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              placeholder="New department name"
              className="max-w-xs"
            />
            <Button disabled={!newDept.trim() || addDepartment.isPending} onClick={() => addDepartment.mutate()}>
              Add department
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(departments.data ?? []).map((d) => {
              const count = (complaints.data ?? []).filter((c) => c.assigned_department_id === d.id).length;
              return (
                <div key={d.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                  <p className="font-semibold">{d.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{count} complaint(s) routed</p>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="routing" className="mt-4 space-y-4">
          <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft md:grid-cols-4">
            <Select value={ruleCategory} onValueChange={setRuleCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ruleDept} onValueChange={setRuleDept}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                {(departments.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={ruleSla} onChange={(e) => setRuleSla(e.target.value)} placeholder="SLA hours" type="number" />
            <Button disabled={!ruleDept || addRule.isPending} onClick={() => addRule.mutate()}>
              Save rule
            </Button>
          </div>
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>SLA hours</TableHead>
                  <TableHead>Priority boost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.category}</TableCell>
                    <TableCell>{deptName(r.department_id)}</TableCell>
                    <TableCell>{r.sla_hours}</TableCell>
                    <TableCell>{r.priority_boost ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Status distribution</h2>
            <div className="mt-4 h-64">
              {statusMix.length === 0 ? (
                <p className="text-sm text-muted-foreground">No complaints yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                      {statusMix.map((_, i) => (
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
            <h2 className="font-display text-lg font-semibold">Feedback ratings</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingMix}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <ChartTooltip />
                  <Bar dataKey="count" fill="#22b8cf" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
            <h2 className="font-display text-lg font-semibold">Recent AI runs</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Each row is a real model call made through the platform's AI service — nothing is simulated.
            </p>
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(predictions.data ?? []).slice(0, 15).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.model_name}</TableCell>
                    <TableCell className="text-sm">{p.prediction_type}</TableCell>
                    <TableCell className="text-sm">
                      {p.confidence === null ? "—" : `${Math.round(Number(p.confidence) * 100)}%`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
            {audits.isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(audits.data ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.entity_type}</TableCell>
                      <TableCell className="font-mono text-xs">{a.entity_id?.slice(0, 8) ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
