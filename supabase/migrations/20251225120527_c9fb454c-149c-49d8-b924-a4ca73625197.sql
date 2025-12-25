-- Allow public access to read businesses by slug
CREATE POLICY "Anyone can view businesses by slug"
ON public.businesses
FOR SELECT
TO anon
USING (true);

-- Allow public access to read active services for a business
CREATE POLICY "Anyone can view active services"
ON public.services
FOR SELECT
TO anon
USING (status = 'active');

-- Allow public access to read available staff for a business
CREATE POLICY "Anyone can view available staff"
ON public.staff_members
FOR SELECT
TO anon
USING (status = 'available');

-- Allow public users to create customers (for booking)
CREATE POLICY "Anyone can create customers for booking"
ON public.customers
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public users to create appointments (for booking)
CREATE POLICY "Anyone can create appointments for booking"
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (true);