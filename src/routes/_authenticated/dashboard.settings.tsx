import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getPreferences, getProfile, upsertPreferences } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
});

const NICHES = ["Fitness", "Finance tips", "History facts", "Productivity", "Local business promo", "Tech reviews", "Cooking", "Gaming", "News recap", "Other"];
const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
] as const;
const CAPTION_STYLES = ["minimal", "bold", "karaoke", "subtitle"] as const;
const QUALITIES = ["standard", "premium"] as const;
type Day = (typeof DAYS)[number]["id"];

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const upsert = useServerFn(upsertPreferences);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const { data: prefs } = useQuery({ queryKey: ["preferences"], queryFn: () => getPreferences() });

  const [niche, setNiche] = useState("");
  const [nicheCustom, setNicheCustom] = useState("");
  const [days, setDays] = useState<Day[]>([]);
  const [time, setTime] = useState("09:00");
  const [tz, setTz] = useState("UTC");
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("standard");
  const [caption, setCaption] = useState<(typeof CAPTION_STYLES)[number]>("bold");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prefs) return;
    setNiche(prefs.niche ?? "");
    setNicheCustom(prefs.niche_custom ?? "");
    setDays((prefs.posting_days ?? []) as Day[]);
    if (prefs.posting_time) setTime(prefs.posting_time.slice(0, 5));
    setTz(prefs.timezone ?? "UTC");
    if (prefs.quality_tier) setQuality(prefs.quality_tier as "standard" | "premium");
    if (prefs.caption_style) setCaption(prefs.caption_style as typeof caption);
    setNotes(prefs.brand_voice_notes ?? "");
  }, [prefs]);

  async function save() {
    setSaving(true);
    try {
      await upsert({
        data: {
          niche,
          niche_custom: niche === "Other" ? nicheCustom : null,
          posting_days: days,
          posting_time: time,
          timezone: tz,
          quality_tier: quality,
          caption_style: caption,
          brand_voice_notes: notes,
        },
      });
      await qc.invalidateQueries({ queryKey: ["preferences"] });
      toast.success("Saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function toggleDay(d: Day) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="label-eyebrow">Settings</div>
      <h1 className="display mt-4 text-4xl text-foreground lg:text-5xl">
        Studio preferences.
      </h1>

      <div className="mt-10 space-y-px bg-hairline">
        {/* Niche */}
        <section className="bg-surface p-6">
          <div className="label-eyebrow">Niche</div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NICHES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNiche(n)}
                className={`h-10 border px-3 text-xs uppercase tracking-[0.2em] transition-colors ${
                  niche === n
                    ? "border-accent text-accent"
                    : "border-hairline text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {niche === "Other" && (
            <input
              type="text"
              value={nicheCustom}
              onChange={(e) => setNicheCustom(e.target.value)}
              placeholder="Describe your niche"
              className="mt-4 block h-11 w-full border border-hairline bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
            />
          )}
        </section>

        {/* Schedule */}
        <section className="bg-surface p-6">
          <div className="label-eyebrow">Posting schedule</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const active = days.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={`h-10 min-w-14 border px-3 text-xs uppercase tracking-[0.2em] ${
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-hairline text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 w-full border border-hairline bg-background px-3 text-sm text-foreground outline-none focus:border-accent" />
            <input type="text" value={tz} onChange={(e) => setTz(e.target.value)} className="h-11 w-full border border-hairline bg-background px-3 text-sm text-foreground outline-none focus:border-accent" />
          </div>
        </section>

        {/* Quality + caption */}
        <section className="bg-surface p-6">
          <div className="label-eyebrow">Default look</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {QUALITIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                className={`h-12 border px-4 text-left text-sm capitalize ${
                  quality === q
                    ? "border-accent text-accent"
                    : "border-hairline text-muted-foreground hover:text-foreground"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {CAPTION_STYLES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCaption(c)}
                className={`h-10 border px-3 text-xs uppercase tracking-[0.2em] ${
                  caption === c
                    ? "border-accent text-accent"
                    : "border-hairline text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* Brand voice */}
        <section className="bg-surface p-6">
          <div className="label-eyebrow">Brand voice notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Tone of voice, phrases to avoid, recurring hooks…"
            className="mt-4 block w-full border border-hairline bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </section>
      </div>

      <div className="mt-8 flex items-center justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="inline-flex h-11 items-center gap-2 bg-accent px-6 text-sm font-medium text-accent-foreground transition-all hover:shadow-[0_0_30px_-6px_var(--color-accent-glow)] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </button>
      </div>

      <div className="mt-16 border-t border-hairline pt-10">
        <div className="label-eyebrow">Account</div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border border-hairline bg-surface p-6">
          <div>
            <div className="text-sm text-foreground">{profile?.email}</div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Signed in
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
