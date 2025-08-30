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
      eventType = "",
      userId = ""
    } = req.query;

    // Get user activity
    const activity = await convex.query(api.analytics.getActivity, {
      days: parseInt(days as string),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      eventType: eventType as string || undefined,
      userId: userId as string || undefined,
    });

    // Get activity summary
    const activitySummary = await convex.query(api.analytics.getActivitySummary, {
      days: parseInt(days as string),
    });

    // Get scan activity specifically
    const scanActivity = await convex.query(api.scans.getScanActivity, {
      days: parseInt(days as string),
    });

    sendSuccess(res, {
      activity,
      summary: {
        totalEvents: activitySummary.totalEvents,
        uniqueUsers: activitySummary.uniqueUsers,
        eventTypes: activitySummary.eventTypes,
        dailyAverage: Math.round(activitySummary.totalEvents / parseInt(days as string)),
      },
      scanActivity: {
        totalScans: scanActivity.totalScans,
        completedScans: scanActivity.completedScans,
        failedScans: scanActivity.failedScans,
        avgScanTime: scanActivity.avgScanTime,
        topUrls: scanActivity.topUrls,
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