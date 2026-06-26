import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  createVideo,
  listVideos,
} from "@/lib/videos.functions";
import { generateScript, retryVideo, pollRender } from "@/lib/generation.functions";
import { publishVideo } from "@/lib/youtube.functions";
import { toast } from "sonner";
import { CineSkeletonRows, EmptyState } from "@/components/ui/cine-skeleton";
import { Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/_authenticated/dashboard/queue")({
  component: QueuePage,
});

type Video = Awaited<ReturnType<typeof listVideos>>[number];
type View = "list" | "calendar";

const STATUS_META: Record<
  string,
  { label: string; dot: string; text: string; bg: string }
> = {
  queued: {
    label: "Queued",
    dot: "bg-zinc-400",
    text: "text-zinc-300",
    bg: "bg-zinc-500/10 border-zinc-500/20",
  },
  generating_script: {
    label: "Writing script",
    dot: "bg-violet-400 animate-pulse",
    text: "text-violet-300",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  script_ready: {
    label: "Script ready",
    dot: "bg-sky-400",
    text: "text-sky-300",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  generating_voiceover: {
    label: "Voicing",
    dot: "bg-fuchsia-400 animate-pulse",
    text: "text-fuchsia-300",
    bg: "bg-fuchsia-500/10 border-fuchsia-500/20",
  },
  generating_captions: {
    label: "Captioning",
    dot: "bg-cyan-400 animate-pulse",
    text: "text-cyan-300",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  sourcing_visuals: {
    label: "Sourcing visuals",
    dot: "bg-teal-400 animate-pulse",
    text: "text-teal-300",
    bg: "bg-teal-500/10 border-teal-500/20",
  },
  rendering: {
    label: "Rendering",
    dot: "bg-amber-400 animate-pulse",
    text: "text-amber-300",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  ready: {
    label: "Ready",
    dot: "bg-accent",
    text: "text-accent",
    bg: "bg-accent/10 border-accent/30",
  },
  publishing: {
    label: "Publishing",
    dot: "bg-emerald-400 animate-pulse",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  posted: {
    label: "Posted",
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  failed: {
    label: "Failed",
    dot: "bg-rose-500",
    text: "text-rose-300",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.queued;
  return (
    <span
      className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${m.bg} ${m.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function QueuePage() {
  const qc = useQueryClient();
  const create = useServerFn(createVideo);
  const genScript = useServerFn(generateScript);
  const retry = useServerFn(retryVideo);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: () => listVideos(),
  });

  // Realtime: refresh on any change to this user's videos.
  useEffect(() => {
    const channel = supabase
      .channel("videos-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "videos" },
        () => qc.invalidateQueries({ queryKey: ["videos"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Poll Shotstack for any rendering videos every 8s.
  const poll = useServerFn(pollRender);
  useEffect(() => {
    const renderingIds = videos.filter((v) => v.status === "rendering").map((v) => v.id);
    if (renderingIds.length === 0) return;
    const tick = () => {
      for (const id of renderingIds) {
        poll({ data: { video_id: id } }).catch(() => {});
      }
    };
    tick();
    const t = setInterval(tick, 8000);
    return () => clearInterval(t);
  }, [videos, poll]);

  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = videos.find((v) => v.id === selectedId) ?? null;

  // Toast on key status transitions (ready → "video generated", posted → "video posted").
  const prevStatusRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const prev = prevStatusRef.current;
    for (const v of videos) {
      const before = prev[v.id];
      if (before && before !== v.status) {
        if (v.status === "ready") {
          toast.success("Video generated", {
            description: v.title ?? "Ready to publish.",
          });
        } else if (v.status === "posted") {
          toast.success("Video posted to YouTube", {
            description: v.title ?? "Live on your channel.",
          });
        } else if (v.status === "failed") {
          toast.error("Generation failed", {
            description: v.error_message ?? v.title ?? "Open the video to retry.",
          });
        }
      }
      prev[v.id] = v.status;
    }
  }, [videos]);


  const generate = useMutation({
    mutationFn: async () => {
      const row = await create({ data: {} });
      qc.invalidateQueries({ queryKey: ["videos"] });
      // Fire-and-forget full pipeline; status updates flow via realtime.
      genScript({ data: { video_id: row.id } }).catch(() => {});
      return row;
    },
    onSuccess: () =>
      toast.success("Video queued", {
        description: "Writing script — status updates appear live.",
      }),
    onError: (e) =>
      toast.error("Couldn't queue video", {
        description: e instanceof Error ? e.message : "Unknown error",
      }),
  });


  const retryMut = useMutation({
    mutationFn: async (id: string) => {
      await retry({ data: { video_id: id } });
      genScript({ data: { video_id: id } }).catch(() => {});
    },
    onSuccess: () => {
      toast.success("Retrying generation");
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
    onError: (e) =>
      toast.error("Retry failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      }),
  });


  const publish = useServerFn(publishVideo);
  const publishMut = useMutation({
    mutationFn: async (id: string) => publish({ data: { video_id: id } }),
    onSuccess: () => {
      toast.success("Published to YouTube", { description: "Uploaded as Private — review in YouTube Studio." });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
    onError: (e) =>
      toast.error("Publish failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      }),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="label-eyebrow">Content queue</div>
          <h1 className="display mt-4 text-4xl text-foreground lg:text-5xl">
            Your slate.
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Every video Framecast is writing, rendering, and shipping for you.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-hairline bg-surface">
            {(["list", "calendar"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-colors ${
                  view === v
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="cine-press border border-accent bg-accent px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] text-accent-foreground disabled:opacity-50"
          >
            {generate.isPending ? "Queuing…" : "Generate now"}
          </button>
        </div>
      </div>

      <div className="mt-10">
        {isLoading ? (
          <CineSkeletonRows rows={5} />
        ) : videos.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="Your slate is empty"
            description="Queue your first AI-generated video — script, voiceover, visuals, and captions, all automated."
            action={
              <button
                type="button"
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
                className="cine-press inline-flex h-11 items-center gap-2 bg-accent px-6 text-sm font-medium text-accent-foreground disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {generate.isPending ? "Queuing…" : "Generate your first video"}
              </button>
            }
          />
        ) : view === "list" ? (
          <ListView videos={videos} onSelect={setSelectedId} />
        ) : (
          <CalendarView videos={videos} onSelect={setSelectedId} />
        )}
      </div>


      {selected && (
        <DetailModal
          video={selected}
          onClose={() => setSelectedId(null)}
          onRetry={() => retryMut.mutate(selected.id)}
          retrying={retryMut.isPending}
          onPublish={() => publishMut.mutate(selected.id)}
          publishing={publishMut.isPending}
        />
      )}
    </div>
  );
}

function ListView({
  videos,
  onSelect,
}: {
  videos: Video[];
  onSelect: (id: string) => void;
}) {
  if (videos.length === 0) return null;
  return (
    <ul className="divide-y divide-hairline border border-hairline bg-surface">
      {videos.map((v) => (
        <li key={v.id}>
          <button
            type="button"
            onClick={() => onSelect(v.id)}
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-background/40 sm:grid-cols-[1fr_auto_auto] sm:gap-6 sm:px-5"
          >
            <div className="min-w-0">
              <div className="truncate text-sm text-foreground">
                {v.title ?? "Untitled"}
              </div>
              <div className="mt-1 truncate text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {v.niche ?? "—"} ·{" "}
                {v.scheduled_for
                  ? new Date(v.scheduled_for).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Unscheduled"}
              </div>

            </div>
            <div className="hidden text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
              {v.quality_tier ?? "—"}
            </div>

            <StatusBadge status={v.status} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function CalendarView({
  videos,
  onSelect,
}: {
  videos: Video[];
  onSelect: (id: string) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const { days, monthLabel } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ date: Date | null }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ date: new Date(year, month, d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return {
      days: cells,
      monthLabel: first.toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      }),
    };
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Video[]>();
    for (const v of videos) {
      const t = v.scheduled_for ?? v.posted_at;
      if (!t) continue;
      const d = new Date(t);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(v);
      map.set(key, arr);
    }
    return map;
  }, [videos]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <div className="border border-hairline bg-surface">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <div className="font-display text-2xl tracking-[0.1em] text-foreground">
          {monthLabel.toUpperCase()}
        </div>
        <div className="flex gap-1">
          {(["prev", "today", "next"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                const d = new Date(cursor);
                if (k === "prev") d.setMonth(d.getMonth() - 1);
                else if (k === "next") d.setMonth(d.getMonth() + 1);
                else {
                  d.setFullYear(today.getFullYear());
                  d.setMonth(today.getMonth());
                }
                d.setDate(1);
                setCursor(d);
              }}
              className="border border-hairline px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-hairline">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((cell, i) => {
          if (!cell.date)
            return <div key={i} className="h-28 border-b border-r border-hairline/50 bg-background/30" />;
          const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
          const items = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              key={i}
              className={`h-28 border-b border-r border-hairline/50 p-2 ${
                isToday ? "bg-accent/5" : ""
              }`}
            >
              <div
                className={`mb-1 text-[11px] ${
                  isToday ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {cell.date.getDate()}
              </div>
              <div className="space-y-1">
                {items.slice(0, 2).map((v) => {
                  const m = STATUS_META[v.status] ?? STATUS_META.queued;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onSelect(v.id)}
                      className={`flex w-full items-center gap-1.5 truncate border px-1.5 py-0.5 text-left text-[10px] ${m.bg} ${m.text}`}
                    >
                      <span className={`h-1 w-1 shrink-0 rounded-full ${m.dot}`} />
                      <span className="truncate">{v.title}</span>
                    </button>
                  );
                })}
                {items.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{items.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailModal({
  video,
  onClose,
  onRetry,
  retrying,
  onPublish,
  publishing,
}: {
  video: Video;
  onClose: () => void;
  onRetry: () => void;
  retrying: boolean;
  onPublish: () => void;
  publishing: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-3xl overflow-auto border border-hairline bg-surface"
      >
        <div className="flex items-start justify-between gap-6 border-b border-hairline p-6">
          <div className="min-w-0">
            <div className="label-eyebrow">{video.niche ?? "Untitled niche"}</div>
            <h2 className="display mt-2 text-2xl text-foreground">
              {video.title ?? "Untitled"}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <StatusBadge status={video.status} />
              <span>· {video.quality_tier ?? "standard"}</span>
              <span>· {video.caption_style ?? "—"} captions</span>
              <span>· {video.cost_credits} credits</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-hairline px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[200px_1fr]">
          <div>
            <div className="label-eyebrow mb-2">Thumbnail</div>
            <div className="aspect-[9/16] w-full overflow-hidden border border-hairline bg-background">
              {video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/20 via-background to-background">
                  <span className="font-display text-3xl tracking-[0.15em] text-accent/60">
                    FC
                  </span>
                </div>
              )}
            </div>

            <dl className="mt-4 space-y-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <div>
                <dt>Scheduled</dt>
                <dd className="mt-1 text-foreground/80 normal-case tracking-normal">
                  {video.scheduled_for
                    ? new Date(video.scheduled_for).toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Posted</dt>
                <dd className="mt-1 text-foreground/80 normal-case tracking-normal">
                  {video.posted_at
                    ? new Date(video.posted_at).toLocaleString()
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            {video.status === "failed" && video.error_message && (
              <div className="mb-4 border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                <div className="label-eyebrow mb-1 text-rose-300">Failure</div>
                {video.error_message}
              </div>
            )}
            <div className="label-eyebrow mb-2">Script preview</div>
            <div className="border border-hairline bg-background p-4 text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
              {video.status === "generating_script" ? (
                <span className="text-muted-foreground">Writing your script…</span>
              ) : video.script_text ? (
                video.script_text
              ) : (
                <span className="text-muted-foreground">
                  Script hasn't been generated yet.
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {video.video_url && (
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block border border-hairline px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground hover:border-accent hover:text-accent"
                >
                  Open render
                </a>
              )}
              {video.status === "ready" && video.channel_id && !video.youtube_video_id && (
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={publishing}
                  className="inline-block border border-accent bg-accent px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-accent-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {publishing ? "Publishing…" : "Publish to YouTube"}
                </button>
              )}
              {video.youtube_video_id && (
                <a
                  href={`https://youtube.com/watch?v=${video.youtube_video_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block border border-emerald-500/40 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-emerald-300 hover:bg-emerald-500/10"
                >
                  View on YouTube
                </a>
              )}
              {(video.status === "failed" || video.status === "queued") && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={retrying}
                  className="inline-block border border-hairline px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {retrying ? "Retrying…" : video.status === "failed" ? "Retry" : "Generate script"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
