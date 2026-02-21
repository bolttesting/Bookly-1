-- Link customer to current user (for public booking when customer was created as guest)
CREATE OR REPLACE FUNCTION public.link_customer_to_user(
  p_customer_id UUID,
  p_business_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to link customer';
  END IF;
  UPDATE public.customers
  SET user_id = auth.uid(), updated_at = now()
  WHERE id = p_customer_id
    AND business_id = p_business_id
    AND (user_id IS NULL OR user_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_customer_to_user TO authenticated;

-- Allow public booking to create customer_packages when RLS blocks direct insert
-- (e.g. customer row exists but user_id was not yet linked). Runs as definer so insert succeeds.

CREATE OR REPLACE FUNCTION public.create_customer_package_for_booking(
  p_customer_id UUID,
  p_package_template_id UUID,
  p_business_id UUID,
  p_expires_at TIMESTAMPTZ,
  p_bookings_remaining INT,
  p_bookings_used INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Only allow if the customer exists for this business and belongs to the current user
  IF NOT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = p_customer_id
      AND c.business_id = p_business_id
      AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Customer not found or you do not have permission to add a package for this customer';
  END IF;

  -- Ensure package template belongs to the business
  IF NOT EXISTS (
    SELECT 1 FROM public.package_templates pt
    WHERE pt.id = p_package_template_id AND pt.business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'Package not found for this business';
  END IF;

  INSERT INTO public.customer_packages (
    customer_id,
    package_template_id,
    business_id,
    expires_at,
    bookings_remaining,
    bookings_used,
    status
  ) VALUES (
    p_customer_id,
    p_package_template_id,
    p_business_id,
    p_expires_at,
    p_bookings_remaining,
    p_bookings_used,
    'active'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_package_for_booking TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_package_for_booking TO anon;

COMMENT ON FUNCTION public.create_customer_package_for_booking IS 'Creates a customer_package for public booking flow when RLS blocks direct insert. Requires customer.user_id = auth.uid().';

COMMENT ON FUNCTION public.link_customer_to_user IS 'Links an existing customer (by id) to the current authenticated user. Used when customer was created as guest.';
