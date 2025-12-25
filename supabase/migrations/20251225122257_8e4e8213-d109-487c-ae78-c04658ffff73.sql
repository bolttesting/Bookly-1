-- Add buffer_time and slot_capacity to services table
ALTER TABLE public.services
ADD COLUMN buffer_time INTEGER NOT NULL DEFAULT 0,
ADD COLUMN slot_capacity INTEGER NOT NULL DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN public.services.buffer_time IS 'Buffer time in minutes between appointments';
COMMENT ON COLUMN public.services.slot_capacity IS 'Number of concurrent bookings allowed per time slot';