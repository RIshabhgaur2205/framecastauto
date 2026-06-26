
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS product_description text,
  ADD COLUMN IF NOT EXISTS reference_media jsonb NOT NULL DEFAULT '[]'::jsonb;
