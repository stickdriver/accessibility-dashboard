import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

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

// Get tier configuration based on tier name
function getTierConfig(tierName: string) {
  const tiers: Record<string, any> = {
    starter: {
      maxPages: 1,
      concurrentScans: 1,
      features: ["basic_scanning"],
      scansPerMonth: 10,
    },
    essential: {
      maxPages: 25,
      concurrentScans: 5,
      features: ["basic_scanning", "full_site_scanning", "advanced_reporting"],
      scansPerMonth: 100,
    },
    professional: {
      maxPages: 100,
      concurrentScans: 10,
      features: ["basic_scanning", "full_site_scanning", "advanced_reporting", "api_access", "custom_runners"],
      scansPerMonth: 500,
    },
  };

  return tiers[tierName] || tiers.starter;
}

export async function POST(request: NextRequest) {
  try {
    // Validate scanner authentication
    if (!validateScannerAuth(request)) {
      return NextResponse.json(
        { valid: false, error: "Invalid scanner API key" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, tier } = body;

    if (!userId || !tier) {
      return NextResponse.json(
        { valid: false, error: "Missing userId or tier" },
        { status: 400 }
      );
    }

    try {
      // Get user from Clerk
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      
      if (!user) {
        return NextResponse.json(
          { valid: false, error: "User not found" },
          { status: 404 }
        );
      }

      // Get subscription info from user metadata
      const metadata = user.publicMetadata as Record<string, any> || {};
      const subscriptionTier = metadata.subscriptionTier || "starter";
      const subscriptionStatus = metadata.subscriptionStatus || "active";
      const subscriptionId = metadata.stripeSubscriptionId;

      // Check if subscription is active
      if (subscriptionStatus !== "active") {
        return NextResponse.json(
          { valid: false, error: "Subscription not active" },
          { status: 403 }
        );
      }

      // Validate requested tier against user's actual tier
      const tierHierarchy: Record<string, number> = {
        starter: 1,
        essential: 2,
        professional: 3,
      };

      const userTierLevel = tierHierarchy[subscriptionTier as keyof typeof tierHierarchy] || 1;
      const requestedTierLevel = tierHierarchy[tier as keyof typeof tierHierarchy] || 1;

      if (requestedTierLevel > userTierLevel) {
        return NextResponse.json(
          { 
            valid: false, 
            error: `Tier ${tier} not available for subscription ${subscriptionTier}` 
          },
          { status: 403 }
        );
      }

      // Get tier configuration
      const tierConfig = getTierConfig(subscriptionTier as string);

      // TODO: Get actual usage from database/usage tracking
      // For now, return placeholder usage remaining
      const usageRemaining = Math.max(0, tierConfig.scansPerMonth - 0); // Replace 0 with actual usage

      return NextResponse.json({
        valid: true,
        tier: subscriptionTier,
        subscriptionId: subscriptionId,
        maxPages: tierConfig.maxPages,
        concurrentScans: tierConfig.concurrentScans,
        features: tierConfig.features,
        usageRemaining: usageRemaining,
      });

    } catch (clerkError) {
      console.error("Clerk API error:", clerkError);
      return NextResponse.json(
        { valid: false, error: "Failed to validate user subscription" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error validating tier:", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}