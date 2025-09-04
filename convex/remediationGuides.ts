import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get remediation guidance by rule code
export const getByRuleCode = query({
  args: { ruleCode: v.string() },
  handler: async (ctx, args) => {
    const guide = await ctx.db
      .query("remediationGuides")
      .withIndex("by_rule_code", (q) => q.eq("ruleCode", args.ruleCode))
      .filter((q) => q.eq(q.field("isActive"), true))
      .unique();
    return guide;
  },
});

// Query to get all active guides
export const getAllActive = query({
  args: {},
  handler: async (ctx) => {
    const guides = await ctx.db
      .query("remediationGuides")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return guides;
  },
});

// Mutation to create or update a remediation guide
export const createOrUpdate = mutation({
  args: {
    ruleCode: v.string(),
    title: v.string(),
    guidance: v.string(),
    category: v.optional(v.string()),
    wcagReference: v.optional(v.string()),
    severity: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("remediationGuides")
      .withIndex("by_rule_code", (q) => q.eq("ruleCode", args.ruleCode))
      .unique();
    
    const data = {
      ruleCode: args.ruleCode,
      title: args.title,
      guidance: args.guidance,
      category: args.category,
      wcagReference: args.wcagReference,
      severity: args.severity,
      isActive: args.isActive ?? true,
      lastUpdated: Date.now(),
    };
    
    if (existing) {
      return await ctx.db.patch(existing._id, data);
    } else {
      return await ctx.db.insert("remediationGuides", data);
    }
  },
});

// Mutation to bulk insert guides (for seeding)
export const bulkInsert = mutation({
  args: {
    guides: v.array(v.object({
      ruleCode: v.string(),
      title: v.string(),
      guidance: v.string(),
      category: v.optional(v.string()),
      wcagReference: v.optional(v.string()),
      severity: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const results = [];
    const timestamp = Date.now();
    
    for (const guide of args.guides) {
      const existing = await ctx.db
        .query("remediationGuides")
        .withIndex("by_rule_code", (q) => q.eq("ruleCode", guide.ruleCode))
        .unique();
      
      if (!existing) {
        const result = await ctx.db.insert("remediationGuides", {
          ...guide,
          isActive: true,
          lastUpdated: timestamp,
        });
        results.push(result);
      }
    }
    
    return {
      inserted: results.length,
      skipped: args.guides.length - results.length,
    };
  },
});