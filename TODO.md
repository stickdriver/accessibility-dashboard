# Dashboard Backend TODO - Accessible Platform Integration

## Project: accessibility-dashboard
**Technical Lead Coordination File**  
**Last Updated:** August 31, 2025

---

## 🎯 Current Architecture Status
- ✅ **BFF Architecture**: Dashboard Backend serves as API layer  
- ✅ **Authentication**: Clerk JWT validation implemented
- ✅ **Database Integration**: Convex with clerkUserId schema
- ✅ **Stripe Integration**: Webhook handlers and tier management complete

---

## 📋 Active Implementation Tasks

### 1. 🚀 IMMEDIATE: Implement /api/tiers Stripe Integration
**Priority:** CRITICAL  
**Status:** 🔴 URGENT - Currently returns 501, needs immediate implementation

#### Current Stripe Products (Sandbox) to Map:
```
1. Starter Accessibility Scan 
   - short_name: "Starter"
   - scan_limit: 10/mo, websites: 1
   - features: Basic history

2. Essential Accessibility Compliance
   - short_name: "Essential"
   - scan_limit: 150/mo, websites: 5  
   - features: Email Support, Basic Integration

3. Professional Accessibility Suite
   - short_name: "Professional"
   - scan_limit: 500/mo, websites: 999
   - features: Priority Support, Team Collaboration
```

#### URGENT Tasks:
- [x] **COMPLETED: Replace 501 endpoint** with actual tier configuration
- [x] **COMPLETED: Map Stripe products** to consistent three-tier structure  
- [x] **COMPLETED: Handle free tier** (Starter Accessibility Scan serves as free tier)
- [x] **COMPLETED: Endpoint returns proper JSON** for frontend consumption  
- [x] **COMPLETED: Add live Stripe API pricing** fetching with fallback handling

#### What the Backend Needs for Stripe Integration:
- ✅ **Stripe SDK**: Already installed (`stripe: ^18.5.0`)
- ✅ **Stripe API Integration**: Implemented in `/api/tiers` endpoint
- 🔄 **Environment Variables**: Need to be configured with actual Stripe data

**Required Environment Variables:**
```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Your actual Stripe secret key

# Stripe Product/Price IDs (get these from your Stripe dashboard)
STRIPE_PRODUCT_ID_STARTER=prod_...     # Starter product ID
STRIPE_PRICE_ID_STARTER=price_...      # Starter price ID (even if $0)
STRIPE_PRODUCT_ID_ESSENTIAL=prod_...   # Essential product ID  
STRIPE_PRICE_ID_ESSENTIAL=price_...    # Essential price ID
STRIPE_PRODUCT_ID_PROFESSIONAL=prod_... # Professional product ID
STRIPE_PRICE_ID_PROFESSIONAL=price_... # Professional price ID
```

**Implementation Status:**
- ✅ `/api/tiers` endpoint now returns structured tier data
- ✅ Three-tier structure: Starter (free), Essential, Professional  
- ✅ Proper fallback error handling implemented
- ✅ Environment variables configured with actual Stripe product IDs
- ✅ **COMPLETED:** Live Stripe API integration pulling real pricing data

**✅ PRODUCTION READY:**
```json
{
  "success": true,
  "tiers": {
    "starter": { "price": 0 },      // Free tier
    "essential": { "price": 49 },   // $49/month from Stripe
    "professional": { "price": 149 } // $149/month from Stripe
  },
  "metadata": {
    "source": "stripe_api_with_fallback"
  }
}
```

**Environment Variables Configured:**
- ✅ STRIPE_SECRET_KEY: `sk_test_51RW13PBIyV48Swbp...` (configured)
- ✅ STRIPE_PRODUCT_ID_STARTER: `prod_SxoYgW7g8SKSYV`
- ✅ STRIPE_PRODUCT_ID_ESSENTIAL: `prod_SxocTtCLqdr5W7`  
- ✅ STRIPE_PRODUCT_ID_PROFESSIONAL: `prod_Sxod49UHXHx3Rg`
- ✅ All corresponding STRIPE_PRICE_ID_* variables configured

#### Previously Completed:
- ✅ **`/api/webhooks/stripe` handler** - Processes subscription lifecycle events  
- ✅ **`/api/users/usage` endpoint** - Enhanced with subscription data
- ✅ **Environment configuration** - Stripe product/price ID variables
- ✅ **Documentation updates** - API docs, setup guide, README

---

### 2. 🚀 Production Deployment Preparation
**Priority:** HIGH  
**Dependencies:** Fly.io deployment pipeline  
**Coordinate with:** Frontend deployment timing

#### Tasks:
- [ ] **Deploy to Fly.io production**
  - Deploy as `auditable-dashboard-prod.fly.dev`
  - Configure production environment variables
  - Verify health check endpoint functionality
  - Test Convex production connection

- [ ] **Configure production Stripe webhooks**
  - Update webhook endpoint to production URL
  - Test webhook signature validation
  - Verify subscription event processing
  - Monitor webhook delivery success rates

- [ ] **Production environment setup**
  ```bash
  # Required production environment variables
  CLERK_SECRET_KEY=sk_live_...
  CLERK_WEBHOOK_SECRET=whsec_...
  NEXT_PUBLIC_CONVEX_URL=https://prod-convex.convex.cloud
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PRICE_ID_FREE=price_...
  STRIPE_PRICE_ID_PROFESSIONAL=price_...
  STRIPE_PRICE_ID_ENTERPRISE=price_...
  ```

- [ ] **SSL/TLS certificate verification**
  - Ensure HTTPS endpoints for webhook security
  - Verify certificate chain for Stripe communication
  - Test secure API connections from frontend

---

### 3. 🔍 API Performance Optimization
**Priority:** MEDIUM  
**Dependencies:** Production load testing data

#### Tasks:
- [ ] **Add API caching layers**
  - Implement Redis caching for tier data
  - Cache user usage calculations
  - Add cache invalidation on subscription changes
  - Monitor cache hit rates and performance

- [ ] **Database query optimization**
  - Add indexes for frequently queried user data
  - Optimize subscription status lookups
  - Implement query result caching
  - Monitor Convex query performance metrics

- [ ] **Rate limiting implementation**
  - Add tier-based rate limiting
  - Implement usage-based throttling
  - Configure abuse prevention measures
  - Monitor API usage patterns

#### Technical Specifications:
```typescript
// Caching implementation
const CACHE_TTL = {
  tiers: 3600,        // 1 hour - pricing rarely changes
  usage: 300,         // 5 minutes - usage updates frequently  
  subscription: 1800, // 30 minutes - subscription status  
};
```

---

### 4. 📊 Admin Dashboard API Endpoints
**Priority:** MEDIUM  
**Dependencies:** Admin UI requirements from Frontend

#### Tasks:
- [ ] **User management endpoints**
  - `GET /api/admin/users` - List all users with subscription status
  - `PUT /api/admin/users/:id` - Update user subscription metadata
  - `GET /api/admin/analytics` - Platform usage statistics
  - `GET /api/admin/subscriptions` - Subscription health metrics

- [ ] **System monitoring endpoints**
  - `GET /api/admin/health` - System health dashboard
  - `GET /api/admin/webhooks` - Webhook delivery status
  - `GET /api/admin/errors` - Error tracking and alerts
  - `GET /api/admin/performance` - API performance metrics

- [ ] **Billing reconciliation endpoints**  
  - `GET /api/admin/billing/reconcile` - Stripe vs database sync check
  - `POST /api/admin/billing/fix` - Fix subscription discrepancies
  - `GET /api/admin/billing/failed-payments` - Failed payment tracking

#### Authorization Requirements:
- Admin endpoints require special Clerk role/permission
- Implement admin-only middleware
- Add audit logging for admin actions
- Rate limit admin endpoints separately

---

### 5. 🔄 Scanner Service Integration Updates
**Priority:** LOW  
**Dependencies:** Scanner Service v3 API updates  
**Coordinate with:** `../accessibility-scanner-service-v3/TODO.md`

#### Tasks:
- [ ] **Scanner authentication endpoints**
  - `POST /api/scanner/auth` - Generate scanner service tokens
  - `GET /api/scanner/validate` - Validate scanner requests
  - Implement service-to-service authentication

- [ ] **Scan result ingestion API**
  - `POST /api/scans/results` - Accept scan results from service
  - Add scan result validation and processing
  - Implement scan completion webhook triggers

- [ ] **Usage tracking integration**
  - Track scan completion for billing purposes
  - Update user usage counters from scanner service
  - Implement usage-based scan prioritization

#### Technical Requirements:
```typescript
// Scanner service authentication
interface ScannerAuthRequest {
  scanId: string;
  clerkUserId: string;
  tier: 'free' | 'professional' | 'enterprise';
}

// Scan result ingestion
interface ScanResultPayload {
  scanId: string;
  results: AccessibilityResult[];
  metadata: ScanMetadata;
  completed: boolean;
}
```

---

## 🔗 Cross-Project Dependencies

### Frontend Dependencies:
1. **Production API URL** - Frontend needs production Dashboard URL
2. **CORS configuration** - Allow auditable.dev origin
3. **API response formats** - Maintain consistent JSON structures  
4. **Error handling** - Standardized error response formats

### Scanner Service Dependencies:
1. **Authentication integration** - Scanner must authenticate with Dashboard
2. **Result submission** - Scanner posts results to Dashboard endpoints
3. **User context** - Scanner needs user tier and usage information
4. **Priority queuing** - Premium users get scanning priority

---

## 🧪 Testing Requirements

### API Testing:
- [ ] **Stripe webhook testing**
  - Test all subscription lifecycle events
  - Verify webhook signature validation
  - Test webhook retry and failure handling
  - Validate Clerk metadata updates

- [ ] **Load testing**  
  - Test concurrent API requests
  - Validate database connection pooling
  - Test Stripe API rate limit handling
  - Measure response times under load

### Integration Testing:
- [ ] **End-to-end billing flow**
  - Test complete subscription creation process
  - Verify usage limit enforcement
  - Test subscription cancellation flow
  - Validate billing event synchronization

### Security Testing:
- [ ] **Authentication validation**
  - Test JWT token validation
  - Verify Clerk webhook security
  - Test API endpoint authorization
  - Validate admin access controls

---

## 🚨 Critical Issues & Blockers

### Current Blockers:
1. **Production deployment** - Awaiting Fly.io deployment
2. **Stripe webhook URL** - Needs production URL to configure
3. **SSL certificates** - Required for webhook security

### Risk Mitigation:
- Fallback to static tier configuration if Stripe API fails
- Graceful degradation for billing features  
- Comprehensive error logging and alerting
- Database backup and recovery procedures

---

## 📝 Implementation Notes

### Database Schema Updates:
- Current schema supports all billing requirements
- clerkUserId indexing optimized for performance
- Ready for subscription metadata storage

### Monitoring & Alerting:
- Set up error tracking for billing operations
- Monitor webhook delivery success rates  
- Alert on Stripe API failures or timeouts
- Track subscription conversion metrics

### Backup & Recovery:
- Implement database backup procedures
- Document disaster recovery for billing data
- Test subscription data restoration procedures

---

## 🚀 Deployment Checklist

### Pre-Deployment:
- [ ] Environment variables configured
- [ ] Database migrations applied (if needed)
- [ ] Stripe products/prices created  
- [ ] Health check endpoint verified
- [ ] API documentation updated

### Post-Deployment:
- [ ] Stripe webhooks configured with production URL
- [ ] Frontend updated with production API URL
- [ ] End-to-end billing flow tested
- [ ] Monitoring and alerting verified
- [ ] Load balancer health checks confirmed

### Rollback Plan:
- [ ] Database snapshot before deployment
- [ ] Previous version deployment artifacts ready
- [ ] Rollback procedure documented and tested
- [ ] Communication plan for users if issues occur

---

## 📊 Success Metrics

### Technical KPIs:
- [ ] API response times < 200ms (95th percentile)
- [ ] 99.9% uptime for billing endpoints
- [ ] 100% webhook delivery success rate
- [ ] Zero billing data inconsistencies

### Business KPIs:  
- [ ] Subscription signup completion rate > 90%
- [ ] Payment processing success rate > 95%
- [ ] Customer billing satisfaction > 4.5/5
- [ ] Revenue reconciliation accuracy 100%

---

**Next Review:** Post-production deployment verification  
**Blocked By:** Fly.io production deployment approval  
**Blocking:** Frontend billing integration deployment

---
*This TODO is maintained by the Technical Project Lead to ensure coordinated implementation across accessible-frontend, accessibility-dashboard, and accessibility-scanner-service-v3.*