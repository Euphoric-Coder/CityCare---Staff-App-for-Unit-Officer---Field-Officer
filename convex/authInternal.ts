import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hashSessionToken, resolveAuthenticatedUser } from "./lib/authorization";

export const createSessionRecord = internalMutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      role: args.role,
      tokenHash: args.tokenHash,
      createdAt: now,
      expiresAt: args.expiresAt,
      lastActiveAt: now,
    });
    return { sessionId };
  },
});

export const logout = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) {
      return { success: false, error: "Missing session token" };
    }
    const tokenHash = await hashSessionToken(args.sessionToken);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        revokedAt: Date.now(),
      });
      return { success: true };
    }
    return { success: false, error: "Session not found" };
  },
});

export const getSessionUser = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const auth = await resolveAuthenticatedUser(ctx, args.sessionToken);
      return {
        id: auth.userId,
        name: auth.user.fullName,
        email: auth.user.email,
        role: auth.role,
        profile: auth.profile,
      };
    } catch (err) {
      return null;
    }
  },
});

export const revokeAllUserSessions = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const now = Date.now();
    for (const session of sessions) {
      if (!session.revokedAt) {
        await ctx.db.patch(session._id, { revokedAt: now });
      }
    }
    return { count: sessions.length };
  },
});
