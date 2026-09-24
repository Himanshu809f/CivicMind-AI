import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Copy,
  Crosshair,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  Trash2,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { classifyComplaint, detectDuplicate, type ClassifyResult } from "@/lib/ai.functions";
import { createComplaint } from "@/services/complaintService";
import { CATEGORIES, LANGUAGES, categoryMeta } from "@/lib/civic";
import { ComplaintMap } from "@/components/civic/ComplaintMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/complaints/new")({
  head: () => ({
    meta: [
      { title: "Report an issue — CivicMind AI" },
      { name: "description", content: "Report a civic issue with photos, location and AI-assisted classification." },
      { property: "og:title", content: "Report an issue — CivicMind AI" },
      { property: "og:description", content: "Report a civic issue with photos, location and AI-assisted classification." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewComplaint,
});

const STEPS = ["Issue details", "Photos", "Location", "AI analysis", "Review", "Done"];
const DRAFT_KEY = "civicmind.draft";

type Upload = { id: string; file: File; preview: string; path?: string };

function NewComplaint() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const classify = useServerFn(classifyComplaint);
  const dupCheck = useServerFn(detectDuplicate);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [language, setLanguage] = useState("en");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [ward, setWard] = useState("");
  const [landmark, setLandmark] = useState("");
  const [ai, setAi] = useState<ClassifyResult | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [dup, setDup] = useState<{ id: string | null; number?: string; score: number | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ number: string; id: string; status: string; sla: number; department: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [online, setOnline] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  /* offline draft support */
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw) as Record<string, string>;
        setTitle(d["title"] ?? "");
        setDescription(d["description"] ?? "");
        setCategory(d["category"] ?? "");
        setSubcategory(d["subcategory"] ?? "");
        setWard(d["ward"] ?? "");
        setAddress(d["address"] ?? "");
        setCity(d["city"] ?? "");
        setLandmark(d["landmark"] ?? "");
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (created) return;
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ title, description, category, subcategory, ward, address, city, landmark }),
    );
  }, [title, description, category, subcategory, ward, address, city, landmark, created]);

  /* media */
  function addFiles(files: FileList | null) {
    if (!files) return;
    const accepted: Upload[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 10 MB.`);
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
    }
    setUploads((prev) => [...prev, ...accepted].slice(0, 6));
  }

  function removeUpload(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  /* geolocation */
  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser cannot share location. Pick the spot on the map instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
        toast.success("Location captured");
      },
      () => toast.error("Location permission denied. Tap the map to select the spot."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  /* voice input */
  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
      | (new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
          onend: () => void;
          start: () => void;
          stop: () => void;
        })
      | undefined;
    if (!Ctor) {
      toast.error("Voice input is not supported in this browser. Please type your complaint.");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : language === "ta" ? "ta-IN" : "en-IN";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += `${event.results[i]?.[0]?.transcript ?? ""} `;
      }
      setDescription((prev) => `${prev ? `${prev.trim()} ` : ""}${text.trim()}`);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  /* AI step */
  async function runAi() {
    setAiBusy(true);
    setAi(null);
    setDup(null);
    try {
      let imageUrl: string | undefined;
      if (uploads[0] && user) {
        const path = await uploadFile(uploads[0], user.id);
        if (path) {
          uploads[0].path = path;
          const { data } = await supabase.storage.from("complaint-media").createSignedUrl(path, 600);
          imageUrl = data?.signedUrl ?? undefined;
        }
      }
      const result = await classify({
        data: { title, description, language, ...(imageUrl ? { imageUrl } : {}) },
      });
      setAi(result);
      if (!category && result.category) setCategory(result.category);

      const { data: candidates } = await supabase
        .from("complaints")
        .select("id, complaint_number, description, latitude, longitude, created_at")
        .eq("category", result.category || category || "OTHER")
        .not("status", "in", "(CLOSED,REJECTED,DUPLICATE)")
        .order("created_at", { ascending: false })
        .limit(8);

      const dupResult = (await dupCheck({
        data: {
          description,
          category: result.category || category || "OTHER",
          latitude: lat,
          longitude: lng,
          candidates: (candidates ?? []).map((c) => ({
            id: c.id,
            complaint_number: c.complaint_number,
            description: c.description,
            latitude: c.latitude == null ? null : Number(c.latitude),
            longitude: c.longitude == null ? null : Number(c.longitude),
            created_at: c.created_at,
          })),
        },
      })) as Record<string, unknown>;

      if (dupResult["is_duplicate"]) {
        const matchedId = (dupResult["matched_complaint_id"] as string | null) ?? null;
        const matched = (candidates ?? []).find((c) => c.id === matchedId);
        setDup({
          id: matchedId,
          ...(matched ? { number: matched.complaint_number } : {}),
          score: (dupResult["similarity_score"] as number | null) ?? null,
        });
      }
    } catch (error) {
      console.error(error);
      setAi(null);
      toast.error("AI service unavailable. Your complaint can still be submitted.");
    } finally {
      setAiBusy(false);
    }
  }

  async function uploadFile(upload: Upload, userId: string) {
    if (upload.path) return upload.path;
    const ext = upload.file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("complaint-media").upload(path, upload.file, {
      contentType: upload.file.type,
    });
    if (error) {
      console.error(error);
      toast.error(`Could not upload ${upload.file.name}`);
      return null;
    }
    return path;
  }

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    try {
      const stored: { path: string; name: string; size: number; type: string }[] = [];
      for (const upload of uploads) {
        const path = await uploadFile(upload, user.id);
        if (path) {
          upload.path = path;
          stored.push({ path, name: upload.file.name, size: upload.file.size, type: upload.file.type });
        }
      }
      const complaint = await createComplaint({
        title,
        description,
        category: category || ai?.category || "OTHER",
        subcategory: subcategory || ai?.subcategory || null,
        language,
        latitude: lat,
        longitude: lng,
        address: address || null,
        city: city || null,
        ward: ward || null,
        landmark: landmark || null,
        files: stored,
        ai,
        duplicateOf: dup?.id ?? null,
        duplicateScore: dup?.score ?? null,
      });
      localStorage.removeItem(DRAFT_KEY);
      setCreated({
        id: complaint.id,
        number: complaint.complaint_number,
        status: complaint.status,
        sla: complaint.sla_hours ?? 72,
        department: categoryMeta(complaint.category).department,
      });
      setStep(5);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not submit the complaint.");
    } finally {
      setSubmitting(false);
    }
  }

  const canNext = () => {
    if (step === 0) return title.trim().length >= 5 && description.trim().length >= 10 && category;
    if (step === 2) return lat != null && lng != null;
    return true;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Report an issue</h1>
        {/* Announced to screen readers whenever the wizard moves between steps */}
        <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
          Step {Math.min(step + 1, 6)} of 6 · {STEPS[step]}
        </p>
        <Progress
          value={((step + 1) / 6) * 100}
          className="mt-3"
          aria-label={`Progress: step ${Math.min(step + 1, 6)} of 6`}
        />
      </div>

      {!online && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm"
        >
          <WifiOff className="mt-0.5 size-4.5 text-warning-foreground" aria-hidden="true" />
          <p>
            You're offline. Your text is saved as a draft on this device — pending sync. Submit again
            once you're back online.
          </p>
        </div>
      )}

      <div className="rounded-3xl border bg-card p-5 shadow-soft sm:p-7">
        {/* STEP 1 */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Issue title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Large pothole near bus stop" maxLength={140} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="desc">Description</Label>
                <Button type="button" size="sm" variant={listening ? "destructive" : "outline"} onClick={toggleVoice}>
                  {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  {listening ? "Stop" : "Speak your complaint"}
                </Button>
              </div>
              <Textarea id="desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what is wrong, how long it has been there and how it affects people." />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select value={subcategory} onValueChange={setSubcategory} disabled={!category}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {categoryMeta(category).subcategories.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <div className="space-y-5">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center"
            >
              <ImagePlus className="size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Drag photos here, or choose a source</p>
              <p className="text-xs text-muted-foreground">Up to 6 images, max 10 MB each</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="size-4" /> Choose files
                </Button>
                <Button type="button" variant="outline" onClick={() => cameraRef.current?.click()}>
                  <Camera className="size-4" /> Take photo
                </Button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addFiles(e.target.files)} />
            </div>
            {uploads.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {uploads.map((u) => (
                  <li key={u.id} className="group relative overflow-hidden rounded-xl border">
                    <img src={u.preview} alt={u.file.name} className="h-32 w-full object-cover" />
                    <button
                      onClick={() => removeUpload(u.id)}
                      className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-background/90 text-destructive"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={detectLocation}>
                <Crosshair className="size-4" /> Use my current location
              </Button>
              <p className="text-xs text-muted-foreground">or tap the map to place the pin manually</p>
            </div>
            <ComplaintMap
              className="h-72"
              onPick={(la, ln) => { setLat(Number(la.toFixed(6))); setLng(Number(ln.toFixed(6))); }}
              {...(lat != null && lng != null
                ? {
                    center: [lat, lng] as [number, number],
                    zoom: 16,
                    markers: [{ id: "picked", lat, lng, title: title || "Selected location" }],
                  }
                : {})}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input value={lat ?? ""} onChange={(e) => setLat(e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input value={lng ?? ""} onChange={(e) => setLng(e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ward</Label>
                <Input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="Ward 12" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Landmark</Label>
                <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Opposite city library" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — AI */}
        {step === 3 && (
          <div className="space-y-5">
            {!ai && !aiBusy && (
              <div className="text-center">
                <Sparkles className="mx-auto size-8 text-ai" />
                <h2 className="font-display mt-3 text-xl font-bold">Run AI analysis</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  CivicMind AI will read your report, suggest a category and priority, and check for
                  duplicate complaints nearby.
                </p>
                <Button className="mt-5" onClick={() => void runAi()}>
                  <Sparkles className="size-4" /> Analyse my complaint
                </Button>
              </div>
            )}
            {aiBusy && (
              <div role="status" aria-live="polite" className="space-y-3 text-center">
                <Loader2 className="mx-auto size-8 animate-spin text-ai" aria-hidden="true" />
                <p className="font-semibold">Analysing your complaint…</p>
                <p className="text-sm text-muted-foreground">
                  Reading the description, inspecting your photo and comparing nearby reports.
                </p>
              </div>
            )}
            {ai && !aiBusy && (
              <div className="space-y-4">
                {ai.source === "unavailable" ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
                    <AlertTriangle className="mt-0.5 size-4.5 text-warning-foreground" />
                    <p>
                      AI service not connected. Your complaint will still be saved and routed using
                      the category you selected.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-ai/30 bg-ai/6 p-5">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-2 text-sm font-semibold text-ai">
                        <Sparkles className="size-4" /> AI analysis
                      </p>
                      <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        {ai.source === "python-backend" ? "Python AI backend" : "Lovable AI"}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field label="Predicted category" value={categoryMeta(ai.category).label} />
                      <Field label="Subcategory" value={ai.subcategory ?? "—"} />
                      <Field label="Suggested department" value={ai.department ?? categoryMeta(ai.category).department} />
                      <Field label="Priority" value={`${ai.priority ?? "MEDIUM"}${ai.priority_score != null ? ` (${ai.priority_score}/100)` : ""}`} />
                      <Field label="Confidence" value={ai.confidence != null ? `${Math.round(ai.confidence * 100)}%` : "Not reported"} />
                      <Field label="Severity" value={ai.severity != null ? `${ai.severity}/100` : "Not reported"} />
                    </dl>
                    {ai.priority_reason && (
                      <p className="mt-4 text-sm text-muted-foreground">
                        <strong className="text-foreground">Why: </strong>{ai.priority_reason}
                      </p>
                    )}
                    {ai.detected_objects.length > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        <strong className="text-foreground">Detected in photo: </strong>
                        {ai.detected_objects.join(", ")}
                      </p>
                    )}
                    {ai.summary && <p className="mt-2 text-sm text-muted-foreground">{ai.summary}</p>}
                  </div>
                )}

                {dup?.id && (
                  <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
                    <Copy className="mt-0.5 size-4.5 text-warning-foreground" />
                    <p>
                      This looks like a possible duplicate of{" "}
                      <strong>{dup.number ?? "an existing complaint"}</strong>
                      {dup.score != null ? ` (similarity ${Math.round(Number(dup.score) * 100)}%)` : ""}. You
                      can still submit — we'll link the two so the department sees both reports.
                    </p>
                  </div>
                )}

                <Button variant="outline" onClick={() => void runAi()}>Re-run analysis</Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 5 — review */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-display text-xl font-bold">Review and submit</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" value={title} />
              <Field label="Category" value={categoryMeta(category || ai?.category).label} />
              <Field label="Subcategory" value={subcategory || ai?.subcategory || "—"} />
              <Field label="Language" value={LANGUAGES.find((l) => l.value === language)?.label ?? language} />
              <Field label="Location" value={lat != null ? `${lat}, ${lng}` : "Not set"} />
              <Field label="Ward" value={ward || "—"} />
              <Field label="Photos" value={`${uploads.length} attached`} />
              <Field label="Routing" value={categoryMeta(category || ai?.category).department} />
            </dl>
            <p className="whitespace-pre-wrap rounded-2xl border bg-muted/40 p-4 text-sm">{description}</p>
            <Button onClick={() => void submit()} disabled={submitting} size="lg" className="w-full">
              {submitting && <Loader2 className="size-4 animate-spin" />} Submit complaint
            </Button>
          </div>
        )}

        {/* STEP 6 — success */}
        {step === 5 && created && (
          <div className="space-y-5 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h2 className="font-display text-2xl font-bold">Complaint registered</h2>
            <p className="font-mono text-lg font-semibold text-primary">{created.number}</p>
            <dl className="mx-auto grid max-w-md gap-3 text-left sm:grid-cols-2">
              <Field label="Submitted at" value={new Date().toLocaleString()} />
              <Field label="Status" value={created.status.replace("_", " ")} />
              <Field label="Department" value={created.department} />
              <Field label="Expected SLA" value={`${created.sla} hours`} />
            </dl>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/complaints/$id" params={{ id: created.id }}>Track this complaint</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {step < 5 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => {
                if (!canNext()) {
                  toast.error(
                    step === 0
                      ? "Add a title, description and category first."
                      : "Pick the issue location on the map first.",
                  );
                  return;
                }
                setStep((s) => s + 1);
              }}
            >
              Continue
            </Button>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
