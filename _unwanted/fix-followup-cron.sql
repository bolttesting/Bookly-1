-- Fix the follow-up emails cron job with the correct service role key
-- Run this in Supabase SQL Editor

-- First, unschedule the existing job
SELECT cron.unschedule('process-followup-emails');

-- Then, reschedule it with the correct service role key
SELECT cron.schedule(
  'process-followup-emails',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://fkdlxssjllqncdbkcddi.supabase.co/functions/v1/process-followup-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlY2VkbXd2bmhyc2hjd2RwaXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY2Njg5NSwiZXhwIjoyMDgyMjQyODk1fQ.5fqP3IZgXb8F9QtaZHlB4OVmjShDqvfB2AvK3unj2q0'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Verify it's fixed
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN command LIKE '%eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlY2VkbXd2bmhyc2hjd2RwaXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY2Njg5NSwiZXhwIjoyMDgyMjQyODk1fQ.5fqP3IZgXb8F9QtaZHlB4OVmjShDqvfB2AvK3unj2q0%' THEN '❌ Needs Fix'
    ELSE '✅ OK'
  END AS status
FROM cron.job 
WHERE jobname IN ('process-appointment-reminders', 'process-followup-emails')
ORDER BY jobname;

