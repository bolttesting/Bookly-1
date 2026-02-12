-- Allow public (anon) to view active package templates for booking widget
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_templates' AND policyname = 'Anyone can view active package templates') THEN
    CREATE POLICY "Anyone can view active package templates"
      ON public.package_templates FOR SELECT
      TO anon, authenticated
      USING (status = 'active');
  END IF;
END $$;

-- Allow public to view package_services for active packages
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_services' AND policyname = 'Anyone can view package services for active packages') THEN
    CREATE POLICY "Anyone can view package services for active packages"
      ON public.package_services FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.package_templates pt
          WHERE pt.id = package_services.package_template_id
          AND pt.status = 'active'
        )
      );
  END IF;
END $$;
