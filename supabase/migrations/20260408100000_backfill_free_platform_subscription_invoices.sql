-- Synthetic history for businesses that were already on a free (price <= 0) plan before
-- record_free_platform_subscription_invoice existed. Stripe never charged them, so there
-- are no real receipts — one zero-amount row per calendar month from business creation
-- through the current month. Skips any month that already has a free invoice
-- (stripe_checkout_session_id IS NULL) for that business and billing_period_start.

-- Required for NULL checkout id on free invoices. Idempotent if 20260406130000 already ran.
ALTER TABLE public.platform_subscription_invoices
  ALTER COLUMN stripe_checkout_session_id DROP NOT NULL;

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
)
SELECT
  b.id,
  p.id,
  p.name,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  m.period_start,
  m.period_start + interval '1 month',
  0,
  0::numeric(5, 2),
  0,
  0,
  lower(
    trim(
      coalesce(
        nullif(trim(p.currency), ''),
        nullif(trim(b.currency), ''),
        'usd'
      )
    )
  ),
  NULL,
  nullif(trim(b.email), ''),
  b.name,
  m.period_start + interval '14 days'
FROM public.businesses b
INNER JOIN public.subscription_plans p
  ON p.id = b.subscription_plan_id
  AND p.is_active = true
  AND coalesce(p.price, 0) <= 0
CROSS JOIN LATERAL (
  SELECT gs::timestamptz AS period_start
  FROM generate_series(
    date_trunc('month', b.created_at),
    date_trunc('month', now()),
    interval '1 month'
  ) AS gs
) m
WHERE b.created_at <= now()
  AND NOT EXISTS (
    SELECT 1
    FROM public.platform_subscription_invoices i
    WHERE i.business_id = b.id
      AND i.stripe_checkout_session_id IS NULL
      AND i.billing_period_start = m.period_start
  );
