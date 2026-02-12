-- Service-specific time windows (e.g. Pilates 9am-1pm, Yoga 2pm-4pm)
-- Use case: 1 employee providing multiple services - each service has its own time slots per day
-- If no schedule exists for a service+day, fall back to business hours

CREATE TABLE IF NOT EXISTS public.service_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_service_time_range CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_service_schedules_service_day
  ON public.service_schedules (service_id, day_of_week);

ALTER TABLE public.service_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service schedules"
  ON public.service_schedules FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Business owners can manage service schedules"
  ON public.service_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_schedules.service_id
        AND public.has_business_access(auth.uid(), s.business_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_schedules.service_id
        AND public.has_business_access(auth.uid(), s.business_id)
    )
  );

DROP TRIGGER IF EXISTS update_service_schedules_updated_at ON public.service_schedules;
CREATE TRIGGER update_service_schedules_updated_at
  BEFORE UPDATE ON public.service_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
