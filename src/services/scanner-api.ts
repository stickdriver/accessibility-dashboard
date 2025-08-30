/**
 * Scanner Service API Client
 * 
 * Provides type-safe access to the accessibility scanner service dashboard API.
 * All endpoints require admin JWT authentication.
 */

import { z } from 'zod';

// =============================================================================
// Configuration
// =============================================================================

interface ScannerAPIConfig {
  baseURL: string;
  adminToken: string;
  timeout?: number;
}

// =============================================================================
// Response Schemas (matches Go service types)
// =============================================================================

const SystemStatusSchema = z.object({
  queueHealth: z.enum(['healthy', 'degraded', 'critical']),
  workerPoolStatus: z.object({
    totalWorkers: z.number(),
    activeWorkers: z.number(),
    idleWorkers: z.number(),
    queueLength: z.number(),
    processedJobs: z.number(),
  }),
  apiAvailability: z.number(),
  serviceUptime: z.string(),
});

const SystemAlertSchema = z.object({
  id: z.string(),
  level: z.enum(['critical', 'warning', 'info']),
  title: z.string(),
  message: z.string(),
  createdAt: z.string(),
  acknowledged: z.boolean(),
});

const DashboardMetricsSchema = z.object({
  systemStatus: SystemStatusSchema,
  currentStats: z.object({
    activeScans: z.number(),
    queueLength: z.number(),
    completedToday: z.number(),
    successRate: z.number(),
  }),
  performance: z.object({
    avgResponseTimeMs: z.number(),
    throughputPerMinute: z.number(),
    errorRate: z.number(),
  }),
  alerts: z.array(SystemAlertSchema),
  lastUpdated: z.string(),
});

const QueueStatisticsSchema = z.object({
  pendingJobs: z.number(),
  runningJobs: z.number(),
  completedJobs: z.number(),
  failedJobs: z.number(),
  totalJobs: z.number(),
  averageWaitTime: z.string(),
  jobsByTier: z.record(z.number()),
  workerStats: z.object({
    totalWorkers: z.number(),
    activeWorkers: z.number(),
    idleWorkers: z.number(),
    queueLength: z.number(),
    processedJobs: z.number(),
  }),
});

const RecentJobSchema = z.object({
  id: z.string(),
  status: z.string(),
  tier: z.enum(['free', 'basic', 'premium', 'enterprise']),
  url: z.string(),
  submittedAt: z.string(),
  completedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  errorMessage: z.string(),
});

const UsageAnalyticsSchema = z.object({
  timeRange: z.string(),
  jobsByTier: z.record(z.number()),
  jobsByStatus: z.record(z.number()),
  topDomains: z.array(z.object({
    domain: z.string(),
    count: z.number(),
    tier: z.string(),
  })),
  hourlyStats: z.array(z.object({
    hour: z.string(),
    jobCount: z.number(),
    successCount: z.number(),
    failureCount: z.number(),
  })),
  trends: z.object({
    jobGrowthRate: z.number(),
    tierUpgradeRate: z.number(),
    errorRateTrend: z.number(),
  }),
});

const TierAnalyticsSchema = z.object({
  tierDistribution: z.record(z.object({
    activeUsers: z.number(),
    totalJobs: z.number(),
    avgJobsPerUser: z.number(),
    quotaUtilization: z.number(),
  })),
  conversionRates: z.object({
    freeToBasic: z.number(),
    basicToPremium: z.number(),
    premiumToEnterprise: z.number(),
  }),
  usageByTier: z.record(z.object({
    scansCompleted: z.number(),
    averageScansPerUser: z.number(),
    quotaUtilization: z.number(),
    revenueContribution: z.number(),
  })).optional(),
});

// =============================================================================
// TypeScript Types
// =============================================================================

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
export type QueueStatistics = z.infer<typeof QueueStatisticsSchema>;
export type RecentJob = z.infer<typeof RecentJobSchema>;
export type UsageAnalytics = z.infer<typeof UsageAnalyticsSchema>;
export type TierAnalytics = z.infer<typeof TierAnalyticsSchema>;
export type SystemAlert = z.infer<typeof SystemAlertSchema>;

// =============================================================================
// API Client
// =============================================================================

export class ScannerServiceAPI {
  private baseURL: string;
  private adminToken: string;
  private timeout: number;

  constructor(config: ScannerAPIConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.adminToken = config.adminToken;
    this.timeout = config.timeout || 30000; // 30 second default timeout
  }

  /**
   * Get authentication headers for admin API requests
   */
  private getAuthHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.adminToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make authenticated request to scanner service
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    schema: z.ZodSchema<T>
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ScannerAPIError(
        response.status,
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        errorData.code,
        errorData.details
      );
    }

    const data = await response.json();
    return schema.parse(data);
  }

  // =============================================================================
  // Dashboard Metrics
  // =============================================================================

  /**
   * Get real-time system metrics and health status
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.makeRequest(
      '/api/v2/dashboard/metrics',
      { method: 'GET' },
      DashboardMetricsSchema
    );
  }

  // =============================================================================
  // Queue Management
  // =============================================================================

  /**
   * Get detailed queue statistics
   */
  async getQueueStatistics(): Promise<QueueStatistics> {
    return this.makeRequest(
      '/api/v2/dashboard/queue/stats',
      { method: 'GET' },
      QueueStatisticsSchema
    );
  }

  /**
   * Pause job processing queue
   * Requires 'queue:manage' permission
   */
  async pauseQueue(): Promise<{ status: string; message: string }> {
    const response = await this.makeRequest(
      '/api/v2/dashboard/queue/pause',
      { method: 'POST' },
      z.object({ status: z.string(), message: z.string() })
    );
    return response;
  }

  /**
   * Resume job processing queue
   * Requires 'queue:manage' permission
   */
  async resumeQueue(): Promise<{ status: string; message: string }> {
    const response = await this.makeRequest(
      '/api/v2/dashboard/queue/resume',
      { method: 'POST' },
      z.object({ status: z.string(), message: z.string() })
    );
    return response;
  }

  /**
   * Adjust worker count (1-20 workers)
   * Requires 'queue:manage' permission
   */
  async adjustWorkerCount(count: number): Promise<{ workerCount: number; status: string; message: string }> {
    if (count < 1 || count > 20) {
      throw new Error('Worker count must be between 1 and 20');
    }

    const response = await this.makeRequest(
      '/api/v2/dashboard/queue/workers',
      {
        method: 'POST',
        body: JSON.stringify({ workerCount: count }),
      },
      z.object({
        workerCount: z.number(),
        status: z.string(),
        message: z.string(),
      })
    );
    return response;
  }

  // =============================================================================
  // Job Management
  // =============================================================================

  /**
   * Get recent jobs with optional limit (default: 50, max: 500)
   */
  async getRecentJobs(limit = 50): Promise<{ jobs: RecentJob[]; total: number; limit: number }> {
    const clampedLimit = Math.min(Math.max(limit, 1), 500);
    
    const response = await this.makeRequest(
      `/api/v2/dashboard/jobs/recent?limit=${clampedLimit}`,
      { method: 'GET' },
      z.object({
        jobs: z.array(RecentJobSchema),
        total: z.number(),
        limit: z.number(),
      })
    );
    return response;
  }

  /**
   * Get detailed job information
   */
  async getJob(jobId: string): Promise<any> {
    // Reuses existing async job endpoint
    return this.makeRequest(
      `/api/v2/async/jobs/${jobId}`,
      { method: 'GET' },
      z.any() // Use existing job detail schema
    );
  }

  /**
   * Retry a failed job
   * Requires 'jobs:retry' permission
   */
  async retryJob(jobId: string): Promise<{ jobId: string; status: string; message: string }> {
    const response = await this.makeRequest(
      `/api/v2/dashboard/jobs/${jobId}/retry`,
      { method: 'POST' },
      z.object({
        jobId: z.string(),
        status: z.string(),
        message: z.string(),
      })
    );
    return response;
  }

  /**
   * Cancel a pending job
   * Requires 'jobs:cancel' permission
   */
  async cancelJob(jobId: string): Promise<{ jobId: string; status: string; message: string }> {
    // Reuses existing async job cancellation endpoint
    const response = await this.makeRequest(
      `/api/v2/async/jobs/${jobId}`,
      { method: 'DELETE' },
      z.object({
        jobId: z.string(),
        status: z.string(),
        message: z.string(),
      })
    );
    return response;
  }

  // =============================================================================
  // Analytics
  // =============================================================================

  /**
   * Get usage analytics for specified time range
   * Requires 'analytics:view' permission
   */
  async getUsageAnalytics(range = '24h'): Promise<UsageAnalytics> {
    const validRanges = ['1h', '24h', '7d', '30d'];
    if (!validRanges.includes(range)) {
      throw new Error(`Invalid range: ${range}. Must be one of: ${validRanges.join(', ')}`);
    }

    return this.makeRequest(
      `/api/v2/dashboard/analytics/usage?range=${range}`,
      { method: 'GET' },
      UsageAnalyticsSchema
    );
  }

  /**
   * Get tier-specific analytics and conversion rates
   * Requires 'analytics:view' permission
   */
  async getTierAnalytics(): Promise<TierAnalytics> {
    return this.makeRequest(
      '/api/v2/dashboard/analytics/tiers',
      { method: 'GET' },
      TierAnalyticsSchema
    );
  }

  // =============================================================================
  // Health Check
  // =============================================================================

  /**
   * Check if scanner service is available (no auth required)
   */
  async healthCheck(): Promise<{ status: string; service: string; queue: string }> {
    const response = await fetch(`${this.baseURL}/health`, {
      signal: AbortSignal.timeout(this.timeout),
    });
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    return response.json();
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Test authentication token validity
   */
  async testAuthentication(): Promise<boolean> {
    try {
      await this.getDashboardMetrics();
      return true;
    } catch (error) {
      if (error instanceof ScannerAPIError && 
          [401, 403].includes(error.status)) {
        return false;
      }
      throw error; // Re-throw non-auth errors
    }
  }

  /**
   * Update admin token (for token refresh scenarios)
   */
  updateToken(newToken: string): void {
    this.adminToken = newToken;
  }
}

// =============================================================================
// Error Handling
// =============================================================================

export class ScannerAPIError extends Error {
  constructor(
    public status: number,
    public override message: string,
    public code?: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ScannerAPIError';
  }

  get isAuthError(): boolean {
    return [401, 403].includes(this.status);
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create configured ScannerServiceAPI instance
 */
export function createScannerAPI(config: ScannerAPIConfig): ScannerServiceAPI {
  return new ScannerServiceAPI(config);
}

/**
 * Create ScannerServiceAPI from environment variables
 */
export function createScannerAPIFromEnv(): ScannerServiceAPI {
  const baseURL = process.env.SCANNER_SERVICE_URL;
  const adminToken = process.env.SCANNER_ADMIN_TOKEN;

  if (!baseURL) {
    throw new Error('SCANNER_SERVICE_URL environment variable is required');
  }

  if (!adminToken) {
    throw new Error('SCANNER_ADMIN_TOKEN environment variable is required');
  }

  return new ScannerServiceAPI({
    baseURL,
    adminToken,
    timeout: parseInt(process.env.SCANNER_API_TIMEOUT || '30000'),
  });
}