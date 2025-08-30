import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { requireAuth } from "../../../lib/auth";
import { sendSuccess, sendError, handleAPIError } from "../../../lib/api-response";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const scans = await convex.query(api.scans.getUserScans, {
      clerkUserId: user.clerkUserId,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: scans
    });

  } catch (error) {
    console.error('Get scans error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scans" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    
    const { url, scanType = "full", options = {} } = body;
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const scanId = await convex.mutation(api.scans.createScan, {
      clerkUserId: user.clerkUserId,
      url,
      scanType,
      status: "pending",
      options,
    });

    // Track analytics
    await convex.mutation(api.analytics.trackEvent, {
      clerkUserId: user.clerkUserId,
      eventType: "scan_started",
      metadata: {
        scanId,
        scanType,
        url,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { scanId },
      message: "Scan created successfully"
    }, { status: 201 });

  } catch (error) {
    console.error('Create scan error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to create scan" },
      { status: 500 }
    );
  }
}