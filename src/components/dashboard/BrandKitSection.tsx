import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { getBrandProfile, upsertBrandProfile, TONES } from "@/lib/brand.functions";
import { supabase } from "@/integrations/supabase/client";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function BrandKitSection() {
  const qc = useQueryClient();
  const save = useServerFn(upsertBrandProfile);
  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand-profile"],
    queryFn: () => getBrandProfile(),
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [site, setSite] = useState("");
  const [primary, setPrimary] = useState("#7C3AED");
  const [accent, setAccent] = useState("#FFFFFF");
  const [tone, setTone] = useState<(typeof TONES)[number]>("bold");
  const [toneNotes, setToneNotes] = useState("");
  const [audience, setAudience] = useState("");
  const [cta, setCta] = useState("");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!brand) return;
    setName(brand.brand_name ?? "");
    setSite(brand.website_url ?? "");
    setPrimary(brand.primary_color ?? "#7C3AED");
    setAccent(brand.accent_color ?? "#FFFFFF");
    setTone((brand.tone as (typeof TONES)[number]) ?? "bold");
    setToneNotes(brand.tone_notes ?? "");
    setAudience(brand.target_audience ?? "");
    setCta(brand.default_cta ?? "");
    setLogoPath(brand.logo_path ?? null);
    setLogoUrl(brand.logo_url ?? null);
  }, [brand]);

  async function onPickLogo(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Logo must be an image (PNG with transparency works best).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${uid}/brand/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("video-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw new Error(error.message);
      const signed = await supabase.storage
        .from("video-assets")
        .createSignedUrl(path, 60 * 60 * 24);
      setLogoPath(path);
      setLogoUrl(signed.data?.signedUrl ?? null);
      toast.success("Logo uploaded. Remember to save.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSave() {
    if (!HEX.test(primary) || !HEX.test(accent)) {
      toast.error("Colors must be hex values like #7C3AED.");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          brand_name: name,
          website_url: site,
          logo_path: logoPath,
          primary_color: primary,
          accent_color: accent,
          tone,
          tone_notes: toneNotes,
          target_audience: audience,
          default_cta: cta,
        },
      });
      await qc.invalidateQueries({ queryKey: ["brand-profile"] });
      toast.success("Brand kit saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save brand kit");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "block h-11 w-full border border-hairline bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent";

  return (
    <div className="mt-16 border-t border-hairline pt-10">
      <div className="label-eyebrow">Brand kit</div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Used whenever you generate an advertisement — logo watermark, end card,
        caption color, and the voice your script is written in.
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-px bg-hairline">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse bg-surface" />
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-px bg-hairline">
          <section className="bg-surface p-6">
            <div className="label-eyebrow">Identity</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Brand name"
                maxLength={120}
              />
              <input
                className={input}
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="https://yourbrand.com"
                maxLength={300}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-hairline bg-background">
                {logoUrl ? (
                  <img src={logoUrl} alt="Brand logo" className="max-h-16 max-w-16 object-contain" />
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Logo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {logoUrl ? "Replace logo" : "Upload logo"}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPath(null);
                      setLogoUrl(null);
                    }}
                    className="inline-flex items-center gap-1 border border-hairline px-3 py-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="bg-surface p-6">
            <div className="label-eyebrow">Colors</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["Primary", primary, setPrimary],
                  ["Accent", accent, setAccent],
                ] as const
              ).map(([label, value, setter]) => (
                <div key={label} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={HEX.test(value) ? value : "#7C3AED"}
                    onChange={(e) => setter(e.target.value.toUpperCase())}
                    aria-label={`${label} color`}
                    className="h-11 w-14 cursor-pointer border border-hairline bg-background"
                  />
                  <input
                    className={input}
                    value={value}
                    onChange={(e) => setter(e.target.value.toUpperCase())}
                    placeholder={label}
                    maxLength={7}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface p-6">
            <div className="label-eyebrow">Voice</div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`h-10 border px-3 text-xs uppercase tracking-[0.2em] transition-colors ${
                    tone === t
                      ? "border-accent text-accent"
                      : "border-hairline text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={toneNotes}
              onChange={(e) => setToneNotes(e.target.value)}
              rows={3}
              maxLength={1500}
              placeholder="Phrases you always use, words to avoid, claims you can't make…"
              className="mt-4 block w-full border border-hairline bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </section>

          <section className="bg-surface p-6">
            <div className="label-eyebrow">Audience &amp; default CTA</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input
                className={input}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Who buys from you?"
                maxLength={500}
              />
              <input
                className={input}
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Shop now at yourbrand.com"
                maxLength={160}
              />
            </div>
          </section>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPickLogo(f);
        }}
      />

      <div className="mt-8 flex items-center justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="inline-flex h-11 items-center gap-2 bg-accent px-6 text-sm font-medium text-accent-foreground transition-all hover:shadow-[0_0_30px_-6px_var(--color-accent-glow)] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save brand kit"}
        </button>
      </div>
    </div>
  );
}
