-- Block individual time slots (e.g. block 2 PM on a specific date)
-- Use case: cancel/block a single class slot without cancelling the whole day or service

CREATE TABLE IF NOT EXISTS public.slot_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_slot_blocks_unique 
  ON public.slot_blocks (service_id, blocked_date, start_time);

CREATE INDEX IF NOT EXISTS idx_slot_blocks_service_date 
  ON public.slot_blocks (service_id, blocked_date);

ALTER TABLE public.slot_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view slot blocks"
  ON public.slot_blocks FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Business owners can manage slot blocks"
  ON public.slot_blocks FOR ALL
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id))
  WITH CHECK (public.has_business_access(auth.uid(), business_id));

DROP TRIGGER IF EXISTS update_slot_blocks_updated_at ON public.slot_blocks;
CREATE TRIGGER update_slot_blocks_updated_at
  BEFORE UPDATE ON public.slot_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
