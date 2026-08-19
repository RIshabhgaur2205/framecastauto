CREATE TABLE IF NOT EXISTS public.brand_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  brand_name TEXT,
  website_url TEXT,
  logo_path TEXT,
  primary_color TEXT DEFAULT '#7C3AED',
  accent_color TEXT DEFAULT '#FFFFFF',
  tone TEXT DEFAULT 'bold',
  tone_notes TEXT,
  target_audience TEXT,
  default_cta TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_profiles TO authenticated;
GRANT ALL ON public.brand_profiles TO service_role;

ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own brand profile" ON public.brand_profiles;
CREATE POLICY "Users manage their own brand profile"
  ON public.brand_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_brand_profiles_updated_at ON public.brand_profiles;
CREATE TRIGGER update_brand_profiles_updated_at
  BEFORE UPDATE ON public.brand_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS video_type TEXT NOT NULL DEFAULT 'content',
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS offer_text TEXT,
  ADD COLUMN IF NOT EXISTS cta_text TEXT,
  ADD COLUMN IF NOT EXISTS cta_url TEXT,
  ADD COLUMN IF NOT EXISTS ad_objective TEXT,
  ADD COLUMN IF NOT EXISTS target_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS headline_text TEXT;