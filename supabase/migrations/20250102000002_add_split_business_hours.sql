-- Add support for split business hours (multiple time ranges per day)
-- Example: 6:00 AM - 12:00 PM and 5:00 PM - 8:00 PM

-- Create new table for time ranges (supports multiple ranges per day)
CREATE TABLE IF NOT EXISTS public.business_hour_ranges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_hours_id UUID NOT NULL REFERENCES public.business_hours(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0, -- Order of ranges for the same day
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure start_time < end_time
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_hour_ranges_business_hours_id 
  ON public.business_hour_ranges(business_hours_id);

-- Enable RLS
ALTER TABLE public.business_hour_ranges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view business hour ranges" ON public.business_hour_ranges;
DROP POLICY IF EXISTS "Business owners can manage hour ranges" ON public.business_hour_ranges;

CREATE POLICY "Anyone can view business hour ranges"
  ON public.business_hour_ranges FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Business owners can manage hour ranges"
  ON public.business_hour_ranges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_hours bh
      WHERE bh.id = business_hour_ranges.business_hours_id
        AND public.has_business_access(auth.uid(), bh.business_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_hours bh
      WHERE bh.id = business_hour_ranges.business_hours_id
        AND public.has_business_access(auth.uid(), bh.business_id)
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_business_hour_ranges_updated_at ON public.business_hour_ranges;
CREATE TRIGGER update_business_hour_ranges_updated_at
  BEFORE UPDATE ON public.business_hour_ranges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing business_hours to use ranges (create default range for each existing hour)
INSERT INTO public.business_hour_ranges (business_hours_id, start_time, end_time, display_order)
SELECT 
  id,
  open_time,
  close_time,
  0
FROM public.business_hours
WHERE is_closed = false
  AND NOT EXISTS (
    SELECT 1 FROM public.business_hour_ranges 
    WHERE business_hours_id = business_hours.id
  );

-- Note: We keep the existing business_hours table for backward compatibility
-- The new ranges table allows multiple time slots per day
-- If no ranges exist for a day, fall back to open_time/close_time from business_hours

