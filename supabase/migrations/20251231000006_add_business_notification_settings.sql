-- Add business notification preferences to reminder_settings
ALTER TABLE public.reminder_settings
ADD COLUMN IF NOT EXISTS notify_new_bookings BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_cancellations BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_daily_summary BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notify_marketing_updates BOOLEAN DEFAULT FALSE;
