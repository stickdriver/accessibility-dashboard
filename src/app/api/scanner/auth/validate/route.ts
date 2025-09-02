import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

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

export async function GET(request: NextRequest) {
  try {
    // Validate scanner authentication
    if (!validateScannerAuth(request)) {
      return NextResponse.json(
        { valid: false, error: "Invalid scanner API key" },
        { status: 401 }
      );
    }

    // Get the user token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { valid: false, error: "Missing or invalid authorization header" },
        { status: 400 }
      );
    }

    try {
      // Use Clerk's auth() to validate the token
      const { userId } = await auth();
      
      if (!userId) {
        return NextResponse.json(
          { valid: false, error: "Invalid or expired token" },
          { status: 401 }
        );
      }

      // Get user details from Clerk
      const user = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      });

      if (!user.ok) {
        return NextResponse.json(
          { valid: false, error: "Failed to fetch user details" },
          { status: 500 }
        );
      }

      const userData = await user.json();

      return NextResponse.json({
        valid: true,
        userId: userId,
        email: userData.email_addresses?.[0]?.email_address,
      });

    } catch (authError) {
      return NextResponse.json(
        { valid: false, error: "Token validation failed" },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error("Error validating authentication:", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}