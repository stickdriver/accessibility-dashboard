import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/auth";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
});

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    
    // Get users from Clerk
    const params: any = {
      limit,
      offset,
    };
    
    if (search) {
      params.query = search; // Search by email or name
    }
    
    const response = await clerkClient.users.getUserList(params);
    
    const users = response.data.map(user => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: new Date(user.createdAt).toISOString(),
      lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
      banned: user.banned,
      planType: user.publicMetadata?.plan_type || 'free',
      metadata: user.publicMetadata,
    }));

    return NextResponse.json({
      success: true,
      data: {
        users,
        totalCount: response.totalCount,
        hasMore: (offset + limit) < response.totalCount,
      }
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// Update user metadata
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    
    const { userId, planType, metadata } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (planType) {
      updateData.publicMetadata = { 
        ...updateData.publicMetadata, 
        plan_type: planType 
      };
    }
    
    if (metadata) {
      updateData.publicMetadata = { 
        ...updateData.publicMetadata, 
        ...metadata 
      };
    }

    const user = await clerkClient.users.updateUser(userId, updateData);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        planType: user.publicMetadata?.plan_type || 'free',
        metadata: user.publicMetadata,
      },
      message: "User updated successfully"
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}