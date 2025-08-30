import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Get the headers
    const headerPayload = request.headers;
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: "Missing svix headers" },
        { status: 400 }
      );
    }

    // Get the body
    const payload = await request.json();
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // Handle the webhook
    const eventType = evt.type;
    console.log(`Clerk webhook received: ${eventType}`);

    switch (eventType) {
      case "user.created":
        // Track new user signup
        await convex.mutation(api.analytics.trackEvent, {
          clerkUserId: evt.data.id,
          eventType: "user_registered",
          metadata: {
            email: evt.data.email_addresses[0]?.email_address,
            firstName: evt.data.first_name,
            lastName: evt.data.last_name,
            createdAt: new Date(evt.data.created_at).toISOString(),
          },
        });
        break;

      case "user.updated":
        // Handle user profile updates
        console.log("User updated:", evt.data.id);
        break;

      case "user.deleted":
        // Clean up user data (optional - might want to keep for analytics)
        await convex.mutation(api.analytics.trackEvent, {
          clerkUserId: evt.data.id,
          eventType: "user_deleted",
          metadata: {
            deletedAt: new Date().toISOString(),
          },
        });
        break;

      case "session.created":
        // Track user login
        await convex.mutation(api.analytics.trackEvent, {
          clerkUserId: evt.data.user_id,
          eventType: "user_login",
          metadata: {
            sessionId: evt.data.id,
            createdAt: new Date(evt.data.created_at).toISOString(),
          },
        });
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ message: "Webhook processed successfully" });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}