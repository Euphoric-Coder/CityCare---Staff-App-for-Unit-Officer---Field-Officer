import { calculateCitizenLevel, POINT_RULES } from "lib/gamificationConstants";
import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { awardCitizenPoints } from "lib/gamificationAwards";

function normalizeStatus(status = "") {
  return status.toString().toLowerCase().trim();
}

function hasVideoEvidence(issue: any) {
  return Boolean(
    issue.videos
  );
}

export const rebuildAllCitizenStats = internalMutation({
  args: {},

  handler: async (ctx) => {
    const citizens = await ctx.db.query("citizens").collect();

    let updated = 0;
    const skipped = [];

    for (const citizen of citizens) {
      if (!citizen.userId) {
        skipped.push(citizen._id);
        continue;
      }

      const issues = await ctx.db
        .query("issues")
        .withIndex("by_reporter", (q) => q.eq("reportedBy", citizen.userId))
        .collect();

      const comments = await ctx.db
        .query("issueDiscussionForum")
        .withIndex("by_citizen", (q) => q.eq("citizenId", citizen.userId))
        .collect();

      const pointTransactions = await ctx.db
        .query("citizenPointTransactions")
        .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
        .collect();

      const reportsSubmitted = issues.length;

      const reportsVerified = issues.filter((issue) => {
        const status = normalizeStatus(issue.status);

        return [
          "verified",
          "assigned",
          "in_progress",
          "pending_uo_verification",
          "rework_required",
          "resolved",
          "closed",
          "escalated",
          "reopened",
        ].includes(status);
      }).length;

      const reportsResolved = issues.filter((issue) => {
        const status = normalizeStatus(issue.status);

        return status === "resolved" || status === "closed";
      }).length;

      const reportsRejected = issues.filter((issue) => {
        const status = normalizeStatus(issue.status);

        return status === "rejected";
      }).length;

      const duplicateReports = pointTransactions.filter(
        (transaction) => transaction.type === "duplicate_report"
      ).length;

      const commentsAdded = comments.filter(
        (comment) => !comment.isHidden
      ).length;

      const videoEvidenceAdded = issues.filter(hasVideoEvidence).length;

      const totalPoints = pointTransactions.reduce(
        (sum, transaction) => sum + transaction.points,
        0
      );

      const points = Math.max(0, totalPoints);
      const levelData = calculateCitizenLevel(points);

      await ctx.db.patch(citizen._id, {
        reportsSubmitted,
        reportsVerified,
        reportsResolved,
        reportsRejected,
        duplicateReports,
        commentsAdded,
        videoEvidenceAdded,

        points,
        level: levelData.level,
        levelTitle: levelData.title,

        updatedAt: Date.now(),
      });

      updated += 1;
    }

    return {
      updated,
      skipped,
      totalCitizens: citizens.length,
      rebuiltAt: Date.now(),
    };
  },
});

type MutationCtx = any;

async function getBadgeByCode(ctx: MutationCtx, badgeCode: string) {
  return await ctx.db
    .query("badges")
    .withIndex("by_code", (q: any) => q.eq("code", badgeCode))
    .first();
}

async function hasCitizenBadge(
  ctx: MutationCtx,
  citizenId: Id<"citizens">,
  badgeCode: string
) {
  const existingBadge = await ctx.db
    .query("citizenBadges")
    .withIndex("by_citizen_badge_code", (q: any) =>
      q.eq("citizenId", citizenId).eq("badgeCode", badgeCode)
    )
    .first();

  return Boolean(existingBadge);
}

async function awardCronBadge(
  ctx: MutationCtx,
  args: {
    citizenId: Id<"citizens">;
    userId: Id<"users">;
    badgeCode: string;
    reason: string;
  }
) {
  const alreadyEarned = await hasCitizenBadge(
    ctx,
    args.citizenId,
    args.badgeCode
  );

  if (alreadyEarned) {
    return {
      awarded: false,
      badgeCode: args.badgeCode,
      reason: "Badge already earned",
    };
  }

  const badge = await getBadgeByCode(ctx, args.badgeCode);

  if (!badge || !badge.isActive) {
    return {
      awarded: false,
      badgeCode: args.badgeCode,
      reason: "Badge not found or inactive",
    };
  }

  await ctx.db.insert("citizenBadges", {
    citizenId: args.citizenId,
    userId: args.userId,

    badgeId: badge._id,
    badgeCode: badge.code,

    earnedAt: Date.now(),

    metadata: {
      reason: args.reason,
      pointsAwarded: POINT_RULES.badge_bonus,
    },
  });

  const citizen = await ctx.db.get(args.citizenId);

  if (citizen) {
    await ctx.db.patch(args.citizenId, {
      badgeCount: (citizen.badgeCount ?? 0) + 1,
      updatedAt: Date.now(),
    });
  }

  await awardCitizenPoints(ctx, {
    citizenId: args.citizenId,
    userId: args.userId,
    type: "badge_bonus",
    reason: `Badge earned: ${badge.name}`,
    relatedBadgeId: badge._id,
    metadata: {
      source: "badge_cron",
    },
  });

  return {
    awarded: true,
    badgeCode: args.badgeCode,
    badgeName: badge.name,
  };
}

async function checkCitizenBadgeEligibility(ctx: MutationCtx, citizen: any) {
  const awardedBadges = [];

  if ((citizen.reportsSubmitted ?? 0) >= 1) {
    const result = await awardCronBadge(ctx, {
      citizenId: citizen._id,
      userId: citizen.userId,
      badgeCode: "first_reporter",
      reason: "Submitted first civic issue",
    });

    if (result.awarded) awardedBadges.push(result);
  }

  if ((citizen.videoEvidenceAdded ?? 0) >= 1) {
    const result = await awardCronBadge(ctx, {
      citizenId: citizen._id,
      userId: citizen.userId,
      badgeCode: "evidence_builder",
      reason: "Added video evidence to strengthen a civic report",
    });

    if (result.awarded) awardedBadges.push(result);
  }

  if ((citizen.reportsVerified ?? 0) >= 5) {
    const result = await awardCronBadge(ctx, {
      citizenId: citizen._id,
      userId: citizen.userId,
      badgeCode: "verified_voice",
      reason: "Had 5 reports verified by officers",
    });

    if (result.awarded) awardedBadges.push(result);
  }

  if ((citizen.reportsResolved ?? 0) >= 5) {
    const result = await awardCronBadge(ctx, {
      citizenId: citizen._id,
      userId: citizen.userId,
      badgeCode: "problem_solver",
      reason: "Contributed to 5 resolved civic issues",
    });

    if (result.awarded) awardedBadges.push(result);
  }

  if ((citizen.currentStreak ?? 0) >= 7) {
    const result = await awardCronBadge(ctx, {
      citizenId: citizen._id,
      userId: citizen.userId,
      badgeCode: "seven_day_streak",
      reason: "Maintained a 7-day civic participation streak",
    });

    if (result.awarded) awardedBadges.push(result);
  }

  if ((citizen.points ?? 0) >= 1000) {
    const result = await awardCronBadge(ctx, {
      citizenId: citizen._id,
      userId: citizen.userId,
      badgeCode: "city_hero",
      reason: "Reached 1000 citizen points",
    });

    if (result.awarded) awardedBadges.push(result);
  }

  return awardedBadges;
}

export const rebuildCitizenBadges = internalMutation({
  args: {},

  handler: async (ctx) => {
    const citizens = await ctx.db.query("citizens").collect();

    let checkedCitizens = 0;
    let totalBadgesAwarded = 0;

    const awarded = [];
    const skipped = [];

    for (const citizen of citizens) {
      if (!citizen.userId) {
        skipped.push({
          citizenId: citizen._id,
          reason: "Missing userId",
        });
        continue;
      }

      const citizenAwardedBadges = await checkCitizenBadgeEligibility(
        ctx,
        citizen
      );

      checkedCitizens += 1;
      totalBadgesAwarded += citizenAwardedBadges.length;

      if (citizenAwardedBadges.length > 0) {
        awarded.push({
          citizenId: citizen._id,
          userId: citizen.userId,
          fullName: citizen.fullName,
          badges: citizenAwardedBadges,
        });
      }
    }

    return {
      checkedCitizens,
      totalBadgesAwarded,
      awarded,
      skipped,
      ranAt: Date.now(),
    };
  },
});