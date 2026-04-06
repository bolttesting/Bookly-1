-- Allow zero-amount (Starter / free plan) invoices without a Stripe Checkout session
ALTER TABLE public.platform_subscription_invoices
  ALTER COLUMN stripe_checkout_session_id DROP NOT NULL;

COMMENT ON COLUMN public.platform_subscription_invoices.stripe_checkout_session_id IS
  'Stripe Checkout session id when paid; NULL for free (zero-amount) plan invoices.';

-- Record a zero-amount platform invoice in plan currency; caller must be a member. Plan must be active with price = 0.
CREATE OR REPLACE FUNCTION public.record_free_platform_subscription_invoice(
  p_business_id uuid,
  p_plan_id uuid,
  p_account_email text DEFAULT NULL,
  p_account_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan record;
  v_business record;
  v_start timestamptz := date_trunc('month', now());
  v_end timestamptz := v_start + interval '1 month';
  v_id uuid;
  v_price numeric;
  v_currency text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_business_access(v_uid, p_business_id) THEN
    RAISE EXCEPTION 'Not allowed for this business';
  END IF;

  SELECT id, name, price, currency
  INTO v_plan
  FROM public.subscription_plans
  WHERE id = p_plan_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  v_price := COALESCE(v_plan.price, 0);
  IF v_price > 0 THEN
    RAISE EXCEPTION 'Use Stripe checkout for paid plans';
  END IF;

  SELECT name, email, currency INTO v_business FROM public.businesses WHERE id = p_business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  v_currency := lower(
    trim(
      coalesce(
        nullif(trim(v_plan.currency), ''),
        nullif(trim(v_business.currency), ''),
        'usd'
      )
    )
  );

  INSERT INTO public.platform_subscription_invoices (
    business_id,
    subscription_plan_id,
    plan_name,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_charge_id,
    stripe_customer_id,
    receipt_url,
    billing_period_start,
    billing_period_end,
    subtotal_cents,
    tax_percent,
    tax_amount_cents,
    total_cents,
    currency,
    account_name,
    account_email,
    business_name,
    paid_at
  ) VALUES (
    p_business_id,
    p_plan_id,
    v_plan.name,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    v_start,
    v_end,
    0,
    0,
    0,
    0,
    v_currency,
    nullif(trim(p_account_name), ''),
    nullif(trim(p_account_email), ''),
    v_business.name,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_free_platform_subscription_invoice(uuid, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_free_platform_subscription_invoice(uuid, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.record_free_platform_subscription_invoice IS
  'Creates a zero-amount Bookly subscription invoice in plan or business currency for an active free plan.';
