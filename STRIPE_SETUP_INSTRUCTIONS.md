# Stripe Connect Setup - Step by Step Guide

## ⚠️ IMPORTANT: What Needs to Be Done FIRST

The CORS error you're seeing means the **Supabase Edge Function is not deployed yet**. You need to deploy it first before the "Connect Stripe" button will work.

## Step-by-Step Setup

### Step 1: Get Your Stripe API Keys

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign up or log in to your Stripe account
3. Go to **Developers** → **API keys**
4. Copy your **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)
   - For testing, use the **Test mode** key (starts with `sk_test_`)

### Step 2: Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### Step 3: Login to Supabase

```bash
npx supabase login
```

This will open your browser to authenticate.

### Step 4: Link Your Project

```bash
npx supabase link --project-ref qecedmwvnhrshcwdpirt
```

(Replace `qecedmwvnhrshcwdpirt` with your actual Supabase project reference if different)

### Step 5: Set Environment Variables in Supabase Dashboard

1. Go to your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Add these secrets:
   - **Name:** `STRIPE_SECRET_KEY`
     **Value:** Your Stripe secret key (e.g., `sk_test_...`)
   - **Name:** `SITE_URL`
     **Value:** `http://localhost:8080` (for development) or your production URL

### Step 6: Deploy the Edge Function

From your project root directory, run:

```bash
npx supabase functions deploy stripe-connect
```

You should see output like:
```
Deploying function stripe-connect...
Function stripe-connect deployed successfully
```

### Step 7: Test It

1. Go to your Settings page: `http://localhost:8080/settings`
2. Click on the **"Payments"** tab
3. Click **"Connect Stripe Account"**
4. It should now redirect you to Stripe's onboarding page (instead of showing an error)

## Troubleshooting

### If you get "Function not found" error:
- Make sure you deployed the function: `npx supabase functions deploy stripe-connect`
- Check that you're linked to the correct project: `npx supabase projects list`

### If you get CORS errors:
- The function should handle CORS automatically, but if you still see errors, make sure the function is deployed correctly

### If you get "Stripe API error":
- Check that `STRIPE_SECRET_KEY` is set correctly in Supabase Dashboard
- Make sure you're using a valid Stripe secret key (starts with `sk_test_` or `sk_live_`)

### If the function deploys but doesn't work:
- Check the function logs in Supabase Dashboard: **Edge Functions** → **stripe-connect** → **Logs**
- Look for any error messages

## Next Steps After Connection

Once a business connects their Stripe account:
1. The `stripe_account_id` will be saved to the `businesses` table
2. The `stripe_connected` flag will be set to `true`
3. Payments can then be processed through Stripe Checkout

## Important Notes

- **Test Mode:** Use `sk_test_...` keys for testing. No real money will be processed.
- **Live Mode:** Use `sk_live_...` keys for production. Real money will be processed.
- **Security:** Never commit your Stripe secret keys to git. Always use environment variables.

## Quick Checklist

- [ ] Stripe account created
- [ ] Stripe API keys obtained
- [ ] Supabase CLI installed
- [ ] Logged into Supabase CLI
- [ ] Project linked
- [ ] Environment variables set in Supabase Dashboard
- [ ] Edge Function deployed
- [ ] Tested the "Connect Stripe" button

Once all these are done, the Stripe connection will work! 🎉

