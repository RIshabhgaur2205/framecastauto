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

const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", hi: "Hindi", fr: "French", de: "German",
  pt: "Portuguese", it: "Italian", ja: "Japanese", ar: "Arabic", zh: "Mandarin Chinese",
  ru: "Russian", ko: "Korean", tr: "Turkish", id: "Indonesian",
};

const STYLE_BRIEFS: Record<string, string> = {
  cinematic: "Cinematic, evocative, slightly poetic. Visual language. Slow burns into a payoff. Think A24 trailer voiceover.",
  advertisement: "Punchy ad copy. Benefit-led. Hook, problem, solution, single clear CTA at the end.",
  documentary: "Calm, authoritative, narrated like a documentary. Use specifics, dates, numbers. No hype words.",
  vlog: "First-person, casual, talking-to-a-friend. Natural rhythm. Light humor allowed.",
  educational: "Clear teacher voice. State the concept, give one concrete example, summarize the takeaway.",
  news: "Neutral broadcast tone. Lead with the most important fact. Short declarative sentences.",
  storytime: "Narrative arc — setup, twist, resolution. Past tense. Build suspense before the reveal.",
  explainer: "Curious, accessible. Break a complex idea into 2-3 simple beats. End with a 'so what'.",
};

function buildPrompt(
  video: { title: string | null; niche: string | null; quality_tier: string | null; language?: string | null; video_style?: string | null },
  prefs: Prefs | null,
) {
  const niche = video.niche ?? prefs?.niche_custom ?? prefs?.niche ?? "general";
  const tier = video.quality_tier ?? prefs?.quality_tier ?? "standard";
  const voice =
    prefs?.brand_voice_notes?.trim() ||
    "Direct, confident, no fluff. Conversational but sharp.";
  const lang = (video.language ?? "en").toLowerCase();
  const langName = LANG_NAMES[lang] ?? "English";
  const style = (video.video_style ?? "cinematic").toLowerCase();
  const styleBrief = STYLE_BRIEFS[style] ?? STYLE_BRIEFS.cinematic;
  const lengthHint =
    tier === "premium"
      ? "Target ~60-75 seconds of spoken voiceover."
      : "Target ~35-45 seconds of spoken voiceover.";

  return {
    system:
      `You are a senior short-form video scriptwriter for vertical YouTube Shorts. You write tight, hook-first scripts optimized for retention. Output ONLY the spoken script in ${langName}, no stage directions, no scene labels, no markdown, no translation, no transliteration. Start with a punchy hook in the first sentence.`,
    user: `Write a short-form vertical video script.

Output language: ${langName} (write the entire script natively in ${langName}; do not include any other language).
Style: ${style} — ${styleBrief}
Niche: ${niche}
Working title: ${video.title ?? "(no title yet — invent one in the hook)"}
Brand voice: ${voice}
Quality tier: ${tier}

${lengthHint}

Constraints:
- Open with a short hook that creates a curiosity gap.
- One idea per sentence. Match the ${style} style throughout.
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
        .select(
          "id, title, niche, quality_tier, caption_style, language, video_style, script_text, voiceover_url, captions_json, srt_text, duration_seconds, stock_clips",
        )
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

      // 1) SCRIPT — resume if already generated
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
        fetchStockClipsForQueries,
        submitShotstackRender,
      } = await import("./pipeline.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const audioPath = `${userId}/voice/${video.id}.mp3`;

      // 2) VOICEOVER — resume if mp3 already in storage
      let voiceoverUrl = video.voiceover_url as string | null;
      let audioBuf: ArrayBuffer | null = null;
      const existingVoice = await supabaseAdmin.storage
        .from("video-assets")
        .download(audioPath);
      if (existingVoice.data && voiceoverUrl) {
        audioBuf = await existingVoice.data.arrayBuffer();
      } else {
        await supabase
          .from("videos")
          .update({ status: "generating_voiceover", error_message: null })
          .eq("id", video.id);
        audioBuf = await synthesizeVoiceover(script);
        const up1 = await supabaseAdmin.storage
          .from("video-assets")
          .upload(audioPath, audioBuf, { contentType: "audio/mpeg", upsert: true });
        if (up1.error) throw new Error(`Voice upload: ${up1.error.message}`);
        const signedVoice = await supabaseAdmin.storage
          .from("video-assets")
          .createSignedUrl(audioPath, 60 * 60 * 24);
        if (signedVoice.error || !signedVoice.data?.signedUrl)
          throw new Error("Could not sign voice URL");
        voiceoverUrl = signedVoice.data.signedUrl;
        await supabase
          .from("videos")
          .update({ voiceover_url: voiceoverUrl })
          .eq("id", video.id);
      }

      // 3) CAPTIONS — resume if already transcribed
      let durationSec = (video.duration_seconds as number | null) ?? 0;
      const srtPath = `${userId}/srt/${video.id}.srt`;
      const hasCaptions =
        Array.isArray(video.captions_json) &&
        (video.captions_json as unknown[]).length > 0 &&
        !!video.srt_text;
      if (!hasCaptions) {
        await supabase
          .from("videos")
          .update({ status: "generating_captions", error_message: null })
          .eq("id", video.id);
        const { words, duration } = await transcribeForCaptions(audioBuf!);
        const srt = wordsToSrt(words);
        await supabaseAdmin.storage
          .from("video-assets")
          .upload(srtPath, new Blob([srt], { type: "application/x-subrip" }), {
            contentType: "application/x-subrip",
            upsert: true,
          });
        durationSec = duration;
        await supabase
          .from("videos")
          .update({
            captions_json: words,
            srt_text: srt,
            duration_seconds: duration,
          })
          .eq("id", video.id);
      }

      // 4) STOCK CLIPS — resume if already sourced. Otherwise, extract a
      //    visual keyword per ~5s of script so each scene matches its line.
      let stockClips = (video.stock_clips as unknown as
        | Array<{ url: string; preview: string; duration: number }>
        | null) ?? null;
      if (!stockClips || !stockClips.length) {
        await supabase
          .from("videos")
          .update({ status: "sourcing_visuals", error_message: null })
          .eq("id", video.id);

        const sceneCount = Math.max(4, Math.min(10, Math.round((durationSec || 30) / 5)));
        let queries: string[] = [];
        try {
          const raw = await callLLM(
            "You convert a short voiceover script into stock-footage search keywords. Output ONLY a JSON array of strings, no prose.",
            `Script:\n"""${script}"""\n\nReturn exactly ${sceneCount} short Pexels search queries (2-4 words each) that visually match the script in order. Prefer concrete, filmable subjects (people, places, objects, actions) over abstract concepts. No hashtags, no quotes inside strings.`,
          );
          const match = raw.match(/\[[\s\S]*\]/);
          if (match) {
            const arr = JSON.parse(match[0]) as unknown;
            if (Array.isArray(arr)) {
              queries = arr
                .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
                .map((s) => s.trim())
                .slice(0, sceneCount);
            }
          }
        } catch {
          // fall through to niche-only
        }
        if (!queries.length) queries = Array(sceneCount).fill(nicheKeyword);

        stockClips = await fetchStockClipsForQueries(queries, nicheKeyword);
        await supabase
          .from("videos")
          .update({ stock_clips: stockClips })
          .eq("id", video.id);
      }

      // 5) SHOTSTACK RENDER — submit and let the client poll
      const signedSrt = await supabaseAdmin.storage
        .from("video-assets")
        .createSignedUrl(srtPath, 60 * 60 * 24);
      const srtUrl = signedSrt.data?.signedUrl ?? null;

      // Premium tier skips burned-in captions (YouTube will use the SRT separately).
      const burnCaptions = tier !== "premium";

      const renderId = await submitShotstackRender({
        voiceoverUrl: voiceoverUrl!,
        srtUrl,
        clips: stockClips!,
        duration: durationSec || 30,
        captionStyle: (captionStyle as "bold" | "minimal" | "neon" | "subtle") ?? "bold",
        burnCaptions,
      });

      await supabase
        .from("videos")
        .update({
          status: "rendering",
          shotstack_render_id: renderId,
          error_message: null,
        })
        .eq("id", video.id);

      return { ok: true, tier, captionStyle, renderId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await fail(msg);
      throw e;
    }
  });


export const pollRender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: video } = await supabase
      .from("videos")
      .select("id, status, shotstack_render_id, video_url")
      .eq("id", data.video_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!video) throw new Error("Video not found");
    if (video.status !== "rendering" || !video.shotstack_render_id) {
      return { status: video?.status ?? "unknown", url: video?.video_url ?? null };
    }
    const { getShotstackStatus } = await import("./pipeline.server");
    const r = await getShotstackStatus(video.shotstack_render_id);
    if (r.status === "done" && r.url) {
      await supabase
        .from("videos")
        .update({ status: "ready", video_url: r.url })
        .eq("id", video.id);
      return { status: "ready", url: r.url };
    }
    if (r.status === "failed") {
      await supabase
        .from("videos")
        .update({
          status: "failed",
          error_message: (r.error ?? "Render failed").slice(0, 500),
        })
        .eq("id", video.id);
      return { status: "failed", url: null };
    }
    return { status: video.status, url: null };
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

