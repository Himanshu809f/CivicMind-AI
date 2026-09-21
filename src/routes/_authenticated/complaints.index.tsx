import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileQuestion, MapPin, PlusCircle, Search, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { CATEGORIES, STATUS_FLOW, categoryMeta, slaState, type Complaint } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/complaints/")({
  head: () => ({
    meta: [
      { title: "All complaints — CivicMind AI" },
      { name: "description", content: "Search and filter civic complaints by status, category, ward and priority." },
      { property: "og:title", content: "All complaints — CivicMind AI" },
      { property: "og:description", content: "Search and filter civic complaints by status, category, ward and priority." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplaintsList,
});

function ComplaintsList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [sort, setSort] = useState("newest");

  const { data, isLoading } = useQuery({
    queryKey: ["complaints-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as Complaint[];
    },
  });

  const rows = useMemo(() => {
    let list = data ?? [];
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((c) =>
        [c.complaint_number, c.title, c.description, c.category, c.ward, c.address, c.city, c.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      );
    }
    if (status !== "ALL") list = list.filter((c) => c.status === status);
    if (category !== "ALL") list = list.filter((c) => c.category === category);
    if (priority !== "ALL") list = list.filter((c) => c.priority === priority);
    const sorted = [...list];
    if (sort === "oldest") sorted.reverse();
    if (sort === "priority") {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as Record<string, number>;
      sorted.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
    }
    if (sort === "sla") {
      sorted.sort(
        (a, b) =>
          new Date(a.sla_deadline ?? 0).getTime() - new Date(b.sla_deadline ?? 0).getTime(),
      );
    }
    return sorted;
  }, [data, q, status, category, priority, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Complaints</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${rows.length} complaint(s) visible to your role.`}
          </p>
        </div>
        <Button asChild>
          <Link to="/complaints/new">
            <PlusCircle className="size-4" /> Report new issue
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ID, title, ward, location…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_FLOW.map((s) => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
            <SelectItem value="DUPLICATE">DUPLICATE</SelectItem>
            <SelectItem value="REJECTED">REJECTED</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="sla">SLA deadline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No complaints match these filters"
          description="Try clearing the search or selecting a different status."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => {
            const sla = slaState(c);
            return (
              <li key={c.id}>
                <Link
                  to="/complaints/$id"
                  params={{ id: c.id }}
                  className="card-lift block rounded-2xl border bg-card p-4 shadow-soft"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{c.complaint_number}</span>
                    <StatusBadge status={c.status} />
                    <PriorityBadge priority={c.priority} />
                    <span className={`ml-auto flex items-center gap-1 text-xs ${sla.tone}`}>
                      <Timer className="size-3.5" /> {sla.label}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold">{c.title}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{c.description}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {c.address ?? c.ward ?? c.city ?? "Location captured"} · {categoryMeta(c.category).label} ·{" "}
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
