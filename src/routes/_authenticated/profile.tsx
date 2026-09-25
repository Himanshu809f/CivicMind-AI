import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABEL, LANGUAGES } from "@/lib/civic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "CivicMind AI | My profile" },
      { name: "description", content: "Update your CivicMind AI profile, ward and language preference." },
      { property: "og:title", content: "My profile — CivicMind AI" },
      { property: "og:description", content: "Update your CivicMind AI profile, ward and language preference." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, roles, primaryRole, refresh } = useAuth();
  const { lang, setLang } = useI18n();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [ward, setWard] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setWard(profile?.ward ?? "");
    setCity(profile?.city ?? "");
  }, [profile]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, ward, city, language: lang })
      .eq("user_id", user.id);
    setBusy(false);
    if (error) {
      toast.error("Could not save your profile.");
      return;
    }
    toast.success("Profile updated");
    await refresh();
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      ...(currentPassword ? ({ current_password: currentPassword } as never) : {}),
    });
    setPwBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">My profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email} · {roles.map((r) => ROLE_LABEL[r]).join(", ") || ROLE_LABEL[primaryRole]}
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
          <UserRound className="size-4.5" /> Details
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ward</Label>
            <Input value={ward} onChange={(e) => setWard(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Preferred language</Label>
            <Select value={lang} onValueChange={(v) => setLang(v as "en" | "hi")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.slice(0, 2).map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-5" onClick={() => void save()} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} Save changes
        </Button>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Current password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
        </div>
        <Button className="mt-5" variant="outline" onClick={() => void changePassword()} disabled={pwBusy}>
          {pwBusy && <Loader2 className="size-4 animate-spin" />} Update password
        </Button>
      </section>
    </div>
  );
}
