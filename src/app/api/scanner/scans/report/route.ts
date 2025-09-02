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
    const { userId, scanResult, scanType, jobId } = body;

    if (!userId || !scanResult) {
      return NextResponse.json(
        { success: false, error: "Missing userId or scanResult" },
        { status: 400 }
      );
    }

    // Validate scan result structure
    if (!scanResult.url || typeof scanResult.violationCount !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid scan result format" },
        { status: 400 }
      );
    }

    try {
      const convex = getConvexClient();

      // Store the scan result in Convex
      const scanId = await convex.mutation(api.scans.completeScan, {
        clerkUserId: userId,
        url: scanResult.url,
        scanType: scanType || "single_page",
        result: {
          violationCount: scanResult.violationCount,
          violations: scanResult.violations || [],
          timestamp: scanResult.timestamp || new Date().toISOString(),
          scanDuration: scanResult.scanDuration || 0,
          enginesUsed: scanResult.enginesUsed || ["axe"],
          // Include additional metadata from scanner
          tierInfo: scanResult.tierInfo || {},
          engineStatistics: scanResult.engineStatistics || {},
        },
        jobId: jobId,
        metadata: {
          reportedAt: new Date().toISOString(),
          scannerVersion: "v3",
          reportedBy: "scanner-service",
        },
      });

      return NextResponse.json({
        success: true,
        scanId: scanId,
      });

    } catch (convexError) {
      console.error("Convex error storing scan result:", convexError);
      return NextResponse.json(
        { success: false, error: "Failed to store scan result" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error reporting scan result:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}