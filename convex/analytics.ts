import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Log an analytics event
export const logEvent = mutation({
  args: {
    eventType: v.string(),
    clerkUserId: v.optional(v.string()),
    metadata: v.any(),
    timestamp: v.number(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx: any, { eventType, clerkUserId, metadata, timestamp, sessionId }) => {
    const eventId = await ctx.db.insert("analytics", {
      eventType,
      clerkUserId,
      metadata: metadata || {},
      timestamp,
      sessionId,
    });

    return { success: true, eventId };
  },
});

// Get analytics events for a user
export const getUserEvents = query({
  args: {
    clerkUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: any, { clerkUserId, limit = 50 }) => {
    return await ctx.db
      .query("analytics")
      .withIndex("by_user", (q: any) => q.eq("clerkUserId", clerkUserId))
      .order("desc")
      .take(limit);
  },
});

// Get analytics events by type
export const getEventsByType = query({
  args: {
    eventType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: any, { eventType, limit = 100 }) => {
    return await ctx.db
      .query("analytics")
      .withIndex("by_event_type", (q: any) => q.eq("eventType", eventType))
      .order("desc")
      .take(limit);
  },
});

// Insert analytics event (alias for logEvent)
export const insert = logEvent;