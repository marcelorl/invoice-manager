-- ============================================
-- Secrets and Cron Jobs Setup
-- ============================================

-- Store Supabase URL in Vault
-- For local: http://kong:8000
-- For production: https://your-project.supabase.co
select vault.create_secret(
    'http://kong:8000',
    'supabase_url'
  );

-- Store Service Role Key in Vault
-- Get from: npx supabase status
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  'supabase_service_role_key'
);

-- Schedule daily reminder processing at 8 PM UTC
-- The service role key is passed in the Authorization header
-- The edge function extracts and uses this token for database access
SELECT cron.schedule(
  'process-daily-reminders',
  '0 20 * * *',  -- At 8:00 PM UTC every day
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/process-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
