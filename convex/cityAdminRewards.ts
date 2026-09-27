import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { calculateCitizenLevel } from '../lib/gamificationConstants';
import { awardBadgeIfNotExists, checkAndAwardCitizenBadges } from '../lib/gamificationAwards';

function normalizeText(str) {
  return String(str || '')
    .trim()
    .toLowerCase();
}

async function requireCityAdmin(ctx, userId) {
  const user = await ctx.db.get(userId);
  if (!user || user.role !== 'city_admin') {
    throw new Error('CITY_ADMIN_REQUIRED: City Administrator access is required.');
  }

  const profile = await ctx.db
    .query('cityAdmins')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();

  if (!profile) {
    throw new Error('CITY_ADMIN_PROFILE_NOT_FOUND: City Admin profile not found.');
  }

  return { user, profile };
}

/**
 * Get City-wide Citizen Rewards & Leaderboard Overview
 * Strictly city-scoped to the authenticated City Admin's assigned city.
 */
export const getCityCitizenRewardsOverview = query({
  args: {
    cityAdminUserId: v.id('users'),
  },

  handler: async (ctx, args) => {
    const { profile } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const city = profile.city;

    // Fetch all citizens belonging to this city using by_city index or by_city_points
    const rawCitizens = await ctx.db
      .query('citizens')
      .withIndex('by_city_points', (q) => q.eq('city', city))
      .order('desc')
      .collect();

    // Deterministic sort: points desc -> badgeCount desc -> reportsResolved desc -> reportsSubmitted desc
    const sortedCitizens = [...rawCitizens].sort((a, b) => {
      const pA = Number(a.points ?? 0);
      const pB = Number(b.points ?? 0);
      if (pB !== pA) return pB - pA;

      const bA = Number(a.badgeCount ?? 0);
      const bB = Number(b.badgeCount ?? 0);
      if (bB !== bA) return bB - bA;

      const rA = Number(a.reportsResolved ?? 0);
      const rB = Number(b.reportsResolved ?? 0);
      if (rB !== rA) return rB - rA;

      const sA = Number(a.reportsSubmitted ?? 0);
      const sB = Number(b.reportsSubmitted ?? 0);
      return sB - sA;
    });

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let totalPointsInCirculation = 0;
    let totalBadgesEarned = 0;
    let activeCitizensCount = 0;

    // Build normalized leaderboard records
    const leaderboard = sortedCitizens.map((citizen, index) => {
      const points = Number(citizen.points ?? 0);
      const badgeCount = Number(citizen.badgeCount ?? 0);

      totalPointsInCirculation += points;
      totalBadgesEarned += badgeCount;

      if (citizen.lastActivityAt && citizen.lastActivityAt >= thirtyDaysAgo) {
        activeCitizensCount += 1;
      }

      return {
        rank: index + 1,
        citizenId: citizen._id,
        userId: citizen.userId,
        displayName: citizen.fullName || 'Citizen',
        city: citizen.city,
        region: citizen.region || null,
        points,
        level: citizen.level ?? 1,
        levelTitle: citizen.levelTitle || 'New Citizen',
        badgeCount,
        reportsSubmitted: citizen.reportsSubmitted ?? 0,
        reportsVerified: citizen.reportsVerified ?? 0,
        reportsResolved: citizen.reportsResolved ?? 0,
        reportsRejected: citizen.reportsRejected ?? 0,
        currentStreak: citizen.currentStreak ?? 0,
        longestStreak: citizen.longestStreak ?? 0,
        lastActivityAt: citizen.lastActivityAt || citizen.createdAt || null,
      };
    });

    // Calculate manual adjustment statistics across all citizens in this city
    let manualAddedPoints = 0;
    let manualDeductedPoints = 0;

    const citizenIdsSet = new Set(rawCitizens.map((c) => c._id));

    // Fetch manual point transactions to aggregate admin intervention totals
    const manualTransactions = await ctx.db
      .query('citizenPointTransactions')
      .withIndex('by_type', (q) => q.eq('type', 'manual_adjustment'))
      .collect();

    for (const tx of manualTransactions) {
      if (citizenIdsSet.has(tx.citizenId)) {
        if (tx.points > 0) {
          manualAddedPoints += tx.points;
        } else {
          manualDeductedPoints += Math.abs(tx.points);
        }
      }
    }

    const totalCitizens = leaderboard.length;
    const averagePoints =
      totalCitizens > 0 ? Math.round(totalPointsInCirculation / totalCitizens) : 0;

    return {
      city,
      stats: {
        totalCitizens,
        totalPointsInCirculation,
        averagePoints,
        totalBadgesEarned,
        activeCitizensCount,
        manualAddedPoints,
        manualDeductedPoints,
        manualNetAdjustment: manualAddedPoints - manualDeductedPoints,
      },
      leaderboard,
    };
  },
});

/**
 * Get Detailed Reward Profile & Transaction History for a Specific Citizen
 * Validates City Admin city scope for security.
 */
export const getCityCitizenRewardDetails = query({
  args: {
    cityAdminUserId: v.id('users'),
    citizenId: v.id('citizens'),
  },

  handler: async (ctx, args) => {
    const { profile } = await requireCityAdmin(ctx, args.cityAdminUserId);

    const citizen = await ctx.db.get(args.citizenId);
    if (!citizen) {
      throw new Error('CITIZEN_NOT_FOUND: Citizen record not found.');
    }

    if (normalizeText(citizen.city) !== normalizeText(profile.city)) {
      throw new Error('CITY_SCOPE_VIOLATION: Citizen belongs to another city.');
    }

    // Fetch earned badges
    const rawCitizenBadges = await ctx.db
      .query('citizenBadges')
      .withIndex('by_citizen', (q) => q.eq('citizenId', citizen._id))
      .collect();

    const earnedBadges = [];
    for (const cb of rawCitizenBadges) {
      const badge = await ctx.db.get(cb.badgeId);
      earnedBadges.push({
        citizenBadgeId: cb._id,
        badgeId: cb.badgeId,
        code: cb.badgeCode,
        name: badge?.name || cb.badgeCode,
        description: badge?.description || '',
        icon: badge?.icon || 'award',
        category: badge?.category || 'special',
        rewardPoints: badge?.rewardPoints ?? cb.metadata?.pointsAwarded ?? 0,
        earnedAt: cb.earnedAt,
        reason: cb.metadata?.reason || null,
      });
    }

    // Fetch all transaction history for this citizen
    const rawTransactions = await ctx.db
      .query('citizenPointTransactions')
      .withIndex('by_citizen', (q) => q.eq('citizenId', citizen._id))
      .collect();

    // Sort transactions newest first
    const transactions = [...rawTransactions].sort((a, b) => b.createdAt - a.createdAt);

    // Calculate point breakdown by category
    const pointBreakdown = {
      reporting: 0,
      verification: 0,
      resolution: 0,
      community: 0,
      streaks: 0,
      badges: 0,
      manualAdditions: 0,
      manualDeductions: 0,
      manualNet: 0,
    };

    const enrichedTransactions = [];

    for (const tx of transactions) {
      let issueCode = null;
      let issueTitle = null;

      if (tx.relatedIssueId) {
        const issue = await ctx.db.get(tx.relatedIssueId);
        if (issue) {
          issueCode = issue.issueCode;
          issueTitle = issue.title;
        }
      }

      // Breakdown accumulator
      if (tx.type === 'manual_adjustment') {
        if (tx.points > 0) {
          pointBreakdown.manualAdditions += tx.points;
        } else {
          pointBreakdown.manualDeductions += tx.points; // negative
        }
      } else if (tx.points > 0) {
        if (tx.type === 'issue_submitted' || tx.type === 'video_evidence_added') {
          pointBreakdown.reporting += tx.points;
        } else if (tx.type === 'issue_verified' || tx.type === 'issue_assigned') {
          pointBreakdown.verification += tx.points;
        } else if (tx.type === 'issue_resolved' || tx.type === 'issue_closed') {
          pointBreakdown.resolution += tx.points;
        } else if (tx.type === 'comment_added' || tx.type === 'comment_liked') {
          pointBreakdown.community += tx.points;
        } else if (tx.type === 'streak_bonus') {
          pointBreakdown.streaks += tx.points;
        } else if (tx.type === 'badge_bonus') {
          pointBreakdown.badges += tx.points;
        }
      }

      enrichedTransactions.push({
        id: tx._id,
        type: tx.type,
        points: tx.points,
        reason: tx.reason,
        createdAt: tx.createdAt,
        issueCode,
        issueTitle,
        relatedBadgeId: tx.relatedBadgeId,
        metadata: tx.metadata || null,
      });
    }

    pointBreakdown.manualNet = pointBreakdown.manualAdditions + pointBreakdown.manualDeductions;

    return {
      citizen: {
        citizenId: citizen._id,
        userId: citizen.userId,
        displayName: citizen.fullName || 'Citizen',
        city: citizen.city,
        region: citizen.region || null,
        points: citizen.points ?? 0,
        level: citizen.level ?? 1,
        levelTitle: citizen.levelTitle || 'New Citizen',
        badgeCount: citizen.badgeCount ?? earnedBadges.length,
        reportsSubmitted: citizen.reportsSubmitted ?? 0,
        reportsVerified: citizen.reportsVerified ?? 0,
        reportsResolved: citizen.reportsResolved ?? 0,
        reportsRejected: citizen.reportsRejected ?? 0,
        currentStreak: citizen.currentStreak ?? 0,
        longestStreak: citizen.longestStreak ?? 0,
        lastActivityAt: citizen.lastActivityAt || citizen.createdAt || null,
      },
      earnedBadges,
      transactions: enrichedTransactions,
      pointBreakdown,
    };
  },
});

/**
 * Manually Add or Reduce Citizen Points
 * Enforces mandatory reason, non-zero adjustment, non-negative balance, and city scoping.
 */
export const adjustCitizenPoints = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    citizenId: v.id('citizens'),
    adjustment: v.number(),
    reason: v.string(),
  },

  handler: async (ctx, args) => {
    const { profile } = await requireCityAdmin(ctx, args.cityAdminUserId);

    const citizen = await ctx.db.get(args.citizenId);
    if (!citizen) {
      throw new Error('CITIZEN_NOT_FOUND: Citizen record not found.');
    }

    if (normalizeText(citizen.city) !== normalizeText(profile.city)) {
      throw new Error(
        'CITY_SCOPE_VIOLATION: You cannot modify rewards for a citizen outside your city.'
      );
    }

    const adjustment = Math.round(args.adjustment);

    if (!Number.isFinite(adjustment) || adjustment === 0) {
      throw new Error('POINT_ADJUSTMENT_REQUIRED: Adjustment must be a non-zero integer.');
    }

    const trimmedReason = args.reason.trim();
    if (trimmedReason.length < 5) {
      throw new Error(
        'ADJUSTMENT_REASON_REQUIRED: Please provide a meaningful reason (at least 5 characters).'
      );
    }

    if (Math.abs(adjustment) > 5000) {
      throw new Error(
        'POINT_ADJUSTMENT_TOO_LARGE: Manual point adjustments cannot exceed ±5,000 points per transaction.'
      );
    }

    const currentPoints = Number(citizen.points ?? 0);
    const nextPoints = currentPoints + adjustment;

    if (nextPoints < 0) {
      throw new Error(
        `INSUFFICIENT_POINTS: This deduction (${adjustment} pts) would reduce the citizen's balance below zero (current: ${currentPoints} pts).`
      );
    }

    const levelData = calculateCitizenLevel(nextPoints);

    // Record immutable audit transaction
    await ctx.db.insert('citizenPointTransactions', {
      citizenId: citizen._id,
      userId: citizen.userId,
      type: 'manual_adjustment',
      points: adjustment,
      reason: trimmedReason,
      metadata: {
        previousPoints: currentPoints,
        newPoints: nextPoints,
        officerId: args.cityAdminUserId,
        source: 'city_admin_manual',
      },
      createdAt: Date.now(),
    });

    // Patch citizen total and level
    await ctx.db.patch(citizen._id, {
      points: nextPoints,
      level: levelData.level,
      levelTitle: levelData.title,
      updatedAt: Date.now(),
    });

    // Check automatic badge criteria qualification after point adjustment
    await checkAndAwardCitizenBadges(ctx, {
      citizenId: citizen._id,
      userId: citizen.userId,
    });

    return {
      success: true,
      citizenId: citizen._id,
      previousPoints: currentPoints,
      adjustment,
      newPoints: nextPoints,
      reason: trimmedReason,
    };
  },
});

/**
 * Award Manual Badge to Citizen
 * Validates City Admin city scope and ensures badge criteriaType === "manual".
 */
export const awardCityCitizenManualBadge = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    citizenId: v.id('citizens'),
    badgeCode: v.string(),
    reason: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const { profile } = await requireCityAdmin(ctx, args.cityAdminUserId);

    const citizen = await ctx.db.get(args.citizenId);
    if (!citizen) {
      throw new Error('CITIZEN_NOT_FOUND: Citizen record not found.');
    }

    if (normalizeText(citizen.city) !== normalizeText(profile.city)) {
      throw new Error(
        'CITY_SCOPE_VIOLATION: You cannot award badges to a citizen outside your city.'
      );
    }

    const badge = await ctx.db
      .query('badges')
      .withIndex('by_code', (q) => q.eq('code', args.badgeCode))
      .first();

    if (!badge) {
      throw new Error('BADGE_NOT_FOUND: Badge not found.');
    }

    if (!badge.isActive) {
      throw new Error('BADGE_INACTIVE: This badge is inactive and cannot be awarded.');
    }

    if (badge.criteriaType !== 'manual') {
      throw new Error('MANUAL_BADGE_ONLY: Only manual criteria badges can be manually awarded.');
    }

    return await awardBadgeIfNotExists(ctx, {
      citizenId: citizen._id,
      userId: citizen.userId,
      badgeCode: badge.code,
      reason: args.reason ?? `Manual badge awarded by City Admin: ${badge.name}`,
    });
  },
});
