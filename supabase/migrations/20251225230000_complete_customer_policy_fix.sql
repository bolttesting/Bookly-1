-- Complete fix for customer creation policies
-- Drop all existing INSERT policies and recreate them cleanly

-- Drop all customer INSERT policies
DROP POLICY IF EXISTS "Anyone can create customers for booking" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customers via public booking" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customer records for themselves" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers in their business" ON public.customers;

-- Recreate policies in the correct order
-- 1. Anonymous users can create customers (for public booking)
CREATE POLICY "Anyone can create customers for booking"
  ON public.customers FOR INSERT
  TO anon
  WITH CHECK (true);

-- 2. Authenticated users can create customers (for public booking when logged in)
-- This is the most permissive policy for authenticated users
CREATE POLICY "Authenticated users can create customers via public booking"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Business owners/admins can create customers in their business
-- This is more restrictive but won't conflict because policies are OR'd
CREATE POLICY "Users can insert customers in their business"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_business_access(auth.uid(), business_id)
  );

-- Also ensure customers can be updated by authenticated users
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

