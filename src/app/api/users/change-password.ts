import { NextApiRequest, NextApiResponse } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { requireAuth } from "../../../lib/auth";
import { sendSuccess, sendError, handleAPIError, APIResponse } from "../../../lib/api-response";
import { z } from "zod";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== "POST") {
    return sendError(res, "Method not allowed", 405);
  }

  try {
    const { userId, email } = requireAuth(req);

    // Validate request body
    const validationResult = changePasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err: any) => err.message);
      return sendError(res, `Validation failed: ${errors.join(", ")}`, 400);
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Verify current password
    const authResult = await convex.query(api.users.verifyUserPassword, { 
      email, 
      password: currentPassword 
    });
    
    if (!authResult.valid) {
      return sendError(res, "Current password is incorrect", 401);
    }

    // Update password
    await convex.mutation(api.users.updateUserPassword, {
      userId,
      newPassword,
    });

    sendSuccess(res, null, "Password updated successfully");
  } catch (error) {
    handleAPIError(res, error, "Password change failed");
  }
}