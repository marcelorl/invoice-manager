# Process Reminders Edge Function

This edge function processes daily reminders for unpaid invoices based on client reminder preferences.

## How It Works

The function runs daily at 8:00 PM and:

1. **Checks the current date** to determine if it's:
   - A Friday (for `weekly_friday` reminders)
   - The last day of the month (for `monthly_end` reminders)

2. **Fetches relevant clients** based on their `reminder_type` setting

3. **Retrieves unpaid invoices** for those clients

4. **Sends a summary email** to the business owner with:
   - List of clients with unpaid invoices
   - Invoice details (number, amount, due date)
   - Total outstanding amount

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# Deploy the function to Supabase
npx supabase functions deploy process-reminders
```

### 2. Set Up Environment Variables

Make sure the following are configured:

**Environment Variables:**
- `RESEND_API_KEY` - Your Resend API key for sending emails
- `SUPABASE_URL` - Your Supabase project URL (automatically available)

**Authorization:**
- The function requires a valid service role key passed in the `Authorization` header
- The cron job automatically provides this via Vault secrets

**Database Configuration:**
- Set your business email in the Settings page (`business_settings.email` table)
  - This email is used as the sender (FROM) and recipient (TO) for reminder emails

### 3. Configure Cron Job

**The cron job is automatically configured** via the seed file `supabase/seeds/00_secrets_and_cron.sql`.

**To set up:**
1. Get your service role key: `npx supabase status`
2. Update the key in `supabase/seeds/00_secrets_and_cron.sql`
3. Run the seed file (via `db reset` or manually in Studio)

**To verify:**
```sql
SELECT * FROM cron.job WHERE jobname = 'process-daily-reminders';
```

Alternatively, you can manually set up the cron job:

#### Option A: Using Supabase Dashboard (Cloud)

1. Go to your Supabase project dashboard
2. Navigate to Database → Cron Jobs
3. Create a new cron job with:
   - **Name**: `process-daily-reminders`
   - **Schedule**: `0 20 * * *` (8:00 PM daily)
   - **Command**:
   ```sql
   SELECT net.http_post(
       url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/process-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
       ),
       body := '{}'::jsonb
   ) AS request_id;
   ```

#### Option B: Using Direct SQL

Execute this SQL in Studio or via psql:
```sql
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
```

#### Option C: Using External Cron Service

You can use services like:
- Cron-job.org
- EasyCron
- GitHub Actions with schedule
- Vercel Cron

Configure them to make a POST request to:
```
https://YOUR_SUPABASE_URL/functions/v1/process-reminders
```

With headers:
```
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
Content-Type: application/json
```

## Testing Manually

You can test the function manually by calling it directly.

**Important:** This function requires the **service role key** in the Authorization header (not the anon key) because it needs full database access to query clients and invoices.

```bash
# Get your service role key
npx supabase status  # Look for the service_role key

# Test locally
curl -X POST http://localhost:54321/functions/v1/process-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Test in production
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/process-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Email Format

The reminder email includes:

- **Subject**: "Invoice Reminder: [Weekly Friday/End of Month] - X Client(s) with Unpaid Invoices"
- **Body**:
  - Greeting
  - List of clients with unpaid invoices
  - For each client:
    - Client name
    - Email address
    - List of unpaid invoices with amounts and due dates
    - Client total
  - Overall summary with total unpaid amount

## Client Configuration

Clients need to have their `reminder_type` set to one of:
- `weekly_friday` - Receive reminders every Friday
- `monthly_end` - Receive reminders on the last day of each month
- `none` - No automatic reminders

Configure this in the Clients page when creating or editing a client.

## Monitoring

### View Scheduled Jobs
```sql
SELECT * FROM cron.job WHERE jobname = 'process-daily-reminders';
```

### View Job Run History
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-daily-reminders')
ORDER BY start_time DESC
LIMIT 10;
```

### Check Edge Function Logs

In Supabase Dashboard:
1. Go to Edge Functions
2. Click on `process-reminders`
3. View the Logs tab

## Troubleshooting

### No Email Received

1. **Check business email configuration**: Verify email is set in Settings page (`business_settings.email` table)
2. **Verify Resend API key**: Ensure `RESEND_API_KEY` is valid and set correctly
3. **Check edge function logs**: Look for errors in function execution
4. **Verify reminder types**: Ensure clients have correct `reminder_type` set (weekly_friday or monthly_end)
5. **Confirm unpaid invoices exist**: Verify there are unpaid invoices for the clients with reminders

### Cron Job Not Running

1. Verify `pg_cron` extension is enabled
2. Check cron job is properly scheduled: `SELECT * FROM cron.job;`
3. View job run details for errors
4. Ensure Supabase project has sufficient resources

### Wrong Timing

The cron expression `0 20 * * *` uses UTC timezone. Adjust the hour based on your timezone:
- For EST (UTC-5): Use `0 1 * * *` (1 AM UTC = 8 PM EST)
- For PST (UTC-8): Use `0 4 * * *` (4 AM UTC = 8 PM PST)
- For CET (UTC+1): Use `0 19 * * *` (7 PM UTC = 8 PM CET)

## Security Notes

- The function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS policies
- Only authorized systems should be able to trigger this function
- Business email is read from the database `business_settings` table
- All email operations are logged for audit purposes
