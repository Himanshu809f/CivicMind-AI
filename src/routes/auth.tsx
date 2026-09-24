import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Logo } from "@/components/civic/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "CivicMind AI | Sign in" },
      { name: "description", content: "Sign in or create your CivicMind AI citizen account to report and track civic issues." },
      { property: "og:title", content: "Sign in — CivicMind AI" },
      { property: "og:description", content: "Access your CivicMind AI account to report and track civic issues." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back to CivicMind AI");
    navigate({ to: "/dashboard" });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Use at least 8 characters for your password."); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, phone },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) {
      setSentTo(email);
      return;
    }
    toast.success("Account created");
    navigate({ to: "/dashboard" });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset link sent. Check your inbox.");
    setMode("login");
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) { toast.error("Google sign-in failed. Please try again."); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  if (sentTo) {
    return (
      <Shell>
        <div className="text-center">
          <Mail className="mx-auto size-10 text-primary" />
          <h1 className="font-display mt-4 text-2xl font-bold">Confirm your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a verification link to <strong>{sentTo}</strong>. Click it to activate your
            CivicMind AI account, then sign in.
          </p>
          <Button className="mt-6 w-full" onClick={() => { setSentTo(null); setMode("login"); }}>
            Back to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {mode === "forgot" ? (
        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll email you a secure link to choose a new password.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fmail">Email</Label>
            <Input id="fmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Send reset link
          </Button>
          <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode("login")}>
            Back to sign in
          </button>
        </form>
      ) : (
        <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => setMode("forgot")}>
                    Forgot password?
                  </button>
                </div>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />} Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Asha Verma" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remail">Email</Label>
                <Input id="remail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rpassword">Password</Label>
                <Input id="rpassword" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />} Create citizen account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      )}

      {mode !== "forgot" && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-surface flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        </div>
        <div className="rounded-3xl border bg-card p-6 shadow-lift sm:p-8">{children}</div>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5" /> Your reports stay tied to your account and ward.
        </p>
      </div>
    </div>
  );
}
