-- Fix the conflicting appointment policy
-- The "Users can insert appointments in their business" policy applies to 'public' role
-- which includes both anon and authenticated, causing conflicts with public booking

-- Drop the conflicting policy
DROP POLICY IF EXISTS "Users can insert appointments in their business" ON public.appointments;

-- Recreate it to only apply when user has business access
-- This way it won't conflict with public booking policies
CREATE POLICY "Users can insert appointments in their business"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_business_access(auth.uid(), business_id)
  );

