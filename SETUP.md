# Dashboard Setup Guide

This guide walks you through setting up the accessibility scanner dashboard with the implemented backend API.

## Prerequisites

1. **Accessibility Scanner Service** running with dashboard endpoints
2. **Node.js 18+** and npm installed
3. **Admin JWT token** from the scanner service

## Quick Start

### 1. Get Admin Token from Scanner Service

First, generate an admin token from the scanner service:

```bash
# Navigate to scanner service directory
cd ../accessibility-scanner-service-v3

# Set JWT secret (use the same one configured in scanner service)
export JWT_SECRET=your-scanner-jwt-secret

# Generate admin token
go run cmd/generate-admin-token/main.go \
  -email admin@yourdomain.com \
  -user-id admin-123 \
  -role admin \
  -hours 24

# Copy the generated token - you'll need it for the dashboard
```

### 2. Configure Dashboard Environment

```bash
# Navigate to dashboard directory
cd ../accessibility-dashboard

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your settings
nano .env.local
```

**Required environment variables:**
```bash
# Scanner service connection
SCANNER_SERVICE_URL=http://localhost:3001
SCANNER_ADMIN_TOKEN=<token-from-step-1>

# Dashboard-specific auth (separate from scanner)
JWT_SECRET=your-dashboard-jwt-secret
```

### 3. Install Dependencies and Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

## Detailed Configuration

### Scanner Service Integration

The dashboard communicates with these **implemented endpoints**:

```
✅ System Monitoring
GET /api/v2/dashboard/metrics

✅ Queue Management  
GET /api/v2/dashboard/queue/stats
POST /api/v2/dashboard/queue/pause
POST /api/v2/dashboard/queue/resume
POST /api/v2/dashboard/queue/workers

✅ Job Management
GET /api/v2/dashboard/jobs/recent
POST /api/v2/dashboard/jobs/{id}/retry
DELETE /api/v2/dashboard/jobs/{id}

✅ Analytics
GET /api/v2/dashboard/analytics/usage
GET /api/v2/dashboard/analytics/tiers
```

### Authentication Flow

1. **Scanner Service Authentication**: Uses JWT tokens with roles (readonly, admin, super_admin)
2. **Dashboard Authentication**: Separate JWT for dashboard user sessions
3. **API Requests**: Scanner admin token sent as `Authorization: Bearer <token>`

### Role-Based Access

The scanner service implements these permission levels:

- **`readonly`**: View dashboard, queue stats, job details, analytics
- **`admin`**: All readonly permissions + queue management, job retry/cancel
- **`super_admin`**: All permissions (equivalent to `*`)

### API Client Usage

The dashboard includes a type-safe API client:

```typescript
// src/services/scanner-api.ts
import { createScannerAPIFromEnv } from '@/services/scanner-api';

const scannerAPI = createScannerAPIFromEnv();

// Get real-time metrics
const metrics = await scannerAPI.getDashboardMetrics();

// Manage queue
await scannerAPI.pauseQueue();
await scannerAPI.resumeQueue();

// Get analytics
const usage = await scannerAPI.getUsageAnalytics('24h');
const tiers = await scannerAPI.getTierAnalytics();
```

### Stripe Integration Setup

The dashboard includes Stripe integration for subscription management and billing.

#### 1. Configure Stripe Keys

Add your Stripe configuration to `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret  
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# For production use:
# STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
```

#### 2. Set up Stripe Products

Create subscription products in your Stripe Dashboard:
1. Go to https://dashboard.stripe.com/products
2. Create products for each tier (Professional, Enterprise)
3. Note the Product IDs and Price IDs for configuration

#### 3. Configure Stripe Webhooks

Set up webhook endpoint in Stripe Dashboard:
- **URL**: `https://auditable.dev/api/webhooks/stripe` (production) or use Stripe CLI for local testing
- **Events**: 
  - `customer.subscription.created`
  - `customer.subscription.updated` 
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

#### 4. Test Stripe Integration

**Test with Stripe CLI (Development):**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test API endpoints
curl -H "Authorization: Bearer <jwt-token>" \
  http://localhost:3000/api/tiers
```

**Available Stripe Endpoints:**
```
✅ GET /api/tiers - Get subscription tiers and pricing
✅ GET /api/users/usage - Get user subscription status and usage
✅ POST /api/webhooks/stripe - Handle Stripe subscription events
```

#### 5. User Subscription Flow

1. **Tier Selection**: Users view tiers via `/api/tiers`
2. **Checkout**: Frontend redirects to Stripe Checkout with price ID
3. **Webhook Processing**: Stripe sends events to `/api/webhooks/stripe`
4. **User Update**: Dashboard updates user metadata via Clerk
5. **Usage Enforcement**: APIs check subscription limits

## Development Workflow

### 1. Start Both Services

**Terminal 1 - Scanner Service:**
```bash
cd accessibility-scanner-service-v3
export JWT_SECRET=your-scanner-secret
go run cmd/main.go
```

**Terminal 2 - Dashboard:**
```bash
cd accessibility-dashboard
npm run dev
```

### 2. Test API Connection

```bash
# Test scanner service health
curl http://localhost:3001/health

# Test dashboard API with token
curl -H "Authorization: Bearer <your-admin-token>" \
  http://localhost:3001/api/v2/dashboard/metrics
```

### 3. Verify Dashboard Access

1. Open http://localhost:3000
2. Should see real-time metrics from scanner service
3. Test queue operations (pause/resume)
4. View job history and analytics

## Troubleshooting

### Common Issues

**1. "SCANNER_ADMIN_TOKEN not found"**
- Generate token: `go run cmd/generate-admin-token/main.go -email admin@test.com -user-id admin -role admin`
- Add to `.env.local`: `SCANNER_ADMIN_TOKEN=<generated-token>`

**2. "401 Unauthorized" from dashboard API**
- Check token is valid: Test with `curl -H "Authorization: Bearer <token>" http://localhost:3001/api/v2/dashboard/metrics`
- Verify JWT_SECRET matches between services
- Check token hasn't expired

**3. "Connection refused" to scanner service**
- Ensure scanner service is running on port 3001
- Check SCANNER_SERVICE_URL in dashboard env
- Verify scanner service has dashboard endpoints (should see logs about dashboard routes)

**4. Dashboard shows loading indefinitely**
- Open browser dev tools → Network tab
- Check for CORS errors or failed API requests
- Verify scanner service CORS allows dashboard origin

### Logs to Check

**Scanner Service Logs:**
```bash
# Should see these on startup:
[INFO] Dashboard endpoints configured
[INFO] Admin authentication middleware enabled
[INFO] Server starting on :3001
```

**Dashboard Logs:**
```bash
# In browser console:
✓ Scanner API connection successful
✓ Dashboard metrics loaded
✓ Real-time updates active
```

## Production Deployment

### Environment Setup

**Scanner Service:**
```bash
JWT_SECRET=<strong-production-secret>
LOG_LEVEL=warn
```

**Dashboard:**
```bash
SCANNER_SERVICE_URL=https://scanner-api.yourdomain.com
SCANNER_ADMIN_TOKEN=<production-admin-token>
JWT_SECRET=<dashboard-jwt-secret>
NODE_ENV=production
```

### Security Considerations

1. **Strong JWT Secrets**: Use 256+ bit secrets
2. **Token Rotation**: Implement regular token refresh
3. **HTTPS Only**: Force HTTPS in production
4. **CORS Configuration**: Restrict to dashboard domain
5. **Rate Limiting**: Implement rate limits on auth endpoints

### Monitoring

Monitor these metrics:
- Dashboard API response times
- Authentication failure rates  
- Admin action audit logs
- Real-time update performance

## Next Steps

1. **Customize Dashboard**: Modify components in `src/components/`
2. **Add Features**: Extend API client for new scanner endpoints
3. **Enhance Analytics**: Add custom charts and visualizations
4. **User Management**: Implement dashboard user authentication
5. **Notifications**: Add real-time alerts and notifications

The scanner service provides a complete foundation for building a powerful admin dashboard with real-time monitoring, queue management, and comprehensive analytics.