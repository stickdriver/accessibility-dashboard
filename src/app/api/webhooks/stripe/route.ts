import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { createClerkClient } from "@clerk/backend";
import { api } from "../../../../../convex/_generated/api";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Missing stripe signature or webhook secret" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    // Verify webhook signature
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    console.log(`Stripe webhook received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (!customer || customer.deleted) {
      console.error("Customer not found for subscription:", subscription.id);
      return;
    }

    const clerkUserId = customer.metadata?.clerkUserId;
    if (!clerkUserId) {
      console.error("No clerkUserId in customer metadata:", customer.id);
      return;
    }

    // Determine tier from subscription
    const tier = await getTierFromSubscription(subscription);

    // Update user metadata in Clerk
    await clerkClient.users.updateUser(clerkUserId, {
      publicMetadata: {
        plan_type: tier,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      }
    });

    // Track subscription creation
    await convex.mutation(api.analytics.trackEvent, {
      clerkUserId,
      eventType: "subscription_created",
      metadata: {
        tier,
        customerId: customer.id,
        subscriptionId: subscription.id,
        status: subscription.status,
        createdAt: new Date(subscription.created * 1000).toISOString(),
      },
    });

    console.log(`Subscription created for user ${clerkUserId}, tier: ${tier}`);
  } catch (error) {
    console.error("Error handling subscription created:", error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (!customer || customer.deleted) {
      console.error("Customer not found for subscription:", subscription.id);
      return;
    }

    const clerkUserId = customer.metadata?.clerkUserId;
    if (!clerkUserId) {
      console.error("No clerkUserId in customer metadata:", customer.id);
      return;
    }

    // Determine tier from subscription
    const tier = await getTierFromSubscription(subscription);

    // Update user metadata in Clerk
    await clerkClient.users.updateUser(clerkUserId, {
      publicMetadata: {
        plan_type: tier,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      }
    });

    // Track subscription update
    await convex.mutation(api.analytics.trackEvent, {
      clerkUserId,
      eventType: "subscription_updated",
      metadata: {
        tier,
        customerId: customer.id,
        subscriptionId: subscription.id,
        status: subscription.status,
        updatedAt: new Date().toISOString(),
      },
    });

    console.log(`Subscription updated for user ${clerkUserId}, tier: ${tier}, status: ${subscription.status}`);
  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (!customer || customer.deleted) {
      console.error("Customer not found for subscription:", subscription.id);
      return;
    }

    const clerkUserId = customer.metadata?.clerkUserId;
    if (!clerkUserId) {
      console.error("No clerkUserId in customer metadata:", customer.id);
      return;
    }

    // Downgrade to free tier
    await clerkClient.users.updateUser(clerkUserId, {
      publicMetadata: {
        plan_type: "free",
        stripeCustomerId: customer.id,
        stripeSubscriptionId: null,
        subscriptionStatus: "canceled",
      }
    });

    // Track subscription cancellation
    await convex.mutation(api.analytics.trackEvent, {
      clerkUserId,
      eventType: "subscription_canceled",
      metadata: {
        tier: "free", // Downgraded to free
        customerId: customer.id,
        subscriptionId: subscription.id,
        canceledAt: new Date().toISOString(),
      },
    });

    console.log(`Subscription canceled for user ${clerkUserId}, downgraded to free`);
  } catch (error) {
    console.error("Error handling subscription deleted:", error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (!invoice.customer || !invoice.subscription) {
      return; // Not a subscription payment
    }

    const customer = await stripe.customers.retrieve(invoice.customer as string);
    
    if (!customer || customer.deleted) {
      console.error("Customer not found for invoice:", invoice.id);
      return;
    }

    const clerkUserId = customer.metadata?.clerkUserId;
    if (!clerkUserId) {
      console.error("No clerkUserId in customer metadata:", customer.id);
      return;
    }

    // Track successful payment
    await convex.mutation(api.analytics.trackEvent, {
      clerkUserId,
      eventType: "payment_succeeded",
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription as string,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000).toISOString(),
      },
    });

    console.log(`Payment succeeded for user ${clerkUserId}, amount: ${invoice.amount_paid} ${invoice.currency}`);
  } catch (error) {
    console.error("Error handling payment succeeded:", error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (!invoice.customer || !invoice.subscription) {
      return; // Not a subscription payment
    }

    const customer = await stripe.customers.retrieve(invoice.customer as string);
    
    if (!customer || customer.deleted) {
      console.error("Customer not found for invoice:", invoice.id);
      return;
    }

    const clerkUserId = customer.metadata?.clerkUserId;
    if (!clerkUserId) {
      console.error("No clerkUserId in customer metadata:", customer.id);
      return;
    }

    // Track payment failure
    await convex.mutation(api.analytics.trackEvent, {
      clerkUserId,
      eventType: "payment_failed",
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription as string,
        amount: invoice.amount_due,
        currency: invoice.currency,
        failedAt: new Date().toISOString(),
      },
    });

    console.log(`Payment failed for user ${clerkUserId}, amount: ${invoice.amount_due} ${invoice.currency}`);
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
}

async function getTierFromSubscription(subscription: Stripe.Subscription): Promise<string> {
  try {
    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id;
    
    if (!priceId) {
      return "free"; // Fallback
    }

    // Map price IDs to tiers
    if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
      return "professional";
    } else if (priceId.includes("enterprise")) { // Flexible matching for enterprise
      return "enterprise";
    }

    // Fallback: check product metadata
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product as string);
    
    return product.metadata?.tier || "professional"; // Default to professional if unclear
  } catch (error) {
    console.error("Error determining tier from subscription:", error);
    return "professional"; // Safe fallback
  }
}