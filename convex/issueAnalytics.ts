import { requireApprovedUnitOfficer } from './officerAuth';
import { v } from 'convex/values';
import { query } from './_generated/server';
import { Id } from './_generated/dataModel';
import {
  analyseIssueTrends,
  analyseCurrentIssueTrend,
  normalizeKey,
  departmentMatchesCategory,
  isPendingDuplicateReviewStatus,
  buildRecurringPatterns,
  buildCityTrendBreakdown,
  buildDepartmentTrendBreakdown,
  buildSystemAdminDuplicateTrend,
  buildSystemSlaAnalytics,
  buildEscalationAnalytics,
  buildCityAwareHotspots,
  buildSystemAdminTrendRecommendations,
} from '../lib/trendAnalyzer';

const rangeValidation = v.optional(v.number());

async function getUnitOfficerAnalyticsIssuePool(ctx: any, unitOfficer: any, userId: string) {
  const activeIds = unitOfficer.activeIssueIds || [];
  const resolvedIds = unitOfficer.resolvedIssueIds || [];
  const allIds = Array.from(new Set([...activeIds, ...resolvedIds]));

  // 1. Fetch by IDs in activeIssueIds and resolvedIssueIds
  const fetched = await Promise.all(allIds.map((id) => ctx.db.get(id)));
  const fetchedByIds = fetched.filter(Boolean);

  // 2. Fetch by assigned unit officer
  const assignedIssues = await ctx.db
    .query('issues')
    .withIndex('by_assigned_unit_officer', (q: any) => q.eq('assignedUnitOfficer', userId))
    .collect();

  // 3. Fetch by city for duplicate review/assignment (scoped by city and department matches)
  const cityIssues = await ctx.db
    .query('issues')
    .withIndex('by_city', (q: any) => q.eq('city', unitOfficer.city))
    .collect();

  const matchingCityDeptIssues = cityIssues.filter((issue: any) => {
    // Matches category / department
    const isCategoryMatch = departmentMatchesCategory(unitOfficer.department, issue.category);
    // Visible for duplicate review or assignment (pending, reopened, verified, etc.)
    const status = normalizeKey(issue.status);
    const isDuplicateOrUnassigned = ['pending', 'reopened', 'verified'].includes(status) ||
                                    !issue.assignedUnitOfficer ||
                                    issue.assignedUnitOfficer === userId;
    return isCategoryMatch && isDuplicateOrUnassigned;
  });

  // Merge and deduplicate by _id
  const merged = [...fetchedByIds, ...assignedIssues, ...matchingCityDeptIssues];
  const uniqueIssues = Array.from(new Map(merged.map((issue) => [String(issue._id), issue])).values());

  return {
    uniqueIssues,
    counts: {
      activeIdsCount: activeIds.length,
      resolvedIdsCount: resolvedIds.length,
      fetchedByIdsCount: fetchedByIds.length,
      fetchedByVisibilityCount: matchingCityDeptIssues.length,
      finalPoolCount: uniqueIssues.length,
    }
  };
}

export const getUnitOfficerTrendAnalytics = query({
  args: {
    userId: v.id('users'),
    days: rangeValidation,
  },
  handler: async (ctx, args) => {
    await requireApprovedUnitOfficer(ctx, args.userId);
    const unitOfficer = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    const selectedDays = args.days ?? 30;
    const isAllTime = selectedDays === 0;

    if (!unitOfficer) {
      return {
        scope: {
          userId: args.userId,
          unitOfficerId: '' as any,
          city: '',
          state: '',
          department: '',
          days: selectedDays,
          rangeLabel: isAllTime ? 'All Time' : `${selectedDays} Days`,
          isAllTime,
          totalIssuesAnalysed: 0,
          generatedAt: Date.now(),
          debugCounts: {
            activeIdsCount: 0,
            resolvedIdsCount: 0,
            fetchedByIdsCount: 0,
            fetchedByVisibilityCount: 0,
            finalPoolCount: 0,
            scopedIssuesCount: 0,
            duplicateRelevantCount: 0,
            duplicateGroups: 0,
            hotspotAreas: 0,
            hotspotIssueCount: 0,
          }
        },
        summary: {
          totalIssues: 0,
          totalIssuesAnalysed: 0,
          currentWindowIssues: 0,
          previousWindowIssues: 0,
          isAllTime,
          activeIssues: 0,
          resolvedIssues: 0,
          pendingIssues: 0,
          rejectedIssues: 0,
          reopenedIssues: 0,
          escalatedIssues: 0,
          overdueIssues: 0,
          duplicateGroups: 0,
          duplicateIssues: 0,
          duplicateRate: 0,
          hotspotAreaCount: 0,
          hotspotIssueCount: 0,
          criticalHotspotCount: 0,
          slaRiskCount: 0,
          avgResolutionTimeHours: 0,
          avgVerificationTimeHours: 0,
        },
        trendDirection: {
          currentWindowCount: 0,
          previousWindowCount: 0,
          changePercent: 0,
          direction: 'stable' as const,
          label: 'No data yet',
        },
        categoryTrends: [],
        subcategoryTrends: [],
        priorityDistribution: [],
        statusDistribution: [],
        duplicateTrend: {
          totalGroups: 0,
          totalDuplicateIssues: 0,
          duplicateRate: 0,
          strongestGroupScore: 0,
          highConfidenceGroups: 0,
          topDuplicateCategories: [],
          topDuplicateSubcategories: [],
          recentDuplicateGroups: [],
        },
        hotspotTrends: [],
        slaTrends: {
          overdueCount: 0,
          dueSoonCount: 0,
          onTrackCount: 0,
          notSetCount: 0,
          overdueRate: 0,
          mostOverdueCategory: 'None',
          avgSlaDelayHours: 0,
        },
        recurringPatterns: [],
        recommendations: [
          {
            type: 'normal' as const,
            severity: 'low' as const,
            title: 'No Data',
            message: 'No trend data available yet. Trends will appear as more issues are reported and processed.',
            relatedCategory: 'General',
            relatedSubcategory: 'General',
            relatedIssueIds: [],
          },
        ],
      };
    }

    const { uniqueIssues, counts } = await getUnitOfficerAnalyticsIssuePool(ctx, unitOfficer, args.userId);

    const scopedIssues = uniqueIssues.filter(
      (issue) =>
        normalizeKey(issue.city) === normalizeKey(unitOfficer.city) &&
        departmentMatchesCategory(unitOfficer.department, issue.category)
    );

    const duplicateRelevantCount = scopedIssues.filter((i) =>
      isPendingDuplicateReviewStatus(i.status)
    ).length;

    const analytics = analyseIssueTrends(scopedIssues, {
      days: isAllTime ? undefined : selectedDays,
      allTime: isAllTime,
    });

    return {
      scope: {
        userId: args.userId,
        unitOfficerId: unitOfficer._id,
        city: unitOfficer.city,
        state: unitOfficer.state,
        department: unitOfficer.department,
        days: selectedDays,
        rangeLabel: isAllTime ? 'All Time' : `${selectedDays} Days`,
        isAllTime,
        totalIssuesAnalysed: scopedIssues.length,
        generatedAt: Date.now(),
        debugCounts: {
          ...counts,
          scopedIssuesCount: scopedIssues.length,
          duplicateRelevantCount,
          duplicateGroups: analytics.duplicateTrend.totalGroups,
          hotspotAreas: analytics.hotspotTrends.length,
          hotspotIssueCount: analytics.summary.hotspotIssueCount,
        }
      },
      ...analytics,
    };
  },
});

export const getCurrentIssueTrendAnalysis = query({
  args: {
    userId: v.id('users'),
    issueId: v.id('issues'),
    days: rangeValidation,
  },
  handler: async (ctx, args) => {
    await requireApprovedUnitOfficer(ctx, args.userId);
    const unitOfficer = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!unitOfficer) {
      throw new Error('Unit Officer not found');
    }

    const issue = await ctx.db.get(args.issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const isAllowed =
      (unitOfficer.activeIssueIds || []).includes(args.issueId) ||
      (unitOfficer.resolvedIssueIds || []).includes(args.issueId) ||
      issue.assignedUnitOfficer === args.userId;

    if (!isAllowed) {
      throw new Error('Unauthorized access to issue trend analysis');
    }

    const { uniqueIssues } = await getUnitOfficerAnalyticsIssuePool(ctx, unitOfficer, args.userId);

    const scopedIssues = uniqueIssues.filter(
      (i) =>
        normalizeKey(i.city) === normalizeKey(unitOfficer.city) &&
        departmentMatchesCategory(unitOfficer.department, i.category)
    );

    const pool = [...scopedIssues];
    if (!pool.some((i) => String(i._id) === String(issue._id))) {
      pool.push(issue);
    }

    const analysis = analyseCurrentIssueTrend(issue, pool, { days: args.days ?? 90 });

    return analysis;
  },
});

export const getSystemAdminCitywideTrendAnalytics = query({
  args: {
    userId: v.id('users'),
    city: v.optional(v.string()),
    department: v.optional(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch user & verify allowed role
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error('User not found');
    }
    const role = normalizeKey(user.role);
    const allowedRoles = new Set(['admin', 'system_admin', 'administrator']);
    if (!allowedRoles.has(role)) {
      throw new Error('Unauthorized access to system administration analytics');
    }

    // 2. Fetch all issues or city-scoped issues
    let allIssues = [];
    if (args.city) {
      allIssues = await ctx.db
        .query('issues')
        .withIndex('by_city', (q: any) => q.eq('city', args.city as string))
        .collect();
    } else {
      allIssues = await ctx.db.query('issues').collect();
    }

    // 3. Apply category/department filter
    const scopedIssues = allIssues.filter((issue: any) => {
      const matchesCity = !args.city || normalizeKey(issue.city) === normalizeKey(args.city);
      const matchesDepartment =
        !args.department || departmentMatchesCategory(args.department, issue.category);
      return matchesCity && matchesDepartment;
    });

    const selectedDays = args.days ?? 30;
    const isAllTime = selectedDays === 0;
    const now = Date.now();

    // 4. Time cutoff filter (we filter scopedIssues to current selected range)
    let currentRangeIssues = scopedIssues;
    if (!isAllTime) {
      const cutoff = now - selectedDays * 24 * 60 * 60 * 1000;
      currentRangeIssues = scopedIssues.filter((i: any) => {
        const created = i.createdAt ?? i._creationTime ?? now;
        return created >= cutoff;
      });
    }

    // 5. Gather available cities & departments lists for frontend drop-downs
    const availableCities = [...new Set(allIssues.map((i: any) => i.city).filter(Boolean))].sort();
    const availableDepartments = [
      ...new Set(allIssues.map((i: any) => i.category).filter(Boolean)),
    ].sort();

    // 6. Base analytics for reporting change, status distribution, priorities, etc.
    const baseAnalytics = analyseIssueTrends(scopedIssues, {
      days: isAllTime ? undefined : selectedDays,
      allTime: isAllTime,
    });

    // 7. System Admin breakdowns, duplicates, SLA, escalations, hotspots, recommendations
    const cityBreakdown = buildCityTrendBreakdown(scopedIssues, now, selectedDays);
    const departmentBreakdown = buildDepartmentTrendBreakdown(scopedIssues, now, selectedDays);
    const systemDuplicateTrend = buildSystemAdminDuplicateTrend(currentRangeIssues);
    const systemSlaAnalytics = buildSystemSlaAnalytics(currentRangeIssues, now);
    const escalationAnalytics = buildEscalationAnalytics(currentRangeIssues, now);
    const cityAwareHotspots = buildCityAwareHotspots(currentRangeIssues, 500);
    const recurringPatterns = buildRecurringPatterns(currentRangeIssues, { radiusMeters: 500 });

    const systemRecommendations = buildSystemAdminTrendRecommendations({
      cityBreakdown: cityBreakdown as any[],
      departmentBreakdown: departmentBreakdown as any[],
      systemSlaAnalytics,
      escalationAnalytics,
      systemDuplicateTrend,
      hotspotTrends: cityAwareHotspots as any[],
    });

    // 8. Overall Risk Score
    const overdueRate = systemSlaAnalytics.overdueRate;
    const escalationRate = escalationAnalytics.escalationRate;
    const duplicateRate = systemDuplicateTrend.duplicateRate;
    const activeCount = currentRangeIssues.filter((i: any) =>
      [
        'assigned',
        'in_progress',
        'submitted_for_review',
        'pending_uo_verification',
        'rework_required',
        'escalated',
      ].includes(i.status)
    ).length;
    const unresolvedRate =
      currentRangeIssues.length > 0 ? (activeCount / currentRangeIssues.length) * 100 : 0;

    const systemRiskScore = Math.round(
      overdueRate * 0.4 + escalationRate * 0.25 + unresolvedRate * 0.2 + duplicateRate * 0.15
    );

    const systemRiskLevel =
      systemRiskScore >= 70
        ? 'critical'
        : systemRiskScore >= 50
          ? 'high'
          : systemRiskScore >= 30
            ? 'medium'
            : 'low';

    const mostAtRiskCity = cityBreakdown[0]?.city || 'None';
    const mostAtRiskDepartment = departmentBreakdown[0]?.department || 'None';

    return {
      scope: {
        userId: args.userId,
        role: user.role,
        city: args.city ?? 'all',
        department: args.department ?? 'all',
        days: selectedDays,
        rangeLabel: isAllTime ? 'All Time' : `${selectedDays} Days`,
        isAllTime,
        totalIssuesAnalysed: currentRangeIssues.length,
        generatedAt: now,
      },

      filters: {
        availableCities,
        availableDepartments,
        selectedCity: args.city ?? 'all',
        selectedDepartment: args.department ?? 'all',
      },

      summary: {
        ...baseAnalytics.summary,
        totalIssues: currentRangeIssues.length,
        totalCities: cityBreakdown.length,
        totalDepartments: departmentBreakdown.length,
        totalEscalatedIssues: escalationAnalytics.totalEscalatedIssues,
        unresolvedEscalations: escalationAnalytics.unresolvedEscalations,
        systemRiskScore,
        systemRiskLevel,
        mostAtRiskCity,
        mostAtRiskDepartment,
        pendingDuplicateCandidateCount: systemDuplicateTrend.activeDuplicateCandidateCount,
        duplicateGroups: systemDuplicateTrend.totalGroups,
        duplicateIssues: systemDuplicateTrend.duplicateGroupIssueCount,
        redundantDuplicateIssues: systemDuplicateTrend.redundantDuplicateIssues,
        duplicateRate: systemDuplicateTrend.duplicateRate,
      },

      trendDirection: baseAnalytics.trendDirection,
      statusDistribution: baseAnalytics.statusDistribution,
      priorityDistribution: baseAnalytics.priorityDistribution,
      categoryTrends: baseAnalytics.categoryTrends,
      subcategoryTrends: baseAnalytics.subcategoryTrends,

      cityBreakdown: cityBreakdown as any[],
      departmentBreakdown: departmentBreakdown as any[],
      systemDuplicateTrend,
      hotspotTrends: cityAwareHotspots as any[],
      systemSlaAnalytics,
      escalationAnalytics,
      recurringPatterns: recurringPatterns as any[],
      recommendations: systemRecommendations as any[],

      debugCounts: {
        allIssueCount: allIssues.length,
        scopedIssueCount: scopedIssues.length,
        selectedRangeIssueCount: currentRangeIssues.length,
        cityCount: availableCities.length,
        departmentCount: availableDepartments.length,
        activeDuplicateCandidateCount: systemDuplicateTrend.activeDuplicateCandidateCount,
        duplicateGroupCount: systemDuplicateTrend.totalGroups,
        hotspotCount: cityAwareHotspots.length,
        slaApplicableCount: systemSlaAnalytics.applicableIssueCount,
        overdueCount: systemSlaAnalytics.overdueCount,
        dueSoonCount: systemSlaAnalytics.dueSoonCount,
        escalationCount: escalationAnalytics.totalEscalatedIssues,
      },
    };
  },
});