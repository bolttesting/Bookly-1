-- Add additional email notification options to reminder_settings
ALTER TABLE public.reminder_settings
ADD COLUMN IF NOT EXISTS send_booking_confirmation BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS send_cancellation_email BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS send_reschedule_email BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS send_welcome_email BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS send_followup_email BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS followup_days_after INTEGER DEFAULT 1; -- Days after appointment to send follow-up

