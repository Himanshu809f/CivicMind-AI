import { useRef, useState } from "react";
import { CheckCircle2, FileImage, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Complaint } from "@/lib/civic";
import { resolveComplaint } from "@/services/complaintService";

const MAX_MB = 10;

function ProofPicker({
  label,
  files,
  onChange,
  hint,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-1.5 flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left text-sm hover:border-primary/50"
      >
        <FileImage className="size-5 text-muted-foreground" />
        {files.length === 0 ? (
          <span className="text-muted-foreground">{hint}</span>
        ) : (
          <span className="truncate">{files.map((f) => f.name).join(", ")}</span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          const tooBig = picked.find((f) => f.size > MAX_MB * 1024 * 1024);
          if (tooBig) toast.error(`${tooBig.name} is larger than ${MAX_MB} MB.`);
          onChange(picked.filter((f) => f.size <= MAX_MB * 1024 * 1024));
          e.target.value = "";
        }}
      />
    </div>
  );
}

/**
 * Prominent "Mark as Resolved" dialog. Resolution remarks are mandatory;
 * before/after proof photos are strongly recommended evidence.
 */
export function ResolveDialog({
  complaint,
  onClose,
  onResolved,
}: {
  complaint: Complaint | null;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  function reset() {
    setRemarks("");
    setBeforeFiles([]);
    setAfterFiles([]);
  }

  async function submit() {
    if (!complaint || !remarks.trim()) {
      toast.error("Please describe what was done to resolve the issue.");
      return;
    }
    setBusy(true);
    try {
      await resolveComplaint({ complaint, remarks, beforeFiles, afterFiles });
      toast.success("Complaint marked as resolved", {
        description: "The citizen has been notified to review and verify the resolution.",
      });
      reset();
      onClose();
      onResolved();
    } catch (error) {
      console.error(error);
      toast.error("Could not mark as resolved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={complaint !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-success" /> Mark as resolved
          </DialogTitle>
          <DialogDescription>
            {complaint?.complaint_number} — {complaint?.title}. The citizen is notified the moment you save.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="resolution-remarks" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resolution remarks <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="resolution-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="What was done to fix the issue? (required)"
              className="mt-1.5"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProofPicker
              label="Before photos"
              hint="The issue before the fix"
              files={beforeFiles}
              onChange={setBeforeFiles}
            />
            <ProofPicker
              label="After photos"
              hint="The issue after the fix"
              files={afterFiles}
              onChange={setAfterFiles}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The citizen will review your resolution and can reopen the complaint if the issue persists.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => !busy && onClose()} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !remarks.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? "Saving…" : "Mark as resolved"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
