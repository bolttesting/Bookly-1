-- ============================================
-- Verify Cron Jobs Are Set Up Correctly
-- ============================================
-- Paste this in Supabase SQL Editor to verify your cron jobs

-- Check if both cron jobs are scheduled
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname IN ('process-appointment-reminders', 'process-followup-emails')
ORDER BY jobname;

-- Expected Result: You should see 2 rows
-- Row 1: process-appointment-reminders (every 5 minutes)
-- Row 2: process-followup-emails (every hour)

-- ============================================
-- View Recent Execution History (optional)
-- ============================================
-- Uncomment below to see if cron jobs have run:
-- SELECT 
--   j.jobname,
--   jr.runid,
--   jr.job_pid,
--   jr.database,
--   jr.username,
--   jr.command,
--   jr.status,
--   jr.return_message,
--   jr.start_time,
--   jr.end_time,
--   jr.end_time - jr.start_time AS duration
-- FROM cron.job_run_details jr
-- JOIN cron.job j ON j.jobid = jr.jobid
-- WHERE j.jobname IN ('process-appointment-reminders', 'process-followup-emails')
-- ORDER BY jr.start_time DESC
-- LIMIT 20;

