import { v } from "convex/values";
import { action } from "./_generated/server";

// V3 Scanner Service - Pa11y-Centric Multi-Engine with Queue System
const SCANNER_SERVICE_URL = "https://accessibility-service-pa11y.fly.dev";

// Async scan using the V3 service queue system
export const scanWebsiteAsync = action({
  args: {
    url: v.string(),
    scanType: v.union(v.literal("single_page"), v.literal("multi_page")),
    customerTier: v.optional(v.union(v.literal("starter"), v.literal("essential"), v.literal("professional"))),
    options: v.optional(v.object({
      timeout: v.optional(v.number()),
      maxPages: v.optional(v.number()),
      userAgent: v.optional(v.string()),
      viewport: v.optional(v.object({
        width: v.number(),
        height: v.number()
      })),
      waitUntil: v.optional(v.string()),
      retryAttempts: v.optional(v.number())
    })),
    scanId: v.optional(v.string())
  },
  handler: async (_ctx: any, { url, scanType, customerTier = "starter", options = {}, scanId }: {
    url: string,
    scanType: "single_page" | "multi_page",
    customerTier?: "starter" | "essential" | "professional",
    options?: any,
    scanId?: string
  }) => {
    // V3 service does not support full site scanning yet
    if (scanType === "multi_page") {
      throw new Error("Multi-page scanning is temporarily unavailable. Our scanning service is being enhanced to support multi-page scans. Please try single page scanning for now.");
    }
    
    return await submitAsyncScan(url, scanType, customerTier, options, scanId);
  }
});

// Poll job status and return results when completed
export const pollJobStatus = action({
  args: {
    jobId: v.string(),
    maxWaitTime: v.optional(v.number()), // Maximum time to wait in milliseconds
    pollInterval: v.optional(v.number()), // Polling interval in milliseconds
  },
  handler: async (_ctx: any, { jobId, maxWaitTime = 120000, pollInterval = 2000 }: {
    jobId: string,
    maxWaitTime?: number,
    pollInterval?: number
  }) => {
    return await pollForCompletion(jobId, maxWaitTime, pollInterval);
  }
});

// Get immediate job status (single check)
export const getJobStatus = action({
  args: {
    jobId: v.string()
  },
  handler: async (_ctx: any, { jobId }: { jobId: string }) => {
    return await fetchJobStatus(jobId);
  }
});

// Get detailed job progress (V3 specific endpoint)
export const getJobProgress = action({
  args: {
    jobId: v.string()
  },
  handler: async (_ctx: any, { jobId }: { jobId: string }) => {
    return await fetchJobProgress(jobId);
  }
});

// Cancel a pending or running job
export const cancelJob = action({
  args: {
    jobId: v.string()
  },
  handler: async (_ctx: any, { jobId }: { jobId: string }) => {
    return await cancelAsyncJob(jobId);
  }
});

// Submit async scan job to V3 service
async function submitAsyncScan(
  url: string,
  scanType: "single_page" | "multi_page",
  customerTier: string = "starter",
  options: any = {},
  scanId?: string
) {
  const startTime = Date.now();
  
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  // V3 async endpoint
  const endpoint = `${SCANNER_SERVICE_URL}/api/v2/async/scan/single`;

  // V3 service supports separate starter, essential, and professional tiers
  const requestBody = {
    url,
    customerTier: customerTier,
    subscriptionId: null, // Can be added later for premium features
    options: {
      timeout: options.timeout || 90000, // 90 seconds per page (Pa11y default)
      maxPages: scanType === "multi_page" ? (options.maxPages || 5) : 1,
      userAgent: options.userAgent || 'AccessAudit Pro Scanner Bot 1.0',
      viewport: options.viewport || { width: 1920, height: 1080 },
      waitUntil: options.waitUntil || 'networkidle0'
    }
  };

  try {
    // First, test service health
    await testServiceHealth();

    console.log(`Submitting async scan to V3 service: ${endpoint}`);
    console.log(`Scanning ${scanType}: ${url}`);
    console.log('Request body parameters:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AccessAudit-Convex/2.0',
        'Authorization': `Bearer ${process.env.SCANNER_API_KEY || ''}`,
      },
      body: JSON.stringify(requestBody),
      // V3 service returns immediately with job ID, so short timeout is fine
      signal: AbortSignal.timeout(30000) // 30 seconds
    });

    if (!response.ok) {
      let errorMessage = `Async scan submission failed (${response.status})`;
      
      try {
        const responseText = await response.text();
        if (responseText) {
          try {
            const errorJson = JSON.parse(responseText);
            if (errorJson.error) {
              errorMessage = errorJson.error;
              if (errorJson.details) {
                errorMessage += `: ${errorJson.details}`;
              }
            } else {
              errorMessage += `: ${responseText}`;
            }
          } catch {
            errorMessage += `: ${responseText}`;
          }
        }
      } catch (readError) {
        console.error('Failed to read error response:', readError);
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Async job submission response:', JSON.stringify(result, null, 2));

    // V3 async service returns job details immediately
    if (!result.jobId) {
      throw new Error(`Invalid async response format: ${JSON.stringify(result)}`);
    }

    console.log(`Async job submitted successfully in ${Date.now() - startTime}ms - jobId: ${result.jobId}`);
    
    return {
      jobId: result.jobId,
      status: result.status || 'queued',
      submittedAt: result.submittedAt,
      estimatedCompletionTime: result.estimatedCompletionTime,
      tier: result.tier || 'starter',
      message: result.message || 'Job submitted successfully'
    };

  } catch (error) {
    console.error('Async scan submission error:', error);
    console.error('Request details:', {
      endpoint,
      url,
      scanType,
      timeout: requestBody.options.timeout,
      scanId: scanId || 'none'
    });
    
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('Job submission timed out. The V3 service may be overloaded. Please try again.');
      }
      
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new Error('Unable to connect to V3 async service. Please check your internet connection and try again.');
      }
      
      if (error.message.includes('Pa11y') || error.message.includes('unhealthy')) {
        throw new Error('V3 async service is temporarily unavailable. Please try again in a few minutes.');
      }
      
      throw error;
    }
    
    throw new Error('Async scan submission failed due to an unexpected error');
  }
}

// Poll for job completion with intelligent backoff
async function pollForCompletion(jobId: string, maxWaitTime: number, pollInterval: number) {
  const startTime = Date.now();
  let currentInterval = pollInterval;
  const maxInterval = 10000; // Max 10 seconds between polls
  const backoffMultiplier = 1.5;

  console.log(`Starting to poll job ${jobId} for up to ${maxWaitTime}ms`);

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const jobStatus = await fetchJobStatus(jobId);
      
      console.log(`Job ${jobId} status: ${jobStatus.status}, progress: ${jobStatus.progress}%`);

      // Check if job is finished
      if (['completed', 'failed', 'canceled', 'timeout'].includes(jobStatus.status)) {
        if (jobStatus.status === 'completed') {
          // Convert V3 async result to internal format
          const convertedResult = convertV3AsyncResultToInternalFormat(jobStatus);
          console.log('Async job completed successfully:', {
            jobId,
            totalTime: Date.now() - startTime,
            scanDuration: jobStatus.result?.scanDuration,
            violations: jobStatus.result?.violationCount || 0
          });
          return convertedResult;
        } else {
          // Job failed, canceled, or timed out
          throw new Error(`Async scan ${jobStatus.status}: ${jobStatus.message || jobStatus.error || 'Unknown error'}`);
        }
      }

      // Wait before next poll with exponential backoff
      await new Promise(resolve => setTimeout(resolve, currentInterval));
      currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval);

    } catch (error) {
      if (error instanceof Error && error.message.includes('Async scan')) {
        // This is a final status error, re-throw it
        throw error;
      }
      
      console.error(`Error polling job ${jobId}:`, error);
      
      // If polling fails, wait a bit and try again (unless we're out of time)
      if (Date.now() - startTime < maxWaitTime - 5000) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      } else {
        throw new Error(`Failed to get final status for job ${jobId}: ${(error as Error).message}`);
      }
    }
  }

  // Timeout reached
  throw new Error(`Job ${jobId} did not complete within ${maxWaitTime}ms. The scan may still be running in the background.`);
}

// Fetch current job status from V3 service
async function fetchJobStatus(jobId: string) {
  const endpoint = `${SCANNER_SERVICE_URL}/api/v2/async/jobs/${jobId}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'AccessAudit-Convex/2.0',
        'Authorization': `Bearer ${process.env.SCANNER_API_KEY || ''}`,
      },
      signal: AbortSignal.timeout(15000) // 15 seconds
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Job ${jobId} not found. It may have expired or never existed.`);
      }
      
      let errorMessage = `Failed to get job status (${response.status})`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage += `: ${errorText}`;
        }
      } catch {
        // Ignore error reading response
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error(`Timeout getting status for job ${jobId}`);
      }
      throw error;
    }
    throw new Error(`Unexpected error getting job status: ${error}`);
  }
}

// Fetch detailed job progress from V3 service
async function fetchJobProgress(jobId: string) {
  const endpoint = `${SCANNER_SERVICE_URL}/api/v2/async/jobs/${jobId}/progress`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'AccessAudit-Convex/2.0',
        'Authorization': `Bearer ${process.env.SCANNER_API_KEY || ''}`,
      },
      signal: AbortSignal.timeout(15000) // 15 seconds
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Job ${jobId} not found or progress not available.`);
      }
      
      let errorMessage = `Failed to get job progress (${response.status})`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage += `: ${errorText}`;
        }
      } catch {
        // Ignore error reading response
      }
      throw new Error(errorMessage);
    }

    const progressData = await response.json();
    
    // Add enhanced progress information
    return {
      ...progressData,
      // Provide fallback values for UI consistency
      progress: progressData.progress || 0,
      currentStep: progressData.currentStep || 'Initializing scan...',
      estimatedTime: progressData.estimatedTime || null,
      lastUpdated: progressData.lastUpdated || new Date().toISOString(),
      detailedStatus: progressData.detailedStatus || progressData.status || 'unknown'
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error(`Timeout getting progress for job ${jobId}`);
      }
      throw error;
    }
    throw new Error(`Unexpected error getting job progress: ${error}`);
  }
}

// Cancel an async job
async function cancelAsyncJob(jobId: string) {
  const endpoint = `${SCANNER_SERVICE_URL}/api/v2/async/jobs/${jobId}`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'User-Agent': 'AccessAudit-Convex/2.0',
        'Authorization': `Bearer ${process.env.SCANNER_API_KEY || ''}`,
      },
      signal: AbortSignal.timeout(10000) // 10 seconds
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Job ${jobId} not found or already completed`);
      }
      
      let errorMessage = `Failed to cancel job (${response.status})`;
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage += `: ${errorText}`;
        }
      } catch {
        // Ignore error reading response
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return {
      jobId: result.jobId,
      status: result.status,
      message: result.message || 'Job canceled successfully'
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error(`Timeout canceling job ${jobId}`);
      }
      throw error;
    }
    throw new Error(`Unexpected error canceling job: ${error}`);
  }
}

// Test V3 service health
async function testServiceHealth() {
  try {
    const healthResponse = await fetch(`${SCANNER_SERVICE_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10 second timeout for health check
    });
    console.log(`V3 service health check status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log('V3 service health check response:', healthData);
    } else {
      throw new Error(`Service unhealthy: ${healthResponse.status}`);
    }
  } catch (healthError) {
    console.error('V3 service health check failed:', healthError);
    throw new Error(`V3 async service is not accessible. Health check failed: ${(healthError as Error).message}`);
  }
}

// Convert V3 async job result to internal application format with enhanced engine attribution
function convertV3AsyncResultToInternalFormat(asyncJobResult: any) {
  // V3 async job result contains the job metadata plus the scan result
  const scanResult = asyncJobResult.result;
  
  if (!scanResult) {
    throw new Error('Async job completed but no scan result available');
  }

  // Enhanced issue conversion with V3 engine attribution support
  const issues = scanResult.violations?.map((violation: any) => ({
    id: violation.code || 'unknown',
    impact: mapImpactToSeverity(violation.impact),
    description: violation.message,
    help: violation.message,
    helpUrl: '',
    wcagLevel: 'AA',
    nodes: [{
      target: [violation.selector || 'unknown'],
      html: violation.context || '',
      failureSummary: violation.message,
    }],
    remediation: generateBasicRemediation(violation.code),
    
    // V3 Enhanced Engine Attribution
    detectedBy: violation.detectedBy || ['axe'], // Which engines found this issue
    crossValidated: violation.crossValidated || false, // Found by multiple engines
    engineSpecific: violation.engineSpecific || {}, // Engine-specific data
    confidence: violation.crossValidated ? 'high' : 'medium', // Confidence based on cross-validation
  })) || [];

  const criticalIssues = issues.filter((issue: any) => issue.impact === 'critical').length;
  const totalIssues = scanResult.violationCount || 0;
  
  const accessibilityScore = Math.max(0, 100 - (criticalIssues * 10) - ((totalIssues - criticalIssues) * 2));

  // Extract engine statistics if available
  const engineStats = scanResult.engineStatistics || {};
  const enginesUsed = scanResult.enginesUsed || ['axe'];

  return {
    pages: [{
      pageUrl: scanResult.url,
      pageTitle: extractHostname(scanResult.url),
      issues: issues,
      wcagLevel: totalIssues === 0 ? 'Meets Level AA' : 'Does not meet Level A',
      accessibilityScore: accessibilityScore,
      loadTime: scanResult.metadata?.loadTime || 0,
      scanOrder: 0,
      
      // V3 Enhanced Page Metadata
      enginesUsed: enginesUsed,
      engineBreakdown: engineStats.engineBreakdown || {},
      crossValidatedIssues: issues.filter((issue: any) => issue.crossValidated).length,
    }],
    summary: {
      totalPages: 1,
      averageScore: accessibilityScore,
      commonIssues: extractCommonIssues(issues),
      
      // V3 Enhanced Summary
      enginesUsed: enginesUsed,
      crossValidatedFindings: engineStats.crossValidated || 0,
      uniqueFindings: engineStats.uniqueFindings || totalIssues,
      enginePerformance: engineStats.engineBreakdown ? 
        Object.entries(engineStats.engineBreakdown).map(([engine, stats]: [string, any]) => ({
          engine,
          issuesFound: stats.issuesFound || 0,
          performance: stats.performance || 0,
        })) : []
    },
    totalIssues: totalIssues,
    criticalIssues: criticalIssues,
    accessibilityScore: accessibilityScore,
    duration: Math.round((scanResult.scanDuration || 0) / 1000), // Convert ms to seconds
    
    // V3 Enhanced Async Metadata
    asyncMetadata: {
      jobId: asyncJobResult.jobId,
      queuedAt: asyncJobResult.createdAt,
      startedAt: asyncJobResult.startedAt,
      completedAt: asyncJobResult.completedAt,
      tier: asyncJobResult.tier,
      enginesUsed: enginesUsed,
      workerProcessed: asyncJobResult.workerProcessed || false,
      
      // Engine attribution summary
      engineSummary: {
        totalEngines: enginesUsed.length,
        crossValidationRate: totalIssues > 0 ? 
          Math.round((engineStats.crossValidated || 0) / totalIssues * 100) : 0,
        primaryEngine: enginesUsed[0] || 'axe',
        multiEngineValidation: enginesUsed.length > 1,
      }
    }
  };
}

// Helper functions (reused from sync scanner)
function mapImpactToSeverity(impact: string): string {
  // Map axe-core impact levels to our severity display
  switch (impact?.toLowerCase()) {
    case 'critical':
      return 'critical';
    case 'serious':
      return 'serious';
    case 'moderate':
      return 'moderate';
    case 'minor':
      return 'minor';
    default:
      return 'moderate'; // Default fallback
  }
}

function generateBasicRemediation(code: string): string {
  const tips: Record<string, string> = {
    'color-contrast': 'Ensure text has sufficient color contrast with its background.',
    'image-alt': 'Add descriptive alt text to images that convey meaning.',
    'heading-order': 'Use heading tags (h1-h6) in logical order without skipping levels.',
    'link-name': 'Ensure links have descriptive text that explains where they lead.',
    'form-field-multiple-labels': 'Each form field should have exactly one label.',
  };
  
  return tips[code] || 'Review accessibility guidelines for this issue.';
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function extractCommonIssues(issues: any[]): string[] {
  const issueCounts = issues.reduce((acc, issue) => {
    acc[issue.id] = (acc[issue.id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(issueCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([issue]) => issue);
}