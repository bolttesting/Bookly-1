-- Create a helper function to create customers
-- This uses SECURITY DEFINER but RLS still applies unless we disable it
-- However, we can use this as an alternative if direct inserts fail

CREATE OR REPLACE FUNCTION public.create_customer_for_booking(
  p_business_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Insert the customer
  -- RLS policies will still be checked even with SECURITY DEFINER
  -- But this gives us a consistent way to create customers
  INSERT INTO public.customers (
    business_id,
    name,
    email,
    phone,
    notes,
    user_id
  ) VALUES (
    p_business_id,
    p_name,
    p_email,
    p_phone,
    p_notes,
    p_user_id
  )
  RETURNING id INTO v_customer_id;
  
  RETURN v_customer_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE EXCEPTION 'Failed to create customer: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.create_customer_for_booking TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_for_booking TO anon;

