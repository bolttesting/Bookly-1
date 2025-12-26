-- Fix RLS policy to allow customers to create recurring appointment series
-- This migration adds the missing INSERT policy for customers

-- Drop existing policy if it exists (in case migration was already run)
DROP POLICY IF EXISTS "Customers can create their own recurring series" ON public.recurring_appointment_series;

-- Create policy for customers to insert their own recurring series
CREATE POLICY "Customers can create their own recurring series"
  ON public.recurring_appointment_series FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

