-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON public.businesses;

-- Create a proper permissive policy for business creation
CREATE POLICY "Authenticated users can create businesses"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);