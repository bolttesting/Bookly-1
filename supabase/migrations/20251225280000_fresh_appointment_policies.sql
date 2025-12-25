-- COMPLETE FRESH START: Drop ALL appointment INSERT policies and recreate them
-- This is a clean rewrite to fix any policy conflicts

-- Step 1: Ensure RLS is enabled (it should be, but let's be explicit)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing appointment INSERT policies (clean slate)
DROP POLICY IF EXISTS "Anyone can create appointments for booking" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments via public booking" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert appointments in their business" ON public.appointments;
DROP POLICY IF EXISTS "Customers can create appointments in their businesses" ON public.appointments;

-- Step 3: Recreate policies in the correct order with explicit PERMISSIVE
-- Policy 1: Anonymous users (for public booking without login)
CREATE POLICY "Anyone can create appointments for booking"
  ON public.appointments
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy 2: Authenticated users (for public booking when logged in)
-- This MUST be permissive and allow all authenticated users
CREATE POLICY "Authenticated users can create appointments via public booking"
  ON public.appointments
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: Business owners/admins (for admin interface)
-- This is more restrictive but won't conflict because policies are OR'd
CREATE POLICY "Users can insert appointments in their business"
  ON public.appointments
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_business_access(auth.uid(), business_id)
  );

-- Verify: After running this, you should have exactly 3 policies
-- Run this to verify:
-- SELECT policyname, roles, cmd, with_check
-- FROM pg_policies
-- WHERE tablename = 'appointments' AND cmd = 'INSERT'
-- ORDER BY policyname;

