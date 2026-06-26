import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Youtube, Check, X, AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelName: string;
  thumbnailUrl?: string | null;
  scope: string;
};

const SCOPES: { key: string; label: string; required?: boolean }[] = [
  { key: "youtube.upload", label: "Upload videos to your channel", required: true },
  { key: "youtube.readonly", label: "Read channel data" },
  { key: "youtube.force-ssl", label: "Manage captions on uploads" },
];

export function ConnectionConfirmDialog({
  open,
  onOpenChange,
  channelName,
  thumbnailUrl,
  scope,
}: Props) {
  const navigate = useNavigate();
  const granted = (s: string) => scope.split(/\s+/).some((p) => p.endsWith(s));
  const missingRequired = SCOPES.some((s) => s.required && !granted(s.key));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-hairline bg-surface p-0">
        <div className="border-b border-hairline px-8 py-8 text-center">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                className="h-20 w-20 rounded-full border border-hairline object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full border border-hairline bg-background">
                <Youtube className="h-8 w-8 text-accent" />
              </div>
            )}
          </div>
          <div className="label-eyebrow text-accent">Channel connected</div>
          <DialogTitle className="font-display mt-3 text-2xl tracking-[0.08em] text-foreground">
            {channelName}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Framecast is linked and ready to publish.
          </DialogDescription>
        </div>

        <div className="px-8 py-6">
          <div className="label-eyebrow mb-4">Permissions granted</div>
          <ul className="space-y-3">
            {SCOPES.map((s) => {
              const ok = granted(s.key);
              return (
                <li key={s.key} className="flex items-start gap-3 text-sm">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      ok
                        ? "border-accent/50 bg-accent/10 text-accent"
                        : "border-hairline bg-background text-muted-foreground"
                    }`}
                  >
                    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0">
                    <div className={ok ? "text-foreground" : "text-muted-foreground line-through"}>
                      {s.label}
                    </div>
                    {s.required && !ok && (
                      <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400">
                        Required
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {missingRequired && (
            <div className="mt-5 flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Upload scope wasn't granted. Reconnect and tick the YouTube upload
                permission so Framecast can publish on your behalf.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-hairline px-8 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
          >
            Done
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/dashboard/queue" });
            }}
            className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-all hover:shadow-[0_0_30px_-6px_var(--color-accent-glow)]"
          >
            Go to Content Queue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
