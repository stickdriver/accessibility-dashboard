import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

// Initialize ConvexHttpClient with fallback for build time
const getConvexClient = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  }
  return new ConvexHttpClient(url);
};

// Validate that this request is from the Scanner Service
function validateScannerAuth(request: NextRequest): boolean {
  const scannerApiKey = request.headers.get("X-Scanner-API-Key");
  const expectedKey = process.env.SCANNER_API_KEY;
  
  if (!expectedKey) {
    console.error("SCANNER_API_KEY environment variable not configured");
    return false;
  }
  
  return scannerApiKey === expectedKey;
}

export async function POST(request: NextRequest) {
  try {
    // Validate scanner authentication
    if (!validateScannerAuth(request)) {
      return NextResponse.json(
        { success: false, error: "Invalid scanner API key" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, scanType, pagesCount } = body;

    if (!userId || !scanType) {
      return NextResponse.json(
        { success: false, error: "Missing userId or scanType" },
        { status: 400 }
      );
    }

    const pages = pagesCount || 1;

    try {
      const convex = getConvexClient();

      // Update user usage in Convex
      const result = await convex.mutation(api.usage.updateUsage, {
        clerkUserId: userId,
        scanType: scanType,
        pagesScanned: pages,
        timestamp: new Date().toISOString(),
      });

      // Get remaining usage from the result
      const remaining = result?.remaining || 0;

      return NextResponse.json({
        success: true,
        remaining: remaining,
      });

    } catch (convexError) {
      console.error("Convex error updating usage:", convexError);
      return NextResponse.json(
        { success: false, error: "Failed to update usage" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error updating usage:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}