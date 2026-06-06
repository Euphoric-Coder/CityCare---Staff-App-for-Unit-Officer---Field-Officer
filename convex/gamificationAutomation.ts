import { calculateCitizenLevel, POINT_RULES } from "lib/gamificationConstants";
import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { awardCitizenPoints } from "lib/gamificationAwards";

type MutationCtx = any;

function normalizeStatus(status = "") {
  return status.toString().toLowerCase().trim();
}

function hasVideoEvidence(issue: any) {
  return Boolean(issue.videos);
}

function getCitizenCriteriaValue(citizen: any, criteriaType: string) {
  switch (criteriaType) {
    case "reports_submitted":
      return citizen.reportsSubmitted ?? 0;

    case "video_evidence_added":
      return citizen.videoEvidenceAdded ?? 0;

    case "reports_verified":
      return citizen.reportsVerified ?? 0;

    case "reports_resolved":
      return citizen.reportsResolved ?? 0;

    case "comments_added":
      return citizen.commentsAdded ?? 0;

    case "upvotes_received":
      return citizen.upvotesReceived ?? 0;

    case "current_streak":
      return citizen.currentStreak ?? 0;

    case "longest_streak":
      return citizen.longestStreak ?? 0;

    case "points_reached":
      return citizen.points ?? 0;

    case "manual":
      return 0;

    default:
      return 0;
  }
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

      const commentsAdded = comments.filter((comment) => !comment.isHidden).length;

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
    badge: any;
    reason: string;
  }
) {
  const alreadyEarned = await hasCitizenBadge(
    ctx,
    args.citizenId,
    args.badge.code
  );

  if (alreadyEarned) {
    return {
      awarded: false,
      badgeCode: args.badge.code,
      reason: "Badge already earned",
    };
  }

  if (!args.badge.isActive) {
    return {
      awarded: false,
      badgeCode: args.badge.code,
      reason: "Badge is inactive",
    };
  }

  await ctx.db.insert("citizenBadges", {
    citizenId: args.citizenId,
    userId: args.userId,

    badgeId: args.badge._id,
    badgeCode: args.badge.code,

    earnedAt: Date.now(),

    metadata: {
      reason: args.reason,
      pointsAwarded: args.badge.rewardPoints ?? POINT_RULES.badge_bonus,
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
    points: args.badge.rewardPoints ?? POINT_RULES.badge_bonus,
    reason: `Badge earned: ${args.badge.name}`,
    relatedBadgeId: args.badge._id,
    metadata: {
      source: "badge_cron",
    },
  });

  return {
    awarded: true,
    badgeCode: args.badge.code,
    badgeName: args.badge.name,
  };
}

export const rebuildCitizenBadges = internalMutation({
  args: {},

  handler: async (ctx) => {
    const citizens = await ctx.db.query("citizens").collect();

    const activeBadges = await ctx.db
      .query("badges")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

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

      const citizenAwardedBadges = [];

      for (const badge of activeBadges) {
        if (badge.criteriaType === "manual") {
          continue;
        }

        const citizenValue = getCitizenCriteriaValue(citizen, badge.criteriaType);
        const requiredCount = badge.requiredCount ?? 0;

        if (citizenValue >= requiredCount) {
          const result = await awardCronBadge(ctx, {
            citizenId: citizen._id,
            userId: citizen.userId,
            badge,
            reason: `Criteria met: ${badge.criteriaType} reached ${requiredCount}`,
          });

          if (result.awarded) {
            citizenAwardedBadges.push(result);
          }
        }
      }

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
      activeBadgesChecked: activeBadges.length,
      totalBadgesAwarded,
      awarded,
      skipped,
      ranAt: Date.now(),
    };
  },
});