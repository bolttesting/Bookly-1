-- Add reschedule deadline setting to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS reschedule_deadline_hours INTEGER DEFAULT 24;

-- Add comment
COMMENT ON COLUMN public.businesses.reschedule_deadline_hours IS 'Minimum hours before appointment that reschedule requests are allowed (e.g., 24 means requests must be made at least 24 hours before)';

