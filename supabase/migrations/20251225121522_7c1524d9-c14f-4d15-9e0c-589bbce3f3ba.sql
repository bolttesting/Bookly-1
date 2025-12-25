-- Allow anon users to check if customer exists (by email for their booking)
CREATE POLICY "Anon can check existing customers by email"
ON public.customers
FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to create customers for public booking too
-- This handles the case when a logged-in user uses the public booking page
CREATE POLICY "Authenticated users can create customers via public booking"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (true);