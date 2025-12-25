-- Simplify customer creation policies
-- Remove redundant policies and keep only the necessary ones

-- Drop the redundant policy (we already have a permissive one)
DROP POLICY IF EXISTS "Authenticated users can create customer records for themselves" ON public.customers;

-- Keep "Authenticated users can create customers via public booking" which is more permissive
-- This policy already allows all authenticated users to create customers

-- The "Users can insert customers in their business" policy is fine for business owners/admins
-- It won't conflict because policies are OR'd together

-- Verify the remaining policies are correct:
-- 1. "Anyone can create customers for booking" (anon) - WITH CHECK (true) ✓
-- 2. "Authenticated users can create customers via public booking" (authenticated) - WITH CHECK (true) ✓
-- 3. "Users can insert customers in their business" (authenticated) - WITH CHECK (has_business_access) ✓

