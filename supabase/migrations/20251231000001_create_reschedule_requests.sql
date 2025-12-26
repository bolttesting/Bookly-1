-- Create reschedule_requests table
CREATE TABLE IF NOT EXISTS public.reschedule_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Customer who requested
  old_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  old_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  new_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  new_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT, -- Optional reason from customer
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin who reviewed
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT, -- Optional reason if rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_appointment_id ON public.reschedule_requests(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_business_id ON public.reschedule_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_customer_id ON public.reschedule_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON public.reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_requested_by ON public.reschedule_requests(requested_by_user_id);

-- Enable RLS
ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers can view their own reschedule requests
CREATE POLICY "Customers can view their reschedule requests"
  ON public.reschedule_requests FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    ) OR requested_by_user_id = auth.uid()
  );

-- Customers can create reschedule requests for their appointments
CREATE POLICY "Customers can create reschedule requests"
  ON public.reschedule_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    ) OR requested_by_user_id = auth.uid()
  );

-- Business owners can view all reschedule requests for their business
CREATE POLICY "Business owners can view reschedule requests"
  ON public.reschedule_requests FOR SELECT
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

-- Business owners can update (approve/reject) reschedule requests
CREATE POLICY "Business owners can update reschedule requests"
  ON public.reschedule_requests FOR UPDATE
  TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

-- Allow anon to create requests (for guest bookings)
CREATE POLICY "Anon can create reschedule requests for their appointments"
  ON public.reschedule_requests FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE id = appointment_id
        AND customer_id = reschedule_requests.customer_id
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_reschedule_requests_updated_at
  BEFORE UPDATE ON public.reschedule_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

