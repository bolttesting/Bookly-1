-- Re-enable RLS with properly configured policies
-- Run this after testing to restore security

-- First, ensure we have the correct policies (from previous migrations)
-- Then re-enable RLS

-- Re-enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on appointments table
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Verify policies exist
-- Run these queries to check:
-- SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'customers' AND cmd = 'INSERT';
-- SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'appointments' AND cmd = 'INSERT';

