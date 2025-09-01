import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

    // Start scan in Convex
    const scanId = await convex.mutation(api.scans.startScan, {
      clerkUserId: userId,
      url: url.trim(),
      scanType,
      options
    });

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
