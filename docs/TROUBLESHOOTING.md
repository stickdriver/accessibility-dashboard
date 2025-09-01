# Troubleshooting Guide

This guide covers common issues and their solutions encountered during development and deployment.

## Build Errors

### TypeScript Compilation Errors

#### Unused Variables

**Error:**
```
Type error: 'variableName' is declared but its value is never read.
```

**Cause:** TypeScript strict mode flags unused variables as errors.

**Solutions:**

1. **Remove the unused variable:**
   ```typescript
   // ❌ Remove this if not needed
   const unusedVariable = 'value';
   ```

2. **Prefix with underscore for intentionally unused:**
   ```typescript
   // ✅ Indicates intentionally unused
   const _unusedVariable = 'value';
   const _unusedParam = param;
   ```

3. **Use destructuring with rest for unused parameters:**
   ```typescript
   // ✅ Extract only needed parameters
   function handler({ url, scanType, ..._ }) {
     // Only use url and scanType
   }
   ```

#### Unused Function Parameters

**Error:**
```
Type error: 'ctx' is declared but its value is never read.
```

**Solution:**
```typescript
// ❌ Will cause error
handler: async (ctx: any, { url }: { url: string }) => {
  return processUrl(url);
}

// ✅ Prefix with underscore
handler: async (_ctx: any, { url }: { url: string }) => {
  return processUrl(url);
}

// ✅ Or use rest parameters
handler: async (...[, { url }]: [any, { url: string }]) => {
  return processUrl(url);
}
```

#### Async/Await Issues in API Routes

**Error:**
```
Type error: Property 'userId' does not exist on type 'Promise<SessionAuthWithRedirect<never>>'.
```

**Cause:** Missing `await` keyword for async functions.

**Solution:**
```typescript
// ❌ Missing await
export async function GET(request: NextRequest) {
  const { userId } = auth(); // auth() returns a Promise
}

// ✅ Properly await the result
export async function GET(request: NextRequest) {
  const { userId } = await auth();
}
```

#### Module Import Errors

**Error:**
```
Module not found: Can't resolve '@/convex/_generated/api'
```

**Cause:** Incorrect import paths for generated files.

**Solution:**
```typescript
// ❌ Using alias that doesn't resolve
import { api } from "@/convex/_generated/api";

// ✅ Use relative path
import { api } from "../../../../convex/_generated/api";
```

#### Function Call Errors

**Error:**
```
Type error: This expression is not callable. Type 'RegisteredQuery<...>' has no call signatures.
```

**Cause:** Trying to call a Convex query export directly instead of using the internal function.

**Solution:**
```typescript
// ❌ Trying to call exported query
const usage = await getCurrentUsage(ctx, userId);

// ✅ Call the internal function
const usage = await getCurrentUsageInternal(ctx, userId);

// Or use the query properly through Convex client
const usage = await convex.query(api.usage.getCurrentUsage, { 
  clerkUserId: userId,
  monthYear: currentMonth 
});
```

## Runtime Errors

### Environment Variable Issues

#### Missing CONVEX_URL

**Error:**
```
Error: Invalid deployment address: Must start with "https://" or "http://". Found "".
```

**Cause:** `NEXT_PUBLIC_CONVEX_URL` is not set or empty.

**Solutions:**

1. **Set in local environment:**
   ```bash
   # .env.local
   NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
   ```

2. **Set in production (Fly.io):**
   ```bash
   flyctl secrets set NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
   ```

3. **Verify environment variable:**
   ```bash
   # Check if variable is set
   echo $NEXT_PUBLIC_CONVEX_URL
   ```

#### Clerk Authentication Issues

**Error:**
```
Error: Clerk publishable key not found
```

**Cause:** Missing Clerk environment variables.

**Solution:**
```bash
# Set required Clerk variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_secret

# For production, use live keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key
CLERK_SECRET_KEY=sk_live_your_secret
```

### Database Connection Issues

#### Convex Connection Failures

**Error:**
```
ConvexError: Could not connect to Convex deployment
```

**Troubleshooting:**

1. **Verify deployment URL:**
   ```bash
   curl https://your-convex-deployment.convex.cloud
   ```

2. **Check Convex dashboard:**
   - Visit https://dashboard.convex.dev
   - Verify deployment status
   - Check function deployment status

3. **Regenerate deployment URL if needed:**
   ```bash
   npx convex deploy
   ```

## Deployment Issues

### Fly.io Deployment Problems

#### Machine Start Failures

**Error:**
```
Error: failed to start machine: machine did not start in time
```

**Solutions:**

1. **Check machine logs:**
   ```bash
   flyctl logs -a accessibility-dashboard
   ```

2. **Restart machines:**
   ```bash
   flyctl machine restart MACHINE_ID
   ```

3. **Scale up resources:**
   ```bash
   flyctl scale memory 1gb
   ```

#### Environment Variable Not Updating

**Problem:** Changes to environment variables not taking effect.

**Solution:**
```bash
# List current secrets
flyctl secrets list

# Set new secrets (triggers restart)
flyctl secrets set KEY=new_value

# Force restart if needed
flyctl apps restart accessibility-dashboard
```

### Build Failures

#### Out of Memory During Build

**Error:**
```
JavaScript heap out of memory
```

**Solutions:**

1. **Increase Node.js memory:**
   ```json
   // package.json
   {
     "scripts": {
       "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
     }
   }
   ```

2. **Use build-only deployment:**
   ```bash
   flyctl deploy --build-only
   ```

#### Dependency Issues

**Error:**
```
Cannot resolve dependency 'package-name'
```

**Solutions:**

1. **Clear package cache:**
   ```bash
   npm ci
   rm -rf .next
   npm run build
   ```

2. **Check package.json for version conflicts:**
   ```bash
   npm list --depth=0
   npm audit fix
   ```

## Development Issues

### Hot Reload Not Working

**Solutions:**

1. **Check file watchers:**
   ```bash
   # Increase file watcher limit (Linux/Mac)
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Restart dev server:**
   ```bash
   rm -rf .next
   npm run dev
   ```

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE :::3000
```

**Solutions:**

1. **Find and kill process:**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Use different port:**
   ```bash
   npm run dev -- -p 3001
   ```

## Performance Issues

### Slow Build Times

**Solutions:**

1. **Enable SWC (should be default in Next.js 12+):**
   ```json
   // next.config.js
   module.exports = {
     swcMinify: true,
   }
   ```

2. **Use incremental builds:**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "incremental": true
     }
   }
   ```

### Large Bundle Size

**Analysis:**
```bash
# Analyze bundle
ANALYZE=true npm run build
```

**Solutions:**

1. **Dynamic imports:**
   ```typescript
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <p>Loading...</p>
   });
   ```

2. **Tree shaking verification:**
   ```typescript
   // Use named imports instead of default
   import { specificFunction } from 'library';
   ```

## Testing Issues

### Jest Configuration Problems

**Error:**
```
Cannot find module '@/components/...' from 'test.ts'
```

**Solution:**
```json
// jest.config.js
{
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}
```

### E2E Test Failures

**Common issues:**

1. **Element not found:**
   ```typescript
   // Use proper waits
   await page.waitForSelector('[data-testid=element]');
   await page.click('[data-testid=element]');
   ```

2. **Network requests failing:**
   ```typescript
   // Mock external APIs
   await page.route('/api/external/*', route => {
     route.fulfill({ json: mockData });
   });
   ```

## Security Issues

### CORS Errors

**Error:**
```
Access to fetch blocked by CORS policy
```

**Solution:**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
        ],
      },
    ];
  },
};
```

### Authentication Token Issues

**Error:**
```
Invalid token signature
```

**Troubleshooting:**

1. **Verify JWT secret:**
   ```bash
   echo $JWT_SECRET
   ```

2. **Check token expiration:**
   ```typescript
   import jwt from 'jsonwebtoken';
   const decoded = jwt.decode(token);
   console.log('Token expires:', new Date(decoded.exp * 1000));
   ```

## Monitoring & Debugging

### Enable Debug Mode

```bash
# Local development
DEBUG=accessibility-dashboard:* npm run dev

# Production logging
LOG_LEVEL=debug npm start
```

### Health Check Endpoint

```bash
# Check application health
curl https://your-app.fly.dev/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-09-01T22:25:41.000Z"
}
```

### Performance Monitoring

1. **Enable Core Web Vitals:**
   ```typescript
   // pages/_app.tsx
   export function reportWebVitals(metric) {
     console.log(metric);
   }
   ```

2. **Database query performance:**
   ```typescript
   // Monitor Convex query times
   const start = Date.now();
   const result = await convex.query(api.scans.getUserScans, params);
   console.log(`Query took ${Date.now() - start}ms`);
   ```

## Getting Help

### Debugging Checklist

1. **Check environment variables are set**
2. **Verify all dependencies are installed**  
3. **Ensure database connections work**
4. **Check application logs for errors**
5. **Verify external service connectivity**
6. **Test with minimal reproduction case**

### Log Analysis

```bash
# Fly.io logs
flyctl logs -a accessibility-dashboard

# Filter for errors only
flyctl logs -a accessibility-dashboard | grep ERROR

# Follow logs in real-time
flyctl logs -a accessibility-dashboard -n
```

### Common Commands

```bash
# Full rebuild and restart
rm -rf .next node_modules
npm install
npm run build

# Check TypeScript
npm run type-check

# Run linting
npm run lint

# Test everything
npm test
npm run e2e
```

For issues not covered here:
1. Check the application logs first
2. Search existing GitHub issues
3. Create a minimal reproduction case
4. Include environment details and error logs when reporting issues