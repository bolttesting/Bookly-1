-- Create Super Admin User
-- This script helps you create a super admin user

-- Step 1: First, you need to create a user account in your app
-- Go to your app and sign up with email/password, or use Supabase Dashboard

-- Step 2: After creating the user, find their user_id from auth.users table
-- You can find it in Supabase Dashboard → Authentication → Users

-- Step 3: Replace 'YOUR_USER_ID_HERE' with the actual user_id and run this:

-- INSERT INTO public.super_admins (user_id)
-- VALUES ('YOUR_USER_ID_HERE')
-- ON CONFLICT (user_id) DO NOTHING;

-- Example:
-- INSERT INTO public.super_admins (user_id)
-- VALUES ('123e4567-e89b-12d3-a456-426614174000')
-- ON CONFLICT (user_id) DO NOTHING;

-- To find your user_id:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click on the user you want to make super admin
-- 3. Copy the UUID (user ID)
-- 4. Use it in the INSERT statement above

-- Or use this query to see all users:
-- SELECT id, email, created_at FROM auth.users;

