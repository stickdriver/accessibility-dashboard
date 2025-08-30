import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { incrementUsage } from "./usage";
import { getAuthUserId } from "@convex-dev/auth/server";

export const trackPdfDownload = mutation({
  args: { scanId: v.id("scans") },
  handler: async (ctx: any, { scanId }: { scanId: any }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify scan belongs to user
    const scan = await ctx.db.get(scanId);
    if (!scan || scan.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Track usage
    await incrementUsage(ctx, userId, "pdfDownloads", 1);

    // Track analytics
    await ctx.db.insert("analytics", {
      eventType: "pdf_downloaded",
      userId,
      metadata: { scanId },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});