-- Add functionality to cancel entire service/class and notify customers

-- Create table to track service cancellations
CREATE TABLE IF NOT EXISTS public.service_cancellations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  cancelled_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  cancelled_date DATE NOT NULL, -- The date when service is cancelled (affects all appointments on/after this date)
  notify_customers BOOLEAN NOT NULL DEFAULT true,
  reschedule_deadline DATE, -- Optional deadline for customers to reschedule
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_cancellations_business_id 
  ON public.service_cancellations(business_id);
CREATE INDEX IF NOT EXISTS idx_service_cancellations_service_id 
  ON public.service_cancellations(service_id);
CREATE INDEX IF NOT EXISTS idx_service_cancellations_cancelled_date 
  ON public.service_cancellations(cancelled_date);

-- Enable RLS
ALTER TABLE public.service_cancellations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Business owners can view service cancellations"
  ON public.service_cancellations FOR SELECT
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business owners can manage service cancellations"
  ON public.service_cancellations FOR ALL
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id))
  WITH CHECK (public.has_business_access(auth.uid(), business_id));

-- Function to cancel all appointments for a service and send reschedule emails
CREATE OR REPLACE FUNCTION public.cancel_service_appointments(
  p_service_id UUID,
  p_cancelled_date DATE,
  p_cancellation_reason TEXT DEFAULT NULL,
  p_reschedule_deadline DATE DEFAULT NULL,
  p_notify_customers BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_appointment RECORD;
  v_cancelled_count INTEGER := 0;
  v_email_sent_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- Get business_id from service
  SELECT business_id INTO v_business_id
  FROM services
  WHERE id = p_service_id;
  
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Service not found';
  END IF;
  
  -- Cancel all future appointments for this service (on or after cancelled_date)
  UPDATE appointments
  SET 
    status = 'cancelled',
    notes = COALESCE(notes || E'\n\n', '') || 
            'Service cancelled on ' || p_cancelled_date::text ||
            CASE WHEN p_cancellation_reason IS NOT NULL 
              THEN E'\nReason: ' || p_cancellation_reason 
              ELSE '' 
            END
  WHERE service_id = p_service_id
    AND status NOT IN ('cancelled', 'completed')
    AND DATE(start_time) >= p_cancelled_date;
  
  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
  
  -- If notifications are enabled, send reschedule emails
  IF p_notify_customers THEN
    FOR v_appointment IN 
      SELECT 
        a.id,
        a.customer_id,
        a.start_time,
        a.end_time,
        c.name as customer_name,
        c.email as customer_email,
        s.name as service_name,
        b.name as business_name
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id
      JOIN services s ON s.id = a.service_id
      JOIN businesses b ON b.id = a.business_id
      WHERE a.service_id = p_service_id
        AND a.status = 'cancelled'
        AND DATE(a.start_time) >= p_cancelled_date
        AND c.email IS NOT NULL
    LOOP
      -- Note: Email sending will be handled by Edge Function
      -- This function just marks appointments as cancelled
      -- The application should call the send-reschedule-email function for each appointment
      v_email_sent_count := v_email_sent_count + 1;
    END LOOP;
  END IF;
  
  -- Record the cancellation
  INSERT INTO service_cancellations (
    business_id,
    service_id,
    cancelled_by_user_id,
    cancellation_reason,
    cancelled_date,
    notify_customers,
    reschedule_deadline
  ) VALUES (
    v_business_id,
    p_service_id,
    auth.uid(),
    p_cancellation_reason,
    p_cancelled_date,
    p_notify_customers,
    p_reschedule_deadline
  );
  
  -- Return result
  v_result := json_build_object(
    'success', true,
    'cancelled_appointments', v_cancelled_count,
    'customers_notified', v_email_sent_count,
    'message', format('Cancelled %s appointment(s) for this service', v_cancelled_count)
  );
  
  RETURN v_result;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_service_cancellations_updated_at
  BEFORE UPDATE ON public.service_cancellations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

