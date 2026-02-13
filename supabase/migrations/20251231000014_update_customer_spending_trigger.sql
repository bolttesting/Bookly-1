-- Update customer total_spent and total_visits when appointments change
-- Trigger keeps customers table in sync when: status=completed, payment received, or attendance marked

CREATE OR REPLACE FUNCTION public.refresh_customer_spending(p_customer_id UUID, p_business_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.customers
  SET
    total_visits = (
      SELECT COUNT(*)::INTEGER
      FROM public.appointments a
      WHERE a.customer_id = p_customer_id
        AND a.business_id = p_business_id
        AND (a.status = 'completed' OR a.attendance_status = 'present')
    ),
    total_spent = (
      SELECT COALESCE(SUM(price), 0)::DECIMAL(10,2)
      FROM public.appointments a
      WHERE a.customer_id = p_customer_id
        AND a.business_id = p_business_id
        AND (a.status = 'completed'
             OR a.payment_status IN ('paid', 'partial')
             OR a.attendance_status = 'present')
    )
  WHERE id = p_customer_id AND business_id = p_business_id;
END;
$$;

-- Trigger: fire when status, payment_status, or attendance_status changes (or on delete)
CREATE OR REPLACE FUNCTION public.trigger_update_customer_spending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
  v_business_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_customer_id := OLD.customer_id;
    v_business_id := OLD.business_id;
  ELSE
    v_customer_id := NEW.customer_id;
    v_business_id := NEW.business_id;
  END IF;

  PERFORM public.refresh_customer_spending(v_customer_id, v_business_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_spending_on_appointment_change ON public.appointments;

CREATE TRIGGER customer_spending_on_appointment_change
  AFTER INSERT OR UPDATE OF status, payment_status, attendance_status OR DELETE
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_customer_spending();

-- Backfill: recalculate all customers' total_visits and total_spent from appointments
UPDATE public.customers c
SET
  total_visits = sub.visits,
  total_spent = sub.spent
FROM (
  SELECT
    a.customer_id,
    a.business_id,
    COUNT(*) FILTER (WHERE a.status = 'completed' OR a.attendance_status = 'present')::INTEGER AS visits,
    COALESCE(SUM(a.price) FILTER (WHERE a.status = 'completed' OR a.payment_status IN ('paid', 'partial') OR a.attendance_status = 'present'), 0)::DECIMAL(10,2) AS spent
  FROM public.appointments a
  GROUP BY a.customer_id, a.business_id
) sub
WHERE c.id = sub.customer_id AND c.business_id = sub.business_id;

-- Reset customers with no appointments to 0
UPDATE public.customers c
SET total_visits = 0, total_spent = 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.customer_id = c.id AND a.business_id = c.business_id
);
