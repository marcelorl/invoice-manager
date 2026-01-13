# Invoice Manager

A modern invoice management system built with React, Supabase, and Vite.

> ⚡ **100% vibe coded** - Built entirely through vibes and intuition. No overthinking, just shipping.

## Features

- **Client Management** - Track clients with contact info and reminder preferences
- **Invoice Creation** - Create invoices with line items, dates, quantities, and tax calculations
- **AI-Powered Descriptions** - Generate client-friendly summaries from internal notes using Ollama
- **Email Integration** - Send invoices via email with professional templates (Resend)
- **PDF Generation** - Export and view invoices as PDFs stored in Supabase Storage
- **Payment Tracking** - Mark invoices as paid/unpaid with status filtering
- **Automated Reminders** - Daily cron job sends reminder emails for unpaid invoices (weekly/monthly)
- **Business Settings** - Configure company details, banking info, and email settings
- **Import Tool** - Node script to import existing PDF invoices into the database

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Backend**: Supabase Edge Functions (Deno)
- **Authentication**: GitHub OAuth via Supabase Auth
- **State Management**: TanStack React Query + React Hook Form
- **Email**: Resend API
- **AI**: Ollama (local LLM for description generation)
- **CI/CD**: GitHub Actions (auto-deploy migrations + edge functions)

## Getting Started

> **Note:** This project is designed to run **locally with a live Supabase instance** (not local Docker Supabase). You develop on your machine but connect to a real Supabase project in the cloud.

### Prerequisites

- Node.js 20+
- Supabase account ([create one](https://supabase.com))
- Resend account (for emails) ([create one](https://resend.com))
- Ollama installed (for AI features)

### Local Development Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd Invoice-Manager
   npm install
   ```

2. **Create a Supabase project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Copy your project's `URL` and `anon key` from Settings → API

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

4. **Set up GitHub OAuth**
   - Create OAuth app at [GitHub Developer Settings](https://github.com/settings/developers)
   - Callback URL: `https://your-project-id.supabase.co/auth/v1/callback`
   - In Supabase Dashboard → Authentication → Providers → GitHub:
     - Enable GitHub provider
     - Add your Client ID and Client Secret
     - Save

5. **Link to your Supabase project**
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_ID
   ```

6. **Run migrations**
   ```bash
   npm run supabase:db:push
   ```
   This applies all database migrations to your live Supabase project.

7. **Set up Vault secrets and cron jobs**
   - Get your service role key from Supabase Dashboard → Settings → API
   - Update `supabase/seeds/00_secrets_and_cron.sql` with actual keys
   - Run the seed file manually in Supabase Studio SQL Editor

8. **Deploy edge functions**
   ```bash
   npm run supabase:functions:deploy

   # Set secrets
   npx supabase secrets set RESEND_API_KEY="your-resend-key"
   ```

9. **Start the frontend**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173

10. **Configure business settings**
    - Sign in with GitHub
    - Go to Settings page
    - Add your company info and email (used as FROM email for reminders)

### Testing Reminders

```bash
# Get service role key from Supabase Dashboard → Settings → API

# Test reminder function
curl -X POST https://your-project-id.supabase.co/functions/v1/process-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Importing Existing Invoices

Place your PDF invoices in `attached_assets/` folder and run:

```bash
npm run import-invoices
```

This generates `scripts/output-import.sql` - review and run in your Supabase Studio SQL Editor.

## Development Commands

```bash
npm run dev                        # Start frontend dev server
npm run build                      # Build for production
npm run check                      # TypeScript type check

# Supabase
npm run supabase:db:push          # Apply migrations to live project
npm run supabase:gen:types        # Generate TypeScript types from DB schema
```

## License

MIT

---

Built with ✨ vibes ✨
