# Stripe Connect Edge Function

This Supabase Edge Function handles Stripe Connect account creation for businesses.

## Setup

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   npx supabase login
   ```

3. **Link your project**:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

4. **Set environment variables** in Supabase Dashboard:
   - Go to Project Settings → Edge Functions → Secrets
   - Add `STRIPE_SECRET_KEY` with your Stripe secret key (starts with `sk_test_` or `sk_live_`)
   - Add `SITE_URL` with your site URL (e.g., `https://yourdomain.com` or `http://localhost:8080` for development)

5. **Deploy the function**:
   ```bash
   npx supabase functions deploy stripe-connect
   ```

## Usage

The function expects a POST request with:
```json
{
  "business_id": "uuid-of-business"
}
```

It returns:
```json
{
  "account_id": "acct_...",
  "url": "https://connect.stripe.com/setup/..."
}
```

## Next Steps

After deploying, update `src/pages/Settings.tsx` to call:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-connect`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({ business_id: business?.id }),
});
```

## Important Notes

- This is a basic implementation. You should add:
  - Database update to save the `account_id` to the business record
  - Webhook handling for account status updates
  - Error handling and validation
  - Security checks (verify user has permission to connect Stripe for this business)

