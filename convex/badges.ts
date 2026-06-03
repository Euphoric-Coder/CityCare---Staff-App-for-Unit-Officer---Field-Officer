import { mutation, query } from "./_generated/server";

const DEFAULT_BADGES = [
  {
    code: "first_reporter",
    name: "First Reporter",
    description: "Submitted the first civic issue report",
    icon: "flag",
    category: "reporting",
    requiredCount: 1,
  },
  {
    code: "evidence_builder",
    name: "Evidence Builder",
    description: "Added video evidence to strengthen a civic report",
    icon: "video",
    category: "quality",
    requiredCount: 1,
  },
  {
    code: "verified_voice",
    name: "Verified Voice",
    description: "Had 5 reports verified by officers",
    icon: "check-circle",
    category: "quality",
    requiredCount: 5,
  },
  {
    code: "problem_solver",
    name: "Problem Solver",
    description: "Contributed to 5 resolved civic issues",
    icon: "wrench",
    category: "resolution",
    requiredCount: 5,
  },
  {
    code: "seven_day_streak",
    name: "7-Day Civic Streak",
    description: "Stayed active for 7 civic participation events",
    icon: "flame",
    category: "streak",
    requiredCount: 7,
  },
  {
    code: "city_hero",
    name: "City Hero",
    description: "Reached 1000 citizen points",
    icon: "award",
    category: "special",
    requiredPoints: 1000,
  },
] as const;

export const seedDefaultBadges = mutation({
  args: {},

  handler: async (ctx) => {
    const created = [];
    const skipped = [];

    for (const badge of DEFAULT_BADGES) {
      const existing = await ctx.db
        .query("badges")
        .withIndex("by_code", (q) => q.eq("code", badge.code))
        .first();

      if (existing) {
        skipped.push(badge.code);
        continue;
      }

      const badgeId = await ctx.db.insert("badges", {
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        requiredPoints: "requiredPoints" in badge ? badge.requiredPoints : undefined,
        requiredCount: "requiredCount" in badge ? badge.requiredCount : undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      created.push(badgeId);
    }

    return {
      created,
      skipped,
    };
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