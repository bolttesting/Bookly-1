-- Create appointment_reminders table
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email', 'sms', 'both')),
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  hours_before INTEGER NOT NULL, -- 24, 2, etc.
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reminder_settings table for business-level reminder preferences
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  enable_email_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  enable_sms_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_hours_before INTEGER[] NOT NULL DEFAULT ARRAY[24, 2], -- Array of hours before appointment
  email_template TEXT, -- Custom email template
  sms_template TEXT, -- Custom SMS template
  send_reminder_on_booking BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reminders_appointment_id ON public.appointment_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reminders_business_id ON public.appointment_reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.appointment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON public.appointment_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminder_settings_business_id ON public.reminder_settings(business_id);

-- Enable RLS
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointment_reminders
CREATE POLICY "Business owners can view their reminders"
  ON public.appointment_reminders FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business owners can manage their reminders"
  ON public.appointment_reminders FOR ALL
  USING (public.has_business_access(auth.uid(), business_id));

-- RLS Policies for reminder_settings
CREATE POLICY "Business owners can manage their reminder settings"
  ON public.reminder_settings FOR ALL
  USING (public.has_business_access(auth.uid(), business_id));

-- Create trigger for updated_at
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.appointment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminder_settings_updated_at
  BEFORE UPDATE ON public.reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

