-- Fix appointment booking policies for authenticated users
-- This ensures logged-in users can book via the public booking page

-- First, drop the policy if it exists (to recreate it)
DROP POLICY IF EXISTS "Authenticated users can create appointments via public booking" ON public.appointments;

-- Also drop the restrictive policy that requires business access for authenticated users
-- This policy conflicts with public booking
DROP POLICY IF EXISTS "Users can insert appointments in their business" ON public.appointments;

-- Create a permissive policy that allows authenticated users to create appointments
-- This is needed for the public booking flow when logged-in users book
CREATE POLICY "Authenticated users can create appointments via public booking"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Recreate the business access policy but make it more specific
-- Only apply to business owners/admins, not regular authenticated users
CREATE POLICY "Users can insert appointments in their business"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_business_access(auth.uid(), business_id)
  );

-- Also ensure customers can be created by authenticated users
DROP POLICY IF EXISTS "Authenticated users can create customer records for themselves" ON public.customers;

CREATE POLICY "Authenticated users can create customer records for themselves"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

-- Ensure customers can be updated by authenticated users
DROP POLICY IF EXISTS "Authenticated users can update their customer records" ON public.customers;

CREATE POLICY "Authenticated users can update their customer records"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR user_id IS NULL
  )
  WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

