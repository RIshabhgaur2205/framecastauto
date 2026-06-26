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

function buildPrompt(video: { title: string | null; niche: string | null; quality_tier: string | null }, prefs: Prefs | null) {
  const niche = video.niche ?? prefs?.niche_custom ?? prefs?.niche ?? "general";
  const tier = video.quality_tier ?? prefs?.quality_tier ?? "standard";
  const voice = prefs?.brand_voice_notes?.trim() || "Direct, confident, no fluff. Conversational but sharp.";
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

export const generateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: video, error: vErr } = await context.supabase
      .from("videos")
      .select("id, title, niche, quality_tier")
      .eq("id", data.video_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (vErr) throw new Error(vErr.message);
    if (!video) throw new Error("Video not found");

    const { data: prefs } = await context.supabase
      .from("user_preferences")
      .select("niche, niche_custom, quality_tier, caption_style, brand_voice_notes")
      .eq("user_id", context.userId)
      .maybeSingle();

    // Mark as generating
    await context.supabase
      .from("videos")
      .update({ status: "generating_script", error_message: null })
      .eq("id", video.id);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      await context.supabase
        .from("videos")
        .update({ status: "failed", error_message: "LOVABLE_API_KEY missing on server" })
        .eq("id", video.id);
      throw new Error("LOVABLE_API_KEY missing on server");
    }

    const { system, user } = buildPrompt(video, prefs as Prefs | null);

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });

      if (res.status === 429) {
        await context.supabase
          .from("videos")
          .update({ status: "failed", error_message: "Rate limit exceeded. Please retry shortly." })
          .eq("id", video.id);
        throw new Error("Rate limit exceeded");
      }
      if (res.status === 402) {
        await context.supabase
          .from("videos")
          .update({ status: "failed", error_message: "AI credits exhausted. Add credits to continue." })
          .eq("id", video.id);
        throw new Error("AI credits exhausted");
      }
      if (!res.ok) {
        const text = await res.text();
        await context.supabase
          .from("videos")
          .update({ status: "failed", error_message: `AI gateway ${res.status}` })
          .eq("id", video.id);
        throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const script = json.choices?.[0]?.message?.content?.trim();
      if (!script) {
        await context.supabase
          .from("videos")
          .update({ status: "failed", error_message: "Empty response from AI" })
          .eq("id", video.id);
        throw new Error("Empty response from AI");
      }

      const { error: uErr } = await context.supabase
        .from("videos")
        .update({
          status: "script_ready",
          script_text: script,
          cost_credits: (video.quality_tier === "premium" ? 8 : 4),
          error_message: null,
        })
        .eq("id", video.id);
      if (uErr) throw new Error(uErr.message);

      return { ok: true, script };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      // Best-effort failure write (in case it wasn't set above)
      await context.supabase
        .from("videos")
        .update({ status: "failed", error_message: msg.slice(0, 500) })
        .eq("id", video.id)
        .eq("user_id", context.userId);
      throw e;
    }
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
