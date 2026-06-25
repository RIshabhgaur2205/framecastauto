# Framecast — Landing Page Plan

A cinematic, dark-first marketing site that feels like an AI film studio's portfolio. No auth, no app logic yet — pure marketing surface.

## Visual system

- **Base**: near-black `#0A0A0A`, surface `#111111`, hairline borders `#1F1F1F`, muted text `#8A8A8A`, primary text `#F5F5F5`.
- **Accent**: electric violet `#7C3AED` with glow `#A78BFA`. Used sparingly — primary CTA, single underline/keyline highlights, focused hover states. Never as a gradient blob.
- **Typography**:
  - Display: **Bebas Neue** (condensed, confident, film-poster energy) for hero + section headlines.
  - Body: **Inter Tight** for paragraphs and UI.
  - Labels: Inter Tight uppercase, small caps treatment, `tracking-[0.3em]`, muted color.
- **Motion**: Framer Motion. Scroll-triggered fade + 20px slide-up (`whileInView`, once). Stats counters animate on intersect. Hero background = looping muted video placeholder (`<video>` element with poster fallback, gradient vignette overlay).
- **Surfaces**: sharp corners (`rounded-none` or `rounded-sm` max), 1px borders over filled cards, generous whitespace (`py-32` between sections on desktop).
- **Anti-clichés enforced**: no purple-blue blobs, no stock people, no bubbly cards, no two-CTA hero default styling (secondary is a text link with arrow).

## Sections (single route `/`)

1. **Nav** — minimal: Framecast wordmark left, 3 anchor links center (How it works, Pricing, Testimonials), "Start creating" violet button right.
2. **Hero** — full-viewport. Background `<video>` placeholder + dark vignette. Eyebrow label "AUTOMATED YOUTUBE STUDIO". Headline: "Turn your niche into a fully automated YouTube channel." Subhead, then primary CTA "Start creating" + secondary text-link "See how it works →".
3. **How it works** — 4 steps in a horizontal scroll-snap track (desktop) / vertical stack (mobile). Steps: Pick your niche · AI writes the script · AI generates voice, visuals & captions · Posts on your schedule. Numbered `01–04` in display font, thin keyline between.
4. **Results** — full-width stats strip on a slightly raised surface. 4 large animated counters with bracket placeholders: `[X] videos generated`, `[X] hours saved / week`, `[X]% cheaper than an editor`, `[X] channels automated`. Note above: "Placeholder figures — replace with live numbers."
5. **Pricing** — 3 tiers side-by-side, sharp-edged bordered panels. Price-per-video framing prominent (e.g. "from $X / video"), monthly cost secondary. Tiers: **Starter** (templated, credit-based), **Pro** (high-quality AI visuals, more credits, marked "Most popular" with violet keyline), **Agency** (multi-channel, team seats). Each has feature list + CTA.
6. **Testimonials** — 3 quote cards, monospace attribution, clearly labeled "Placeholder — replace with real quotes" banner above the grid.
7. **Final CTA** — large display-type line "Your channel runs itself." + violet CTA on a near-black band with subtle film-grain overlay.
8. **Footer** — wordmark, short tagline, columns (Product / Company / Legal — placeholder links), copyright.

## Technical

- **Stack**: existing TanStack Start + Tailwind v4 + shadcn. Single route `src/routes/index.tsx` replaces the placeholder; section components in `src/components/landing/*.tsx`.
- **Fonts**: install `@fontsource/bebas-neue` and `@fontsource/inter-tight` via bun, import in `src/router.tsx` entry, register families in `src/styles.css` `@theme`.
- **Tokens** added to `src/styles.css` `@theme`: `--color-bg`, `--color-surface`, `--color-border`, `--color-muted`, `--color-fg`, `--color-accent`, `--color-accent-glow`, `--font-display`, `--font-sans`.
- **Animations**: `framer-motion` (install). Shared `<Reveal>` wrapper for scroll fade/slide. `<Counter>` hook using `useInView` + rAF interpolation; renders `[X]` placeholder until in view, then animates to a placeholder target — but since user wants bracket placeholders kept, the counter will animate a subtle shimmer/pulse on the `[X]` rather than fake numbers. (Confirms "no invented numbers".)
- **Hero video**: `<video autoplay muted loop playsinline poster>` referencing a placeholder MP4 path `/hero-loop.mp4` (file not shipped — element gracefully shows poster image generated via imagegen, a moody abstract cinematic still).
- **SEO**: route `head()` with title "Framecast — Automated YouTube channels, powered by AI", meta description, og:title/description, og:image = the hero poster.
- **Responsive**: mobile-first, hero headline scales `text-5xl → text-8xl`, How-it-works switches scroll-snap → vertical, pricing stacks.

## Files

- `src/routes/index.tsx` — composes sections, sets head().
- `src/components/landing/Nav.tsx`, `Hero.tsx`, `HowItWorks.tsx`, `Results.tsx`, `Pricing.tsx`, `Testimonials.tsx`, `FinalCTA.tsx`, `Footer.tsx`, `Reveal.tsx`.
- `src/styles.css` — add tokens + font registration.
- `src/assets/hero-poster.jpg` — generated cinematic still.

## Out of scope (this pass)

Auth, dashboard, real signup flow, actual video generation, CMS-driven content. All CTAs are visual only.
