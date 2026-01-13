# Claude Code Project Context

## Development Environment

This project uses **local Supabase** for development. All Supabase-related commands should be run against the local instance, NOT production.

## Important Commands

### Supabase Local Development

```bash
# Start local Supabase (Docker required)
npx supabase start

# Stop local Supabase
npx supabase stop

# Push migrations to local database
npx supabase db push

# Reset local database (AVOID THIS - destructive, only use when absolutely necessary)
# This will wipe all data and reapply migrations
# npx supabase db reset
```

**IMPORTANT**: Avoid using `supabase db reset` as much as possible. It's destructive and will wipe all local data. Instead:
- Use `npx supabase db push` to apply new migrations
- Use `npx supabase migration new <name>` to create schema changes
- Manually fix data issues through Studio or SQL queries

### Edge Functions

```bash
# Create a new edge function (ALWAYS use this command)
npx supabase functions new <function-name>

# Deploy edge function to LOCAL instance
npx supabase functions deploy <function-name> --no-verify-jwt

# Serve edge functions locally for testing
npx supabase functions serve

# Test edge function locally
curl -X POST http://localhost:54321/functions/v1/<function-name> \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Database Management

```bash
# Generate TypeScript types from local database schema
npx supabase gen types typescript --local > shared/database.types.ts

# Create a new migration
npx supabase migration new <migration-name>

# View migration status
npx supabase migration list
```

## Development Rules

1. **Never deploy to production directly** - All development happens locally first
2. **Always use `supabase functions new`** - When creating edge functions, use this command to scaffold properly
3. **Test locally before pushing** - Use local Supabase instance for all testing
4. **Migrations first** - Database schema changes should always be done via migrations
5. **Regenerate types after schema changes** - Always run `npx supabase gen types` after modifying database schema

## Local Supabase Access

When local Supabase is running:
- **API URL**: `http://localhost:54321`
- **Studio URL**: `http://localhost:54323`
- **Inbucket (Email testing)**: `http://localhost:54324`

Access keys are displayed in terminal when running `npx supabase start`.

## Project Structure

```
supabase/
├── functions/          # Edge functions
│   ├── send-invoice/
│   ├── email-preview/
│   ├── process-reminders/
│   └── _shared/       # Shared utilities
├── migrations/        # Database migrations
├── seeds/             # Database seed files
│   ├── README.md
│   └── 00_secrets_and_cron.sql  # Vault secrets & cron jobs
└── config.toml       # Supabase configuration
```

## Database Seeding

Seeds populate the database with initial data:
- Located in `supabase/seeds/` folder
- Executed in alphabetical order (use numeric prefixes: 00_, 01_, 02_, etc.)
- Automatically run during `npx supabase db reset` (avoid this command!)

### Seed Files:
- **`00_secrets_and_cron.sql`** - Vault secrets and cron job scheduling
  - Update service role key before first run: Get from `npx supabase status`
  - Sets up daily reminder cron job at 8 PM

**Important:** Seeds run during `db reset`, which is destructive. To re-run seeds without losing data, manually execute the seed SQL files through Studio.

## Edge Functions Development

When creating or modifying edge functions:

1. Use `npx supabase functions new <name>` to create
2. Implement function in `supabase/functions/<name>/index.ts`
3. Test locally using curl or Postman
4. Verify logs using `npx supabase functions serve --debug`

## Secrets Management

Secrets are stored in **Supabase Vault** via the seed file `supabase/seeds/00_secrets_and_cron.sql`.

### Setup
1. Get your service role key: `npx supabase status`
2. Update `supabase/seeds/00_secrets_and_cron.sql` with the actual key
3. Run the seed file (via `db reset` or manually in Studio)

### Configured Secrets
- `SUPABASE_URL` - Your Supabase project URL (stored in Vault)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (stored in Vault)

### Database Configuration
- `FROM_EMAIL` is read from `business_settings.email` table (configure in Settings page)

## Testing Reminders Feature

The process-reminders edge function requires the service role key for authorization:

```bash
# Get your service role key
npx supabase status  # Look for the service_role key

# Test locally
curl -X POST http://localhost:54321/functions/v1/process-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

For production cron setup, see `supabase/functions/process-reminders/README.md`.

## Pending Migrations

Run these SQL migrations manually in Supabase Studio when ready:

### Add Date to Invoice Items

Each line item needs a date field, starting from the invoice's issue date:

```sql
-- Add date column to invoice_items
ALTER TABLE invoice_items
ADD COLUMN item_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Set existing items to use their invoice's issue date
UPDATE invoice_items
SET item_date = invoices.issue_date
FROM invoices
WHERE invoice_items.invoice_id = invoices.id;

-- Create index for date queries
CREATE INDEX idx_invoice_items_item_date ON invoice_items(item_date);

-- Add comment for documentation
COMMENT ON COLUMN invoice_items.item_date IS 'Date when this line item was performed/delivered, defaults to invoice issue date';
```

**After running migration:**
```bash
npx supabase gen types typescript --local > shared/database.types.ts
```
