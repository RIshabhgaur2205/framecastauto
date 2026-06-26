
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.videos REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'videos'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.videos';
  END IF;
END $$;
