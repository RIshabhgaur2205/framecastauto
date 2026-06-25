
-- Extend profiles with creator preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS posting_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS posting_time time,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS default_quality_tier text DEFAULT 'standard';

-- Extend channels with YouTube-specific fields
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS channel_id text,
  ADD COLUMN IF NOT EXISTS channel_name text,
  ADD COLUMN IF NOT EXISTS oauth_refresh_token text,
  ADD COLUMN IF NOT EXISTS connected_at timestamptz;

-- Videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  title text,
  status text NOT NULL DEFAULT 'queued',
  niche text,
  script_text text,
  voiceover_url text,
  video_url text,
  thumbnail_url text,
  caption_style text,
  quality_tier text,
  scheduled_for timestamptz,
  posted_at timestamptz,
  cost_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own videos"
  ON public.videos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS videos_user_scheduled_idx
  ON public.videos (user_id, scheduled_for DESC);

-- Credit ledger
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own ledger"
  ON public.credit_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own ledger"
  ON public.credit_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS credit_ledger_user_idx
  ON public.credit_ledger (user_id, created_at DESC);
