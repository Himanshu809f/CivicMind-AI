import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Sparkle } from "lucide-react";
import { askAssistant } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How do I report a pothole?",
  "What department handles garbage?",
  "What does 'In progress' mean?",
  "How can I update my complaint?",
];

export function AssistantChat({ context, className }: { context?: string; className?: string }) {
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Namaste! I'm the CivicMind Assistant. Ask me how to report an issue, what a status means, or which department handles your problem.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const result = await ask({
        data: { messages: next.filter((m) => m.role !== "assistant" || next.indexOf(m) > 0), context: context ?? "" },
      });
      setMessages([...next, { role: "assistant", content: result.reply }]);
    } catch (error) {
      console.error(error);
      toast.error("The assistant is unavailable right now. Please try again.");
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "I could not reach the AI service just now. Please try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft", className)}>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="brand-gradient grid size-8 place-items-center rounded-lg">
          <Sparkle className="size-4 text-primary-foreground" />
        </span>
        <div>
          <p className="text-sm font-semibold">CivicMind Assistant</p>
          <p className="text-xs text-muted-foreground">Civic guidance, powered by AI</p>
        </div>
      </div>

      <div ref={boxRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed",
                m.role === "user"
                  ? "rounded-2xl bg-primary px-3.5 py-2.5 text-primary-foreground"
                  : "text-foreground",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && <p className="animate-pulse text-sm text-muted-foreground">Thinking…</p>}
      </div>

      <div className="border-t px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void send(s)}
              className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask about reporting, statuses or departments…"
            className="min-h-10 resize-none"
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
