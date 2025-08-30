import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Queue management for handling concurrent scans
export const addToQueue = internalMutation({
  args: { scanId: v.id("scans"), priority: v.optional(v.number()) },
  handler: async (ctx: any, { scanId, priority = 0 }: { scanId: any, priority?: number }) => {
    // Check if scan is already queued
    const existing = await ctx.db
      .query("analytics")
      .withIndex("by_event_type", (q: any) => q.eq("eventType", "scan_queued"))
      .filter((q: any) => q.eq(q.field("metadata.scanId"), scanId))
      .first();

    if (existing) return;

    // Add to queue
    await ctx.db.insert("analytics", {
      eventType: "scan_queued",
      metadata: { scanId, priority, queuedAt: Date.now() },
      timestamp: Date.now(),
    });
  },
});

export const getQueueStatus = query({
  handler: async (ctx: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get user's scans in queue
    const userScans = await ctx.db
      .query("scans")
      .withIndex("by_user_status", (q: any) => 
        q.eq("userId", userId).eq("status", "pending")
      )
      .collect();

    // Get queue position for each scan
    const queueInfo = await Promise.all(
      userScans.map(async (scan: any) => {
        const queueEntry = await ctx.db
          .query("analytics")
          .withIndex("by_event_type", (q: any) => q.eq("eventType", "scan_queued"))
          .filter((q: any) => q.eq(q.field("metadata.scanId"), scan._id))
          .first();

        if (!queueEntry) return null;

        // Count scans ahead in queue
        const ahead = await ctx.db
          .query("analytics")
          .withIndex("by_event_type", (q: any) => q.eq("eventType", "scan_queued"))
          .filter((q: any) => q.lt(q.field("timestamp"), queueEntry.timestamp))
          .collect();

        return {
          scanId: scan._id,
          position: ahead.length + 1,
          estimatedWait: Math.max(1, ahead.length * 2), // 2 minutes per scan
          queuedAt: queueEntry.timestamp,
        };
      })
    );

    return queueInfo.filter(Boolean);
  },
});

export const processNextInQueue = internalMutation({
  handler: async (ctx: any) => {
    // Get the next scan in queue
    const nextScan = await ctx.db
      .query("analytics")
      .withIndex("by_event_type", (q: any) => q.eq("eventType", "scan_queued"))
      .order("asc")
      .first();

    if (!nextScan) return null;

    const scanId = nextScan.metadata.scanId;
    
    // Verify scan still exists and is pending
    const scan = await ctx.db.get(scanId);
    if (!scan || scan.status !== "pending") {
      // Remove from queue
      await ctx.db.delete(nextScan._id);
      return null;
    }

    // Remove from queue
    await ctx.db.delete(nextScan._id);
    
    // Mark as processing
    await ctx.db.insert("analytics", {
      eventType: "scan_processing_started",
      metadata: { scanId, startedAt: Date.now() },
      timestamp: Date.now(),
    });

    return scanId;
  },
});

export const getSystemStatus = query({
  handler: async (ctx: any) => {
    // Get current queue length
    const queueLength = await ctx.db
      .query("analytics")
      .withIndex("by_event_type", (q: any) => q.eq("eventType", "scan_queued"))
      .collect();

    // Get currently running scans
    const runningScans = await ctx.db
      .query("scans")
      .withIndex("by_status", (q: any) => q.eq("status", "running"))
      .collect();

    // Get recently completed scans (last hour)
    const recentlyCompleted = await ctx.db
      .query("analytics")
      .withIndex("by_event_type", (q: any) => q.eq("eventType", "scan_completed"))
      .filter((q: any) => q.gt(q.field("timestamp"), Date.now() - 3600000))
      .collect();

    return {
      queueLength: queueLength.length,
      runningScans: runningScans.length,
      completedLastHour: recentlyCompleted.length,
      averageQueueWait: Math.max(1, queueLength.length * 2), // minutes
      systemHealth: runningScans.length < 5 ? "healthy" : "busy",
    };
  },
});

// Cleanup old queue entries
export const cleanupQueue = internalMutation({
  handler: async (ctx: any) => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    const oldEntries = await ctx.db
      .query("analytics")
      .withIndex("by_event_type", (q: any) => q.eq("eventType", "scan_queued"))
      .filter((q: any) => q.lt(q.field("timestamp"), cutoff))
      .collect();

    // Remove old queue entries
    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }

    return { cleaned: oldEntries.length };
  },
});