import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

export async function POST(req: NextRequest) {
  console.log('🔔 Clerk webhook received at:', new Date().toISOString());
  
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET environment variable');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  
  console.log('✅ CLERK_WEBHOOK_SECRET is configured');

  // Initialize Convex client with environment variable available at runtime
  const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!CONVEX_URL) {
    console.error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  
  const convex = new ConvexHttpClient(CONVEX_URL);

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // Get the body
  const payload = await req.text();

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the webhook
  const { type, data } = evt;

  console.log(`Received Clerk webhook: ${type}`, data);

  try {
    switch (type) {
      case 'user.created': {
        console.log(`Processing user.created for ${data.id}`);
        
        // Extract user information from Clerk webhook data
        const email = data.email_addresses?.[0]?.email_address || 'unknown@example.com';
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || '';
        
        // Create user profile
        const userResult = await convex.mutation(api.users.createUser, {
          clerkUserId: data.id,
          email,
          name,
          subscriptionTier: 'starter', // Default tier
          signupSource: data.public_metadata?.signupSource as string,
        });

        // Create initial usage record
        const usageResult = await convex.mutation(api.usage.createUserUsageRecord, {
          clerkUserId: data.id
        });

        console.log(`✅ New user setup complete for ${data.id}:`, {
          userProfile: userResult,
          usageRecord: usageResult,
        });
        break;
      }

      case 'user.updated': {
        console.log(`Processing user.updated for ${data.id}`);
        
        // Update user profile with latest Clerk data
        const email = data.email_addresses?.[0]?.email_address;
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        const subscriptionTier = data.public_metadata?.subscriptionTier as string;

        const updateResult = await convex.mutation(api.users.updateUser, {
          clerkUserId: data.id,
          ...(email && { email }),
          ...(name && { name }),
          ...(subscriptionTier && { subscriptionTier }),
        });

        console.log(`✅ User profile updated for ${data.id}:`, updateResult);
        break;
      }

      case 'user.deleted': {
        console.log(`Processing user.deleted for ${data.id}`);
        
        // Delete all user data for GDPR compliance
        const deleteResult = await convex.mutation(api.users.deleteUser, {
          clerkUserId: data.id
        });

        console.log(`✅ User data deleted for ${data.id}:`, deleteResult);
        break;
      }

      case 'session.created': {
        console.log(`Processing session.created for user ${data.user_id}`);
        
        // Update user's last active timestamp
        const activeResult = await convex.mutation(api.users.updateLastActive, {
          clerkUserId: data.user_id
        });

        // Log analytics event
        await convex.mutation(api.analytics.logEvent, {
          eventType: 'user_session_created',
          clerkUserId: data.user_id,
          metadata: {
            sessionId: data.id,
            clientId: data.client_id,
            createdAt: data.created_at,
          },
          timestamp: Date.now(),
          sessionId: data.id,
        });

        console.log(`✅ Session created for ${data.user_id}:`, activeResult);
        break;
      }

      case 'session.ended': {
        console.log(`Processing session.ended for user ${data.user_id}`);
        
        // Log analytics event
        await convex.mutation(api.analytics.logEvent, {
          eventType: 'user_session_ended',
          clerkUserId: data.user_id,
          metadata: {
            sessionId: data.id,
            endedAt: data.ended_at,
            lastActiveAt: data.last_active_at,
          },
          timestamp: Date.now(),
          sessionId: data.id,
        });

        console.log(`✅ Session ended for ${data.user_id}`);
        break;
      }

      default:
        console.log(`⚠️  Unhandled webhook type: ${type}`, { userId: data.id || data.user_id });
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
