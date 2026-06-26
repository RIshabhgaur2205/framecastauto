
CREATE TABLE IF NOT EXISTS public.channel_secrets (
  channel_id uuid PRIMARY KEY REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  oauth_refresh_token text NOT NULL,
  oauth_access_token text,
  oauth_expires_at timestamptz,
  oauth_scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Service-role only. Do NOT grant to anon or authenticated.
REVOKE ALL ON public.channel_secrets FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.channel_secrets TO service_role;

ALTER TABLE public.channel_secrets ENABLE ROW LEVEL SECURITY;
-- No policies → all client-role access denied. Service role bypasses RLS.

CREATE TRIGGER update_channel_secrets_updated_at
  BEFORE UPDATE ON public.channel_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing token data
INSERT INTO public.channel_secrets (channel_id, user_id, oauth_refresh_token, oauth_access_token, oauth_expires_at, oauth_scope)
SELECT id, user_id, oauth_refresh_token, oauth_access_token, oauth_expires_at, oauth_scope
FROM public.channels
WHERE oauth_refresh_token IS NOT NULL
ON CONFLICT (channel_id) DO NOTHING;

-- Drop sensitive columns from client-readable table
ALTER TABLE public.channels
  DROP COLUMN IF EXISTS oauth_refresh_token,
  DROP COLUMN IF EXISTS oauth_access_token,
  DROP COLUMN IF EXISTS oauth_expires_at,
  DROP COLUMN IF EXISTS oauth_scope;
