-- Add auto_confirm_bookings to reminder_settings (default true = current behavior)
ALTER TABLE public.reminder_settings
ADD COLUMN IF NOT EXISTS auto_confirm_bookings BOOLEAN DEFAULT TRUE;

-- Allow anyone to read reminder_settings (needed for public booking page to read
-- send_booking_confirmation, send_welcome_email, auto_confirm_bookings)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reminder_settings' AND policyname = 'Allow read reminder_settings for public booking'
  ) THEN
    CREATE POLICY "Allow read reminder_settings for public booking"
      ON public.reminder_settings FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

COMMENT ON COLUMN public.reminder_settings.auto_confirm_bookings IS 'When true, new bookings are created as confirmed; when false, as pending.';
