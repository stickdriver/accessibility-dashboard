import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Webhook not implemented yet - Stripe configuration pending" }, { status: 501 });
}
