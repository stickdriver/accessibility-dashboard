import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

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

// URL reachability validation with graceful degradation
async function validateURLReachability(url: string): Promise<void> {
  try {
    // Step 1: Try HEAD request (lightweight)
    const headResponse = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
      headers: {
        'User-Agent': 'AccessAudit-Scanner/3.0 (+https://auditable.dev)',
      },
    });
    
    if (headResponse.ok) {
      return; // URL is reachable
    }
  } catch (headError) {
    // Step 2: HEAD failed, try GET with minimal data
    try {
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(8000), // 8 second timeout for GET
        headers: {
          'User-Agent': 'AccessAudit-Scanner/3.0 (+https://auditable.dev)',
          'Range': 'bytes=0-1023', // Request only first 1KB
        },
      });
      
      if (getResponse.ok || getResponse.status === 206) {
        return; // URL is reachable
      }
    } catch (getError) {
      // Both HEAD and GET failed - log for debugging but don't block the scan
      console.log(`URL validation failed for ${url}:`, getError);
      // Graceful degradation: let Pa11y handle it
    }
  }
  
  // Don't throw errors - let the scan proceed and Pa11y will handle unreachable URLs
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Get user's scans from Convex
    const convex = getConvexClient();
    const scans = await convex.query(api.scans.getUserScans, { 
      clerkUserId: userId, 
      limit,
      offset 
    });

    return NextResponse.json({
      success: true,
      data: scans
    });

  } catch (error) {
    console.error("Error fetching scans:", error);
    return NextResponse.json(
      { error: "Failed to fetch scans" }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url, scanType = "single_page", options = {} } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Quick URL reachability check (graceful degradation - no user-facing errors)
    await validateURLReachability(url.trim());

    // Get the user's JWT token from the Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing JWT token" }, { status: 401 });
    }

    const userJwtToken = authHeader.replace("Bearer ", "");

    // Start scan in Convex (create scan record)
    const convex = getConvexClient();
    const scanId = await convex.mutation(api.scans.startScan, {
      clerkUserId: userId,
      url: url.trim(),
      scanType,
      options
    });

    // Call Scanner Service directly with user's JWT token
    const scannerServiceUrl = process.env.SCANNER_SERVICE_URL || "https://accessibility-service-pa11y.fly.dev";
    const scannerApiKey = process.env.SCANNER_API_KEY;
    
    if (!scannerApiKey) {
      console.error("SCANNER_API_KEY not configured");
      return NextResponse.json({ error: "Scanner service not configured" }, { status: 500 });
    }

    try {
      // Use the async endpoint for better reliability
      const scannerResponse = await fetch(`${scannerServiceUrl}/api/v2/async/scan/single`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userJwtToken}`,
          "X-Scanner-API-Key": scannerApiKey,
        },
        body: JSON.stringify({
          url: url.trim(),
          customerTier: "starter", // Default for now (correct tier name)
          subscriptionId: "", // Optional for starter tier
          scanId: scanId, // Pass the scanId so Scanner Service can update the correct record
          options: {
            ...options,
          },
        }),
      });

      if (!scannerResponse.ok) {
        const errorText = await scannerResponse.text();
        console.error("Scanner service error:", scannerResponse.status, errorText);
        // Don't fail the request, scan record is still created
      }
    } catch (scannerError) {
      console.error("Failed to call scanner service:", scannerError);
      // Don't fail the request, scan record is still created
    }

    return NextResponse.json({
      success: true,
      data: { scanId }
    });

  } catch (error) {
    console.error("Error creating scan:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create scan" }, 
      { status: 500 }
    );
  }
}
