import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

// Initialize ConvexHttpClient with fallback for build time
const getConvexClient = () => {
  let url = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  // Fallback to CONVEX_DEPLOYMENT if NEXT_PUBLIC_CONVEX_URL is not available
  if (!url && process.env.CONVEX_DEPLOYMENT) {
    url = `https://${process.env.CONVEX_DEPLOYMENT}.convex.cloud`;
    console.log("Using CONVEX_DEPLOYMENT fallback:", url);
  }
  
  console.log("Environment variables check:", {
    hasNextPublicConvexUrl: !!process.env.NEXT_PUBLIC_CONVEX_URL,
    hasConvexDeployment: !!process.env.CONVEX_DEPLOYMENT,
    constructedUrl: url,
    nodeEnv: process.env.NODE_ENV,
  });
  
  if (!url) {
    console.error("Neither NEXT_PUBLIC_CONVEX_URL nor CONVEX_DEPLOYMENT found. Available env vars:", Object.keys(process.env).filter(key => key.includes('CONVEX')));
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  }
  
  console.log("Using Convex URL:", url);
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

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("Failed to parse JSON body:", jsonError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { userId, scanResult, scanType, jobId } = body;

    if (!userId || !scanResult) {
      return NextResponse.json(
        { success: false, error: "Missing userId or scanResult" },
        { status: 400 }
      );
    }

    // Validate scan result structure
    if (!scanResult.url || typeof scanResult.violationCount !== "number") {
      console.error("Invalid scan result structure:", {
        hasUrl: !!scanResult.url,
        violationCountType: typeof scanResult.violationCount,
        violationCountValue: scanResult.violationCount
      });
      return NextResponse.json(
        { success: false, error: "Invalid scan result format" },
        { status: 400 }
      );
    }

    // Validate violations array structure
    if (scanResult.violations && !Array.isArray(scanResult.violations)) {
      console.error("Violations is not an array:", typeof scanResult.violations);
      return NextResponse.json(
        { success: false, error: "Invalid violations format - must be array" },
        { status: 400 }
      );
    }

    try {
      const convex = getConvexClient();

      // Log the incoming scan result for debugging
      console.log("Received scan result:", JSON.stringify(scanResult, null, 2));
      
      // Debug: Log violation impacts to understand severity mapping
      if (scanResult.violations && scanResult.violations.length > 0) {
        const impactCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        scanResult.violations.forEach((v: any) => {
          const impact = v.impact || 'unknown';
          const type = v.type || 'unknown';
          impactCounts[impact] = (impactCounts[impact] || 0) + 1;
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        console.log("🔍 Violation impact distribution:", impactCounts);
        console.log("🔍 Violation type distribution:", typeCounts);
      }

      // Parse scanDuration if it's a string (Go duration format) or convert from nanoseconds
      let scanDurationMs = 0;
      if (scanResult.scanDuration) {
        if (typeof scanResult.scanDuration === "string") {
          // Parse Go duration format (e.g., "29.133275152s")
          const match = scanResult.scanDuration.match(/^([\d.]+)([a-z]+)$/);
          if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2];
            if (unit === "s") {
              scanDurationMs = value * 1000;
            } else if (unit === "ms") {
              scanDurationMs = value;
            } else if (unit === "m") {
              scanDurationMs = value * 60 * 1000;
            }
          }
        } else if (typeof scanResult.scanDuration === "number") {
          // Scanner Service sends nanoseconds, convert to milliseconds
          scanDurationMs = scanResult.scanDuration / 1000000;
        }
      }

      // Process and clean violations data (remove problematic fields but keep all violations)
      const cleanedViolations = scanResult.violations ? 
        scanResult.violations.map((violation: any) => ({
          code: violation.code || "",
          type: violation.type || "error",
          impact: violation.impact || "moderate", // Use Scanner Service's new impact field
          message: violation.message || "", 
          selector: violation.selector || "",
          runner: violation.runner || "unknown",
          context: violation.context || "" // Include context for better UX
          // Remove detectedBy, engineSpecific which can contain circular references
        })) : [];
      
      // Log the data being sent to Convex for debugging
      const convexData = {
        clerkUserId: userId,
        url: scanResult.url,
        scanType: scanType || "single_page",
        result: {
          violationCount: scanResult.violationCount,
          violations: cleanedViolations,
          timestamp: scanResult.timestamp || new Date().toISOString(),
          scanDuration: scanDurationMs,
          enginesUsed: scanResult.enginesUsed || ["axe"],
          // Remove potentially problematic fields to test
          // violationsTruncated: scanResult.violations ? scanResult.violations.length > maxViolations : false,
          // originalViolationCount: scanResult.violations ? scanResult.violations.length : 0,
          // tierInfo: scanResult.tierInfo || {},
          // engineStatistics: scanResult.engineStatistics || {},
        },
        jobId: jobId,
        metadata: {
          reportedAt: new Date().toISOString(),
          scannerVersion: "v3",
          reportedBy: "scanner-service",
        },
      };
      
      console.log("Storing scan with:", {
        clerkUserId: userId,
        url: scanResult.url,
        violationCount: scanResult.violationCount,
        violationsLength: cleanedViolations.length,
        originalViolationsLength: scanResult.violations?.length || 0,
        scanDurationMs: scanDurationMs,
        jobId: jobId,
      });

      // Debug: Log the complete data being sent to Convex (truncated for safety)
      console.log("Complete Convex data structure:", JSON.stringify({
        ...convexData,
        result: {
          ...convexData.result,
          violations: convexData.result.violations.slice(0, 2) // Only log first 2 violations
        }
      }, null, 2));

      // Store the scan result in Convex
      let scanId;
      try {
        scanId = await convex.mutation(api.scans.completeScan, convexData);
        console.log("Successfully created new scan with ID:", scanId);
      } catch (convexMutationError) {
        console.error("Convex mutation failed:", convexMutationError);
        throw convexMutationError; // Re-throw to trigger the outer catch
      }

      // PDF generation feature has been removed

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