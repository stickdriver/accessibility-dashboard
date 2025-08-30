import { NextApiRequest, NextApiResponse } from "next";
import { sendError, APIResponse } from "../../../lib/api-response";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  // TODO: Implement once Convex is properly configured
  return sendError(res, "API not implemented yet - Convex configuration pending", 501);
}