-- Add booking theme setting for Public Booking Page and widget
-- 'light' | 'dark' | 'system' (system = use visitor's preference)

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS booking_theme TEXT
DEFAULT 'system'
CHECK (booking_theme IS NULL OR booking_theme IN ('light', 'dark', 'system'));

COMMENT ON COLUMN public.businesses.booking_theme IS 'Theme for public booking page: light, dark, or system (visitor preference)';
