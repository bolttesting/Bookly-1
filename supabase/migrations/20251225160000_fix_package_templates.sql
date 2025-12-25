-- Fix package_templates table - Add weeks support and recreate if needed

-- First, drop existing constraints if they exist
DO $$ 
BEGIN
  -- Drop the table if it exists (only if you want to start fresh)
  -- DROP TABLE IF EXISTS public.package_services CASCADE;
  -- DROP TABLE IF EXISTS public.customer_packages CASCADE;
  -- DROP TABLE IF EXISTS public.package_templates CASCADE;
  
  -- Or just alter the constraint if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'package_templates') THEN
    -- Alter the constraint to include weeks
    ALTER TABLE public.package_templates 
    DROP CONSTRAINT IF EXISTS package_templates_duration_type_check;
    
    ALTER TABLE public.package_templates 
    ADD CONSTRAINT package_templates_duration_type_check 
    CHECK (duration_type IN ('days', 'weeks', 'months', 'years'));
  END IF;
END $$;

-- Create package_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.package_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  booking_limit INTEGER NOT NULL DEFAULT 1,
  duration_type TEXT NOT NULL DEFAULT 'months' CHECK (duration_type IN ('days', 'weeks', 'months', 'years')),
  duration_value INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create package_services junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.package_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_template_id UUID NOT NULL REFERENCES public.package_templates(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (package_template_id, service_id)
);

-- Create customer_packages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.customer_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  package_template_id UUID NOT NULL REFERENCES public.package_templates(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  bookings_used INTEGER NOT NULL DEFAULT 0,
  bookings_remaining INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'package_templates' AND policyname = 'Users can view package templates in their business'
  ) THEN
    ALTER TABLE public.package_templates ENABLE ROW LEVEL SECURITY;
    
    -- RLS Policies for package_templates
    CREATE POLICY "Users can view package templates in their business"
      ON public.package_templates FOR SELECT
      USING (public.has_business_access(auth.uid(), business_id));

    CREATE POLICY "Users can insert package templates in their business"
      ON public.package_templates FOR INSERT
      WITH CHECK (public.has_business_access(auth.uid(), business_id));

    CREATE POLICY "Users can update package templates in their business"
      ON public.package_templates FOR UPDATE
      USING (public.has_business_access(auth.uid(), business_id));

    CREATE POLICY "Users can delete package templates in their business"
      ON public.package_templates FOR DELETE
      USING (public.has_business_access(auth.uid(), business_id));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'package_services' AND policyname = 'Users can view package services in their business'
  ) THEN
    ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;
    
    -- RLS Policies for package_services
    CREATE POLICY "Users can view package services in their business"
      ON public.package_services FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.package_templates pt
          WHERE pt.id = package_services.package_template_id
          AND public.has_business_access(auth.uid(), pt.business_id)
        )
      );

    CREATE POLICY "Users can manage package services in their business"
      ON public.package_services FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.package_templates pt
          WHERE pt.id = package_services.package_template_id
          AND public.has_business_access(auth.uid(), pt.business_id)
        )
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customer_packages' AND policyname = 'Users can view customer packages in their business'
  ) THEN
    ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;
    
    -- RLS Policies for customer_packages
    CREATE POLICY "Users can view customer packages in their business"
      ON public.customer_packages FOR SELECT
      USING (public.has_business_access(auth.uid(), business_id));

    CREATE POLICY "Users can insert customer packages in their business"
      ON public.customer_packages FOR INSERT
      WITH CHECK (public.has_business_access(auth.uid(), business_id));

    CREATE POLICY "Users can update customer packages in their business"
      ON public.customer_packages FOR UPDATE
      USING (public.has_business_access(auth.uid(), business_id));

    -- Customers can view their own packages
    CREATE POLICY "Customers can view their own packages"
      ON public.customer_packages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.id = customer_packages.customer_id
          AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add updated_at triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_package_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_package_templates_updated_at 
      BEFORE UPDATE ON public.package_templates 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_customer_packages_updated_at'
  ) THEN
    CREATE TRIGGER update_customer_packages_updated_at 
      BEFORE UPDATE ON public.customer_packages 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Update or create function to calculate expiration date based on duration
CREATE OR REPLACE FUNCTION public.calculate_package_expiry(
  duration_type TEXT,
  duration_value INTEGER
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE duration_type
    WHEN 'days' THEN
      RETURN now() + (duration_value || ' days')::INTERVAL;
    WHEN 'weeks' THEN
      RETURN now() + (duration_value || ' weeks')::INTERVAL;
    WHEN 'months' THEN
      RETURN now() + (duration_value || ' months')::INTERVAL;
    WHEN 'years' THEN
      RETURN now() + (duration_value || ' years')::INTERVAL;
    ELSE
      RETURN now() + '1 month'::INTERVAL;
  END CASE;
END;
$$;

-- Update or create function to check if package is valid for booking
CREATE OR REPLACE FUNCTION public.is_package_valid(
  _customer_package_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _package customer_packages%ROWTYPE;
BEGIN
  SELECT * INTO _package
  FROM public.customer_packages
  WHERE id = _customer_package_id;
  
  IF _package IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF _package.status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  IF _package.expires_at < now() THEN
    RETURN FALSE;
  END IF;
  
  IF _package.bookings_remaining <= 0 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

