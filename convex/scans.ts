import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getCurrentUsage, incrementUsage } from "./usage";
// Temporarily disabled auth
// import { getAuthUserId } from "@convex-dev/auth/server";

export const startScan = mutation({
  args: { 
    url: v.string(), 
    scanType: v.union(v.literal("single_page"), v.literal("full_site"))
  },
  handler: async (ctx: any, { url, scanType }: { url: string, scanType: "single_page" | "full_site" }) => {
    // Temporarily use demo user ID
    const userId = "demo-user-123";

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
      userId,
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
    await incrementUsage(ctx, userId, "scansPerformed", 1);

    // Track analytics
    await ctx.db.insert("analytics", {
      eventType: "scan_started",
      userId,
      metadata: { url, scanType, scanId },
      timestamp: Date.now(),
    });

    // Schedule background scan processing
    await ctx.scheduler.runAfter(0, "scanProcessor:processScan", { scanId });

    return scanId;
  },
});

export const getUserScans = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx: any, { limit = 10 }: { limit?: number }) => {
    // Temporarily use demo user ID
    const userId = "demo-user-123";

    const scans = await ctx.db
      .query("scans")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    // For each scan, get associated pages to calculate severity stats
    const scansWithPages = await Promise.all(
      scans.map(async (scan: any) => {
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
  args: { scanId: v.id("scans") },
  handler: async (ctx: any, { scanId }: { scanId: any }) => {
    // Temporarily use demo user ID
    const userId = "demo-user-123";

    const scan = await ctx.db.get(scanId);
    if (!scan || scan.userId !== userId) {
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