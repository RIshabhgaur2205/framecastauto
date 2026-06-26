import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const startYoutubeConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { buildAuthUrl } = await import("./youtube.server");
    const { encryptToken } = await import("./crypto.server");
    const state = encryptToken(
      JSON.stringify({ u: context.userId, e: Date.now() + 10 * 60 * 1000 }),
    );
    return { url: buildAuthUrl(data.origin, state) };
  });

export const disconnectChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ channel_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("channels")
      .delete()
      .eq("id", data.channel_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const publishVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ video_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { runPublishForVideo } = await import("./publish.server");
    return runPublishForVideo(data.video_id, context.userId);
  });
