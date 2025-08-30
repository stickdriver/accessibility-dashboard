import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

// Define our tier structure with Stripe product mapping
const TIER_CONFIG = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    priceId: null,
    productId: null,
    limits: {
      scansPerMonth: 10,
      pagesPerScan: 25,
    },
    features: [
      "Basic accessibility scanning",
      "PDF reports",
      "Email support"
    ]
  },
  // Add your actual Stripe product/price IDs here
  professional: {
    id: "professional",
    name: "Professional", 
    price: 2900, // $29.00 in cents
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    productId: process.env.STRIPE_PROFESSIONAL_PRODUCT_ID,
    limits: {
      scansPerMonth: 100,
      pagesPerScan: 100,
    },
    features: [
      "Advanced accessibility scanning",
      "API access",
      "Priority support",
      "Custom reports",
      "Bulk scanning"
    ]
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: null, // Custom pricing
    priceId: null,
    productId: process.env.STRIPE_ENTERPRISE_PRODUCT_ID,
    limits: {
      scansPerMonth: "unlimited",
      pagesPerScan: "unlimited",
    },
    features: [
      "Unlimited scans",
      "White-label reports", 
      "Dedicated support",
      "SSO integration",
      "Custom integrations",
      "SLA guarantees"
    ]
  }
};

export async function GET(request: NextRequest) {
  try {
    // Option 1: Return static configuration (fastest, always available)
    // This is recommended for production since it's reliable and fast
    const tiers = Object.values(TIER_CONFIG);

    return NextResponse.json({
      success: true,
      data: {
        tiers,
        currency: "usd"
      }
    });

    /* Option 2: Fetch live data from Stripe (uncomment if you prefer this approach)
    
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    const stripeBasedTiers = [
      TIER_CONFIG.free, // Always include free tier
      ...products.data
        .filter(product => product.metadata.tier) // Only products with tier metadata
        .map(product => {
          const defaultPrice = product.default_price as Stripe.Price;
          return {
            id: product.metadata.tier,
            name: product.name,
            price: defaultPrice?.unit_amount || null,
            priceId: defaultPrice?.id || null,
            productId: product.id,
            limits: {
              scansPerMonth: product.metadata.scansPerMonth === 'unlimited' 
                ? 'unlimited' 
                : parseInt(product.metadata.scansPerMonth) || 10,
              pagesPerScan: product.metadata.pagesPerScan === 'unlimited'
                ? 'unlimited'
                : parseInt(product.metadata.pagesPerScan) || 25,
            },
            features: product.metadata.features 
              ? product.metadata.features.split(',').map(f => f.trim())
              : []
          };
        })
        .sort((a, b) => {
          // Sort by price: free, then by ascending price
          if (a.price === 0) return -1;
          if (b.price === 0) return 1;
          if (a.price === null) return 1;
          if (b.price === null) return -1;
          return a.price - b.price;
        })
    ];

    return NextResponse.json({
      success: true,
      data: {
        tiers: stripeBasedTiers,
        currency: "usd"
      }
    });
    */

  } catch (error) {
    console.error('Get tiers error:', error);
    
    // Fallback to static config if Stripe fails
    return NextResponse.json({
      success: true,
      data: {
        tiers: Object.values(TIER_CONFIG),
        currency: "usd"
      }
    });
  }
}