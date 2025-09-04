import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Remove users table since Clerk handles user management
  // Keep only scan-related data and analytics
  
  scans: defineTable({
    clerkUserId: v.string(), // Use Clerk user ID instead of internal user ID
    websiteUrl: v.string(),
    scanType: v.union(v.literal("single_page"), v.literal("full_site")),
    status: v.union(
      v.literal("pending"), 
      v.literal("running"), 
      v.literal("completed"), 
      v.literal("failed")
    ),
    progress: v.number(), // 0-100 for real-time updates
    statusMessage: v.optional(v.string()), // Current status message for UI
    asyncJobId: v.optional(v.string()), // V3 Service job ID for progress tracking
    pagesScanned: v.number(),
    totalIssues: v.number(),
    criticalIssues: v.number(),
    results: v.any(), // JSON scan results
    errorMessage: v.optional(v.string()),
    scanDuration: v.optional(v.number()), // seconds
    completedAt: v.optional(v.number()),
  }).index("by_user", ["clerkUserId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["clerkUserId", "status"]),

  scanPages: defineTable({
    scanId: v.id("scans"),
    pageUrl: v.string(),
    pageTitle: v.optional(v.string()),
    issues: v.any(), // Array of accessibility issues
    wcagLevel: v.string(), // "A", "AA", "AAA"
    loadTime: v.optional(v.number()),
    scanOrder: v.number(), // Order in which page was scanned
  }).index("by_scan", ["scanId"])
    .index("by_scan_order", ["scanId", "scanOrder"]),

  usage: defineTable({
    clerkUserId: v.string(),
    monthYear: v.string(), // "YYYY-MM" format
    pagesScanned: v.number(),
    scansPerformed: v.number(),
    pdfDownloads: v.number(),
    lastResetDate: v.number(), // timestamp
  }).index("by_user_month", ["clerkUserId", "monthYear"]),

  supportTickets: defineTable({
    clerkUserId: v.string(),
    subject: v.string(),
    message: v.string(),
    status: v.union(
      v.literal("open"), 
      v.literal("in_progress"), 
      v.literal("resolved"),
      v.literal("closed")
    ),
    priority: v.union(
      v.literal("low"), 
      v.literal("medium"), 
      v.literal("high")
    ),
    adminResponse: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
  }).index("by_user", ["clerkUserId"])
    .index("by_status", ["status"]),

  analytics: defineTable({
    eventType: v.string(), // "scan_started", "pdf_downloaded", etc.
    clerkUserId: v.optional(v.string()),
    metadata: v.any(), // Event-specific data
    timestamp: v.number(),
    sessionId: v.optional(v.string()),
  }).index("by_event_type", ["eventType"])
    .index("by_user", ["clerkUserId"])
    .index("by_timestamp", ["timestamp"]),

  remediationGuides: defineTable({
    ruleCode: v.string(), // Pa11y rule code (e.g., "button-name", "color-contrast")
    title: v.string(), // Human-readable title for the rule
    guidance: v.string(), // Detailed remediation guidance
    category: v.optional(v.string()), // Optional category (e.g., "forms", "navigation", "images")
    wcagReference: v.optional(v.string()), // WCAG success criteria reference
    severity: v.optional(v.string()), // Expected severity level
    isActive: v.boolean(), // Allow disabling guidance
    lastUpdated: v.number(), // Timestamp for cache invalidation
  }).index("by_rule_code", ["ruleCode"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // Remove password reset and email verification tables since Clerk handles these
});