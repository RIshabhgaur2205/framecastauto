## Problem

The YouTube OAuth callback upserts into `channels` with `onConflict: "user_id,channel_id"`, but that table only has a primary key on `id` — no unique constraint on `(user_id, channel_id)`. Postgres rejects the upsert with: *"there is no unique or exclusion constraint matching the ON CONFLICT specification"*.

## Fix

One migration:

1. De-duplicate any existing rows that share `(user_id, channel_id)`, keeping the most recent (`connected_at` desc, then `id`), so the new constraint can be created cleanly.
2. Add `UNIQUE (user_id, channel_id)` on `public.channels`.

No code changes required — the existing callback upsert will then succeed and reconnects to the same channel will update in place instead of erroring or duplicating.

`channel_secrets` is fine: its PK is `channel_id`, which matches the second upsert's `onConflict: "channel_id"`.
