-- Drop all existing policies on businesses and recreate them cleanly
DROP POLICY IF EXISTS "Users can view businesses they belong to" ON public.businesses;
DROP POLICY IF EXISTS "Users can update businesses they own" ON public.businesses;
DROP POLICY IF EXISTS "Super admins can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Anyone can view businesses by slug" ON public.businesses;
DROP POLICY IF EXISTS "Allow authenticated users to insert businesses" ON public.businesses;
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON public.businesses;

-- Recreate all policies as PERMISSIVE explicitly
CREATE POLICY "businesses_select_own" ON public.businesses
  FOR SELECT TO authenticated
  USING (has_business_access(auth.uid(), id));

CREATE POLICY "businesses_select_super_admin" ON public.businesses
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "businesses_select_public" ON public.businesses
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "businesses_insert" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "businesses_update" ON public.businesses
  FOR UPDATE TO authenticated
  USING (has_business_access(auth.uid(), id));