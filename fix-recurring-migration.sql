-- Quick fix script to resolve "policy already exists" error
-- Run this in Supabase SQL Editor if the migration fails

-- Drop all existing policies for recurring_appointment_series
DROP POLICY IF EXISTS "Business owners can view their recurring series" ON public.recurring_appointment_series;
DROP POLICY IF EXISTS "Business owners can manage their recurring series" ON public.recurring_appointment_series;
DROP POLICY IF EXISTS "Customers can view their own recurring series" ON public.recurring_appointment_series;
DROP POLICY IF EXISTS "Customers can create their own recurring series" ON public.recurring_appointment_series;

-- Recreate policies
CREATE POLICY "Business owners can view their recurring series"
  ON public.recurring_appointment_series FOR SELECT
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business owners can manage their recurring series"
  ON public.recurring_appointment_series FOR ALL
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id))
  WITH CHECK (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Customers can view their own recurring series"
  ON public.recurring_appointment_series FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create their own recurring series"
  ON public.recurring_appointment_series FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

