import { createClerkClient, verifyToken } from "@clerk/backend";
import { NextRequest } from "next/server";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || "placeholder_key_for_build"
});

export interface ClerkUser {
  clerkUserId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: "user" | "admin";
  metadata?: Record<string, any>;
}

export function extractTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader) {
    return null;
  }
  
  const token = authHeader.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : authHeader;
    
  return token;
}

export async function verifyClerkToken(req: NextRequest): Promise<ClerkUser | null> {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return null;
    
    // Verify the JWT with Clerk
    const payload = await verifyToken(token, { 
      secretKey: process.env.CLERK_SECRET_KEY || "placeholder_key_for_build" 
    });
    
    if (!payload.sub) return null;
    
    // Get user details from Clerk
    const user = await clerkClient.users.getUser(payload.sub);
    
    if (!user) return null;
    
    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    // Simple admin check - you can customize this logic
    const isAdmin = user.publicMetadata?.role === "admin" || 
                   email.includes("admin");

    return {
      clerkUserId: user.id,
      email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      role: isAdmin ? "admin" : "user",
      metadata: user.publicMetadata as Record<string, any> || {},
    };
  } catch (error) {
    console.error("Clerk token verification failed:", error);
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<ClerkUser> {
  const user = await verifyClerkToken(req);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

export async function requireAdmin(req: NextRequest): Promise<ClerkUser> {
  const user = await requireAuth(req);
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

// Legacy NextApiRequest support for gradual migration
export function extractTokenFromLegacyRequest(req: any): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  const token = authHeader.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : authHeader;
    
  return token;
}

export async function verifyClerkTokenLegacy(req: any): Promise<ClerkUser | null> {
  try {
    const token = extractTokenFromLegacyRequest(req);
    if (!token) return null;
    
    // Verify the JWT with Clerk
    const payload = await verifyToken(token, { 
      secretKey: process.env.CLERK_SECRET_KEY || "placeholder_key_for_build" 
    });
    
    if (!payload.sub) return null;
    
    // Get user details from Clerk
    const user = await clerkClient.users.getUser(payload.sub);
    
    if (!user) return null;
    
    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    // Simple admin check - you can customize this logic
    const isAdmin = user.publicMetadata?.role === "admin" || 
                   email.includes("admin");

    return {
      clerkUserId: user.id,
      email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      role: isAdmin ? "admin" : "user",
      metadata: user.publicMetadata as Record<string, any> || {},
    };
  } catch (error) {
    console.error("Clerk token verification failed:", error);
    return null;
  }
}

export async function requireAuthLegacy(req: any): Promise<ClerkUser> {
  const user = await verifyClerkTokenLegacy(req);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

export async function requireAdminLegacy(req: any): Promise<ClerkUser> {
  const user = await requireAuthLegacy(req);
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}