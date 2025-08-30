import { NextApiRequest, NextApiResponse } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { requireAuth } from "../../../lib/auth";
import { sendSuccess, handleAPIError, APIResponse } from "../../../lib/api-response";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { userId } = requireAuth(req);
    
    // Get current month usage
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const usage = await convex.query(api.usage.getCurrentUsage, {
      userId,
      month: currentMonth,
      year: currentYear,
    });

    sendSuccess(res, {
      month: currentMonth,
      year: currentYear,
      pagesScanned: usage?.pagesScanned || 0,
      scansPerformed: usage?.scansPerformed || 0,
      pdfDownloads: usage?.pdfDownloads || 0,
      lastUpdated: usage?._creationTime || currentDate.toISOString(),
    });

  } catch (error) {
    handleAPIError(res, error);
  }
}