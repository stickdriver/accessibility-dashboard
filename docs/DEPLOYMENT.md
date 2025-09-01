# Deployment Guide

This guide covers deploying the Accessibility Scanner Dashboard to production environments.

## Quick Start - Fly.io Deployment

The application is currently deployed to Fly.io at: https://accessibility-dashboard.fly.dev

### Prerequisites

1. **Fly.io Account**: Sign up at https://fly.io
2. **Flyctl CLI**: Install the Fly.io command line tool
3. **Convex Database**: Set up your Convex deployment
4. **Clerk Authentication**: Configure Clerk for user authentication

### Environment Variables

#### Required Variables

Set these environment variables in your production environment:

```bash
# Core Services
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_publishable_key
CLERK_SECRET_KEY=sk_live_your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Production Configuration
NEXT_PUBLIC_APP_URL=https://your-app-domain.fly.dev
NODE_ENV=production
LOG_LEVEL=info
```

#### Optional Variables

```bash
# Scanner Service Integration (for admin features)
SCANNER_SERVICE_URL=https://your-scanner-service.fly.dev
SCANNER_ADMIN_TOKEN=your-scanner-admin-jwt-token

# Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_USER_MANAGEMENT=true
ENABLE_ADMIN_PANEL=true
```

### Deployment Steps

#### 1. Set Environment Variables

Use the provided script:
```bash
# Edit the script with your actual values first
./scripts/set-fly-env.sh
```

Or set manually:
```bash
flyctl secrets set NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
flyctl secrets set CLERK_SECRET_KEY=sk_live_your_secret_key
# ... etc for all variables
```

#### 2. Deploy Application

```bash
# Deploy to Fly.io
flyctl deploy

# Check deployment status
flyctl status -a accessibility-dashboard

# View application logs
flyctl logs -a accessibility-dashboard
```

#### 3. Verify Deployment

```bash
# Check if app is responding
curl -I https://your-app-domain.fly.dev

# Should return HTTP/2 200
```

## Build Process & Common Issues

### TypeScript Compilation

The build process runs TypeScript compilation with strict checks. Common issues:

#### Unused Variables
```typescript
// ❌ Will cause build failure
const unusedVariable = 'value';

// ✅ Prefix with underscore for intentionally unused
const _unusedVariable = 'value';

// ✅ Or use eslint-disable
const unusedVariable = 'value'; // eslint-disable-line @typescript-eslint/no-unused-vars
```

#### Async/Await in API Routes
```typescript
// ❌ Incorrect - auth() returns a promise
export async function GET(request: NextRequest) {
  const { userId } = auth(); // Missing await
}

// ✅ Correct - properly await auth()
export async function GET(request: NextRequest) {
  const { userId } = await auth();
}
```

#### Convex API Imports
```typescript
// ❌ Incorrect path (won't resolve)
import { api } from "@/convex/_generated/api";

// ✅ Use relative path
import { api } from "../../../../convex/_generated/api";
```

### Environment Variable Issues

#### Missing NEXT_PUBLIC_CONVEX_URL
```
Error: Invalid deployment address: Must start with "https://" or "http://". Found "".
```

**Fix:** Ensure `NEXT_PUBLIC_CONVEX_URL` is set in production environment.

#### Clerk Authentication Errors
```
Error: Clerk publishable key not found
```

**Fix:** Set both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

## Alternative Deployment Options

### Docker Compose (Self-hosted)

```yaml
# docker-compose.production.yml
version: '3.8'
services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_CONVEX_URL=${CONVEX_URL}
      - CLERK_SECRET_KEY=${CLERK_SECRET}
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${CLERK_PUBLISHABLE_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

Deploy with:
```bash
docker-compose -f docker-compose.production.yml up -d
```

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

Required Vercel environment variables:
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- All other required variables listed above

### Netlify Deployment

1. Build command: `npm run build`
2. Publish directory: `.next`
3. Set environment variables in Netlify dashboard
4. Configure redirects for API routes

## Monitoring & Health Checks

### Health Check Endpoint

The application provides a health check at `/api/health`:

```bash
curl https://your-app-domain.fly.dev/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-01T22:25:41.000Z"
}
```

### Log Monitoring

#### Fly.io Logs
```bash
# Real-time logs
flyctl logs -a accessibility-dashboard

# Logs from specific machine
flyctl logs -a accessibility-dashboard --machine MACHINE_ID
```

#### Application Logs
The app uses structured JSON logging:
```json
{
  "level": "info",
  "message": "Server started",
  "timestamp": "2025-09-01T22:25:41.000Z",
  "metadata": {
    "port": 3000
  }
}
```

### Performance Monitoring

Set up Sentry for error tracking:
```bash
flyctl secrets set SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## Security Considerations

### Environment Variables
- Never commit `.env.local` to version control
- Use different keys for development and production
- Rotate secrets regularly
- Use Fly.io secrets management for sensitive values

### HTTPS Configuration
- Fly.io automatically provides HTTPS with `force_https = true`
- Custom domains require DNS configuration
- SSL certificates are managed automatically

### Authentication
- Clerk handles user authentication securely
- JWT tokens are validated on each request
- Session management is handled by Clerk

## Scaling Configuration

### Fly.io Auto-scaling
```toml
# fly.toml
[http_service]
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0  # Scale to zero when idle
  
[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
```

### Performance Optimization
- Static assets are cached with long TTL
- API routes use appropriate caching headers
- Database queries are optimized through Convex
- Image optimization handled by Next.js

## Troubleshooting

### Deployment Fails

1. **Check build logs:**
   ```bash
   flyctl deploy --verbose
   ```

2. **Verify environment variables:**
   ```bash
   flyctl secrets list
   ```

3. **Check application logs:**
   ```bash
   flyctl logs -a accessibility-dashboard
   ```

### Application Not Responding

1. **Check machine status:**
   ```bash
   flyctl status -a accessibility-dashboard
   ```

2. **Restart machines:**
   ```bash
   flyctl machine restart MACHINE_ID
   ```

3. **Scale up if needed:**
   ```bash
   flyctl scale count 2
   ```

### Common Error Patterns

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid deployment address` | Missing CONVEX_URL | Set environment variable |
| `Clerk publishable key not found` | Missing Clerk config | Set Clerk environment variables |
| `Module not found` | Import path issues | Use relative paths for Convex API |
| `TypeScript compilation failed` | Unused variables | Remove or prefix with underscore |
| `Authentication failed` | Wrong Clerk keys | Verify development vs production keys |

## Support

For deployment issues:
1. Check this documentation first
2. Review application logs
3. Check Fly.io status page
4. Create an issue in the repository

For production support, ensure you have:
- Access to Fly.io dashboard
- Environment variable backup
- Database backup strategy
- Monitoring setup