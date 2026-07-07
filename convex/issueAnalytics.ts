import { v } from 'convex/values';
import { query } from './_generated/server';
import { Id } from './_generated/dataModel';
import {
  analyseIssueTrends,
  analyseCurrentIssueTrend,
  normalizeKey,
  departmentMatchesCategory,
  isPendingDuplicateReviewStatus
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
