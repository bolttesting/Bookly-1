-- Allow users to view ALL roles in businesses they belong to (so Team page can list members)
-- Existing "Users can view their own roles" only allowed seeing your own row
CREATE POLICY "Users can view roles in their business"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_business_access(auth.uid(), business_id));

-- Allow users to view profiles of team members in their business
-- (Team page shows names/emails from profiles; owner could only see own profile before)
CREATE POLICY "Users can view profiles of team members in their business"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT ur.user_id FROM public.user_roles ur
      WHERE public.has_business_access(auth.uid(), ur.business_id)
    )
  );
