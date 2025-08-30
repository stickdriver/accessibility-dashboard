import { v } from "convex/values";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Webhook endpoint to receive progress updates from scanner service
export const updateScanProgress = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const { progress, message, scanId, status, pagesScanned } = body;
    
    if (!scanId) {
      console.error("Missing scanId in progress update");
      return new Response("Missing scanId", { status: 400 });
    }

    // Validate progress value
    const validProgress = Math.max(0, Math.min(100, progress || 0));

    // Convert string scanId to Convex ID format
    const convexScanId = scanId as any; // Convex will handle the ID conversion
    
    // Update scan progress in database with all available data
    await ctx.runMutation(internal.scanProcessor.updateScanStatus, {
      scanId: convexScanId,
      progress: validProgress,
      message: message || `Progress: ${validProgress}%`,
      status: status || (validProgress >= 100 ? "completed" : "running"),
      pagesScanned: pagesScanned || undefined
    });

    console.log(`Progress update for ${scanId}: ${validProgress}% - ${message || 'No message'}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      updated: { progress: validProgress, message, scanId } 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Failed to update scan progress:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Failed to update progress" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});