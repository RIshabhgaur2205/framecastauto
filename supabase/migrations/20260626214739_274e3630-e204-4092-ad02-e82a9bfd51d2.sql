-- Deduplicate any existing rows sharing (user_id, channel_id), keep newest
DELETE FROM public.channels a
USING public.channels b
WHERE a.user_id = b.user_id
  AND a.channel_id = b.channel_id
  AND (a.connected_at, a.id::text) < (b.connected_at, b.id::text);

ALTER TABLE public.channels
  ADD CONSTRAINT channels_user_channel_unique UNIQUE (user_id, channel_id);