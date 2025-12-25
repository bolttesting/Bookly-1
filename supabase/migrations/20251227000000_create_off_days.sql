-- Create off_days table for marking specific dates as closed (holidays, special events, etc.)
CREATE TABLE public.off_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.business_locations(id) ON DELETE CASCADE,
  off_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, location_id, off_date)
);

-- Create index for faster queries
CREATE INDEX idx_off_days_business_date ON public.off_days(business_id, off_date);
CREATE INDEX idx_off_days_location_date ON public.off_days(location_id, off_date) WHERE location_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.off_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view off days"
ON public.off_days
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can manage off days in their business"
ON public.off_days
FOR ALL
TO authenticated
USING (public.has_business_access(auth.uid(), business_id))
WITH CHECK (public.has_business_access(auth.uid(), business_id));

-- Create trigger for updated_at
CREATE TRIGGER update_off_days_updated_at
BEFORE UPDATE ON public.off_days
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

