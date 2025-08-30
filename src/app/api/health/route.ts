import { NextResponse } from "next/server";

export async function GET() {
  // Simple health check endpoint
  return NextResponse.json(
    { 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      service: "accessibility-dashboard"
    },
    { status: 200 }
  );
}