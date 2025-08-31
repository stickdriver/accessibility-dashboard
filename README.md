# Accessibility Scanner Dashboard

A comprehensive admin dashboard for monitoring and managing the accessibility scanner service. Built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

## 🌐 Production Deployment

**Live URL**: https://accessibility-dashboard.fly.dev

### Production Status
- ✅ **Backend APIs**: All endpoints operational
- ✅ **Stripe Integration**: Live billing with webhooks
- ✅ **Authentication**: Clerk integration active
- ✅ **CORS**: Configured for https://auditable.dev

### Production Environment
- **Platform**: Fly.io
- **Webhook Endpoint**: https://accessibility-dashboard.fly.dev/api/webhooks/stripe
- **Tier Pricing API**: https://accessibility-dashboard.fly.dev/api/tiers

### Prerequisites
- Node.js 18.0 or later
- npm 9.0 or later
- Access to accessibility scanner service API

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd accessibility-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run type-check` | Run TypeScript checks |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage |
| `npm run e2e` | Run E2E tests |
| `npm run format` | Format code with Prettier |

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Dashboard pages
│   ├── auth/             # Authentication pages
│   └── api/              # API routes
├── components/           # Reusable components
│   ├── ui/              # Base UI components
│   ├── charts/          # Chart components
│   └── tables/          # Table components
├── hooks/               # Custom React hooks
├── services/           # API service layer
├── types/              # TypeScript definitions
└── utils/              # Utility functions
```

## 📊 Features

### Core Dashboard
- **Real-time Metrics**: Live system health and performance monitoring
- **Queue Management**: Monitor and control job processing queue
- **Job Tracking**: Detailed job monitoring with search and filters
- **System Alerts**: Critical issue notifications

### Analytics & Reporting
- **Business Intelligence**: Customer usage patterns and trends
- **Performance Analytics**: System performance metrics and SLA tracking
- **Custom Reports**: Exportable reports with flexible date ranges
- **Tier Analysis**: Usage breakdown by subscription tier

### User Management & Authentication
- **User Registration**: Secure account creation with email validation
- **Authentication**: JWT-based login with password security
- **Profile Management**: User profile updates and settings
- **Password Security**: Secure password reset and change functionality
- **Role-Based Access**: User and admin role permissions
- **Admin Panel**: Complete user management dashboard

### Subscription & Billing Management
- **Stripe Integration**: Secure payment processing and subscription management
- **Multi-Tier Plans**: Free, Professional, and Enterprise subscription options
- **Usage Tracking**: Plan-based limits and usage monitoring
- **Billing Dashboard**: Customer subscription and payment management
- **Webhook Processing**: Automated subscription lifecycle handling
- **Plan Enforcement**: Usage limits and feature access by tier

### Administration
- **User Management**: Customer account and subscription management  
- **System Configuration**: Queue settings and operational parameters
- **Audit Logging**: Complete audit trail of admin actions
- **Role-Based Access**: Granular permission system

## 🔧 Configuration

### Environment Variables

```bash
# Scanner Service Connection
SCANNER_SERVICE_URL=http://localhost:3001
SCANNER_ADMIN_TOKEN=your-jwt-admin-token

# User Authentication & Database
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
JWT_SECRET=your-dashboard-jwt-secret  
JWT_EXPIRES_IN=24h

# Features
ENABLE_ANALYTICS=true
ENABLE_USER_MANAGEMENT=true

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### Getting Admin Tokens

Generate admin tokens using the scanner service utility:

```bash
# In the scanner service directory
export JWT_SECRET=your-scanner-jwt-secret
go run cmd/generate-admin-token/main.go \
  -email admin@company.com \
  -user-id admin-123 \
  -role admin \
  -hours 24

# Use the generated token as SCANNER_ADMIN_TOKEN in dashboard
```

### API Integration

The dashboard connects to the accessibility scanner service dashboard API. **All endpoints are already implemented** in the scanner service:

✅ **Available Dashboard API Endpoints:**
- `GET /api/v2/dashboard/metrics` - Real-time system metrics
- `GET /api/v2/dashboard/queue/stats` - Queue statistics  
- `GET /api/v2/dashboard/jobs/recent` - Recent jobs list
- `POST /api/v2/dashboard/jobs/{id}/retry` - Retry failed jobs
- `POST /api/v2/dashboard/queue/pause` - Pause queue processing
- `POST /api/v2/dashboard/queue/resume` - Resume queue processing
- `GET /api/v2/dashboard/analytics/usage` - Usage analytics
- `GET /api/v2/dashboard/analytics/tiers` - Tier metrics

✅ **Authentication & Authorization:**
- JWT-based admin authentication
- Role-based access control (readonly, admin, super_admin)
- Granular permissions system

## 👥 User Management APIs

The dashboard includes comprehensive user management functionality:

✅ **Authentication Endpoints:**
- `POST /api/auth/register` - User registration with validation
- `POST /api/auth/login` - User authentication 
- `POST /api/auth/forgot-password` - Password reset request
- `GET/POST /api/auth/reset-password` - Token verification and password reset

✅ **User Management Endpoints:**
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/change-password` - Change password

✅ **Admin Endpoints:**
- `GET /api/admin/users` - List all users with stats (admin only)

✅ **Security Features:**
- bcrypt password hashing (12 salt rounds)
- JWT token authentication with expiration
- Input validation with Zod schemas
- Password complexity requirements
- Secure password reset tokens
- Role-based access control middleware

### Testing User Management APIs

```bash
# Run the included test script
node test-apis.js

# Or test manually with curl
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123","name":"Test User"}'
```

For complete API documentation, see [docs/API.md](./docs/API.md).

## 🧪 Testing

### Unit Tests
```bash
npm test
npm run test:coverage
```

### E2E Tests
```bash
npm run e2e
npm run e2e:ui  # Interactive mode
```

### Test Structure
- Unit tests: `*.test.ts(x)` files alongside components
- E2E tests: `tests/` directory
- Test data: `__mocks__/` directory

## 🚢 Deployment

### Docker Deployment

1. **Build image**
   ```bash
   docker build -t accessibility-dashboard .
   ```

2. **Run container**
   ```bash
   docker run -p 3000:3000 \
     -e SCANNER_SERVICE_URL=http://scanner-service:3001 \
     -e JWT_SECRET=your-secret \
     accessibility-dashboard
   ```

### Docker Compose

```bash
docker-compose up -d
```

### Production Checklist

- [ ] Set production environment variables
- [ ] Configure JWT secret
- [ ] Set up monitoring (Sentry)
- [ ] Configure reverse proxy (nginx)
- [ ] Enable HTTPS
- [ ] Set up log aggregation
- [ ] Configure backup strategy

## 🔒 Security

### Authentication
- JWT-based admin authentication
- Role-based access control (Super Admin, Admin, Read-only)
- Session timeout and refresh

### Security Headers
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options

### Input Validation
- All inputs validated with Zod schemas
- XSS prevention
- SQL injection protection (if using database)

## 📈 Monitoring

### Health Checks
- `/api/health` - Application health
- Database connectivity
- External service availability

### Logging
- Structured JSON logging
- Error tracking with Sentry
- Audit trail for admin actions

### Metrics
- Real-time performance metrics
- Custom business metrics
- Alert thresholds

## 🤝 Contributing

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and test**
   ```bash
   npm run type-check
   npm test
   npm run lint
   ```

3. **Commit with conventional format**
   ```bash
   git commit -m "feat: add new dashboard metric"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/new-feature
   ```

### Code Quality

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Husky pre-commit hooks
- 90% test coverage requirement

### Git Conventions

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation updates
- **style**: Code formatting
- **refactor**: Code restructuring
- **test**: Test additions/updates
- **chore**: Build/tooling changes

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)**: Complete technical specification
- **[API.md](./docs/API.md)**: API integration guide
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)**: Deployment instructions
- **[SECURITY.md](./docs/SECURITY.md)**: Security guidelines

## 📄 License

This project is proprietary and confidential. Unauthorized copying, modification, or distribution is prohibited.

## 🆘 Support

For technical support or questions:

1. Check existing documentation
2. Search issues in the repository
3. Create a new issue with detailed information
4. Contact the development team

---

**Built with ❤️ by the Accessibility Scanner Team**