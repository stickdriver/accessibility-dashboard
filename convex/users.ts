import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
    name: v.optional(v.string()),
    planType: v.union(
      v.literal("free"), 
      v.literal("professional"), 
      v.literal("agency"),
      v.literal("enterprise")
    ),
  },
  handler: async (ctx, args) => {
    // Create user with inactive status (requires email verification)
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      planType: args.planType,
      status: "inactive", // User must verify email to activate
      onboardingCompleted: false,
    });

    // Store hashed password in auth system
    await ctx.db.insert("authAccounts", {
      userId: userId,
      provider: "password",
      providerAccountId: args.email,
      secret: args.hashedPassword,
    });

    return userId;
  },
});

export const getUserForLogin = query({
  args: { 
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) {
      return { user: null, authAccount: null, reason: "user_not_found" };
    }

    // Check if user account is active
    if (user.status !== "active") {
      return { 
        user: null, 
        authAccount: null,
        reason: user.status === "inactive" ? "account_inactive" : "account_suspended"
      };
    }

    // Get password hash from auth account
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => 
        q.eq("userId", user._id).eq("provider", "password")
      )
      .first();

    if (!authAccount || !authAccount.secret) {
      return { user: null, authAccount: null, reason: "password_not_found" };
    }

    return { 
      user, 
      authAccount,
      reason: "success"
    };
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    planType: v.optional(v.union(
      v.literal("free"), 
      v.literal("professional"), 
      v.literal("agency"),
      v.literal("enterprise")
    )),
    emailVerified: v.optional(v.boolean()),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    return await ctx.db.patch(userId, cleanUpdates);
  },
});

export const updateUserPassword = mutation({
  args: {
    userId: v.id("users"),
    hashedPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Find existing auth account
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => 
        q.eq("userId", args.userId).eq("provider", "password")
      )
      .first();

    if (authAccount) {
      // Update existing password
      await ctx.db.patch(authAccount._id, {
        secret: args.hashedPassword,
      });
    } else {
      // Create new auth account (shouldn't happen in normal flow)
      const user = await ctx.db.get(args.userId);
      if (user) {
        await ctx.db.insert("authAccounts", {
          userId: args.userId,
          provider: "password",
          providerAccountId: user.email,
          secret: args.hashedPassword,
        });
      }
    }
    
    return true;
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Delete auth accounts first
    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }
    
    // Delete user
    await ctx.db.delete(args.userId);
    
    return true;
  },
});

export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    let query = ctx.db.query("users");
    
    if (args.cursor) {
      query = query.filter((q) => q.gt(q.field("_id"), args.cursor!));
    }
    
    const users = await query.order("desc").take(limit);
    
    return {
      users,
      nextCursor: users.length === limit ? users[users.length - 1]._id : null,
    };
  },
});

export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    const stats = {
      total: users.length,
      byPlan: {
        free: 0,
        professional: 0,
        agency: 0,
        enterprise: 0,
      },
      active: 0,
      inactive: 0,
      suspended: 0,
      onboarded: 0,
    };
    
    users.forEach(user => {
      stats.byPlan[user.planType]++;
      if (user.status === "active") stats.active++;
      if (user.status === "inactive") stats.inactive++;
      if (user.status === "suspended") stats.suspended++;
      if (user.onboardingCompleted) stats.onboarded++;
    });
    
    return stats;
  },
});

export const createPasswordResetToken = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) {
      return null; // Don't reveal if user exists
    }

    // Generate a secure random token
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now

    // Store the reset token
    await ctx.db.insert("passwordResetTokens", {
      userId: user._id,
      token,
      expiresAt,
      used: false,
    });

    return {
      userId: user._id,
      token,
      email: user.email,
      name: user.name,
    };
  },
});

export const verifyPasswordResetToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const resetToken = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!resetToken || resetToken.used || resetToken.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(resetToken.userId);
    if (!user) {
      return null;
    }

    return {
      userId: user._id,
      email: user.email,
      tokenId: resetToken._id,
    };
  },
});

export const resetUserPassword = mutation({
  args: {
    token: v.string(),
    hashedPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify token
    const resetToken = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!resetToken || resetToken.used || resetToken.expiresAt < Date.now()) {
      throw new Error("Invalid or expired reset token");
    }

    // Update password
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => 
        q.eq("userId", resetToken.userId).eq("provider", "password")
      )
      .first();

    if (authAccount) {
      await ctx.db.patch(authAccount._id, {
        secret: args.hashedPassword,
      });
    } else {
      // Create new auth account (edge case)
      const user = await ctx.db.get(resetToken.userId);
      if (user) {
        await ctx.db.insert("authAccounts", {
          userId: resetToken.userId,
          provider: "password",
          providerAccountId: user.email,
          secret: args.hashedPassword,
        });
      }
    }

    // Mark token as used
    await ctx.db.patch(resetToken._id, { used: true });

    return true;
  },
});

export const createEmailVerificationToken = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate a secure random token
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now

    // Store the verification token
    await ctx.db.insert("emailVerificationTokens", {
      userId: args.userId,
      email: args.email,
      token,
      expiresAt,
      used: false,
    });

    return token;
  },
});

export const verifyEmailVerificationToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const verificationToken = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!verificationToken || verificationToken.used || verificationToken.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(verificationToken.userId);
    if (!user) {
      return null;
    }

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      tokenId: verificationToken._id,
    };
  },
});

export const activateUserAccount = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify token
    const verificationToken = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!verificationToken || verificationToken.used || verificationToken.expiresAt < Date.now()) {
      throw new Error("Invalid or expired verification token");
    }

    // Get user
    const user = await ctx.db.get(verificationToken.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Activate user account
    await ctx.db.patch(verificationToken.userId, {
      status: "active",
      activatedAt: Date.now(),
    });

    // Mark token as used
    await ctx.db.patch(verificationToken._id, { used: true });

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
    };
  },
});

export const resendEmailVerification = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) {
      return null; // Don't reveal if user exists
    }

    // Only allow resend for inactive users
    if (user.status !== "inactive") {
      return null; // User is already active or suspended
    }

    // Check rate limiting - max 3 tokens per hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentTokens = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.gt(q.field("_creationTime"), oneHourAgo))
      .collect();

    if (recentTokens.length >= 3) {
      throw new Error("Rate limit exceeded. Please wait before requesting another verification email.");
    }

    // Generate new token
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    await ctx.db.insert("emailVerificationTokens", {
      userId: user._id,
      email: user.email,
      token,
      expiresAt,
      used: false,
    });

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      token,
    };
  },
});