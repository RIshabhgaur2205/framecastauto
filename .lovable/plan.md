# Framecast — Auth, Onboarding & Dashboard

Add Supabase auth (email/password + Google), a 3-step onboarding wizard, and a dark cinematic dashboard shell. Same visual language as the landing page — Bebas Neue display, electric violet accent, near-black surfaces, sharp edges, hairline borders.

## Backend (Lovable Cloud)

Enable Lovable Cloud, then create one migration with these tables (RLS on, GRANTs included, scoped to `auth.uid()`):

- `profiles` — `id uuid PK references auth.users on delete cascade`, `email`, `display_name`, `avatar_url`, `onboarded boolean default false`, timestamps. Auto-created via `handle_new_user()` trigger on `auth.users` insert.
- `user_preferences` — `user_id PK references auth.users on delete cascade`, `niche text`, `niche_custom text`, `posting_days text[]` (e.g. `['mon','wed','fri']`), `posting_time time`, `timezone text`, `quality_tier text check in ('standard','premium')`, `caption_style text check in ('minimal','bold','karaoke','subtitle')`, `brand_voice_notes text`, timestamps.
- `channels` — placeholder rows for connected YouTube channels: `id uuid PK`, `user_id`, `provider text default 'youtube'`, `external_id text`, `name text`, `status text default 'disconnected'`, timestamps. No OAuth yet — just the schema and a "Connect YouTube" placeholder button.
- `content_items` — placeholder schema for the content queue: `id uuid PK`, `user_id`, `channel_id`, `title text`, `status text` (queued/generating/published/failed), `scheduled_at timestamptz`, `published_at timestamptz`, timestamps.

RLS: owner-only `select/insert/update/delete using (auth.uid() = user_id)` on the three data tables; profiles policy on `id`. GRANT `SELECT, INSERT, UPDATE, DELETE` to `authenticated`, `ALL` to `service_role`.

## Auth surface

- `/auth` — single public route with two tabs: Sign in / Sign up. Email + password fields with Zod validation. Google button via `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth/callback" })`. Configure social auth so Google is enabled on the Supabase side.
- `/auth/callback` — public route that waits for `supabase.auth.getSession()`, reads `profiles.onboarded`, then routes to `/onboarding` (if false) or `/dashboard` (if true).
- Signed-in users that hit `/auth` are redirected away.
- Root listener for `onAuthStateChange` already wired by the integration; no extra subscribers.

## Onboarding wizard — `/_authenticated/onboarding`

Full-bleed dark page, centered card on `bg-surface` with hairline border. Cinematic styling — eyebrow label "ONBOARDING / 0X OF 03", Bebas Neue step titles, violet progress keyline at the top.

Three steps, single route with internal step state (no nested routes — simpler back/next, no URL churn):

1. **Pick your niche** — Shadcn Select with presets (Fitness, Finance tips, History facts, Productivity, Local business promo, Tech reviews, Cooking, Gaming, News recap) plus an "Other…" option that reveals a text input for `niche_custom`.
2. **Posting schedule** — 7 toggle chips for days of week (multi-select), a time picker (native `<input type="time">` styled), and a timezone Select pre-filled from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
3. **Default quality + caption style** — Two large card-style radio options for Standard vs Premium (with per-video price hint and short description). Below: 4 sample caption-style chips (Minimal, Bold, Karaoke, Subtitle) — pick one.

Footer: "Back" text link + violet "Continue" / final "Finish setup" button. On finish: upsert `user_preferences`, set `profiles.onboarded = true`, navigate to `/dashboard`. All writes go through a `createServerFn` with `requireSupabaseAuth`.

If the user lands on a protected route while `onboarded = false`, redirect to `/onboarding` (single client-side check inside the layout component, after the managed auth gate).

## Dashboard shell — `/_authenticated/dashboard*`

Layout route `src/routes/_authenticated/dashboard/route.tsx` with a persistent sidebar + main column:

- **Sidebar** (fixed left, 240px on desktop, drawer on mobile): Framecast wordmark at top, nav items with violet active indicator (left keyline + accent text), user chip at bottom with sign-out menu.
- **Top bar**: breadcrumb + page-specific actions slot.
- Same tokens as landing page — `bg-background`, `border-hairline`, `text-muted-foreground` for inactive, `text-accent` for active. No rounded bubbly cards, no admin-template feel.

Routes:

- `/dashboard` — **Overview**. Cinematic empty state: large display headline ("Your studio is quiet."), eyebrow label, single violet CTA "Generate your first video" (no-op for now). Below: 3 placeholder stat tiles using bracket `[X]` values consistent with landing.
- `/dashboard/channels` — **Channels**. Section header + one big bordered panel: YouTube icon, "Connect your YouTube channel" copy, violet "Connect YouTube" button (disabled-feeling click → toast "OAuth coming soon"). Lists any existing rows from `channels` (empty for now).
- `/dashboard/queue` — **Content queue**. Tabs: Upcoming / Past. Each shows an empty state with film-strip motif and copy ("No videos in the queue yet."). Schema-ready list rendering for when `content_items` populates.
- `/dashboard/billing` — **Billing**. Placeholder: current plan card (reads from preferences quality tier as a stand-in), "Upgrade" button, "Billing handled by Framecast — payments coming soon" note.
- `/dashboard/settings` — **Settings**. Form pre-filled from `user_preferences`: niche + custom override, posting days/time/timezone, caption style, quality tier, and a new `brand_voice_notes` textarea. Save button calls the same server fn as onboarding's finish step. Below: account section (email read-only, sign out, delete account placeholder).

All forms use react-hook-form + Zod. All data reads go through `createServerFn` + `requireSupabaseAuth`; reads from authenticated routes use `useSuspenseQuery` + `ensureQueryData` in loaders.

## File map

- `supabase/migrations/<ts>_framecast_auth.sql` — tables, RLS, GRANTs, `handle_new_user` trigger.
- `src/routes/auth.tsx`, `src/routes/auth.callback.tsx`
- `src/routes/_authenticated/onboarding.tsx`
- `src/routes/_authenticated/dashboard/route.tsx` (layout w/ sidebar)
- `src/routes/_authenticated/dashboard/index.tsx` (Overview)
- `src/routes/_authenticated/dashboard/channels.tsx`
- `src/routes/_authenticated/dashboard/queue.tsx`
- `src/routes/_authenticated/dashboard/billing.tsx`
- `src/routes/_authenticated/dashboard/settings.tsx`
- `src/lib/profile.functions.ts` — `getProfile`, `getPreferences`, `upsertPreferences`, `markOnboarded`
- `src/lib/channels.functions.ts`, `src/lib/content.functions.ts` — placeholder reads
- `src/components/dashboard/Sidebar.tsx`, `TopBar.tsx`, `EmptyState.tsx`
- `src/components/onboarding/StepShell.tsx`, `NicheStep.tsx`, `ScheduleStep.tsx`, `QualityStep.tsx`
- Update landing CTAs (`Start creating`, hero, final CTA) to link to `/auth`.

## Out of scope (this pass)

Real YouTube OAuth + API integration, real billing/payments, actual video generation pipeline, email verification customization, password reset page (can add later — not requested), team seats.
