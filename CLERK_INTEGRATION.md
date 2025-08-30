# Clerk Integration Guide - Dashboard Backend

## Overview

The Accessibility Dashboard has been successfully migrated from custom JWT authentication to **Clerk authentication** as part of the Backend-for-Frontend (BFF) architecture. This dashboard now serves as the secure backend API layer for the A11y SaaS frontend while maintaining admin-only access through fly.io portal.

## 🔄 Migration Summary

### What Changed
- **Custom JWT authentication** → **Clerk JWT token validation**
- **Internal user management** → **Clerk user management + webhooks**
- **Direct authentication endpoints** → **Clerk token verification**
- **Database user tables** → **clerkUserId references**

### Architecture Role
```
┌─────────────┐    Dashboard APIs    ┌─────────────────────┐
│  A11y SaaS  │────────────────────▶│     Dashboard       │
│ (Frontend)  │ Bearer: clerk-jwt    │ (Backend + Admin)   │
└─────────────┘                     │   ┌─────────────┐   │
       ▲                            │   │   Convex    │   │
       │ Clerk Auth                 │   │  Database   │   │
       ▼                            │   └─────────────┘   │
┌─────────────┐    Webhooks          └─────────────────────┘
│    Clerk    │────────────────────────────────┘
│  (Auth)     │
└─────────────┘
```

## 🛠️ Technical Implementation

### Dependencies Added
```json
{
  "dependencies": {
    "@clerk/backend": "^1.15.6",
    "svix": "^1.37.0"
  }
}
```

### Authentication Layer

#### auth.ts (`/src/lib/auth.ts`)
```typescript
import { createClerkClient } from '@clerk/backend';
import { NextRequest } from 'next/server';

export interface ClerkUser {
  id: string;
  emailAddress: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
}

export async function verifyClerkToken(req: NextRequest): Promise<ClerkUser | null> {
  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const payload = await clerkClient.verifyToken(token);
    const user = await clerkClient.users.getUser(payload.sub);

    return {
      id: user.id,
      emailAddress: user.emailAddresses[0]?.emailAddress || null,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<ClerkUser> {
  const user = await verifyClerkToken(req);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
```

### API Endpoints

All API endpoints now use Clerk authentication:

```typescript
// Example: /src/app/api/scans/route.ts
import { requireAuth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    // API logic using user.id as clerkUserId
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

#### Available API Endpoints
```
# User Operations
GET    /api/users/usage              # Current usage & limits

# Scan Operations  
GET    /api/scans                    # List user scans
POST   /api/scans                    # Create new scan
GET    /api/scans/[id]               # Get scan details
PUT    /api/scans/[id]               # Update scan
DELETE /api/scans/[id]               # Delete scan

# Admin Operations (Admin only)
GET    /api/admin/users              # List all users
PUT    /api/admin/users              # Update user metadata

# Webhooks
POST   /api/webhooks/clerk           # Handle Clerk user events
```

### Database Schema Updates

#### Convex Schema (`/convex/schema.ts`)
```typescript
// Before: Internal user management
users: defineTable({
  email: v.string(),
  passwordHash: v.string(),
  // ... other auth fields
}),

// After: Clerk integration
scans: defineTable({
  clerkUserId: v.string(),  // References Clerk user ID
  websiteUrl: v.string(),
  // ... other scan fields
}).index("by_clerk_user", ["clerkUserId"]),

usage: defineTable({
  clerkUserId: v.string(),  // References Clerk user ID
  // ... usage tracking fields
}).index("by_clerk_user", ["clerkUserId"]),
```

### Webhook Handling

#### Clerk Webhooks (`/src/app/api/webhooks/clerk/route.ts`)
```typescript
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  const wh = new Webhook(WEBHOOK_SECRET);
  
  const payload = await req.text();
  const headers = {
    'svix-id': req.headers.get('svix-id') || '',
    'svix-timestamp': req.headers.get('svix-timestamp') || '',
    'svix-signature': req.headers.get('svix-signature') || '',
  };

  const evt: WebhookEvent = wh.verify(payload, headers);

  switch (evt.type) {
    case 'user.created':
      // Initialize user data in Convex
      break;
    case 'user.updated':
      // Update user data if needed
      break;
    case 'user.deleted':
      // Handle user deletion
      break;
  }

  return new Response('', { status: 200 });
}
```

## ⚙️ Configuration

### Environment Variables
```bash
# Dashboard Backend (.env.local)
NEXT_PUBLIC_CONVEX_URL=https://your-convex.convex.cloud
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### Next.js Configuration
```javascript
// next.config.js
module.exports = {
  env: {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  },
};
```

## 🚀 Development Setup

### 1. Install Dependencies
```bash
cd /Users/dennis/Projects/accessibility-dashboard
npm install
```

### 2. Configure Environment
```bash
# Copy and update environment variables
cp .env.example .env.local
# Add Clerk credentials to .env.local
```

### 3. Start Dashboard Backend
```bash
npm run dev
# → Runs on http://localhost:3001
```

### 4. Test API Endpoints
```bash
# Test with valid Clerk JWT token
curl -H "Authorization: Bearer <clerk-jwt-token>" \
  http://localhost:3001/api/users/usage
```

## 🔐 Security Features

### JWT Token Validation
- All API endpoints require valid Clerk JWT tokens
- Tokens verified using Clerk's official SDK
- User information extracted from verified tokens

### Admin Access Control
- Dashboard UI accessed only via fly.io portal
- No public authentication endpoints
- API endpoints serve A11y SaaS frontend only

### Data Security  
- Database credentials isolated to dashboard backend
- No direct database access from customer applications
- Audit trail through Clerk's user management

## 🧪 Testing

### API Testing Script
```bash
# Use existing test script with Clerk tokens
node test-apis.js
```

### Manual Testing
```bash
# 1. Get Clerk token from A11y SaaS frontend
# 2. Test Dashboard APIs
curl -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/scans
```

## 📊 Monitoring & Logs

### Authentication Logs
- Token verification attempts logged
- Failed authentication attempts tracked
- User activity audit trail via Clerk dashboard

### API Usage Metrics
- Request/response logging for all endpoints
- Performance monitoring of Clerk token validation
- Error tracking for authentication failures

## 🔧 Troubleshooting

### Common Issues

#### 1. Token Verification Fails
```bash
# Check Clerk secret key configuration
echo $CLERK_SECRET_KEY

# Verify token format in requests
# Should be: "Authorization: Bearer <clerk-jwt-token>"
```

#### 2. Webhook Signature Verification
```bash
# Ensure webhook secret is correctly configured
# Verify Clerk webhook endpoint URL
# Check webhook payload format
```

#### 3. Database Access Errors
```bash
# Verify Convex URL and deployment key
# Check clerkUserId references in queries
# Ensure user data exists for Clerk user
```

### Debug Mode
```typescript
// Enable detailed logging in auth.ts
console.log('Token verification:', { token: token.substring(0, 20) + '...' });
console.log('User data:', { id: user.id, email: user.emailAddress });
```

## 📋 Migration Checklist

- ✅ **Clerk SDK Integration** - @clerk/backend installed and configured
- ✅ **Authentication Layer** - Token verification with verifyClerkToken()
- ✅ **API Endpoints** - All endpoints using requireAuth() middleware  
- ✅ **Database Schema** - Updated to use clerkUserId references
- ✅ **Webhook Handler** - Clerk user lifecycle events processed
- ✅ **Environment Config** - Clerk secrets and webhook configuration
- ✅ **Testing** - API endpoints tested with Clerk JWT tokens
- ✅ **Documentation** - Integration guide and troubleshooting docs

## 🎯 Benefits Realized

### Enhanced Security
- Professional authentication provider (Clerk)
- Database access isolated to admin environment
- Centralized user management and audit logging
- OAuth provider support (Google, GitHub, etc.)

### Improved Architecture
- Clean separation between frontend and backend
- API-first design ready for mobile applications
- Scalable backend services architecture
- Reduced authentication maintenance burden

### Developer Experience
- Built-in compliance features (SOC 2, GDPR)
- Comprehensive user management interface
- Professional analytics and insights
- Webhook-based user lifecycle management

---

**The Dashboard Backend is now fully integrated with Clerk and serving as the secure API layer for the A11y SaaS platform! 🚀**