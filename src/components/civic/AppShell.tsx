import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquareHeart,
  Menu,
  PlusCircle,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABEL, type AppRole } from "@/lib/civic";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles?: AppRole[] };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/complaints", label: "Complaints", icon: ClipboardList },
  { to: "/complaints/new", label: "Report issue", icon: PlusCircle, roles: ["CITIZEN"] },
  { to: "/map", label: "Issue map", icon: Map },
  { to: "/officer", label: "Officer queue", icon: Wrench, roles: ["OFFICER", "DEPARTMENT_ADMIN", "SUPER_ADMIN"] },
  { to: "/department", label: "Department", icon: Building2, roles: ["DEPARTMENT_ADMIN", "SUPER_ADMIN"] },
  { to: "/admin", label: "Administration", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
  { to: "/assistant", label: "AI assistant", icon: MessageSquareHeart },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "My profile", icon: UserRound },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { roles, primaryRole } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const visible = NAV.filter((n) => !n.roles || n.roles.some((r) => roles.includes(r)) || n.roles.includes(primaryRole));

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      <ul className="flex flex-col gap-1">
        {visible.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/12 text-primary shadow-soft"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="size-4.5" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, user, primaryRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (!cancelled) setUnread(count ?? 0);
    };
    void loadUnread();
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void loadUnread(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-dvh bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <aside
        aria-label="Sidebar"
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar px-4 py-5 lg:flex"
      >
        <Link to="/dashboard" aria-label="CivicMind AI home">
          <Logo />
        </Link>
        <div className="mt-7 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="rounded-2xl border bg-card p-3">
          <p className="truncate text-sm font-semibold">{profile?.full_name ?? user?.email}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[primaryRole]}</p>
          <Button variant="ghost" size="sm" className="mt-2 min-h-11 w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b glass px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation menu"
                  className="min-h-11 min-w-11 lg:hidden"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-5">
                <Logo />
                <div className="mt-6">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
                <Button variant="ghost" size="sm" className="mt-4 min-h-11 w-full justify-start" onClick={signOut}>
                  <LogOut className="size-4" aria-hidden="true" /> Sign out
                </Button>
              </SheetContent>
            </Sheet>
            <span className="lg:hidden">
              <Logo compact />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="relative min-h-11 min-w-11">
              <Link
                to="/notifications"
                aria-label={
                  unread > 0 ? `Notifications, ${unread} unread` : "Notifications, none unread"
                }
              >
                <Bell className="size-5" aria-hidden="true" />
                {unread > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 grid size-4.5 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            </Button>
            <Button asChild size="sm" className="hidden min-h-11 sm:inline-flex">
              <Link to="/complaints/new">
                <PlusCircle className="size-4" aria-hidden="true" /> Report issue
              </Link>
            </Button>
          </div>
        </header>
        {/* Live region so screen readers hear unread-count changes pushed in real time */}
        <p aria-live="polite" className="sr-only">
          {unread > 0 ? `${unread} unread notifications` : ""}
        </p>
        <main id="main-content" tabIndex={-1} className="px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
      </div>
    </div>
  );
}
