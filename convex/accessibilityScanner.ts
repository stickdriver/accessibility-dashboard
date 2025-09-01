import { v } from "convex/values";
import { action } from "./_generated/server";

// V3 Scanner Service - Pa11y-Centric Multi-Engine
const SCANNER_SERVICE_URL = "https://accessibility-service-pa11y.fly.dev";

// Real accessibility scanner using Fly.io service
export const scanWebsite = action({
  args: {
    url: v.string(),
    scanType: v.union(v.literal("single_page"), v.literal("full_site")),
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
  handler: async (ctx: any, { url, scanType, options = {}, scanId }: {
    url: string,
    scanType: "single_page" | "full_site",
    options?: any,
    scanId?: string
  }) => {
    // Get scan details if scanId provided to determine user and tier
    let clerkUserId, userTier;
    if (scanId) {
      const scan = await ctx.db.get(scanId);
      if (scan) {
        clerkUserId = scan.clerkUserId;
        // Get user tier from Clerk or default to starter
        userTier = 'starter'; // TODO: Get actual tier from user metadata
      }
    }
    
    return await callAccessibilityScannerService(url, scanType, options, scanId, clerkUserId, userTier);
  }
});

async function callAccessibilityScannerService(
  url: string,
  scanType: "single_page" | "full_site",
  options: any = {},
  scanId?: string,
  clerkUserId?: string,
  userTier?: string
) {
  const startTime = Date.now();
  
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Map user tier to Scanner Service tier format
  const customerTier = mapUserTierToScannerTier(userTier || 'starter');
  
  // Create Scanner Service request with Dashboard authentication
  const scannerRequest = {
    url,
    customerTier,
    subscriptionId: clerkUserId || 'dashboard-user',
    options: {
      timeout: options.timeout || 60000,
      includeWarnings: true,
      includeNotices: false,
      wait: 1000,
      ...options
    },
    customRunners: ['axe', 'pa11y'] // Use both engines for comprehensive results
  };

  // V3 service endpoints
  // Full site scanning is handled by the same endpoint with maxPages option
  const endpoint = `${SCANNER_SERVICE_URL}/api/scan/single`;

  // Create progress callback URL if scanId is provided
  const progressCallbackUrl = scanId 
    ? `https://dusty-guanaco-345.convex.site/updateScanProgress`
    : null;

  // V3 service uses Pa11y with better timeout management
  const requestBody = {
    url,
    options: {
      // Reduced timeout - V3 service handles this more efficiently
      timeout: options.timeout || 90000, // 90 seconds per page (Pa11y default)
      maxPages: options.maxPages || 5,
      retryAttempts: options.retryAttempts || 1, // V3 is more reliable, fewer retries needed
      userAgent: options.userAgent || 'AccessAudit Pro Scanner Bot 1.0',
      viewport: options.viewport || { width: 1920, height: 1080 },
      waitUntil: options.waitUntil || 'networkidle0'
    },
    progressCallback: progressCallbackUrl,
    scanId: scanId ? String(scanId) : undefined
  };

  try {
    console.log(`Calling V3 scanner service: ${endpoint}`);
    console.log(`Scanning ${scanType}: ${url}`);
    console.log('Request body parameters:', JSON.stringify(requestBody, null, 2));
    
    // First, let's test if the service is available with a health check
    try {
      const healthResponse = await fetch(`${SCANNER_SERVICE_URL}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout for health check
      });
      console.log(`Health check status: ${healthResponse.status}`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.text();
        console.log('Health check response:', healthData);
      }
    } catch (healthError) {
      console.error('Health check failed:', healthError);
      throw new Error(`V3 scanner service is not accessible. Health check failed: ${(healthError as Error).message}`);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AccessAudit-Convex/1.0',
      },
      body: JSON.stringify(requestBody),
      // V3 service has better timeout handling - use shorter client timeout
      signal: AbortSignal.timeout(120000) // 2 minutes
    });

    if (!response.ok) {
      let errorMessage = `Scanner service error (${response.status})`;
      
      try {
        // Try to get the response body as text first (this works for both JSON and plain text)
        const responseText = await response.text();
        
        if (responseText) {
          try {
            // Try to parse as JSON
            const errorJson = JSON.parse(responseText);
            // V3 service returns ErrorResponse format: { error: string, code?: string, details?: string }
            if (errorJson.error) {
              errorMessage = errorJson.error;
              if (errorJson.details) {
                errorMessage += `: ${errorJson.details}`;
              }
            } else {
              errorMessage += `: ${responseText}`;
            }
          } catch {
            // If JSON parsing fails, use the text as-is
            errorMessage += `: ${responseText}`;
          }
        }
      } catch (readError) {
        console.error('Failed to read error response:', readError);
        // Keep the basic error message if we can't read the response
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('V3 service raw response:', JSON.stringify(result, null, 2));

    // V3 service backward compatibility endpoint returns data directly (no success wrapper)
    // Check if this looks like a valid scan result
    if (!result.url || typeof result.violationCount !== 'number') {
      console.error('Invalid V3 response format:', result);
      throw new Error(`Scanner failed: ${result.error || result.message || 'Invalid response format'}`);
    }

    console.log(`V3 scan completed in ${Date.now() - startTime}ms: ${result.violationCount} issues found`);
    
    // Convert V3 legacy response format to expected internal format
    const convertedResult = convertV3ResponseToInternalFormat(result);
    console.log('Converted result for application:', JSON.stringify({
      totalIssues: convertedResult.totalIssues,
      criticalIssues: convertedResult.criticalIssues,
      accessibilityScore: convertedResult.accessibilityScore,
      pagesCount: convertedResult.pages.length,
      duration: convertedResult.duration
    }, null, 2));
    
    return convertedResult;

  } catch (error) {
    console.error('V3 accessibility scanner service error:', error);
    console.error('Request details:', {
      endpoint,
      url,
      scanType,
      timeout: requestBody.options.timeout,
      scanId: scanId || 'none'
    });
    
    // Enhanced error handling for V3 service
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('Scan timed out. The V3 service may be processing a complex page. Please try again or contact support if this persists.');
      }
      
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new Error('Unable to connect to V3 scanning service. Please check your internet connection and try again.');
      }
      
      if (error.message.includes('Pa11y') || error.message.includes('unhealthy')) {
        throw new Error('V3 scanning service is temporarily unavailable. Please try again in a few minutes.');
      }
      
      // Re-throw scanner service errors as-is (they're already user-friendly from V3)
      throw error;
    }
    
    throw new Error('Accessibility scan failed due to an unexpected error');
  }
}

// Convert V3 service legacy response format to internal application format
function convertV3ResponseToInternalFormat(v3Response: any) {
  // V3 LegacyResponse format from compatibility.go:
  // {
  //   url: string,
  //   violations: LegacyViolation[],
  //   violationCount: number,
  //   timestamp: string,
  //   scanDurationMs: number,
  //   metadata: ScanMetadata
  // }
  
  // Convert violations to expected format
  const issues = v3Response.violations.map((violation: any) => ({
    id: violation.code || 'unknown',
    impact: mapTypeToImpact(violation.type),
    description: violation.message,
    help: violation.message, // V3 doesn't separate help text
    helpUrl: '', // V3 doesn't provide help URLs in legacy format
    wcagLevel: 'AA', // Default since V3 legacy format doesn't include this
    nodes: [{
      target: [violation.selector || 'unknown'],
      html: violation.context || '',
      failureSummary: violation.message,
    }],
    remediation: generateBasicRemediation(violation.code),
  }));

  // Calculate severity stats
  const criticalIssues = issues.filter((issue: any) => issue.impact === 'critical').length;
  const totalIssues = v3Response.violationCount;
  
  // Calculate a basic accessibility score (simplified version)
  const accessibilityScore = Math.max(0, 100 - (criticalIssues * 10) - ((totalIssues - criticalIssues) * 2));

  // Return in the format expected by the application
  return {
    pages: [{
      pageUrl: v3Response.url,
      pageTitle: extractHostname(v3Response.url),
      issues: issues,
      wcagLevel: totalIssues === 0 ? 'Meets Level AA' : 'Does not meet Level A',
      accessibilityScore: accessibilityScore,
      loadTime: v3Response.metadata?.loadTime || 0,
      scanOrder: 0
    }],
    summary: {
      totalPages: 1,
      averageScore: accessibilityScore,
      commonIssues: extractCommonIssues(issues),
    },
    totalIssues: totalIssues,
    criticalIssues: criticalIssues,
    accessibilityScore: accessibilityScore,
    duration: Math.round(v3Response.scanDurationMs / 1000), // Convert ms to seconds
  };
}

// Map V3 violation type to impact level
function mapTypeToImpact(type: string): string {
  switch (type?.toLowerCase()) {
    case 'error':
      return 'critical';
    case 'warning':
      return 'serious';
    case 'notice':
      return 'moderate';
    default:
      return 'minor';
  }
}

// Generate basic remediation tip
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

// Map user tier to Scanner Service tier format
function mapUserTierToScannerTier(userTier: string): string {
  const tierMapping: Record<string, string> = {
    'starter': 'free',        // Pa11y + HtmlCodeSniffer (default runner)
    'essential': 'premium',   // Pa11y + HtmlCodeSniffer + Axe runners  
    'professional': 'enterprise', // Pa11y + all available runners
    'enterprise': 'enterprise'     // Pa11y + all runners + enterprise features
  };
  
  return tierMapping[userTier.toLowerCase()] || 'free';
}

// Extract hostname from URL for page title
function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Extract common issues for summary
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