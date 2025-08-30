import { ConvexReactClient } from "convex/react";

// Use a placeholder URL during build if the environment variable is not set
// This allows the build to succeed, but the app will need the real URL at runtime
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.warn("NEXT_PUBLIC_CONVEX_URL is not set - using placeholder for build");
}

export const convex = new ConvexReactClient(convexUrl);