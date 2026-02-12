-- ============================================
-- Complete Cron Jobs Setup for Bookly
-- ============================================
-- Run in Supabase SQL Editor (requires pg_cron + pg_net)
-- SECURITY: Do not commit this file with real keys. Rotate key if exposed.
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Job 1: Appointment reminders (every 5 min)
SELECT cron.schedule(
  'process-appointment-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qecedmwvnhrshcwdpirt.supabase.co/functions/v1/send-appointment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlY2VkbXd2bmhyc2hjd2RwaXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY2Njg5NSwiZXhwIjoyMDgyMjQyODk1fQ.5fqP3IZgXb8F9QtaZHlB4OVmjShDqvfB2AvK3unj2q0'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Job 2: Follow-up emails (every hour)
SELECT cron.schedule(
  'process-followup-emails',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qecedmwvnhrshcwdpirt.supabase.co/functions/v1/process-followup-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlY2VkbXd2bmhyc2hjd2RwaXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY2Njg5NSwiZXhwIjoyMDgyMjQyODk1fQ.5fqP3IZgXb8F9QtaZHlB4OVmjShDqvfB2AvK3unj2q0'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Job 3: Daily summaries (every day at 7 AM UTC)
SELECT cron.schedule(
  'process-daily-summaries',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qecedmwvnhrshcwdpirt.supabase.co/functions/v1/process-daily-summaries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlY2VkbXd2bmhyc2hjd2RwaXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY2Njg5NSwiZXhwIjoyMDgyMjQyODk1fQ.5fqP3IZgXb8F9QtaZHlB4OVmjShDqvfB2AvK3unj2q0'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify:
-- SELECT jobname, schedule FROM cron.job;
