import { Id } from "convex/_generated/dataModel";
import {
  POINT_RULES,
  PointTransactionType,
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

function calculateStreak(previousLastActivityAt?: number) {
  const now = Date.now();

  if (!previousLastActivityAt) {
    return {
      shouldContinueStreak: false,
      isNewStreak: true,
    };
  }

  const oneDay = 24 * 60 * 60 * 1000;
  const difference = now - previousLastActivityAt;

  return {
    shouldContinueStreak: difference <= oneDay * 2,
    isNewStreak: difference > oneDay * 2,
  };
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

  const streakStatus = calculateStreak(citizen.lastActivityAt);

  const currentStreak = streakStatus.shouldContinueStreak
    ? (citizen.currentStreak ?? 0) + 1
    : 1;

  const longestStreak = Math.max(citizen.longestStreak ?? 0, currentStreak);

  const patchData: Record<string, any> = {
    points: newPoints,
    level: levelData.level,
    levelTitle: levelData.title,
    currentStreak,
    longestStreak,
    lastActivityAt: Date.now(),
    updatedAt: Date.now(),
  };

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
    relatedIssueId: args.relatedIssueId,
    reason: `Badge earned: ${badge.name}`,
    relatedBadgeId: badge._id,
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

  const awardedBadges = [];

  if ((citizen.reportsSubmitted ?? 0) >= 1) {
    const result = await awardBadgeIfNotExists(ctx, {
      citizenId: args.citizenId,
      userId: args.userId,
      badgeCode: "first_reporter",
      relatedIssueId: args.relatedIssueId,
      reason: "Submitted first civic issue",
    });

    if (result.awarded) awardedBadges.push(result.badge);
  }

  if ((citizen.videoEvidenceAdded ?? 0) >= 1) {
    const result = await awardBadgeIfNotExists(ctx, {
      citizenId: args.citizenId,
      userId: args.userId,
      badgeCode: "evidence_builder",
      relatedIssueId: args.relatedIssueId,
      reason: "Added video evidence to strengthen a civic report",
    });

    if (result.awarded) awardedBadges.push(result.badge);
  }

  if ((citizen.reportsVerified ?? 0) >= 5) {
    const result = await awardBadgeIfNotExists(ctx, {
      citizenId: args.citizenId,
      userId: args.userId,
      badgeCode: "verified_voice",
      relatedIssueId: args.relatedIssueId,
      reason: "Had 5 reports verified by officers",
    });

    if (result.awarded) awardedBadges.push(result.badge);
  }

  if ((citizen.reportsResolved ?? 0) >= 5) {
    const result = await awardBadgeIfNotExists(ctx, {
      citizenId: args.citizenId,
      userId: args.userId,
      badgeCode: "problem_solver",
      relatedIssueId: args.relatedIssueId,
      reason: "Contributed to 5 resolved civic issues",
    });

    if (result.awarded) awardedBadges.push(result.badge);
  }

  if ((citizen.currentStreak ?? 0) >= 7) {
    const result = await awardBadgeIfNotExists(ctx, {
      citizenId: args.citizenId,
      userId: args.userId,
      badgeCode: "seven_day_streak",
      relatedIssueId: args.relatedIssueId,
      reason: "Maintained a 7-day civic participation streak",
    });

    if (result.awarded) awardedBadges.push(result.badge);
  }

  if ((citizen.points ?? 0) >= 1000) {
    const result = await awardBadgeIfNotExists(ctx, {
      citizenId: args.citizenId,
      userId: args.userId,
      badgeCode: "city_hero",
      relatedIssueId: args.relatedIssueId,
      reason: "Reached 1000 citizen points",
    });

    if (result.awarded) awardedBadges.push(result.badge);
  }

  return awardedBadges;
}