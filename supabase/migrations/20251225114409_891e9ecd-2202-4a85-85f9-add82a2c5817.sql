-- Allow owners to update roles in their business (not their own role, handled in app logic)
CREATE POLICY "Owners can update roles in their business"
ON public.user_roles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.business_id = user_roles.business_id
    AND ur.role = 'owner'
  )
);

-- Allow owners to delete roles in their business (except owner roles)
CREATE POLICY "Owners can delete non-owner roles in their business"
ON public.user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.business_id = user_roles.business_id
    AND ur.role = 'owner'
  )
  AND role != 'owner'
);