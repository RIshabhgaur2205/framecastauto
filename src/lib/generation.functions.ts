import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({ video_id: z.string().uuid() });

type Prefs = {
  niche: string | null;
  niche_custom: string | null;
  quality_tier: string | null;
  caption_style: string | null;
  brand_voice_notes: string | null;
};

function buildPrompt(
  video: { title: string | null; niche: string | null; quality_tier: string | null },
  prefs: Prefs | null,
) {
  const niche = video.niche ?? prefs?.niche_custom ?? prefs?.niche ?? "general";
  const tier = video.quality_tier ?? prefs?.quality_tier ?? "standard";
  const voice =
    prefs?.brand_voice_notes?.trim() ||
    "Direct, confident, no fluff. Conversational but sharp.";
  const lengthHint =
    tier === "premium"
      ? "Target ~60-75 seconds of spoken voiceover (around 170-210 words)."
      : "Target ~35-45 seconds of spoken voiceover (around 100-130 words).";

  return {
    system:
      "You are a senior short-form video scriptwriter for vertical YouTube Shorts. You write tight, hook-first scripts optimized for retention. Output ONLY the spoken script, no stage directions, no scene labels, no markdown. Start with a punchy hook in the first sentence.",
    user: `Write a short-form vertical video script.

Niche: ${niche}
Working title: ${video.title ?? "(no title yet — invent one in the hook)"}
Brand voice: ${voice}
Quality tier: ${tier}

${lengthHint}

Constraints:
- Open with a 6-12 word hook that creates a curiosity gap.
- One idea per sentence. Conversational. No "Hey guys" or generic intros.
- Land a clear payoff or insight by the end.
- No emojis, no hashtags, no music cues, no captions — just the spoken words.`,
  };
}

async function callLLM(system: string, user: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing on server");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new Error("Rate limit exceeded. Please retry shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const out = json.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error("Empty response from AI");
  return out;
}

export const generateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const fail = async (msg: string) => {
      await supabase
        .from("videos")
        .update({ status: "failed", error_message: msg.slice(0, 500) })
        .eq("id", data.video_id)
        .eq("user_id", userId);
    };

    try {
      const { data: video, error: vErr } = await supabase
        .from("videos")
        .select("id, title, niche, quality_tier, caption_style, script_text")
        .eq("id", data.video_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (vErr) throw new Error(vErr.message);
      if (!video) throw new Error("Video not found");

      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("niche, niche_custom, quality_tier, caption_style, brand_voice_notes")
        .eq("user_id", userId)
        .maybeSingle();

      const tier = (video.quality_tier ?? prefs?.quality_tier ?? "standard") as
        | "standard"
        | "premium";
      const captionStyle =
        (video.caption_style ?? prefs?.caption_style ?? "bold") as string;

      // 1) SCRIPT
      let script = video.script_text;
      if (!script) {
        await supabase
          .from("videos")
          .update({ status: "generating_script", error_message: null })
          .eq("id", video.id);
        const { system, user } = buildPrompt(video, prefs as Prefs | null);
        script = await callLLM(system, user);
        await supabase
          .from("videos")
          .update({ status: "script_ready", script_text: script })
          .eq("id", video.id);
      }

      // Niche keyword for stock visuals
      const nicheKeyword =
        video.niche ?? prefs?.niche_custom ?? prefs?.niche ?? "cinematic";

      // Dynamic-load server-only deps
      const {
        synthesizeVoiceover,
        transcribeForCaptions,
        wordsToSrt,
        fetchStockClips,
        submitShotstackRender,
      } = await import("./pipeline.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 2) VOICEOVER
      await supabase
        .from("videos")
        .update({ status: "generating_voiceover", error_message: null })
        .eq("id", video.id);
      const audioBuf = await synthesizeVoiceover(script);
      const audioPath = `${userId}/voice/${video.id}.mp3`;
      const up1 = await supabaseAdmin.storage
        .from("video-assets")
        .upload(audioPath, audioBuf, { contentType: "audio/mpeg", upsert: true });
      if (up1.error) throw new Error(`Voice upload: ${up1.error.message}`);
      const signedVoice = await supabaseAdmin.storage
        .from("video-assets")
        .createSignedUrl(audioPath, 60 * 60 * 24);
      if (signedVoice.error || !signedVoice.data?.signedUrl)
        throw new Error("Could not sign voice URL");
      const voiceoverUrl = signedVoice.data.signedUrl;

      // 3) CAPTIONS (always — store JSON + SRT)
      await supabase
        .from("videos")
        .update({ status: "generating_captions" })
        .eq("id", video.id);
      const { words, duration } = await transcribeForCaptions(audioBuf);
      const srt = wordsToSrt(words);
      const srtPath = `${userId}/srt/${video.id}.srt`;
      await supabaseAdmin.storage
        .from("video-assets")
        .upload(srtPath, new Blob([srt], { type: "application/x-subrip" }), {
          contentType: "application/x-subrip",
          upsert: true,
        });

      await supabase
        .from("videos")
        .update({
          voiceover_url: voiceoverUrl,
          captions_json: words,
          srt_text: srt,
          duration_seconds: duration,
        })
        .eq("id", video.id);

      // 4) STOCK CLIPS (both tiers — premium also gets a rendered MP4)
      await supabase
        .from("videos")
        .update({ status: "sourcing_visuals" })
        .eq("id", video.id);
      const clips = await fetchStockClips(nicheKeyword, 4);
      await supabase
        .from("videos")
        .update({ stock_clips: clips })
        .eq("id", video.id);

      // 5) RENDER via Shotstack.
      // Premium: no burn-in (SRT goes up as a native YouTube caption track).
      // Standard: burn-in captions.
      await supabase
        .from("videos")
        .update({ status: "rendering" })
        .eq("id", video.id);
      const renderId = await submitShotstackRender({
        voiceUrl: voiceoverUrl,
        clips,
        captions: tier === "premium" ? [] : words,
        totalDuration: duration || 30,
        captionStyle,
      });
      await supabase
        .from("videos")
        .update({ shotstack_render_id: renderId })
        .eq("id", video.id);

      return { ok: true, tier, renderId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await fail(msg);
      throw e;
    }
  });

// Polled from the queue UI while status === "rendering"
export const pollRender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: video, error } = await supabase
      .from("videos")
      .select("id, shotstack_render_id, status")
      .eq("id", data.video_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!video?.shotstack_render_id) return { status: video?.status ?? "unknown" };
    if (video.status === "ready" || video.status === "posted") {
      return { status: video.status };
    }

    const { fetchShotstackStatus } = await import("./pipeline.server");
    const r = await fetchShotstackStatus(video.shotstack_render_id);

    if (r.status === "done" && r.url) {
      await supabase
        .from("videos")
        .update({ status: "ready", video_url: r.url, error_message: null })
        .eq("id", video.id);
      return { status: "ready", video_url: r.url };
    }
    if (r.status === "failed") {
      await supabase
        .from("videos")
        .update({ status: "failed", error_message: "Render failed in Shotstack" })
        .eq("id", video.id);
      return { status: "failed" };
    }
    return { status: "rendering", remote: r.status };
  });

export const retryVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("videos")
      .update({ status: "queued", error_message: null })
      .eq("id", data.video_id)
      .eq("user_id", context.userId);
    return { ok: true };
  });
