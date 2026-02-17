-- Let each business use their own email and SMS for notifications (same UI, their credentials)
-- Email: Resend API key + from address
CREATE TABLE IF NOT EXISTS public.business_email_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  resend_api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SMS: Twilio credentials + from number
CREATE TABLE IF NOT EXISTS public.business_sms_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_number TEXT NOT NULL,
  twilio_account_sid TEXT NOT NULL,
  twilio_auth_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_sms_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business can manage own email config"
  ON public.business_email_config FOR ALL
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business can manage own sms config"
  ON public.business_sms_config FOR ALL
  USING (public.has_business_access(auth.uid(), business_id));

-- Super admins can read (for support)
CREATE POLICY "Super admins can view business_email_config"
  ON public.business_email_config FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view business_sms_config"
  ON public.business_sms_config FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_business_email_config_updated_at
  BEFORE UPDATE ON public.business_email_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_sms_config_updated_at
  BEFORE UPDATE ON public.business_sms_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.business_email_config IS 'Optional: business uses own Resend for emails (from their domain)';
COMMENT ON TABLE public.business_sms_config IS 'Optional: business uses own Twilio for SMS';
