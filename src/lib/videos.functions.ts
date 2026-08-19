import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VideoStatus =
  | "queued"
  | "script_ready"
  | "rendering"
  | "ready"
  | "posted"
  | "failed";

export const listVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("videos")
      .select(
        "id, title, status, niche, script_text, voiceover_url, video_url, thumbnail_url, caption_style, quality_tier, scheduled_for, posted_at, cost_credits, error_message, channel_id, youtube_video_id, published_at, publish_error, created_at, video_type, product_name, offer_text, cta_text, cta_url, ad_objective, target_seconds, headline_text",
      )
      .eq("user_id", context.userId)
      .order("scheduled_for", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const LANGUAGES = [
  "en", "es", "hi", "fr", "de", "pt", "it", "ja", "ar", "zh", "ru", "ko", "tr", "id",
] as const;
const STYLES = [
  "cinematic", "advertisement", "documentary", "vlog", "educational", "news", "storytime", "explainer",
] as const;

const refMediaSchema = z
  .array(
    z.object({
      url: z.string().url(),
      type: z.enum(["image", "video"]),
      path: z.string().max(500).optional(),
      name: z.string().max(200).optional(),
    }),
  )
  .max(6)
  .optional();

const createSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  niche: z.string().trim().max(80).optional(),
  scheduled_for: z.string().datetime().nullable().optional(),
  language: z.enum(LANGUAGES).optional(),
  video_style: z.enum(STYLES).optional(),
  product_description: z.string().trim().max(2000).optional(),
  reference_media: refMediaSchema,
  video_type: z.enum(["content", "ad"]).optional(),
  product_name: z.string().trim().max(160).optional(),
  offer_text: z.string().trim().max(200).optional(),
  cta_text: z.string().trim().max(120).optional(),
  cta_url: z.string().trim().max(300).optional(),
  ad_objective: z
    .enum(["awareness", "launch", "promo", "retargeting"])
    .optional(),
  target_seconds: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
});

export const createVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const isAd = data.video_type === "ad";
    if (isAd && !data.product_description?.trim()) {
      throw new Error("An advertisement needs a product brief.");
    }
    const title =
      data.title ??
      (isAd && data.product_name?.trim()
        ? `Ad · ${data.product_name.trim()}`
        : `Untitled draft · ${new Date().toLocaleString()}`);
    // Auto-link to the user's first connected YouTube channel, if any.
    const { data: ch } = await context.supabase
      .from("channels")
      .select("id")
      .eq("user_id", context.userId)
      .eq("provider", "youtube")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: row, error } = await context.supabase
      .from("videos")
      .insert({
        user_id: context.userId,
        title,
        niche: data.niche ?? null,
        status: "queued",
        scheduled_for: data.scheduled_for ?? null,
        quality_tier: "standard",
        caption_style: "bold",
        cost_credits: 0,
        channel_id: ch?.id ?? null,
        language: data.language ?? "en",
        video_style: isAd ? "advertisement" : data.video_style ?? "cinematic",
        product_description: data.product_description?.trim() || null,
        reference_media: data.reference_media ?? [],
        video_type: isAd ? "ad" : "content",
        product_name: data.product_name?.trim() || null,
        offer_text: data.offer_text?.trim() || null,
        cta_text: data.cta_text?.trim() || null,
        cta_url: data.cta_url?.trim() || null,
        ad_objective: isAd ? data.ad_objective ?? "awareness" : null,
        target_seconds: isAd ? data.target_seconds ?? 30 : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });


// Seed realistic placeholder videos for a fresh user so the queue UI feels populated.
export const seedDemoVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error: cErr } = await context.supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) return { seeded: 0 };

    const now = new Date();
    const day = (offset: number, hour = 9, min = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      d.setHours(hour, min, 0, 0);
      return d.toISOString();
    };

    const samples = [
      {
        title: "5 AI Tools That Will Replace Your Job in 2026",
        status: "posted",
        niche: "Tech",
        scheduled_for: day(-6, 9),
        posted_at: day(-6, 9, 12),
        quality: "premium",
        caption: "karaoke",
        cost: 8,
        script:
          "Hook: Most people don't realize this — but the tools shipping this month will quietly automate entire job categories. Here are five you need to know...",
      },
      {
        title: "Why Top Founders Wake Up at 4:30 AM",
        status: "posted",
        niche: "Productivity",
        scheduled_for: day(-4, 7),
        posted_at: day(-4, 7, 3),
        quality: "standard",
        caption: "bold",
        cost: 4,
        script:
          "Hook: It's not about the hour. It's about what they protect with it. Stanford studied 200 founders and found one pattern nobody talks about...",
      },
      {
        title: "The $0 Marketing Stack That Built a $40M Brand",
        status: "posted",
        niche: "Marketing",
        scheduled_for: day(-2, 18, 30),
        posted_at: day(-2, 18, 31),
        quality: "premium",
        caption: "subtitle",
        cost: 8,
        script:
          "Hook: They had no ad budget. No agency. Just four free tools. Here's the exact stack and how to copy it this weekend.",
      },
      {
        title: "I Tried Every Note App So You Don't Have To",
        status: "failed",
        niche: "Tech",
        scheduled_for: day(-1, 11),
        posted_at: null,
        quality: "standard",
        caption: "minimal",
        cost: 0,
        script:
          "Render failed at voiceover stage — TTS service returned 502. Auto-retry scheduled.",
      },
      {
        title: "Three Habits That Quietly Destroy Focus",
        status: "ready",
        niche: "Productivity",
        scheduled_for: day(0, 19),
        posted_at: null,
        quality: "premium",
        caption: "karaoke",
        cost: 8,
        script:
          "Hook: You think it's your phone. It's not. The real culprits are habits you picked up before lunch...",
      },
      {
        title: "How OpenAI's New Model Changes Everything",
        status: "rendering",
        niche: "Tech",
        scheduled_for: day(1, 10),
        posted_at: null,
        quality: "premium",
        caption: "bold",
        cost: 8,
        script:
          "Hook: This isn't an incremental update. It's a category shift. Here's what changed under the hood and why your workflow is about to break...",
      },
      {
        title: "The One Email Trick That Booked Me 12 Meetings",
        status: "script_ready",
        niche: "Sales",
        scheduled_for: day(2, 9),
        posted_at: null,
        quality: "standard",
        caption: "subtitle",
        cost: 0,
        script:
          "Hook: I sent the same template for two years. One word change took it from 2% to 38% reply rate. Here it is...",
      },
      {
        title: "Build a SaaS in 7 Days — Day 1",
        status: "queued",
        niche: "Startup",
        scheduled_for: day(3, 8),
        posted_at: null,
        quality: "premium",
        caption: "karaoke",
        cost: 0,
        script: null,
      },
      {
        title: "The Truth About Passive Income",
        status: "queued",
        niche: "Finance",
        scheduled_for: day(4, 17),
        posted_at: null,
        quality: "standard",
        caption: "bold",
        cost: 0,
        script: null,
      },
      {
        title: "Why Designers Are Switching to This Editor",
        status: "queued",
        niche: "Design",
        scheduled_for: day(6, 12),
        posted_at: null,
        quality: "standard",
        caption: "minimal",
        cost: 0,
        script: null,
      },
      {
        title: "30 Days of Cold DMs — What I Learned",
        status: "queued",
        niche: "Marketing",
        scheduled_for: day(8, 10),
        posted_at: null,
        quality: "premium",
        caption: "karaoke",
        cost: 0,
        script: null,
      },
      {
        title: "The Underrated Skill Every Founder Needs",
        status: "queued",
        niche: "Startup",
        scheduled_for: day(10, 9),
        posted_at: null,
        quality: "standard",
        caption: "bold",
        cost: 0,
        script: null,
      },
    ];

    const rows = samples.map((s) => ({
      user_id: context.userId,
      title: s.title,
      status: s.status,
      niche: s.niche,
      script_text: s.script,
      scheduled_for: s.scheduled_for,
      posted_at: s.posted_at,
      quality_tier: s.quality,
      caption_style: s.caption,
      cost_credits: s.cost,
      thumbnail_url: null,
    }));

    const { error } = await context.supabase.from("videos").insert(rows);
    if (error) throw new Error(error.message);
    return { seeded: rows.length };
  });
