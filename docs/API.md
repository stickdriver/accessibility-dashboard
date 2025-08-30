# User Management API Documentation

This document outlines the user management and authentication APIs implemented for the accessibility dashboard.

## Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Admin APIs](#admin-apis)
- [Error Handling](#error-handling)
- [Security Features](#security-features)
- [Testing](#testing)

## Authentication

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe" // optional
}
```

**Validation:**
- Email must be valid format
- Password minimum 8 characters, must contain uppercase, lowercase, and number
- Name is optional

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "planType": "free",
      "role": "user"
    }
  }
}
```

### POST /api/auth/login

Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "planType": "free",
      "role": "user"
    }
  }
}
```

### POST /api/auth/forgot-password

Request password reset for a user account.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account with that email exists, we've sent you a password reset link."
}
```

**Note:** Always returns success to avoid revealing whether an email exists in the system.

### GET /api/auth/reset-password?token={reset_token}

Verify a password reset token.

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "email": "user@example.com",
    "valid": true
  }
}
```

### POST /api/auth/reset-password

Reset password using a valid reset token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "newPassword": "NewSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

## Subscription Management

### GET /api/tiers

Get available subscription tiers and pricing information.

**Response:**
```json
{
  "success": true,
  "data": {
    "tiers": [
      {
        "id": "free",
        "name": "Free",
        "price": 0,
        "limits": {
          "scansPerMonth": 10,
          "pagesPerScan": 25
        },
        "features": ["Basic accessibility scanning", "PDF reports"]
      },
      {
        "id": "professional",
        "name": "Professional",
        "price": 2900,
        "priceId": "price_professional_monthly",
        "limits": {
          "scansPerMonth": 100,
          "pagesPerScan": 100
        },
        "features": ["Advanced scanning", "API access", "Priority support"]
      },
      {
        "id": "enterprise",
        "name": "Enterprise",
        "price": null,
        "priceId": null,
        "limits": {
          "scansPerMonth": "unlimited",
          "pagesPerScan": "unlimited"
        },
        "features": ["Unlimited scans", "White-label reports", "Dedicated support"]
      }
    ]
  }
}
```

### GET /api/users/usage

Get current user's usage statistics and subscription status.

**Authentication Required:** Bearer token

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "tier": "professional",
      "status": "active",
      "stripeCustomerId": "cus_...",
      "stripeSubscriptionId": "sub_...",
      "currentPeriodEnd": "2024-12-01T00:00:00Z"
    },
    "usage": {
      "scansThisMonth": 35,
      "scansRemaining": 65,
      "resetDate": "2024-12-01T00:00:00Z"
    },
    "limits": {
      "scansPerMonth": 100,
      "pagesPerScan": 100
    }
  }
}
```

### POST /api/webhooks/stripe

Handle Stripe subscription lifecycle events.

**Authentication:** Webhook signature verification using `STRIPE_WEBHOOK_SECRET`

**Supported Events:**
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription modified
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Successful payment
- `invoice.payment_failed` - Payment failure

**Request Headers:**
```
Content-Type: application/json
Stripe-Signature: signature_string
```

**Security:**
- Webhook signatures verified using Stripe webhook secret
- Event deduplication to prevent duplicate processing
- Payload validation for all required fields

**Response:**
```json
{
  "received": true
}
```

## User Management

All user management endpoints require authentication via Bearer token in the Authorization header.

**Authentication Header:**
```
Authorization: Bearer {jwt_token}
```

### GET /api/users/profile

Get current user's profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "planType": "free",
    "emailVerified": false,
    "onboardingCompleted": true,
    "stripeCustomerId": "cus_..."
  }
}
```

### PUT /api/users/profile

Update current user's profile information.

**Request Body:**
```json
{
  "name": "Updated Name",
  "onboardingCompleted": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Updated Name",
    "planType": "free",
    "emailVerified": false,
    "onboardingCompleted": true
  }
}
```

### POST /api/users/change-password

Change the current user's password.

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

## Admin APIs

Admin endpoints require authentication with admin role.

### GET /api/admin/users

Get all users with pagination and statistics (admin only).

**Query Parameters:**
- `limit` (optional): Number of users to return (default: 50)
- `cursor` (optional): Pagination cursor for next page

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "user_id",
        "email": "user@example.com",
        "name": "John Doe",
        "planType": "free",
        "emailVerified": true,
        "onboardingCompleted": true,
        "_creationTime": 1640995200000
      }
    ],
    "nextCursor": "cursor_for_next_page",
    "stats": {
      "total": 1250,
      "byPlan": {
        "free": 800,
        "professional": 300,
        "agency": 120,
        "enterprise": 30
      },
      "verified": 1100,
      "onboarded": 950
    }
  }
}
```

## Error Handling

All APIs return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "User-friendly message"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created (registration)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

### Common Error Messages

- `"Authentication required"` - No valid token provided
- `"Admin access required"` - User lacks admin permissions  
- `"Validation failed: {details}"` - Input validation errors
- `"Invalid credentials"` - Login failed
- `"User already exists"` - Email already registered
- `"Current password is incorrect"` - Password change failed
- `"Invalid or expired reset token"` - Password reset token invalid

## Security Features

### Password Security
- **Hashing**: bcrypt with 12 salt rounds
- **Requirements**: Minimum 8 characters, uppercase, lowercase, number
- **Storage**: Never stored in plain text

### JWT Tokens
- **Signing**: RS256/HS256 algorithm
- **Expiration**: Configurable (default 24 hours)
- **Payload**: User ID, email, role

### Password Reset
- **Tokens**: Cryptographically secure, single-use
- **Expiration**: 1 hour from generation
- **Security**: Doesn't reveal user existence

### Input Validation
- **Zod Schemas**: All inputs validated
- **Sanitization**: XSS prevention
- **Type Safety**: TypeScript throughout

### Role-Based Access Control
- **User Role**: Standard user permissions
- **Admin Role**: Full system access
- **Middleware**: Automatic permission checking

## Middleware

### withAuth
Requires valid authentication token.

```typescript
import { withAuth } from '../lib/middleware';

export default withAuth(async (req, res) => {
  // req.user contains JWT payload
  const { userId, email, role } = req.user;
});
```

### withAdminAuth  
Requires admin role.

```typescript
import { withAdminAuth } from '../lib/middleware';

export default withAdminAuth(async (req, res) => {
  // Guaranteed admin access
});
```

### withRoles
Custom role requirements.

```typescript
import { withRoles } from '../lib/middleware';

export default withRoles(['admin', 'moderator'], async (req, res) => {
  // Custom role checking
});
```

### optionalAuth
Optional authentication.

```typescript
import { optionalAuth } from '../lib/middleware';

export default optionalAuth(async (req, res) => {
  // req.user exists if authenticated, undefined if not
});
```

## Testing

### Manual Testing Script

Run the included test script:

```bash
node test-apis.js
```

This tests:
1. User registration
2. User login  
3. Profile retrieval
4. Password reset request

### API Testing with curl

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123","name":"Test User"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'
```

**Get Profile:**
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment Variables

Required environment variables:

```env
# JWT Configuration
JWT_SECRET=your-secure-secret-key-here
JWT_EXPIRES_IN=24h

# Convex Database
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
```

## Rate Limiting

The API structure supports rate limiting implementation. Consider adding:

- Registration: 5 attempts per hour per IP
- Login: 10 attempts per hour per IP  
- Password reset: 3 attempts per hour per email
- Profile updates: 20 requests per hour per user

## Monitoring

All authentication events should be logged for security monitoring:

- User registrations
- Login attempts (success/failure)
- Password changes
- Admin actions
- Token validation failures

## Best Practices

1. **Always use HTTPS** in production
2. **Validate all inputs** on both client and server
3. **Log security events** for monitoring
4. **Rotate JWT secrets** regularly
5. **Implement rate limiting** 
6. **Use strong passwords** for admin accounts
7. **Monitor for suspicious activity**
8. **Keep dependencies updated**

## Future Enhancements

- Two-factor authentication (2FA)
- Social login (OAuth)
- Account lockout after failed attempts  
- Email verification workflow
- Advanced role permissions
- Session management
- Audit logging dashboard