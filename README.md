# Video Studio AI

Build the landing page and core visual design system for [AppName], a SaaS that lets

creators and businesses connect their YouTube channel and have AI generate and

auto-post videos on a schedule — script, voiceover, visuals, captions, and publishing,

all automated.

DESIGN DIRECTION

Cinematic, premium, dark-mode-first — like a high-end AI film studio's site, not a

typical bright SaaS dashboard. Think: full-bleed video/motion backgrounds, near-black

base (#0A0A0A), a single bold accent color (electric violet or warm amber — pick one

and use it sparingly, only for primary CTAs and key highlights), large confident

display typography (a modern grotesk or condensed sans for headlines, generous

letter-spacing on small caps labels), generous negative space, subtle scroll-triggered

fade/slide animations, and a showreel-style hero section. Avoid generic SaaS clichés:

no purple-blue gradient blobs, no stock illustration people, no rounded bubbly cards.

This should feel like a film studio's portfolio site that happens to be a product.

PAGES TO BUILD NOW (marketing only, no auth/logic yet)

1. Hero section — bold headline about turning a niche into a fully automated YouTube

   channel, subheadline, primary CTA "Start creating", secondary CTA "See how it works".

   Include a looping background video/motion placeholder area.

2. "How it works" — 4 steps shown as a horizontal scroll-animated sequence: Pick your

   niche → AI writes the script → AI generates voice + visuals + captions → Posts

   automatically on your schedule.

3. Results / social proof section — a stats strip with large animated counters:

   "[X] videos generated", "[X] hours saved per week", "[X]% cheaper than hiring an

   editor", "[X] channels automated". Mark these clearly as placeholder stats I will

   replace with real numbers later — use bracket placeholders, not invented numbers.

4. Pricing section — three tiers: Starter (low-quality/templated videos, credit-based),

   Pro (high-quality AI-generated visuals, more credits), Agency (for businesses running

   multiple niche channels). Show "price per video" framing, not just flat monthly fee.

5. Testimonial/quote section — placeholder quote cards, clearly marked as placeholders.

6. Final CTA + footer.

Make it fully responsive, with smooth fade/slide-in animations on scroll. Use a

component library setup that's easy for me to keep iterating on (shadcn/ui is fine).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://framecastauto.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7ad6a403-5601-4a28-bb3b-4068f9b57a12).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
