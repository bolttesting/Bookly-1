-- Allow customers to update their own customer_packages when consuming a booking
-- (decrement bookings_remaining, increment bookings_used). Used when booking a service
-- from My Appointments with "Use package".
CREATE POLICY "Customers can update own package for consumption"
  ON public.customer_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_packages.customer_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_packages.customer_id
      AND c.user_id = auth.uid()
    )
  );
