import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  Camera,
  CheckCircle2,
  Copy,
  Gauge,
  Languages,
  MapPin,
  MessageSquareHeart,
  Radar,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { Logo } from "@/components/civic/Logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/civic-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicMind AI — Turn Civic Complaints Into Real Action" },
      {
        name: "description",
        content:
          "Report potholes, garbage, water leaks and streetlight faults in seconds. CivicMind AI classifies, prioritises and routes every complaint, then tracks it to resolution.",
      },
      { property: "og:title", content: "CivicMind AI — Turn Civic Complaints Into Real Action" },
      {
        property: "og:description",
        content:
          "AI-powered public issue intelligence for faster reporting, smarter routing and transparent tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: ShieldCheck, title: "Login", text: "Secure citizen account in seconds." },
  { icon: Camera, title: "Capture issue", text: "Photo, voice or text in your language." },
  { icon: MapPin, title: "GPS detection", text: "Exact location and ward captured." },
  { icon: Sparkles, title: "AI analysis", text: "Category, priority and duplicates." },
  { icon: RouteIcon, title: "Department routing", text: "Sent to the accountable team." },
  { icon: CheckCircle2, title: "Resolution", text: "Live status, SLA clock and feedback." },
];

const FEATURES = [
  { icon: BrainCircuit, title: "AI classification", text: "Every complaint is categorised and summarised on arrival." },
  { icon: Camera, title: "Image analysis", text: "Photos are inspected for the visible civic problem and severity." },
  { icon: Copy, title: "Duplicate detection", text: "Repeat reports of the same issue are grouped, not lost." },
  { icon: Gauge, title: "Priority prediction", text: "Risk-weighted priority with a stated reason and confidence." },
  { icon: RouteIcon, title: "Smart routing", text: "Configurable rules send issues to the right department." },
  { icon: Timer, title: "Live tracking & SLA", text: "Countdown clocks, escalation flags and audit trail." },
  { icon: BarChart3, title: "Analytics", text: "Volume, resolution rate and ward-level hotspots." },
  { icon: Languages, title: "Multilingual", text: "Complain in English, Hindi and more." },
  { icon: MessageSquareHeart, title: "AI chatbot", text: "CivicMind Assistant answers civic questions instantly." },
  { icon: Bell, title: "Notifications", text: "Real-time updates at every stage." },
];

function Landing() {
  const { t } = useI18n();
  const { session } = useAuth();
  const { lang, setLang } = useI18n();
  const [menu, setMenu] = useState(false);
  const home = session ? "/dashboard" : "/auth";

  const sections = [
    { href: "#top", label: t("nav.home") },
    { href: "#how", label: t("nav.how") },
    { href: "#features", label: t("nav.features") },
    { href: "#about", label: t("nav.about") },
    { href: "#contact", label: t("nav.contact") },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="sticky top-0 z-30 border-b glass">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <Logo />
          <nav
            aria-label="Page sections"
            className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex"
          >
            {sections.map((s) => (
              <a key={s.href} href={s.href} className="transition-colors hover:text-foreground">
                {s.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              aria-label={lang === "en" ? "Switch language to Hindi" : "Switch language to English"}
              className="min-h-11 rounded-full border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent"
            >
              {lang === "en" ? "हिन्दी" : "EN"}
            </button>
            <Button asChild variant="ghost" size="sm" className="min-h-11">
              <Link to={home}>{t("nav.login")}</Link>
            </Button>
            <Button asChild size="sm" className="min-h-11">
              <Link to="/auth">{t("nav.register")}</Link>
            </Button>
            <button
              type="button"
              className="min-h-11 min-w-11 lg:hidden"
              onClick={() => setMenu(!menu)}
              aria-label={menu ? "Close section menu" : "Open section menu"}
              aria-expanded={menu}
              aria-controls="mobile-sections"
            >
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        {menu && (
          <nav id="mobile-sections" aria-label="Page sections" className="border-t px-4 py-3 lg:hidden">
            <ul className="flex flex-col">
              {sections.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    onClick={() => setMenu(false)}
                    className="flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="main-content" tabIndex={-1}>


      {/* HERO */}
      <section id="top" className="hero-surface relative overflow-hidden">
        <div className="grid-mesh pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Public issue intelligence
            </span>
            <h1 className="font-display mt-5 text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">{t("hero.sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={session ? "/complaints/new" : "/auth"}>
                  {t("hero.cta1")} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">{t("hero.cta2")}</a>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                ["8", "Departments wired"],
                ["6", "Stage lifecycle"],
                ["24/7", "AI triage"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl border bg-card/70 p-3">
                  <dt className="font-display text-2xl font-bold">{v}</dt>
                  <dd className="text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <img
              src={heroImage}
              alt="Civic officers reviewing a city issue map"
              className="w-full rounded-3xl border shadow-lift"
            />
            <div className="absolute -bottom-6 left-4 right-4 rounded-2xl border glass p-4 shadow-soft sm:left-8 sm:right-auto sm:w-72">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI triage result
              </p>
              <p className="mt-1 text-sm font-semibold">Pothole · Public Works</p>
              <p className="text-xs text-muted-foreground">Priority HIGH · SLA 48h · duplicate check passed</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">How it works</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Eight steps from a photo on the street to a closed, rated resolution — each one visible to
          the citizen and auditable by the administration.
        </p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card-lift rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                  <s.icon className="size-5" />
                </span>
                <span className="text-xs font-bold text-muted-foreground">STEP {i + 1}</span>
              </div>
              <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-y bg-secondary/40 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Built for real civic outcomes</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Intelligence at every stage of the grievance lifecycle, with clean interfaces for an
            external Python AI service.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-lift rounded-2xl border bg-card p-5 shadow-soft">
                <span className="grid size-10 place-items-center rounded-xl bg-ai/12 text-ai">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="about" className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Impact by design</h2>
            <p className="mt-4 text-muted-foreground">
              CivicMind AI replaces paper registers and untracked calls with a measurable pipeline.
              Officers see what matters first, departments see where they are slipping, and citizens
              finally see what happened to their complaint.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Triage minutes instead of days, with a stated reason for every priority",
                "Duplicate grouping keeps one street problem as one work order",
                "SLA clocks and audit logs make accountability the default",
                "Ward-level analytics turn complaints into planning data",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-success" />
                  <span className="text-muted-foreground">{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Radar, k: "Live", v: "Realtime status and notifications" },
              { icon: ShieldCheck, k: "Secure", v: "Role-based access and row-level security" },
              { icon: BarChart3, k: "Measured", v: "Resolution rate and SLA compliance" },
              { icon: Languages, k: "Inclusive", v: "Multilingual complaint intake" },
            ].map((c) => (
              <div key={c.k} className="rounded-2xl border bg-card p-5 shadow-soft">
                <c.icon className="size-5 text-primary" />
                <p className="font-display mt-3 text-lg font-bold">{c.k}</p>
                <p className="text-sm text-muted-foreground">{c.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        <div className="brand-gradient relative overflow-hidden rounded-3xl px-6 py-14 text-center shadow-lift sm:px-12">
          <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
            Your street deserves an answer
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Report an issue in under a minute and follow it all the way to resolution.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to={session ? "/complaints/new" : "/auth"}>Report an issue</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-card/10 text-primary-foreground">
              <Link to="/auth">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>
      </main>


      <footer id="contact" className="border-t bg-secondary/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              Complaint-to-Action Public Issue Intelligence System.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Platform</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#how" className="hover:text-foreground">How it works</a></li>
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Departments</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Public Works · Sanitation</li>
              <li>Water · Electricity · Drainage</li>
              <li>Traffic · Parks · Administration</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Civic helpline 1800-100-100</li>
              <li>support@civicmind.example</li>
              <li>Municipal Corporation, City Hall</li>
            </ul>
          </div>
        </div>
        <div className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CivicMind AI. Demo contact details — replace them with your
          municipality's real helpline and address.
        </div>
      </footer>
    </div>
  );
}
