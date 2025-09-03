import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";

export const processScan = internalAction({
  args: { scanId: v.id("scans") },
  handler: async (ctx: any, { scanId }: { scanId: any }) => {
    try {
      // Update to running status
      await ctx.runMutation("scanProcessor:updateScanStatus", {
        scanId,
        status: "running",
        progress: 0,
        message: "Initializing scan..."
      });

      // Get scan details
      const scan = await ctx.runMutation("scanProcessor:getScanDetails", { scanId });
      if (!scan) {
        throw new Error("Scan not found");
      }

      // Initial progress update to show activity (webhook will handle incremental updates)
      await ctx.runMutation("scanProcessor:updateScanStatus", {
        scanId,
        progress: 5,
        message: "Starting accessibility scan...",
        status: "running"
      });

      // Perform the accessibility scan using production scanner
      const results = await performProductionScanWithProgress(
        ctx, 
        scanId, 
        scan.websiteUrl, 
        scan.scanType
      );

      // Final completion
      await ctx.runMutation("scanProcessor:completeScan", {
        scanId,
        results: results.summary,
        totalIssues: results.totalIssues,
        criticalIssues: results.criticalIssues,
        accessibilityScore: results.accessibilityScore,
        scanDuration: results.duration,
        pagesScanned: results.pages.length,
      });

      // Update usage count
      await ctx.runMutation("scanProcessor:updateUsage", {
        userId: scan.userId,
        pagesScanned: results.pages.length,
      });

    } catch (error) {
      console.error("Scan failed:", error);
      await ctx.runMutation("scanProcessor:failScan", {
        scanId,
        errorMessage: (error as Error).message,
      });
    }
  },
});

// Get scan details for processing
export const getScanDetails = internalMutation({
  args: { scanId: v.id("scans") },
  handler: async (ctx: any, { scanId }: { scanId: any }) => {
    return await ctx.db.get(scanId);
  },
});

// Update scan status with progress
export const updateScanStatus = internalMutation({
  args: {
    scanId: v.id("scans"),
    status: v.optional(v.string()),
    progress: v.number(),
    message: v.optional(v.string()),
    pagesScanned: v.optional(v.number()),
  },
  handler: async (ctx: any, { scanId, status, progress, message, pagesScanned }: {
    scanId: any,
    status?: string,
    progress: number,
    message?: string,
    pagesScanned?: number
  }) => {
    const updates: any = { 
      progress: Math.max(0, Math.min(100, progress)),
    };
    
    if (status) updates.status = status;
    if (message) updates.statusMessage = message;
    if (pagesScanned !== undefined) updates.pagesScanned = pagesScanned;

    await ctx.db.patch(scanId, updates);
    
    // Track progress analytics
    await ctx.db.insert("analytics", {
      eventType: "scan_progress_updated",
      metadata: { scanId, progress, status, message },
      timestamp: Date.now(),
    });
  },
});

// Complete scan with results
export const completeScan = internalMutation({
  args: {
    scanId: v.id("scans"),
    results: v.any(),
    totalIssues: v.number(),
    criticalIssues: v.number(),
    accessibilityScore: v.number(),
    scanDuration: v.number(),
    pagesScanned: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.scanId, {
      status: "completed",
      progress: 100,
      statusMessage: "Scan completed successfully",
      results: args.results,
      totalIssues: args.totalIssues,
      criticalIssues: args.criticalIssues,
      accessibilityScore: args.accessibilityScore,
      scanDuration: args.scanDuration,
      pagesScanned: args.pagesScanned,
      completedAt: Date.now(),
    });

    // Track completion
    await ctx.db.insert("analytics", {
      eventType: "scan_completed",
      metadata: {
        scanId: args.scanId,
        totalIssues: args.totalIssues,
        criticalIssues: args.criticalIssues,
        accessibilityScore: args.accessibilityScore,
        duration: args.scanDuration,
        pagesScanned: args.pagesScanned,
      },
      timestamp: Date.now(),
    });
  },
});

// Fail scan with error
export const failScan = internalMutation({
  args: {
    scanId: v.id("scans"),
    errorMessage: v.string(),
  },
  handler: async (ctx: any, { scanId, errorMessage }: { scanId: any, errorMessage: string }) => {
    await ctx.db.patch(scanId, {
      status: "failed",
      progress: 0,
      statusMessage: `Scan failed: ${errorMessage}`,
      errorMessage,
    });

    // Track failure
    await ctx.db.insert("analytics", {
      eventType: "scan_failed",
      metadata: { scanId, errorMessage },
      timestamp: Date.now(),
    });
  },
});

// Insert scan page results
export const insertScanPage = internalMutation({
  args: {
    scanId: v.id("scans"),
    pageUrl: v.string(),
    pageTitle: v.optional(v.string()),
    issues: v.any(),
    wcagLevel: v.string(),
    accessibilityScore: v.number(),
    loadTime: v.optional(v.number()),
    scanOrder: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    await ctx.db.insert("scanPages", args);
  },
});

// Update user usage
export const updateUsage = internalMutation({
  args: {
    userId: v.string(),
    pagesScanned: v.number(),
  },
  handler: async (ctx: any, { userId, pagesScanned }: { userId: string, pagesScanned: number }) => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    const existing = await ctx.db
      .query("usage")
      .withIndex("by_user_month", (q: any) => 
        q.eq("userId", userId).eq("monthYear", currentMonth)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pagesScanned: existing.pagesScanned + pagesScanned,
      });
    } else {
      await ctx.db.insert("usage", {
        userId,
        monthYear: currentMonth,
        pagesScanned,
        scansPerformed: 0, // Already incremented when scan started
        pdfDownloads: 0,
        lastResetDate: Date.now(),
      });
    }
  },
});

// Store async job ID for progress tracking
export const storeAsyncJobId = internalMutation({
  args: {
    scanId: v.id("scans"),
    asyncJobId: v.string(),
  },
  handler: async (ctx: any, { scanId, asyncJobId }: { scanId: any, asyncJobId: string }) => {
    await ctx.db.patch(scanId, {
      asyncJobId: asyncJobId,
    });
  },
});

// Production scanning function with intelligent sync/async fallback
async function performProductionScanWithProgress(
  ctx: any,
  scanId: string,
  url: string,
  scanType: string
) {
  try {
    // Update status before calling scanner
    await ctx.runMutation("scanProcessor:updateScanStatus", {
      scanId,
      progress: 10,
      message: "Connecting to accessibility scanner...",
      status: "running"
    });

    // Async-only scanning for optimal resource utilization and predictable performance
    console.log(`Starting async scan for ${url} (async-only architecture)`);
    
    // Update status to show immediate async processing
    await ctx.runMutation("scanProcessor:updateScanStatus", {
      scanId,
      progress: 15,
      message: "Submitting scan to priority queue...",
      status: "running"
    });
    
    // All scans go through async queue system for better resource management
    const results = await performAsyncScanWithPolling(ctx, scanId, url, scanType);
    
    console.log(`Async scan completed for ${url}`);
    
    // Additional progress update after async completion
    await ctx.runMutation("scanProcessor:updateScanStatus", {
      scanId,
      progress: 90,
      message: "Scan completed, processing results...",
      status: "running"
    });

    // Only update after scan completes (webhook handles progress during scan)
    await ctx.runMutation("scanProcessor:updateScanStatus", {
      scanId,
      progress: 95,
      message: "Processing scan results...",
      status: "running"
    });

    // Process and save individual page results (no progress updates here)
    if (results.pages && results.pages.length > 0) {
      for (let i = 0; i < results.pages.length; i++) {
        const page = results.pages[i];
        
        await ctx.runMutation("scanProcessor:insertScanPage", {
          scanId,
          pageUrl: page.pageUrl,
          pageTitle: page.pageTitle,
          issues: page.issues,
          wcagLevel: page.wcagLevel,
          accessibilityScore: page.accessibilityScore,
          loadTime: page.loadTime,
          scanOrder: page.scanOrder || i,
        });
      }
    }

    return {
      pages: results.pages,
      summary: results.summary,
      totalIssues: results.totalIssues,
      criticalIssues: results.criticalIssues,
      accessibilityScore: results.accessibilityScore,
      duration: results.duration,
    };

  } catch (error) {
    console.error("Production scan failed:", error);
    throw new Error(`Accessibility scan failed: ${(error as Error).message}`);
  }
}

// Async scan with polling integration
async function performAsyncScanWithPolling(
  ctx: any,
  scanId: string,
  url: string,
  scanType: string
) {
  // For now, use starter tier - in production, this would come from user's plan
  const customerTier = "starter"; // TODO: Get from user's actual plan
  
  // Submit async job with V3 service integration
  const jobSubmission = await ctx.runAction("asyncAccessibilityScanner:scanWebsiteAsync", {
    url,
    scanType: scanType as "single_page" | "full_site",
    customerTier,
    options: {
      timeout: 90000, // 90 seconds per page
      maxPages: scanType === "full_site" ? 5 : 1,
      retryAttempts: 1
    },
    scanId: scanId
  });

  // Store the async job ID for progress tracking
  await ctx.runMutation("scanProcessor:storeAsyncJobId", {
    scanId,
    asyncJobId: jobSubmission.jobId
  });

  console.log(`Async job submitted: ${jobSubmission.jobId}`);

  // Update progress to show queued status
  await ctx.runMutation("scanProcessor:updateScanStatus", {
    scanId,
    progress: 20,
    message: `Job queued (${jobSubmission.jobId}), waiting for processing...`,
    status: "running"
  });

  // Poll for completion with progress updates
  const pollStart = Date.now();
  const maxPollTime = 180000; // 3 minutes max polling
  const pollInterval = 3000; // 3 seconds
  let lastProgress = 20;

  while (Date.now() - pollStart < maxPollTime) {
    try {
      // Check job status
      const jobStatus = await ctx.runAction("asyncAccessibilityScanner:getJobStatus", {
        jobId: jobSubmission.jobId
      });

      console.log(`Job ${jobSubmission.jobId} status: ${jobStatus.status}, progress: ${jobStatus.progress || 0}%`);

      // Update progress based on job status
      if (jobStatus.progress && jobStatus.progress > lastProgress) {
        lastProgress = Math.min(jobStatus.progress, 90); // Cap at 90% to leave room for final processing
        await ctx.runMutation("scanProcessor:updateScanStatus", {
          scanId,
          progress: Math.round(20 + (lastProgress * 0.7)), // Map job progress 0-100 to scan progress 20-90
          message: getProgressMessage(jobStatus.status, jobStatus.progress),
          status: "running"
        });
      }

      // Check if job is complete
      if (['completed', 'failed', 'canceled', 'timeout'].includes(jobStatus.status)) {
        if (jobStatus.status === 'completed') {
          // Use the poll function to get final results
          return await ctx.runAction("asyncAccessibilityScanner:pollJobStatus", {
            jobId: jobSubmission.jobId,
            maxWaitTime: 5000, // Short wait since job is already complete
            pollInterval: 1000
          });
        } else {
          throw new Error(`Async job ${jobStatus.status}: ${jobStatus.message || jobStatus.error || 'Unknown error'}`);
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      console.error(`Error polling async job ${jobSubmission.jobId}:`, error);
      
      // If this is a final status error, re-throw
      if (error instanceof Error && (
        error.message.includes('failed') || 
        error.message.includes('canceled') || 
        error.message.includes('timeout')
      )) {
        throw error;
      }
      
      // Otherwise, continue polling unless we're out of time
      if (Date.now() - pollStart >= maxPollTime - 10000) {
        throw new Error(`Failed to complete async scan: ${(error as Error).message}`);
      }
      
      // Wait a bit longer on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Polling timeout - try to cancel the job
  try {
    await ctx.runAction("asyncAccessibilityScanner:cancelJob", {
      jobId: jobSubmission.jobId
    });
  } catch (cancelError) {
    console.error(`Failed to cancel job ${jobSubmission.jobId}:`, cancelError);
  }

  throw new Error(`Async scan polling timed out after ${maxPollTime / 1000} seconds. The job may still be processing.`);
}

// Generate progress messages for async jobs
function getProgressMessage(status: string, progress?: number): string {
  switch (status) {
    case 'queued':
      return 'Job queued, waiting for available worker...';
    case 'running':
      if (!progress) return 'Starting accessibility analysis...';
      if (progress < 30) return 'Loading and analyzing page structure...';
      if (progress < 60) return 'Running WCAG compliance checks...';
      if (progress < 90) return 'Processing accessibility violations...';
      return 'Finalizing scan results...';
    default:
      return `Job status: ${status}`;
  }
}

// Note: The production AccessibilityScanner now handles all scanning logic
// These helper functions are maintained for compatibility if needed elsewhere