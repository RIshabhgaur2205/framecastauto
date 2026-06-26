
DROP POLICY IF EXISTS "Users insert their own ledger" ON public.credit_ledger;

CREATE POLICY "Users read own video-assets update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'video-assets' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'video-assets' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own video-assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'video-assets' AND (auth.uid())::text = (storage.foldername(name))[1]);
