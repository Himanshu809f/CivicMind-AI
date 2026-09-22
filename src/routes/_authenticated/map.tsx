import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MapPinned } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ComplaintMap } from "@/components/civic/ComplaintMap";
import { EmptyState } from "@/components/civic/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/civic/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, STATUS_FLOW, categoryMeta, type Complaint } from "@/lib/civic";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "Issue map — CivicMind AI" },
      {
        name: "description",
        content:
          "Geospatial view of civic complaints with priority-coloured markers and filters for category, status, ward and date.",
      },
      { property: "og:title", content: "Issue map — CivicMind AI" },
      {
        property: "og:description",
        content: "See every reported civic issue on an interactive map, filtered by ward, category and priority.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

const PRIORITY_TONE: Record<string, string> = {
  LOW: "muted",
  MEDIUM: "signal",
  HIGH: "warning",
  CRITICAL: "critical",
};

function MapPage() {
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("OPEN");
  const [priority, setPriority] = useState("ALL");
  const [ward, setWard] = useState("");
  const [since, setSince] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["map-complaints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .not("latitude", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Complaint[];
    },
  });

  const rows = useMemo(() => {
    let list = data ?? [];
    if (category !== "ALL") list = list.filter((c) => c.category === category);
    if (priority !== "ALL") list = list.filter((c) => c.priority === priority);
    if (status === "OPEN") list = list.filter((c) => c.status !== "RESOLVED" && c.status !== "CLOSED");
    else if (status !== "ALL") list = list.filter((c) => c.status === status);
    if (ward.trim()) {
      const needle = ward.trim().toLowerCase();
      list = list.filter((c) => (c.ward ?? "").toLowerCase().includes(needle));
    }
    if (since) {
      const from = new Date(since).getTime();
      list = list.filter((c) => new Date(c.created_at).getTime() >= from);
    }
    return list;
  }, [data, category, priority, status, ward, since]);

  const markers = useMemo(
    () =>
      rows
        .filter((c) => c.latitude !== null && c.longitude !== null)
        .map((c) => ({
          id: c.id,
          lat: Number(c.latitude),
          lng: Number(c.longitude),
          title: `${c.complaint_number} · ${c.title}`,
          subtitle: `${categoryMeta(c.category).label} · ${c.status.replace("_", " ")}`,
          tone: PRIORITY_TONE[c.priority] ?? "muted",
        })),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Issue map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading ? "Loading map data…" : `${markers.length} geotagged complaint(s) shown.`}
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
            <SelectItem value="OPEN">Open only</SelectItem>
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
        <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
      </div>

      {isLoading ? (
        <Skeleton className="h-[480px] rounded-2xl" />
      ) : markers.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No geotagged complaints yet"
          description="Complaints submitted with a location will appear here as coloured markers."
        />
      ) : (
        <ComplaintMap markers={markers} height={480} />
      )}

      <div className="rounded-2xl border bg-card p-4 shadow-soft">
        <h2 className="font-display text-lg font-semibold">List view</h2>
        <ul className="mt-3 divide-y">
          {rows.slice(0, 40).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <span className="font-mono text-xs text-muted-foreground">{c.complaint_number}</span>
              <span className="text-sm font-medium">{c.title}</span>
              <StatusBadge status={c.status} />
              <PriorityBadge priority={c.priority} />
              <span className="ml-auto text-xs text-muted-foreground">
                {c.ward ?? c.city ?? "—"} · {new Date(c.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
