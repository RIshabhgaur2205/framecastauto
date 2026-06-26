// Server-only publishing orchestrator. Dynamic-import only.
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function runPublishForVideo(videoId: string, userId: string) {
  const supabase = admin();
  const fail = async (msg: string) => {
    await supabase
      .from("videos")
      .update({ status: "failed", publish_error: msg.slice(0, 500) })
      .eq("id", videoId);
  };

  try {
    const { data: video, error: vErr } = await supabase
      .from("videos")
      .select("id, user_id, channel_id, video_url, title, script_text, srt_text, niche, status")
      .eq("id", videoId)
      .eq("user_id", userId)
      .maybeSingle();
    if (vErr) throw new Error(vErr.message);
    if (!video) throw new Error("Video not found");
    if (!video.video_url) throw new Error("Video has no rendered MP4 yet");
    if (!video.channel_id) throw new Error("Video has no linked channel");

    const { data: channel, error: cErr } = await supabase
      .from("channels")
      .select("id, channel_id, oauth_refresh_token")
      .eq("id", video.channel_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!channel?.oauth_refresh_token)
      throw new Error("Channel not connected to YouTube");

    await supabase.from("videos").update({ status: "publishing", publish_error: null }).eq("id", videoId);

    const { refreshAccessToken, uploadVideoToYoutube, uploadCaptionTrack } = await import(
      "./youtube.server"
    );
    const { access_token, expires_in } = await refreshAccessToken(
      channel.oauth_refresh_token,
    );
    await supabase
      .from("channels")
      .update({
        oauth_access_token: access_token,
        oauth_expires_at: new Date(Date.now() + (expires_in - 60) * 1000).toISOString(),
      })
      .eq("id", channel.id);

    const title = video.title || `Framecast · ${video.niche ?? "Short"}`;
    const description = (video.script_text ?? "").slice(0, 4500);

    const ytId = await uploadVideoToYoutube({
      accessToken: access_token,
      videoUrl: video.video_url,
      title,
      description,
      privacyStatus: "private",
    });

    if (video.srt_text) {
      await uploadCaptionTrack({
        accessToken: access_token,
        youtubeVideoId: ytId,
        srt: video.srt_text,
      });
    }

    await supabase
      .from("videos")
      .update({
        status: "posted",
        youtube_video_id: ytId,
        published_at: new Date().toISOString(),
        posted_at: new Date().toISOString(),
        publish_error: null,
      })
      .eq("id", videoId);

    return { ok: true, youtube_video_id: ytId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await fail(msg);
    throw e;
  }
}
