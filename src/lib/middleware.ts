import { NextApiRequest, NextApiResponse } from "next";
import { verifyAuthToken, JWTPayload } from "./auth";
import { sendError, APIResponse } from "./api-response";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface AuthenticatedRequest extends NextApiRequest {
  user: JWTPayload;
}

export function withAuth<T = any>(
  handler: (req: AuthenticatedRequest, res: NextApiResponse<APIResponse<T>>) => void | Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse<APIResponse<T>>) => {
    try {
      const user = verifyAuthToken(req);
      
      if (!user) {
        return sendError(res, "Authentication required", 401);
      }

      // Verify user is still active in database
      const dbUser = await convex.query(api.users.getUserById, { userId: user.userId });
      
      if (!dbUser) {
        return sendError(res, "User account not found", 401);
      }

      if (dbUser.status !== "active") {
        const message = dbUser.status === "inactive" 
          ? "Please activate your account before accessing this resource"
          : "Your account has been suspended. Please contact support.";
        return sendError(res, message, 401);
      }

      // Add user to request object with updated info
      (req as AuthenticatedRequest).user = {
        ...user,
        // Update with current status from database
        status: dbUser.status,
      };

      return await handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error("Authentication middleware error:", error);
      return sendError(res, "Authentication failed", 401);
    }
  };
}

export function withAdminAuth<T = any>(
  handler: (req: AuthenticatedRequest, res: NextApiResponse<APIResponse<T>>) => void | Promise<void>
) {
  return withAuth<T>(async (req, res) => {
    if (req.user.role !== "admin") {
      return sendError(res, "Admin access required", 403);
    }

    return await handler(req, res);
  });
}

export function withRoles<T = any>(
  allowedRoles: string[],
  handler: (req: AuthenticatedRequest, res: NextApiResponse<APIResponse<T>>) => void | Promise<void>
) {
  return withAuth<T>(async (req, res) => {
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, `Access denied. Required roles: ${allowedRoles.join(", ")}`, 403);
    }

    return await handler(req, res);
  });
}

export function optionalAuth<T = any>(
  handler: (req: AuthenticatedRequest | NextApiRequest, res: NextApiResponse<APIResponse<T>>) => void | Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse<APIResponse<T>>) => {
    try {
      const user = verifyAuthToken(req);
      
      if (user) {
        (req as AuthenticatedRequest).user = user;
      }

      return await handler(req, res);
    } catch (error) {
      // Continue without authentication if token is invalid
      return await handler(req, res);
    }
  };
}