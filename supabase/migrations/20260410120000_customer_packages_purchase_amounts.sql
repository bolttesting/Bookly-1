-- Amounts at time of purchase (for customer receipts; optional for legacy rows).
ALTER TABLE public.customer_packages
  ADD COLUMN IF NOT EXISTS purchase_subtotal NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS purchase_tax_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS purchase_total NUMERIC(10, 2);

COMMENT ON COLUMN public.customer_packages.purchase_subtotal IS 'Pre-tax package price after coupon when purchased';
COMMENT ON COLUMN public.customer_packages.purchase_tax_amount IS 'Tax amount when purchased';
COMMENT ON COLUMN public.customer_packages.purchase_total IS 'Total paid (subtotal + tax) when purchased';
