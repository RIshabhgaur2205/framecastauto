import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const TONES = ["bold", "friendly", "premium", "technical", "playful"] as const;

const hex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #7C3AED");

const brandSchema = z.object({
  brand_name: z.string().trim().max(120).optional().nullable(),
  website_url: z.string().trim().max(300).optional().nullable(),
  logo_path: z.string().trim().max(500).optional().nullable(),
  primary_color: hex.optional().nullable(),
  accent_color: hex.optional().nullable(),
  tone: z.enum(TONES).optional().nullable(),
  tone_notes: z.string().trim().max(1500).optional().nullable(),
  target_audience: z.string().trim().max(500).optional().nullable(),
  default_cta: z.string().trim().max(160).optional().nullable(),
});

export type BrandProfileInput = z.infer<typeof brandSchema>;

export const getBrandProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brand_profiles")
      .select(
        "id, brand_name, website_url, logo_path, primary_color, accent_color, tone, tone_notes, target_audience, default_cta",
      )
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    let logo_url: string | null = null;
    if (data.logo_path) {
      const signed = await context.supabase.storage
        .from("video-assets")
        .createSignedUrl(data.logo_path, 60 * 60 * 24 * 7);
      logo_url = signed.data?.signedUrl ?? null;
    }
    return { ...data, logo_url };
  });

export const upsertBrandProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => brandSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const payload = {
      user_id: context.userId,
      brand_name: data.brand_name || null,
      website_url: data.website_url || null,
      logo_path: data.logo_path || null,
      primary_color: data.primary_color || "#7C3AED",
      accent_color: data.accent_color || "#FFFFFF",
      tone: data.tone || "bold",
      tone_notes: data.tone_notes || null,
      target_audience: data.target_audience || null,
      default_cta: data.default_cta || null,
    };
    const { error } = await context.supabase
      .from("brand_profiles")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
