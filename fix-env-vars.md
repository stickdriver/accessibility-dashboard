# Fix Dashboard Backend Environment Variables

## Problem
The Dashboard Backend on Fly.io is missing the `NEXT_PUBLIC_CONVEX_URL` environment variable, causing scan creation to fail.

## Quick Fix (Without Full Redeploy)

Unfortunately, `NEXT_PUBLIC_*` variables need to be available at BUILD time for Next.js, not just runtime. This means we need to redeploy with the correct build arguments.

## Full Solution

Run the deployment script:
```bash
cd /Users/dennis/Projects/accessibility-dashboard
./deploy.sh
```

## Alternative: Manual Deployment

If you prefer to deploy manually:

```bash
cd /Users/dennis/Projects/accessibility-dashboard

# Deploy with all required build arguments
fly deploy \
  --build-arg NEXT_PUBLIC_CONVEX_URL=https://dusty-guanaco-345.convex.cloud \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c3RpcnJlZC1hbnQtNzAuY2xlcmsuYWNjb3VudHMuZGV2JA \
  --build-arg NEXT_PUBLIC_APP_URL=https://accessibility-dashboard.fly.dev \
  -a accessibility-dashboard
```

## Required Environment Variables

### Build-time Variables (NEXT_PUBLIC_*)
These MUST be provided as build arguments:
- `NEXT_PUBLIC_CONVEX_URL` - Convex database URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `NEXT_PUBLIC_APP_URL` - Dashboard URL

### Runtime Secrets
These can be set with `fly secrets set`:
- `CLERK_SECRET_KEY` - Clerk secret key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- All `STRIPE_PRODUCT_ID_*` and `STRIPE_PRICE_ID_*` variables

## Verification

After deployment, test the scan creation:
1. Go to https://www.auditable.dev/dashboard
2. Enter a URL and click "Start Scan"
3. Should create a scan without errors

## Root Cause

The initial deployment didn't include the Convex URL as a build argument, so Next.js couldn't include it in the client-side bundle. This is why the error appears even though the variable might be set as a runtime secret.