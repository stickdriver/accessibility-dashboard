import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { incrementUsage } from "./usage";
// Temporarily disabled auth
// import { getAuthUserId } from "@convex-dev/auth/server";

export const startScan = mutation({
  args: { 
    clerkUserId: v.string(),
    url: v.string(), 
    scanType: v.union(v.literal("single_page"), v.literal("multi_page")),
    options: v.optional(v.any())
  },
  handler: async (ctx: any, { clerkUserId, url, scanType, options: _options = {} }: { clerkUserId: string, url: string, scanType: "single_page" | "multi_page", options?: any }) => {

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error("Invalid URL format");
    }

    // Check usage limits (temporarily disabled for testing)
    // const usage = await getCurrentUsage(ctx, userId);
    // const limits = { scansPerformed: 1, pagesScanned: 5 };
    // 
    // if (usage.scansPerformed >= limits.scansPerformed) {
    //   throw new Error("Monthly scan limit reached. Upgrade to continue scanning.");
    // }

    // Create scan record
    const scanId = await ctx.db.insert("scans", {
      clerkUserId,
      websiteUrl: url,
      scanType,
      status: "pending",
      progress: 0,
      pagesScanned: 0,
      totalIssues: 0,
      criticalIssues: 0,
      seriousIssues: 0,
      moderateIssues: 0,
      minorIssues: 0,
      results: {},
    });

    // Update usage
    await incrementUsage(ctx, clerkUserId, "scansPerformed", 1);

    // Track analytics
    await ctx.db.insert("analytics", {
      eventType: "scan_started",
      clerkUserId,
      metadata: { url, scanType, scanId },
      timestamp: Date.now(),
    });

    // Scanner Service is now called directly from Dashboard Backend API
    // Background scan processing is handled there

    return scanId;
  },
});

export const getUserScans = query({
  args: { 
    clerkUserId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number())
  },
  handler: async (ctx: any, { clerkUserId, limit = 10, offset = 0 }: { clerkUserId: string, limit?: number, offset?: number }) => {
    const scans = await ctx.db
      .query("scans")
      .withIndex("by_user", (q: any) => q.eq("clerkUserId", clerkUserId))
      .order("desc")
      .take(limit + offset);

    // Apply offset to results
    const paginatedScans = scans.slice(offset);

    // For each scan, get associated pages to calculate severity stats
    const scansWithPages = await Promise.all(
      paginatedScans.map(async (scan: any) => {
        const pages = await ctx.db
          .query("scanPages")
          .withIndex("by_scan_order", (q: any) => q.eq("scanId", scan._id))
          .collect();
        
        return { ...scan, pages };
      })
    );

    return scansWithPages;
  },
});


export const getScanById = query({
  args: { 
    scanId: v.id("scans"),
    clerkUserId: v.string()
  },
  handler: async (ctx: any, { scanId, clerkUserId }: { scanId: any, clerkUserId: string }) => {
    const scan = await ctx.db.get(scanId);
    if (!scan || scan.clerkUserId !== clerkUserId) {
      return null;
    }

    // Get associated pages
    const pages = await ctx.db
      .query("scanPages")
      .withIndex("by_scan_order", (q: any) => q.eq("scanId", scanId))
      .collect();

    return { ...scan, pages };
  },
});

export const updateScanProgress = mutation({
  args: { 
    scanId: v.id("scans"), 
    progress: v.number(),
    status: v.optional(v.string()),
    pagesScanned: v.optional(v.number())
  },
  handler: async (ctx: any, { scanId, progress, status, pagesScanned }: { scanId: any, progress: number, status?: string, pagesScanned?: number }) => {
    const updateData: any = { progress };
    
    if (status) updateData.status = status;
    if (pagesScanned !== undefined) updateData.pagesScanned = pagesScanned;

    await ctx.db.patch(scanId, updateData);
  },
});

export const completeScan = mutation({
  args: {
    clerkUserId: v.string(),
    url: v.string(),
    scanType: v.union(v.literal("single_page"), v.literal("multi_page")),
    result: v.object({
      violationCount: v.number(),
      violations: v.optional(v.any()),
      timestamp: v.optional(v.string()),
      scanDuration: v.optional(v.number()),
      enginesUsed: v.optional(v.array(v.string())),
      tierInfo: v.optional(v.any()),
      engineStatistics: v.optional(v.any()),
    }),
    jobId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx: any, args: any) => {
    // Create scan record with completed status
    const scanId = await ctx.db.insert("scans", {
      clerkUserId: args.clerkUserId,
      websiteUrl: args.url,
      scanType: args.scanType,
      status: "completed",
      progress: 100,
      pagesScanned: 1, // Single page scan
      totalIssues: args.result.violationCount,
      criticalIssues: args.result.violations?.filter((v: any) => v.impact === "critical" || v.type === "error").length || 0,
      seriousIssues: args.result.violations?.filter((v: any) => v.impact === "serious" || (v.impact === "moderate" && v.type === "error")).length || 0,
      moderateIssues: args.result.violations?.filter((v: any) => v.impact === "moderate" && v.type !== "error").length || 0,
      minorIssues: args.result.violations?.filter((v: any) => v.impact === "minor" || v.type === "notice").length || 0,
      results: args.result,
      scanDuration: args.result.scanDuration || 0,
      completedAt: Date.now(),
      asyncJobId: args.jobId,
    });

    // Track completion analytics
    await ctx.db.insert("analytics", {
      eventType: "scan_completed",
      clerkUserId: args.clerkUserId,
      metadata: {
        scanId: scanId,
        url: args.url,
        scanType: args.scanType,
        totalIssues: args.result.violationCount,
        duration: args.result.scanDuration || 0,
        enginesUsed: args.result.enginesUsed,
        jobId: args.jobId,
      },
      timestamp: Date.now(),
    });

    return scanId;
  },
});

// Legacy completeScan method for backward compatibility
export const completeScanLegacy = mutation({
  args: {
    scanId: v.id("scans"),
    results: v.any(),
    totalIssues: v.number(),
    criticalIssues: v.number(),
    scanDuration: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.scanId, {
      status: "completed",
      progress: 100,
      results: args.results,
      totalIssues: args.totalIssues,
      criticalIssues: args.criticalIssues,
      scanDuration: args.scanDuration,
      completedAt: Date.now(),
    });

    // Track completion analytics
    await ctx.db.insert("analytics", {
      eventType: "scan_completed",
      metadata: {
        scanId: args.scanId,
        totalIssues: args.totalIssues,
        duration: args.scanDuration,
      },
      timestamp: Date.now(),
    });
  },
});

export const failScan = mutation({
  args: {
    scanId: v.id("scans"),
    errorMessage: v.string(),
  },
  handler: async (ctx: any, { scanId, errorMessage }: { scanId: any, errorMessage: string }) => {
    await ctx.db.patch(scanId, {
      status: "failed",
      errorMessage,
    });
  },
});

export const insertScanPage = mutation({
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