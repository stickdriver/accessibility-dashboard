# Convex Migration to Dashboard - Setup Guide

## Overview

The Convex database layer has been successfully moved from the A11y SaaS project to the Dashboard project, creating a cleaner Backend-for-Frontend architecture.

## Architecture Change

### Before
```
A11y SaaS (Frontend + Database) ←→ Dashboard (Admin UI only)
```

### After  
```
A11y SaaS (Frontend) ←→ Dashboard (Backend + Admin UI) ←→ Convex Database
                      ↗
Scanner Service ←→ Dashboard APIs
```

## What Was Migrated

### 1. Convex Configuration
- **Copied from A11y SaaS**: `convex/` directory and `convex.json`
- **Location**: `/Users/dennis/Projects/accessibility-dashboard/`

### 2. Database Schema
All existing Convex tables are now available in Dashboard:
- `users` - User accounts and profiles
- `scans` - Accessibility scan records  
- `scanPages` - Individual page results
- `usage` - Monthly usage tracking
- `analytics` - Event tracking
- `supportTickets` - Customer support

### 3. New API Routes
**Authentication Routes**:
- `POST /api/auth/login` - User login with JWT tokens
- `POST /api/auth/register` - User registration

**User Routes**:
- `GET /api/users/profile` - Get/update user profile
- `GET /api/users/usage` - Current usage statistics

**Scan Routes**:
- `GET /api/scans` - List user scans (paginated)
- `POST /api/scans` - Create new scan
- `GET /api/scans/[id]` - Get scan details with pages
- `PUT /api/scans/[id]` - Update scan status/results

**Admin Routes**:
- `GET /api/admin/users` - List all users (admin only)
- `GET /api/admin/users/[id]` - User details with activity
- `GET /api/admin/signups` - Recent signups with statistics
- `GET /api/admin/logins` - Login activity tracking
- `GET /api/admin/activity` - System-wide user activity

## Setup Instructions

### 1. Install Dependencies
```bash
cd /Users/dennis/Projects/accessibility-dashboard
npm install
```

### 2. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your values:
# - Set NEXT_PUBLIC_CONVEX_URL to your Convex deployment URL
# - Set JWT_SECRET to a secure random string
# - Optionally set SCANNER_SERVICE_URL for integration
```

### 3. Deploy Convex Database
```bash
# Initialize Convex in Dashboard project
npm run convex:dev

# Or for production
npm run convex:deploy
```

### 4. Start Dashboard
```bash
npm run dev
```

The Dashboard will be available at `http://localhost:3000` (or your configured port).

## API Usage Examples

### Authentication
```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token, user } = await response.json();

// Use token in subsequent requests
const userProfile = await fetch('/api/users/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Admin Operations
```typescript
// Get all users (admin only)
const users = await fetch('/api/admin/users', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

// Get user activity
const activity = await fetch('/api/admin/activity?days=7', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

## Security Features

### JWT Authentication
- **Stateless tokens**: No server-side session storage
- **Role-based access**: User vs Admin permissions
- **Token expiration**: Configurable expiry (default 24h)
- **Secure headers**: Authorization Bearer tokens

### API Security
- **Input validation**: Zod schemas for request validation
- **Error handling**: Standardized error responses
- **Rate limiting**: Ready for middleware integration
- **CORS protection**: Configured for cross-origin requests

## Integration Points

### A11y SaaS Integration
To connect A11y SaaS to the Dashboard APIs:

1. **Replace Convex client** with HTTP client
2. **Update authentication** to use JWT tokens
3. **Modify scan creation** to call Dashboard APIs

### Scanner Service Integration  
To connect Scanner Service to Dashboard:

1. **User validation**: Call `/api/users/profile` to validate scan requests
2. **Result submission**: POST to `/api/scans/[id]` with scan results
3. **Usage tracking**: Update usage statistics via Dashboard APIs

## Next Steps

### For A11y SaaS
1. Remove Convex dependencies from `package.json`
2. Replace direct Convex calls with Dashboard API calls
3. Update authentication flow to use Dashboard JWT tokens
4. Test all user flows with new API integration

### For Scanner Service
1. Add HTTP client for Dashboard API calls
2. Implement user validation before processing scans
3. Submit scan results to Dashboard instead of direct database
4. Update usage tracking to use Dashboard endpoints

### For Dashboard UI
1. Build admin dashboard components to consume the APIs
2. Create user management interface
3. Add scan monitoring and analytics views
4. Implement real-time updates using Server-Sent Events

## Troubleshooting

### Common Issues

**Convex Connection Errors**:
- Verify `NEXT_PUBLIC_CONVEX_URL` in environment
- Check Convex deployment status
- Ensure Convex schema is deployed

**Authentication Failures**:
- Verify `JWT_SECRET` is set and consistent
- Check token format in Authorization headers
- Ensure admin users have correct role assignment

**API Route Errors**:
- Check Next.js API route file structure
- Verify Convex functions exist and are deployed
- Review browser network tab for detailed error messages

### Development Tips

1. **Use Convex Dashboard** to monitor database operations
2. **Check API routes** in browser dev tools Network tab
3. **Test with curl** for API endpoint validation
4. **Use Postman** for comprehensive API testing

## Migration Verification

To verify the migration was successful:

1. **Start Dashboard**: `npm run dev`
2. **Test API endpoints**: Use Postman or curl to test auth and user routes
3. **Check Convex data**: Verify all data migrated correctly
4. **Test admin functions**: Ensure admin routes work with proper authentication

The Dashboard is now ready to serve as the central data layer for your accessibility platform.