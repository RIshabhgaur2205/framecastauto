import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getChannels } from "@/lib/profile.functions";
import {
  startYoutubeConnect,
  disconnectChannel,
} from "@/lib/youtube.functions";
import { toast } from "sonner";
import { Youtube, Plus, Link2Off, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/channels")({
  component: ChannelsPage,
});

function ChannelsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const start = useServerFn(startYoutubeConnect);
  const disconnect = useServerFn(disconnectChannel);

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: () => getChannels(),
  });

  // Surface OAuth callback result from query params.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("yt_connected");
    const err = params.get("yt_error");
    if (connected) {
      toast.success(`Connected ${connected}`, {
        description: "Framecast can now publish to this channel.",
      });
      qc.invalidateQueries({ queryKey: ["channels"] });
    }
    if (err) toast.error("YouTube connect failed", { description: err });
    if (connected || err) {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  }, [qc]);

  const connectMut = useMutation({
    mutationFn: async () => {
      const { url } = await start({ data: { origin: window.location.origin } });
      window.location.href = url;
    },
  });

  const disconnectMut = useMutation({
    mutationFn: async (id: string) => disconnect({ data: { channel_id: id } }),
    onSuccess: () => {
      toast.success("Channel disconnected");
      qc.invalidateQueries({ queryKey: ["channels"] });
      router.invalidate();
    },
    onError: (e) => toast.error("Could not disconnect", { description: String(e) }),
  });

  const ytChannels = channels.filter((c) => c.provider === "youtube");

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
                CONNECT A YOUTUBE CHANNEL
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Authorize Framecast to upload videos and captions on your behalf.
                Refresh tokens are encrypted at rest.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending}
            className="inline-flex h-11 shrink-0 items-center gap-2 bg-accent px-5 text-sm font-medium text-accent-foreground transition-all hover:shadow-[0_0_30px_-6px_var(--color-accent-glow)] disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {connectMut.isPending ? "Redirecting…" : "Connect YouTube"}
          </button>
        </div>
      </div>

      <div className="mt-12">
        <div className="label-eyebrow">Connected channels</div>
        {ytChannels.length === 0 ? (
          <div className="mt-4 border border-dashed border-hairline bg-surface/40 p-10 text-center text-sm text-muted-foreground">
            No channels connected yet.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border border-hairline bg-surface">
            {ytChannels.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  {c.thumbnail_url ? (
                    <img
                      src={c.thumbnail_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full border border-hairline object-cover"
                    />
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-hairline bg-background">
                      <Youtube className="h-4 w-4 text-accent" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      {c.channel_name ?? c.name ?? "Untitled channel"}
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      YouTube · {c.status}
                      {c.connected_at
                        ? ` · since ${new Date(c.connected_at).toLocaleDateString()}`
                        : ""}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => disconnectMut.mutate(c.id)}
                  disabled={disconnectMut.isPending}
                  className="inline-flex items-center gap-1.5 border border-hairline px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:border-rose-500/40 hover:text-rose-300"
                >
                  <Link2Off className="h-3 w-3" />
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
