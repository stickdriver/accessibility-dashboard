import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Implement with actual tier/pricing data from Stripe
  return NextResponse.json({ error: "API not implemented yet - Stripe configuration pending" }, { status: 501 });
}
