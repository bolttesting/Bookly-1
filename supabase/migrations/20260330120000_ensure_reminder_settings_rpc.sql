-- Load-or-create reminder_settings for the dashboard without relying on client RLS for INSERT
-- (fixes OAuth / timing issues and policy edge cases).
CREATE OR REPLACE FUNCTION public.ensure_reminder_settings_for_business(p_business_id uuid)
RETURNS public.reminder_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.reminder_settings;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_business_access(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'Not allowed for this business';
  END IF;

  SELECT * INTO result
  FROM public.reminder_settings
  WHERE business_id = p_business_id;

  IF FOUND THEN
    RETURN result;
  END IF;

  INSERT INTO public.reminder_settings (business_id)
  VALUES (p_business_id)
  ON CONFLICT (business_id) DO NOTHING;

  SELECT * INTO result
  FROM public.reminder_settings
  WHERE business_id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not create reminder_settings row';
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_reminder_settings_for_business(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_reminder_settings_for_business(uuid) TO authenticated;

COMMENT ON FUNCTION public.ensure_reminder_settings_for_business(uuid) IS
  'Returns reminder_settings for the business or inserts a row with column defaults; caller must be a member via has_business_access.';
