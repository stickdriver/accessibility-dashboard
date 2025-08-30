import { NextApiRequest, NextApiResponse } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { requireAuth } from "../../../lib/auth";
import { sendSuccess, sendError, handleAPIError, APIResponse } from "../../../lib/api-response";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  try {
    const { userId } = requireAuth(req);

    if (req.method === "GET") {
      // Get user's scans with pagination
      const { limit = 10, offset = 0 } = req.query;
      
      const scans = await convex.query(api.scans.getUserScans, {
        userId,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      sendSuccess(res, scans);

    } else if (req.method === "POST") {
      // Create new scan
      const { url, scanType = "full", options = {} } = req.body;
      
      if (!url) {
        return sendError(res, "URL is required", 400);
      }

      const scanId = await convex.mutation(api.scans.createScan, {
        userId,
        url,
        scanType,
        status: "pending",
        options,
      });

      // Track analytics
      await convex.mutation(api.analytics.trackEvent, {
        userId,
        eventType: "scan_started",
        metadata: {
          scanId,
          scanType,
          url,
          timestamp: new Date().toISOString(),
        },
      });

      sendSuccess(res, { scanId }, "Scan created successfully", 201);

    } else {
      sendError(res, "Method not allowed", 405);
    }
  } catch (error) {
    handleAPIError(res, error);
  }
}