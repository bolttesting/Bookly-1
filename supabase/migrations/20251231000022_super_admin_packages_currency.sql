-- Super admins: allow SELECT on customer_packages and package_templates
-- (App uses customer_packages + package_templates; old "packages" table may not exist or be empty.)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_packages' AND policyname = 'Super admins can view all customer_packages') THEN
    CREATE POLICY "Super admins can view all customer_packages"
      ON public.customer_packages FOR SELECT TO authenticated
      USING (public.is_super_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'package_templates' AND policyname = 'Super admins can view all package_templates') THEN
    CREATE POLICY "Super admins can view all package_templates"
      ON public.package_templates FOR SELECT TO authenticated
      USING (public.is_super_admin(auth.uid()));
  END IF;
END $$;

-- Optional: default display currency for super admin (e.g. overview totals)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'USD';

COMMENT ON COLUMN public.site_settings.default_currency IS 'Default currency code for super admin display (e.g. USD, INR)';
