import { v } from 'convex/values';
import { query } from './_generated/server';
import { Id } from './_generated/dataModel';

const rangeValidation = v.optional(
  v.union(v.literal('7d'), v.literal('30d'), v.literal('90d'), v.literal('all'))
);

// --- Status Sets & Canonical Normalization ---

function normalizeStatus(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isCompletedStatus(status: unknown): boolean {
  const normalized = normalizeStatus(status);
  return normalized === 'resolved' || normalized === 'closed';
}

const FO_ACTIVE_STATUSES = new Set([
  'assigned',
  'in_progress',
  'submitted_for_review',
  'pending_uo_verification',
  'rework_required',
  'rework_requested',
  'reopened',
]);

const UO_ACTIVE_STATUSES = new Set([
  'pending',
  'verified',
  'assigned',
  'in_progress',
  'submitted_for_review',
  'pending_uo_verification',
  'rework_required',
  'rework_requested',
  'reopened',
  'escalated',
]);

// --- Citizen Feedback Extractor ---

function getIssueCitizenFeedback(issue: any) {
  if (!issue) {
    return {
      hasFeedback: false,
      rating: null,
      comment: null,
      submittedAt: null,
    };
  }

  const rawRating = issue.citizenRating;
  const ratingVal = rawRating !== undefined && rawRating !== null ? safeNumber(rawRating, -1) : -1;

  // Supports 0.5 to 5 stars
  const validRating = ratingVal >= 0.5 && ratingVal <= 5 ? ratingVal : null;
  const comment = issue.citizenFeedback ?? null;
  const submittedAt = issue.citizenFeedbackAt ?? issue.closedAt ?? issue.resolvedAt ?? null;

  return {
    hasFeedback: validRating !== null,
    rating: validRating,
    comment,
    submittedAt,
  };
}

// --- Safe Math & Calculation Helpers ---

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safePercentage(numerator: unknown, denominator: unknown): number {
  const safeNumerator = safeNumber(numerator);
  const safeDenominator = safeNumber(denominator);

  if (safeDenominator <= 0) {
    return 0;
  }

  const value = (safeNumerator / safeDenominator) * 100;

  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function getRangeCutoff(range?: '7d' | '30d' | '90d' | 'all'): number | null {
  const selectedRange = range ?? '30d';

  if (selectedRange === 'all') {
    return null;
  }

  const days = selectedRange === '7d' ? 7 : selectedRange === '90d' ? 90 : 30;

  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function issueHasActivityInRange(issue: any, cutoff: number | null): boolean {
  if (cutoff === null) {
    return true;
  }

  const feedback = getIssueCitizenFeedback(issue);

  const activityTimes = [
    issue.createdAt,
    issue.assignedAt,
    issue.workStartedAt,
    issue.resolvedAt,
    issue.closedAt,
    issue.verificationChecklist?.verifiedAt,
    issue.rejection?.rejectedAt,
    issue.slaRejection?.rejectedAt,
    issue.lastReworkRequestedAt,
    issue.withdrawnAt,
    feedback.submittedAt,
    issue.citizenFeedbackAt,
    issue.escalation?.escalatedAt,
    issue.escalation?.resolvedAt,
    issue.lastSlaExtensionAt,
    issue.slaExtension?.extendedAt,
    issue.slaReassignment?.reassignedAt,
  ]
    .map((value) => safeNumber(value))
    .filter((value) => value > 0);

  return activityTimes.some((timestamp) => timestamp >= cutoff);
}

function filterByRange(issues: any[], range?: '7d' | '30d' | '90d' | 'all') {
  const cutoff = getRangeCutoff(range);
  return issues.filter((issue) => issueHasActivityInRange(issue, cutoff));
}

function calculateAvgResolutionTime(completedIssues: any[]) {
  if (completedIssues.length === 0) return 0;
  let totalMs = 0;
  let count = 0;
  for (const issue of completedIssues) {
    const endTime = issue.resolvedAt ?? issue.closedAt;
    if (endTime && issue.createdAt && endTime > issue.createdAt) {
      totalMs += endTime - issue.createdAt;
      count++;
    }
  }
  if (count === 0) return 0;
  return Math.round(totalMs / (3600 * 1000 * count));
}

/**
 * Reusable Helper: Retrieves all relevant issues for a Field Officer.
 * Separates current workload (assignedFieldOfficer === fo.userId) from
 * historical involvement (via issueUpdates or reassignment history).
 */
async function getFieldOfficerRelevantIssues(ctx: any, fieldOfficer: any) {
  const foUserId = fieldOfficer.userId;

  // 1. Current Issues
  const currentIssues = await ctx.db
    .query('issues')
    .withIndex('by_assigned_field_officer', (q: any) => q.eq('assignedFieldOfficer', foUserId))
    .collect();

  const issueMap = new Map<string, any>();
  const currentIssueIds = new Set<string>();

  for (const issue of currentIssues) {
    if (issue) {
      const idStr = String(issue._id);
      issueMap.set(idStr, issue);
      currentIssueIds.add(idStr);
    }
  }

  // 2. Historical Issues via issueUpdates where updatedBy === foUserId
  const updatesByFo = await ctx.db
    .query('issueUpdates')
    .withIndex('by_updated_by', (q: any) => q.eq('updatedBy', foUserId))
    .collect();

  const historicalIssueIds = new Set<string>();
  for (const update of updatesByFo) {
    if (update?.issueId) {
      historicalIssueIds.add(String(update.issueId));
    }
  }

  // Batch fetch any historical issues not already in currentIssues
  for (const issueIdStr of historicalIssueIds) {
    if (!issueMap.has(issueIdStr)) {
      const fetchedIssue = await ctx.db.get(issueIdStr as Id<'issues'>);
      if (fetchedIssue) {
        issueMap.set(issueIdStr, fetchedIssue);
      }
    }
  }

  const allRelevantIssues = Array.from(issueMap.values());
  const historicalIssues = allRelevantIssues.filter(
    (issue) => !currentIssueIds.has(String(issue._id))
  );

  return {
    currentIssues,
    historicalIssues,
    allRelevantIssues,
  };
}

/**
 * Robust Multi-Strategy Helper to find all Team Field Officers for a Unit Officer.
 * Ensures provisioned officers, assigned officers, and matching city/department FOs are included.
 */
async function getTeamFieldOfficersForUnitOfficer(ctx: any, unitOfficer: any) {
  const foMap = new Map<string, any>();

  // 1. Query by reportingUnitOfficerId index
  if (unitOfficer._id) {
    const byReporting = await ctx.db
      .query('fieldOfficers')
      .withIndex('by_unit_officer', (q: any) => q.eq('reportingUnitOfficerId', unitOfficer._id))
      .collect();

    for (const fo of byReporting) {
      if (fo) foMap.set(String(fo._id), fo);
    }
  }

  // 2. Check unitOfficer.assignedFieldOfficers array if present
  if (Array.isArray(unitOfficer.assignedFieldOfficers)) {
    for (const foId of unitOfficer.assignedFieldOfficers) {
      if (foId) {
        const fo = await ctx.db.get(foId);
        if (fo) foMap.set(String(fo._id), fo);
      }
    }
  }

  // 3. Check issues assigned to this Unit Officer to find assigned Field Officers
  const uoIssues = await ctx.db
    .query('issues')
    .withIndex('by_assigned_unit_officer', (q: any) =>
      q.eq('assignedUnitOfficer', unitOfficer.userId)
    )
    .collect();

  for (const issue of uoIssues) {
    if (issue?.assignedFieldOfficer) {
      const fo = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q: any) => q.eq('userId', issue.assignedFieldOfficer))
        .first();
      if (fo) foMap.set(String(fo._id), fo);
    }
  }

  // 4. Query all fieldOfficers matching city & department (case-insensitive string match)
  const allFos = await ctx.db.query('fieldOfficers').collect();
  const uoCityNorm = normalizeStatus(unitOfficer.city);
  const uoDeptNorm = normalizeStatus(unitOfficer.department);

  for (const fo of allFos) {
    if (fo) {
      const foCityNorm = normalizeStatus(fo.city);
      const foDeptNorm = normalizeStatus(fo.department);

      const cityMatch =
        !unitOfficer.city || foCityNorm === uoCityNorm || fo.city === unitOfficer.city;

      const deptMatch =
        !unitOfficer.department ||
        foDeptNorm === uoDeptNorm ||
        fo.department === unitOfficer.department;

      if (cityMatch && deptMatch) {
        foMap.set(String(fo._id), fo);
      }
    }
  }

  const teamFieldOfficers = Array.from(foMap.values());

  // Filter out accounts explicitly rejected (accept boolean true, undefined, or null)
  return teamFieldOfficers.filter((fo) => fo.accountApproved !== false);
}

async function getFieldResolutionDurations(ctx: any, officerUserId: any, completedIssues: any[]) {
  if (completedIssues.length === 0) return { totalMs: 0, count: 0, avgHours: 0 };

  const durations = await Promise.all(
    completedIssues.map(async (issue) => {
      const updates = await ctx.db
        .query('issueUpdates')
        .withIndex('by_issue', (q: any) => q.eq('issueId', issue._id))
        .collect();

      let startTime = issue.assignedAt;

      if (
        issue.slaReassignment &&
        String(issue.slaReassignment.newFieldOfficer) === String(officerUserId)
      ) {
        startTime = issue.slaReassignment.reassignedAt;
      } else {
        const foAssignmentUpdate = updates.find(
          (u: any) =>
            normalizeStatus(u.status) === 'assigned' &&
            (String(u.updatedBy) === String(officerUserId) ||
              String(u.assignedTo) === String(officerUserId))
        );
        if (foAssignmentUpdate?.createdAt) {
          startTime = foAssignmentUpdate.createdAt;
        } else {
          const firstFoWorkUpdate = updates.find(
            (u: any) => String(u.updatedBy) === String(officerUserId) || u.role === 'field_officer'
          );
          if (firstFoWorkUpdate?.createdAt) {
            startTime = firstFoWorkUpdate.createdAt;
          }
        }
      }

      if (!startTime) {
        startTime = issue.createdAt;
      }

      const endTime = issue.resolvedAt ?? issue.closedAt;

      if (!endTime || endTime <= startTime) return null;

      return endTime - startTime;
    })
  );

  const validDurations = durations.filter((duration): duration is number => duration !== null);

  if (validDurations.length === 0) return { totalMs: 0, count: 0, avgHours: 0 };

  const totalMs = validDurations.reduce((sum, duration) => sum + duration, 0);
  const count = validDurations.length;
  const avgHours = Math.round(totalMs / count / (1000 * 60 * 60));

  return { totalMs, count, avgHours };
}

async function calculateAvgAssignmentTime(ctx: any, issues: any[]) {
  const assignedIssues = issues.filter(
    (issue) =>
      !['pending', 'verified'].includes(normalizeStatus(issue.status)) || issue.assignedFieldOfficer
  );

  if (assignedIssues.length === 0) return 0;

  const durations = await Promise.all(
    assignedIssues.map(async (issue) => {
      const updates = await ctx.db
        .query('issueUpdates')
        .withIndex('by_issue', (q: any) => q.eq('issueId', issue._id))
        .collect();

      const verifiedUpdate = updates.find((u: any) => normalizeStatus(u.status) === 'verified');
      const assignedUpdate = updates.find((u: any) => normalizeStatus(u.status) === 'assigned');

      const startTime = verifiedUpdate?.createdAt ?? issue.createdAt;
      const endTime = assignedUpdate?.createdAt ?? issue.assignedAt;

      if (!endTime || endTime <= startTime) return null;

      return endTime - startTime;
    })
  );

  const validDurations = durations.filter((duration): duration is number => duration !== null);

  if (validDurations.length === 0) return 0;

  return Math.round(
    validDurations.reduce((sum, duration) => sum + duration, 0) /
      validDurations.length /
      (1000 * 60 * 60)
  );
}

function getStatusBreakdown(issues: any[]) {
  const counts = {
    pending: 0,
    verified: 0,
    assigned: 0,
    in_progress: 0,
    submitted_for_review: 0,
    rework_required: 0,
    resolved: 0,
    closed: 0,
    reopened: 0,
    rejected: 0,
    escalated: 0,
  };

  for (const issue of issues) {
    const status = normalizeStatus(issue.status);

    if (status === 'pending') {
      counts.pending++;
    } else if (status === 'verified') {
      counts.verified++;
    } else if (status === 'assigned') {
      counts.assigned++;
    } else if (status === 'in_progress') {
      counts.in_progress++;
    } else if (status === 'submitted_for_review' || status === 'pending_uo_verification') {
      counts.submitted_for_review++;
    } else if (status === 'rework_required' || status === 'rework_requested') {
      counts.rework_required++;
    } else if (isCompletedStatus(status)) {
      counts.resolved++;
    } else if (status === 'reopened') {
      counts.reopened++;
    } else if (status === 'rejected') {
      counts.rejected++;
    }

    if (issue.escalatedToAdmin || status === 'escalated') {
      counts.escalated++;
    }
  }

  return counts;
}

function getCategoryDistribution(issues: any[]) {
  const distribution: Record<string, number> = {};
  for (const issue of issues) {
    const category = issue.category || 'Other';
    distribution[category] = (distribution[category] || 0) + 1;
  }
  return Object.entries(distribution).map(([category, count]) => ({
    category,
    count,
  }));
}

function getPriorityDistribution(issues: any[]) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const issue of issues) {
    const priority = (issue.priority || '').toLowerCase();
    if (priority === 'low') counts.low++;
    else if (priority === 'medium') counts.medium++;
    else if (priority === 'high') counts.high++;
    else if (priority === 'critical') counts.critical++;
  }
  return counts;
}

function getSlaBreakdown(issues: any[]) {
  let met = 0;
  let breached = 0;
  for (const issue of issues) {
    if (issue.slaBreached) {
      breached++;
    } else {
      met++;
    }
  }
  return { met, breached };
}

function getQualityMetrics(issues: any[], totalAssigned: number) {
  const resolved = issues.filter((i) => isCompletedStatus(i.status));
  const totalResolved = resolved.length;

  const reworkCount = issues.filter((i) => {
    const status = normalizeStatus(i.status);
    return (
      status === 'rework_required' ||
      status === 'rework_requested' ||
      Boolean(i.reworkNote) ||
      (Array.isArray(i.reworkReasons) && i.reworkReasons.length > 0)
    );
  }).length;
  const reworkRate = safePercentage(reworkCount, totalResolved);

  const reopenCount = issues.reduce((sum, i) => sum + (i.reopenCount ?? 0), 0);
  const reopenRate = safePercentage(reopenCount, totalResolved);

  const escalatedCount = issues.filter((i) => i.escalatedToAdmin).length;
  const escalationRate = safePercentage(escalatedCount, totalAssigned);

  const ftfIssues = resolved.filter((i) => {
    const status = normalizeStatus(i.status);
    return (
      (i.reopenCount ?? 0) === 0 &&
      !i.reworkNote &&
      (!i.reworkReasons || i.reworkReasons.length === 0) &&
      status !== 'rework_required' &&
      status !== 'rework_requested'
    );
  }).length;
  const firstTimeFixRate = totalResolved > 0 ? safePercentage(ftfIssues, totalResolved) : 0;

  const ratedIssues = resolved.filter((i) => getIssueCitizenFeedback(i).hasFeedback);
  const ratingSum = ratedIssues.reduce(
    (sum, i) => sum + (getIssueCitizenFeedback(i).rating ?? 0),
    0
  );
  const citizenSatisfaction =
    ratedIssues.length > 0 ? safePercentage(ratingSum, ratedIssues.length * 5) : 0;

  return {
    reworkRate,
    reopenRate,
    escalationRate,
    firstTimeFixRate,
    citizenSatisfaction,
  };
}

async function calculateFieldOfficerSummary(
  ctx: any,
  officer: any,
  allRelevantIssues: any[],
  currentIssues: any[],
  range?: '7d' | '30d' | '90d' | 'all'
) {
  const cutoff = getRangeCutoff(range);
  const foUserId = officer.userId;

  const rangeAllIssues = filterByRange(allRelevantIssues, range);
  const totalAssigned = rangeAllIssues.length;

  const activeIssuesList = currentIssues.filter((i) =>
    FO_ACTIVE_STATUSES.has(normalizeStatus(i.status))
  );
  const activeIssues = activeIssuesList.length;
  const maxCapacity = officer.maxIssueCapacity || 10;
  const capacityUsage = maxCapacity > 0 ? Math.round((activeIssues / maxCapacity) * 100) : 0;

  const resolved = rangeAllIssues.filter((i) => {
    if (!isCompletedStatus(i.status)) return false;

    const completedAt = i.resolvedAt ?? i.closedAt;
    if (!completedAt) return false;
    if (cutoff !== null && safeNumber(completedAt) < cutoff) return false;

    const isCurrentlyAssignedFO = String(i.assignedFieldOfficer) === String(foUserId);
    return isCurrentlyAssignedFO;
  });

  const totalResolved = resolved.length;

  const durationsResult = await getFieldResolutionDurations(ctx, foUserId, resolved);
  const avgResolutionTime = durationsResult.avgHours;
  const totalResolutionDurationMs = durationsResult.totalMs;
  const validResolutionDurationCount = durationsResult.count;

  const slaApplicableResolvedIssues = resolved.filter(
    (issue) => Boolean(issue.slaDeadline) && Boolean(issue.resolvedAt ?? issue.closedAt)
  );

  const slaCompliantResolvedIssues = slaApplicableResolvedIssues.filter((issue) => {
    const completedAt = issue.resolvedAt ?? issue.closedAt;
    return safeNumber(completedAt) <= safeNumber(issue.slaDeadline);
  });

  const hasSlaData = slaApplicableResolvedIssues.length > 0;
  const slaComplianceRate = hasSlaData
    ? safePercentage(slaCompliantResolvedIssues.length, slaApplicableResolvedIssues.length)
    : 0;

  const slaBreaches = rangeAllIssues.filter((i) => i.slaBreached).length;

  const reworkCount = rangeAllIssues.filter((i) => {
    const status = normalizeStatus(i.status);
    return (
      status === 'rework_required' ||
      status === 'rework_requested' ||
      Boolean(i.reworkNote) ||
      (Array.isArray(i.reworkReasons) && i.reworkReasons.length > 0)
    );
  }).length;

  const reopenCount = rangeAllIssues.reduce((sum, i) => sum + (i.reopenCount ?? 0), 0);
  const escalatedCount = rangeAllIssues.filter((i) => i.escalatedToAdmin).length;

  const reworkRate = safePercentage(reworkCount, totalResolved);
  const reopenRate = safePercentage(reopenCount, totalResolved);
  const escalationRate = safePercentage(escalatedCount, totalAssigned);

  const qualityScoreCalculated = Math.round(
    Math.max(0, Math.min(100, 100 - reworkRate * 0.4 - reopenRate * 0.35 - escalationRate * 0.25))
  );
  const qualityScore = totalResolved > 0 ? qualityScoreCalculated : 0;

  const firstTimeFixIssues = resolved.filter((issue) => {
    const status = normalizeStatus(issue.status);
    const hasRework =
      safeNumber(issue.reworkCount) > 0 ||
      status === 'rework_required' ||
      status === 'rework_requested' ||
      Boolean(issue.reworkNote) ||
      (Array.isArray(issue.reworkReasons) && issue.reworkReasons.length > 0);

    const hasReopen = safeNumber(issue.reopenCount) > 0;

    return !hasRework && !hasReopen;
  });

  const firstTimeFixRate =
    totalResolved > 0 ? safePercentage(firstTimeFixIssues.length, totalResolved) : 0;

  const ratedIssues = resolved.filter((issue) => getIssueCitizenFeedback(issue).hasFeedback);

  const ratedIssueCount = ratedIssues.length;
  const ratingSum = ratedIssues.reduce(
    (sum, issue) => sum + (getIssueCitizenFeedback(issue).rating ?? 0),
    0
  );

  const rating = ratedIssueCount > 0 ? Number((ratingSum / ratedIssueCount).toFixed(1)) : 0;

  const hasCitizenRatings = ratedIssueCount > 0;
  const ratingScore = hasCitizenRatings ? safePercentage(rating, 5) : 50;

  const resolutionRate = safePercentage(totalResolved, totalAssigned);

  const targetResolutionHours = 72;
  const resolutionSpeedScore =
    totalResolved > 0 && avgResolutionTime > 0
      ? Math.max(0, Math.min(100, (targetResolutionHours / avgResolutionTime) * 100))
      : 0;

  const rawPerformanceScore =
    resolutionRate * 0.3 +
    slaComplianceRate * 0.25 +
    firstTimeFixRate * 0.2 +
    ratingScore * 0.15 +
    resolutionSpeedScore * 0.1;

  const MIN_COMPLETED_FOR_FULL_CONFIDENCE = 5;
  const confidenceFactor =
    totalResolved <= 0 ? 0 : Math.min(1, totalResolved / MIN_COMPLETED_FOR_FULL_CONFIDENCE);

  const efficiencyScore =
    totalResolved <= 0
      ? 0
      : Math.round(rawPerformanceScore * confidenceFactor + 50 * (1 - confidenceFactor));

  return {
    totalAssigned,
    totalResolved,
    activeIssues,
    maxCapacity,
    capacityUsage,

    avgResolutionTime,
    totalResolutionDurationMs,
    validResolutionDurationCount,
    resolutionSpeedScore,

    resolutionRate,

    slaComplianceRate,
    slaApplicableCount: slaApplicableResolvedIssues.length,
    slaCompliantCount: slaCompliantResolvedIssues.length,
    hasSlaData,
    slaBreaches,

    reworkCount,
    reopenCount,
    escalatedCount,

    reworkRate,
    reopenRate,
    escalationRate,

    firstTimeFixRate,

    rating,
    ratingScore,
    ratingSum,
    ratedIssueCount,
    hasCitizenRatings,

    qualityScore,

    efficiencyScore,
    performanceScore: efficiencyScore,
    successRate: efficiencyScore,

    completedSampleSize: totalResolved,
    isSampleSufficient: totalResolved >= MIN_COMPLETED_FOR_FULL_CONFIDENCE,
    confidenceFactor,
  };
}

async function calculateUnitOfficerPersonalSummary(
  ctx: any,
  officer: any,
  uoIssues: any[],
  range?: '7d' | '30d' | '90d' | 'all'
) {
  const cutoff = getRangeCutoff(range);

  const verifiedIssues = uoIssues.filter((i) => {
    const verifiedAt = i.verificationChecklist?.verifiedAt;
    return (
      String(i.verificationChecklist?.verifiedBy) === String(officer.userId) &&
      (cutoff === null || safeNumber(verifiedAt) >= cutoff)
    );
  });
  const totalVerified = verifiedIssues.length;

  const rejectedIssues = uoIssues.filter((i) => {
    const rejectedAt = i.rejection?.rejectedAt;
    return (
      String(i.rejection?.rejectedBy) === String(officer.userId) &&
      (cutoff === null || safeNumber(rejectedAt) >= cutoff)
    );
  });
  const totalRejected = rejectedIssues.length;

  const totalReviewed = totalVerified + totalRejected;
  const verificationRate =
    totalReviewed > 0 ? Math.round((totalVerified / totalReviewed) * 100) : 0;

  let totalVerTimeMs = 0;
  for (const issue of verifiedIssues) {
    if (issue.verificationChecklist?.verifiedAt) {
      totalVerTimeMs += issue.verificationChecklist.verifiedAt - issue.createdAt;
    }
  }
  const avgVerificationTime =
    totalVerified > 0 ? Math.round(totalVerTimeMs / (totalVerified * 3600 * 1000)) : 0;

  const rangeUoIssues = filterByRange(uoIssues, range);

  const avgAssignmentTime = await calculateAvgAssignmentTime(ctx, rangeUoIssues);

  const activeIssues = rangeUoIssues.filter((i) =>
    UO_ACTIVE_STATUSES.has(normalizeStatus(i.status))
  ).length;

  const resolved = rangeUoIssues.filter((i) => {
    if (!isCompletedStatus(i.status)) return false;
    const completedAt = i.resolvedAt ?? i.closedAt;
    return cutoff === null || safeNumber(completedAt) >= cutoff;
  });
  const resolvedIssues = resolved.length;

  const overallAvgResolutionTime = calculateAvgResolutionTime(resolved);

  const ratedIssues = resolved.filter((i) => getIssueCitizenFeedback(i).hasFeedback);
  const ratingSum = ratedIssues.reduce(
    (sum, i) => sum + (getIssueCitizenFeedback(i).rating ?? 0),
    0
  );
  const rating = ratedIssues.length > 0 ? Number((ratingSum / ratedIssues.length).toFixed(1)) : 0;

  const verificationScore = verificationRate;
  const assignmentTargetHours = 24;
  const assignmentScore =
    avgAssignmentTime > 0
      ? Math.max(0, Math.min(100, (assignmentTargetHours / avgAssignmentTime) * 100))
      : totalReviewed > 0
        ? 50
        : 0;

  const efficiencyScore = Math.round(
    verificationScore * 0.25 + assignmentScore * 0.2 + 100 * 0.25 + 100 * 0.2 + 100 * 0.1
  );

  return {
    totalVerified,
    totalRejected,
    totalReviewed,
    verificationRate,
    avgVerificationTime,
    avgAssignmentTime,
    overallAvgResolutionTime,
    activeIssues,
    resolvedIssues,
    rating,
    efficiencyScore,
  };
}

function calculateUnitOfficerTeamSummary(foSummaries: any[]) {
  const assignedFieldOfficerCount = foSummaries.length;
  if (assignedFieldOfficerCount === 0) {
    return {
      assignedFieldOfficerCount: 0,
      teamResolvedIssues: 0,
      teamActiveIssues: 0,
      teamSlaCompliance: 0,
      teamAvgResolutionTime: 0,
      teamCitizenRating: 0,
      teamEfficiencyScore: 0,
    };
  }

  const teamResolvedIssues = foSummaries.reduce((sum, s) => sum + s.totalResolved, 0);
  const teamActiveIssues = foSummaries.reduce((sum, s) => sum + s.activeIssues, 0);

  const totalSlaApplicable = foSummaries.reduce((sum, s) => sum + s.slaApplicableCount, 0);
  const totalSlaCompliant = foSummaries.reduce((sum, s) => sum + s.slaCompliantCount, 0);
  const teamSlaCompliance =
    totalSlaApplicable > 0 ? safePercentage(totalSlaCompliant, totalSlaApplicable) : 0;

  const teamResolutionDurationMs = foSummaries.reduce(
    (sum, s) => sum + s.totalResolutionDurationMs,
    0
  );
  const teamResolutionSampleCount = foSummaries.reduce(
    (sum, s) => sum + s.validResolutionDurationCount,
    0
  );
  const teamAvgResolutionTime =
    teamResolutionSampleCount > 0
      ? Math.round(teamResolutionDurationMs / teamResolutionSampleCount / (1000 * 60 * 60))
      : 0;

  const totalRatingCount = foSummaries.reduce((sum, s) => sum + s.ratedIssueCount, 0);
  const totalRatingSum = foSummaries.reduce((sum, s) => sum + s.ratingSum, 0);
  const teamCitizenRating =
    totalRatingCount > 0 ? Number((totalRatingSum / totalRatingCount).toFixed(1)) : 0;

  const teamEfficiencyScore = Math.round(
    foSummaries.reduce((sum, s) => sum + s.efficiencyScore, 0) / assignedFieldOfficerCount
  );

  return {
    assignedFieldOfficerCount,
    teamResolvedIssues,
    teamActiveIssues,
    teamSlaCompliance,
    teamAvgResolutionTime,
    teamCitizenRating,
    teamEfficiencyScore,
  };
}

function getMonthlyResolutionTrend(issues: any[]) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const counts: Record<string, number> = {};

  const now = new Date();
  const trendMonths: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    trendMonths.push({ key, label });
    counts[key] = 0;
  }

  const resolved = issues.filter((i) => {
    return isCompletedStatus(i.status) && (i.resolvedAt || i.closedAt);
  });

  for (const issue of resolved) {
    const resolvedTime = issue.resolvedAt ?? issue.closedAt;
    if (resolvedTime) {
      const resDate = new Date(resolvedTime);
      const key = `${resDate.getFullYear()}-${resDate.getMonth()}`;
      if (key in counts) {
        counts[key]++;
      }
    }
  }

  return trendMonths.map((tm) => ({
    month: tm.label,
    count: counts[tm.key],
  }));
}

// --- Convex Exported Queries ---

export const getFieldOfficerPerformanceByUserId = query({
  args: {
    userId: v.id('users'),
    range: rangeValidation,
  },
  handler: async (ctx, args) => {
    const fieldOfficer = await ctx.db
      .query('fieldOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!fieldOfficer) {
      return null;
    }

    const { currentIssues, historicalIssues, allRelevantIssues } =
      await getFieldOfficerRelevantIssues(ctx, fieldOfficer);

    const rangeIssues = filterByRange(allRelevantIssues, args.range);
    const summary = await calculateFieldOfficerSummary(
      ctx,
      fieldOfficer,
      allRelevantIssues,
      currentIssues,
      args.range
    );

    const cutoff = getRangeCutoff(args.range);
    const resolvedIssues = rangeIssues.filter((i) => {
      if (!isCompletedStatus(i.status)) return false;
      const completedAt = i.resolvedAt ?? i.closedAt;
      return cutoff === null || safeNumber(completedAt) >= cutoff;
    });

    const charts = {
      statusBreakdown: getStatusBreakdown(rangeIssues),
      priorityDistribution: getPriorityDistribution(rangeIssues),
      slaBreakdown: getSlaBreakdown(rangeIssues),
      monthlyResolutionTrend: getMonthlyResolutionTrend(allRelevantIssues),
      qualityMetrics: getQualityMetrics(rangeIssues, summary.totalAssigned),
    };

    const recentIssues = resolvedIssues
      .sort((a, b) => (b.resolvedAt ?? b.closedAt ?? 0) - (a.resolvedAt ?? a.closedAt ?? 0))
      .slice(0, 5)
      .map((i) => {
        const feedback = getIssueCitizenFeedback(i);
        return {
          _id: i._id,
          issueCode: i.issueCode,
          title: i.title,
          status: i.status,
          completedAt: i.resolvedAt ?? i.closedAt ?? i.createdAt,
          citizenRating: feedback.rating,
          citizenFeedbackComment: feedback.comment,
        };
      });

    return {
      officer: fieldOfficer,
      summary,
      charts,
      recentIssues,
    };
  },
});

export const getUnitOfficerProfilePerformance = query({
  args: {
    userId: v.id('users'),
    range: rangeValidation,
  },
  handler: async (ctx, args) => {
    const unitOfficer = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!unitOfficer) {
      return null;
    }

    const allUoIssues = await ctx.db
      .query('issues')
      .withIndex('by_assigned_unit_officer', (q) => q.eq('assignedUnitOfficer', unitOfficer.userId))
      .collect();

    const rangeUoIssues = filterByRange(allUoIssues, args.range);
    const personal = await calculateUnitOfficerPersonalSummary(
      ctx,
      unitOfficer,
      allUoIssues,
      args.range
    );

    const filteredFos = await getTeamFieldOfficersForUnitOfficer(ctx, unitOfficer);

    const foSummaries = [];
    const allTeamIssueMap = new Map<string, any>();

    for (const fo of filteredFos) {
      const { currentIssues, allRelevantIssues } = await getFieldOfficerRelevantIssues(ctx, fo);

      for (const issue of allRelevantIssues) {
        if (issue) allTeamIssueMap.set(String(issue._id), issue);
      }

      const foSum = await calculateFieldOfficerSummary(
        ctx,
        fo,
        allRelevantIssues,
        currentIssues,
        args.range
      );
      foSummaries.push(foSum);
    }

    const allTeamIssues = Array.from(allTeamIssueMap.values());
    const rangeTeamIssues = filterByRange(allTeamIssues, args.range);
    const team = calculateUnitOfficerTeamSummary(foSummaries);

    const teamResolutionRate =
      team.teamResolvedIssues + team.teamActiveIssues > 0
        ? (team.teamResolvedIssues / (team.teamResolvedIssues + team.teamActiveIssues)) * 100
        : 0;

    const assignmentTargetHours = 24;
    const assignmentScore =
      personal.avgAssignmentTime > 0
        ? Math.max(0, Math.min(100, (assignmentTargetHours / personal.avgAssignmentTime) * 100))
        : personal.totalReviewed > 0
          ? 50
          : 0;

    personal.efficiencyScore = Math.round(
      personal.verificationRate * 0.25 +
        assignmentScore * 0.2 +
        team.teamSlaCompliance * 0.25 +
        teamResolutionRate * 0.2 +
        (team.teamCitizenRating / 5) * 100 * 0.1
    );

    const charts = {
      verificationTrend: getMonthlyResolutionTrend(allUoIssues),
      teamResolutionTrend: getMonthlyResolutionTrend(allTeamIssues),
      statusBreakdown: getStatusBreakdown(rangeUoIssues),
      qualityMetrics: getQualityMetrics(rangeUoIssues, rangeUoIssues.length),
    };

    return {
      officer: unitOfficer,
      personal,
      team,
      charts,
    };
  },
});

export const getUnitOfficerTeamAnalytics = query({
  args: {
    userId: v.id('users'),
    range: rangeValidation,
  },
  handler: async (ctx, args) => {
    const unitOfficer = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!unitOfficer) {
      return null;
    }

    const filteredFos = await getTeamFieldOfficersForUnitOfficer(ctx, unitOfficer);

    const allTeamIssueMap = new Map<string, any>();
    const foDataList: any[] = [];
    const foSummaries = [];

    for (const fo of filteredFos) {
      const { currentIssues, allRelevantIssues } = await getFieldOfficerRelevantIssues(ctx, fo);

      for (const issue of allRelevantIssues) {
        if (issue) allTeamIssueMap.set(String(issue._id), issue);
      }

      const foSum = await calculateFieldOfficerSummary(
        ctx,
        fo,
        allRelevantIssues,
        currentIssues,
        args.range
      );
      foSummaries.push(foSum);

      let riskLevel = 'Good';
      if (foSum.capacityUsage > 90 || foSum.slaComplianceRate < 60) {
        riskLevel = 'High Risk';
      } else if (foSum.capacityUsage > 75 || foSum.slaComplianceRate < 75) {
        riskLevel = 'Needs Attention';
      }

      foDataList.push({
        officerId: fo._id,
        userId: fo.userId,
        fullName: fo.fullName,
        department: fo.department,
        city: fo.city,
        activeIssues: foSum.activeIssues,
        resolvedIssues: foSum.totalResolved,
        totalAssigned: foSum.totalAssigned,
        capacityUsage: foSum.capacityUsage,
        slaComplianceRate: foSum.slaComplianceRate,
        firstTimeFixRate: foSum.firstTimeFixRate,
        avgResolutionTime: foSum.avgResolutionTime,
        rating: foSum.rating,
        ratingScore: foSum.ratingScore,
        efficiencyScore: foSum.efficiencyScore,
        performanceScore: foSum.efficiencyScore,
        successRate: foSum.efficiencyScore,
        completedSampleSize: foSum.completedSampleSize,
        isSampleSufficient: foSum.isSampleSufficient,
        confidenceFactor: foSum.confidenceFactor,
        riskLevel,
        resolutionSpeedScore: foSum.resolutionSpeedScore,
        resolutionRate: foSum.resolutionRate,
        slaApplicableCount: foSum.slaApplicableCount,
        slaCompliantCount: foSum.slaCompliantCount,
        hasSlaData: foSum.hasSlaData,
        reworkCount: foSum.reworkCount,
        reopenCount: foSum.reopenCount,
        escalatedCount: foSum.escalatedCount,
        reworkRate: foSum.reworkRate,
        reopenRate: foSum.reopenRate,
        escalationRate: foSum.escalationRate,
        ratedIssueCount: foSum.ratedIssueCount,
        hasCitizenRatings: foSum.hasCitizenRatings,
        qualityScore: foSum.qualityScore,
      });
    }

    const allTeamIssues = Array.from(allTeamIssueMap.values());

    // Top Performer & leaderboard calculations
    const eligiblePerformers = foDataList.filter((officer) => officer.resolvedIssues > 0);
    const poolForRanking = eligiblePerformers.length > 0 ? eligiblePerformers : foDataList;

    const leaderboard = [...poolForRanking].sort((a, b) => {
      if (b.efficiencyScore !== a.efficiencyScore) {
        return b.efficiencyScore - a.efficiencyScore;
      }
      if (b.resolvedIssues !== a.resolvedIssues) {
        return b.resolvedIssues - a.resolvedIssues;
      }
      if (b.slaComplianceRate !== a.slaComplianceRate) {
        return b.slaComplianceRate - a.slaComplianceRate;
      }
      if (b.firstTimeFixRate !== a.firstTimeFixRate) {
        return b.firstTimeFixRate - a.firstTimeFixRate;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    const workload = foDataList.map((fo) => ({
      name: fo.fullName,
      activeIssues: fo.activeIssues,
      workloadPercentage: fo.capacityUsage,
    }));

    const topPerformers = leaderboard.slice(0, 3).map((officer) => ({
      officerId: officer.officerId,
      userId: officer.userId,
      name: officer.fullName,
      fullName: officer.fullName,
      issuesResolved: officer.resolvedIssues,
      performanceScore: officer.efficiencyScore,
      efficiencyScore: officer.efficiencyScore,
      successRate: officer.efficiencyScore,
      rating: officer.rating,
      completedSampleSize: officer.completedSampleSize,
      isSampleSufficient: officer.isSampleSufficient,
    }));

    const needsAttention = foDataList.filter(
      (fo) => fo.riskLevel === 'High Risk' || fo.riskLevel === 'Needs Attention'
    );

    const team = calculateUnitOfficerTeamSummary(foSummaries);
    const totalIssues = allTeamIssues.length;
    const resolvedIssues = allTeamIssues.filter((i) => isCompletedStatus(i.status)).length;
    const activeIssues = allTeamIssues.filter((i) =>
      UO_ACTIVE_STATUSES.has(normalizeStatus(i.status))
    ).length;

    const escalatedIssues = allTeamIssues.filter((i) => i.escalatedToAdmin).length;
    const reworkIssues = allTeamIssues.filter((i) => {
      const status = normalizeStatus(i.status);
      return (
        status === 'rework_required' ||
        status === 'rework_requested' ||
        Boolean(i.reworkNote) ||
        (Array.isArray(i.reworkReasons) && i.reworkReasons.length > 0)
      );
    }).length;
    const reopenedIssues = allTeamIssues.reduce((sum, i) => sum + (i.reopenCount ?? 0), 0);

    const avgResolutionTime = team.teamAvgResolutionTime;
    const slaComplianceRate = team.teamSlaCompliance;
    const citizenSatisfaction = team.teamCitizenRating;
    const teamEfficiencyScore = team.teamEfficiencyScore;

    const insights = [];
    if (topPerformers.length > 0) {
      insights.push({
        type: 'positive',
        title: 'Top Performer',
        text: `Officer ${topPerformers[0].name} has the highest efficiency score of ${topPerformers[0].successRate}%.`,
      });
    }
    if (needsAttention.length > 0) {
      insights.push({
        type: 'attention',
        title: 'Attention Required',
        text: `${needsAttention.length} officer(s) require review due to low SLA compliance or high workload.`,
      });
    }
    if (slaComplianceRate < 80) {
      insights.push({
        type: 'warning',
        title: 'SLA Warning',
        text: `Team SLA compliance rate is at ${slaComplianceRate}%, which is below the target threshold.`,
      });
    } else {
      insights.push({
        type: 'info',
        title: 'SLA On Track',
        text: `Team SLA compliance is healthy at ${slaComplianceRate}%.`,
      });
    }

    return {
      unitOfficer,
      summary: {
        totalIssues,
        resolvedIssues,
        activeIssues,
        escalatedIssues,
        reworkIssues,
        reopenedIssues,
        avgResolutionTime,
        slaComplianceRate,
        citizenSatisfaction,
        teamEfficiencyScore,
      },
      charts: {
        statusBreakdown: getStatusBreakdown(allTeamIssues),
        categoryDistribution: getCategoryDistribution(allTeamIssues),
        priorityDistribution: getPriorityDistribution(allTeamIssues),
        slaBreakdown: getSlaBreakdown(allTeamIssues),
        qualityMetrics: getQualityMetrics(allTeamIssues, totalIssues),
        monthlyResolutionTrend: getMonthlyResolutionTrend(allTeamIssues),
      },
      officers: {
        leaderboard,
        workload,
        topPerformers,
        needsAttention,
      },
      insights,
    };
  },
});
