import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create a new user profile when they sign up
export const createUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    subscriptionTier: v.optional(v.string()),
    signupSource: v.optional(v.string()),
  },
  handler: async (ctx: any, { clerkUserId, email, name, subscriptionTier, signupSource }) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (existingUser) {
      console.log(`User ${clerkUserId} already exists`);
      return { success: true, message: "User already exists", userId: existingUser._id };
    }

    // Create new user profile
    const userId = await ctx.db.insert("users", {
      clerkUserId,
      email,
      name: name || "",
      subscriptionTier: subscriptionTier || "starter",
      onboardingCompleted: false,
      preferences: {},
      signupSource,
      lastActiveAt: Date.now(),
      lifetimeScans: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log(`Created new user profile for ${clerkUserId}`);
    return { success: true, userId };
  },
});

// Update user profile when Clerk data changes
export const updateUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    subscriptionTier: v.optional(v.string()),
  },
  handler: async (ctx: any, { clerkUserId, email, name, subscriptionTier }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (!user) {
      console.log(`User ${clerkUserId} not found for update`);
      return { success: false, error: "User not found" };
    }

    // Update user data
    const updates: any = { updatedAt: Date.now() };
    if (email !== undefined) updates.email = email;
    if (name !== undefined) updates.name = name;
    if (subscriptionTier !== undefined) updates.subscriptionTier = subscriptionTier;

    await ctx.db.patch(user._id, updates);

    console.log(`Updated user profile for ${clerkUserId}`);
    return { success: true, userId: user._id };
  },
});

// Update user's last active timestamp
export const updateLastActive = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx: any, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await ctx.db.patch(user._id, {
      lastActiveAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Increment user's lifetime scan count
export const incrementLifetimeScans = mutation({
  args: {
    clerkUserId: v.string(),
    count: v.optional(v.number()),
  },
  handler: async (ctx: any, { clerkUserId, count = 1 }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await ctx.db.patch(user._id, {
      lifetimeScans: (user.lifetimeScans || 0) + count,
      lastActiveAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, newTotal: (user.lifetimeScans || 0) + count };
  },
});

// Update user preferences
export const updateUserPreferences = mutation({
  args: {
    clerkUserId: v.string(),
    preferences: v.any(),
  },
  handler: async (ctx: any, { clerkUserId, preferences }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await ctx.db.patch(user._id, {
      preferences: { ...user.preferences, ...preferences },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mark user onboarding as completed
export const completeOnboarding = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx: any, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get user profile by Clerk ID
export const getUserByClerkId = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx: any, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
      .first();

    return user;
  },
});

// Delete user and all associated data (GDPR compliance)
export const deleteUser = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx: any, { clerkUserId }) => {
    // Get user profile
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (!user) {
      console.log(`User ${clerkUserId} not found for deletion`);
      return { success: true, message: "User not found" };
    }

    // Delete user's scans
    const userScans = await ctx.db
      .query("scans")
      .withIndex("by_user", (q: any) => q.eq("clerkUserId", clerkUserId))
      .collect();

    for (const scan of userScans) {
      // Delete scan pages first
      const scanPages = await ctx.db
        .query("scanPages")
        .withIndex("by_scan", (q: any) => q.eq("scanId", scan._id))
        .collect();
      
      for (const page of scanPages) {
        await ctx.db.delete(page._id);
      }
      
      // Delete the scan
      await ctx.db.delete(scan._id);
    }

    // Delete user's usage records
    const userUsage = await ctx.db
      .query("usage")
      .filter((q: any) => q.eq(q.field("clerkUserId"), clerkUserId))
      .collect();

    for (const usage of userUsage) {
      await ctx.db.delete(usage._id);
    }

    // Delete user's support tickets
    const userTickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q: any) => q.eq("clerkUserId", clerkUserId))
      .collect();

    for (const ticket of userTickets) {
      await ctx.db.delete(ticket._id);
    }

    // Delete user's analytics events
    const userAnalytics = await ctx.db
      .query("analytics")
      .withIndex("by_user", (q: any) => q.eq("clerkUserId", clerkUserId))
      .collect();

    for (const event of userAnalytics) {
      await ctx.db.delete(event._id);
    }

    // Finally, delete the user profile
    await ctx.db.delete(user._id);

    console.log(`Deleted all data for user ${clerkUserId}`);
    return { 
      success: true, 
      deletedItems: {
        scans: userScans.length,
        usage: userUsage.length,
        tickets: userTickets.length,
        analytics: userAnalytics.length,
      }
    };
  },
});

// Get user statistics
export const getUserStats = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx: any, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (!user) {
      return null;
    }

    // Get scan count
    const scanCount = await ctx.db
      .query("scans")
      .withIndex("by_user", (q: any) => q.eq("clerkUserId", clerkUserId))
      .collect()
      .then((scans: any) => scans.length);

    // Get current month usage
    const currentMonth = new Date().toISOString().substring(0, 7);
    const currentUsage = await ctx.db
      .query("usage")
      .withIndex("by_user_month", (q: any) => 
        q.eq("clerkUserId", clerkUserId).eq("monthYear", currentMonth)
      )
      .first();

    return {
      profile: user,
      totalScans: scanCount,
      lifetimeScans: user.lifetimeScans || 0,
      currentMonthUsage: currentUsage || {
        pagesScanned: 0,
        scansPerformed: 0,
        pdfDownloads: 0,
      },
      memberSince: user.createdAt,
      lastActive: user.lastActiveAt,
    };
  },
});