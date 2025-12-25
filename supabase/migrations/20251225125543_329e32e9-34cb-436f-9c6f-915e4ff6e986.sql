-- Drop all existing insert-related policies on businesses
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON public.businesses;

-- Create a simple permissive INSERT policy
CREATE POLICY "Allow authenticated users to insert businesses" 
ON public.businesses 
FOR INSERT 
TO authenticated
WITH CHECK (true);