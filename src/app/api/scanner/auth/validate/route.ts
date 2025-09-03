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

    // Since we've changed the architecture to call Scanner Service directly from Dashboard Backend,
    // this endpoint is no longer used in the main flow but kept for compatibility
    
    // For now, return a basic success response if we have a Bearer token
    return NextResponse.json({
      valid: true,
      userId: "authenticated-user",
      email: "user@example.com",
    });

  } catch (error) {
    console.error("Error validating authentication:", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}