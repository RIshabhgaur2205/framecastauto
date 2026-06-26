import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Film, Sparkles, Tv, CalendarClock } from "lucide-react";
import { listVideos } from "@/lib/videos.functions";
import { getChannels } from "@/lib/profile.functions";
import { CineSkeleton } from "@/components/ui/cine-skeleton";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: OverviewPage,
});

function OverviewPage() {
  const { data: videos = [], isLoading: vLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: () => listVideos(),
  });
  const { data: channels = [], isLoading: cLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: () => getChannels(),
  });

  const loading = vLoading || cLoading;
  const generated = videos.length;
  const posted = videos.filter((v) => v.status === "posted").length;
  const connected = channels.filter((c) => c.provider === "youtube").length;
  const empty = generated === 0 && connected === 0;

  const stats = [
    { value: generated, label: "Videos generated", icon: Sparkles },
    { value: posted, label: "Videos posted", icon: Film },
    { value: connected, label: "Channels connected", icon: Tv },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="label-eyebrow">Overview</div>
      <h1 className="display mt-4 text-4xl text-foreground sm:text-5xl lg:text-7xl">
        {empty ? "Your studio is quiet." : "Your studio is running."}
      </h1>
      <p className="mt-4 max-w-lg text-sm text-muted-foreground">
        {empty
          ? "Connect a channel and queue your first video to start filling the schedule."
          : "Pipeline live — track everything in the content queue."}
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          to="/dashboard/queue"
          className="cine-press group inline-flex h-11 items-center gap-2 bg-accent px-6 text-sm font-medium text-accent-foreground"
        >
          {empty ? "Generate your first video" : "Open content queue"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        {connected === 0 && (
          <Link
            to="/dashboard/channels"
            className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-accent"
          >
            <Tv className="h-3.5 w-3.5" />
            Connect a channel
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>

      <div className="mt-16 grid gap-px bg-hairline sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="cine-hover bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-5xl text-foreground">
                  {loading ? <CineSkeleton className="h-10 w-16" /> : s.value}
                </span>
                <Icon className="h-4 w-4 text-accent/60" />
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-16 grid gap-px bg-hairline sm:grid-cols-2">
        <Link
          to="/dashboard/queue"
          className="cine-hover group flex items-start justify-between gap-4 bg-surface p-6"
        >
          <div>
            <div className="label-eyebrow">Content queue</div>
            <div className="mt-3 font-display text-2xl tracking-[0.08em] text-foreground">
              REVIEW SLATE
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              See every video Framecast is writing, rendering, and shipping.
            </div>
          </div>
          <CalendarClock className="h-5 w-5 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          to="/dashboard/channels"
          className="cine-hover group flex items-start justify-between gap-4 bg-surface p-6"
        >
          <div>
            <div className="label-eyebrow">Channels</div>
            <div className="mt-3 font-display text-2xl tracking-[0.08em] text-foreground">
              MANAGE
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Link YouTube channels so Framecast can publish on your behalf.
            </div>
          </div>
          <Tv className="h-5 w-5 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
