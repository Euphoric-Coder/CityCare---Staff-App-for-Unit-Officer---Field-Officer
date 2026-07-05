import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const rangeValidation = v.optional(
  v.union(
    v.literal("7d"),
    v.literal("30d"),
    v.literal("90d"),
    v.literal("all")
  )
);

// --- Reusable Helper Functions ---

function filterByRange(issues: any[], range?: "7d" | "30d" | "90d" | "all") {
  const selectedRange = range ?? "30d";
  if (selectedRange === "all") {
    return issues;
  }
  const now = Date.now();
  let days = 30;
  if (selectedRange === "7d") days = 7;
  else if (selectedRange === "90d") days = 90;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return issues.filter((issue) => issue.createdAt >= cutoff);
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
    const status = issue.status;
    if (status === "pending" || status === "pending_uo_verification") {
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
  const reworkRate = totalAssigned > 0 ? Math.round((reworkCount / totalAssigned) * 100) : 0;

  const reopenCount = issues.reduce((sum, i) => sum + (i.reopenCount ?? 0), 0);
  const reopenRate = totalAssigned > 0 ? Math.round((reopenCount / totalAssigned) * 100) : 0;

  const escalatedCount = issues.filter((i) => i.escalatedToAdmin).length;
  const escalationRate = totalAssigned > 0 ? Math.round((escalatedCount / totalAssigned) * 100) : 0;

  const ftfIssues = resolved.filter(
    (i) => (i.reopenCount ?? 0) === 0 && !i.reworkNote && (!i.reworkReasons || i.reworkReasons.length === 0) && i.status !== "rework_required"
  ).length;
  const firstTimeFixRate = totalResolved > 0 ? Math.round((ftfIssues / totalResolved) * 100) : 100;

  const ratedIssues = resolved.filter((i) => typeof i.citizenRating === "number");
  const ratingSum = ratedIssues.reduce((sum, i) => sum + (i.citizenRating ?? 0), 0);
  const citizenSatisfaction = ratedIssues.length > 0
    ? Math.round((ratingSum / (ratedIssues.length * 5)) * 100)
    : 0;

  return {
    reworkRate,
    reopenRate,
    escalationRate,
    firstTimeFixRate,
    citizenSatisfaction,
  };
}

function calculateFieldOfficerSummary(officer: any, issues: any[]) {
  const totalAssigned = issues.length;
  const activeIssuesList = issues.filter((i) =>
    ["assigned", "in_progress", "submitted_for_review", "pending_uo_verification", "rework_required"].includes(i.status)
  );
  const activeIssues = activeIssuesList.length;
  const maxCapacity = officer.maxIssueCapacity || 10;
  const capacityUsage = maxCapacity > 0 ? Math.round((activeIssues / maxCapacity) * 100) : 0;

  const resolved = issues.filter((i) => i.status === "resolved" || i.status === "closed");
  const totalResolved = resolved.length;

  const avgResolutionTime = calculateAvgResolutionTime(resolved);

  const compliantIssues = resolved.filter(
    (i) => i.slaDeadline && (i.resolvedAt ?? i.closedAt ?? Date.now()) <= i.slaDeadline
  ).length;
  const slaComplianceRate = totalResolved > 0 ? Math.round((compliantIssues / totalResolved) * 100) : 100;

  const slaBreaches = issues.filter((i) => i.slaBreached).length;

  const reworkCount = issues.filter(
    (i) => i.status === "rework_required" || i.reworkNote || (i.reworkReasons && i.reworkReasons.length > 0)
  ).length;

  const reopenCount = issues.reduce((sum, i) => sum + (i.reopenCount ?? 0), 0);
  const escalatedCount = issues.filter((i) => i.escalatedToAdmin).length;

  const ftfIssues = resolved.filter(
    (i) => (i.reopenCount ?? 0) === 0 && !i.reworkNote && (!i.reworkReasons || i.reworkReasons.length === 0) && i.status !== "rework_required"
  ).length;
  const firstTimeFixRate = totalResolved > 0 ? Math.round((ftfIssues / totalResolved) * 100) : 100;

  const ratedIssues = resolved.filter((i) => typeof i.citizenRating === "number");
  const rating = ratedIssues.length > 0
    ? Number((ratedIssues.reduce((sum, i) => sum + i.citizenRating, 0) / ratedIssues.length).toFixed(1))
    : 0;

  const resolutionRate = totalAssigned > 0 ? (totalResolved / totalAssigned) * 100 : 0;
  const ratingScore = (rating / 5) * 100;
  const qualityScore = Math.max(0, 100 - (reworkCount * 5 + reopenCount * 10 + escalatedCount * 15));

  const efficiencyScore = Math.round(
    slaComplianceRate * 0.30 +
    resolutionRate * 0.25 +
    firstTimeFixRate * 0.20 +
    ratingScore * 0.15 +
    qualityScore * 0.10
  );

  return {
    totalAssigned,
    totalResolved,
    activeIssues,
    maxCapacity,
    capacityUsage,
    avgResolutionTime,
    slaComplianceRate,
    slaBreaches,
    reworkCount,
    reopenCount,
    escalatedCount,
    firstTimeFixRate,
    rating,
    efficiencyScore,
  };
}

function calculateUnitOfficerPersonalSummary(officer: any, uoIssues: any[]) {
  const verifiedIssues = uoIssues.filter(
    (i) => i.verificationChecklist?.verifiedBy === officer.userId
  );
  const totalVerified = verifiedIssues.length;

  const rejectedIssues = uoIssues.filter(
    (i) => i.rejection?.rejectedBy === officer.userId
  );
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

  const avgAssignmentTime = 0;

  const activeIssues = uoIssues.filter((i) =>
    ["pending", "verified", "assigned", "in_progress", "submitted_for_review", "pending_uo_verification", "rework_required"].includes(i.status)
  ).length;

  const resolved = uoIssues.filter((i) => i.status === "resolved" || i.status === "closed");
  const resolvedIssues = resolved.length;

  const ratedIssues = resolved.filter((i) => typeof i.citizenRating === "number");
  const rating = ratedIssues.length > 0
    ? Number((ratedIssues.reduce((sum, i) => sum + i.citizenRating, 0) / ratedIssues.length).toFixed(1))
    : 0;

  const verificationScore = verificationRate;
  const assignmentScore = 100;

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
  
  const totalResolvedWithSla = foSummaries.filter((s) => s.totalResolved > 0).length;
  const teamSlaCompliance = totalResolvedWithSla > 0
    ? Math.round(foSummaries.reduce((sum, s) => sum + s.slaComplianceRate, 0) / foSummaries.length)
    : 100;

  const teamAvgResolutionTime = Math.round(
    foSummaries.reduce((sum, s) => sum + s.avgResolutionTime, 0) / assignedFieldOfficerCount
  );
  
  const ratedFos = foSummaries.filter((s) => s.rating > 0);
  const teamCitizenRating = ratedFos.length > 0
    ? Number((foSummaries.reduce((sum, s) => sum + s.rating, 0) / foSummaries.length).toFixed(1))
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
    resolved: counts[tm.key],
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
    const summary = calculateFieldOfficerSummary(fieldOfficer, rangeIssues);

    const resolvedIssues = rangeIssues.filter((i) => i.status === "resolved" || i.status === "closed");

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
    const personal = calculateUnitOfficerPersonalSummary(unitOfficer, rangeUoIssues);

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
      allTeamIssues = allTeamIssues.concat(foIssues);

      const foSum = calculateFieldOfficerSummary(fo, rangeFoIssues);
      foSummaries.push(foSum);
    }

    const team = calculateUnitOfficerTeamSummary(foSummaries);

    // Override the personal efficiencyScore with team variables as per formula:
    // efficiencyScore = verificationRate * 0.25 + assignmentScore * 0.20 + teamSlaScore * 0.25 + teamResolutionScore * 0.20 + citizenSatisfactionScore * 0.10
    const teamResolutionRate = (team.teamResolvedIssues + team.teamActiveIssues) > 0
      ? (team.teamResolvedIssues / (team.teamResolvedIssues + team.teamActiveIssues)) * 100
      : 0;

    personal.efficiencyScore = Math.round(
      personal.verificationRate * 0.25 +
      100 * 0.20 + // assignmentScore = 100 for now
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

    for (const fo of filteredFos) {
      const foIssues = await ctx.db
        .query("issues")
        .withIndex("by_assigned_field_officer", (q) => q.eq("assignedFieldOfficer", fo.userId))
        .collect();

      const rangeFoIssues = filterByRange(foIssues, args.range);
      allTeamIssues = allTeamIssues.concat(rangeFoIssues);

      const foSum = calculateFieldOfficerSummary(fo, rangeFoIssues);

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
        avgResolutionTime: foSum.avgResolutionTime,
        rating: foSum.rating,
        efficiencyScore: foSum.efficiencyScore,
        riskLevel,
      });
    }

    // Leaderboard sorted by efficiencyScore desc
    const leaderboard = [...foDataList].sort((a, b) => b.efficiencyScore - a.efficiencyScore);

    // Workload (officer name + workload status)
    const workload = foDataList.map((fo) => ({
      name: fo.fullName,
      activeIssues: fo.activeIssues,
      workloadPercentage: fo.capacityUsage,
    }));

    // Performers
    const topPerformers = leaderboard.slice(0, 3).map((l) => ({
      name: l.fullName,
      issuesResolved: l.resolvedIssues,
      successRate: l.efficiencyScore,
      rating: l.rating,
    }));

    const needsAttention = foDataList.filter(
      (fo) => fo.riskLevel === "High Risk" || fo.riskLevel === "Needs Attention"
    );

    // Dynamic Summary
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

    const avgResolutionTime = calculateAvgResolutionTime(
      allTeamIssues.filter((i) => i.status === "resolved" || i.status === "closed")
    );

    const resolvedTeam = allTeamIssues.filter((i) => i.status === "resolved" || i.status === "closed");
    const compliantTeam = resolvedTeam.filter(
      (i) => i.slaDeadline && (i.resolvedAt ?? i.closedAt ?? Date.now()) <= i.slaDeadline
    ).length;
    const slaComplianceRate = resolvedTeam.length > 0 ? Math.round((compliantTeam / resolvedTeam.length) * 100) : 100;

    const ratedIssues = resolvedTeam.filter((i) => typeof i.citizenRating === "number");
    const citizenSatisfaction = ratedIssues.length > 0
      ? Number((ratedIssues.reduce((sum, i) => sum + i.citizenRating, 0) / ratedIssues.length).toFixed(1))
      : 0;

    const teamEfficiencyScore = foDataList.length > 0
      ? Math.round(foDataList.reduce((sum, fo) => sum + fo.efficiencyScore, 0) / foDataList.length)
      : 0;

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
    };
  },
});
