-- Class schedule for fitness/yoga studios: facilities (rooms per location), use_class_schedule, scheduled_classes
-- Same weekly schedule can apply to multiple locations; rooms (facilities) are per location.

-- 1) Businesses: opt-in to class schedule (fitness, yoga, pilates)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS use_class_schedule BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.use_class_schedule IS 'When true, booking uses weekly class schedule (today’s classes) instead of open time slots.';

-- 2) Facilities = rooms per location (e.g. Reformer Room, Movement Room)
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facilities_location ON public.facilities(location_id);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business can manage facilities at their locations"
  ON public.facilities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_locations bl
      WHERE bl.id = facilities.location_id
        AND public.has_business_access(auth.uid(), bl.business_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_locations bl
      WHERE bl.id = facilities.location_id
        AND public.has_business_access(auth.uid(), bl.business_id)
    )
  );

-- Public can view facilities for active locations (for booking page)
CREATE POLICY "Anyone can view facilities for active locations"
  ON public.facilities FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_locations bl
      WHERE bl.id = facilities.location_id AND bl.status = 'active'
    )
  );

DROP TRIGGER IF EXISTS update_facilities_updated_at ON public.facilities;
CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Weekly class schedule: one row per (location, day, time, service, staff, facility)
-- Same logical schedule can be duplicated per location with different facilities.
CREATE TABLE IF NOT EXISTS public.scheduled_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_classes_business ON public.scheduled_classes(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_location_day ON public.scheduled_classes(location_id, day_of_week);

ALTER TABLE public.scheduled_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business can manage scheduled classes"
  ON public.scheduled_classes FOR ALL
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id))
  WITH CHECK (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Anyone can view scheduled classes for booking"
  ON public.scheduled_classes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP TRIGGER IF EXISTS update_scheduled_classes_updated_at ON public.scheduled_classes;
CREATE TRIGGER update_scheduled_classes_updated_at
  BEFORE UPDATE ON public.scheduled_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Appointments: optional facility (room) for class bookings
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.appointments.facility_id IS 'Room/facility when booking from class schedule (fitness/yoga).';
