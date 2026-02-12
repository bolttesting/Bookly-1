-- Add attendance tracking to appointments
-- null = not yet marked, 'present' = attended, 'no_show' = did not appear

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS attendance_status TEXT
CHECK (attendance_status IS NULL OR attendance_status IN ('present', 'no_show'));

COMMENT ON COLUMN public.appointments.attendance_status IS 'Whether customer attended: present, no_show, or null if not yet marked';
