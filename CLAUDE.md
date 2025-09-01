# Accessibility Scanner Dashboard - Next.js Admin Interface

## Project Overview
This is a comprehensive admin dashboard for monitoring, managing, and analyzing the accessibility scanner service. The dashboard provides real-time visibility into scan operations, queue management, business analytics, and operational tools for administrators.

## Architecture Overview

### Core Design Principles
- **Security-First**: Admin-only access with robust authentication and authorization
- **Real-Time Monitoring**: Live updates using Server-Sent Events (SSE) and React Query
- **Performance Optimized**: Efficient data fetching with caching and virtualization
- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Accessibility Compliant**: WCAG 2.1 AA compliant admin interface
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Production Ready**: Comprehensive testing, error handling, and monitoring

### Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.0+
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state
- **Charts**: Recharts for data visualization
- **Authentication**: JWT-based admin authentication
- **Testing**: Jest + React Testing Library + Playwright
- **Deployment**: Docker container with environment-based configuration

## Project Structure

```
accessibility-dashboard/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (dashboard)/         # Dashboard layout group
│   │   │   ├── overview/        # Main dashboard page
│   │   │   ├── queue/           # Queue management
│   │   │   ├── jobs/            # Job monitoring
│   │   │   ├── analytics/       # Business analytics
│   │   │   ├── users/           # User management
│   │   │   ├── settings/        # System settings
│   │   │   └── layout.tsx       # Dashboard layout
│   │   ├── auth/                # Authentication pages
│   │   ├── api/                 # API routes (proxy to scanner service)
│   │   ├── globals.css          # Global styles
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Landing page
│   ├── components/              # Reusable components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── charts/              # Chart components
│   │   ├── tables/              # Data table components
│   │   ├── forms/               # Form components
│   │   └── layout/              # Layout components
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # API service layer
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Utility functions
├── public/                      # Static assets
├── docs/                        # Documentation
├── tests/                       # Test files
└── deployment/                  # Deployment configurations
```

## Tier System Integration

The dashboard integrates with the accessibility scanner's four-tier subscription system:

### Subscription Tiers
- **Free Tier**: 1 page max, axe runner only, WCAG2A, 100 requests/month, 5 RPM
- **Basic Tier**: 5 pages max, axe runner only, WCAG2AA, 1,000 requests/month, 10 RPM  
- **Premium Tier**: 25 pages max, axe + htmlcs runners, WCAG2AA, 10,000 requests/month, 50 RPM
- **Enterprise Tier**: 100 pages max, all runners + custom, WCAG2AAA, unlimited requests, 200 RPM

### Dashboard Tier Analytics
```typescript
interface TierMetrics {
  distribution: {
    free: number;
    basic: number;
    premium: number;
    enterprise: number;
  };
  conversionRates: {
    freeToBasic: number;
    basicToPremium: number;
    premiumToEnterprise: number;
  };
  usageByTier: {
    [tier: string]: {
      scansCompleted: number;
      averageScansPerUser: number;
      quotaUtilization: number;
    };
  };
}
```

## Core Features

### 1. Real-Time Dashboard Overview

**Purpose**: Provide at-a-glance system health and performance metrics

**Components**:
- **System Status Cards**: Queue health, worker status, API availability
- **Live Metrics**: Active scans, queue length, success rate
- **Performance Charts**: Response times, throughput trends
- **Alert Panel**: Critical issues and warnings

**Implementation Requirements**:
```typescript
// Real-time metrics interface
interface DashboardMetrics {
  systemStatus: {
    queueHealth: 'healthy' | 'degraded' | 'critical';
    workerPoolStatus: WorkerPoolStats;
    apiAvailability: number; // percentage
    lastUpdated: string;
  };
  currentStats: {
    activeScans: number;
    queueLength: number;
    completedToday: number;
    successRate: number;
  };
  performance: {
    avgResponseTime: number;
    throughput: number; // scans per minute
    errorRate: number;
  };
  alerts: SystemAlert[];
}
```

### 2. Queue Management System

**Purpose**: Monitor and manage the asynchronous job processing queue

**Features**:
- **Queue Overview**: Pending, running, completed, failed job counts
- **Job Search**: Filter by status, tier (free/basic/premium/enterprise), date range, user ID
- **Job Actions**: Retry failed jobs, cancel pending jobs, view details
- **Queue Controls**: Pause/resume queue, adjust worker count
- **Priority Queue**: Jobs prioritized by tier (Enterprise=100, Premium=50, Basic=10, Free=1)

**Security Requirements**:
- Only admin users can perform queue operations
- All queue actions must be logged for audit
- Dangerous operations (queue flush) require confirmation

### 3. Job Monitoring & Analytics

**Purpose**: Detailed visibility into individual scan jobs and patterns

**Job Detail View**:
```typescript
interface JobDetail {
  id: string;
  status: JobStatus;
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  url: string;
  submittedAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  progress: number;
  result?: ScanResult;
  error?: string;
  retryCount: number;
  metadata: {
    userAgent: string;
    ipAddress: string;
    userId?: string;
  };
}
```

**Analytics Dashboard**:
- Job completion trends by tier (free, basic, premium, enterprise)
- Geographic distribution of scans
- Popular domains and URL patterns
- Error categorization and frequency
- Performance metrics by tier

### 4. Business Intelligence & Reporting

**Purpose**: Provide business insights for decision making

**Key Metrics**:
- **Customer Analytics**: 
  - Tier distribution breakdown (free vs. paid users)
  - Free trial to paid conversion rates
  - Upgrade path analysis (free→basic→premium→enterprise)
  - Churn analysis by tier
- **Revenue Tracking**: Subscription trends, upgrade patterns
- **Usage Analytics**: API consumption, quota utilization
- **Performance Analysis**: SLA compliance, error rates by tier

**Report Generation**:
- Automated daily/weekly/monthly reports
- Custom date range analysis
- Export capabilities (PDF, CSV, JSON)
- Scheduled email reports for stakeholders

### 5. User & Subscription Management

**Purpose**: Manage customer accounts and subscription tiers

**Features**:
- User search and profile management
- Subscription tier modifications
- Usage quota monitoring
- Account status management (active, suspended, cancelled)

**Security Controls**:
- Role-based access control (super admin, admin, read-only)
- Audit logging for all user modifications
- Two-factor authentication for admin accounts

### 6. System Configuration & Settings

**Purpose**: Configure system behavior and operational parameters

**Configuration Areas**:
- **Tier Management**: View current tier configurations (read-only)
- **Queue Settings**: Worker pool size, timeout settings, retry policies
- **Alert Configuration**: Notification thresholds, escalation rules
- **Integration Settings**: External service configurations

## API Integration Layer

### Scanner Service Integration

The dashboard communicates with the accessibility scanner service through the implemented dashboard API layer:

```typescript
// API service interface (matches implemented endpoints)
class ScannerServiceAPI {
  // Authentication
  private authToken: string;
  
  constructor(baseURL: string, authToken: string) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }
  
  // Dashboard-specific endpoints (✅ IMPLEMENTED)
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getQueueStatistics(): Promise<QueueStatistics>;
  getRecentJobs(limit: number): Promise<JobDetail[]>;
  
  // Job management (✅ IMPLEMENTED)
  getJob(jobId: string): Promise<JobDetail>;
  cancelJob(jobId: string): Promise<void>;
  retryJob(jobId: string): Promise<void>;
  
  // Analytics (✅ IMPLEMENTED)
  getUsageAnalytics(params: AnalyticsParams): Promise<AnalyticsData>;
  getTierMetrics(): Promise<TierMetrics>;
  
  // System operations (✅ IMPLEMENTED)
  pauseQueue(): Promise<void>;
  resumeQueue(): Promise<void>;
  adjustWorkerCount(count: number): Promise<void>;
  
  // Authentication header
  private getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }
}
```

### Available Scanner Service Endpoints

The following endpoints are **already implemented** in the Go scanner service:

```
✅ Dashboard API Endpoints (Admin Authentication Required):
GET  /api/v2/dashboard/metrics          - Real-time system metrics
GET  /api/v2/dashboard/queue/stats      - Queue statistics  
GET  /api/v2/dashboard/jobs/recent      - Recent jobs list
GET  /api/v2/dashboard/jobs/{id}        - Job details
POST /api/v2/dashboard/jobs/{id}/retry  - Retry failed job
DELETE /api/v2/dashboard/jobs/{id}      - Cancel job
GET  /api/v2/dashboard/analytics/usage  - Usage analytics
GET  /api/v2/dashboard/analytics/tiers  - Tier metrics
POST /api/v2/dashboard/queue/pause      - Pause queue processing
POST /api/v2/dashboard/queue/resume     - Resume queue processing
POST /api/v2/dashboard/queue/workers    - Adjust worker count

✅ Authentication & Authorization:
- JWT-based admin authentication
- Role-based access control (readonly, admin, super_admin)
- Granular permissions (queue:manage, jobs:retry, analytics:view)
- Audit logging for all admin actions
```

## Security Implementation

### Authentication & Authorization

```typescript
// JWT-based admin authentication
interface AdminToken {
  sub: string;        // admin user ID
  email: string;      // admin email
  role: AdminRole;    // 'super_admin' | 'admin' | 'readonly'
  iat: number;        // issued at
  exp: number;        // expires at
  permissions: string[]; // granular permissions
}

// Role-based access control
enum AdminRole {
  SUPER_ADMIN = 'super_admin',  // Full system access
  ADMIN = 'admin',              // Standard admin operations
  READONLY = 'readonly'         // View-only access
}
```

### Security Best Practices

1. **Input Validation**: All user inputs validated with Zod schemas
2. **XSS Prevention**: Sanitize all data before rendering
3. **CSRF Protection**: Use Next.js built-in CSRF protection
4. **Rate Limiting**: Implement rate limiting on API endpoints
5. **Audit Logging**: Log all admin actions with timestamps
6. **Secure Headers**: Implement security headers (HSTS, CSP, etc.)
7. **Environment Isolation**: Separate development, staging, production configs

### Environment Configuration

```typescript
// Environment variables
interface DashboardConfig {
  // Scanner service connection
  SCANNER_SERVICE_URL: string;
  SCANNER_SERVICE_TOKEN: string;
  
  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  
  // Database (if needed)
  DATABASE_URL?: string;
  
  // Features
  ENABLE_ANALYTICS: boolean;
  ENABLE_USER_MANAGEMENT: boolean;
  
  // Monitoring
  SENTRY_DSN?: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}
```

## Performance Requirements

### Loading Performance
- **First Contentful Paint**: < 1.5 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **Time to Interactive**: < 3 seconds
- **Cumulative Layout Shift**: < 0.1

### Runtime Performance
- **Real-time Updates**: < 500ms update latency
- **Large Dataset Rendering**: Virtual scrolling for 1000+ items
- **Chart Animations**: 60 FPS smooth animations
- **Memory Usage**: < 100MB baseline, < 500MB with large datasets

### Optimization Strategies
```typescript
// React Query configuration for optimal caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 seconds
      cacheTime: 10 * 60 * 1000,   // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

// Virtualization for large tables
import { useVirtualizer } from '@tanstack/react-virtual';

// Image optimization
import Image from 'next/image';

// Code splitting
import { lazy, Suspense } from 'react';
const AnalyticsPage = lazy(() => import('./analytics'));
```

## Testing Strategy

### Unit Testing (Jest + React Testing Library)
```typescript
// Component testing example
describe('QueueStatusCard', () => {
  it('displays correct queue metrics', () => {
    const mockData = {
      pendingJobs: 5,
      runningJobs: 2,
      queueHealth: 'healthy' as const
    };
    
    render(<QueueStatusCard data={mockData} />);
    
    expect(screen.getByText('5 Pending')).toBeInTheDocument();
    expect(screen.getByText('2 Running')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });
});
```

### Integration Testing (Playwright)
```typescript
// E2E testing example
test('admin can view dashboard and manage queue', async ({ page }) => {
  // Login as admin
  await page.goto('/auth/login');
  await page.fill('[data-testid=email]', 'admin@example.com');
  await page.fill('[data-testid=password]', 'admin_password');
  await page.click('[data-testid=login-button]');
  
  // Verify dashboard loads
  await expect(page.locator('[data-testid=dashboard-title]')).toBeVisible();
  
  // Navigate to queue management
  await page.click('[data-testid=queue-nav]');
  await expect(page.locator('[data-testid=queue-stats]')).toBeVisible();
  
  // Test queue operations
  await page.click('[data-testid=pause-queue]');
  await expect(page.locator('[data-testid=queue-paused]')).toBeVisible();
});
```

### API Testing
```typescript
// Mock service worker for API testing
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/v2/dashboard/metrics', (req, res, ctx) => {
    return res(ctx.json(mockDashboardMetrics));
  }),
  
  rest.get('/api/v2/dashboard/queue/stats', (req, res, ctx) => {
    return res(ctx.json(mockQueueStats));
  })
);
```

## Component Library

### Design System (shadcn/ui based)

```typescript
// Custom theme configuration
const theme = {
  colors: {
    primary: {
      50: '#f0f9ff',
      500: '#3b82f6',
      900: '#1e3a8a'
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      900: '#78350f'
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      900: '#7f1d1d'
    }
  }
};
```

### Key Components

1. **Data Visualization**
   - `MetricCard`: Display key metrics with trend indicators
   - `RealtimeChart`: Live updating charts with WebSocket integration
   - `DataTable`: Sortable, filterable tables with virtualization
   - `StatusIndicator`: Visual status representation

2. **Layout Components**
   - `AdminLayout`: Main dashboard layout with sidebar navigation
   - `PageHeader`: Consistent page headers with actions
   - `LoadingStates`: Skeleton loaders for all async content

3. **Form Components**
   - `SearchInput`: Debounced search with autocomplete
   - `DateRangePicker`: Date range selection for analytics
   - `ConfirmDialog`: Dangerous action confirmations

## Deployment & Infrastructure

### Production Deployment (Fly.io)

The application is deployed to Fly.io with automatic scaling and health checks. 

#### Fly.io Configuration (fly.toml)
```toml
app = 'accessibility-dashboard'
primary_region = 'lax'

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
  memory_mb = 1024
```

#### Environment Variables Setup

**Required Environment Variables:**
```bash
# Core Services
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Production Configuration
NEXT_PUBLIC_APP_URL=https://accessibility-dashboard.fly.dev
NODE_ENV=production
LOG_LEVEL=info
```

Use the provided script to set environment variables:
```bash
./scripts/set-fly-env.sh
```

#### Deployment Commands
```bash
# Deploy to production
flyctl deploy

# Check deployment status
flyctl status -a accessibility-dashboard

# View logs
flyctl logs -a accessibility-dashboard

# Set environment variables
flyctl secrets set KEY=value
```

### Docker Configuration

```dockerfile
# Production Dockerfile
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Builder
FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Runner
FROM base AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

### Build & Deployment Process

#### Pre-deployment Checklist
1. **TypeScript Compilation**: Ensure no unused variables or type errors
2. **Environment Variables**: Set all required variables in production
3. **API Imports**: Use correct relative paths for Convex API imports
4. **Authentication**: Properly await auth() calls in API routes

#### Common Build Issues & Fixes

**TypeScript Errors:**
- Remove unused variables or prefix with underscore (_variable)
- Ensure all function parameters are used or marked as unused
- Fix async/await syntax in API route handlers

**Environment Variable Errors:**
- Set NEXT_PUBLIC_CONVEX_URL in production environment
- Configure Clerk authentication keys
- Verify all required environment variables are present

**Import Path Issues:**
- Use relative paths for Convex API imports: `../../../../convex/_generated/api`
- Ensure proper Next.js app directory structure

### Alternative Deployment Options

#### Docker Compose (Local/Self-hosted)
```yaml
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
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Monitoring & Observability

### Error Tracking (Sentry)
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter sensitive data
    if (event.user) {
      delete event.user.email;
    }
    return event;
  }
});
```

### Logging Strategy
```typescript
// Structured logging
interface LogEvent {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

const logger = {
  error: (message: string, error?: Error, metadata?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.stack,
      metadata,
      timestamp: new Date().toISOString()
    }));
  }
};
```

### Health Checks
```typescript
// API route: /api/health
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    scannerService: await checkScannerService(),
    redis: await checkRedis()
  };
  
  const allHealthy = Object.values(checks).every(check => check.healthy);
  
  return Response.json(
    { 
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    },
    { status: allHealthy ? 200 : 503 }
  );
}
```

## Development Workflow

### Getting Started
1. Clone repository and install dependencies
2. Set up environment variables
3. Start development server
4. Run tests and linting

### Code Quality Standards
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

### Git Workflow
- **Feature branches**: `feature/queue-management`
- **Commit convention**: Conventional commits
- **PR requirements**: Tests passing, code review
- **Protected main branch**: No direct pushes

## Success Metrics

### Technical KPIs
- **Uptime**: 99.9% availability
- **Performance**: Core Web Vitals in green
- **Error Rate**: < 0.1% uncaught errors
- **Test Coverage**: > 90% code coverage

### Business KPIs
- **Admin Efficiency**: 50% faster incident resolution
- **User Satisfaction**: NPS > 8 from admin users
- **Free Tier Conversion**: 15% free to paid conversion rate
- **Tier Progression**: 25% basic→premium, 15% premium→enterprise conversion
- **Revenue Growth**: 40% increase within 6 months via tier upgrades
- **System Reliability**: 99.5% queue processing success
- **Operational Insight**: 100% visibility into system performance

## Future Enhancement Roadmap

### Phase 1: Core Dashboard (Weeks 1-4)
- Real-time overview dashboard
- Basic queue management
- Job monitoring interface
- Authentication system

### Phase 2: Analytics & Reporting (Weeks 5-8)
- Business intelligence dashboard
- Custom report generation
- Usage analytics
- Performance trends

### Phase 3: Advanced Features (Weeks 9-12)
- User management interface
- Advanced system configuration
- Webhook management
- API documentation portal

### Phase 4: Scale & Optimize (Weeks 13-16)
- Multi-region support
- Advanced alerting
- Machine learning insights
- White-label customization

This comprehensive specification provides the foundation for building a production-ready admin dashboard that meets security, performance, and operational requirements while maintaining developer productivity and code quality.