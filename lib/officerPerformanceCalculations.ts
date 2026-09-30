/**
 * Officer Performance Calculations Library
 * Canonical single source of truth for Field Officer and Unit Officer performance calculations.
 */

export interface QueryCtxLike {
  db: {
    query: (table: any) => any;
  };
}

export interface ResolutionDurationsResult {
  totalMs: number;
  count: number;
  avgHours: number;
}

export interface StatusBreakdown {
  pending: number;
  verified: number;
  assigned: number;
  in_progress: number;
  submitted_for_review: number;
  rework_required: number;
  resolved: number;
  closed: number;
  reopened: number;
  rejected: number;
  escalated: number;
}

export interface CategoryDistributionItem {
  category: string;
  count: number;
}

export interface PriorityDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface SlaBreakdown {
  met: number;
  breached: number;
}

export interface QualityMetrics {
  reworkRate: number;
  reopenRate: number;
  escalationRate: number;
  firstTimeFixRate: number;
  citizenSatisfaction: number;
}

export interface FieldOfficerSummary {
  totalAssigned: number;
  totalResolved: number;
  activeIssues: number;
  maxCapacity: number;
  capacityUsage: number;

  avgResolutionTime: number;
  totalResolutionDurationMs: number;
  validResolutionDurationCount: number;
  resolutionSpeedScore: number;

  resolutionRate: number;

  slaComplianceRate: number;
  slaApplicableCount: number;
  slaCompliantCount: number;
  hasSlaData: boolean;
  slaBreaches: number;

  reworkCount: number;
  reopenCount: number;
  escalatedCount: number;

  reworkRate: number;
  reopenRate: number;
  escalationRate: number;

  firstTimeFixRate: number;

  rating: number;
  ratingScore: number;
  ratingSum: number;
  ratedIssueCount: number;
  hasCitizenRatings: boolean;

  qualityScore: number;

  efficiencyScore: number;
  performanceScore: number;
  successRate: number;

  completedSampleSize: number;
  isSampleSufficient: boolean;
  confidenceFactor: number;
}

export interface UnitOfficerPersonalSummary {
  totalVerified: number;
  totalRejected: number;
  totalReviewed: number;
  verificationRate: number;
  avgVerificationTime: number;
  avgAssignmentTime: number;
  overallAvgResolutionTime: number;
  activeIssues: number;
  resolvedIssues: number;
  rating: number;
  efficiencyScore: number;
}

export interface UnitOfficerTeamSummary {
  assignedFieldOfficerCount: number;
  teamResolvedIssues: number;
  teamActiveIssues: number;
  teamSlaCompliance: number;
  teamAvgResolutionTime: number;
  teamCitizenRating: number;
  teamEfficiencyScore: number;
}

export interface MonthlyTrendItem {
  month: string;
  count: number;
}

export function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function safePercentage(numerator: unknown, denominator: unknown): number {
  const safeNumerator = safeNumber(numerator);
  const safeDenominator = safeNumber(denominator);

  if (safeDenominator <= 0) {
    return 0;
  }

  const value = (safeNumerator / safeDenominator) * 100;

  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

export function normalizeStatus(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function getRangeCutoff(range?: string | null): number | null {
  const selectedRange = range ?? '30d';

  if (selectedRange === 'all') {
    return null;
  }

  const days = selectedRange === '7d' ? 7 : selectedRange === '90d' ? 90 : 30;

  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export function issueHasActivityInRange(
  issue: Record<string, any>,
  cutoff: number | null
): boolean {
  if (cutoff === null) {
    return true;
  }

  const activityTimes = [
    issue.createdAt,
    issue.assignedAt,
    issue.workStartedAt,
    issue.resolvedAt,
    issue.closedAt,
    issue.verificationChecklist?.verifiedAt,
    issue.citizenFeedbackAt,
  ]
    .map((value) => safeNumber(value))
    .filter((value) => value > 0);

  return activityTimes.some((timestamp) => timestamp >= cutoff);
}

export function filterByRange<T extends Record<string, any>>(
  issues: T[],
  range?: string | null
): T[] {
  const cutoff = getRangeCutoff(range);
  return issues.filter((issue) => issueHasActivityInRange(issue, cutoff));
}

export function calculateAvgResolutionTime(resolvedIssues: Record<string, any>[]): number {
  if (resolvedIssues.length === 0) return 0;
  let totalMs = 0;
  for (const issue of resolvedIssues) {
    const endTime = issue.resolvedAt ?? issue.closedAt ?? Date.now();
    totalMs += endTime - issue.createdAt;
  }
  return Math.round(totalMs / (3600 * 1000 * resolvedIssues.length));
}

export async function getIssueUpdatesCached(
  ctx: QueryCtxLike,
  issueId: any,
  cache?: Map<string, any[]>
): Promise<any[]> {
  const key = String(issueId);
  if (cache && cache.has(key)) {
    return cache.get(key)!;
  }

  const updates = await ctx.db
    .query('issueUpdates')
    .withIndex('by_issue', (q: any) => q.eq('issueId', issueId))
    .collect();

  if (cache) {
    cache.set(key, updates);
  }
  return updates;
}

export async function getFieldResolutionDurations(
  ctx: QueryCtxLike,
  issues: Record<string, any>[],
  cache?: Map<string, any[]>
): Promise<ResolutionDurationsResult> {
  const completedIssues = issues.filter(
    (issue) =>
      ['resolved', 'closed'].includes(normalizeStatus(issue.status)) &&
      (issue.resolvedAt || issue.closedAt)
  );

  if (completedIssues.length === 0) return { totalMs: 0, count: 0, avgHours: 0 };

  const durations = await Promise.all(
    completedIssues.map(async (issue) => {
      const updates = await getIssueUpdatesCached(ctx, issue._id, cache);

      const assignedUpdate = updates.find((u: any) => normalizeStatus(u.status) === 'assigned');

      const startTime = assignedUpdate?.createdAt ?? issue.createdAt;
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

export async function calculateAvgFieldExecutionTime(
  ctx: QueryCtxLike,
  issues: Record<string, any>[],
  cache?: Map<string, any[]>
): Promise<number> {
  const res = await getFieldResolutionDurations(ctx, issues, cache);
  return res.avgHours;
}

export async function calculateAvgAssignmentTime(
  ctx: QueryCtxLike,
  issues: Record<string, any>[],
  cache?: Map<string, any[]>
): Promise<number> {
  const assignedIssues = issues.filter(
    (issue) =>
      !['pending', 'verified'].includes(normalizeStatus(issue.status)) || issue.assignedFieldOfficer
  );

  if (assignedIssues.length === 0) return 0;

  const durations = await Promise.all(
    assignedIssues.map(async (issue) => {
      const updates = await getIssueUpdatesCached(ctx, issue._id, cache);

      const verifiedUpdate = updates.find((u: any) => normalizeStatus(u.status) === 'verified');
      const assignedUpdate = updates.find((u: any) => normalizeStatus(u.status) === 'assigned');

      const startTime = verifiedUpdate?.createdAt ?? issue.createdAt;
      const endTime = assignedUpdate?.createdAt;

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

export function getStatusBreakdown(issues: Record<string, any>[]): StatusBreakdown {
  const counts: StatusBreakdown = {
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
    } else if (status === 'resolved') {
      counts.resolved++;
    } else if (status === 'closed') {
      counts.closed++;
    } else if (status === 'reopened') {
      counts.reopened++;
    } else if (status === 'rejected') {
      counts.rejected++;
    }

    if (issue.escalatedToAdmin) {
      counts.escalated++;
    }
  }

  return counts;
}

export function getCategoryDistribution(issues: Record<string, any>[]): CategoryDistributionItem[] {
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

export function getPriorityDistribution(issues: Record<string, any>[]): PriorityDistribution {
  const counts: PriorityDistribution = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const issue of issues) {
    const priority = String(issue.priority || '').toLowerCase();
    if (priority === 'low') counts.low++;
    else if (priority === 'medium') counts.medium++;
    else if (priority === 'high') counts.high++;
    else if (priority === 'critical') counts.critical++;
  }
  return counts;
}

export function getSlaBreakdown(issues: Record<string, any>[]): SlaBreakdown {
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

export function getQualityMetrics(
  issues: Record<string, any>[],
  totalAssigned: number
): QualityMetrics {
  const resolved = issues.filter((i) => {
    const st = normalizeStatus(i.status);
    return st === 'resolved' || st === 'closed';
  });
  const totalResolved = resolved.length;

  const reworkCount = issues.filter(
    (i) =>
      normalizeStatus(i.status) === 'rework_required' ||
      i.reworkNote ||
      (i.reworkReasons && i.reworkReasons.length > 0)
  ).length;
  const reworkRate = safePercentage(reworkCount, totalResolved);

  const reopenCount = issues.reduce((sum, i) => sum + (i.reopenCount ?? 0), 0);
  const reopenRate = safePercentage(reopenCount, totalResolved);

  const escalatedCount = issues.filter((i) => i.escalatedToAdmin).length;
  const escalationRate = safePercentage(escalatedCount, totalAssigned);

  const ftfIssues = resolved.filter(
    (i) =>
      (i.reopenCount ?? 0) === 0 &&
      !i.reworkNote &&
      (!i.reworkReasons || i.reworkReasons.length === 0) &&
      normalizeStatus(i.status) !== 'rework_required'
  ).length;
  const firstTimeFixRate = totalResolved > 0 ? safePercentage(ftfIssues, totalResolved) : 0;

  const ratedIssues = resolved.filter((i) => typeof i.citizenRating === 'number');
  const ratingSum = ratedIssues.reduce((sum, i) => sum + (i.citizenRating ?? 0), 0);
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

export async function calculateFieldOfficerSummary(
  ctx: QueryCtxLike,
  officer: Record<string, any>,
  issues: Record<string, any>[],
  range?: string | null,
  cache?: Map<string, any[]>
): Promise<FieldOfficerSummary> {
  const cutoff = getRangeCutoff(range);
  const totalAssigned = issues.length;

  const activeIssuesList = issues.filter((i) =>
    [
      'assigned',
      'in_progress',
      'submitted_for_review',
      'pending_uo_verification',
      'rework_required',
      'rework_requested',
    ].includes(normalizeStatus(i.status))
  );
  const activeIssues = activeIssuesList.length;
  const maxCapacity = officer.maxIssueCapacity || 10;
  const capacityUsage = maxCapacity > 0 ? Math.round((activeIssues / maxCapacity) * 100) : 0;

  // Resolved in selected range window
  const resolved = issues.filter((i) => {
    const st = normalizeStatus(i.status);
    if (st !== 'resolved' && st !== 'closed') return false;
    const completedAt = i.resolvedAt ?? i.closedAt;
    return cutoff === null || safeNumber(completedAt) >= cutoff;
  });
  const totalResolved = resolved.length;

  const durationsResult = await getFieldResolutionDurations(ctx, resolved, cache);
  const avgResolutionTime = durationsResult.avgHours;
  const totalResolutionDurationMs = durationsResult.totalMs;
  const validResolutionDurationCount = durationsResult.count;

  // SLA Compliance from range resolved issues
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

  const slaBreaches = issues.filter((i) => i.slaBreached).length;

  const reworkCount = issues.filter(
    (i) =>
      normalizeStatus(i.status) === 'rework_required' ||
      i.reworkNote ||
      (i.reworkReasons && i.reworkReasons.length > 0)
  ).length;

  const reopenCount = issues.reduce((sum, i) => sum + (i.reopenCount ?? 0), 0);
  const escalatedCount = issues.filter((i) => i.escalatedToAdmin).length;

  // Rates instead of fixed counts
  const reworkRate = safePercentage(reworkCount, totalResolved);
  const reopenRate = safePercentage(reopenCount, totalResolved);
  const escalationRate = safePercentage(escalatedCount, totalAssigned);

  const qualityScoreCalculated = Math.round(
    Math.max(0, Math.min(100, 100 - reworkRate * 0.4 - reopenRate * 0.35 - escalationRate * 0.25))
  );
  const qualityScore = totalResolved > 0 ? qualityScoreCalculated : 0;

  // First time fix using only completed issues
  const firstTimeFixIssues = resolved.filter((issue) => {
    const hasRework =
      safeNumber(issue.reworkCount) > 0 ||
      Boolean(issue.reworkNote) ||
      (Array.isArray(issue.reworkReasons) && issue.reworkReasons.length > 0);

    const hasReopen = safeNumber(issue.reopenCount) > 0;

    return !hasRework && !hasReopen;
  });

  const firstTimeFixRate =
    totalResolved > 0 ? safePercentage(firstTimeFixIssues.length, totalResolved) : 0;

  // Citizen Rating Calculations
  const ratings = resolved
    .map((issue) => safeNumber(issue.citizenRating, -1))
    .filter((rating) => rating >= 1 && rating <= 5);

  const ratedIssueCount = ratings.length;
  const ratingSum = ratings.reduce((sum, val) => sum + val, 0);

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

  // Sample size confidence factor
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

    efficiencyScore: Math.max(0, Math.min(100, efficiencyScore)),
    performanceScore: Math.max(0, Math.min(100, efficiencyScore)),
    successRate: Math.max(0, Math.min(100, efficiencyScore)),

    completedSampleSize: totalResolved,
    isSampleSufficient: totalResolved >= MIN_COMPLETED_FOR_FULL_CONFIDENCE,
    confidenceFactor,
  };
}

export async function calculateUnitOfficerPersonalSummary(
  ctx: QueryCtxLike,
  officer: Record<string, any>,
  uoIssues: Record<string, any>[],
  range?: string | null,
  cache?: Map<string, any[]>
): Promise<UnitOfficerPersonalSummary> {
  const cutoff = getRangeCutoff(range);

  const verifiedIssues = uoIssues.filter((i) => {
    const verifiedAt = i.verificationChecklist?.verifiedAt;
    return (
      i.verificationChecklist?.verifiedBy === officer.userId &&
      (cutoff === null || safeNumber(verifiedAt) >= cutoff)
    );
  });
  const totalVerified = verifiedIssues.length;

  const rejectedIssues = uoIssues.filter((i) => {
    const rejectedAt = i.rejection?.rejectedAt;
    return (
      i.rejection?.rejectedBy === officer.userId &&
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

  const avgAssignmentTime = await calculateAvgAssignmentTime(ctx, uoIssues, cache);

  const activeIssues = uoIssues.filter((i) =>
    [
      'pending',
      'verified',
      'assigned',
      'in_progress',
      'submitted_for_review',
      'pending_uo_verification',
      'rework_required',
      'rework_requested',
    ].includes(normalizeStatus(i.status))
  ).length;

  const resolved = uoIssues.filter((i) => {
    const st = normalizeStatus(i.status);
    if (st !== 'resolved' && st !== 'closed') return false;
    const completedAt = i.resolvedAt ?? i.closedAt;
    return cutoff === null || safeNumber(completedAt) >= cutoff;
  });
  const resolvedIssues = resolved.length;

  const overallAvgResolutionTime = calculateAvgResolutionTime(resolved);

  const ratedIssues = resolved.filter((i) => typeof i.citizenRating === 'number');
  const rating =
    ratedIssues.length > 0
      ? Number(
          (ratedIssues.reduce((sum, i) => sum + i.citizenRating, 0) / ratedIssues.length).toFixed(1)
        )
      : 0;

  const verificationScore = verificationRate;
  const assignmentTargetHours = 24;
  const assignmentScore =
    avgAssignmentTime > 0
      ? Math.max(0, Math.min(100, (assignmentTargetHours / avgAssignmentTime) * 100))
      : totalReviewed > 0
        ? 50
        : 0;

  const efficiencyScore = Math.round(
    verificationScore * 0.25 +
      assignmentScore * 0.2 +
      100 * 0.25 + // default team SLA score fallback
      100 * 0.2 + // default team resolution score fallback
      100 * 0.1 // default citizen satisfaction fallback
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
    efficiencyScore: Math.max(0, Math.min(100, efficiencyScore)),
  };
}

export function calculateUnitOfficerTeamSummary(
  foSummaries: FieldOfficerSummary[]
): UnitOfficerTeamSummary {
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

  // Issue-weighted team SLA Compliance
  const totalSlaApplicable = foSummaries.reduce((sum, s) => sum + s.slaApplicableCount, 0);
  const totalSlaCompliant = foSummaries.reduce((sum, s) => sum + s.slaCompliantCount, 0);
  const teamSlaCompliance =
    totalSlaApplicable > 0 ? safePercentage(totalSlaCompliant, totalSlaApplicable) : 0;

  // Issue-weighted team Avg Resolution Time
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

  // Issue-weighted team Citizen Rating
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
    teamEfficiencyScore: Math.max(0, Math.min(100, teamEfficiencyScore)),
  };
}

export function getMonthlyResolutionTrend(issues: Record<string, any>[]): MonthlyTrendItem[] {
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
    const st = normalizeStatus(i.status);
    return (st === 'resolved' || st === 'closed') && (i.resolvedAt || i.closedAt);
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
