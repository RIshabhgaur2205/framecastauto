## Goal

After a successful YouTube OAuth, replace the current toast-only feedback with a prominent confirmation modal showing the just-connected channel's name, avatar, and which scopes Google actually granted (upload, readonly, captions).

## Changes

**1. `src/routes/api/public/youtube/callback.ts`**
- Add `channel_id` to the redirect query so the channels page can highlight the specific channel.
- Already passes `yt_connected=<title>`; also pass `yt_scope` (the granted scope string from Google) and `yt_channel_id`.

**2. `src/routes/_authenticated/dashboard.channels.tsx`**
- On mount, read `yt_connected`, `yt_channel_id`, `yt_scope`, `yt_error` from query params.
- On success: open a new `<ConnectionConfirmDialog>` instead of just a toast. Keep toast on error.
- Strip query params after reading (already done).

**3. New `src/components/channels/ConnectionConfirmDialog.tsx`**
- Cinematic dark modal (shadcn `Dialog`) with:
  - Large channel thumbnail (fallback YouTube glyph)
  - Channel name + "Connected to Framecast" subtext
  - Scope checklist derived from the granted `scope` string:
    - Upload videos — `youtube.upload` ✓/✗
    - Read channel data — `youtube.readonly` ✓/✗
    - Manage captions — `youtube.force-ssl` ✓/✗
  - If any required scope (`youtube.upload`) is missing, show an amber warning row prompting reconnect.
  - Primary button "Go to Content Queue" → `/dashboard/queue`; secondary "Done" closes.

No DB, schema, or pipeline changes — UI + a couple of query-string fields only.
