import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

export type UploadedVideoPayload = {
  title: string;
  description?: string;
  video_url: string;
  storage_path: string;
  scheduled_for?: string | null;
  publishNow: boolean;
};

export function UploadVideoModal({
  onCancel,
  onConfirm,
  submitting,
}: {
  onCancel: () => void;
  onConfirm: (payload: UploadedVideoPayload) => void;
  submitting: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [uploading, setUploading] = useState(false);
  const busy = uploading || submitting;

  const pick = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast.error("Pick a video file (MP4 or MOV)");
      return;
    }
    if (f.size > 300 * 1024 * 1024) {
      toast.error(`${f.name} is over 300MB`);
      return;
    }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = async () => {
    if (!file) {
      toast.error("Choose a video file first");
      return;
    }
    if (!title.trim()) {
      toast.error("Give the video a title");
      return;
    }
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Not signed in");

      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${uid}/uploads/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("video-assets")
        .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
      if (up.error) throw new Error(up.error.message);

      const signed = await supabase.storage
        .from("video-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!signed.data?.signedUrl) throw new Error("Could not sign the upload URL");

      onConfirm({
        title: title.trim(),
        description: description.trim() || undefined,
        video_url: signed.data.signedUrl,
        storage_path: path,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        publishNow,
      });
    } catch (e) {
      toast.error("Upload failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={() => !busy && onCancel()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto border border-hairline bg-surface"
      >
        <div className="border-b border-hairline p-6">
          <div className="label-eyebrow">Upload your own</div>
          <h2 className="display mt-2 text-2xl text-foreground">Post a finished video.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload an MP4 you already made and publish it to your connected
            YouTube channel — now or on a schedule.
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <div className="label-eyebrow">Video file</div>
            <label className="mt-3 flex cursor-pointer items-center gap-3 border border-dashed border-hairline bg-background px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground">
              <Upload className="h-4 w-4 shrink-0 text-accent" />
              <span className="truncate">
                {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)}MB` : "Choose an MP4 or MOV (max 300MB)"}
              </span>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div>
            <div className="label-eyebrow">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder="How I shot this in one take"
              className="mt-3 w-full border border-hairline bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent/60"
            />
          </div>

          <div>
            <div className="label-eyebrow">Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Optional YouTube description."
              className="mt-3 w-full resize-none border border-hairline bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(
              [
                { key: true, label: "Publish now" },
                { key: false, label: "Schedule" },
              ] as const
            ).map((o) => (
              <button
                key={String(o.key)}
                type="button"
                onClick={() => setPublishNow(o.key)}
                className={`border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-colors ${
                  publishNow === o.key
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-hairline text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {!publishNow && (
            <div>
              <div className="label-eyebrow">Publish at</div>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="mt-3 w-full border border-hairline bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent/60"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-hairline p-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-1.5 border border-hairline px-4 py-2.5 text-[11px] uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="cine-press border border-accent bg-accent px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] text-accent-foreground disabled:opacity-50"
          >
            {uploading ? "Uploading…" : submitting ? "Working…" : publishNow ? "Upload & publish" : "Upload & schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
