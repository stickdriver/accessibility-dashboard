import { NextApiRequest, NextApiResponse } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { requireAdmin } from "../../../lib/auth";
import { sendSuccess, sendError, handleAPIError, APIResponse } from "../../../lib/api-response";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== "GET") {
    return sendError(res, "Method not allowed", 405);
  }

  try {
    requireAdmin(req);

    const { 
      days = 7,
      limit = 100,
      offset = 0,
      userId = ""
    } = req.query;

    // Get login activity
    const logins = await convex.query(api.analytics.getLoginActivity, {
      days: parseInt(days as string),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      userId: userId as string || undefined,
    });

    // Get login statistics
    const loginStats = await convex.query(api.analytics.getLoginStats, {
      days: parseInt(days as string),
    });

    sendSuccess(res, {
      logins,
      stats: {
        totalLogins: loginStats.totalLogins,
        uniqueUsers: loginStats.uniqueUsers,
        dailyAverage: Math.round(loginStats.totalLogins / parseInt(days as string)),
        peakDay: loginStats.peakDay,
      },
      period: {
        days: parseInt(days as string),
        from: new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
    });

  } catch (error) {
    handleAPIError(res, error);
  }
}