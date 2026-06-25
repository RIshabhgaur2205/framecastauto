import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url, onboarded")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const getPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_preferences")
      .select(
        "user_id, niche, niche_custom, posting_days, posting_time, timezone, quality_tier, caption_style, brand_voice_notes",
      )
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const preferencesSchema = z.object({
  niche: z.string().trim().min(1).max(80).nullable().optional(),
  niche_custom: z.string().trim().max(120).nullable().optional(),
  posting_days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).max(7),
  posting_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  timezone: z.string().trim().min(1).max(80).nullable().optional(),
  quality_tier: z.enum(["standard", "premium"]).nullable().optional(),
  caption_style: z.enum(["minimal", "bold", "karaoke", "subtitle"]).nullable().optional(),
  brand_voice_notes: z.string().trim().max(2000).nullable().optional(),
  mark_onboarded: z.boolean().optional(),
});

export const upsertPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => preferencesSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { mark_onboarded, ...prefs } = data;
    const payload = {
      user_id: context.userId,
      ...prefs,
      posting_time: prefs.posting_time ?? null,
    };
    const { error } = await context.supabase
      .from("user_preferences")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw new Error(error.message);

    if (mark_onboarded) {
      const { error: pErr } = await context.supabase
        .from("profiles")
        .update({ onboarded: true })
        .eq("id", context.userId);
      if (pErr) throw new Error(pErr.message);
    }
    return { ok: true };
  });

export const getChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("channels")
      .select("id, provider, name, status, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getContentItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("content_items")
      .select("id, title, status, scheduled_at, published_at")
      .eq("user_id", context.userId)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
