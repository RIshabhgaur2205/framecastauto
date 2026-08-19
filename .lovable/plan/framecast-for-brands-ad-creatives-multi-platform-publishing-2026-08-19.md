# Framecast for Brands: Ad Creatives + Multi-Platform Publishing

Turn Framecast into a tool a company can use to generate a finished video ad for a product (a t-shirt, a gadget, a service) and publish it to their social channels — starting with YouTube, with Instagram as a follow-up step.

## 1. Brand kit (reusable)

A new **Brand** section in Settings, saved once and applied to every ad:

- Brand / company name, website
- Logo upload (shown as a corner watermark and on the end card)
- Brand colors (primary + accent) used for caption color and end-card background
- Tone of voice (dropdown: bold, friendly, premium, technical, playful) + free-text notes
- Target audience, and a default call to action ("Shop now at …")

The brand kit auto-fills the ad form so repeat ads take seconds.

## 2. Advertisement mode in the Generate flow

Inside the existing **Generate** modal on the Content Queue, add a **Video type** toggle: `Content` (today's behaviour) or `Advertisement`.

Choosing Advertisement reveals ad-specific fields:

- Product name and price (optional)
- Product brief / specs (already exists — becomes required here)
- Offer or promo line (e.g. "20% off this week")
- Call to action + destination URL
- Ad objective: awareness, product launch, promo/discount, or retargeting
- Ad length: 15s / 30s / 60s
- Reference media uploader (already exists) — product photos/clips used as the ad's hero shots

Everything else (language, style, caption style, quality tier) stays as-is.

## 3. Ad-aware script generation with Gemini

The script prompt becomes a real ad brief when Video type is Advertisement:

- Enforced ad structure: hook → problem → product reveal → 2 concrete benefits from the specs → offer → single CTA
- Brand voice, audience, and offer injected from the brand kit
- Word budget matched to the chosen ad length so the voiceover fits
- No invented features — only specs the brand supplied
- Also asks Gemini for a short on-screen headline and end-card CTA text, saved with the video

## 4. Ad-aware rendering

The renderer treats the product as the star:

- Opens on the brand's own reference media, returns to it at the reveal and the CTA
- Pexels b-roll is used only to fill lifestyle/context gaps, keyed off the product brief
- Logo watermark in a corner for the full duration
- End card: brand colors, logo, headline, CTA text, and website for the last ~2.5 seconds
- Captions colored with the brand accent

## 5. Publishing to social channels

Channels page becomes multi-platform:

- YouTube (already working) — unchanged, now labelled as one connected platform
- Instagram card shown alongside it as **Coming soon** so the layout is final
- Each video's publish target is recorded, and the queue shows per-platform publish status
- Ads follow the same schedule/auto-publish path as regular videos

Instagram auto-posting will be added in a later step and requires an Instagram Business or Creator account linked to a Facebook Page — that's the only account type Instagram's API allows posting from.

## Technical notes

- Database: new `brand_profiles` table (one row per user: name, website, logo path, colors, tone, audience, default CTA) with RLS + grants; new columns on `videos`: `video_type`, `product_name`, `offer_text`, `cta_text`, `cta_url`, `ad_objective`, `target_seconds`, `headline_text`.
- `src/lib/brand.functions.ts` — read/update brand profile; logo stored in the existing assets bucket.
- `src/lib/generation.functions.ts` — `buildPrompt` branches on `video_type`; ad branch returns structured JSON (script + headline + CTA) so the render step can use the copy.
- `src/lib/pipeline.server.ts` — scene builder gains logo overlay, end-card scene, brand-colored captions, and reference-media-first ordering for ads.
- `src/routes/_authenticated/dashboard.queue.tsx` — Video type toggle and ad fields in the Generate modal; ad badge in the list.
- `src/routes/_authenticated/dashboard.settings.tsx` — Brand kit form.
- `src/routes/_authenticated/dashboard.channels.tsx` — platform cards (YouTube live, Instagram placeholder).
- No new API keys needed for this step; existing Gemini, ElevenLabs, Pexels, JSON2Video, and YouTube integrations cover it.
