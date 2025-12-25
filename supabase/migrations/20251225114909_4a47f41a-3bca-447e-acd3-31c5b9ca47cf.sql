-- Create super_admins table to store global administrators
CREATE TABLE public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Only super admins can view the super_admins table
CREATE POLICY "Super admins can view super_admins"
ON public.super_admins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = _user_id
  )
$$;

-- Allow super admins to view ALL businesses
CREATE POLICY "Super admins can view all businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Allow super admins to view ALL customers
CREATE POLICY "Super admins can view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Allow super admins to view ALL packages
CREATE POLICY "Super admins can view all packages"
ON public.packages
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Allow super admins to view ALL appointments
CREATE POLICY "Super admins can view all appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Allow super admins to view ALL user_roles
CREATE POLICY "Super admins can view all user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Allow super admins to view ALL profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Allow super admins to view ALL services
CREATE POLICY "Super admins can view all services"
ON public.services
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Allow super admins to view ALL staff_members
CREATE POLICY "Super admins can view all staff_members"
ON public.staff_members
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));