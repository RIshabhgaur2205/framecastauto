
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS captions_json jsonb,
  ADD COLUMN IF NOT EXISTS srt_text text,
  ADD COLUMN IF NOT EXISTS stock_clips jsonb,
  ADD COLUMN IF NOT EXISTS shotstack_render_id text,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric;

DROP POLICY IF EXISTS "Users read own video-assets" ON storage.objects;
DROP POLICY IF EXISTS "Users write own video-assets" ON storage.objects;

CREATE POLICY "Users read own video-assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'video-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users write own video-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'video-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
