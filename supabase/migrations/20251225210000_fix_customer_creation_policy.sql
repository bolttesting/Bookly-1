-- Fix customer creation policies for authenticated users
-- The "Users can insert customers in their business" policy may be conflicting

-- Drop and recreate the permissive policy to ensure it exists
DROP POLICY IF EXISTS "Authenticated users can create customer records for themselves" ON public.customers;

CREATE POLICY "Authenticated users can create customer records for themselves"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

-- Ensure the business access policy doesn't conflict
-- Drop it first
DROP POLICY IF EXISTS "Users can insert customers in their business" ON public.customers;

-- Recreate it to only apply to authenticated users with business access
-- This way it won't conflict with public booking
CREATE POLICY "Users can insert customers in their business"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_business_access(auth.uid(), business_id)
  );

-- Also ensure customers can be updated
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

