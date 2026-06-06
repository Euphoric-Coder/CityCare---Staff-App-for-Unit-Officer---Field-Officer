import { Id } from "convex/_generated/dataModel";
import {
  POINT_RULES,
  PointTransactionType,
  BadgeCriteriaType,
  calculateCitizenLevel,
} from "lib/gamificationConstants";

type MutationCtx = any;

type AwardCitizenPointsArgs = {
  citizenId: Id<"citizens">;
  userId: Id<"users">;

  type: PointTransactionType;
  points?: number;
  reason?: string;

  relatedIssueId?: Id<"issues">;
  relatedCommentId?: Id<"issueDiscussionForum">;
  relatedReplyId?: Id<"issueDiscussionReplies">;
  relatedBadgeId?: Id<"badges">;

  metadata?: {
    officerId?: string;
    duplicateGroupId?: string;
    source?: string;
  };
};

function getDefaultReason(type: PointTransactionType) {
  const reasonMap: Record<PointTransactionType, string> = {
    issue_submitted: "Issue submitted successfully",
    video_evidence_added: "Video evidence added to report",

    issue_verified: "Issue verified by officer",
    issue_assigned: "Issue assigned for resolution",
    issue_resolved: "Issue resolved successfully",
    issue_closed: "Issue closed after resolution",

    comment_added: "Comment added to public discussion",
    comment_liked: "Comment received appreciation",
    report_upvoted: "Report received citizen upvote",

    streak_bonus: "Civic activity streak bonus",
    badge_bonus: "Badge achievement bonus",

    duplicate_report: "Duplicate report detected",
    issue_rejected: "Issue rejected by officer",
    issue_withdrawn: "Issue withdrawn by citizen",
    manual_adjustment: "Manual points adjustment",
  };

  return reasonMap[type];
}

function getISTDateKey(timestamp: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function calculateStreak(previousLastActivityAt?: number) {
  const now = Date.now();

  if (!previousLastActivityAt) {
    return {
      isSameDay: false,
      isNextDay: false,
      shouldReset: false,
    };
  }

  const todayKey = getISTDateKey(now);
  const lastKey = getISTDateKey(previousLastActivityAt);

  if (todayKey === lastKey) {
    return {
      isSameDay: true,
      isNextDay: false,
      shouldReset: false,
    };
  }

  const today = new Date(`${todayKey}T00:00:00+05:30`).getTime();
  const lastDay = new Date(`${lastKey}T00:00:00+05:30`).getTime();

  const oneDay = 24 * 60 * 60 * 1000;
  const dayDifference = Math.round((today - lastDay) / oneDay);

  return {
    isSameDay: false,
    isNextDay: dayDifference === 1,
    shouldReset: dayDifference > 1,
  };
}

function isStreakEligibleAction(type: PointTransactionType) {
  return ["issue_submitted", "video_evidence_added", "comment_added"].includes(type);
}

function getCitizenCriteriaValue(citizen: any, criteriaType: BadgeCriteriaType) {
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

export async function awardCitizenPoints(
  ctx: MutationCtx,
  args: AwardCitizenPointsArgs
) {
  const citizen = await ctx.db.get(args.citizenId);

  if (!citizen) {
    throw new Error("Citizen not found");
  }

  const points = args.points ?? POINT_RULES[args.type];
  const previousPoints = citizen.points ?? 0;
  const newPoints = Math.max(0, previousPoints + points);

  const levelData = calculateCitizenLevel(newPoints);

  await ctx.db.insert("citizenPointTransactions", {
    citizenId: args.citizenId,
    userId: args.userId,

    type: args.type,
    points,
    reason: args.reason ?? getDefaultReason(args.type),

    relatedIssueId: args.relatedIssueId,
    relatedCommentId: args.relatedCommentId,
    relatedReplyId: args.relatedReplyId,
    relatedBadgeId: args.relatedBadgeId,

    metadata: {
      previousPoints,
      newPoints,
      officerId: args.metadata?.officerId,
      duplicateGroupId: args.metadata?.duplicateGroupId,
      source: args.metadata?.source,
    },

    createdAt: Date.now(),
  });

  const patchData: Record<string, any> = {
    points: newPoints,
    level: levelData.level,
    levelTitle: levelData.title,
    updatedAt: Date.now(),
  };

  if (isStreakEligibleAction(args.type)) {
    const streakStatus = calculateStreak(citizen.lastActivityAt);

    let currentStreak = citizen.currentStreak ?? 0;

    if (streakStatus.isSameDay) {
      currentStreak = Math.max(citizen.currentStreak ?? 1, 1);
    } else if (streakStatus.isNextDay) {
      currentStreak = (citizen.currentStreak ?? 0) + 1;
    } else {
      currentStreak = 1;
    }

    const longestStreak = Math.max(citizen.longestStreak ?? 0, currentStreak);

    patchData.currentStreak = currentStreak;
    patchData.longestStreak = longestStreak;
    patchData.lastActivityAt = Date.now();
  }

  switch (args.type) {
    case "issue_submitted":
      patchData.reportsSubmitted = (citizen.reportsSubmitted ?? 0) + 1;
      break;

    case "video_evidence_added":
      patchData.videoEvidenceAdded = (citizen.videoEvidenceAdded ?? 0) + 1;
      break;

    case "issue_verified":
      patchData.reportsVerified = (citizen.reportsVerified ?? 0) + 1;
      break;

    case "issue_resolved":
    case "issue_closed":
      patchData.reportsResolved = (citizen.reportsResolved ?? 0) + 1;
      break;

    case "issue_rejected":
      patchData.reportsRejected = (citizen.reportsRejected ?? 0) + 1;
      break;

    case "duplicate_report":
      patchData.duplicateReports = (citizen.duplicateReports ?? 0) + 1;
      break;

    case "comment_added":
      patchData.commentsAdded = (citizen.commentsAdded ?? 0) + 1;
      break;

    case "report_upvoted":
      patchData.upvotesReceived = (citizen.upvotesReceived ?? 0) + 1;
      break;
  }

  await ctx.db.patch(args.citizenId, patchData);

  return {
    previousPoints,
    newPoints,
    pointsChanged: points,
    level: levelData.level,
    levelTitle: levelData.title,
  };
}

export async function awardBadgeIfNotExists(
  ctx: MutationCtx,
  args: {
    citizenId: Id<"citizens">;
    userId: Id<"users">;
    badgeCode: string;
    relatedIssueId?: Id<"issues">;
    reason?: string;
  }
) {
  const existingCitizenBadge = await ctx.db
    .query("citizenBadges")
    .withIndex("by_citizen_badge_code", (q: any) =>
      q.eq("citizenId", args.citizenId).eq("badgeCode", args.badgeCode)
    )
    .first();

  if (existingCitizenBadge) {
    return {
      awarded: false,
      reason: "Badge already earned",
    };
  }

  const badge = await ctx.db
    .query("badges")
    .withIndex("by_code", (q: any) => q.eq("code", args.badgeCode))
    .first();

  if (!badge || !badge.isActive) {
    return {
      awarded: false,
      reason: "Badge not found or inactive",
    };
  }

  await ctx.db.insert("citizenBadges", {
    citizenId: args.citizenId,
    userId: args.userId,
    badgeId: badge._id,
    badgeCode: badge.code,
    earnedAt: Date.now(),
    relatedIssueId: args.relatedIssueId,
    metadata: {
      reason: args.reason ?? badge.description,
      pointsAwarded: badge.rewardPoints ?? POINT_RULES.badge_bonus,
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
    points: badge.rewardPoints ?? POINT_RULES.badge_bonus,
    relatedIssueId: args.relatedIssueId,
    reason: `Badge earned: ${badge.name}`,
    relatedBadgeId: badge._id,
    metadata: {
      source: "badge_award",
    },
  });

  return {
    awarded: true,
    badge,
  };
}

export async function checkAndAwardCitizenBadges(
  ctx: MutationCtx,
  args: {
    citizenId: Id<"citizens">;
    userId: Id<"users">;
    relatedIssueId?: Id<"issues">;
  }
) {
  const citizen = await ctx.db.get(args.citizenId);

  if (!citizen) return [];

  const activeBadges = await ctx.db
    .query("badges")
    .withIndex("by_active", (q: any) => q.eq("isActive", true))
    .collect();

  const awardedBadges = [];

  for (const badge of activeBadges) {
    if (badge.criteriaType === "manual") {
      continue;
    }

    const citizenValue = getCitizenCriteriaValue(citizen, badge.criteriaType);
    const requiredCount = badge.requiredCount ?? 0;

    if (citizenValue >= requiredCount) {
      const result = await awardBadgeIfNotExists(ctx, {
        citizenId: args.citizenId,
        userId: args.userId,
        badgeCode: badge.code,
        relatedIssueId: args.relatedIssueId,
        reason: `Criteria met: ${badge.criteriaType} reached ${requiredCount}`,
      });

      if (result.awarded) {
        awardedBadges.push(result.badge);
      }
    }
  }

  return awardedBadges;
}