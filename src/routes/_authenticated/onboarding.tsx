import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPreferences, upsertPreferences } from "@/lib/profile.functions";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

const NICHES = [
  "Fitness",
  "Finance tips",
  "History facts",
  "Productivity",
  "Local business promo",
  "Tech reviews",
  "Cooking",
  "Gaming",
  "News recap",
  "Other",
];
const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
] as const;
const CAPTION_STYLES = [
  { id: "minimal", label: "Minimal", hint: "Small, clean, bottom-aligned" },
  { id: "bold", label: "Bold", hint: "High contrast, large weight" },
  { id: "karaoke", label: "Karaoke", hint: "Word-by-word highlight" },
  { id: "subtitle", label: "Subtitle", hint: "Classic two-line subtitle" },
] as const;

type Day = (typeof DAYS)[number]["id"];
type Caption = (typeof CAPTION_STYLES)[number]["id"];

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const upsert = useServerFn(upsertPreferences);
  const guessTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  const { data: prefs } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => getPreferences(),
  });

  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState<string>("");
  const [nicheCustom, setNicheCustom] = useState("");
  const [days, setDays] = useState<Day[]>(["mon", "wed", "fri"]);
  const [time, setTime] = useState("09:00");
  const [tz, setTz] = useState(guessTz);
  const [quality, setQuality] = useState<"standard" | "premium">("standard");
  const [caption, setCaption] = useState<Caption>("bold");
  const [submitting, setSubmitting] = useState(false);

  // Hydrate from existing prefs
  useEffect(() => {
    if (!prefs) return;
    if (prefs.niche) setNiche(prefs.niche);
    if (prefs.niche_custom) setNicheCustom(prefs.niche_custom);
    if (prefs.posting_days?.length) setDays(prefs.posting_days as Day[]);
    if (prefs.posting_time) setTime(prefs.posting_time.slice(0, 5));
    if (prefs.timezone) setTz(prefs.timezone);
    if (prefs.quality_tier) setQuality(prefs.quality_tier as "standard" | "premium");
    if (prefs.caption_style) setCaption(prefs.caption_style as Caption);
  }, [prefs]);

  const canNext =
    (step === 0 && (niche && (niche !== "Other" || nicheCustom.trim().length > 0))) ||
    (step === 1 && days.length > 0 && time && tz) ||
    step === 2;

  async function finish() {
    setSubmitting(true);
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
          mark_onboarded: true,
        },
      });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["preferences"] });
      toast.success("Studio configured.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save preferences");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleDay(d: Day) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  return (
    <main className="relative isolate min-h-screen bg-background px-6 py-16 film-grain">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-accent)_12%,transparent)_0%,transparent_60%)]"
      />
      <div className="mx-auto w-full max-w-2xl">
        <div className="label-eyebrow">
          Onboarding · 0{step + 1} of 03
        </div>

        {/* Progress keyline */}
        <div className="mt-4 grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-px transition-all duration-500 ${
                i <= step ? "bg-accent" : "bg-hairline"
              }`}
            />
          ))}
        </div>

        <div className="relative mt-10 border border-hairline bg-surface p-8 lg:p-10">
          {step === 0 && (
            <>
              <h1 className="display text-5xl text-foreground lg:text-6xl">
                Pick your niche.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We'll tune script tone, visuals, and posting cadence around this.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-px bg-hairline sm:grid-cols-3">
                {NICHES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNiche(n)}
                    className={`group bg-surface p-4 text-left text-sm transition-colors ${
                      niche === n
                        ? "text-accent"
                        : "text-foreground/80 hover:text-foreground"
                    }`}
                  >
                    <span className="block font-display text-xs tracking-[0.2em] text-muted-foreground">
                      {String(NICHES.indexOf(n) + 1).padStart(2, "0")}
                    </span>
                    <span className="mt-2 block">{n}</span>
                    {niche === n && (
                      <span className="mt-2 block h-px w-6 bg-accent" />
                    )}
                  </button>
                ))}
              </div>

              {niche === "Other" && (
                <label className="mt-6 block">
                  <span className="label-eyebrow">Describe your niche</span>
                  <input
                    type="text"
                    value={nicheCustom}
                    onChange={(e) => setNicheCustom(e.target.value)}
                    maxLength={120}
                    placeholder="e.g. obscure WWII tank facts"
                    className="mt-2 block h-11 w-full border border-hairline bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                </label>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="display text-5xl text-foreground lg:text-6xl">
                Set your schedule.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Pick which days new videos go live, and when.
              </p>

              <div className="mt-8">
                <span className="label-eyebrow">Posting days</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const active = days.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDay(d.id)}
                        className={`h-10 min-w-14 border px-4 text-xs uppercase tracking-[0.2em] transition-colors ${
                          active
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-hairline text-muted-foreground hover:border-accent hover:text-foreground"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="label-eyebrow">Time</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-2 block h-11 w-full border border-hairline bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="label-eyebrow">Timezone</span>
                  <input
                    type="text"
                    value={tz}
                    onChange={(e) => setTz(e.target.value)}
                    className="mt-2 block h-11 w-full border border-hairline bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="display text-5xl text-foreground lg:text-6xl">
                Default look.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Choose a quality tier and caption style. You can change these per
                video later.
              </p>

              <div className="mt-8 grid gap-px bg-hairline sm:grid-cols-2">
                {(
                  [
                    {
                      id: "standard",
                      title: "Standard",
                      price: "from $2 / video",
                      desc: "Templated visuals, stock B-roll, standard AI voices.",
                    },
                    {
                      id: "premium",
                      title: "Premium",
                      price: "from $6 / video",
                      desc: "Custom AI-generated visuals, motion graphics, studio voices.",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setQuality(opt.id)}
                    className={`group relative bg-surface p-6 text-left transition-colors ${
                      quality === opt.id ? "bg-surface-raised" : ""
                    }`}
                  >
                    {quality === opt.id && (
                      <span className="absolute inset-x-0 top-0 h-px bg-accent" />
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-display text-2xl tracking-[0.1em] text-foreground">
                        {opt.title.toUpperCase()}
                      </span>
                      {quality === opt.id && <Check className="h-4 w-4 text-accent" />}
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      {opt.price}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <span className="label-eyebrow">Caption style</span>
                <div className="mt-3 grid gap-px bg-hairline sm:grid-cols-2">
                  {CAPTION_STYLES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCaption(c.id)}
                      className={`bg-surface p-4 text-left transition-colors ${
                        caption === c.id ? "text-accent" : "text-foreground/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{c.label}</span>
                        {caption === c.id && <Check className="h-4 w-4" />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground disabled:invisible"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step < 2 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="group inline-flex h-11 items-center gap-2 bg-accent px-6 text-sm font-medium text-accent-foreground transition-all hover:shadow-[0_0_30px_-6px_var(--color-accent-glow)] disabled:opacity-40"
            >
              Continue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={finish}
              className="group inline-flex h-11 items-center gap-2 bg-accent px-6 text-sm font-medium text-accent-foreground transition-all hover:shadow-[0_0_30px_-6px_var(--color-accent-glow)] disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Finish setup
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
