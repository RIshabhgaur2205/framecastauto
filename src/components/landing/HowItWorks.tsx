import { Reveal } from "./Reveal";

const steps = [
  {
    n: "01",
    title: "Pick your niche",
    body: "Choose a topic, audience, and tone. Framecast locks in a content lane and a release cadence.",
  },
  {
    n: "02",
    title: "AI writes the script",
    body: "Researched, structured, hook-first scripts shaped for retention — ready to perform or edit.",
  },
  {
    n: "03",
    title: "Voice, visuals & captions",
    body: "Studio voiceover, generated B-roll, motion graphics, and burned-in captions assembled into a finished cut.",
  },
  {
    n: "04",
    title: "Posts on your schedule",
    body: "Auto-publishes to your channel with title, thumbnail, tags, and description — at the times your audience watches.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative border-t border-hairline py-28 lg:py-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal>
          <div className="label-eyebrow">
            <span className="mr-3 inline-block h-px w-8 translate-y-[-4px] bg-accent align-middle" />
            How it works
          </div>
          <h2 className="display mt-6 max-w-3xl text-4xl text-foreground sm:text-6xl lg:text-7xl">
            Four steps. <br />
            <span className="text-muted-foreground">Zero edits required.</span>
          </h2>
        </Reveal>

        {/* Desktop: horizontal scroll-snap rail */}
        <div className="mt-20 hidden lg:block">
          <div className="grid grid-cols-4 gap-px bg-hairline">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="group relative h-full bg-background p-8 transition-colors duration-500 hover:bg-surface">
                  <div className="font-display text-6xl text-muted-foreground/40 transition-colors group-hover:text-accent">
                    {s.n}
                  </div>
                  <h3 className="mt-10 text-lg font-medium text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                  <div className="absolute bottom-0 left-0 h-px w-0 bg-accent transition-all duration-500 group-hover:w-full" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Mobile: stacked */}
        <div className="mt-16 space-y-px bg-hairline lg:hidden">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05}>
              <div className="bg-background p-6">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-4xl text-accent">{s.n}</span>
                  <h3 className="text-lg font-medium text-foreground">{s.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
