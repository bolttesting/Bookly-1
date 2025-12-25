# Stripe Integration Setup Guide

## Overview
This document outlines the Stripe integration features that have been implemented and what backend setup is required.

## ✅ Completed Frontend Features

### 1. Customer Profile Management
- ✅ Profile tab added to customer dashboard (`/my-appointments`)
- ✅ Edit name, email, phone
- ✅ Change password with visibility toggles
- ✅ Upload profile picture (uses Supabase Storage)

### 2. Database Schema
- ✅ Migration created: `20251226000000_add_stripe_integration.sql`
- ✅ Added Stripe fields to `businesses` table:
  - `stripe_account_id`
  - `stripe_connected`
  - `stripe_onboarding_complete`
- ✅ Created `payments` table for transaction tracking
- ✅ Created `subscriptions` table for business subscriptions
- ✅ Created `super_admin_settings` table for platform Stripe connection

### 3. Business Settings - Stripe Connect
- ✅ Added "Payments" tab in business Settings page
- ✅ UI for connecting/disconnecting Stripe account
- ✅ Shows connection status

### 4. Super Admin - Stripe & Subscriptions
- ✅ Added "Stripe & Subscriptions" tab in Super Admin dashboard
- ✅ UI for connecting Stripe account
- ✅ Subscription plan cards (Basic, Pro, Enterprise) - ready for configuration

### 5. Payment Checkout Component
- ✅ Created `CheckoutDialog` component
- ✅ Ready to integrate with Stripe Checkout

## ⚠️ Backend Setup Required

### 1. Stripe API Endpoints Needed

You'll need to create backend API endpoints (using Supabase Edge Functions or your own backend):

#### For Business Stripe Connect:
```
POST /api/stripe/connect
- Creates Stripe Connect account
- Returns onboarding URL
- Updates business.stripe_account_id and stripe_connected
```

#### For Customer Payments:
```
POST /api/stripe/create-checkout-session
- Creates Stripe Checkout Session
- Returns checkout URL
- Associates with business's Stripe account (for Connect)
```

#### For Super Admin Stripe:
```
POST /api/stripe/admin/connect
- Creates Stripe account for platform
- Returns onboarding URL
- Updates super_admin_settings
```

#### For Subscriptions:
```
POST /api/stripe/create-subscription
- Creates subscription for business
- Links to subscription plan
- Updates subscriptions table
```

### 2. Stripe Webhooks

Set up webhooks to handle:
- Payment success/failure
- Subscription status changes
- Stripe Connect account updates

### 3. Environment Variables

Add to your `.env`:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_... (backend only)
STRIPE_WEBHOOK_SECRET=whsec_... (backend only)
```

## 📝 Integration Points

### Booking Flow Integration
The checkout dialog is ready to be integrated into:
- `MyAppointments.tsx` - `handleBooking` mutation
- `MyAppointments.tsx` - `handlePackagePurchase` mutation
- `PublicBooking.tsx` - `handleSubmit` function

### Payment Flow
1. Customer selects service/package
2. Click "Book" or "Purchase"
3. If business has Stripe connected → Show checkout dialog
4. Redirect to Stripe Checkout
5. On success → Create appointment/package + payment record
6. On failure → Show error message

## 🔧 Next Steps

1. **Set up backend API endpoints** (Supabase Edge Functions recommended)
2. **Configure Stripe Connect** for businesses
3. **Set up Stripe webhooks** for payment/subscription events
4. **Integrate CheckoutDialog** into booking/purchase flows
5. **Test payment flow** end-to-end

## 📚 Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

