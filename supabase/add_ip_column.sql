ALTER TABLE public.rsvps
ADD COLUMN IF NOT EXISTS ip text;

CREATE INDEX IF NOT EXISTS rsvps_ip_created_at_idx
  ON public.rsvps (ip, created_at DESC);
