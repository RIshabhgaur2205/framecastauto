ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS ai_frames jsonb,
  ADD COLUMN IF NOT EXISTS last_progress_at timestamptz;