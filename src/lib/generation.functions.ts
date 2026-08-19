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

export type BrandKit = {
  brand_name: string | null;
  website_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  tone: string | null;
  tone_notes: string | null;
  target_audience: string | null;
  default_cta: string | null;
  logo_path: string | null;
} | null;

const TONE_BRIEFS: Record<string, string> = {
  bold: "Confident, punchy, declarative. Short sentences. No hedging.",
  friendly: "Warm, human, conversational. Like a helpful friend recommending something.",
  premium: "Restrained, elegant, understated. Quality over volume. No exclamation marks.",
  technical: "Precise and spec-led. Numbers, materials, measurable outcomes.",
  playful: "Light, witty, energetic. A little cheeky, never corny.",
};

const OBJECTIVE_BRIEFS: Record<string, string> = {
  awareness: "Goal: introduce the brand and product to people who have never heard of it.",
  launch: "Goal: announce a brand-new product. Lead with novelty and what's different.",
  promo: "Goal: drive action on a limited-time offer. The offer must be unmistakable.",
  retargeting: "Goal: convince someone who already saw the product. Handle the top objection and remove friction.",
};

type AdFields = {
  video_type?: string | null;
  product_name?: string | null;
  offer_text?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  ad_objective?: string | null;
  target_seconds?: number | null;
};

function buildPrompt(
  video: {
    title: string | null;
    niche: string | null;
    quality_tier: string | null;
    language?: string | null;
    video_style?: string | null;
    product_description?: string | null;
  } & AdFields,
  prefs: Prefs | null,
  brand: BrandKit = null,
) {
  const niche = video.niche ?? prefs?.niche_custom ?? prefs?.niche ?? "general";
  const tier = video.quality_tier ?? prefs?.quality_tier ?? "standard";
  const lang = (video.language ?? "en").toLowerCase();
  const langName = LANG_NAMES[lang] ?? "English";
  const product = video.product_description?.trim();
  const isAd = video.video_type === "ad";

  const brandTone = brand?.tone ? TONE_BRIEFS[brand.tone] ?? "" : "";
  const voice =
    [brandTone, brand?.tone_notes?.trim(), prefs?.brand_voice_notes?.trim()]
      .filter(Boolean)
      .join(" ") || "Direct, confident, no fluff. Conversational but sharp.";

  if (isAd) {
    const seconds = video.target_seconds ?? 30;
    const words = Math.round(seconds * 2.4);
    const objective =
      OBJECTIVE_BRIEFS[(video.ad_objective ?? "awareness").toLowerCase()] ??
      OBJECTIVE_BRIEFS.awareness;
    const cta = video.cta_text?.trim() || brand?.default_cta?.trim() || "Shop now";
    return {
      system: `You are a top-performing UGC ad creative director and direct-response copywriter. You write shot-able, live-action vertical video ads (YouTube Shorts, Reels, TikTok) in the style of a real person on camera reviewing a product — not a slideshow with narration. Respond ONLY with a JSON object of the shape {"script": string, "headline": string, "cta": string, "persona": string, "lines": string[]}. "script" is the words actually SPOKEN ON CAMERA in ${langName}, first person, no stage directions, no labels, no markdown, no quotation marks around lines. "headline" is an on-screen hook of at most 6 words. "cta" is an end-card call to action of at most 6 words. "persona" is ONE English sentence physically describing the single on-camera character who speaks every word — gender presentation, age range, skin tone, hair, wardrobe, and voice quality (e.g. "a 27-year-old woman with long wavy dark hair, light-brown skin, wearing a cream ribbed top, warm bright mid-pitch voice") — because the same person must be filmed and heard in every shot. "lines" splits "script" into 3-6 consecutive spoken chunks, in order, each ONE short sentence of at most 22 words that a person can comfortably say in 8 seconds; concatenating "lines" must reproduce "script" with no words added or removed. No other keys, no prose outside the JSON.`,
      user: `Write a ${seconds}-second UGC-style video advertisement, performed by ONE believable on-camera character.

Output language: ${langName} (script, headline, and cta must all be natively in ${langName}).
${objective}
Brand: ${brand?.brand_name?.trim() || "(unnamed brand)"}${brand?.website_url ? ` (${brand.website_url})` : ""}
Brand voice: ${voice}
Target audience: ${brand?.target_audience?.trim() || "general consumers who would buy this product"}
Product name: ${video.product_name?.trim() || "(use the name in the brief)"}
${video.offer_text?.trim() ? `Offer to feature verbatim: "${video.offer_text.trim()}"` : "No promotional offer — do not invent one."}
Required call to action: "${cta}"
Category: ${niche}

Product brief (the ONLY source of truth for features and specs):
"""${product}"""

Write it as a real customer testimonial / review with a storyline, in this order:
1. Hook (1 sentence) — said straight to camera, a sharp problem or desire the audience feels right now.
2. Situation — one line of lived, specific personal context that sets up the story ("I was …").
3. Discovery — the moment they found ${video.product_name?.trim() || "the product"}, named out loud.
4. Two concrete benefits taken directly from the brief, spoken as first-hand experience (no invented features, no fake numbers).
5. Proof / result — the visible change afterwards.
${video.offer_text?.trim() ? "6. State the offer clearly.\n7. Close by telling the viewer what to do: the call to action." : "6. Close by telling the viewer what to do: the call to action."}

Constraints:
- Roughly ${words} words total so the performance lands near ${seconds} seconds.
- Sound like a human talking, not an announcer: contractions, natural rhythm, one idea per sentence, occasional short fragments.
- No emojis, hashtags, music cues, scene labels, or narrator third-person copy.
- Never invent specifications, prices, guarantees, or claims that are not in the brief.`,
    };

  }

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
${product ? `\nProduct / subject brief (the video MUST be about this — weave in concrete specs, benefits, and naming naturally):\n"""${product}"""\n` : ""}
${lengthHint}

Constraints:
- Open with a short hook that creates a curiosity gap${product ? " about the product" : ""}.
- One idea per sentence. Match the ${style} style throughout.
- ${product ? "Reference the product's actual specifications and benefits — do not invent features." : "Land a clear payoff or insight by the end."}
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
          "id, title, niche, quality_tier, caption_style, language, video_style, product_description, reference_media, script_text, voiceover_url, captions_json, srt_text, duration_seconds, stock_clips, ai_frames, video_type, product_name, offer_text, cta_text, cta_url, ad_objective, target_seconds, headline_text",
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

      const { data: brandRow } = await supabase
        .from("brand_profiles")
        .select(
          "brand_name, website_url, primary_color, accent_color, tone, tone_notes, target_audience, default_cta, logo_path",
        )
        .eq("user_id", userId)
        .maybeSingle();
      const brand = (brandRow ?? null) as BrandKit;

      const isAd = (video as { video_type?: string | null }).video_type === "ad";
      const tier = (video.quality_tier ?? prefs?.quality_tier ?? "standard") as
        | "standard"
        | "premium";
      const captionStyle =
        (video.caption_style ?? prefs?.caption_style ?? "bold") as string;
      const lang = ((video as { language?: string | null }).language ?? "en").toLowerCase();
      const videoStyle = ((video as { video_style?: string | null }).video_style ?? "cinematic").toLowerCase();

      // Ad state (character persona, spoken lines, shot list, in-flight jobs) is
      // cached on the row so a resumed run never re-plans or re-bills.
      type AdState = {
        persona?: unknown;
        lines?: unknown;
        shots?: unknown;
        jobs?: Record<string, string>;
        count?: number;
      };
      const adState = ((video as { ai_frames?: AdState | null }).ai_frames ?? null) as AdState | null;
      const strings = (v: unknown): string[] =>
        Array.isArray(v)
          ? (v as unknown[])
              .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
              .map((s) => s.trim())
          : [];
      let persona: string | null =
        typeof adState?.persona === "string" && adState.persona.trim()
          ? adState.persona.trim()
          : null;
      let adLines: string[] = strings(adState?.lines);

      const mergeAdState = async (patch: Record<string, unknown>) => {
        await supabase
          .from("videos")
          .update({ ai_frames: { ...(adState ?? {}), ...patch } } as never)
          .eq("id", video.id);
      };

      // 1) SCRIPT — resume if already generated
      let script = video.script_text;
      let headline = (video as { headline_text?: string | null }).headline_text ?? null;
      let ctaText = (video as { cta_text?: string | null }).cta_text ?? null;
      if (!script) {
        await supabase
          .from("videos")
          .update({ status: "generating_script", error_message: null })
          .eq("id", video.id);
        const { system, user } = buildPrompt(video, prefs as Prefs | null, brand);
        const raw = await callLLM(system, user);
        if (isAd) {
          // Ad mode asks for JSON: { script, headline, cta, persona, lines }
          try {
            const m = raw.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(m ? m[0] : raw) as {
              script?: string;
              headline?: string;
              cta?: string;
              persona?: string;
              lines?: unknown;
            };
            script = parsed.script?.trim() || raw;
            headline = parsed.headline?.trim() || headline;
            ctaText = parsed.cta?.trim() || ctaText;
            persona = parsed.persona?.trim() || persona;
            adLines = strings(parsed.lines).slice(0, 6);
          } catch {
            script = raw;
          }
        } else {
          script = raw;
        }
        await supabase
          .from("videos")
          .update({
            status: "script_ready",
            script_text: script,
            ...(isAd
              ? {
                  headline_text: headline?.slice(0, 120) ?? null,
                  cta_text: ctaText?.slice(0, 120) ?? null,
                }
              : {}),
          })
          .eq("id", video.id);
        if (isAd && (persona || adLines.length)) {
          await mergeAdState({ persona, lines: adLines });
        }
      }

      // Fall back to sentence chunks so older ad rows (no "lines") still work.
      if (isAd && !adLines.length && script) {
        adLines = (script.match(/[^.!?\n]+[.!?]?/g) ?? [script])
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 6);
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
        startAdVideoJob,
        getAdVideoJob,
        downloadAdVideoClip,
        fetchAsBase64,

      } = await import("./pipeline.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      /** Heartbeat: marks this run alive (and optionally moves the status). */
      const progress = async (status?: string) => {
        await supabase
          .from("videos")
          .update({
            last_progress_at: new Date().toISOString(),
            ...(status ? { status, error_message: null } : {}),
          } as never)
          .eq("id", video.id);
      };


      const audioPath = `${userId}/voice/${video.id}.mp3`;
      const srtPath = `${userId}/srt/${video.id}.srt`;

      // Ads: one live-action clip per spoken line, each 8s, and the character's
      // voice comes from the clip itself — no separate narration track.
      const AD_CLIP_SECONDS = 8;
      const adSceneCount = Math.max(2, Math.min(6, adLines.length || 3));

      let voiceoverUrl = video.voiceover_url as string | null;
      let audioBuf: ArrayBuffer | null = null;
      let durationSec = (video.duration_seconds as number | null) ?? 0;

      if (isAd) {
        // No ElevenLabs step at all: a synthetic narrator over an AI actor is
        // exactly the mismatch we are removing.
        voiceoverUrl = null;
        durationSec = adSceneCount * AD_CLIP_SECONDS;
      } else {
        // 2) VOICEOVER — resume if mp3 already in storage
        const existingVoice = await supabaseAdmin.storage
          .from("video-assets")
          .download(audioPath);
        if (existingVoice.data && voiceoverUrl) {
          audioBuf = await existingVoice.data.arrayBuffer();
        } else {
          await supabase
            .from("videos")
            .update({ status: "generating_voiceover", error_message: null, last_progress_at: new Date().toISOString() } as never)
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
        const hasCaptions =
          Array.isArray(video.captions_json) &&
          (video.captions_json as unknown[]).length > 0 &&
          !!video.srt_text;
        if (!hasCaptions) {
          await supabase
            .from("videos")
            .update({ status: "generating_captions", error_message: null, last_progress_at: new Date().toISOString() } as never)
            .eq("id", video.id);
          const { words, duration } = await transcribeForCaptions(audioBuf!, lang);
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
      }


      const productBrief = (video as { product_description?: string | null })
        .product_description?.trim() || "";

      // 4a) REFERENCE MEDIA — sign storage paths so the renderer can fetch them.
      type RefMedia = { url: string; type: "image" | "video"; path?: string; name?: string };
      const refRaw = ((video as { reference_media?: unknown }).reference_media ?? []) as RefMedia[];
      const referenceMedia: Array<{
        url: string;
        type: "image" | "video";
        seconds?: number;
        keepAudio?: boolean;
      }> = [];
      for (const r of refRaw) {
        if (!r || (r.type !== "image" && r.type !== "video")) continue;
        let url = r.url;
        if (r.path) {
          const signed = await supabaseAdmin.storage
            .from("video-assets")
            .createSignedUrl(r.path, 60 * 60 * 24);
          if (signed.data?.signedUrl) url = signed.data.signedUrl;
        }
        // In ads the brand's own media is a short silent opener; the spoken
        // performance lives in the generated clips that follow.
        if (url) referenceMedia.push({ url, type: r.type, ...(isAd ? { seconds: 2.5 } : {}) });
      }
      const brandMediaSeconds = isAd ? referenceMedia.length * 2.5 : 0;


      // 4b) VISUALS
      //  - Ads: NO stock footage. Every shot is a live-action AI-filmed clip
      //    (UGC review style) generated around this exact product/business.
      //  - Content videos: Pexels stock b-roll keyed off the script (unchanged).
      let stockClips = (video.stock_clips as unknown as
        | Array<{ url: string; preview: string; duration: number }>
        | null) ?? null;

      if (isAd) {
        stockClips = [];
        // One 8s live-action take per spoken line, capped so cost stays sane.
        const sceneCount = adSceneCount;
        const aiDir = `${userId}/ai/${video.id}`;

        // Resume: reuse every clip already rendered, only fill the gaps.
        const existing = await supabaseAdmin.storage.from("video-assets").list(aiDir);
        const haveIdx = new Set(
          (existing.data ?? [])
            .filter((f) => f.name.endsWith(".mp4"))
            .map((f) => Number(f.name.split(".")[0]))
            .filter((n) => Number.isInteger(n)),
        );
        const missing: number[] = [];
        for (let i = 0; i < sceneCount; i++) if (!haveIdx.has(i)) missing.push(i);

        const aiClips: Array<{
          url: string;
          type: "video";
          seconds: number;
          keepAudio: true;
        }> = [];
        if (missing.length) {
          await progress("sourcing_visuals");

          // Shot list: a single believable on-camera character telling the story,
          // cached on the row so resumed runs never re-plan (or drift).
          let shots: string[] = strings(adState?.shots);
          const jobs: Record<string, string> = { ...(adState?.jobs ?? {}) };

          const productName =
            (video as { product_name?: string | null }).product_name ??
            video.title ??
            nicheKeyword;

          const personaText =
            persona ??
            "a 27-year-old woman with long wavy dark hair, light-brown skin, wearing a cream ribbed top, warm bright mid-pitch voice";

          if (!shots.length) {
            try {
              const raw = await callLLM(
                "You are a UGC ad director. You turn a spoken ad script into a shot list for an AI video generator that films the actor AND records their speech. Each shot is a single continuous ~8 second live-action take in which the character speaks their line to camera. Output ONLY a JSON array of strings in ENGLISH, no prose.",
                `Spoken ad script (may be in any language):\n"""${script}"""\n\nThe ONE on-camera character, identical in every shot: """${personaText}"""\n\nSpoken lines, one per shot, in order:\n${adLines
                  .slice(0, sceneCount)
                  .map((l, i) => `${i + 1}. ${l}`)
                  .join("\n")}\n\nProduct / business: ${productName}${brand?.brand_name ? ` by ${brand.brand_name}` : ""}.${productBrief ? `\nProduct brief / specs: """${productBrief}"""` : ""}${brand?.target_audience ? `\nAudience: ${brand.target_audience}` : ""}\n\nReturn exactly ${sceneCount} shot descriptions, in script order, for a UGC-style testimonial ad filmed on a modern phone camera. Rules for EVERY shot:\n- Begin the description by restating the character exactly as given above, verbatim, so they look and sound the same in every shot.\n- The character is ON CAMERA and SPEAKING their line for that shot, with visible mouth movement and matching lip sync. Never describe an unseen narrator.\n- Shot 1: handheld selfie framing, talking straight to camera, delivering the hook.\n- Middle shots: the character speaking while actually using ${productName} in a real environment — hold the product up so it is clearly visible.\n- Final shot: back to selfie framing, recommending ${productName} to camera.\n- Include: camera framing and movement, lens feel, location, time of day, lighting, wardrobe, and the character's expression/action.\n- Audio direction in every shot: only this character's clear natural speaking voice with light room ambience — no music, no voiceover, no second speaker, no subtitles.\n- Natural, documentary realism — imperfect handheld motion, real skin texture, natural light. NOT a polished studio commercial, NOT a slideshow, NOT text on screen.\n- End every string with "vertical 9:16, filmed on smartphone, photorealistic, natural lighting, no on-screen text, no watermark, no subtitles".\n- Never invent product features beyond the brief.`,
              );
              const match = raw.match(/\[[\s\S]*\]/);
              if (match) {
                const arr = JSON.parse(match[0]) as unknown;
                if (Array.isArray(arr))
                  shots = arr
                    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
                    .map((s) => s.trim())
                    .slice(0, sceneCount);
              }
            } catch {
              // fall through to a safe on-product shot list
            }
          }
          if (!shots.length) {
            shots = Array.from({ length: sceneCount }, (_, i) => {
              const beat =
                i === 0
                  ? `${personaText}, talking straight to a handheld phone camera in a sunlit apartment, delivering an enthusiastic hook about ${productName}`
                  : i === sceneCount - 1
                    ? `${personaText}, holding ${productName} up to the handheld phone camera and recommending it with a warm smile`
                    : `${personaText}, speaking to a handheld phone camera while using ${productName} in a real everyday setting, product clearly visible in frame`;
              return `${beat}${productBrief ? `. Product context: ${productBrief.slice(0, 240)}` : ""}. Only this character's clear natural speaking voice with light room ambience, no music, no voiceover, no second speaker. Documentary realism, imperfect handheld motion, natural light, vertical 9:16, filmed on smartphone, photorealistic, natural lighting, no on-screen text, no watermark, no subtitles`;
            });
          }


          const persistState = async () =>
            supabase
              .from("videos")
              .update({ ai_frames: { shots, jobs, count: sceneCount } } as never)
              .eq("id", video.id);
          await persistState();

          // Seed the first shot with the brand's real product photo so the
          // generated footage matches the actual product.
          const seedRef = referenceMedia.find((m) => m.type === "image");
          const seed = seedRef ? await fetchAsBase64(seedRef.url) : null;

          const waiting = (ms: number) => ({
            ok: true as const,
            incomplete: true as const,
            stage: "visuals" as const,
            remaining: missing.length,
            retryAfterMs: ms,
            tier,
            captionStyle,
            renderId: null as string | null,
          });

          // One clip in flight at a time: create it, then poll it to completion
          // across subsequent calls so no single request runs long.
          const idx = missing[0];
          const jobId = jobs[String(idx)];

          if (!jobId) {
            const started = await startAdVideoJob({
              prompt: shots[idx] ?? shots[shots.length - 1],
              seconds: "8",
              premium: tier === "premium",
              ref: seed,
            });
            if (!started) return waiting(15000); // gateway busy — poll again
            jobs[String(idx)] = started;
            await persistState();
            await progress("sourcing_visuals");
            return waiting(12000);
          }

          const job = await getAdVideoJob(jobId);
          if (job.status === "failed") {
            delete jobs[String(idx)];
            await persistState();
            await progress("sourcing_visuals");
            // Invalid reference formats are deterministic. The next attempt is
            // started without that reference by startAdVideoJob rather than
            // endlessly recreating the same doomed job.
            return waiting(4000);
          }
          if (job.status !== "completed") {
            await progress("sourcing_visuals");
            return waiting(10000);
          }

          const bytes = await downloadAdVideoClip(jobId);
          const up = await supabaseAdmin.storage
            .from("video-assets")
            .upload(`${aiDir}/${idx}.mp4`, bytes, {
              contentType: "video/mp4",
              upsert: true,
            });
          if (up.error) throw new Error(`Ad clip upload: ${up.error.message}`);
          delete jobs[String(idx)];
          haveIdx.add(idx);
          await persistState();
          await progress("sourcing_visuals");

          if (missing.length > 1) return waiting(1000);
        }

        for (let i = 0; i < sceneCount; i++) {
          if (!haveIdx.has(i)) continue;
          const signed = await supabaseAdmin.storage
            .from("video-assets")
            .createSignedUrl(`${aiDir}/${i}.mp4`, 60 * 60 * 24);
          if (signed.data?.signedUrl)
            aiClips.push({ url: signed.data.signedUrl, type: "video" });
        }

        if (!aiClips.length && !referenceMedia.length)
          throw new Error("No ad visuals could be generated");

        // Brand's real media opens the ad; the generated footage carries the story.
        referenceMedia.push(...aiClips);
      } else if (!stockClips || !stockClips.length) {

        await supabase
          .from("videos")
          .update({ status: "sourcing_visuals", error_message: null, last_progress_at: new Date().toISOString() } as never)
          .eq("id", video.id);

        const sceneCount = Math.max(4, Math.min(10, Math.round((durationSec || 30) / 5)));
        let queries: string[] = [];
        try {
          const raw = await callLLM(
            "You convert a short voiceover script into stock-footage search keywords. Output ONLY a JSON array of strings in ENGLISH (Pexels only indexes English), no prose.",
            `Script (may be in any language):\n"""${script}"""\n\nVideo style: ${videoStyle}.${productBrief ? `\nProduct / subject brief: """${productBrief}""" — keywords should depict this product, its use, its context, target user, and benefits.` : ""}\n\nReturn exactly ${sceneCount} short Pexels search queries in ENGLISH (2-4 words each) that visually match the script in order and fit a ${videoStyle} aesthetic. Prefer concrete, filmable subjects (people, places, objects, actions) over abstract concepts. No hashtags, no quotes inside strings.`,
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


      // 4c) BRAND LOGO — sign for watermark / end card.
      let logoUrl: string | null = null;
      if (brand?.logo_path) {
        const signedLogo = await supabaseAdmin.storage
          .from("video-assets")
          .createSignedUrl(brand.logo_path, 60 * 60 * 24);
        logoUrl = signedLogo.data?.signedUrl ?? null;
      }

      // 5) RENDER — submit and let the client poll
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
        referenceMedia,
        duration: durationSec || 30,
        captionStyle: (captionStyle as "bold" | "minimal" | "neon" | "subtle") ?? "bold",
        burnCaptions,
        isAd,
        logoUrl,
        brandPrimary: brand?.primary_color ?? null,
        brandAccent: brand?.accent_color ?? null,
        headline: isAd ? headline : null,
        ctaText: isAd ? ctaText : null,
        ctaUrl: isAd ? ((video as { cta_url?: string | null }).cta_url ?? null) : null,
        brandName: brand?.brand_name ?? null,
      });


      await supabase
        .from("videos")
        .update({
          status: "rendering",
          shotstack_render_id: renderId,
          error_message: null,
          last_progress_at: new Date().toISOString(),
        } as never)
        .eq("id", video.id);

      return { ok: true, incomplete: false as const, tier, captionStyle, renderId };
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

