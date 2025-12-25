-- Remove the redundant customer policy that's causing conflicts
-- The "Authenticated users can create customer records for themselves" policy
-- is redundant because we already have "Authenticated users can create customers via public booking"
-- which is more permissive (WITH CHECK true)

DROP POLICY IF EXISTS "Authenticated users can create customer records for themselves" ON public.customers;

-- After this, you should have only 3 customer INSERT policies:
-- 1. "Anyone can create customers for booking" (anon)
-- 2. "Authenticated users can create customers via public booking" (authenticated) - WITH CHECK (true)
-- 3. "Users can insert customers in their business" (authenticated) - WITH CHECK (has_business_access)

