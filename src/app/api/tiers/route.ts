import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe client only when needed and with proper fallback
const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-12-18.acacia",
  });
};

export async function GET(_request: Request) {
  try {
    // Fetch live pricing from Stripe (if configured)
    let stripePricing: { [key: string]: { price: number | null } } = {
      starter: { price: 0 }, // Always free
      essential: { price: null },
      professional: { price: null }
    };

    try {
      const stripe = getStripeClient();
      if (stripe && 
          process.env.STRIPE_PRICE_ID_ESSENTIAL && 
          process.env.STRIPE_PRICE_ID_PROFESSIONAL) {
        
        // Fetch pricing for paid tiers
        const [essentialPrice, professionalPrice] = await Promise.all([
          stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_ESSENTIAL),
          stripe.prices.retrieve(process.env.STRIPE_PRICE_ID_PROFESSIONAL)
        ]);

        if (stripePricing.essential) {
          stripePricing.essential.price = essentialPrice.unit_amount ? essentialPrice.unit_amount / 100 : null;
        }
        if (stripePricing.professional) {
          stripePricing.professional.price = professionalPrice.unit_amount ? professionalPrice.unit_amount / 100 : null;
        }
      }
    } catch (stripeError) {
      console.warn("Failed to fetch Stripe pricing, using fallback:", stripeError);
      // Use fallback pricing if Stripe fails
      if (stripePricing.essential) {
        stripePricing.essential.price = 29;
      }
      if (stripePricing.professional) {
        stripePricing.professional.price = 99;
      }
    }

    // Define tier structure based on Stripe products
    const tiers = {
      starter: {
        id: "starter",
        name: "Starter Accessibility Scan",
        shortName: "Starter", 
        price: 0, // Always free (Starter tier)
        scanLimit: 10,
        scanLimitPeriod: "month",
        websites: 1,
        features: [
          "10 pages scanned per month",
          "1 website scan",
          "WCAG 2.1 Level A & AA detection", 
          "PDF export",
          "Basic history",
          "Email support"
        ],
        popular: false,
        stripeProductId: process.env.STRIPE_PRODUCT_ID_STARTER || null,
        stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || null
      },
      essential: {
        id: "essential", 
        name: "Essential Accessibility Compliance",
        shortName: "Essential",
        price: stripePricing.essential?.price || 29, // From Stripe or fallback
        scanLimit: 150,
        scanLimitPeriod: "month",
        websites: 5,
        features: [
          "150 pages scanned per month",
          "5 websites",
          "WCAG 2.1 Level A & AA detection",
          "PDF export", 
          "Email support",
          "Basic integration",
          "Enhanced reporting"
        ],
        popular: true,
        stripeProductId: process.env.STRIPE_PRODUCT_ID_ESSENTIAL || null,
        stripePriceId: process.env.STRIPE_PRICE_ID_ESSENTIAL || null
      },
      professional: {
        id: "professional",
        name: "Professional Accessibility Suite", 
        shortName: "Professional",
        price: stripePricing.professional?.price || 99, // From Stripe or fallback
        scanLimit: 500,
        scanLimitPeriod: "month", 
        websites: 999,
        features: [
          "500 pages scanned per month",
          "Unlimited websites",
          "WCAG 2.1 Level A & AA detection",
          "PDF export",
          "Priority support",
          "Team collaboration", 
          "Advanced analytics",
          "API access"
        ],
        popular: false,
        stripeProductId: process.env.STRIPE_PRODUCT_ID_PROFESSIONAL || null,
        stripePriceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL || null
      }
    };

    // TODO: In production, fetch actual pricing from Stripe API
    // For now, return static configuration with placeholders for Stripe prices
    
    const response = NextResponse.json({
      success: true,
      tiers,
      metadata: {
        currency: "usd",
        billingPeriod: "month",
        lastUpdated: new Date().toISOString(),
        source: process.env.STRIPE_SECRET_KEY ? "stripe_api_with_fallback" : "static_config"
      }
    });

    // Add CORS headers to allow frontend access
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (error) {
    console.error("Error fetching tiers:", error);
    
    // Enhanced fallback response for production
    const response = NextResponse.json({
      success: true,
      fallback: true,
      tiers: {
        starter: {
          id: "starter",
          name: "Starter Accessibility Scan", 
          shortName: "Starter",
          price: 0,
          scanLimit: 10,
          scanLimitPeriod: "month",
          websites: 1,
          features: ["10 pages scanned per month", "Basic WCAG scanning", "PDF export"],
          popular: false,
          stripeProductId: null,
          stripePriceId: null
        },
        essential: {
          id: "essential",
          name: "Essential Accessibility Compliance", 
          shortName: "Essential",
          price: 49,
          scanLimit: 150,
          scanLimitPeriod: "month",
          websites: 5,
          features: ["150 pages scanned per month", "Email support", "Basic integration"],
          popular: true,
          stripeProductId: null,
          stripePriceId: null
        },
        professional: {
          id: "professional",
          name: "Professional Accessibility Suite", 
          shortName: "Professional",
          price: 149,
          scanLimit: 500,
          scanLimitPeriod: "month",
          websites: 999,
          features: ["500 pages scanned per month", "Priority support", "Team collaboration"],
          popular: false,
          stripeProductId: null,
          stripePriceId: null
        }
      },
      metadata: {
        currency: "usd",
        billingPeriod: "month",
        lastUpdated: new Date().toISOString(),
        source: "fallback_error"
      }
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  
  return response;
}
