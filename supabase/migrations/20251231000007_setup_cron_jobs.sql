-- Setup cron jobs for Edge Functions
-- Requires: pg_cron and pg_net extensions (usually enabled in Supabase)
-- 
-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running!
-- Get these from Supabase Dashboard → Settings → API

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- NOTE: To schedule the cron jobs, run the script in _unwanted/setup-cron-jobs-complete.sql
-- after replacing YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with your Supabase project values.
-- Jobs to schedule:
--   1. process-appointment-reminders (every 5 min) -> send-appointment-reminders
--   2. process-followup-emails (hourly) -> process-followup-emails
--   3. process-daily-summaries (daily 7 AM) -> process-daily-summaries
