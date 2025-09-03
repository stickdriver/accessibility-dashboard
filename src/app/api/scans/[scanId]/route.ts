import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scanId } = params;

    if (!scanId) {
      return NextResponse.json({ error: "Scan ID is required" }, { status: 400 });
    }

    // Get scan from Convex
    const convex = getConvexClient();
    const scan = await convex.query(api.scans.getScanById, { 
      scanId: scanId as any,
      clerkUserId: userId
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: scan
    });

  } catch (error) {
    console.error("Error fetching scan:", error);
    return NextResponse.json(
      { error: "Failed to fetch scan" }, 
      { status: 500 }
    );
  }
}