import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// Initialize ConvexHttpClient with fallback for build time
const getConvexClient = () => {
  let url = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  // Fallback to CONVEX_DEPLOYMENT if NEXT_PUBLIC_CONVEX_URL is not available
  if (!url && process.env.CONVEX_DEPLOYMENT) {
    url = `https://${process.env.CONVEX_DEPLOYMENT}.convex.cloud`;
  }
  
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  }
  return new ConvexHttpClient(url);
};

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from Clerk for plan information
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const planType = user.publicMetadata?.planType || 'starter';
    
    // Get usage from Convex
    const convex = getConvexClient();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usage = await convex.query(api.usage.getCurrentUsage, { 
      clerkUserId: userId,
      monthYear: currentMonth
    });

    // Get tier configuration from database instead of hardcoded values
    let tierConfig;
    try {
      tierConfig = await convex.query(api.tierConfigs.getByTierName, { 
        tierName: planType 
      });
    } catch (error) {
      console.error("Error fetching tier config:", error);
    }

    // Fallback to starter if no config found
    if (!tierConfig) {
      tierConfig = await convex.query(api.tierConfigs.getByTierName, { 
        tierName: 'starter' 
      });
    }

    // Build limits object from database tier configuration
    const planLimits = tierConfig ? {
      scansPerMonth: tierConfig.scanLimit,
      pagesPerMonth: tierConfig.scanLimit * tierConfig.maxPages, // Total pages = scans × pages per scan
      maxPages: tierConfig.maxPages, // Pages per individual scan
      websites: tierConfig.websites,
      maxDepth: tierConfig.maxDepth,
      concurrentScans: tierConfig.concurrentScans,
      features: tierConfig.features
    } : {
      // Ultimate fallback if database is unavailable
      scansPerMonth: 10,
      pagesPerMonth: 100,
      maxPages: 1,
      websites: 1,
      maxDepth: 0,
      concurrentScans: 1,
      features: ["basic_scanning"]
    };

    return NextResponse.json({
      success: true,
      data: {
        currentUsage: {
          scansPerformed: usage?.scansPerformed || 0,
          pagesScanned: usage?.pagesScanned || 0,
          pdfDownloads: usage?.pdfDownloads || 0
        },
        limits: planLimits,
        planType,
        billingPeriod: {
          start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
        }
      }
    });

  } catch (error) {
    console.error("Error fetching user usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" }, 
      { status: 500 }
    );
  }
}
