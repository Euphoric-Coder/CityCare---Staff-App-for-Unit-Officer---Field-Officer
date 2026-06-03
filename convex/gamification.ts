import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  awardCitizenPoints,
  checkAndAwardCitizenBadges,
} from "lib/gamificationAwards";

export const awardPointsManual = mutation({
  args: {
    citizenId: v.id("citizens"),
    userId: v.id("users"),

    type: v.union(
      v.literal("issue_submitted"),
      v.literal("video_evidence_added"),
      v.literal("issue_verified"),
      v.literal("issue_assigned"),
      v.literal("issue_resolved"),
      v.literal("issue_closed"),
      v.literal("issue_rejected"),
      v.literal("duplicate_report"),
      v.literal("issue_withdrawn"),
      v.literal("comment_added"),
      v.literal("comment_liked"),
      v.literal("report_upvoted"),
      v.literal("streak_bonus"),
      v.literal("badge_bonus"),
      v.literal("manual_adjustment")
    ),

    points: v.optional(v.number()),
    reason: v.optional(v.string()),
    relatedIssueId: v.optional(v.id("issues")),
  },

  handler: async (ctx, args) => {
    const result = await awardCitizenPoints(ctx, {
      citizenId: args.citizenId,
      userId: args.userId,
      type: args.type,
      points: args.points,
      reason: args.reason,
      relatedIssueId: args.relatedIssueId,
      metadata: {
        source: "manual_mutation",
      },
    });

    const badges = await checkAndAwardCitizenBadges(ctx, {
      citizenId: args.citizenId,
      userId: args.userId,
      relatedIssueId: args.relatedIssueId,
    });

    return {
      ...result,
      badgesAwarded: badges,
    };
  },
});

export const getCitizenGamificationProfile = query({
  args: {
    citizenId: v.id("citizens"),
  },

  handler: async (ctx, args) => {
    const citizen = await ctx.db.get(args.citizenId);

    if (!citizen) return null;

    const earnedBadges = await ctx.db
      .query("citizenBadges")
      .withIndex("by_citizen", (q) => q.eq("citizenId", args.citizenId))
      .collect();

    const badgeDetails = await Promise.all(
      earnedBadges.map(async (citizenBadge) => {
        const badge = await ctx.db.get(citizenBadge.badgeId);

        return {
          ...citizenBadge,
          badge,
        };
      })
    );

    const recentTransactions = await ctx.db
      .query("citizenPointTransactions")
      .withIndex("by_citizen_created", (q) => q.eq("citizenId", args.citizenId))
      .order("desc")
      .take(20);

    return {
      citizen,
      badges: badgeDetails,
      recentTransactions,
    };
  },
});

export const getCitizenPointHistory = query({
  args: {
    citizenId: v.id("citizens"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("citizenPointTransactions")
      .withIndex("by_citizen_created", (q) => q.eq("citizenId", args.citizenId))
      .order("desc")
      .collect();
  },
});

export const getCityLeaderboard = query({
  args: {
    city: v.string(),
    limit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const citizens = await ctx.db
      .query("citizens")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .collect();

    return citizens
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
      .slice(0, limit)
      .map((citizen, index) => ({
        rank: index + 1,
        citizenId: citizen._id,
        fullName: citizen.fullName,
        city: citizen.city,
        region: citizen.region,
        points: citizen.points ?? 0,
        level: citizen.level ?? 1,
        levelTitle: citizen.levelTitle ?? "New Citizen",
        badgeCount: citizen.badgeCount ?? 0,
        reportsSubmitted: citizen.reportsSubmitted ?? 0,
        reportsVerified: citizen.reportsVerified ?? 0,
        reportsResolved: citizen.reportsResolved ?? 0,
      }));
  },
});