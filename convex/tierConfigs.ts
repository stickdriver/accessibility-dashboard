import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get tier configuration by tier name
export const getByTierName = query({
  args: { tierName: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("tierConfigs")
      .withIndex("by_tier", (q) => q.eq("tierName", args.tierName))
      .filter((q) => q.eq(q.field("isActive"), true))
      .unique();
    return config;
  },
});

// Get all active tier configurations
export const getAllActive = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db
      .query("tierConfigs")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return configs;
  },
});

// Create or update tier configuration
export const createOrUpdate = mutation({
  args: {
    tierName: v.string(),
    scanLimit: v.number(),
    websites: v.number(),
    maxPages: v.number(),
    maxDepth: v.number(),
    concurrentScans: v.number(),
    features: v.array(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tierConfigs")
      .withIndex("by_tier", (q) => q.eq("tierName", args.tierName))
      .unique();
    
    const data: any = {
      tierName: args.tierName,
      scanLimit: args.scanLimit,
      websites: args.websites,
      maxPages: args.maxPages,
      maxDepth: args.maxDepth,
      concurrentScans: args.concurrentScans,
      features: args.features,
      isActive: args.isActive ?? true,
      lastUpdated: Date.now(),
    };
    
    if (existing) {
      return await ctx.db.patch(existing._id, data);
    } else {
      return await ctx.db.insert("tierConfigs", data);
    }
  },
});

// Bulk insert initial tier configurations
export const bulkInsert = mutation({
  args: {
    configs: v.array(v.object({
      tierName: v.string(),
      scanLimit: v.number(),
      websites: v.number(),
      maxPages: v.number(),
      maxDepth: v.number(),
      concurrentScans: v.number(),
      features: v.array(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const results = [];
    const timestamp = Date.now();
    
    for (const config of args.configs) {
      const existing = await ctx.db
        .query("tierConfigs")
        .withIndex("by_tier", (q) => q.eq("tierName", config.tierName))
        .unique();
      
      if (!existing) {
        const data = {
          tierName: config.tierName,
          scanLimit: config.scanLimit,
          websites: config.websites,
          maxPages: config.maxPages,
          maxDepth: config.maxDepth,
          concurrentScans: config.concurrentScans,
          features: config.features,
          isActive: true,
          lastUpdated: timestamp,
        };
        
        const result = await ctx.db.insert("tierConfigs", data);
        results.push(result);
      }
    }
    
    return {
      inserted: results.length,
      skipped: args.configs.length - results.length,
    };
  },
});