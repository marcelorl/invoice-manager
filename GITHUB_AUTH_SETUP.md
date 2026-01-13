# GitHub Authentication Setup Guide

This application uses Supabase for authentication with GitHub OAuth as the login provider.

## Setup Instructions

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Invoice Manager (or your preferred name)
   - **Homepage URL**: `http://localhost:5173` (for local development)
   - **Authorization callback URL**:
     - For local development: `http://localhost:54321/auth/v1/callback`
     - For production: `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`

4. Click "Register application"
5. Note down your **Client ID**
6. Click "Generate a new client secret" and note down the **Client Secret**

### 2. Configure Local Development Environment

1. Add your GitHub OAuth credentials to `supabase/.env`:

```env
GITHUB_CLIENT_ID=your-github-client-id-here
GITHUB_SECRET=your-github-client-secret-here
```

2. Make sure your `.env` file has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

You can find the local anon key by running:
```bash
npm run supabase:status
```

The GitHub OAuth is already configured in `supabase/config.toml` with:
- Site URL: `http://localhost:5173`
- Redirect URIs: `http://localhost:5173`, `http://127.0.0.1:5173`
- GitHub callback: `http://localhost:54321/auth/v1/callback`

### 3. Configure Production Supabase (Optional)

For production deployment:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Providers**
3. Find **GitHub** in the list and enable it
4. Enter your GitHub OAuth credentials:
   - **Client ID**: (from step 1)
   - **Client Secret**: (from step 1)
5. In **Authentication** → **URL Configuration**, add your production domain to **Redirect URLs**

### 4. Test the Authentication

1. Start Supabase locally:
```bash
npm run supabase:start
```

2. Start your development server:
```bash
npm run dev
```

3. Navigate to `http://localhost:5173`
4. You should be redirected to the login page
5. Click "Sign in with GitHub"
6. Authorize the application in GitHub
7. You should be redirected back to the application and logged in

## Production Deployment

When deploying to production:

1. Create a separate GitHub OAuth App for production (or update the existing one):
   - **Homepage URL**: Your production domain (e.g., `https://invoices.yourdomain.com`)
   - **Authorization callback URL**: `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`

2. Configure GitHub provider in Supabase Dashboard (see step 3 above)

3. Update your production environment variables:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

## Troubleshooting

### "Invalid redirect URL" error (Local Development)
- Make sure the redirect URL in your GitHub OAuth App is: `http://localhost:54321/auth/v1/callback`
- Check that `site_url` in `supabase/config.toml` is set to `http://localhost:5173`
- Verify `additional_redirect_urls` includes `http://localhost:5173`

### "Invalid redirect URL" error (Production)
- Make sure the redirect URL in your GitHub OAuth App matches exactly: `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
- Check that your production domain is added to Supabase Redirect URLs in the dashboard

### GitHub OAuth credentials not found
- Verify `supabase/.env` exists and contains `GITHUB_CLIENT_ID` and `GITHUB_SECRET`
- After adding credentials, restart Supabase: `npm run supabase:stop` then `npm run supabase:start`

### User is redirected but not logged in
- Check browser console for errors
- Verify that your Supabase credentials are correct in `.env`
- Make sure Supabase is running: `npm run supabase:status`
- Check that the GitHub OAuth configuration is correct in `supabase/config.toml`

### Authentication works locally but not in production
- Verify production environment variables are set correctly
- Check that you've enabled GitHub provider in Supabase Dashboard
- Ensure production domain is added to GitHub OAuth App and Supabase Redirect URLs
- Production uses different Supabase URL (project-specific) than local (localhost:54321)
