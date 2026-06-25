import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section
      id="cta"
      className="relative isolate overflow-hidden border-t border-hairline py-32 film-grain lg:py-48"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--color-accent)_18%,transparent)_0%,transparent_60%)]"
      />
      <div className="mx-auto max-w-5xl px-6 text-center lg:px-10">
        <Reveal>
          <div className="label-eyebrow justify-center">
            <span className="mr-3 inline-block h-px w-8 translate-y-[-4px] bg-accent align-middle" />
            Roll the cameras
          </div>
          <h2 className="display mt-8 text-6xl text-foreground sm:text-8xl lg:text-[10rem]">
            Your channel <br />
            <span className="text-accent">runs itself.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-base text-muted-foreground">
            Connect YouTube, pick a niche, and let Framecast ship the next 30 videos
            while you sleep.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
            <a
              href="#"
              className="group inline-flex h-12 items-center bg-accent px-8 text-sm font-medium tracking-wide text-accent-foreground transition-all hover:shadow-[0_0_60px_-6px_var(--color-accent-glow)]"
            >
              Start creating
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              See pricing
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
