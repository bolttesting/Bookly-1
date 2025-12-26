-- Create recurring_appointment_series table
CREATE TABLE IF NOT EXISTS public.recurring_appointment_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,
  
  -- Recurrence settings
  recurrence_pattern TEXT NOT NULL CHECK (recurrence_pattern IN ('weekly', 'monthly')),
  recurrence_frequency INTEGER NOT NULL DEFAULT 1, -- For weekly: every X weeks (1 = weekly, 2 = bi-weekly). For monthly: every X months
  start_date DATE NOT NULL, -- First appointment date
  end_date DATE, -- Optional end date (null = no end date)
  max_occurrences INTEGER, -- Optional max number of appointments (null = unlimited)
  time_of_day TIME NOT NULL, -- Time of day for appointments (HH:MM)
  
  -- Series metadata
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  notes TEXT,
  price DECIMAL(10,2), -- Price per appointment
  
  -- Tracking
  total_created INTEGER NOT NULL DEFAULT 0, -- Number of appointments created so far
  last_generated_date DATE, -- Last date for which appointments were generated
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add recurring_series_id to appointments table
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS recurring_series_id UUID REFERENCES public.recurring_appointment_series(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_series_business_id ON public.recurring_appointment_series(business_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_customer_id ON public.recurring_appointment_series(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_status ON public.recurring_appointment_series(status);
CREATE INDEX IF NOT EXISTS idx_recurring_series_start_date ON public.recurring_appointment_series(start_date);
CREATE INDEX IF NOT EXISTS idx_appointments_recurring_series_id ON public.appointments(recurring_series_id);

-- Enable RLS
ALTER TABLE public.recurring_appointment_series ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_appointment_series
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Business owners can view their recurring series" ON public.recurring_appointment_series;
DROP POLICY IF EXISTS "Business owners can manage their recurring series" ON public.recurring_appointment_series;
DROP POLICY IF EXISTS "Customers can view their own recurring series" ON public.recurring_appointment_series;
DROP POLICY IF EXISTS "Customers can create their own recurring series" ON public.recurring_appointment_series;

CREATE POLICY "Business owners can view their recurring series"
  ON public.recurring_appointment_series FOR SELECT
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Business owners can manage their recurring series"
  ON public.recurring_appointment_series FOR ALL
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id))
  WITH CHECK (public.has_business_access(auth.uid(), business_id));

-- Allow customers to view their own recurring series
CREATE POLICY "Customers can view their own recurring series"
  ON public.recurring_appointment_series FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- Allow customers to create their own recurring series
CREATE POLICY "Customers can create their own recurring series"
  ON public.recurring_appointment_series FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_recurring_series_updated_at ON public.recurring_appointment_series;
CREATE TRIGGER update_recurring_series_updated_at
  BEFORE UPDATE ON public.recurring_appointment_series
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate next appointment dates for a recurring series
-- This will be called when creating a series or when appointments need to be generated
CREATE OR REPLACE FUNCTION public.generate_recurring_appointments(
  series_id UUID,
  generate_until_date DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_generated_count INTEGER := 0;
  v_appointment_date DATE;
  v_appointment_start TIMESTAMP WITH TIME ZONE;
  v_appointment_end TIMESTAMP WITH TIME ZONE;
  v_service_duration INTEGER;
  v_day_of_week INTEGER;
  v_business_hours RECORD;
  v_is_off_day BOOLEAN;
  v_existing_appointment BOOLEAN;
  v_max_date DATE;
BEGIN
  -- Get series details
  SELECT 
    rs.*,
    s.duration as service_duration
  INTO v_series
  FROM recurring_appointment_series rs
  JOIN services s ON s.id = rs.service_id
  WHERE rs.id = series_id
    AND rs.status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring series not found or not active';
  END IF;
  
  -- Determine end date for generation
  v_max_date := COALESCE(generate_until_date, CURRENT_DATE + INTERVAL '3 months');
  IF v_series.end_date IS NOT NULL AND v_series.end_date < v_max_date THEN
    v_max_date := v_series.end_date;
  END IF;
  
  -- Start from the last generated date or start_date
  v_current_date := COALESCE(v_series.last_generated_date, v_series.start_date);
  
    -- If last_generated_date exists, move to next occurrence
    IF v_series.last_generated_date IS NOT NULL THEN
      CASE v_series.recurrence_pattern
        WHEN 'weekly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
      END CASE;
    END IF;
  
  -- Generate appointments until max_date or max_occurrences
  WHILE v_current_date <= v_max_date LOOP
    -- Check max_occurrences limit
    IF v_series.max_occurrences IS NOT NULL AND v_series.total_created >= v_series.max_occurrences THEN
      EXIT;
    END IF;
    
    -- Check if date is in the past (shouldn't happen, but safety check)
    IF v_current_date < CURRENT_DATE THEN
      CASE v_series.recurrence_pattern
        WHEN 'weekly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
      END CASE;
      CONTINUE;
    END IF;
    
    -- Check if date is an off day
    SELECT EXISTS (
      SELECT 1 FROM off_days
      WHERE business_id = v_series.business_id
        AND off_date = v_current_date
        AND (location_id = v_series.location_id OR (location_id IS NULL AND v_series.location_id IS NULL))
    ) INTO v_is_off_day;
    
    IF v_is_off_day THEN
      -- Skip off days, move to next occurrence
      CASE v_series.recurrence_pattern
        WHEN 'weekly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
      END CASE;
      CONTINUE;
    END IF;
    
    -- Check business hours for this day
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;
    SELECT * INTO v_business_hours
    FROM business_hours
    WHERE business_id = v_series.business_id
      AND day_of_week = v_day_of_week
      AND (location_id = v_series.location_id OR (location_id IS NULL AND v_series.location_id IS NULL))
    LIMIT 1;
    
    -- If no business hours found or day is closed, skip
    IF NOT FOUND OR (v_business_hours.is_closed = true) THEN
      CASE v_series.recurrence_pattern
        WHEN 'weekly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
      END CASE;
      CONTINUE;
    END IF;
    
    -- Check if time is within business hours
    IF v_series.time_of_day < v_business_hours.open_time OR v_series.time_of_day > v_business_hours.close_time THEN
      -- Time is outside business hours, skip
      CASE v_series.recurrence_pattern
        WHEN 'weekly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
      END CASE;
      CONTINUE;
    END IF;
    
    -- Check if appointment already exists for this date/time
    v_appointment_start := (v_current_date::text || ' ' || v_series.time_of_day::text)::TIMESTAMP WITH TIME ZONE;
    v_appointment_end := v_appointment_start + (v_service_duration || ' minutes')::INTERVAL;
    
    SELECT EXISTS (
      SELECT 1 FROM appointments
      WHERE business_id = v_series.business_id
        AND (
          (start_time >= v_appointment_start AND start_time < v_appointment_end)
          OR (end_time > v_appointment_start AND end_time <= v_appointment_end)
          OR (start_time <= v_appointment_start AND end_time >= v_appointment_end)
        )
        AND status NOT IN ('cancelled')
        AND (staff_id = v_series.staff_id OR (staff_id IS NULL AND v_series.staff_id IS NULL))
    ) INTO v_existing_appointment;
    
    IF v_existing_appointment THEN
      -- Conflict exists, skip this date
      CASE v_series.recurrence_pattern
        WHEN 'weekly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
          v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
      END CASE;
      CONTINUE;
    END IF;
    
    -- Create the appointment
    INSERT INTO appointments (
      business_id,
      customer_id,
      service_id,
      staff_id,
      start_time,
      end_time,
      status,
      price,
      notes,
      recurring_series_id
    ) VALUES (
      v_series.business_id,
      v_series.customer_id,
      v_series.service_id,
      v_series.staff_id,
      v_appointment_start,
      v_appointment_end,
      'confirmed',
      v_series.price,
      v_series.notes,
      series_id
    );
    
    v_generated_count := v_generated_count + 1;
    
    -- Update series tracking
    UPDATE recurring_appointment_series
    SET 
      total_created = total_created + 1,
      last_generated_date = v_current_date
    WHERE id = series_id;
    
    -- Move to next occurrence
    CASE v_series.recurrence_pattern
      WHEN 'weekly' THEN
        v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
      WHEN 'monthly' THEN
        v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
    END CASE;
  END LOOP;
  
  RETURN v_generated_count;
END;
$$;

