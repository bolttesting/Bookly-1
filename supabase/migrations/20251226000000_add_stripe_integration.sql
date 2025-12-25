-- Add Stripe integration fields to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

-- Create payments table to track transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.customer_packages(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  payment_method TEXT, -- card, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table for super admin
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL, -- basic, pro, enterprise
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, past_due, trialing
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create super_admin_settings table for Stripe connection
CREATE TABLE IF NOT EXISTS public.super_admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_account_id TEXT,
  stripe_connected BOOLEAN DEFAULT FALSE,
  stripe_publishable_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default super admin settings row (only one should exist)
INSERT INTO public.super_admin_settings (id)
VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON public.subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Business owners can view their payments"
  ON public.payments FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Customers can view their own payments"
  ON public.payments FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for subscriptions
CREATE POLICY "Business owners can view their subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));

-- RLS Policies for super_admin_settings (only super admins)
CREATE POLICY "Super admins can manage settings"
  ON public.super_admin_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
    )
  );

