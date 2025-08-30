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
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return sendError(res, "Scan ID is required", 400);
    }

    if (req.method === "GET") {
      // Get scan details with pages
      const scan = await convex.query(api.scans.getScanById, { 
        scanId: id as any,
        userId 
      });
      
      if (!scan) {
        return sendError(res, "Scan not found", 404);
      }

      const pages = await convex.query(api.scanPages.getScanPages, {
        scanId: id as any,
      });

      sendSuccess(res, {
        ...scan,
        pages,
      });

    } else if (req.method === "PUT") {
      // Update scan (typically for status updates from scanner service)
      const { status, progress, results, error } = req.body;
      
      const updatedScan = await convex.mutation(api.scans.updateScan, {
        scanId: id as any,
        updates: {
          status,
          progress,
          results,
          error,
          completedAt: status === "completed" ? new Date().toISOString() : undefined,
        },
      });

      // Track completion analytics
      if (status === "completed") {
        await convex.mutation(api.analytics.trackEvent, {
          userId,
          eventType: "scan_completed",
          metadata: {
            scanId: id,
            timestamp: new Date().toISOString(),
          },
        });
      }

      sendSuccess(res, updatedScan, "Scan updated successfully");

    } else if (req.method === "DELETE") {
      // Delete scan
      await convex.mutation(api.scans.deleteScan, {
        scanId: id as any,
        userId,
      });

      sendSuccess(res, null, "Scan deleted successfully");

    } else {
      sendError(res, "Method not allowed", 405);
    }
  } catch (error) {
    handleAPIError(res, error);
  }
}