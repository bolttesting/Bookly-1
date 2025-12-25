-- Allow customers to view services from businesses they're associated with
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'Customers can view services from their businesses'
  ) THEN
    CREATE POLICY "Customers can view services from their businesses"
      ON public.services FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.business_id = services.business_id
          AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow customers to view package templates from businesses they're associated with
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'package_templates' AND policyname = 'Customers can view package templates from their businesses'
  ) THEN
    CREATE POLICY "Customers can view package templates from their businesses"
      ON public.package_templates FOR SELECT
      TO authenticated
      USING (
        status = 'active' AND
        EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.business_id = package_templates.business_id
          AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow customers to view package services for packages they can see
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'package_services' AND policyname = 'Customers can view package services from their businesses'
  ) THEN
    CREATE POLICY "Customers can view package services from their businesses"
      ON public.package_services FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.package_templates pt
          JOIN public.customers c ON c.business_id = pt.business_id
          WHERE pt.id = package_services.package_template_id
          AND c.user_id = auth.uid()
          AND pt.status = 'active'
        )
      );
  END IF;
END $$;

-- Allow customers to view staff from businesses they're associated with
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_members' AND policyname = 'Customers can view staff from their businesses'
  ) THEN
    CREATE POLICY "Customers can view staff from their businesses"
      ON public.staff_members FOR SELECT
      TO authenticated
      USING (
        status = 'available' AND
        EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.business_id = staff_members.business_id
          AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow customers to view business hours from businesses they're associated with
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'business_hours' AND policyname = 'Customers can view business hours from their businesses'
  ) THEN
    CREATE POLICY "Customers can view business hours from their businesses"
      ON public.business_hours FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.business_id = business_hours.business_id
          AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow customers to view businesses they're associated with
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'businesses' AND policyname = 'Customers can view their businesses'
  ) THEN
    CREATE POLICY "Customers can view their businesses"
      ON public.businesses FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.business_id = businesses.id
          AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow customers to create appointments in businesses they're associated with
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'Customers can create appointments in their businesses'
  ) THEN
    CREATE POLICY "Customers can create appointments in their businesses"
      ON public.appointments FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.business_id = appointments.business_id
          AND c.user_id = auth.uid()
          AND c.id = appointments.customer_id
        )
      );
  END IF;
END $$;

-- Allow customers to view their own appointments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'Customers can view their own appointments'
  ) THEN
    CREATE POLICY "Customers can view their own appointments"
      ON public.appointments FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.id = appointments.customer_id
          AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow customers to purchase packages (create customer_packages)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customer_packages' AND policyname = 'Customers can purchase packages'
  ) THEN
    CREATE POLICY "Customers can purchase packages"
      ON public.customer_packages FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.id = customer_packages.customer_id
          AND c.user_id = auth.uid()
          AND c.business_id = customer_packages.business_id
        )
      );
  END IF;
END $$;

-- Allow authenticated users to create customer records for themselves
-- This is needed for the public booking flow when logged-in users book
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Authenticated users can create customer records for themselves'
  ) THEN
    CREATE POLICY "Authenticated users can create customer records for themselves"
      ON public.customers FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid() OR user_id IS NULL
      );
  END IF;
END $$;

-- Allow authenticated users to update customer records to link their user_id
-- This is needed when a customer record exists but user_id is null
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Authenticated users can update their customer records'
  ) THEN
    CREATE POLICY "Authenticated users can update their customer records"
      ON public.customers FOR UPDATE
      TO authenticated
      USING (
        user_id = auth.uid() OR user_id IS NULL
      )
      WITH CHECK (
        user_id = auth.uid() OR user_id IS NULL
      );
  END IF;
END $$;

-- Allow authenticated users to create appointments via public booking
-- This allows logged-in users to book via the public booking page
-- Similar to anonymous users, but for authenticated role
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'Authenticated users can create appointments via public booking'
  ) THEN
    CREATE POLICY "Authenticated users can create appointments via public booking"
      ON public.appointments FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

