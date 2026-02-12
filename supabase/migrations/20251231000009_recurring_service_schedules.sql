-- Update generate_recurring_appointments to respect service_schedules
-- When a service has custom schedules for a day, recurring time must fall within those ranges

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
  v_has_service_schedule BOOLEAN;
  v_in_service_schedule BOOLEAN;
BEGIN
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
  
  v_service_duration := v_series.service_duration;
  v_max_date := COALESCE(generate_until_date, CURRENT_DATE + INTERVAL '3 months');
  IF v_series.end_date IS NOT NULL AND v_series.end_date < v_max_date THEN
    v_max_date := v_series.end_date;
  END IF;
  
  v_current_date := COALESCE(v_series.last_generated_date, v_series.start_date);
  
  IF v_series.last_generated_date IS NOT NULL THEN
    CASE v_series.recurrence_pattern
      WHEN 'weekly' THEN
        v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
      WHEN 'monthly' THEN
        v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
    END CASE;
  END IF;
  
  WHILE v_current_date <= v_max_date LOOP
    IF v_series.max_occurrences IS NOT NULL AND v_series.total_created >= v_series.max_occurrences THEN
      EXIT;
    END IF;
    
    IF v_current_date < CURRENT_DATE THEN
      CASE v_series.recurrence_pattern
        WHEN 'weekly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
      END CASE;
      CONTINUE;
    END IF;
    
    SELECT EXISTS (
      SELECT 1 FROM off_days
      WHERE business_id = v_series.business_id
        AND off_date = v_current_date
        AND (location_id = v_series.location_id OR (location_id IS NULL AND v_series.location_id IS NULL))
    ) INTO v_is_off_day;
    
    IF v_is_off_day THEN
      CASE v_series.recurrence_pattern
        WHEN 'weekly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
      END CASE;
      CONTINUE;
    END IF;
    
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;
    
    -- Check service_schedules first: if service has custom schedule for this day, time must fit
    SELECT EXISTS (
      SELECT 1 FROM service_schedules
      WHERE service_id = v_series.service_id AND day_of_week = v_day_of_week
    ) INTO v_has_service_schedule;
    
    IF v_has_service_schedule THEN
      SELECT EXISTS (
        SELECT 1 FROM service_schedules ss
        WHERE ss.service_id = v_series.service_id
          AND ss.day_of_week = v_day_of_week
          AND v_series.time_of_day >= ss.start_time
          AND (v_series.time_of_day + (v_service_duration || ' minutes')::interval)::time <= ss.end_time
      ) INTO v_in_service_schedule;
      
      IF NOT v_in_service_schedule THEN
        CASE v_series.recurrence_pattern
          WHEN 'weekly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
          WHEN 'monthly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
        END CASE;
        CONTINUE;
      END IF;
    ELSE
      -- No service schedule: use business hours
      SELECT * INTO v_business_hours
      FROM business_hours
      WHERE business_id = v_series.business_id
        AND day_of_week = v_day_of_week
        AND (location_id = v_series.location_id OR (location_id IS NULL AND v_series.location_id IS NULL))
      LIMIT 1;
      
      IF NOT FOUND OR (v_business_hours.is_closed = true) THEN
        CASE v_series.recurrence_pattern
          WHEN 'weekly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
          WHEN 'monthly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
        END CASE;
        CONTINUE;
      END IF;
      
      IF v_series.time_of_day < v_business_hours.open_time OR v_series.time_of_day > v_business_hours.close_time THEN
        CASE v_series.recurrence_pattern
          WHEN 'weekly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
          WHEN 'monthly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
        END CASE;
        CONTINUE;
      END IF;
    END IF;
    
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
      CASE v_series.recurrence_pattern
        WHEN 'weekly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
      END CASE;
      CONTINUE;
    END IF;
    
    INSERT INTO appointments (
      business_id, customer_id, service_id, staff_id, location_id,
      start_time, end_time, status, price, notes, recurring_series_id
    ) VALUES (
      v_series.business_id, v_series.customer_id, v_series.service_id, v_series.staff_id, v_series.location_id,
      v_appointment_start, v_appointment_end, 'confirmed', v_series.price, v_series.notes, series_id
    );
    
    v_generated_count := v_generated_count + 1;
    
    UPDATE recurring_appointment_series
    SET total_created = total_created + 1, last_generated_date = v_current_date
    WHERE id = series_id;
    
    CASE v_series.recurrence_pattern
      WHEN 'weekly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' weeks')::INTERVAL;
      WHEN 'monthly' THEN v_current_date := v_current_date + (v_series.recurrence_frequency || ' months')::INTERVAL;
    END CASE;
  END LOOP;
  
  RETURN v_generated_count;
END;
$$;
