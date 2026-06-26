import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import heroPoster from "@/assets/hero-poster.jpg";

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-screen items-end overflow-hidden film-grain"
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroPoster}
          alt=""
          width={1920}
          height={1088}
          className="h-full w-full object-cover opacity-70"
        />
        {/* Cinematic vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_85%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-40 lg:px-10 lg:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="label-eyebrow"
        >
          <span className="mr-3 inline-block h-px w-8 translate-y-[-4px] bg-accent align-middle" />
          Automated YouTube Studio
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="display mt-6 max-w-5xl text-[2.75rem] leading-[1.02] text-foreground sm:text-6xl md:text-7xl lg:text-[8.5rem]"
        >
          Turn your niche <br />
          into a <span className="text-accent">fully automated</span> <br />
          YouTube channel.
        </motion.h1>


        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          Framecast writes the script, generates the voiceover and visuals, burns
          in captions, and publishes on your schedule. You pick the niche —
          the studio runs itself.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-10 flex flex-wrap items-center gap-8"
        >
          <a
            href="/auth"
            className="group inline-flex h-12 items-center bg-accent px-7 text-sm font-medium tracking-wide text-accent-foreground transition-all hover:shadow-[0_0_40px_-6px_var(--color-accent-glow)]"
          >
            Start creating
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#how"
            className="group inline-flex items-center gap-2 text-sm text-foreground/90 transition-colors hover:text-accent"
          >
            See how it works
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
      </div>

      {/* Bottom hairline marker */}
      <div className="absolute bottom-6 left-6 right-6 hidden items-end justify-between text-[10px] tracking-[0.3em] text-muted-foreground md:flex lg:left-10 lg:right-10">
        <span>SCENE 01 / HERO</span>
        <span>FRAMECAST · 2026</span>
      </div>
    </section>
  );
}
