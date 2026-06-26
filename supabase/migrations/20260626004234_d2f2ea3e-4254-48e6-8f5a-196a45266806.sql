
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS oauth_access_token text,
  ADD COLUMN IF NOT EXISTS oauth_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS oauth_scope text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS youtube_video_id text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS publish_error text;

CREATE INDEX IF NOT EXISTS idx_videos_ready_due
  ON public.videos (status, scheduled_for)
  WHERE status = 'ready';

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
