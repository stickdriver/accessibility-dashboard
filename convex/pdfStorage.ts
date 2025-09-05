import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate an upload URL for PDF storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Generate and return an upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

// Store PDF reference in scan record
export const storePDFReference = mutation({
  args: {
    scanId: v.id("scans"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Update scan with PDF storage ID
    await ctx.db.patch(args.scanId, {
      pdfReportId: args.storageId,
      pdfGeneratedAt: Date.now(),
    });
    
    // Track PDF generation in analytics
    const scan = await ctx.db.get(args.scanId);
    if (scan) {
      await ctx.db.insert("analytics", {
        eventType: "pdf_generated",
        clerkUserId: scan.clerkUserId,
        metadata: { scanId: args.scanId, storageId: args.storageId },
        timestamp: Date.now(),
      });
    }
    
    return { success: true };
  },
});

// Get PDF download URL
export const getPDFUrl = query({
  args: {
    scanId: v.id("scans"),
  },
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    
    if (!scan || !scan.pdfReportId) {
      return null;
    }
    
    // Get the download URL for the stored PDF
    const url = await ctx.storage.getUrl(scan.pdfReportId);
    return url;
  },
});