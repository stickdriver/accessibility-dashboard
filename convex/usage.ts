import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
// Temporarily disabled auth
// import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUsage = query({
  args: { 
    clerkUserId: v.string(),
    monthYear: v.string()
  },
  handler: async (ctx: any, { clerkUserId, monthYear }: { clerkUserId: string, monthYear: string }) => {
    const usage = await ctx.db
      .query("usage")
      .withIndex("by_user_month", (q: any) => 
        q.eq("clerkUserId", clerkUserId).eq("monthYear", monthYear)
      )
      .first();

    return usage || {
      clerkUserId,
      monthYear,
      pagesScanned: 0,
      scansPerformed: 0,
      pdfDownloads: 0,
      lastResetDate: Date.now(),
    };
  }
});

export const getCurrentUsageInternal = async (ctx: any, clerkUserId: string) => {
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  
  const usage = await ctx.db
    .query("usage")
    .withIndex("by_user_month", (q: any) => 
      q.eq("clerkUserId", clerkUserId).eq("monthYear", currentMonth)
    )
    .first();

  return usage || {
    clerkUserId,
    monthYear: currentMonth,
    pagesScanned: 0,
    scansPerformed: 0,
    pdfDownloads: 0,
    lastResetDate: Date.now(),
  };
};

export const incrementUsage = async (
  ctx: any, 
  clerkUserId: string, 
  field: "pagesScanned" | "scansPerformed" | "pdfDownloads", 
  amount: number = 1
) => {
  const currentMonth = new Date().toISOString().substring(0, 7);
  
  const existing = await ctx.db
    .query("usage")
    .withIndex("by_user_month", (q: any) => 
      q.eq("clerkUserId", clerkUserId).eq("monthYear", currentMonth)
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      [field]: existing[field] + amount,
    });
  } else {
    await ctx.db.insert("usage", {
      clerkUserId,
      monthYear: currentMonth,
      pagesScanned: field === "pagesScanned" ? amount : 0,
      scansPerformed: field === "scansPerformed" ? amount : 0,
      pdfDownloads: field === "pdfDownloads" ? amount : 0,
      lastResetDate: Date.now(),
    });
  }
};

// Update usage from Scanner Service
export const updateUsage = mutation({
  args: {
    clerkUserId: v.string(),
    scanType: v.string(),
    pagesScanned: v.number(),
    timestamp: v.optional(v.string()),
  },
  handler: async (ctx: any, { clerkUserId, pagesScanned }: {
    clerkUserId: string,
    scanType: string,
    pagesScanned: number,
    timestamp?: string
  }) => {
    // Update scans performed
    await incrementUsage(ctx, clerkUserId, "scansPerformed", 1);
    
    // Update pages scanned
    await incrementUsage(ctx, clerkUserId, "pagesScanned", pagesScanned);
    
    // Get current usage to return remaining count
    const usage = await getCurrentUsageInternal(ctx, clerkUserId);
    
    // TODO: Get actual limits from user subscription
    // For now, using static limits based on tier
    const limits = {
      pagesScanned: 1000,
      scansPerformed: 100,
    };
    
    return {
      remaining: Math.max(0, limits.scansPerformed - usage.scansPerformed),
    };
  },
});

export const getUserUsage = query({
  handler: async (ctx: any) => {
    // Temporarily use demo user ID
    const userId = "demo-user-123";

    const usage = await getCurrentUsageInternal(ctx, userId);
    
    // Define limits based on plan (temporarily unlimited for testing)
    const limits = {
      pagesScanned: 999999,
      scansPerformed: 999999,
      pdfDownloads: 999999,
    };

    return {
      current: usage,
      limits,
      remainingScans: Math.max(0, limits.scansPerformed - usage.scansPerformed),
      remainingPages: Math.max(0, limits.pagesScanned - usage.pagesScanned),
      canScan: usage.scansPerformed < limits.scansPerformed,
      canScanPages: usage.pagesScanned < limits.pagesScanned,
    };
  },
});

// Create initial usage record for new user
export const createUserUsageRecord = mutation({
  args: {
    clerkUserId: v.string(),
    planType: v.optional(v.string())
  },
  handler: async (ctx: any, { clerkUserId, planType = "starter" }) => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    // Check if usage record already exists
    const existingUsage = await ctx.db
      .query("usage")
      .withIndex("by_user_month", (q: any) => 
        q.eq("clerkUserId", clerkUserId).eq("monthYear", currentMonth)
      )
      .first();
    
    if (!existingUsage) {
      // Create initial usage record for new user
      const newUsageRecord = await ctx.db.insert("usage", {
        clerkUserId,
        monthYear: currentMonth,
        pagesScanned: 0,
        scansPerformed: 0,
        pdfDownloads: 0,
        lastResetDate: Date.now(),
      });
      
      console.log(`Created usage record for user ${clerkUserId}:`, newUsageRecord);
      return { success: true, usageId: newUsageRecord };
    }
    
    return { success: true, message: "Usage record already exists" };
  }
});