-- Tax: platform (Bookly) charges on business subscription checkout; businesses charge customers on bookings (used later).
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS platform_subscription_tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
  CHECK (platform_subscription_tax_percent >= 0 AND platform_subscription_tax_percent <= 100);

COMMENT ON COLUMN public.site_settings.platform_subscription_tax_percent IS
  'VAT/sales tax % added to Bookly subscription plan checkout (super admin).';

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS customer_booking_tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
  CHECK (customer_booking_tax_percent >= 0 AND customer_booking_tax_percent <= 100);

COMMENT ON COLUMN public.businesses.customer_booking_tax_percent IS
  'Tax % applied to customer bookings when business collects payment (future use).';

-- One row per paid Bookly subscription checkout (Stripe Checkout mode=payment).
CREATE TABLE IF NOT EXISTS public.platform_subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT,
  receipt_url TEXT,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  tax_amount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  account_name TEXT,
  account_email TEXT,
  business_name TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_subscription_invoices_business_paid
  ON public.platform_subscription_invoices(business_id, paid_at DESC);

ALTER TABLE public.platform_subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_subscription_invoices_select_business"
  ON public.platform_subscription_invoices
  FOR SELECT
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "platform_subscription_invoices_select_super_admin"
  ON public.platform_subscription_invoices
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Service role bypasses RLS for inserts from Edge Functions.
