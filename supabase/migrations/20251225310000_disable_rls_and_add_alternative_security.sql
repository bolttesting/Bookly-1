-- Disable RLS and add alternative security measures
-- This removes RLS but adds triggers and constraints for security

-- Step 1: Drop all existing RLS policies (clean slate)
-- Customers policies
DROP POLICY IF EXISTS "Anyone can create customers for booking" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customers via public booking" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers in their business" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customer records for themselves" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update their customer records" ON public.customers;

-- Appointments policies
DROP POLICY IF EXISTS "Anyone can create appointments for booking" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments via public booking" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert appointments in their business" ON public.appointments;
DROP POLICY IF EXISTS "Customers can create appointments in their businesses" ON public.appointments;

-- Step 2: Disable RLS
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;

-- Step 3: Add security triggers to validate data
-- These triggers will run on INSERT/UPDATE to ensure data integrity

-- Function to validate customer creation
CREATE OR REPLACE FUNCTION public.validate_customer_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure business_id exists
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = NEW.business_id) THEN
    RAISE EXCEPTION 'Invalid business_id: business does not exist';
  END IF;
  
  -- If user_id is provided, ensure it's valid
  IF NEW.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Invalid user_id: user does not exist';
  END IF;
  
  -- Ensure name is not empty
  IF NEW.name IS NULL OR TRIM(NEW.name) = '' THEN
    RAISE EXCEPTION 'Customer name cannot be empty';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to validate appointment creation
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
  
  -- Ensure start_time is in the future (allow some buffer for timezone issues)
  IF NEW.start_time < NOW() - INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Cannot book appointments in the past';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS validate_customer_insert_trigger ON public.customers;
CREATE TRIGGER validate_customer_insert_trigger
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_customer_insert();

DROP TRIGGER IF EXISTS validate_appointment_insert_trigger ON public.appointments;
CREATE TRIGGER validate_appointment_insert_trigger
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_insert();

-- Step 4: Add indexes for performance (since we're not using RLS for filtering)
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON public.appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments(customer_id);

-- Note: This approach removes RLS but adds:
-- 1. Data validation via triggers
-- 2. Foreign key constraints (already exist)
-- 3. Business logic validation
-- 
-- For production, you should also:
-- 1. Use Supabase API keys properly (anon key for public, service role for admin)
-- 2. Add rate limiting
-- 3. Add application-level authorization checks
-- 4. Monitor and log suspicious activity

