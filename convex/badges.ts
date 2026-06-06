import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { awardBadgeIfNotExists } from "lib/gamificationAwards";

const badgeCategoryValidator = v.union(
  v.literal("reporting"),
  v.literal("resolution"),
  v.literal("community"),
  v.literal("streak"),
  v.literal("quality"),
  v.literal("special")
);

const badgeCriteriaTypeValidator = v.union(
  v.literal("reports_submitted"),
  v.literal("video_evidence_added"),
  v.literal("reports_verified"),
  v.literal("reports_resolved"),
  v.literal("comments_added"),
  v.literal("upvotes_received"),
  v.literal("current_streak"),
  v.literal("longest_streak"),
  v.literal("points_reached"),
  v.literal("manual")
);

const DEFAULT_BADGES = [
  {
    code: "first_reporter",
    name: "First Reporter",
    description: "Submitted the first civic issue report",
    icon: "flag",
    category: "reporting",
    criteriaType: "reports_submitted",
    requiredCount: 1,
    rewardPoints: 10,
  },
  {
    code: "evidence_builder",
    name: "Evidence Builder",
    description: "Added video evidence to strengthen a civic report",
    icon: "video",
    category: "quality",
    criteriaType: "video_evidence_added",
    requiredCount: 1,
    rewardPoints: 10,
  },
  {
    code: "verified_voice",
    name: "Verified Voice",
    description: "Had 5 reports verified by officers",
    icon: "check-circle",
    category: "quality",
    criteriaType: "reports_verified",
    requiredCount: 5,
    rewardPoints: 25,
  },
  {
    code: "problem_solver",
    name: "Problem Solver",
    description: "Contributed to 5 resolved civic issues",
    icon: "wrench",
    category: "resolution",
    criteriaType: "reports_resolved",
    requiredCount: 5,
    rewardPoints: 25,
  },
  {
    code: "seven_day_streak",
    name: "7-Day Civic Streak",
    description: "Stayed active for 7 civic participation days",
    icon: "flame",
    category: "streak",
    criteriaType: "current_streak",
    requiredCount: 7,
    rewardPoints: 25,
  },
  {
    code: "city_hero",
    name: "City Hero",
    description: "Reached 1000 citizen points",
    icon: "award",
    category: "special",
    criteriaType: "points_reached",
    requiredCount: 1000,
    rewardPoints: 50,
  },
] as const;

function generateBadgeCode(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const seedDefaultBadges = mutation({
  args: {},

  handler: async (ctx) => {
    const created = [];
    const updated = [];
    const skipped = [];

    for (const badge of DEFAULT_BADGES) {
      const existing = await ctx.db
        .query("badges")
        .withIndex("by_code", (q) => q.eq("code", badge.code))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          criteriaType: badge.criteriaType,
          requiredCount: badge.requiredCount,
          rewardPoints: badge.rewardPoints,
          isActive: true,
          isSystemBadge: true,
          updatedAt: Date.now(),
        });

        updated.push(badge.code);
        continue;
      }

      const badgeId = await ctx.db.insert("badges", {
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        criteriaType: badge.criteriaType,
        requiredCount: badge.requiredCount,
        rewardPoints: badge.rewardPoints,
        isActive: true,
        isSystemBadge: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      created.push(badgeId);
    }

    return {
      created,
      updated,
      skipped,
    };
  },
});

export const getAllBadges = query({
  args: {},

  handler: async (ctx) => {
    return await ctx.db.query("badges").collect();
  },
});

export const getActiveBadges = query({
  args: {},

  handler: async (ctx) => {
    return await ctx.db
      .query("badges")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const getSystemBadges = query({
  args: {},

  handler: async (ctx) => {
    return await ctx.db
      .query("badges")
      .withIndex("by_system", (q) => q.eq("isSystemBadge", true))
      .collect();
  },
});

export const getCustomBadges = query({
  args: {},

  handler: async (ctx) => {
    return await ctx.db
      .query("badges")
      .withIndex("by_system", (q) => q.eq("isSystemBadge", false))
      .collect();
  },
});

export const createCustomBadge = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    description: v.string(),
    icon: v.string(),

    category: badgeCategoryValidator,
    criteriaType: badgeCriteriaTypeValidator,

    requiredCount: v.number(),
    rewardPoints: v.number(),

    isActive: v.optional(v.boolean()),
    createdByAdminId: v.optional(v.id("users")),
  },

  handler: async (ctx, args) => {
    const code = args.code?.trim()
      ? generateBadgeCode(args.code)
      : generateBadgeCode(args.name);

    if (!code) {
      throw new Error("Badge code could not be generated.");
    }

    if (args.requiredCount < 0) {
      throw new Error("Required count cannot be negative.");
    }

    if (args.rewardPoints < 0) {
      throw new Error("Reward points cannot be negative.");
    }

    const existing = await ctx.db
      .query("badges")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (existing) {
      throw new Error("A badge with this code already exists.");
    }

    const badgeId = await ctx.db.insert("badges", {
      code,
      name: args.name.trim(),
      description: args.description.trim(),
      icon: args.icon.trim(),

      category: args.category,
      criteriaType: args.criteriaType,

      requiredCount: args.requiredCount,
      rewardPoints: args.rewardPoints,

      isActive: args.isActive ?? true,

      // Custom badge
      isSystemBadge: false,

      createdByAdminId: args.createdByAdminId,

      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      badgeId,
      code,
      message: "Custom badge created successfully.",
    };
  },
});

export const updateCustomBadge = mutation({
  args: {
    badgeId: v.id("badges"),

    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),

    category: v.optional(badgeCategoryValidator),
    criteriaType: v.optional(badgeCriteriaTypeValidator),

    requiredCount: v.optional(v.number()),
    rewardPoints: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const badge = await ctx.db.get(args.badgeId);

    if (!badge) {
      throw new Error("Badge not found.");
    }

    if (badge.isSystemBadge) {
      throw new Error("System badges cannot be edited from admin panel.");
    }

    const patchData: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) patchData.name = args.name.trim();
    if (args.description !== undefined) patchData.description = args.description.trim();
    if (args.icon !== undefined) patchData.icon = args.icon.trim();
    if (args.category !== undefined) patchData.category = args.category;
    if (args.criteriaType !== undefined) patchData.criteriaType = args.criteriaType;

    if (args.requiredCount !== undefined) {
      if (args.requiredCount < 0) {
        throw new Error("Required count cannot be negative.");
      }

      patchData.requiredCount = args.requiredCount;
    }

    if (args.rewardPoints !== undefined) {
      if (args.rewardPoints < 0) {
        throw new Error("Reward points cannot be negative.");
      }

      patchData.rewardPoints = args.rewardPoints;
    }

    await ctx.db.patch(args.badgeId, patchData);

    return {
      success: true,
      message: "Custom badge updated successfully.",
    };
  },
});

export const setCustomBadgeActiveStatus = mutation({
  args: {
    badgeId: v.id("badges"),
    isActive: v.boolean(),
  },

  handler: async (ctx, args) => {
    const badge = await ctx.db.get(args.badgeId);

    if (!badge) {
      throw new Error("Badge not found.");
    }

    if (badge.isSystemBadge) {
      throw new Error("System/default badges cannot be deactivated.");
    }

    await ctx.db.patch(args.badgeId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: args.isActive
        ? "Custom badge activated successfully."
        : "Custom badge deactivated successfully. Citizens who already earned it will keep it.",
    };
  },
});

export const awardManualBadgeToCitizen = mutation({
  args: {
    citizenId: v.id("citizens"),
    badgeCode: v.string(),
    relatedIssueId: v.optional(v.id("issues")),
    reason: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const citizen = await ctx.db.get(args.citizenId);

    if (!citizen) {
      throw new Error("Citizen not found.");
    }

    const badge = await ctx.db
      .query("badges")
      .withIndex("by_code", (q) => q.eq("code", args.badgeCode))
      .first();

    if (!badge) {
      throw new Error("Badge not found.");
    }

    if (!badge.isActive) {
      throw new Error("This badge is inactive and cannot be awarded.");
    }

    if (badge.criteriaType !== "manual") {
      throw new Error("Only manual badges can be awarded manually.");
    }

    return await awardBadgeIfNotExists(ctx, {
      citizenId: args.citizenId,
      userId: citizen.userId,
      badgeCode: args.badgeCode,
      relatedIssueId: args.relatedIssueId,
      reason: args.reason ?? `Manual badge awarded: ${badge.name}`,
    });
  },
});