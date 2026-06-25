import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getChannels } from "@/lib/profile.functions";
import { toast } from "sonner";
import { Youtube, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/channels")({
  component: ChannelsPage,
});

function ChannelsPage() {
  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: () => getChannels(),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow">Channels</div>
          <h1 className="display mt-4 text-4xl text-foreground lg:text-5xl">
            Your connected channels.
          </h1>
        </div>
      </div>

      <div className="mt-10 border border-hairline bg-surface p-10">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center border border-hairline bg-background">
              <Youtube className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl tracking-[0.1em] text-foreground">
                CONNECT YOUR YOUTUBE CHANNEL
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Authorize Framecast to publish videos on your behalf. Real OAuth
                is wiring up — coming soon.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast("OAuth coming soon", { description: "We'll let you know the moment it ships." })}
            className="inline-flex h-11 shrink-0 items-center gap-2 bg-accent px-5 text-sm font-medium text-accent-foreground transition-all hover:shadow-[0_0_30px_-6px_var(--color-accent-glow)]"
          >
            <Plus className="h-4 w-4" />
            Connect YouTube
          </button>
        </div>
      </div>

      <div className="mt-12">
        <div className="label-eyebrow">Existing channels</div>
        {channels.length === 0 ? (
          <div className="mt-4 border border-dashed border-hairline bg-surface/40 p-10 text-center text-sm text-muted-foreground">
            No channels connected yet.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border border-hairline bg-surface">
            {channels.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <div className="text-foreground">{c.name ?? "Untitled channel"}</div>
                  <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    {c.provider} · {c.status}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
