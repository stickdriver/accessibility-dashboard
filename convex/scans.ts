import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { incrementUsage } from "./usage";
// Temporarily disabled auth
// import { getAuthUserId } from "@convex-dev/auth/server";

export const startScan = mutation({
  args: { 
    clerkUserId: v.string(),
    url: v.string(), 
    scanType: v.union(v.literal("single_page"), v.literal("full_site")),
    options: v.optional(v.any())
  },
  handler: async (ctx: any, { clerkUserId, url, scanType, options: _options = {} }: { clerkUserId: string, url: string, scanType: "single_page" | "full_site", options?: any }) => {

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

    // Schedule background scan processing
    await ctx.scheduler.runAfter(0, "scanProcessor:processScan", { scanId });

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
    scanId: v.id("scans"),
    results: v.any(),
    totalIssues: v.number(),
    criticalIssues: v.number(),
    accessibilityScore: v.number(),
    scanDuration: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.scanId, {
      status: "completed",
      progress: 100,
      results: args.results,
      totalIssues: args.totalIssues,
      criticalIssues: args.criticalIssues,
      accessibilityScore: args.accessibilityScore,
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
        score: args.accessibilityScore,
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