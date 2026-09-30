// @ts-nocheck
import {
  buildDuplicateGroupsFromIssues,
  getDuplicateFlagsByIssueId,
} from "./duplicateDetection";

function safeNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

function safeDateMs(value) {
  if (!value) return Date.now();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return isNaN(parsed) ? Date.now() : parsed;
  }
  return Date.now();
}

function getIssueCreatedMs(issue) {
  return safeDateMs(issue.createdAt || issue._createdAt);
}

function getSlaStatus(issue, now = Date.now()) {
  if (!issue.slaDeadline) return "not_set";
  const deadline = safeDateMs(issue.slaDeadline);
  if (deadline < now) return "overdue";
  if (deadline - now <= 48 * 60 * 60 * 1000) return "due_soon";
  return "on_track";
}

function percentage(value, total) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function normalizeKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const DEPARTMENT_CATEGORY_ALIASES = {
  road: ["road", "road_infrastructure", "roads", "road_and_infrastructure"],
  electricity: [
    "electricity",
    "electricity_lighting",
    "electricity_and_lighting",
  ],
  water: ["water", "water_supply"],
  sanitation: ["sanitation", "sanitation_waste", "sanitation_and_waste"],
  drainage: ["drainage", "drainage_sewer", "drainage_and_sewer"],
  solid_waste: ["solid_waste", "solid_waste_management"],
  public_health: ["public_health"],
  other: ["other"],
};

export function departmentMatchesCategory(department, category) {
  const dep = normalizeKey(department);
  const cat = normalizeKey(category);

  if (dep === cat) return true;
  if (cat === "other") return true;

  return Object.values(DEPARTMENT_CATEGORY_ALIASES).some((aliases) => {
    return aliases.includes(dep) && aliases.includes(cat);
  });
}

export function isPendingDuplicateReviewStatus(status) {
  return normalizeKey(status) === "pending";
}

export function hasValidCoordinates(issue) {
  return (
    Number.isFinite(issue.latitude) &&
    Number.isFinite(issue.longitude) &&
    Math.abs(issue.latitude) <= 90 &&
    Math.abs(issue.longitude) <= 180
  );
}

export function normalizeIssueForDuplicateDetection(issue) {
  const id = String(issue?._id ?? issue?.id ?? "");

  const latitude = Number(issue?.coordinates?.latitude ?? issue?.latitude ?? 0);

  const longitude = Number(
    issue?.coordinates?.longitude ?? issue?.longitude ?? 0,
  );

  return {
    ...issue,
    _id: id,
    id,
    latitude,
    longitude,
    coordinates: {
      latitude,
      longitude,
    },
    subcategory: Array.isArray(issue?.subcategory)
      ? issue.subcategory
      : Array.isArray(issue?.subCategories)
        ? issue.subCategories
        : issue?.subcategory
          ? [issue.subcategory]
          : [],
    category: normalizeKey(issue?.category),
    status: normalizeKey(issue?.status),
    createdAt:
      issue?.createdAt ??
      issue?._creationTime ??
      issue?._createdAt ??
      Date.now(),
  };
}

function normalizeIssueToRawIssue(issue) {
  return normalizeIssueForDuplicateDetection(issue);
}

export function buildCategoryTrends(issues, prevIssues = []) {
  const counts = {};

  issues.forEach((issue) => {
    const cat = issue.category || "Other";
    if (!counts[cat]) {
      counts[cat] = {
        count: 0,
        active: 0,
        resolved: 0,
        duplicate: 0,
        overdue: 0,
        totalResTimeMs: 0,
        resolvedCount: 0,
      };
    }
    counts[cat].count++;

    const isActive = [
      "assigned",
      "in_progress",
      "submitted_for_review",
      "pending_uo_verification",
      "rework_required",
    ].includes(issue.status);
    const isResolved = ["resolved", "closed"].includes(issue.status);

    if (isActive) counts[cat].active++;
    if (isResolved) {
      counts[cat].resolved++;
      const resolvedAt = issue.resolvedAt || issue.closedAt;
      if (resolvedAt && issue.createdAt) {
        counts[cat].totalResTimeMs += resolvedAt - issue.createdAt;
        counts[cat].resolvedCount++;
      }
    }

    if (getSlaStatus(issue) === "overdue") {
      counts[cat].overdue++;
    }
  });

  const prevCatCounts = {};
  prevIssues.forEach((issue) => {
    const cat = issue.category || "Other";
    prevCatCounts[cat] = (prevCatCounts[cat] || 0) + 1;
  });

  const total = issues.length;

  return Object.entries(counts)
    .map(([category, data]) => {
      const currentCount = data.count;
      const prevCount = prevCatCounts[category] || 0;
      const change =
        prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0;

      let direction = "stable";
      if (change > 10) direction = "up";
      else if (change < -10) direction = "down";

      return {
        category,
        label: category,
        count: currentCount,
        percentage: percentage(currentCount, total),
        activeCount: data.active,
        resolvedCount: data.resolved,
        duplicateCount: data.duplicate,
        overdueCount: data.overdue,
        avgResolutionTimeHours:
          data.resolvedCount > 0
            ? Math.round(
                data.totalResTimeMs / (data.resolvedCount * 3600 * 1000),
              )
            : 0,
        trendDirection: {
          changePercent: Math.round(change),
          direction,
          label: `${Math.abs(Math.round(change))}% ${direction}`,
        },
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function buildSubcategoryTrends(issues, prevIssues = []) {
  const counts = {};

  issues.forEach((issue) => {
    const cat = issue.category || "Other";
    const subs = issue.subcategory || issue.subCategories || [];
    const normalizedSubs = Array.isArray(subs) ? subs : [subs].filter(Boolean);

    normalizedSubs.forEach((sub) => {
      if (!counts[sub]) {
        counts[sub] = { count: 0, category: cat, duplicate: 0, overdue: 0 };
      }
      counts[sub].count++;
      if (getSlaStatus(issue) === "overdue") {
        counts[sub].overdue++;
      }
    });
  });

  const prevSubCounts = {};
  prevIssues.forEach((issue) => {
    const subs = issue.subcategory || issue.subCategories || [];
    const normalizedSubs = Array.isArray(subs) ? subs : [subs].filter(Boolean);
    normalizedSubs.forEach((sub) => {
      prevSubCounts[sub] = (prevSubCounts[sub] || 0) + 1;
    });
  });

  const total = issues.length;

  return Object.entries(counts)
    .map(([subcategory, data]) => {
      const currentCount = data.count;
      const prevCount = prevSubCounts[subcategory] || 0;
      const change =
        prevCount > 0 ? ((currentCount - prevCount) / prevCount) * 100 : 0;

      let direction = "stable";
      if (change > 10) direction = "up";
      else if (change < -10) direction = "down";

      return {
        subcategory,
        category: data.category,
        count: currentCount,
        percentage: percentage(currentCount, total),
        duplicateCount: data.duplicate,
        overdueCount: data.overdue,
        trendDirection: {
          changePercent: Math.round(change),
          direction,
          label: `${Math.abs(Math.round(change))}% ${direction}`,
        },
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function buildPriorityDistribution(issues) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 };
  let total = 0;
  issues.forEach((issue) => {
    const pri = (issue.priority || "medium").toLowerCase();
    if (pri in counts) {
      counts[pri]++;
      total++;
    } else {
      counts.medium++;
      total++;
    }
  });
  return Object.entries(counts).map(([priority, count]) => ({
    priority,
    count,
    percentage: percentage(count, total),
  }));
}

export function buildStatusDistribution(issues) {
  const counts = {};
  issues.forEach((issue) => {
    const status = issue.status || "pending";
    counts[status] = (counts[status] || 0) + 1;
  });
  const total = issues.length;
  return Object.entries(counts).map(([status, count]) => ({
    status,
    count,
    percentage: percentage(count, total),
  }));
}

function getDuplicateGroupUniqueIssueCount(group) {
  const ids = new Set();

  if (Array.isArray(group?.issues)) {
    group.issues.forEach((issue) => {
      const id = String(issue?._id ?? issue?.id ?? "");
      if (id) ids.add(id);
    });
  }

  if (Array.isArray(group?.pairMetrics)) {
    group.pairMetrics.forEach((pair) => {
      if (pair?.issueAId) ids.add(String(pair.issueAId));
      if (pair?.issueBId) ids.add(String(pair.issueBId));
      if (pair?.matchedIssueId) ids.add(String(pair.matchedIssueId));
    });
  }

  return ids.size;
}

function buildDuplicateTrendWithFilter(issues, statusFilter) {
  const normalizedIssues = issues.map(normalizeIssueToRawIssue).filter(Boolean);

  const duplicateRelevantIssues = normalizedIssues.filter((i) => {
    return statusFilter(i);
  });

  const pendingDuplicateCandidateCount = duplicateRelevantIssues.length;

  const duplicateGroups = buildDuplicateGroupsFromIssues(
    duplicateRelevantIssues,
  );
  const totalGroups = duplicateGroups.length;

  const duplicateGroupIssueCount = duplicateGroups.reduce((sum, group) => {
    const groupSize = getDuplicateGroupUniqueIssueCount(group);
    return sum + groupSize;
  }, 0);

  const redundantDuplicateIssues = duplicateGroups.reduce((sum, group) => {
    const groupSize = getDuplicateGroupUniqueIssueCount(group);
    return sum + Math.max(0, groupSize - 1);
  }, 0);

  const duplicateRate =
    duplicateRelevantIssues.length > 0
      ? Math.round(
          (duplicateGroupIssueCount / duplicateRelevantIssues.length) * 100,
        )
      : 0;

  const redundancyRate =
    duplicateRelevantIssues.length > 0
      ? Math.round(
          (redundantDuplicateIssues / duplicateRelevantIssues.length) * 100,
        )
      : 0;

  const strongestGroupScore =
    duplicateGroups.length > 0
      ? Math.max(
          ...duplicateGroups.map((g) => g.similarityMetrics.bestDuplicateScore),
        )
      : 0;

  const highConfidenceGroups = duplicateGroups.filter(
    (g) => g.similarityMetrics.bestDuplicateScore >= 80,
  ).length;

  const duplicateCats = {};
  const duplicateSubs = {};

  duplicateGroups.forEach((g) => {
    g.issues.forEach((i) => {
      if (i.category) {
        duplicateCats[i.category] = (duplicateCats[i.category] || 0) + 1;
      }
      const subs = i.subcategory || i.subCategories || [];
      subs.forEach((sub) => {
        duplicateSubs[sub] = (duplicateSubs[sub] || 0) + 1;
      });
    });
  });

  const topDuplicateCategories = Object.keys(duplicateCats)
    .sort((a, b) => duplicateCats[b] - duplicateCats[a])
    .slice(0, 3);
  const topDuplicateSubcategories = Object.keys(duplicateSubs)
    .sort((a, b) => duplicateSubs[b] - duplicateSubs[a])
    .slice(0, 3);

  const recentDuplicateGroups = duplicateGroups
    .sort((a, b) => safeDateMs(b.detectedAt) - safeDateMs(a.detectedAt))
    .slice(0, 3)
    .map((g) => {
      const groupIssueCount = getDuplicateGroupUniqueIssueCount(g);

      return {
        groupId: g.id,
        category: g.issues?.[0]?.category || "other",
        issueCount: groupIssueCount,
        redundantIssueCount: Math.max(0, groupIssueCount - 1),
        bestScore: g.similarityMetrics.bestDuplicateScore,
      };
    });

  return {
    totalGroups,
    duplicateGroupIssueCount,
    redundantDuplicateIssues,
    totalDuplicateIssues: duplicateGroupIssueCount,
    activeDuplicateCandidateCount: pendingDuplicateCandidateCount,
    pendingDuplicateCandidateCount,
    duplicateRate,
    redundancyRate,
    strongestGroupScore,
    highConfidenceGroups,
    topDuplicateCategories,
    topDuplicateSubcategories,
    recentDuplicateGroups,
  };
}

const SYSTEM_ADMIN_DUPLICATE_STATUSES = new Set([
  "pending",
  "reopened",
  "verified",
  "assigned",
  "in_progress",
  "pending_uo_verification",
  "rework_required",
  "escalated",
]);

export function buildSystemAdminDuplicateTrend(issues) {
  return buildDuplicateTrendWithFilter(issues, (issue) =>
    SYSTEM_ADMIN_DUPLICATE_STATUSES.has(normalizeKey(issue.status)),
  );
}

export function buildDuplicateTrend(issues) {
  return buildDuplicateTrendWithFilter(issues, (issue) =>
    isPendingDuplicateReviewStatus(issue.status),
  );
}

export function buildGeoHotspots(issues, options) {
  const radius = options?.radiusMeters ?? 500;

  const validIssues = issues
    .map(normalizeIssueToRawIssue)
    .filter((issue) => issue && issue.latitude && issue.longitude);

  if (validIssues.length === 0) return [];

  const hotspots = [];
  const visited = new Set();

  for (const issue of validIssues) {
    if (visited.has(issue.id)) continue;

    const cluster = validIssues.filter((other) => {
      const dist = haversineDistanceMeters(
        issue.latitude,
        issue.longitude,
        other.latitude,
        other.longitude,
      );
      return dist <= radius;
    });

    if (cluster.length > 0) {
      cluster.forEach((i) => visited.add(i.id));

      const centerLatitude =
        cluster.reduce((sum, i) => sum + i.latitude, 0) / cluster.length;
      const centerLongitude =
        cluster.reduce((sum, i) => sum + i.longitude, 0) / cluster.length;

      const unresolvedCount = cluster.filter(
        (i) => !["resolved", "closed", "rejected"].includes(i.status),
      ).length;

      const duplicateCount = 0;

      const categoriesMap = {};
      const subcategoriesMap = {};

      cluster.forEach((i) => {
        if (i.category) {
          categoriesMap[i.category] = (categoriesMap[i.category] || 0) + 1;
        }
        const subs = i.subcategory || i.subCategories || [];
        subs.forEach((sub) => {
          subcategoriesMap[sub] = (subcategoriesMap[sub] || 0) + 1;
        });
      });

      const categories = Object.keys(categoriesMap).sort(
        (a, b) => categoriesMap[b] - categoriesMap[a],
      );
      const subcategories = Object.keys(subcategoriesMap).sort(
        (a, b) => subcategoriesMap[b] - subcategoriesMap[a],
      );

      let severity = "low";
      const totalCount = cluster.length;
      if (totalCount >= 11 || unresolvedCount >= 5) {
        severity = "critical";
      } else if (totalCount >= 6) {
        severity = "high";
      } else if (totalCount >= 3) {
        severity = "medium";
      }

      const label =
        unresolvedCount >= 3
          ? `${categories[0] || "Civic"} hotspot with ${unresolvedCount} unresolved complaints`
          : `Repeated ${categories[0] || "civic"} complaints near this location`;

      const newestIssue = [...cluster].sort(
        (a, b) => b.createdAt - a.createdAt,
      )[0];
      const approximateAddress =
        newestIssue.address || newestIssue.location || "Address unavailable";

      hotspots.push({
        id: `hotspot_${issue.id}`,
        centerLatitude,
        centerLongitude,
        approximateAddress,
        issueCount: totalCount,
        unresolvedCount,
        duplicateCount,
        categories,
        subcategories,
        severity,
        radiusMeters: radius,
        label,
      });
    }
  }

  return hotspots.sort((a, b) => b.issueCount - a.issueCount);
}

export function buildRecurringPatterns(issues, options) {
  const radius = options?.radiusMeters ?? 500;

  const validIssues = issues
    .map(normalizeIssueToRawIssue)
    .filter((issue) => issue && issue.latitude && issue.longitude);

  if (validIssues.length === 0) return [];

  const patterns = [];
  const processed = new Set();

  for (const issue of validIssues) {
    const key = `${issue.category}_${(issue.subcategory || []).join(",")}`;
    if (processed.has(issue.id + "_" + key)) continue;

    const cluster = validIssues.filter((other) => {
      if (other.category !== issue.category) return false;
      const otherSubs = other.subcategory || [];
      const thisSubs = issue.subcategory || [];
      const hasSubOverlap =
        otherSubs.some((sub) => thisSubs.includes(sub)) ||
        (thisSubs.length === 0 && otherSubs.length === 0);
      if (!hasSubOverlap) return false;

      const dist = haversineDistanceMeters(
        issue.latitude,
        issue.longitude,
        other.latitude,
        other.longitude,
      );
      return dist <= radius;
    });

    if (cluster.length >= 3) {
      cluster.forEach((c) => processed.add(c.id + "_" + key));

      const createdTimes = cluster.map(getIssueCreatedMs).sort((a, b) => a - b);
      const firstReportedAt = createdTimes[0];
      const lastReportedAt = createdTimes[createdTimes.length - 1];

      const duplicateCount = 0;

      let recurrenceStrength = "weak";
      if (cluster.length >= 8) {
        recurrenceStrength = "strong";
      } else if (cluster.length >= 4) {
        recurrenceStrength = "moderate";
      }

      const subName = (issue.subcategory || [])[0] || "general";

      patterns.push({
        patternId: `pattern_${issue.id}_${issue.category}`,
        category: issue.category,
        subcategory: subName,
        locationLabel: issue.address || issue.location || "Address unavailable",
        issueCount: cluster.length,
        duplicateCount,
        firstReportedAt,
        lastReportedAt,
        recurrenceStrength,
        reason: `Detected ${cluster.length} similar ${issue.category} complaints reported at this location within ${radius}m.`,
      });
    }
  }

  return patterns.sort((a, b) => b.issueCount - a.issueCount);
}

export function buildSlaTrends(issues, now = Date.now()) {
  let overdueCount = 0;
  let dueSoonCount = 0;
  let onTrackCount = 0;
  let notSetCount = 0;

  const overdueCategories = {};
  let totalDelayMs = 0;
  let delayedResolvedCount = 0;

  issues.forEach((issue) => {
    const slaStatus = getSlaStatus(issue, now);
    if (slaStatus === "overdue") {
      overdueCount++;
      const cat = issue.category || "Other";
      overdueCategories[cat] = (overdueCategories[cat] || 0) + 1;

      const deadline = safeDateMs(issue.slaDeadline);
      const resolveTime = issue.resolvedAt || issue.closedAt || now;
      if (resolveTime > deadline) {
        totalDelayMs += resolveTime - deadline;
        delayedResolvedCount++;
      }
    } else if (slaStatus === "due_soon") {
      dueSoonCount++;
    } else if (slaStatus === "on_track") {
      onTrackCount++;
    } else {
      notSetCount++;
    }
  });

  const totalSlaIssues = overdueCount + dueSoonCount + onTrackCount;
  const overdueRate =
    totalSlaIssues > 0 ? Math.round((overdueCount / totalSlaIssues) * 100) : 0;

  const mostOverdueCategory =
    Object.keys(overdueCategories).sort(
      (a, b) => overdueCategories[b] - overdueCategories[a],
    )[0] || "None";

  const avgSlaDelayHours =
    delayedResolvedCount > 0
      ? Math.round(totalDelayMs / (delayedResolvedCount * 3600 * 1000))
      : 0;

  return {
    overdueCount,
    dueSoonCount,
    onTrackCount,
    notSetCount,
    overdueRate,
    mostOverdueCategory,
    avgSlaDelayHours,
  };
}

export function buildTrendRecommendations(analytics) {
  const recommendations = [];

  if (
    analytics.summary.duplicateRate > 20 ||
    analytics.duplicateTrend.highConfidenceGroups > 0
  ) {
    recommendations.push({
      type: "duplicate_review",
      severity:
        analytics.duplicateTrend.highConfidenceGroups > 2 ? "critical" : "high",
      title: "Duplicate Verification Required",
      message:
        "High duplicate activity detected. Review similar complaints before assignment to prevent redundant worker dispatches.",
      relatedCategory:
        analytics.duplicateTrend.topDuplicateCategories[0] || "General",
      relatedSubcategory:
        analytics.duplicateTrend.topDuplicateSubcategories[0] || "General",
      relatedIssueIds: [],
    });
  }

  const criticalHotspots = analytics.hotspotTrends.filter(
    (h) => h.severity === "critical" || h.severity === "high",
  );
  if (criticalHotspots.length > 0) {
    recommendations.push({
      type: "hotspot_attention",
      severity: "critical",
      title: "Active Civic Hotspots Detected",
      message: `Recurring complaints found at ${criticalHotspots[0].approximateAddress}. Focus resources here to resolve the underlying root cause.`,
      relatedCategory: criticalHotspots[0].categories[0] || "General",
      relatedSubcategory: criticalHotspots[0].subcategories[0] || "General",
      relatedIssueIds: [],
    });
  }

  if (analytics.slaTrends.overdueRate > 25) {
    recommendations.push({
      type: "sla_risk",
      severity: "high",
      title: "SLA Compliance Warning",
      message: `${analytics.slaTrends.overdueRate}% of active complaints are overdue, especially in ${analytics.slaTrends.mostOverdueCategory}. Consider reassigning to expedite resolving.`,
      relatedCategory: analytics.slaTrends.mostOverdueCategory,
      relatedSubcategory: "General",
      relatedIssueIds: [],
    });
  }

  if (
    analytics.trendDirection.direction === "up" &&
    analytics.trendDirection.changePercent >= 50
  ) {
    recommendations.push({
      type: "category_spike",
      severity: "medium",
      title: "Spike in Complaint Reporting",
      message: `Total reported complaints have spiked by ${analytics.trendDirection.changePercent}% compared to the previous period. Review workforce capacity.`,
      relatedCategory: "General",
      relatedSubcategory: "General",
      relatedIssueIds: [],
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: "normal",
      severity: "low",
      title: "Operational Flow Stable",
      message:
        "Complaint reporting rate and SLA compliance are stable. Continue standard verification and assignment processes.",
      relatedCategory: "General",
      relatedSubcategory: "General",
      relatedIssueIds: [],
    });
  }

  return recommendations;
}

export function analyseIssueTrends(issues, options) {
  const normalized = issues.map(normalizeIssueToRawIssue).filter(Boolean);
  const now = options?.now ?? Date.now();
  const allTime =
    options?.allTime === true || !options?.days || options.days <= 0;
  const days = options?.days ?? 30;

  let currentWindowIssues = normalized;
  let previousWindowIssues = [];
  let currentCount = normalized.length;
  let previousCount = 0;
  let changePercent = 0;
  let direction = "stable";
  let label = "Showing all-time issue patterns";

  if (!allTime) {
    const currentCutoff = now - days * 24 * 60 * 60 * 1000;
    const previousCutoff = now - 2 * days * 24 * 60 * 60 * 1000;

    currentWindowIssues = normalized.filter(
      (i) => getIssueCreatedMs(i) >= currentCutoff,
    );
    previousWindowIssues = normalized.filter(
      (i) =>
        getIssueCreatedMs(i) >= previousCutoff &&
        getIssueCreatedMs(i) < currentCutoff,
    );

    currentCount = currentWindowIssues.length;
    previousCount = previousWindowIssues.length;

    changePercent =
      previousCount > 0
        ? Math.round(((currentCount - previousCount) / previousCount) * 100)
        : currentCount > 0
          ? 100
          : 0;

    if (changePercent > 10) direction = "up";
    else if (changePercent < -10) direction = "down";

    label =
      direction === "up"
        ? `Complaints increased by ${Math.abs(changePercent)}%`
        : direction === "down"
          ? `Complaints decreased by ${Math.abs(changePercent)}%`
          : "Complaint reporting rate is stable";
  }

  const selectedIssueSet = allTime ? normalized : currentWindowIssues;

  const categoryTrends = buildCategoryTrends(
    selectedIssueSet,
    previousWindowIssues,
  );
  const subcategoryTrends = buildSubcategoryTrends(
    selectedIssueSet,
    previousWindowIssues,
  );
  const priorityDistribution = buildPriorityDistribution(selectedIssueSet);
  const statusDistribution = buildStatusDistribution(selectedIssueSet);

  const duplicateTrend = buildDuplicateTrend(selectedIssueSet);
  const hotspotTrends = buildGeoHotspots(selectedIssueSet, {
    radiusMeters: 500,
  });
  const slaTrends = buildSlaTrends(selectedIssueSet, now);
  const recurringPatterns = buildRecurringPatterns(selectedIssueSet, {
    radiusMeters: 500,
  });

  const activeIssues = selectedIssueSet.filter((i) =>
    [
      "assigned",
      "in_progress",
      "submitted_for_review",
      "pending_uo_verification",
      "rework_required",
    ].includes(i.status || ""),
  ).length;
  const resolvedIssues = selectedIssueSet.filter((i) =>
    ["resolved", "closed"].includes(i.status || ""),
  ).length;
  const pendingIssues = selectedIssueSet.filter(
    (i) => i.status === "pending",
  ).length;
  const rejectedIssues = selectedIssueSet.filter(
    (i) => i.status === "rejected",
  ).length;
  const reopenedIssues = selectedIssueSet.reduce(
    (sum, i) => sum + (i.reopenCount ?? 0),
    0,
  );
  const escalatedIssues = selectedIssueSet.filter(
    (i) => i.escalatedToAdmin,
  ).length;

  const resolvedIssuesList = selectedIssueSet.filter((i) =>
    ["resolved", "closed"].includes(i.status || ""),
  );
  let totalResTimeMs = 0;
  let resolvedCount = 0;
  resolvedIssuesList.forEach((issue) => {
    const resolvedAt = issue.resolvedAt || issue.closedAt;
    if (resolvedAt && issue.createdAt) {
      totalResTimeMs += resolvedAt - issue.createdAt;
      resolvedCount++;
    }
  });
  const avgResolutionTimeHours =
    resolvedCount > 0
      ? Math.round(totalResTimeMs / (resolvedCount * 3600 * 1000))
      : 0;

  const verifiedIssues = selectedIssueSet.filter(
    (i) => i.verificationChecklist?.verifiedAt,
  );
  let totalVerTimeMs = 0;
  verifiedIssues.forEach((issue) => {
    if (issue.verificationChecklist?.verifiedAt && issue.createdAt) {
      totalVerTimeMs +=
        issue.verificationChecklist.verifiedAt - issue.createdAt;
    }
  });
  const avgVerificationTimeHours =
    verifiedIssues.length > 0
      ? Math.round(totalVerTimeMs / (verifiedIssues.length * 3600 * 1000))
      : 0;

  const allTimeContext = {
    totalIssuesAnalysed: normalized.length,
    duplicateTrend: buildDuplicateTrend(normalized),
    hotspotAreaCount: buildGeoHotspots(normalized, { radiusMeters: 500 })
      .length,
  };

  const analytics = {
    summary: {
      totalIssues: selectedIssueSet.length,
      totalIssuesAnalysed: normalized.length,
      currentWindowIssues: currentCount,
      previousWindowIssues: previousCount,
      isAllTime: allTime,
      activeIssues,
      resolvedIssues,
      pendingIssues,
      rejectedIssues,
      reopenedIssues,
      escalatedIssues,
      overdueIssues: slaTrends.overdueCount,
      duplicateGroups: duplicateTrend.totalGroups,
      duplicateIssues: duplicateTrend.duplicateGroupIssueCount,
      redundantDuplicateIssues: duplicateTrend.redundantDuplicateIssues,
      pendingDuplicateCandidateCount:
        duplicateTrend.pendingDuplicateCandidateCount,
      duplicateRate: duplicateTrend.duplicateRate,
      hotspotAreaCount: hotspotTrends.length,
      hotspotIssueCount: hotspotTrends.reduce(
        (sum, h) => sum + h.issueCount,
        0,
      ),
      criticalHotspotCount: hotspotTrends.filter(
        (h) => h.severity === "critical",
      ).length,
      slaRiskCount: slaTrends.dueSoonCount + slaTrends.overdueCount,
      avgResolutionTimeHours,
      avgVerificationTimeHours,
    },
    context: allTimeContext,
    trendDirection: {
      currentWindowCount: currentCount,
      previousWindowCount: previousCount,
      changePercent: Math.round(changePercent),
      direction,
      label,
    },
    categoryTrends,
    subcategoryTrends,
    priorityDistribution,
    statusDistribution,
    duplicateTrend,
    hotspotTrends,
    slaTrends,
    recurringPatterns,
    recommendations: [],
  };

  analytics.recommendations = buildTrendRecommendations(analytics);
  return analytics;
}

export function analyseCurrentIssueTrend(currentIssue, allIssues, options) {
  const normalizedCurrent = normalizeIssueToRawIssue(currentIssue);
  const now = options?.now ?? Date.now();
  const days = options?.days ?? 90;
  const selectedCutoff = now - days * 24 * 60 * 60 * 1000;

  const comparisonPool = allIssues
    .map(normalizeIssueToRawIssue)
    .filter((issue) => issue && issue.id !== normalizedCurrent.id);

  const recentComparisonPool = comparisonPool.filter(
    (i) => getIssueCreatedMs(i) >= selectedCutoff,
  );

  const trendPool = recentComparisonPool;

  const allNormalized = [normalizedCurrent, ...comparisonPool];
  const duplicateFlags = getDuplicateFlagsByIssueId(
    allNormalized,
    normalizedCurrent.id,
  );

  const duplicateGroupCount = duplicateFlags.duplicateGroupCount;
  const duplicateIssueCount = duplicateFlags.duplicateIssueCount;

  const matchedIssues = (duplicateFlags.groups || []).flatMap((g) =>
    g.duplicateIssues.map((di) => {
      const pair = g.pairMetrics.find(
        (p) => p.issueAId === di.id || p.issueBId === di.id,
      );
      return {
        issueId: di.id,
        issueCode: di.issueCode || di.id.slice(0, 8).toUpperCase(),
        title: di.title,
        status: di.status,
        distanceMeters: pair ? Math.round(pair.distanceMeters) : 0,
        duplicateScore: pair ? pair.duplicateScore : 0,
        duplicateLevel: pair ? pair.duplicateLevel : "Low",
        reasons: pair ? pair.reasons : [],
      };
    }),
  );

  const bestDuplicateScore =
    matchedIssues.length > 0
      ? Math.max(...matchedIssues.map((m) => m.duplicateScore))
      : 0;

  const hasDuplicateSignals = matchedIssues.length > 0;
  const strongDuplicate = bestDuplicateScore >= 80;
  const almostCertainDuplicate = bestDuplicateScore >= 90;

  let duplicateLevel = "Low";
  if (almostCertainDuplicate) duplicateLevel = "Almost Certain";
  else if (strongDuplicate) duplicateLevel = "Strong";
  else if (bestDuplicateScore >= 60) duplicateLevel = "Medium";

  const nearby300 = comparisonPool.filter((i) => {
    const d = haversineDistanceMeters(
      normalizedCurrent.latitude,
      normalizedCurrent.longitude,
      i.latitude,
      i.longitude,
    );
    return d <= 300;
  });
  const nearby500 = comparisonPool.filter((i) => {
    const d = haversineDistanceMeters(
      normalizedCurrent.latitude,
      normalizedCurrent.longitude,
      i.latitude,
      i.longitude,
    );
    return d <= 500;
  });
  const nearby1000 = comparisonPool.filter((i) => {
    const d = haversineDistanceMeters(
      normalizedCurrent.latitude,
      normalizedCurrent.longitude,
      i.latitude,
      i.longitude,
    );
    return d <= 1000;
  });

  const unresolvedNearbyCount = nearby1000.filter(
    (i) => !["resolved", "closed", "rejected"].includes(i.status),
  ).length;

  const sameCategoryNearbyCount = nearby1000.filter(
    (i) =>
      getIssueCreatedMs(i) >= selectedCutoff &&
      i.category === normalizedCurrent.category,
  ).length;

  const sameSubcategoryNearbyCount = nearby1000.filter((i) => {
    if (getIssueCreatedMs(i) < selectedCutoff) return false;
    const currentSubs = normalizedCurrent.subcategory || [];
    const otherSubs = i.subcategory || [];
    return otherSubs.some((sub) => currentSubs.includes(sub));
  }).length;

  let hotspotSeverity = "low";
  if (nearby500.length >= 10 || unresolvedNearbyCount >= 5) {
    hotspotSeverity = "critical";
  } else if (nearby500.length >= 5) {
    hotspotSeverity = "high";
  } else if (nearby500.length >= 2) {
    hotspotSeverity = "medium";
  }

  const locationPatternLabel =
    unresolvedNearbyCount >= 3
      ? "Active civic issue hotspot around this location"
      : unresolvedNearbyCount >= 1
        ? "Recent unresolved complaints in the immediate vicinity"
        : "Isolated location complaint";

  const sameCatIssues = comparisonPool.filter(
    (i) => i.category === normalizedCurrent.category,
  );
  const categoryCount = sameCatIssues.length;

  const categoryCounts = {};
  comparisonPool.forEach((i) => {
    if (i.category)
      categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });
  const sortedCategories = Object.keys(categoryCounts).sort(
    (a, b) => categoryCounts[b] - categoryCounts[a],
  );
  const categoryRank =
    sortedCategories.indexOf(normalizedCurrent.category || "") + 1;

  const categoryPercentage = percentage(categoryCount, comparisonPool.length);
  const isFrequentCategory = categoryRank <= 3 && categoryCount >= 5;

  const cutoff7 = now - 7 * 24 * 60 * 60 * 1000;
  const cutoff30 = now - 30 * 24 * 60 * 60 * 1000;
  const cutoff90 = now - 90 * 24 * 60 * 60 * 1000;

  const sameCategoryLast7Days = sameCatIssues.filter(
    (i) => getIssueCreatedMs(i) >= cutoff7,
  ).length;
  const sameCategoryLast30Days = sameCatIssues.filter(
    (i) => getIssueCreatedMs(i) >= cutoff30,
  ).length;
  const sameCategoryLast90Days = sameCatIssues.filter(
    (i) => getIssueCreatedMs(i) >= cutoff90,
  ).length;

  const previous30To60 = sameCatIssues.filter((i) => {
    const created = getIssueCreatedMs(i);
    return created >= now - 60 * 24 * 60 * 60 * 1000 && created < cutoff30;
  }).length;

  const recentSpikeDetected =
    sameCategoryLast30Days >= 3 &&
    (previous30To60 === 0 ||
      (sameCategoryLast30Days - previous30To60) / previous30To60 >= 0.5);

  const seasonalCategories = new Set([
    "water",
    "drainage",
    "sanitation",
    "public_health",
    "solid_waste",
  ]);

  const currentCategoryKey = normalizeKey(normalizedCurrent.category);

  let seasonalHint = "Not enough historical data for seasonal pattern.";
  if (
    seasonalCategories.has(currentCategoryKey) &&
    sameCategoryLast30Days >= 4
  ) {
    seasonalHint =
      "Possible seasonal civic pattern detected based on recent complaint frequency.";
  } else if (currentCategoryKey === "road" && sameCategoryLast30Days >= 4) {
    seasonalHint =
      "Repeated road complaints detected recently. This may indicate a local infrastructure pattern rather than seasonality.";
  }

  const slaStatus = getSlaStatus(normalizedCurrent, now);

  let duplicateRisk = "low";
  if (almostCertainDuplicate) duplicateRisk = "critical";
  else if (strongDuplicate) duplicateRisk = "high";
  else if (bestDuplicateScore >= 60) duplicateRisk = "medium";

  let recurrenceRisk = "low";
  if (sameCategoryNearbyCount >= 10) recurrenceRisk = "critical";
  else if (sameCategoryNearbyCount >= 6) recurrenceRisk = "high";
  else if (sameCategoryNearbyCount >= 3) recurrenceRisk = "medium";

  const overdueActiveIssues = trendPool.filter((i) => {
    const isAct = [
      "assigned",
      "in_progress",
      "submitted_for_review",
      "pending_uo_verification",
      "rework_required",
    ].includes(i.status || "");
    return isAct && getSlaStatus(i, now) === "overdue";
  }).length;

  let workloadRisk = "low";
  if (overdueActiveIssues >= 10) workloadRisk = "critical";
  else if (overdueActiveIssues >= 6) workloadRisk = "high";
  else if (overdueActiveIssues >= 3) workloadRisk = "medium";

  let recommendedPriority = normalizedCurrent.priority || "medium";
  if (duplicateRisk === "critical") {
    recommendedPriority = "review before assignment";
  } else if (hotspotSeverity === "critical" || slaStatus === "overdue") {
    recommendedPriority = "critical";
  } else if (recurrenceRisk === "high") {
    recommendedPriority = "high";
  }

  let primaryAction = "verify_normally";
  let title = "Verify and Assign Normally";
  let message =
    "This issue looks like an isolated complaint with low duplicate and local recurrence signals. Proceed with standard verification.";
  const actionHints = [
    "Verify location accuracy and details.",
    "Assign to the standard department field agent.",
    "No immediate duplicate review needed.",
  ];

  if (duplicateRisk === "critical" || duplicateRisk === "high") {
    primaryAction = "review_duplicates_before_verification";
    title = "Review Duplicates Before Verification";
    message =
      "Highly confident duplicate complaints found nearby. Verify and mark as duplicate to avoid redundant field agent dispatches.";
    actionHints[2] = "Compare photo attachments to confirm duplicate state.";
  } else if (hotspotSeverity === "critical") {
    primaryAction = "prioritize_due_to_hotspot";
    title = "Prioritize Due to Location Hotspot";
    message =
      "This issue falls in a high-frequency civic hotspot. Fast-track assignment and follow up with field agent.";
    actionHints[2] = "SLA response targets should be prioritized.";
  } else if (recurrenceRisk === "high") {
    primaryAction = "assign_specialised_field_officer";
    title = "Assign Specialised Field Officer";
    message =
      "Similar complaints have recurred in this area. Assign a specialised agent to inspect infrastructure issues.";
    actionHints[2] = "Request detailed inspection report from field officer.";
  }

  return {
    issueId: normalizedCurrent.id,
    issueCode:
      normalizedCurrent.issueCode ||
      normalizedCurrent.id.slice(0, 8).toUpperCase(),
    generatedAt: now,
    duplicateIntelligence: {
      hasDuplicateSignals,
      duplicateGroupCount,
      duplicateIssueCount,
      bestDuplicateScore,
      duplicateLevel,
      strongDuplicate,
      almostCertainDuplicate,
      matchedIssues,
    },
    localTrend: {
      nearbyIssueCount300m: nearby300.length,
      nearbyIssueCount500m: nearby500.length,
      nearbyIssueCount1000m: nearby1000.length,
      unresolvedNearbyCount,
      sameCategoryNearbyCount,
      sameSubcategoryNearbyCount,
      hotspotSeverity,
      locationPatternLabel,
    },
    // categoryRank is useful for City Admin/System Admin multi-category analytics,
    // but Unit Officer UI should use departmentTrend instead.
    categoryTrend: {
      category: normalizedCurrent.category || "Other",
      categoryCount,
      categoryRank,
      categoryPercentage,
      isFrequentCategory,
      trendDirection: {
        changePercent: 0,
        direction: "stable",
        label: "stable",
      },
      note: "Category rank is intended for city/admin-level analytics, not Unit Officer UI.",
    },
    departmentTrend: {
      department: normalizedCurrent.category || "Other",
      sameDepartmentIssueCount: categoryCount,
      sameDepartmentNearbyCount: sameCategoryNearbyCount,
      sameSubcategoryNearbyCount,
      isRecurringDepartmentIssue:
        sameCategoryNearbyCount >= 3 || sameSubcategoryNearbyCount >= 2,
    },
    subcategoryTrend: {
      subcategories: normalizedCurrent.subcategory || [],
      matchedSubcategoryCount: sameSubcategoryNearbyCount,
      topMatchedSubcategory: (normalizedCurrent.subcategory || [])[0] || "None",
      isRecurringSubcategory: sameSubcategoryNearbyCount >= 3,
    },
    timeTrend: {
      sameCategoryLast7Days,
      sameCategoryLast30Days,
      sameCategoryLast90Days,
      recentSpikeDetected,
      seasonalHint,
    },
    operationalRisk: {
      slaStatus,
      duplicateRisk,
      recurrenceRisk,
      workloadRisk,
      recommendedPriority,
    },
    suggestedOfficerAction: {
      primaryAction,
      title,
      message,
      actionHints,
    },
  };
}

export function strictDepartmentMatchesCategory(department, category) {
  const dep = normalizeKey(department);
  const cat = normalizeKey(category);

  if (!dep || !cat) return false;
  if (dep === cat) return true;

  return Object.values(DEPARTMENT_CATEGORY_ALIASES).some(
    (aliases) => aliases.includes(dep) && aliases.includes(cat),
  );
}

export function buildCityTrendBreakdown(issues, now = Date.now(), days = 30) {
  const normalized = issues
    .map(normalizeIssueForDuplicateDetection)
    .filter(Boolean);
  const citiesMap = new Map();

  normalized.forEach((issue) => {
    const city = issue.city || "City not recorded";
    const cityKey = normalizeKey(city);
    if (!citiesMap.has(cityKey)) {
      citiesMap.set(cityKey, { name: city, list: [] });
    }
    citiesMap.get(cityKey).list.push(issue);
  });

  const isAllTime = days === 0;

  return Array.from(citiesMap.values())
    .map(({ name, list }) => {
      const totalIssues = list.length;
      const activeIssues = list.filter((i) =>
        [
          "assigned",
          "in_progress",
          "submitted_for_review",
          "pending_uo_verification",
          "rework_required",
          "escalated",
        ].includes(i.status),
      ).length;
      const resolvedIssues = list.filter((i) =>
        ["resolved", "closed"].includes(i.status),
      ).length;
      const pendingIssues = list.filter((i) => i.status === "pending").length;

      // SLA
      const slaApplicableIssues = list.filter((i) => i.slaDeadline);
      const overdueIssues = list.filter((i) => {
        if (!i.slaDeadline) return false;
        const deadline = safeDateMs(i.slaDeadline);
        const isClosed = ["resolved", "closed"].includes(i.status);
        const resolveTime = i.resolvedAt || i.closedAt || now;
        return isClosed ? resolveTime > deadline : now > deadline;
      }).length;

      const dueSoonIssues = list.filter((i) => {
        if (!i.slaDeadline) return false;
        const deadline = safeDateMs(i.slaDeadline);
        const isClosed = ["resolved", "closed"].includes(i.status);
        if (isClosed) return false;
        return deadline >= now && deadline - now <= 48 * 60 * 60 * 1000;
      }).length;

      const resolvedOnTime = slaApplicableIssues.filter((i) => {
        const isClosed = ["resolved", "closed"].includes(i.status);
        if (!isClosed) return false;
        const deadline = safeDateMs(i.slaDeadline);
        const resolveTime = i.resolvedAt || i.closedAt;
        return resolveTime <= deadline;
      }).length;

      const resolvedSlaIssues = slaApplicableIssues.filter((i) =>
        ["resolved", "closed"].includes(i.status),
      ).length;
      const slaComplianceRate =
        resolvedSlaIssues > 0
          ? Math.round((resolvedOnTime / resolvedSlaIssues) * 100)
          : 100;

      // Resolution Time
      const resolvedList = list.filter((i) =>
        ["resolved", "closed"].includes(i.status),
      );
      let totalResTime = 0;
      let resolvedCount = 0;
      resolvedList.forEach((i) => {
        const resolvedAt = i.resolvedAt || i.closedAt;
        if (resolvedAt && i.createdAt) {
          totalResTime += resolvedAt - i.createdAt;
          resolvedCount++;
        }
      });
      const avgResolutionTimeHours =
        resolvedCount > 0
          ? Math.round(totalResTime / (resolvedCount * 3600 * 1000))
          : 0;

      // Escalations
      const escalatedIssues = list.filter(
        (i) => i.escalatedToAdmin || i.status === "escalated" || !!i.escalation,
      ).length;

      // Duplicates
      const dupTrend = buildSystemAdminDuplicateTrend(list);
      const duplicateIssues = dupTrend.duplicateGroupIssueCount;
      const duplicateGroups = dupTrend.totalGroups;

      // Hotspots
      const hotspots = buildGeoHotspots(list, { radiusMeters: 500 });
      const hotspotAreas = hotspots.length;

      // Reporting change percent
      let reportingChangePercent = 0;
      if (!isAllTime) {
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        const currentPeriodCount = list.filter(
          (i) => getIssueCreatedMs(i) >= cutoff,
        ).length;
        const prevPeriodCount = list.filter(
          (i) => getIssueCreatedMs(i) < cutoff,
        ).length;
        reportingChangePercent =
          prevPeriodCount > 0
            ? Math.round(
                ((currentPeriodCount - prevPeriodCount) / prevPeriodCount) *
                  100,
              )
            : currentPeriodCount > 0
              ? 100
              : 0;
      }

      // Risk Score
      const overdueRate =
        slaApplicableIssues.length > 0
          ? (overdueIssues / slaApplicableIssues.length) * 100
          : 0;
      const escalationRate =
        totalIssues > 0 ? (escalatedIssues / totalIssues) * 100 : 0;
      const duplicateRate =
        totalIssues > 0 ? (duplicateIssues / totalIssues) * 100 : 0;
      const unresolvedRate =
        totalIssues > 0 ? (activeIssues / totalIssues) * 100 : 0;

      const riskScore = Math.round(
        overdueRate * 0.4 +
          escalationRate * 0.25 +
          unresolvedRate * 0.2 +
          duplicateRate * 0.15,
      );

      const riskLevel =
        riskScore >= 70
          ? "critical"
          : riskScore >= 50
            ? "high"
            : riskScore >= 30
              ? "medium"
              : "low";

      return {
        city: name,
        totalIssues,
        activeIssues,
        resolvedIssues,
        pendingIssues,
        overdueIssues,
        dueSoonIssues,
        escalatedIssues,
        duplicateGroups,
        duplicateIssues,
        hotspotAreas,
        slaComplianceRate,
        avgResolutionTimeHours,
        reportingChangePercent,
        riskScore,
        riskLevel,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function buildDepartmentTrendBreakdown(
  issues,
  now = Date.now(),
  days = 30,
) {
  const normalized = issues
    .map(normalizeIssueForDuplicateDetection)
    .filter(Boolean);
  const deptsMap = new Map();

  normalized.forEach((issue) => {
    const dept = issue.category || "Department not recorded";
    const deptKey = normalizeKey(dept);
    if (!deptsMap.has(deptKey)) {
      deptsMap.set(deptKey, { name: dept, list: [] });
    }
    deptsMap.get(deptKey).list.push(issue);
  });

  const isAllTime = days === 0;

  return Array.from(deptsMap.values())
    .map(({ name, list }) => {
      const totalIssues = list.length;
      const activeIssues = list.filter((i) =>
        [
          "assigned",
          "in_progress",
          "submitted_for_review",
          "pending_uo_verification",
          "rework_required",
          "escalated",
        ].includes(i.status),
      ).length;
      const resolvedIssues = list.filter((i) =>
        ["resolved", "closed"].includes(i.status),
      ).length;

      // SLA
      const slaApplicableIssues = list.filter((i) => i.slaDeadline);
      const overdueIssues = list.filter((i) => {
        if (!i.slaDeadline) return false;
        const deadline = safeDateMs(i.slaDeadline);
        const isClosed = ["resolved", "closed"].includes(i.status);
        const resolveTime = i.resolvedAt || i.closedAt || now;
        return isClosed ? resolveTime > deadline : now > deadline;
      }).length;

      const dueSoonIssues = list.filter((i) => {
        if (!i.slaDeadline) return false;
        const deadline = safeDateMs(i.slaDeadline);
        const isClosed = ["resolved", "closed"].includes(i.status);
        if (isClosed) return false;
        return deadline >= now && deadline - now <= 48 * 60 * 60 * 1000;
      }).length;

      const resolvedOnTime = slaApplicableIssues.filter((i) => {
        const isClosed = ["resolved", "closed"].includes(i.status);
        if (!isClosed) return false;
        const deadline = safeDateMs(i.slaDeadline);
        const resolveTime = i.resolvedAt || i.closedAt;
        return resolveTime <= deadline;
      }).length;

      const resolvedSlaIssues = slaApplicableIssues.filter((i) =>
        ["resolved", "closed"].includes(i.status),
      ).length;
      const slaComplianceRate =
        resolvedSlaIssues > 0
          ? Math.round((resolvedOnTime / resolvedSlaIssues) * 100)
          : 100;

      // Resolution Time
      const resolvedList = list.filter((i) =>
        ["resolved", "closed"].includes(i.status),
      );
      let totalResTime = 0;
      let resolvedCount = 0;
      resolvedList.forEach((i) => {
        const resolvedAt = i.resolvedAt || i.closedAt;
        if (resolvedAt && i.createdAt) {
          totalResTime += resolvedAt - i.createdAt;
          resolvedCount++;
        }
      });
      const avgResolutionTimeHours =
        resolvedCount > 0
          ? Math.round(totalResTime / (resolvedCount * 3600 * 1000))
          : 0;

      // Escalations
      const escalatedIssues = list.filter(
        (i) => i.escalatedToAdmin || i.status === "escalated" || !!i.escalation,
      ).length;
      const reopenedIssues = list.reduce(
        (sum, i) => sum + (i.reopenCount ?? 0),
        0,
      );

      // Duplicates
      const dupTrend = buildSystemAdminDuplicateTrend(list);
      const duplicateIssues = dupTrend.duplicateGroupIssueCount;
      const duplicateGroups = dupTrend.totalGroups;

      // Hotspots
      const hotspots = buildGeoHotspots(list, { radiusMeters: 500 });
      const hotspotAreas = hotspots.length;

      // Reporting change percent
      let reportingChangePercent = 0;
      if (!isAllTime) {
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        const currentPeriodCount = list.filter(
          (i) => getIssueCreatedMs(i) >= cutoff,
        ).length;
        const prevPeriodCount = list.filter(
          (i) => getIssueCreatedMs(i) < cutoff,
        ).length;
        reportingChangePercent =
          prevPeriodCount > 0
            ? Math.round(
                ((currentPeriodCount - prevPeriodCount) / prevPeriodCount) *
                  100,
              )
            : currentPeriodCount > 0
              ? 100
              : 0;
      }

      // Risk Score
      const overdueRate =
        slaApplicableIssues.length > 0
          ? (overdueIssues / slaApplicableIssues.length) * 100
          : 0;
      const escalationRate =
        totalIssues > 0 ? (escalatedIssues / totalIssues) * 100 : 0;
      const duplicateRate =
        totalIssues > 0 ? (duplicateIssues / totalIssues) * 100 : 0;
      const unresolvedRate =
        totalIssues > 0 ? (activeIssues / totalIssues) * 100 : 0;

      const riskScore = Math.round(
        overdueRate * 0.4 +
          escalationRate * 0.25 +
          unresolvedRate * 0.2 +
          duplicateRate * 0.15,
      );

      const riskLevel =
        riskScore >= 70
          ? "critical"
          : riskScore >= 50
            ? "high"
            : riskScore >= 30
              ? "medium"
              : "low";

      return {
        department: name,
        totalIssues,
        activeIssues,
        resolvedIssues,
        overdueIssues,
        dueSoonIssues,
        escalatedIssues,
        reopenedIssues,
        duplicateIssues,
        duplicateGroups,
        hotspotAreas,
        slaComplianceRate,
        avgResolutionTimeHours,
        reportingChangePercent,
        riskScore,
        riskLevel,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function buildSystemSlaAnalytics(issues, now = Date.now()) {
  const normalized = issues
    .map(normalizeIssueForDuplicateDetection)
    .filter(Boolean);

  const slaIssues = normalized.filter((i) => i.slaDeadline);
  const applicableIssueCount = slaIssues.length;
  const notSetCount = normalized.length - applicableIssueCount;

  let overdueCount = 0;
  let dueSoonCount = 0;
  let onTrackCount = 0;

  let compliantCount = 0;
  let breachedCount = 0;

  let totalDelayMs = 0;
  let maxDelayMs = 0;

  const overdueCitiesMap = {};
  const overdueDeptsMap = {};

  const breachByCityMap = {};
  const breachByDepartmentMap = {};

  slaIssues.forEach((issue) => {
    const deadline = safeDateMs(issue.slaDeadline);
    const isClosed = ["resolved", "closed"].includes(issue.status);

    if (isClosed) {
      const resolveTime = issue.resolvedAt || issue.closedAt || now;
      if (resolveTime <= deadline) {
        compliantCount++;
      } else {
        breachedCount++;
        const delay = resolveTime - deadline;
        totalDelayMs += delay;
        if (delay > maxDelayMs) maxDelayMs = delay;

        const city = issue.city || "City not recorded";
        const dept = issue.category || "Department not recorded";
        breachByCityMap[city] = (breachByCityMap[city] || 0) + 1;
        breachByDepartmentMap[dept] = (breachByDepartmentMap[dept] || 0) + 1;
      }
    } else {
      // Active issues
      if (deadline < now) {
        overdueCount++;
        const delay = now - deadline;
        totalDelayMs += delay;
        if (delay > maxDelayMs) maxDelayMs = delay;

        const city = issue.city || "City not recorded";
        const dept = issue.category || "Department not recorded";
        overdueCitiesMap[city] = (overdueCitiesMap[city] || 0) + 1;
        overdueDeptsMap[dept] = (overdueDeptsMap[dept] || 0) + 1;

        breachByCityMap[city] = (breachByCityMap[city] || 0) + 1;
        breachByDepartmentMap[dept] = (breachByDepartmentMap[dept] || 0) + 1;
      } else if (deadline - now <= 48 * 60 * 60 * 1000) {
        dueSoonCount++;
      } else {
        onTrackCount++;
      }
    }
  });

  const complianceRate =
    compliantCount + breachedCount > 0
      ? Math.round((compliantCount / (compliantCount + breachedCount)) * 100)
      : 100;

  const overdueRate =
    applicableIssueCount > 0
      ? Math.round(
          ((overdueCount + breachedCount) / applicableIssueCount) * 100,
        )
      : 0;

  const avgDelayHours =
    overdueCount + breachedCount > 0
      ? Math.round(
          totalDelayMs / ((overdueCount + breachedCount) * 3600 * 1000),
        )
      : 0;

  const maximumDelayHours = Math.round(maxDelayMs / (3600 * 1000));

  const mostOverdueCity =
    Object.keys(overdueCitiesMap).sort(
      (a, b) => overdueCitiesMap[b] - overdueCitiesMap[a],
    )[0] || "None";
  const mostOverdueDepartment =
    Object.keys(overdueDeptsMap).sort(
      (a, b) => overdueDeptsMap[b] - overdueDeptsMap[a],
    )[0] || "None";
  const mostDelayedCategory = mostOverdueDepartment;

  const oldestOverdueIssues = slaIssues
    .filter((i) => {
      const isClosed = ["resolved", "closed"].includes(i.status);
      const deadline = safeDateMs(i.slaDeadline);
      return isClosed
        ? (i.resolvedAt || i.closedAt) > deadline
        : now > deadline;
    })
    .sort((a, b) => safeDateMs(a.slaDeadline) - safeDateMs(b.slaDeadline))
    .slice(0, 5)
    .map((i) => ({
      id: i._id,
      code: i.issueCode || i._id.slice(0, 8).toUpperCase(),
      title: i.title || "Untitled",
      city: i.city || "City not recorded",
      category: i.category || "Department not recorded",
      status: i.status || "pending",
      deadline: i.slaDeadline,
      delayHours: Math.round((now - safeDateMs(i.slaDeadline)) / (3600 * 1000)),
    }));

  return {
    applicableIssueCount,
    overdueCount,
    dueSoonCount,
    onTrackCount,
    notSetCount,
    complianceRate,
    overdueRate,
    avgDelayHours,
    maximumDelayHours,
    mostOverdueCity,
    mostOverdueDepartment,
    mostDelayedCategory,
    breachByCity: Object.entries(breachByCityMap).map(([city, count]) => ({
      city,
      count,
    })),
    breachByDepartment: Object.entries(breachByDepartmentMap).map(
      ([dept, count]) => ({ department: dept, count }),
    ),
    oldestOverdueIssues,
  };
}

export function buildEscalationAnalytics(issues, now = Date.now()) {
  const normalized = issues
    .map(normalizeIssueForDuplicateDetection)
    .filter(Boolean);

  const escalatedIssues = normalized.filter(
    (i) =>
      i.escalatedToAdmin === true || i.status === "escalated" || !!i.escalation,
  );
  const totalEscalatedIssues = escalatedIssues.length;
  const escalationRate =
    normalized.length > 0
      ? Math.round((totalEscalatedIssues / normalized.length) * 100)
      : 0;

  const unresolvedEscalations = escalatedIssues.filter(
    (i) => !["resolved", "closed", "rejected"].includes(i.status),
  ).length;

  const resolvedEscalations = totalEscalatedIssues - unresolvedEscalations;

  const sumEscalationCount = escalatedIssues.reduce(
    (sum, i) => sum + (i.escalationCount || 1),
    0,
  );
  const averageEscalationCount =
    totalEscalatedIssues > 0
      ? Number((sumEscalationCount / totalEscalatedIssues).toFixed(1))
      : 0;

  const cityEscMap = {};
  const deptEscMap = {};

  escalatedIssues.forEach((i) => {
    const city = i.city || "City not recorded";
    const dept = i.category || "Department not recorded";
    cityEscMap[city] = (cityEscMap[city] || 0) + 1;
    deptEscMap[dept] = (deptEscMap[dept] || 0) + 1;
  });

  const topEscalatedCities = Object.entries(cityEscMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city, count]) => ({ city, count }));

  const topEscalatedDepartments = Object.entries(deptEscMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dept, count]) => ({ department: dept, count }));

  const oldestUnresolvedEscalations = escalatedIssues
    .filter((i) => !["resolved", "closed", "rejected"].includes(i.status))
    .sort(
      (a, b) =>
        safeDateMs(a.escalatedAt || a.createdAt) -
        safeDateMs(b.escalatedAt || b.createdAt),
    )
    .slice(0, 5)
    .map((i) => ({
      id: i._id,
      code: i.issueCode || i._id.slice(0, 8).toUpperCase(),
      title: i.title || "Untitled",
      city: i.city || "City not recorded",
      category: i.category || "Department not recorded",
      status: i.status || "pending",
      escalatedAt: i.escalatedAt || i.createdAt,
    }));

  return {
    totalEscalatedIssues,
    escalationRate,
    unresolvedEscalations,
    resolvedEscalations,
    averageEscalationCount,
    topEscalatedCities,
    topEscalatedDepartments,
    oldestUnresolvedEscalations,
  };
}

export function buildCityAwareHotspots(issues, radiusMeters = 500) {
  const normalized = issues
    .map(normalizeIssueForDuplicateDetection)
    .filter(Boolean);
  const citiesMap = new Map();

  normalized.forEach((i) => {
    const city = i.city || "City not recorded";
    const cityKey = normalizeKey(city);
    if (!citiesMap.has(cityKey)) {
      citiesMap.set(cityKey, []);
    }
    citiesMap.get(cityKey).push(i);
  });

  const allHotspots = [];
  citiesMap.forEach((cityIssues) => {
    const cityHotspots = buildGeoHotspots(cityIssues, { radiusMeters });
    cityHotspots.forEach((h) => {
      h.city = cityIssues[0]?.city || "City not recorded";
    });
    allHotspots.push(...cityHotspots);
  });

  return allHotspots.sort((a, b) => b.issueCount - a.issueCount);
}

export function buildSystemAdminTrendRecommendations({
  cityBreakdown = [],
  departmentBreakdown = [],
  systemSlaAnalytics = {},
  escalationAnalytics = {},
  systemDuplicateTrend = {},
  hotspotTrends = [],
}: any) {
  const recommendations = [];

  // 1. City Intervention
  const criticalCities = cityBreakdown.filter(
    (c) => c.riskLevel === "critical" || c.riskLevel === "high",
  );
  criticalCities.slice(0, 2).forEach((c) => {
    recommendations.push({
      type: "city_intervention",
      severity: c.riskLevel === "critical" ? "critical" : "high",
      title: `${c.city} Requires Administrative Review`,
      message: `${c.city} has a high combined risk score of ${c.riskScore}% in this period, with ${c.overdueIssues} overdue and ${c.escalatedIssues} escalated complaints.`,
      city: c.city,
      department: null,
      relatedIssueIds: [],
      suggestedActions: [
        "Review City Administrator response plan.",
        "Inspect departments with the highest overdue volume.",
        "Consider temporary officer redistribution.",
      ],
    });
  });

  // 2. Department Intervention
  const criticalDepts = departmentBreakdown.filter(
    (d) => d.riskLevel === "critical" || d.riskLevel === "high",
  );
  criticalDepts.slice(0, 2).forEach((d) => {
    recommendations.push({
      type: "department_intervention",
      severity: d.riskLevel === "critical" ? "critical" : "high",
      title: `Direct Department Intervention: ${d.department}`,
      message: `The ${d.department} department has ${d.overdueIssues} overdue complaints and an SLA compliance rate of ${d.slaComplianceRate}%.`,
      city: null,
      department: d.department,
      relatedIssueIds: [],
      suggestedActions: [
        `Initiate operational review of the ${d.department} team's backlog.`,
        "Check for staffing issues or material resource constraints.",
        "Enforce SLA escalation protocols.",
      ],
    });
  });

  // 3. SLA Policy Review
  if (systemSlaAnalytics.complianceRate < 80) {
    recommendations.push({
      type: "sla_policy_review",
      severity: "high",
      title: "System-wide SLA Policy Review Recommended",
      message: `Overall SLA compliance rate is currently at ${systemSlaAnalytics.complianceRate}%, which falls below the target threshold of 80%.`,
      city: null,
      department: null,
      relatedIssueIds: [],
      suggestedActions: [
        "Audit standard SLA response targets for bottlenecks.",
        "Review configuration of departments showing lowest SLA compliance.",
        "Examine historical delays (avg delay of " +
          systemSlaAnalytics.avgDelayHours +
          " hours).",
      ],
    });
  }

  // 4. Duplicate Reduction
  if (systemDuplicateTrend.duplicateRate > 20) {
    recommendations.push({
      type: "duplicate_reduction",
      severity: "medium",
      title: "Duplicate Reduction Initiative Needed",
      message: `Citywide duplicate rate is at ${systemDuplicateTrend.duplicateRate}%, indicating redundant complaints are placing load on officers.`,
      city: null,
      department: null,
      relatedIssueIds: [],
      suggestedActions: [
        "Promote the use of the public map dashboard to check existing reports.",
        "Configure auto-flagging duplicate sensitivity.",
        "Train Unit Officers on merging duplicate records.",
      ],
    });
  }

  // 5. Hotspot Infrastructure Action
  const criticalHotspots = hotspotTrends.filter(
    (h) => h.severity === "critical",
  );
  if (criticalHotspots.length > 0) {
    recommendations.push({
      type: "hotspot_infrastructure_action",
      severity: "critical",
      title: `Infrastructure Action at ${criticalHotspots[0].approximateAddress}`,
      message: `A critical hotspot has emerged in ${criticalHotspots[0].city || "system"} with ${criticalHotspots[0].issueCount} complaints concentrated in this area.`,
      city: criticalHotspots[0].city || null,
      department: criticalHotspots[0].categories[0] || null,
      relatedIssueIds: [],
      suggestedActions: [
        "Coordinate an on-site physical inspection.",
        "Evaluate recurring pattern reasons for systemic failure.",
        "Direct cross-department resources to the area.",
      ],
    });
  }

  // 6. Escalation Audit
  if (escalationAnalytics.unresolvedEscalations > 5) {
    recommendations.push({
      type: "escalation_audit",
      severity: "high",
      title: "Administrative Escalation Audit Needed",
      message: `There are ${escalationAnalytics.unresolvedEscalations} unresolved escalations requiring prompt system admin intervention.`,
      city: null,
      department: null,
      relatedIssueIds: [],
      suggestedActions: [
        "Review the oldest unresolved escalations log.",
        "Directly message assigning officers to check blockages.",
        "Enforce administrative override to assign issues.",
      ],
    });
  }

  // 7. Stable Operation Monitor
  if (recommendations.length === 0) {
    recommendations.push({
      type: "monitor",
      severity: "low",
      title: "Stable Operations Monitored",
      message:
        "All system metrics, SLA compliance rates, and city workloads are currently within stable performance thresholds.",
      city: null,
      department: null,
      relatedIssueIds: [],
      suggestedActions: [
        "Continue to monitor real-time SLA metrics.",
        "Ensure automatic notification triggers are functioning.",
      ],
    });
  }

  return recommendations;
}
