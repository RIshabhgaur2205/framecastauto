import { Reveal } from "./Reveal";

const stats = [
  { value: "[X]", label: "Videos generated" },
  { value: "[X]", label: "Hours saved per week" },
  { value: "[X]%", label: "Cheaper than hiring an editor" },
  { value: "[X]", label: "Channels automated" },
];

export function Results() {
  return (
    <section className="relative border-t border-hairline bg-surface py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="label-eyebrow">
                <span className="mr-3 inline-block h-px w-8 translate-y-[-4px] bg-accent align-middle" />
                Results
              </div>
              <h2 className="display mt-6 max-w-2xl text-4xl text-foreground sm:text-5xl lg:text-6xl">
                Built to scale a single creator into a studio.
              </h2>
            </div>
            <p className="max-w-xs text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Placeholder figures — to be replaced with live numbers.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="group relative bg-surface p-8 transition-colors duration-500 hover:bg-surface-raised">
                <div className="font-display text-6xl text-foreground transition-colors group-hover:text-accent lg:text-7xl">
                  {s.value}
                </div>
                <div className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
