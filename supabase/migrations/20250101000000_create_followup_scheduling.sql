-- Create table to track scheduled follow-up emails
CREATE TABLE IF NOT EXISTS public.scheduled_followup_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  scheduled_send_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_followup_appointment_id ON public.scheduled_followup_emails(appointment_id);
CREATE INDEX IF NOT EXISTS idx_followup_business_id ON public.scheduled_followup_emails(business_id);
CREATE INDEX IF NOT EXISTS idx_followup_status ON public.scheduled_followup_emails(status);
CREATE INDEX IF NOT EXISTS idx_followup_scheduled_date ON public.scheduled_followup_emails(scheduled_send_date);

-- Enable RLS
ALTER TABLE public.scheduled_followup_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Business owners can view their scheduled follow-ups"
  ON public.scheduled_followup_emails FOR SELECT
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

-- Allow service role (system) to manage all follow-ups
CREATE POLICY "Service role can manage all scheduled follow-ups"
  ON public.scheduled_followup_emails FOR ALL
  TO service_role
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_followup_updated_at
  BEFORE UPDATE ON public.scheduled_followup_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to schedule follow-up email when appointment is marked as completed
CREATE OR REPLACE FUNCTION public.schedule_followup_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminder_settings RECORD;
  v_followup_days INTEGER;
  v_scheduled_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get reminder settings for this business
    SELECT send_followup_email, followup_days_after
    INTO v_reminder_settings
    FROM public.reminder_settings
    WHERE business_id = NEW.business_id
    LIMIT 1;

    -- Only schedule if follow-up emails are enabled
    IF v_reminder_settings.send_followup_email = TRUE THEN
      v_followup_days := COALESCE(v_reminder_settings.followup_days_after, 1);
      v_scheduled_date := NEW.end_time + (v_followup_days || ' days')::INTERVAL;

      -- Insert scheduled follow-up email
      INSERT INTO public.scheduled_followup_emails (
        appointment_id,
        business_id,
        customer_id,
        scheduled_send_date,
        status
      ) VALUES (
        NEW.id,
        NEW.business_id,
        NEW.customer_id,
        v_scheduled_date,
        'pending'
      )
      ON CONFLICT DO NOTHING; -- Prevent duplicates
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on appointments table
DROP TRIGGER IF EXISTS schedule_followup_on_completion ON public.appointments;
CREATE TRIGGER schedule_followup_on_completion
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed'))
  EXECUTE FUNCTION public.schedule_followup_email();

