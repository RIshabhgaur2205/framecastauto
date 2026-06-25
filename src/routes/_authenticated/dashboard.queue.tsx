import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getContentItems } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/dashboard/queue")({
  component: QueuePage,
});

function QueuePage() {
  const { data: items = [] } = useQuery({
    queryKey: ["content_items"],
    queryFn: () => getContentItems(),
  });
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const now = Date.now();
  const filtered = items.filter((i) => {
    const t = i.scheduled_at ? new Date(i.scheduled_at).getTime() : 0;
    return tab === "upcoming" ? t >= now || i.status === "queued" : t < now || i.status === "published";
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="label-eyebrow">Content queue</div>
      <h1 className="display mt-4 text-4xl text-foreground lg:text-5xl">
        Upcoming &amp; past videos.
      </h1>

      <div className="mt-8 flex gap-1 border-b border-hairline">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative px-4 py-3 text-xs uppercase tracking-[0.25em] transition-colors ${
              tab === t ? "text-accent" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute inset-x-0 bottom-[-1px] h-px bg-accent" />
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 border border-hairline bg-surface p-16 text-center">
          <FilmStrip />
          <div className="mt-6 font-display text-3xl tracking-[0.1em] text-foreground">
            NO VIDEOS IN THE QUEUE YET
          </div>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            Once you connect a channel and queue a video, it'll show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-hairline border border-hairline bg-surface">
          {filtered.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="truncate text-sm text-foreground">{it.title ?? "Untitled"}</div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  {it.status} · {it.scheduled_at ? new Date(it.scheduled_at).toLocaleString() : "—"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilmStrip() {
  return (
    <div className="mx-auto flex h-10 w-40 items-center justify-between border border-hairline bg-background px-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <span key={i} className="block h-3 w-3 border border-hairline" />
      ))}
    </div>
  );
}
