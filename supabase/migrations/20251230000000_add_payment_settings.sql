-- Add payment settings to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS require_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_timing TEXT DEFAULT 'advance' CHECK (payment_timing IN ('advance', 'on_spot', 'partial')),
ADD COLUMN IF NOT EXISTS payment_due_before_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS allow_partial_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS partial_payment_percentage INTEGER DEFAULT 50; -- Percentage for partial payments

-- Add payment status to appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded', 'failed')),
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;

-- Create index for payment status
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_id ON public.appointments(payment_id);

-- Update RLS policy to allow payment creation
DROP POLICY IF EXISTS "Business owners can insert payments" ON public.payments;
CREATE POLICY "Business owners can insert payments"
  ON public.payments FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.user_roles WHERE user_id = auth.uid()
    ) OR business_id IN (
      SELECT id FROM public.businesses WHERE id = business_id
    )
  );

