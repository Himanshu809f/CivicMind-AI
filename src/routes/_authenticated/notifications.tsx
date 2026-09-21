import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { BellRing, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/civic/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CivicMind AI" },
      { name: "description", content: "Live updates about your civic complaints: assignment, progress and resolution." },
      { property: "og:title", content: "Notifications — CivicMind AI" },
      { property: "og:description", content: "Live updates about your civic complaints." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        void query.refetch();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function markAll() {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    void query.refetch();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real-time updates on your complaints.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void markAll()}>
          <CheckCheck className="size-4" /> Mark all read
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState icon={BellRing} title="Nothing yet" description="Updates about your complaints will appear here." />
      ) : (
        <ul className="space-y-3">
          {query.data!.map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl border p-4 shadow-soft ${n.is_read ? "bg-card" : "border-primary/40 bg-primary/6"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {n.complaint_id && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/complaints/$id" params={{ id: n.complaint_id }}>Open</Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
