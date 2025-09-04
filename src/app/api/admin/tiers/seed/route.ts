import { NextRequest, NextResponse } from "next/server";

// Make direct HTTP calls to Convex
async function callConvexFunction(functionName: string, args: any = {}) {
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("CONVEX_URL environment variable is not set");
  }

  const response = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: functionName,
      args: args,
    }),
  });

  if (!response.ok) {
    throw new Error(`Convex function call failed: ${response.statusText}`);
  }

  return await response.json();
}

async function callConvexMutation(functionName: string, args: any = {}) {
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("CONVEX_URL environment variable is not set");
  }

  const response = await fetch(`${convexUrl}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: functionName,
      args: args,
    }),
  });

  if (!response.ok) {
    throw new Error(`Convex mutation call failed: ${response.statusText}`);
  }

  return await response.json();
}

// Initial tier configurations based on current Stripe metadata
const initialTierConfigs = [
  {
    tierName: "starter",
    scanLimit: 10,
    websites: 1,
    maxPages: 1,        // Single page only
    maxDepth: 0,        // No crawling
    concurrentScans: 1,
    features: ["basic_scanning"],
  },
  {
    tierName: "essential", 
    scanLimit: 150,
    websites: 5,
    maxPages: 10,       // Multi-page up to 10 pages
    maxDepth: 2,        // 2 levels deep
    concurrentScans: 3,
    features: ["basic_scanning", "multi_page_scanning", "advanced_reporting", "email_support", "basic_integration"],
  },
  {
    tierName: "professional",
    scanLimit: 500, 
    websites: 999,      // Unlimited websites
    maxPages: 50,       // Multi-page up to 50 pages  
    maxDepth: 3,        // 3 levels deep
    concurrentScans: 10,
    features: ["basic_scanning", "multi_page_scanning", "advanced_reporting", "api_access", "priority_support", "team_collaboration"],
  },
];

export async function POST(_request: NextRequest) {
  try {
    const result = await callConvexMutation("tierConfigs:bulkInsert", {
      configs: initialTierConfigs,
    });

    return NextResponse.json({
      success: true,
      message: "Tier configurations seeded successfully",
      result: result,
      configs: initialTierConfigs,
    });

  } catch (error) {
    console.error("Error seeding tier configurations:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to seed tier configurations",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const configs = await callConvexFunction("tierConfigs:getAllActive", {});

    return NextResponse.json({
      success: true,
      totalConfigs: configs.length,
      configs: configs,
    });

  } catch (error) {
    console.error("Error fetching tier configurations:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch tier configurations" 
      },
      { status: 500 }
    );
  }
}