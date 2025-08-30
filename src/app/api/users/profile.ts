import { NextApiRequest, NextApiResponse } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { requireAuth } from "../../../lib/auth";
import { sendSuccess, sendError, handleAPIError, APIResponse } from "../../../lib/api-response";
import { z } from "zod";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const updateProfileSchema = z.object({
  name: z.string().optional(),
  onboardingCompleted: z.boolean().optional(),
});

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
  try {
    const { userId } = requireAuth(req);

    if (req.method === "GET") {
      // Get user profile
      const user = await convex.query(api.users.getUserById, { userId });
      if (!user) {
        return sendError(res, "User not found", 404);
      }

      sendSuccess(res, {
        id: user._id,
        email: user.email,
        name: user.name,
        planType: user.planType,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted,
        stripeCustomerId: user.stripeCustomerId,
      });

    } else if (req.method === "PUT") {
      // Update user profile
      const validationResult = updateProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map((err: any) => err.message);
        return sendError(res, `Validation failed: ${errors.join(", ")}`, 400);
      }

      const updates = validationResult.data;
      
      await convex.mutation(api.users.updateUser, {
        userId,
        ...updates,
      });

      // Get updated user
      const updatedUser = await convex.query(api.users.getUserById, { userId });
      
      sendSuccess(res, {
        id: updatedUser?._id,
        email: updatedUser?.email,
        name: updatedUser?.name,
        planType: updatedUser?.planType,
        emailVerified: updatedUser?.emailVerified,
        onboardingCompleted: updatedUser?.onboardingCompleted,
        stripeCustomerId: updatedUser?.stripeCustomerId,
      }, "Profile updated successfully");

    } else {
      sendError(res, "Method not allowed", 405);
    }
  } catch (error) {
    handleAPIError(res, error);
  }
}