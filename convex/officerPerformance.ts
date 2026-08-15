import { v } from "convex/values";
import { query } from "./_generated/server";

const rangeValidation = v.optional(
  v.union(
    v.literal("7d"),
    v.literal("30d"),
    v.literal("90d"),
    v.literal("all")
  )
);

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

  return Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;
}

function getRangeCutoff(range?: "7d" | "30d" | "90d" | "all"): number | null {
  const selectedRange = range ?? "30d";

  if (selectedRange === "all") {
    return null;
  }

  const days =
    selectedRange === "7d"
      ? 7
      : selectedRange === "90d"
        ? 90
        : 30;

  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function issueHasActivityInRange(issue: any, cutoff: number | null): boolean {
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

function filterByRange(issues: any[], range?: "7d" | "30d" | "90d" | "all") {
  const cutoff = getRangeCutoff(range);
  return issues.filter((issue) => issueHasActivityInRange(issue, cutoff));
}

function calculateAvgResolutionTime(resolvedIssues: any[]) {
  if (resolvedIssues.length === 0) return 0;
  let totalMs = 0;
  for (const issue of resolvedIssues) {
    const endTime = issue.resolvedAt ?? issue.closedAt ?? Date.now();
    totalMs += (endTime - issue.createdAt);
  }
  return Math.round(totalMs / (3600 * 1000 * resolvedIssues.length));
}

async function getFieldResolutionDurations(ctx: any, issues: any[]) {
  const completedIssues = issues.filter(
    (issue) =>
      ["resolved", "closed"].includes(issue.status) &&
      (issue.resolvedAt || issue.closedAt)
  );

  if (completedIssues.length === 0) return { totalMs: 0, count: 0, avgHours: 0 };

  const durations = await Promise.all(
    completedIssues.map(async (issue) => {
      const updates = await ctx.db
        .query("issueUpdates")
        .withIndex("by_issue", (q: any) => q.eq("issueId", issue._id))
        .collect();

      const assignedUpdate = updates.find((u: any) => u.status === "assigned");

      const startTime = assignedUpdate?.createdAt ?? issue.createdAt;
      const endTime = issue.resolvedAt ?? issue.closedAt;

      if (!endTime || endTime <= startTime) return null;

      return endTime - startTime;
    })
  );

  const validDurations = durations.filter(
    (duration): duration is number => duration !== null
  );

  if (validDurations.length === 0) return { totalMs: 0, count: 0, avgHours: 0 };

  const totalMs = validDurations.reduce((sum, duration) => sum + duration, 0);
  const count = validDurations.length;
  const avgHours = Math.round(totalMs / count / (1000 * 60 * 60));

  return { totalMs, count, avgHours };
}

async function calculateAvgFieldExecutionTime(ctx: any, issues: any[]) {
  const res = await getFieldResolutionDurations(ctx, issues);
  return res.avgHours;
}

async function calculateAvgAssignmentTime(ctx: any, issues: any[]) {
  const assignedIssues = issues.filter(
    (issue) =>
      (issue.status !== "pending" && issue.status !== "verified") ||
      issue.assignedFieldOfficer
  );

  if (assignedIssues.length === 0) return 0;

  const durations = await Promise.all(
    assignedIssues.map(async (issue) => {
      const updates = await ctx.db
        .query("issueUpdates")
        .withIndex("by_issue", (q: any) => q.eq("issueId", issue._id))
        .collect();

      const verifiedUpdate = updates.find((u: any) => u.status === "verified");
      const assignedUpdate = updates.find((u: any) => u.status === "assigned");

      const startTime = verifiedUpdate?.createdAt ?? issue.createdAt;
      const endTime = assignedUpdate?.createdAt;

      if (!endTime || endTime <= startTime) return null;

      return endTime - startTime;
    })
  );

  const validDurations = durations.filter(
    (duration): duration is number => duration !== null
  );

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
    const status = String(issue.status ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (status === "pending") {
      counts.pending++;
    } else if (status === "verified") {
      counts.verified++;
    } else if (status === "assigned") {
      counts.assigned++;
    } else if (status === "in_progress") {
      counts.in_progress++;
    } else if (status === "submitted_for_review" || status === "pending_uo_verification") {
      counts.submitted_for_review++;
    } else if (status === "rework_required" || status === "rework_requested") {
      counts.rework_required++;
    } else if (status === "resolved") {
      counts.resolved++;
    } else if (status === "closed") {
      counts.closed++;
    } else if (status === "reopened") {
      counts.reopened++;
    } else if (status === "rejected") {
      counts.rejected++;
    }

    if (issue.escalatedToAdmin) {
      counts.escalated++;
    }
  }

  return counts;
}

function getCategoryDistribution(issues: any[]) {
  const distribution: Record<string, number> = {};
  for (const issue of issues) {
    const category = issue.category || "Other";
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
    const priority = (issue.priority || "").toLowerCase();
    if (priority === "low") counts.low++;
    else if (priority === "medium") counts.medium++;
    else if (priority === "high") counts.high++;
    else if (priority === "critical") counts.critical++;
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
  const resolved = issues.filter((i) => i.status === "resolved" || i.status === "closed");
  const totalResolved = resolved.length;

  const reworkCount = issues.filter(
    (i) => i.status === "rework_required" || i.reworkNote || (i.reworkReasons && i.reworkReasons.length > 0)
  ).length;
  const reworkRate = safePercentage(reworkCount, totalResolved);

  const reopenCount = issues.reduce((sum, i) => sum + (i.reopenCount ?? 0), 0);
  const reopenRate = safePercentage(reopenCount, totalResolved);

  const escalatedCount = issues.filter((i) => i.escalatedToAdmin).length;
  const escalationRate = safePercentage(escalatedCount, totalAssigned);

  const ftfIssues = resolved.filter(
    (i) => (i.reopenCount ?? 0) === 0 && !i.reworkNote && (!i.reworkReasons || i.reworkReasons.length === 0) && i.status !== "rework_required"
  ).length;
  const firstTimeFixRate = totalResolved > 0 ? safePercentage(ftfIssues, totalResolved) : 0;

  const ratedIssues = resolved.filter((i) => typeof i.citizenRating === "number");
  const ratingSum = ratedIssues.reduce((sum, i) => sum + (i.citizenRating ?? 0), 0);
  const citizenSatisfaction = ratedIssues.length > 0
    ? safePercentage(ratingSum, ratedIssues.length * 5)
    : 0;

  return {
    reworkRate,
    reopenRate,
    escalationRate,
    firstTimeFixRate,
    citizenSatisfaction,
  };
}

async function calculateFieldOfficerSummary(ctx: any, officer: any, issues: any[], range?: "7d" | "30d" | "90d" | "all") {
  const cutoff = getRangeCutoff(range);
  const totalAssigned = issues.length;

  const activeIssuesList = issues.filter((i) =>
    ["assigned", "in_progress", "submitted_for_review", "pending_uo_verification", "rework_required"].includes(i.status)
  );
  const activeIssues = activeIssuesList.length;
  const maxCapacity = officer.maxIssueCapacity || 10;
  const capacityUsage = maxCapacity > 0 ? Math.round((activeIssues / maxCapacity) * 100) : 0;

  // Resolved in selected range window
  const resolved = issues.filter((i) => {
    if (i.status !== "resolved" && i.status !== "closed") return false;
    const completedAt = i.resolvedAt ?? i.closedAt;
    return cutoff === null || safeNumber(completedAt) >= cutoff;
  });
  const totalResolved = resolved.length;

  const durationsResult = await getFieldResolutionDurations(ctx, resolved);
  const avgResolutionTime = durationsResult.avgHours;
  const totalResolutionDurationMs = durationsResult.totalMs;
  const validResolutionDurationCount = durationsResult.count;

  // SLA Compliance from range resolved issues
  const slaApplicableResolvedIssues = resolved.filter(
    (issue) =>
      Boolean(issue.slaDeadline) &&
      Boolean(issue.resolvedAt ?? issue.closedAt)
  );

  const slaCompliantResolvedIssues = slaApplicableResolvedIssues.filter(
    (issue) => {
      const completedAt = issue.resolvedAt ?? issue.closedAt;
      return safeNumber(completedAt) <= safeNumber(issue.slaDeadline);
    }
  );

  const hasSlaData = slaApplicableResolvedIssues.length > 0;
  const slaComplianceRate = hasSlaData
    ? safePercentage(
        slaCompliantResolvedIssues.length,
        slaApplicableResolvedIssues.length
      )
    : 0;

  const slaBreaches = issues.filter((i) => i.slaBreached).length;

  const reworkCount = issues.filter(
    (i) => i.status === "rework_required" || i.reworkNote || (i.reworkReasons && i.reworkReasons.length > 0)
  ).length;

  const reopenCount = issues.reduce((sum, i) => sum + (i.reopenCount ?? 0), 0);
  const escalatedCount = issues.filter((i) => i.escalatedToAdmin).length;

  // Rates instead of fixed counts
  const reworkRate = safePercentage(reworkCount, totalResolved);
  const reopenRate = safePercentage(reopenCount, totalResolved);
  const escalationRate = safePercentage(escalatedCount, totalAssigned);

  const qualityScoreCalculated = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 -
          reworkRate * 0.40 -
          reopenRate * 0.35 -
          escalationRate * 0.25
      )
    )
  );
  const qualityScore = totalResolved > 0 ? qualityScoreCalculated : 0;

  // First time fix using only completed issues
  const firstTimeFixIssues = resolved.filter((issue) => {
    const hasRework =
      safeNumber(issue.reworkCount) > 0 ||
      Boolean(issue.reworkNote) ||
      (
        Array.isArray(issue.reworkReasons) &&
        issue.reworkReasons.length > 0
      );

    const hasReopen = safeNumber(issue.reopenCount) > 0;

    return !hasRework && !hasReopen;
  });

  const firstTimeFixRate = totalResolved > 0
    ? safePercentage(firstTimeFixIssues.length, totalResolved)
    : 0;

  // Citizen Rating Calculations
  const ratings = resolved
    .map((issue) => safeNumber(issue.citizenRating, -1))
    .filter((rating) => rating >= 1 && rating <= 5);

  const ratedIssueCount = ratings.length;
  const ratingSum = ratings.reduce((sum, val) => sum + val, 0);

  const rating = ratedIssueCount > 0
    ? Number((ratingSum / ratedIssueCount).toFixed(1))
    : 0;

  const hasCitizenRatings = ratedIssueCount > 0;
  const ratingScore = hasCitizenRatings ? safePercentage(rating, 5) : 50;

  const resolutionRate = safePercentage(totalResolved, totalAssigned);

  const targetResolutionHours = 72;
  const resolutionSpeedScore = totalResolved > 0 && avgResolutionTime > 0
    ? Math.max(
        0,
        Math.min(
          100,
          (targetResolutionHours / avgResolutionTime) * 100
        )
      )
    : 0;

  const rawPerformanceScore =
    resolutionRate * 0.30 +
    slaComplianceRate * 0.25 +
    firstTimeFixRate * 0.20 +
    ratingScore * 0.15 +
    resolutionSpeedScore * 0.10;

  // Sample size confidence factor
  const MIN_COMPLETED_FOR_FULL_CONFIDENCE = 5;
  const confidenceFactor = totalResolved <= 0
    ? 0
    : Math.min(1, totalResolved / MIN_COMPLETED_FOR_FULL_CONFIDENCE);

  const efficiencyScore = totalResolved <= 0
    ? 0
    : Math.round(
        rawPerformanceScore * confidenceFactor +
        50 * (1 - confidenceFactor)
      );

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

async function calculateUnitOfficerPersonalSummary(ctx: any, officer: any, uoIssues: any[], range?: "7d" | "30d" | "90d" | "all") {
  const cutoff = getRangeCutoff(range);

  const verifiedIssues = uoIssues.filter((i) => {
    const verifiedAt = i.verificationChecklist?.verifiedAt;
    return i.verificationChecklist?.verifiedBy === officer.userId &&
           (cutoff === null || safeNumber(verifiedAt) >= cutoff);
  });
  const totalVerified = verifiedIssues.length;

  const rejectedIssues = uoIssues.filter((i) => {
    const rejectedAt = i.rejection?.rejectedAt;
    return i.rejection?.rejectedBy === officer.userId &&
           (cutoff === null || safeNumber(rejectedAt) >= cutoff);
  });
  const totalRejected = rejectedIssues.length;

  const totalReviewed = totalVerified + totalRejected;
  const verificationRate = totalReviewed > 0 ? Math.round((totalVerified / totalReviewed) * 100) : 0;

  let totalVerTimeMs = 0;
  for (const issue of verifiedIssues) {
    if (issue.verificationChecklist?.verifiedAt) {
      totalVerTimeMs += (issue.verificationChecklist.verifiedAt - issue.createdAt);
    }
  }
  const avgVerificationTime = totalVerified > 0
    ? Math.round(totalVerTimeMs / (totalVerified * 3600 * 1000))
    : 0;

  const avgAssignmentTime = await calculateAvgAssignmentTime(ctx, uoIssues);

  const activeIssues = uoIssues.filter((i) =>
    ["pending", "verified", "assigned", "in_progress", "submitted_for_review", "pending_uo_verification", "rework_required"].includes(i.status)
  ).length;

  const resolved = uoIssues.filter((i) => {
    if (i.status !== "resolved" && i.status !== "closed") return false;
    const completedAt = i.resolvedAt ?? i.closedAt;
    return cutoff === null || safeNumber(completedAt) >= cutoff;
  });
  const resolvedIssues = resolved.length;

  const overallAvgResolutionTime = calculateAvgResolutionTime(resolved);

  const ratedIssues = resolved.filter((i) => typeof i.citizenRating === "number");
  const rating = ratedIssues.length > 0
    ? Number((ratedIssues.reduce((sum, i) => sum + i.citizenRating, 0) / ratedIssues.length).toFixed(1))
    : 0;

  const verificationScore = verificationRate;
  const assignmentTargetHours = 24;
  const assignmentScore = avgAssignmentTime > 0
    ? Math.max(0, Math.min(100, (assignmentTargetHours / avgAssignmentTime) * 100))
    : totalReviewed > 0 ? 50 : 0;

  const efficiencyScore = Math.round(
    verificationScore * 0.25 +
    assignmentScore * 0.20 +
    100 * 0.25 + // default team SLA score fallback
    100 * 0.20 + // default team resolution score fallback
    100 * 0.10 // default citizen satisfaction fallback
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

  // Issue-weighted team SLA Compliance
  const totalSlaApplicable = foSummaries.reduce((sum, s) => sum + s.slaApplicableCount, 0);
  const totalSlaCompliant = foSummaries.reduce((sum, s) => sum + s.slaCompliantCount, 0);
  const teamSlaCompliance = totalSlaApplicable > 0
    ? safePercentage(totalSlaCompliant, totalSlaApplicable)
    : 0;

  // Issue-weighted team Avg Resolution Time
  const teamResolutionDurationMs = foSummaries.reduce((sum, s) => sum + s.totalResolutionDurationMs, 0);
  const teamResolutionSampleCount = foSummaries.reduce((sum, s) => sum + s.validResolutionDurationCount, 0);
  const teamAvgResolutionTime = teamResolutionSampleCount > 0
    ? Math.round(teamResolutionDurationMs / teamResolutionSampleCount / (1000 * 60 * 60))
    : 0;

  // Issue-weighted team Citizen Rating
  const totalRatingCount = foSummaries.reduce((sum, s) => sum + s.ratedIssueCount, 0);
  const totalRatingSum = foSummaries.reduce((sum, s) => sum + s.ratingSum, 0);
  const teamCitizenRating = totalRatingCount > 0
    ? Number((totalRatingSum / totalRatingCount).toFixed(1))
    : 0;

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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

  const resolved = issues.filter(
    (i) => (i.status === "resolved" || i.status === "closed") && (i.resolvedAt || i.closedAt)
  );

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
    userId: v.id("users"),
    range: rangeValidation,
  },
  handler: async (ctx, args) => {
    const fieldOfficer = await ctx.db
      .query("fieldOfficers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!fieldOfficer) {
      throw new Error("Field Officer not found");
    }

    const allIssues = await ctx.db
      .query("issues")
      .withIndex("by_assigned_field_officer", (q) => q.eq("assignedFieldOfficer", fieldOfficer.userId))
      .collect();

    const rangeIssues = filterByRange(allIssues, args.range);
    const summary = await calculateFieldOfficerSummary(ctx, fieldOfficer, rangeIssues, args.range);

    const cutoff = getRangeCutoff(args.range);
    const resolvedIssues = rangeIssues.filter((i) => {
      if (i.status !== "resolved" && i.status !== "closed") return false;
      const completedAt = i.resolvedAt ?? i.closedAt;
      return cutoff === null || safeNumber(completedAt) >= cutoff;
    });

    const charts = {
      statusBreakdown: getStatusBreakdown(rangeIssues),
      priorityDistribution: getPriorityDistribution(rangeIssues),
      slaBreakdown: getSlaBreakdown(rangeIssues),
      monthlyResolutionTrend: getMonthlyResolutionTrend(allIssues), // trend over all time for history
      qualityMetrics: getQualityMetrics(rangeIssues, summary.totalAssigned),
    };

    // recent completed issues
    const recentIssues = resolvedIssues
      .sort((a, b) => (b.resolvedAt ?? b.closedAt ?? 0) - (a.resolvedAt ?? a.closedAt ?? 0))
      .slice(0, 5)
      .map((i) => ({
        _id: i._id,
        issueCode: i.issueCode,
        title: i.title,
        status: i.status,
        completedAt: i.resolvedAt ?? i.closedAt ?? i.createdAt,
        citizenRating: i.citizenRating,
      }));

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
    userId: v.id("users"),
    range: rangeValidation,
  },
  handler: async (ctx, args) => {
    const unitOfficer = await ctx.db
      .query("unitOfficers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!unitOfficer) {
      throw new Error("Unit Officer not found");
    }

    // Fetch all issues assigned to this unit officer
    const allUoIssues = await ctx.db
      .query("issues")
      .withIndex("by_assigned_unit_officer", (q) => q.eq("assignedUnitOfficer", unitOfficer.userId))
      .collect();

    const rangeUoIssues = filterByRange(allUoIssues, args.range);
    const personal = await calculateUnitOfficerPersonalSummary(ctx, unitOfficer, rangeUoIssues, args.range);

    // Fetch team field officers
    const teamFieldOfficers = await ctx.db
      .query("fieldOfficers")
      .withIndex("by_unit_officer", (q) => q.eq("reportingUnitOfficerId", unitOfficer._id))
      .collect();

    const filteredFos = teamFieldOfficers.filter(
      (fo) =>
        fo.city === unitOfficer.city &&
        fo.department === unitOfficer.department &&
        fo.accountApproved === true
    );

    const foSummaries = [];
    let allTeamIssues: any[] = [];

    for (const fo of filteredFos) {
      const foIssues = await ctx.db
        .query("issues")
        .withIndex("by_assigned_field_officer", (q) => q.eq("assignedFieldOfficer", fo.userId))
        .collect();

      const rangeFoIssues = filterByRange(foIssues, args.range);
      allTeamIssues = allTeamIssues.concat(rangeFoIssues);

      const foSum = await calculateFieldOfficerSummary(ctx, fo, rangeFoIssues, args.range);
      foSummaries.push(foSum);
    }

    const team = calculateUnitOfficerTeamSummary(foSummaries);

    // Dynamic verification & assignment rates
    const teamResolutionRate = (team.teamResolvedIssues + team.teamActiveIssues) > 0
      ? (team.teamResolvedIssues / (team.teamResolvedIssues + team.teamActiveIssues)) * 100
      : 0;

    const assignmentTargetHours = 24;
    const assignmentScore = personal.avgAssignmentTime > 0
      ? Math.max(0, Math.min(100, (assignmentTargetHours / personal.avgAssignmentTime) * 100))
      : personal.totalReviewed > 0 ? 50 : 0;

    personal.efficiencyScore = Math.round(
      personal.verificationRate * 0.25 +
      assignmentScore * 0.20 +
      team.teamSlaCompliance * 0.25 +
      teamResolutionRate * 0.20 +
      (team.teamCitizenRating / 5 * 100) * 0.10
    );

    const charts = {
      verificationTrend: getMonthlyResolutionTrend(allUoIssues), // Using monthly resolution trend logic for verifications
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
    userId: v.id("users"),
    range: rangeValidation,
  },
  handler: async (ctx, args) => {
    const unitOfficer = await ctx.db
      .query("unitOfficers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!unitOfficer) {
      throw new Error("Unit Officer not found");
    }

    const teamFieldOfficers = await ctx.db
      .query("fieldOfficers")
      .withIndex("by_unit_officer", (q) => q.eq("reportingUnitOfficerId", unitOfficer._id))
      .collect();

    const filteredFos = teamFieldOfficers.filter(
      (fo) =>
        fo.city === unitOfficer.city &&
        fo.department === unitOfficer.department &&
        fo.accountApproved === true
    );

    let allTeamIssues: any[] = [];
    const foDataList: any[] = [];
    const foSummaries = [];

    for (const fo of filteredFos) {
      const foIssues = await ctx.db
        .query("issues")
        .withIndex("by_assigned_field_officer", (q) => q.eq("assignedFieldOfficer", fo.userId))
        .collect();

      const rangeFoIssues = filterByRange(foIssues, args.range);
      allTeamIssues = allTeamIssues.concat(rangeFoIssues);

      const foSum = await calculateFieldOfficerSummary(ctx, fo, rangeFoIssues, args.range);
      foSummaries.push(foSum);

      let riskLevel = "Good";
      if (foSum.capacityUsage > 90 || foSum.slaComplianceRate < 60) {
        riskLevel = "High Risk";
      } else if (foSum.capacityUsage > 75 || foSum.slaComplianceRate < 75) {
        riskLevel = "Needs Attention";
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
        // all remaining fields as per Part 12:
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

    // Top Performer & leaderboard calculations (tie-breakers and zero-resolved exclusion)
    const eligiblePerformers = foDataList.filter((officer) => officer.resolvedIssues > 0);

    const leaderboard = [...eligiblePerformers].sort((a, b) => {
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
      (fo) => fo.riskLevel === "High Risk" || fo.riskLevel === "Needs Attention"
    );

    // Dynamic Team Summary using corrected weighted sums
    const team = calculateUnitOfficerTeamSummary(foSummaries);
    const totalIssues = allTeamIssues.length;
    const resolvedIssues = allTeamIssues.filter((i) => i.status === "resolved" || i.status === "closed").length;
    const activeIssues = allTeamIssues.filter((i) =>
      ["assigned", "in_progress", "submitted_for_review", "pending_uo_verification", "rework_required"].includes(i.status)
    ).length;

    const escalatedIssues = allTeamIssues.filter((i) => i.escalatedToAdmin).length;
    const reworkIssues = allTeamIssues.filter(
      (i) => i.status === "rework_required" || i.reworkNote || (i.reworkReasons && i.reworkReasons.length > 0)
    ).length;
    const reopenedIssues = allTeamIssues.reduce((sum, i) => sum + (i.reopenCount ?? 0), 0);

    const avgResolutionTime = team.teamAvgResolutionTime;
    const slaComplianceRate = team.teamSlaCompliance;
    const citizenSatisfaction = team.teamCitizenRating;
    const teamEfficiencyScore = team.teamEfficiencyScore;

    // Generate insights
    const insights = [];
    if (topPerformers.length > 0) {
      insights.push({
        type: "positive",
        title: "Top Performer",
        text: `Officer ${topPerformers[0].name} has the highest efficiency score of ${topPerformers[0].successRate}%.`,
      });
    }
    if (needsAttention.length > 0) {
      insights.push({
        type: "attention",
        title: "Attention Required",
        text: `${needsAttention.length} officer(s) require review due to low SLA compliance or high workload.`,
      });
    }
    if (slaComplianceRate < 80) {
      insights.push({
        type: "warning",
        title: "SLA Warning",
        text: `Team SLA compliance rate is at ${slaComplianceRate}%, which is below the target threshold.`,
      });
    } else {
      insights.push({
        type: "info",
        title: "SLA On Track",
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
      // Debug Rankings as requested:
      debugRanking: leaderboard.map((officer) => ({
        officerId: officer.officerId,
        fullName: officer.fullName,
        totalAssigned: officer.totalAssigned,
        resolvedIssues: officer.resolvedIssues,
        resolutionRate: officer.resolutionRate,
        slaComplianceRate: officer.slaComplianceRate,
        firstTimeFixRate: officer.firstTimeFixRate,
        ratingScore: officer.ratingScore,
        resolutionSpeedScore: officer.resolutionSpeedScore,
        performanceScore: officer.efficiencyScore,
        completedSampleSize: officer.completedSampleSize,
        isSampleSufficient: officer.isSampleSufficient,
      })),
    };
  },
});
