-- ============================================
-- Bookly Cron Jobs Setup
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. Get your Service Role Key from Supabase Dashboard:
--    Settings → API → service_role key (secret)
-- 2. Replace YOUR_SERVICE_ROLE_KEY below with your actual key
-- 3. Run this entire script in Supabase SQL Editor
--
-- ============================================

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================
-- Step 2: Create Cron Jobs
-- ============================================
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- Your project reference: fkdlxssjllqncdbkcddi

-- Cron Job 1: Process Appointment Reminders (every 5 minutes)
SELECT cron.schedule(
  'process-appointment-reminders',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://fkdlxssjllqncdbkcddi.supabase.co/functions/v1/send-appointment-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlY2VkbXd2bmhyc2hjd2RwaXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY2Njg5NSwiZXhwIjoyMDgyMjQyODk1fQ.5fqP3IZgXb8F9QtaZHlB4OVmjShDqvfB2AvK3unj2q0'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Cron Job 2: Process Follow-up Emails (every hour)
SELECT cron.schedule(
  'process-followup-emails',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://fkdlxssjllqncdbkcddi.supabase.co/functions/v1/process-followup-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- Step 3: Verify Cron Jobs (run this after setup)
-- ============================================
-- Uncomment the line below to check if jobs are scheduled:
-- SELECT * FROM cron.job WHERE jobname IN ('process-appointment-reminders', 'process-followup-emails');

-- ============================================
-- Useful Commands:
-- ============================================
-- View all cron jobs:
-- SELECT * FROM cron.job;

-- View cron job execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Unschedule a cron job (if needed):
-- SELECT cron.unschedule('process-appointment-reminders');
-- SELECT cron.unschedule('process-followup-emails');

