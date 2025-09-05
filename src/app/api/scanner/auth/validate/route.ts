import { NextRequest, NextResponse } from "next/server";

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

    // Extract the JWT token and validate with Clerk
    const token = authHeader.replace("Bearer ", "");
    
    try {
      // Import Clerk server utilities
      const { verifyToken } = await import("@clerk/backend");
      
      // Check for secret key
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) {
        console.error("Missing CLERK_SECRET_KEY environment variable");
        return NextResponse.json(
          { valid: false, error: "Server configuration error" },
          { status: 500 }
        );
      }
      
      // Verify the token with Clerk
      const payload = await verifyToken(token, {
        secretKey,
      });

      if (!payload || !payload.sub) {
        return NextResponse.json(
          { valid: false, error: "Invalid token" },
          { status: 401 }
        );
      }

      // Get user details from Clerk
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      const user = await client.users.getUser(payload.sub);

      return NextResponse.json({
        valid: true,
        userId: payload.sub, // This is the Clerk user ID
        email: user.emailAddresses[0]?.emailAddress || "unknown@example.com",
      });

    } catch (clerkError) {
      console.error("Clerk token validation failed:", clerkError);
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