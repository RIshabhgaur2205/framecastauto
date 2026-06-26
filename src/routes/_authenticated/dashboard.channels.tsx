import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getChannels } from "@/lib/profile.functions";
import {
  startYoutubeConnect,
  disconnectChannel,
} from "@/lib/youtube.functions";
import { toast } from "sonner";
import { Youtube, Plus, Link2Off, CheckCircle2 } from "lucide-react";
import { ConnectionConfirmDialog } from "@/components/channels/ConnectionConfirmDialog";
import { CineSkeletonRows, EmptyState } from "@/components/ui/cine-skeleton";

export const Route = createFileRoute("/_authenticated/dashboard/channels")({
  component: ChannelsPage,
});

function ChannelsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const start = useServerFn(startYoutubeConnect);
  const disconnect = useServerFn(disconnectChannel);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    name: string;
    channelId: string | null;
    scope: string;
  }>({ open: false, name: "", channelId: null, scope: "" });

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: () => getChannels(),
  });


  // Surface OAuth callback result from query params.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("yt_connected");
    const channelId = params.get("yt_channel_id");
    const scope = params.get("yt_scope") ?? "";
    const err = params.get("yt_error");
    if (connected) {
      setConfirm({ open: true, name: connected, channelId, scope });
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
  const confirmThumb =
    ytChannels.find((c) => c.channel_id === confirm.channelId)?.thumbnail_url ?? null;

  return (
    <div className="mx-auto max-w-5xl">
      <ConnectionConfirmDialog
        open={confirm.open}
        onOpenChange={(o) => setConfirm((c) => ({ ...c, open: o }))}
        channelName={confirm.name}
        thumbnailUrl={confirmThumb}
        scope={confirm.scope}
      />

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
            className="cine-press inline-flex h-11 shrink-0 items-center gap-2 bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {connectMut.isPending ? "Redirecting…" : "Connect YouTube"}
          </button>
        </div>
      </div>

      <div className="mt-12">
        <div className="label-eyebrow">Connected channels</div>
        {isLoading ? (
          <div className="mt-4">
            <CineSkeletonRows rows={2} />
          </div>
        ) : ytChannels.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Youtube className="h-5 w-5" />}
              title="No channels connected"
              description="Link your first YouTube channel so Framecast can publish on your schedule."
              action={
                <button
                  type="button"
                  onClick={() => connectMut.mutate()}
                  disabled={connectMut.isPending}
                  className="cine-press inline-flex h-11 items-center gap-2 bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Connect your first channel
                </button>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border border-hairline bg-surface">
            {ytChannels.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 transition-colors hover:bg-background/40"
              >
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
                    <div className="flex items-center gap-2 truncate text-sm text-foreground">
                      <span className="truncate">{c.channel_name ?? c.name ?? "Untitled channel"}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                    </div>
                    <div className="mt-1 truncate text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
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
                  className="inline-flex shrink-0 items-center gap-1.5 border border-hairline px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:border-rose-500/40 hover:text-rose-300"
                >
                  <Link2Off className="h-3 w-3" />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
