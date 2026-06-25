import { Reveal } from "./Reveal";

const quotes = [
  {
    body: "Placeholder quote — replace with a real customer testimonial about how Framecast changed their channel workflow.",
    author: "[NAME]",
    role: "[CHANNEL · NICHE]",
  },
  {
    body: "Placeholder quote — replace with a real story about hours saved, revenue earned, or channels launched.",
    author: "[NAME]",
    role: "[ROLE · COMPANY]",
  },
  {
    body: "Placeholder quote — replace with a real agency or operator quote about running multiple niche channels at once.",
    author: "[NAME]",
    role: "[AGENCY · LOCATION]",
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="relative border-t border-hairline bg-surface py-28 lg:py-40"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="label-eyebrow">
                <span className="mr-3 inline-block h-px w-8 translate-y-[-4px] bg-accent align-middle" />
                Testimonials
              </div>
              <h2 className="display mt-6 max-w-2xl text-4xl text-foreground sm:text-5xl lg:text-6xl">
                From the people running it.
              </h2>
            </div>
            <p className="max-w-xs text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Placeholder quotes — to be replaced with real testimonials.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-px bg-hairline md:grid-cols-3">
          {quotes.map((q, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <figure className="flex h-full flex-col justify-between bg-surface p-8 lg:p-10">
                <blockquote className="font-display text-2xl leading-tight text-foreground lg:text-3xl">
                  &ldquo;{q.body}&rdquo;
                </blockquote>
                <figcaption className="mt-10 border-t border-hairline pt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  <div className="text-foreground">{q.author}</div>
                  <div className="mt-1">{q.role}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
