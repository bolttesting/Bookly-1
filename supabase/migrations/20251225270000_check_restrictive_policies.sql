-- Check for and remove any RESTRICTIVE policies on customers table
-- RESTRICTIVE policies can block inserts even if PERMISSIVE policies allow them

-- First, let's check if there are any RESTRICTIVE policies
-- (This is informational - PostgreSQL doesn't have a direct way to check policy type in pg_policies)
-- But we can ensure all policies are explicitly PERMISSIVE

-- Drop and recreate all customer INSERT policies to ensure they're all PERMISSIVE
DROP POLICY IF EXISTS "Anyone can create customers for booking" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customers via public booking" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers in their business" ON public.customers;

-- Recreate all policies as explicitly PERMISSIVE
CREATE POLICY "Anyone can create customers for booking"
  ON public.customers
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create customers via public booking"
  ON public.customers
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can insert customers in their business"
  ON public.customers
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_business_access(auth.uid(), business_id)
  );

-- Verify: Run this query to see all policies:
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'customers' AND cmd = 'INSERT'
-- ORDER BY policyname;

