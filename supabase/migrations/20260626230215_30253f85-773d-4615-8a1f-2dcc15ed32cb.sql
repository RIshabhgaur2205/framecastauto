ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS video_style text NOT NULL DEFAULT 'cinematic';