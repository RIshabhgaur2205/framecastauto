import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Film } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: OverviewPage,
});

const STATS = [
  { value: "[X]", label: "Videos generated" },
  { value: "[X]", label: "Hours saved" },
  { value: "[X]", label: "Channels connected" },
];

function OverviewPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="label-eyebrow">Overview</div>
      <h1 className="display mt-4 text-5xl text-foreground lg:text-7xl">
        Your studio is quiet.
      </h1>
      <p className="mt-4 max-w-lg text-sm text-muted-foreground">
        Connect a channel and queue your first video to start filling the schedule.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-6">
        <button
          type="button"
          className="group inline-flex h-11 items-center gap-2 bg-accent px-6 text-sm font-medium text-accent-foreground transition-all hover:shadow-[0_0_30px_-6px_var(--color-accent-glow)]"
        >
          Generate your first video
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Pipeline coming soon
        </span>
      </div>

      <div className="mt-16 grid gap-px bg-hairline sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="bg-surface p-6">
            <div className="font-display text-5xl text-foreground">{s.value}</div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 flex items-center gap-4 border-t border-hairline pt-10 text-muted-foreground">
        <Film className="h-5 w-5 text-accent" />
        <p className="text-sm">
          Placeholder figures — they'll update as the studio runs.
        </p>
      </div>
    </div>
  );
}
