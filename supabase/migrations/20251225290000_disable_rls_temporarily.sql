-- ⚠️ WARNING: This disables RLS on customers and appointments tables
-- This removes security protections - ONLY use for testing/debugging
-- DO NOT use this in production without proper security measures

-- Disable RLS on customers table
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

-- Disable RLS on appointments table
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later, run:
-- ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

