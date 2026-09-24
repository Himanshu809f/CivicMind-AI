import { createFileRoute } from "@tanstack/react-router";
import { AssistantChat } from "@/components/civic/AssistantChat";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "CivicMind AI | Assistant" },
      { name: "description", content: "Ask the CivicMind Assistant how to report issues, track complaints and reach the right department." },
      { property: "og:title", content: "CivicMind Assistant — CivicMind AI" },
      { property: "og:description", content: "Ask how to report issues, track complaints and reach the right department." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Assistant,
});

function Assistant() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">CivicMind Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask about reporting, statuses, departments or how to follow up on a complaint.
        </p>
      </div>
      <AssistantChat className="h-[70vh]" />
    </div>
  );
}
