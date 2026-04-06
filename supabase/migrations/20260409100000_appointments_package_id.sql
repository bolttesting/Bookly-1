-- Link appointments to customer_packages when booking consumes a package (public booking "use package").
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.customer_packages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_package_id ON public.appointments(package_id);

COMMENT ON COLUMN public.appointments.package_id IS 'When set, this visit was booked against a customer package (credits).';
