-- Create subscription_plans table for platform-wide subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_period TEXT NOT NULL DEFAULT 'month' CHECK (billing_period IN ('month', 'year')),
  features TEXT[], -- Array of feature strings
  max_appointments INTEGER, -- NULL means unlimited
  max_staff INTEGER, -- NULL means unlimited
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view active subscription plans (for landing page and business owners)
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Super admins can manage all subscription plans
CREATE POLICY "Super admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans
INSERT INTO public.subscription_plans (name, description, price, currency, billing_period, features, max_appointments, max_staff, is_popular, display_order) VALUES
('Starter', 'Perfect for getting started', 0, 'USD', 'month', ARRAY['Up to 50 appointments/month', '1 staff member', 'Basic calendar', 'Email reminders', 'Customer database'], 50, 1, false, 1),
('Professional', 'For growing businesses', 29, 'USD', 'month', ARRAY['Unlimited appointments', 'Unlimited staff members', 'Advanced calendar & scheduling', 'SMS & email reminders', 'Payment processing', 'Analytics & reports', 'Custom booking page', 'Priority support'], NULL, NULL, true, 2),
('Enterprise', 'For large organizations', 99, 'USD', 'month', ARRAY['Everything in Professional', 'Custom integrations', 'Dedicated support', 'Advanced analytics', 'White-label options', 'API access'], NULL, NULL, false, 3)
ON CONFLICT DO NOTHING;

