-- RPC to save business hours reliably (bypasses RLS edge cases with NULL location_id)
CREATE OR REPLACE FUNCTION public.save_business_hours(
  p_business_id UUID,
  p_location_id UUID,
  p_hours JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_business_access(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Delete existing hours for this business+location
  IF p_location_id IS NULL THEN
    DELETE FROM business_hours
    WHERE business_id = p_business_id AND location_id IS NULL;
  ELSE
    DELETE FROM business_hours
    WHERE business_id = p_business_id AND location_id = p_location_id;
  END IF;

  -- Insert new hours
  INSERT INTO business_hours (business_id, location_id, day_of_week, open_time, close_time, is_closed)
  SELECT
    p_business_id,
    p_location_id,
    (e->>'day_of_week')::int,
    (COALESCE(e->>'open_time', '09:00'))::time,
    (COALESCE(e->>'close_time', '18:00'))::time,
    COALESCE((e->>'is_closed')::boolean, false)
  FROM jsonb_array_elements(p_hours) AS e;
END;
$$;
 