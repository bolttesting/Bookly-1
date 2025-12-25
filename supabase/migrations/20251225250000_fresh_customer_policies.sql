-- COMPLETE FRESH START: Drop ALL customer INSERT policies and recreate them
-- This is a clean rewrite to fix any policy conflicts

-- Step 1: Ensure RLS is enabled (it should be, but let's be explicit)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing customer INSERT policies (clean slate)
DROP POLICY IF EXISTS "Anyone can create customers for booking" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customers via public booking" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customer records for themselves" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers in their business" ON public.customers;

-- Step 3: Recreate policies in the correct order with explicit PERMISSIVE (default but explicit)
-- Policy 1: Anonymous users (for public booking without login)
CREATE POLICY "Anyone can create customers for booking"
  ON public.customers
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy 2: Authenticated users (for public booking when logged in)
-- This MUST be permissive and allow all authenticated users
CREATE POLICY "Authenticated users can create customers via public booking"
  ON public.customers
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: Business owners/admins (for admin interface)
-- This is more restrictive but won't conflict because policies are OR'd
CREATE POLICY "Users can insert customers in their business"
  ON public.customers
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_business_access(auth.uid(), business_id)
  );

-- Step 4: Also ensure UPDATE policy exists for linking user_id
DROP POLICY IF EXISTS "Authenticated users can update their customer records" ON public.customers;

CREATE POLICY "Authenticated users can update their customer records"
  ON public.customers
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR user_id IS NULL
  )
  WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

