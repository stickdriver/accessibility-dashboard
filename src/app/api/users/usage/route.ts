import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { requireAuth } from "../../../../lib/auth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Helper function to get tier limits
function getTierLimits(planType: string) {
  switch (planType) {
    case 'professional':
    case 'pro':
      return {
        scansPerMonth: 100,
        pagesPerScan: 100,
      };
    case 'enterprise':
      return {
        scansPerMonth: 'unlimited' as const,
        pagesPerScan: 'unlimited' as const,
      };
    case 'free':
    default:
      return {
        scansPerMonth: 10,
        pagesPerScan: 25,
      };
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    // Get current month usage
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    
    const usage = await convex.query(api.usage.getUserUsage, {
      clerkUserId: user.clerkUserId,
      monthYear: currentMonth,
    });

    // Get plan info and limits from Clerk metadata
    const planType = user.metadata?.plan_type || 'free';
    const scanLimit = user.metadata?.scan_limit || getTierLimits(planType).scansPerMonth;
    const pagesPerScanLimit = getTierLimits(planType).pagesPerScan;

    // Build subscription info
    const subscription = {
      tier: planType,
      status: user.metadata?.subscriptionStatus || (planType === 'free' ? 'active' : 'unknown'),
      stripeCustomerId: user.metadata?.stripeCustomerId || null,
      stripeSubscriptionId: user.metadata?.stripeSubscriptionId || null,
      currentPeriodEnd: null as string | null,
    };

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        usage: {
          scansThisMonth: usage?.current?.scansPerformed || 0,
          pagesScanned: usage?.current?.pagesScanned || 0,
          pdfDownloads: usage?.current?.pdfDownloads || 0,
          scansRemaining: scanLimit === 'unlimited' ? 'unlimited' : Math.max(0, (scanLimit as number) - (usage?.current?.scansPerformed || 0)),
          resetDate: new Date(currentMonth + '-' + new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).toISOString(),
        },
        limits: {
          scansPerMonth: scanLimit,
          pagesPerScan: pagesPerScanLimit,
        },
        billingPeriod: {
          start: new Date(currentMonth + '-01').toISOString(),
          end: new Date(currentMonth + '-' + new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).toISOString(),
        }
      }
    });

  } catch (error) {
    console.error('Get usage error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}