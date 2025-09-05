# Multi-stage Dockerfile for production-ready Next.js dashboard
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++ cairo-dev pango-dev libjpeg-turbo-dev giflib-dev librsvg-dev
WORKDIR /app

# Install dependencies based on the preferred package manager  
COPY package.json package-lock.json* ./
# Install ALL dependencies including devDependencies needed for build
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build
ARG NODE_ENV=production
ARG NEXT_PUBLIC_CONVEX_URL
ARG CLERK_SECRET_KEY
ARG SCANNER_SERVICE_URL
ARG ENABLE_ANALYTICS=true
ARG DASHBOARD_TITLE="Accessibility Scanner Dashboard"

ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV SCANNER_SERVICE_URL=$SCANNER_SERVICE_URL
ENV ENABLE_ANALYTICS=$ENABLE_ANALYTICS
ENV DASHBOARD_TITLE=$DASHBOARD_TITLE
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN \
  if [ -f package-lock.json ]; then npm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Ensure public directory exists for copying (Next.js may not preserve it)
RUN mkdir -p public

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files - public directory may be empty but must exist
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Security: Create directory for logs and set permissions
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["node", "server.js"]