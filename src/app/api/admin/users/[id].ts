import { NextApiRequest, NextApiResponse } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { requireAdmin } from "../../../../lib/auth";
import { sendSuccess, sendError, handleAPIError, APIResponse } from "../../../../lib/api-response";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  try {
    requireAdmin(req);
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return sendError(res, "User ID is required", 400);
    }

    if (req.method === "GET") {
      // Get user details with activity
      const user = await convex.query(api.users.getUserById, { 
        userId: id as any 
      });

      if (!user) {
        return sendError(res, "User not found", 404);
      }

      // Get user's recent scans
      const recentScans = await convex.query(api.scans.getUserScans, {
        userId: id as any,
        limit: 10,
        offset: 0,
      });

      // Get user's usage statistics
      const currentDate = new Date();
      const usage = await convex.query(api.usage.getCurrentUsage, {
        userId: id as any,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      });

      // Get user's analytics events
      const analyticsEvents = await convex.query(api.analytics.getUserEvents, {
        userId: id as any,
        limit: 20,
      });

      sendSuccess(res, {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          planType: user.planType,
          emailVerified: user.emailVerified,
          onboardingCompleted: user.onboardingCompleted,
          stripeCustomerId: user.stripeCustomerId,
          createdAt: user._creationTime,
        },
        activity: {
          recentScans,
          usage: {
            pagesScanned: usage?.pagesScanned || 0,
            scansPerformed: usage?.scansPerformed || 0,
            pdfDownloads: usage?.pdfDownloads || 0,
          },
          events: analyticsEvents,
        },
      });

    } else if (req.method === "PUT") {
      // Update user (admin actions)
      const { planType, emailVerified, isBlocked } = req.body;
      
      const updatedUser = await convex.mutation(api.users.updateUser, {
        userId: id as any,
        updates: {
          planType,
          emailVerified,
          isBlocked,
        },
      });

      sendSuccess(res, updatedUser, "User updated successfully");

    } else if (req.method === "DELETE") {
      // Delete user (admin action)
      await convex.mutation(api.users.deleteUser, {
        userId: id as any,
      });

      sendSuccess(res, null, "User deleted successfully");

    } else {
      sendError(res, "Method not allowed", 405);
    }
  } catch (error) {
    handleAPIError(res, error);
  }
}