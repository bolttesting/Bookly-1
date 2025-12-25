-- Create business_locations table
CREATE TABLE public.business_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view locations in their business"
ON public.business_locations FOR SELECT
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can insert locations in their business"
ON public.business_locations FOR INSERT
WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update locations in their business"
ON public.business_locations FOR UPDATE
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can delete locations in their business"
ON public.business_locations FOR DELETE
USING (has_business_access(auth.uid(), business_id));

-- Allow public to view active locations for booking
CREATE POLICY "Anyone can view active locations"
ON public.business_locations FOR SELECT
USING (status = 'active');

-- Add location_id to appointments table
ALTER TABLE public.appointments ADD COLUMN location_id UUID REFERENCES public.business_locations(id);

-- Create trigger for updated_at
CREATE TRIGGER update_business_locations_updated_at
BEFORE UPDATE ON public.business_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();