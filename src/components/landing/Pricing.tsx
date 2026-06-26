import { Check } from "lucide-react";
import { Reveal } from "./Reveal";

const tiers = [
  {
    name: "Starter",
    perVideo: "$2",
    monthly: "$29 / month",
    description: "Templated short-form videos for testing a niche.",
    features: [
      "Up to 15 videos / month",
      "Templated visuals & stock B-roll",
      "Standard AI voice library",
      "Auto-publish to 1 channel",
      "Credit-based usage",
    ],
    cta: "Start with Starter",
    highlight: false,
  },
  {
    name: "Pro",
    perVideo: "$6",
    monthly: "$99 / month",
    description: "High-quality AI-generated visuals for serious creators.",
    features: [
      "Up to 30 videos / month",
      "Custom AI visuals & motion graphics",
      "Premium cloned or studio voices",
      "Auto-publish to 3 channels",
      "Priority generation queue",
      "Title & thumbnail A/B testing",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Agency",
    perVideo: "$4",
    monthly: "From $399 / month",
    description: "Multi-channel automation for businesses and operators.",
    features: [
      "Unlimited videos (pooled credits)",
      "10+ channels across niches",
      "Team seats & approval workflows",
      "Brand kit per channel",
      "Dedicated success manager",
      "API access",
    ],
    cta: "Talk to us",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative border-t border-hairline py-28 lg:py-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal>
          <div className="label-eyebrow">
            <span className="mr-3 inline-block h-px w-8 translate-y-[-4px] bg-accent align-middle" />
            Pricing
          </div>
          <h2 className="display mt-6 max-w-3xl text-4xl text-foreground sm:text-6xl lg:text-7xl">
            Pay per video. <br />
            <span className="text-muted-foreground">Not per seat, not per minute.</span>
          </h2>
        </Reveal>

        <div className="mt-20 grid gap-px bg-hairline md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div
                className={`cine-hover relative flex h-full flex-col bg-background p-8 lg:p-10 ${
                  t.highlight ? "lg:-my-4 lg:bg-surface" : ""
                }`}
              >
                {t.highlight && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-px bg-accent" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-accent" />
                    <span className="label-eyebrow absolute right-8 top-8 text-accent">
                      Most popular
                    </span>
                  </>
                )}
                <div className="font-display text-3xl tracking-[0.1em] text-foreground">
                  {t.name.toUpperCase()}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{t.description}</p>

                <div className="mt-10">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      From
                    </span>
                    <span className="font-display text-5xl text-foreground sm:text-6xl">
                      {t.perVideo}
                    </span>
                    <span className="text-sm text-muted-foreground">/ video</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{t.monthly}</div>
                </div>

                <ul className="mt-10 space-y-3 border-t border-hairline pt-8">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-foreground/90">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          t.highlight ? "text-accent" : "text-muted-foreground"
                        }`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/auth"
                  className={`mt-10 inline-flex h-12 items-center justify-center text-sm font-medium tracking-wide transition-all ${
                    t.highlight
                      ? "cine-press bg-accent text-accent-foreground"
                      : "border border-hairline text-foreground hover:border-accent hover:text-accent"
                  }`}
                >
                  {t.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
