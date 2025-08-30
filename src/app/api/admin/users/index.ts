import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { sendSuccess, sendError, handleAPIError } from "../../../../lib/api-response";
import { withAdminAuth } from "../../../../lib/middleware";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default withAdminAuth(async (req, res) => {
  try {
    if (req.method === "GET") {
      // Get all users with pagination
      const { 
        limit = "50", 
        cursor
      } = req.query;

      const result = await convex.query(api.users.getAllUsers, {
        limit: parseInt(limit as string),
        cursor: cursor as string,
      });

      // Get user stats
      const stats = await convex.query(api.users.getUserStats, {});

      sendSuccess(res, {
        users: result.users,
        nextCursor: result.nextCursor,
        stats,
      });

    } else {
      sendError(res, "Method not allowed", 405);
    }
  } catch (error) {
    handleAPIError(res, error);
  }
});