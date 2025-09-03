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

    // Define limits based on plan type
    const limits = {
      starter: { scansPerMonth: 10, pagesPerMonth: 100 },
      essential: { scansPerMonth: 150, pagesPerMonth: 1500 },
      professional: { scansPerMonth: 500, pagesPerMonth: 5000 }
    };

    const planLimits = limits[planType as keyof typeof limits] || limits.starter;

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
