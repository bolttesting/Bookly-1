-- Add location_id to business_hours table (nullable for default business hours)
ALTER TABLE public.business_hours ADD COLUMN location_id uuid REFERENCES public.business_locations(id) ON DELETE CASCADE;

-- Create unique constraint for location-specific hours
ALTER TABLE public.business_hours DROP CONSTRAINT IF EXISTS business_hours_business_id_day_of_week_key;
ALTER TABLE public.business_hours ADD CONSTRAINT business_hours_unique_day UNIQUE (business_id, location_id, day_of_week);

-- Create index for faster lookups
CREATE INDEX idx_business_hours_location ON public.business_hours(location_id);