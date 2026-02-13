-- Fix: Allow updating attendance on past appointments
-- The validate_appointment_insert trigger was blocking all updates where start_time is in the past.
-- We need to allow updates (attendance, status, reschedule, etc.) on past appointments.
-- Only enforce "Cannot book appointments in the past" on INSERT.

CREATE OR REPLACE FUNCTION public.validate_appointment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure business_id exists
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = NEW.business_id) THEN
    RAISE EXCEPTION 'Invalid business_id: business does not exist';
  END IF;

  -- Ensure customer_id exists
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = NEW.customer_id) THEN
    RAISE EXCEPTION 'Invalid customer_id: customer does not exist';
  END IF;

  -- Ensure service_id exists
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = NEW.service_id) THEN
    RAISE EXCEPTION 'Invalid service_id: service does not exist';
  END IF;

  -- Ensure customer belongs to the same business
  IF NOT EXISTS (
    SELECT 1 FROM public.customers
    WHERE id = NEW.customer_id
    AND business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Customer does not belong to the specified business';
  END IF;

  -- Ensure service belongs to the same business
  IF NOT EXISTS (
    SELECT 1 FROM public.services
    WHERE id = NEW.service_id
    AND business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Service does not belong to the specified business';
  END IF;

  -- Ensure start_time is before end_time
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;

  -- Only block NEW appointments in the past (INSERT). Allow updates (attendance, reschedule, etc.)
  IF TG_OP = 'INSERT' AND NEW.start_time < NOW() - INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Cannot book appointments in the past';
  END IF;

  RETURN NEW;
END;
$$;
