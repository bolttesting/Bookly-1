-- Add currency field to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

-- Add comment
COMMENT ON COLUMN public.businesses.currency IS 'Currency code (ISO 4217) for the business, e.g., USD, EUR, GBP';

