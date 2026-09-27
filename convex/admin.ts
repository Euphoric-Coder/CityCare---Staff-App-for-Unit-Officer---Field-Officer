import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { auditIssueAction } from '../lib/auditLogger';

// Helper function to resolve the admin's database user ID (v.id("users"))
async function resolveAdminUserId(ctx, adminUserIdStr) {
  if (!adminUserIdStr) {
    throw new Error('System Admin authentication is required.');
  }
  try {
    const user = await ctx.db.get(adminUserIdStr);
    if (user && user.role === 'admin') {
      return user._id;
    }
  } catch (e) {
    // Invalid ID format
  }
  throw new Error('Unauthorized. Valid System Admin user ID is required.');
}

const DEPARTMENT_CATEGORY_MAP = {
  road: 'road',
  roads: 'road',
  road_infrastructure: 'road',
  road_and_infrastructure: 'road',
  'road_&_infrastructure': 'road',

  electricity: 'electricity',
  lighting: 'electricity',
  street_lighting: 'electricity',
  electricity_lighting: 'electricity',
  electricity_and_lighting: 'electricity',
  'electricity_&_lighting': 'electricity',

  water: 'water',
  water_supply: 'water',

  sanitation: 'sanitation',
  sanitation_hygiene: 'sanitation',
  sanitation_and_hygiene: 'sanitation',
  'sanitation_&_hygiene': 'sanitation',

  drainage: 'drainage',
  drainage_sewerage: 'drainage',
  drainage_and_sewerage: 'drainage',
  'drainage_&_sewerage': 'drainage',

  solid_waste: 'solid_waste',
  waste: 'solid_waste',
  solid_waste_management: 'solid_waste',
  waste_management: 'solid_waste',

  public_health: 'public_health',
  health: 'public_health',

  other: 'other',
};

function normalizeDepartment(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return DEPARTMENT_CATEGORY_MAP[raw] || raw;
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeLocation(value) {
  return normalizeText(value);
}

function isOfficerCompatible({ issue, profile }) {
  const issueCity = normalizeText(issue?.city);
  const officerCity = normalizeText(profile?.city);

  const issueDepartment = normalizeDepartment(issue?.department || issue?.category);
  const officerDepartment = normalizeDepartment(profile?.department);

  return (
    Boolean(issueCity) &&
    Boolean(officerCity) &&
    issueCity === officerCity &&
    Boolean(issueDepartment) &&
    Boolean(officerDepartment) &&
    issueDepartment === officerDepartment
  );
}
// Helper functions for safe analytics calculations
function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueSorted(values) {
  return [...new Set(toArray(values))]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .sort();
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function safePercent(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  const value = Math.round((numerator / denominator) * 100);
  return Number.isFinite(value) ? value : 0;
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function averageScore(values) {
  const validValues = toArray(values).filter((value) => Number.isFinite(value));
  if (validValues.length === 0) return 0;

  const avg = validValues.reduce((sum, value) => sum + value, 0) / validValues.length;

  return clampPercent(avg);
}

export const getOfficerCommandCenterData = query({
  args: {
    adminUserId: v.optional(v.id('users')),
    cityFilter: v.optional(v.string()),
    departmentFilter: v.optional(v.string()),
    roleFilter: v.optional(
      v.union(v.literal('all'), v.literal('unit_officer'), v.literal('field_officer'))
    ),
  },
  handler: async (ctx, args) => {
    if (args.adminUserId) {
      const user = await ctx.db.get(args.adminUserId);
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized. Only System Admins can access this command center data.');
      }
    }

    const rawUnitOfficers = await ctx.db.query('unitOfficers').collect();
    const rawFieldOfficers = await ctx.db.query('fieldOfficers').collect();
    const rawIssues = await ctx.db.query('issues').collect();
    const rawUpdates = await ctx.db.query('issueUpdates').collect();

    // Group updates by issueId
    const updatesByIssue = {};
    rawUpdates.forEach((update) => {
      if (!updatesByIssue[update.issueId]) {
        updatesByIssue[update.issueId] = [];
      }
      updatesByIssue[update.issueId].push(update);
    });

    // Map profile pictures to URLs
    const unitOfficers = await Promise.all(
      rawUnitOfficers.map(async (officer) => {
        const profilePictureUrl = officer.profilePicture
          ? await ctx.storage.getUrl(officer.profilePicture)
          : null;
        return {
          ...officer,
          profilePictureUrl,
        };
      })
    );

    const fieldOfficers = await Promise.all(
      rawFieldOfficers.map(async (officer) => {
        const profilePictureUrl = officer.profilePicture
          ? await ctx.storage.getUrl(officer.profilePicture)
          : null;
        return {
          ...officer,
          profilePictureUrl,
        };
      })
    );

    // Combine into officers list
    const combinedOfficers = [
      ...toArray(unitOfficers).map((o) => ({
        id: o.userId ?? '',
        userId: o.userId ?? '',
        fullName: o.fullName ?? '',
        full_name: o.fullName ?? '',
        email: o.email ?? '',
        phone: o.phone ?? '',
        role: 'unit_officer',
        city: o.city ?? '',
        state: o.state ?? '',
        district: o.district ?? '',
        department: o.department ?? '',
        ward_zone: o.city || o.district || '',
        profilePictureUrl: o.profilePictureUrl ?? null,
        rating: o.rating ?? 0,
        efficiencyScore: o.efficiencyScore ?? 0,
        avgResolutionTime: o.avgResolutionTime ?? 0,
        accountApproved: o.accountApproved ?? false,
        specialisations: [],
        currentActiveIssues: o.activeIssueIds?.length ?? 0,
        maxIssueCapacity: 50,
      })),
      ...toArray(fieldOfficers).map((o) => ({
        id: o.userId ?? '',
        userId: o.userId ?? '',
        fullName: o.fullName ?? '',
        full_name: o.fullName ?? '',
        email: o.email ?? '',
        phone: o.phone ?? '',
        role: 'field_officer',
        city: o.city ?? '',
        state: o.state ?? '',
        district: o.district ?? '',
        department: o.department ?? '',
        ward_zone: o.city || o.district || '',
        profilePictureUrl: o.profilePictureUrl ?? null,
        rating: o.rating ?? 0,
        efficiencyScore: o.efficiencyScore ?? 0,
        avgResolutionTime: o.avgResolutionTime ?? 0,
        accountApproved: o.accountApproved ?? false,
        specialisations: o.specialisations ?? [],
        currentActiveIssues: o.currentActiveIssues ?? 0,
        maxIssueCapacity: o.maxIssueCapacity ?? 15,
      })),
    ];

    const now = Date.now();

    // 1. Calculate officerWorkload with performance metrics
    const officerWorkload = combinedOfficers.map((officer) => {
      const assignedIssues = rawIssues.filter((issue) => {
        if (officer.role === 'field_officer') {
          return issue.assignedFieldOfficer === officer.userId;
        } else {
          return issue.assignedUnitOfficer === officer.userId;
        }
      });

      const total = assignedIssues.length;

      let pending = 0;
      let inProgress = 0;
      let resolved = 0;
      let rejected = 0;
      let overdue = 0;
      let escalated = 0;
      let rework = 0;
      let reopened = 0;

      assignedIssues.forEach((issue) => {
        const status = (issue.status || '').toLowerCase().trim();

        const isOverdue =
          issue.slaDeadline &&
          issue.slaDeadline < now &&
          !['resolved', 'closed', 'rejected', 'withdrawn'].includes(status);

        if (isOverdue) {
          overdue++;
        }

        if (issue.escalatedToAdmin === true || status === 'escalated' || !!issue.escalation) {
          escalated++;
        }

        if (status === 'rework_required' || !!issue.reworkReasons?.length) {
          rework++;
        }

        if (issue.isReopened === true || (issue.reopenCount ?? 0) > 0) {
          reopened++;
        }

        if (officer.role === 'field_officer') {
          if (status === 'pending') {
            pending++;
          } else if (
            ['assigned', 'in_progress', 'rework_required', 'pending_uo_verification'].includes(
              status
            )
          ) {
            inProgress++;
          } else if (['resolved', 'closed'].includes(status)) {
            resolved++;
          } else if (status === 'rejected') {
            rejected++;
          }
        } else {
          if (['pending', 'verified'].includes(status)) {
            pending++;
          } else if (
            ['assigned', 'in_progress', 'pending_uo_verification', 'rework_required'].includes(
              status
            )
          ) {
            inProgress++;
          } else if (['resolved', 'closed'].includes(status)) {
            resolved++;
          } else if (status === 'rejected') {
            rejected++;
          }
        }
      });

      const completionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
      const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;

      // Avg Resolution Time calculations
      const completedIssues = assignedIssues.filter((i) => i.resolvedAt || i.closedAt);

      let sumResolutionTimeHours = 0;
      let sumLifecycleHours = 0;

      completedIssues.forEach((issue) => {
        const endTime = issue.resolvedAt ?? issue.closedAt ?? now;

        // Lifecycle duration (createdAt to resolvedAt/closedAt)
        const lifecycleMs = endTime - issue.createdAt;
        sumLifecycleHours += lifecycleMs / (1000 * 60 * 60);

        if (officer.role === 'field_officer') {
          // Field Officer: assignedAt to resolvedAt/closedAt
          const updates = updatesByIssue[issue._id] || [];
          const sortedUpdates = [...updates].sort(
            (a, b) => (a.createdAt || a._creationTime || 0) - (b.createdAt || b._creationTime || 0)
          );
          const assignedUpdate = sortedUpdates.find((u) => u.status === 'assigned');
          const startTime =
            assignedUpdate?.createdAt ?? assignedUpdate?._creationTime ?? issue.createdAt;
          const durationMs = endTime - startTime;
          sumResolutionTimeHours += durationMs / (1000 * 60 * 60);
        } else {
          // Unit Officer: createdAt to resolvedAt/closedAt
          sumResolutionTimeHours += lifecycleMs / (1000 * 60 * 60);
        }
      });

      const avgResolutionTime =
        completedIssues.length > 0
          ? Number((sumResolutionTimeHours / completedIssues.length).toFixed(1))
          : 0;
      const lifecycleAvgResolutionTime =
        completedIssues.length > 0
          ? Number((sumLifecycleHours / completedIssues.length).toFixed(1))
          : 0;

      // SLA compliance rate
      const completedIssuesWithSla = completedIssues.filter((i) => i.slaDeadline);
      const resolvedOnTime = completedIssuesWithSla.filter(
        (i) => (i.resolvedAt ?? i.closedAt) <= i.slaDeadline
      );
      const slaComplianceRate =
        completedIssuesWithSla.length > 0
          ? Math.round((resolvedOnTime.length / completedIssuesWithSla.length) * 100)
          : 0;
      const slaBreaches = assignedIssues.filter(
        (i) =>
          i.slaDeadline &&
          (i.resolvedAt || i.closedAt
            ? (i.resolvedAt ?? i.closedAt) > i.slaDeadline
            : now > i.slaDeadline)
      ).length;

      // Citizen rating
      const ratedIssues = completedIssues.filter(
        (i) => i.citizenRating !== null && i.citizenRating !== undefined
      );
      const citizenRating =
        ratedIssues.length > 0
          ? Number(
              (
                ratedIssues.reduce((sum, i) => sum + i.citizenRating, 0) / ratedIssues.length
              ).toFixed(1)
            )
          : 0;

      // First-time fix rate
      const firstTimeFixCount = completedIssues.filter(
        (i) =>
          !i.isReopened &&
          (i.reopenCount ?? 0) === 0 &&
          !i.reworkReasons?.length &&
          i.status !== 'rework_required'
      ).length;
      const firstTimeFixRate =
        completedIssues.length > 0
          ? Math.round((firstTimeFixCount / completedIssues.length) * 100)
          : 0;

      // Quality score
      const reworkRate = total > 0 ? (rework / total) * 100 : 0;
      const reopenRate = total > 0 ? (reopened / total) * 100 : 0;
      const escalationRate = total > 0 ? (escalated / total) * 100 : 0;
      const slaBreachRate = 100 - slaComplianceRate;
      const penalty =
        reworkRate * 0.2 + reopenRate * 0.3 + escalationRate * 0.2 + slaBreachRate * 0.3;
      const qualityScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

      // Efficiency score
      const ratingScore = (citizenRating / 5) * 100;
      let efficiencyScore = 0;
      if (officer.role === 'field_officer') {
        efficiencyScore =
          slaComplianceRate * 0.3 +
          resolutionRate * 0.25 +
          firstTimeFixRate * 0.2 +
          ratingScore * 0.15 +
          qualityScore * 0.1;
      } else {
        efficiencyScore =
          completionRate * 0.25 +
          slaComplianceRate * 0.25 +
          firstTimeFixRate * 0.2 +
          ratingScore * 0.15 +
          qualityScore * 0.15;
      }
      efficiencyScore = clampPercent(efficiencyScore);

      // Workload Percentage
      const activeIssuesCount = assignedIssues.filter((i) =>
        ['assigned', 'in_progress', 'pending_uo_verification', 'rework_required'].includes(
          (i.status || '').toLowerCase().trim()
        )
      ).length;

      let workloadPercentage = 0;
      if (officer.role === 'field_officer') {
        workloadPercentage = Math.round(
          (activeIssuesCount / (officer.maxIssueCapacity || 15)) * 100
        );
      } else {
        workloadPercentage = Math.round((activeIssuesCount / 50) * 100);
      }

      // Workload status
      let workloadStatus = 'balanced';
      if (workloadPercentage >= 85) {
        workloadStatus = 'overloaded';
      } else if (workloadPercentage <= 25) {
        workloadStatus = 'underutilized';
      }

      // Risk level
      let riskLevel = 'Good';
      if (
        efficiencyScore < 50 ||
        slaComplianceRate < 60 ||
        workloadPercentage >= 95 ||
        overdue >= 5
      ) {
        riskLevel = 'High Risk';
      } else if (
        efficiencyScore < 70 ||
        slaComplianceRate < 75 ||
        workloadPercentage >= 85 ||
        overdue >= 2
      ) {
        riskLevel = 'Needs Attention';
      }

      // Performance grade
      let performanceGrade = 'D';
      if (efficiencyScore >= 90) performanceGrade = 'A+';
      else if (efficiencyScore >= 80) performanceGrade = 'A';
      else if (efficiencyScore >= 70) performanceGrade = 'B';
      else if (efficiencyScore >= 60) performanceGrade = 'C';

      return {
        officer,
        total,
        pending,
        inProgress,
        resolved,
        rejected,
        overdue,
        escalated,
        rework,
        reopened,
        issues: assignedIssues,
        completionRate,
        resolutionRate,
        avgResolutionTime,
        lifecycleAvgResolutionTime,
        slaComplianceRate,
        slaBreaches,
        citizenRating,
        firstTimeFixRate,
        qualityScore,
        efficiencyScore,
        workloadStatus,
        workloadPercentage,
        riskLevel,
        performanceGrade,
        rating: citizenRating, // compatibility
      };
    });

    // 2. Filter data if filters are specified in the backend query args
    let filteredWorkload = officerWorkload;
    if (args.cityFilter && args.cityFilter !== 'all') {
      filteredWorkload = filteredWorkload.filter((ow) => ow.officer.city === args.cityFilter);
    }
    if (args.departmentFilter && args.departmentFilter !== 'all') {
      filteredWorkload = filteredWorkload.filter(
        (ow) => ow.officer.department === args.departmentFilter
      );
    }
    if (args.roleFilter && args.roleFilter !== 'all') {
      filteredWorkload = filteredWorkload.filter((ow) => ow.officer.role === args.roleFilter);
    }

    // 3. Stats & Summary Calculations
    const totalOfficers = combinedOfficers.length;
    const totalUnitOfficers = unitOfficers.length;
    const totalFieldOfficers = fieldOfficers.length;

    const totalIssues = rawIssues.length;
    const assignedIssuesCount = rawIssues.filter(
      (i) => i.assignedUnitOfficer || i.assignedFieldOfficer
    ).length;
    const resolvedIssuesCount = rawIssues.filter((i) =>
      ['resolved', 'closed'].includes((i.status || '').toLowerCase().trim())
    ).length;
    const activeIssuesCount = rawIssues.filter((i) =>
      ['assigned', 'in_progress', 'pending_uo_verification', 'rework_required'].includes(
        (i.status || '').toLowerCase().trim()
      )
    ).length;
    const pendingIssuesCount = rawIssues.filter((i) =>
      ['pending', 'verified'].includes((i.status || '').toLowerCase().trim())
    ).length;
    const rejectedIssuesCount = rawIssues.filter(
      (i) => (i.status || '').toLowerCase().trim() === 'rejected'
    ).length;

    const overdueIssuesCount = rawIssues.filter((issue) => {
      const status = (issue.status || '').toLowerCase().trim();
      return (
        issue.slaDeadline &&
        issue.slaDeadline < now &&
        !['resolved', 'closed', 'rejected', 'withdrawn'].includes(status)
      );
    }).length;

    const escalatedIssuesCount = rawIssues.filter(
      (i) =>
        i.escalatedToAdmin === true ||
        (i.status || '').toLowerCase().trim() === 'escalated' ||
        !!i.escalation
    ).length;
    const reworkIssuesCount = rawIssues.filter(
      (i) => i.status === 'rework_required' || !!i.reworkReasons?.length
    ).length;
    const reopenedIssuesCount = rawIssues.filter(
      (i) => i.isReopened === true || (i.reopenCount ?? 0) > 0
    ).length;

    const resolvedIssuesList = rawIssues.filter(
      (i) =>
        ['resolved', 'closed'].includes((i.status || '').toLowerCase().trim()) &&
        (i.resolvedAt || i.closedAt)
    );
    const systemAvgResolutionTime = safeNumber(
      resolvedIssuesList.length > 0
        ? Number(
            (
              resolvedIssuesList.reduce(
                (sum, i) => sum + ((i.resolvedAt ?? i.closedAt) - i.createdAt),
                0
              ) /
              (resolvedIssuesList.length * 1000 * 60 * 60)
            ).toFixed(1)
          )
        : 0
    );

    const resolvedIssuesWithDeadline = resolvedIssuesList.filter((i) => i.slaDeadline);
    const resolvedOnTimeCount = resolvedIssuesWithDeadline.filter(
      (i) => (i.resolvedAt ?? i.closedAt) <= i.slaDeadline
    ).length;
    const systemAvgSlaComplianceRate = safePercent(
      resolvedOnTimeCount,
      resolvedIssuesWithDeadline.length
    );

    const systemRatedIssues = resolvedIssuesList.filter(
      (i) => i.citizenRating !== null && i.citizenRating !== undefined
    );
    const systemAvgCitizenRating = safeNumber(
      systemRatedIssues.length > 0
        ? Number(
            (
              systemRatedIssues.reduce((sum, i) => sum + i.citizenRating, 0) /
              systemRatedIssues.length
            ).toFixed(1)
          )
        : 0
    );

    const systemAvgEfficiencyScore = averageScore(officerWorkload.map((ow) => ow.efficiencyScore));
    const systemAvgCompletionRate = averageScore(officerWorkload.map((ow) => ow.completionRate));

    const performanceSummary = {
      totalOfficers,
      totalUnitOfficers,
      totalFieldOfficers,
      totalIssues,
      assignedIssues: assignedIssuesCount,
      resolvedIssues: resolvedIssuesCount,
      activeIssues: activeIssuesCount,
      pendingIssues: pendingIssuesCount,
      rejectedIssues: rejectedIssuesCount,
      overdueIssues: overdueIssuesCount,
      escalatedIssues: escalatedIssuesCount,
      reworkIssues: reworkIssuesCount,
      reopenedIssues: reopenedIssuesCount,
      avgCompletionRate: systemAvgCompletionRate,
      avgResolutionTime: systemAvgResolutionTime,
      avgSlaComplianceRate: systemAvgSlaComplianceRate,
      avgCitizenRating: systemAvgCitizenRating,
      avgEfficiencyScore: systemAvgEfficiencyScore,
    };

    // City performance analysis
    const cities = uniqueSorted([
      ...rawIssues.map((i) => i.city),
      ...rawUnitOfficers.map((o) => o.city),
      ...rawFieldOfficers.map((o) => o.city),
    ]);
    const cityPerformance = cities.map((city) => {
      const cityIssues = rawIssues.filter((i) => i.city === city);
      const cityOfficers = officerWorkload.filter((ow) => ow.officer.city === city);
      const cityResolved = cityIssues.filter((i) =>
        ['resolved', 'closed'].includes((i.status || '').toLowerCase().trim())
      );

      const cityResolvedWithDeadline = cityResolved.filter((i) => i.slaDeadline);
      const cityResolvedOnTime = cityResolvedWithDeadline.filter(
        (i) => (i.resolvedAt ?? i.closedAt) <= i.slaDeadline
      );
      const citySla = safePercent(cityResolvedOnTime.length, cityResolvedWithDeadline.length);

      const cityRated = cityResolved.filter(
        (i) => i.citizenRating !== null && i.citizenRating !== undefined
      );
      const cityRating = safeNumber(
        cityRated.length > 0
          ? Number(
              (cityRated.reduce((sum, i) => sum + i.citizenRating, 0) / cityRated.length).toFixed(1)
            )
          : 0
      );

      const cityCompletedIssues = cityResolved.filter((i) => i.resolvedAt || i.closedAt);
      const cityResolutionTime = safeNumber(
        cityCompletedIssues.length > 0
          ? Number(
              (
                cityCompletedIssues.reduce(
                  (sum, i) => sum + ((i.resolvedAt ?? i.closedAt) - i.createdAt),
                  0
                ) /
                (cityCompletedIssues.length * 1000 * 60 * 60)
              ).toFixed(1)
            )
          : 0
      );

      return {
        city,
        totalIssues: cityIssues.length,
        resolvedIssues: cityResolved.length,
        activeIssues: cityIssues.filter((i) =>
          ['assigned', 'in_progress', 'pending_uo_verification', 'rework_required'].includes(
            (i.status || '').toLowerCase().trim()
          )
        ).length,
        overdueIssues: cityIssues.filter(
          (i) =>
            i.slaDeadline &&
            i.slaDeadline < now &&
            !['resolved', 'closed', 'rejected', 'withdrawn'].includes(
              (i.status || '').toLowerCase().trim()
            )
        ).length,
        totalOfficers: cityOfficers.length,
        unitOfficers: cityOfficers.filter((ow) => ow.officer.role === 'unit_officer').length,
        fieldOfficers: cityOfficers.filter((ow) => ow.officer.role === 'field_officer').length,
        avgCompletionRate: averageScore(cityOfficers.map((ow) => ow.completionRate)),
        avgResolutionTime: cityResolutionTime,
        avgSlaComplianceRate: citySla,
        avgCitizenRating: cityRating,
        avgEfficiencyScore: averageScore(cityOfficers.map((ow) => ow.efficiencyScore)),
      };
    });

    // Department performance analysis
    const departments = uniqueSorted([
      ...rawIssues.map((i) => i.category),
      ...rawUnitOfficers.map((o) => o.department),
      ...rawFieldOfficers.map((o) => o.department),
    ]);
    const departmentPerformance = departments.map((dept) => {
      const deptIssues = rawIssues.filter((i) => i.category === dept);
      const deptOfficers = officerWorkload.filter((ow) => ow.officer.department === dept);
      const deptResolved = deptIssues.filter((i) =>
        ['resolved', 'closed'].includes((i.status || '').toLowerCase().trim())
      );

      const deptResolvedWithDeadline = deptResolved.filter((i) => i.slaDeadline);
      const deptResolvedOnTime = deptResolvedWithDeadline.filter(
        (i) => (i.resolvedAt ?? i.closedAt) <= i.slaDeadline
      );
      const deptSla = safePercent(deptResolvedOnTime.length, deptResolvedWithDeadline.length);

      const deptRated = deptResolved.filter(
        (i) => i.citizenRating !== null && i.citizenRating !== undefined
      );
      const deptRating = safeNumber(
        deptRated.length > 0
          ? Number(
              (deptRated.reduce((sum, i) => sum + i.citizenRating, 0) / deptRated.length).toFixed(1)
            )
          : 0
      );

      const deptCompletedIssues = deptResolved.filter((i) => i.resolvedAt || i.closedAt);
      const deptResolutionTime = safeNumber(
        deptCompletedIssues.length > 0
          ? Number(
              (
                deptCompletedIssues.reduce(
                  (sum, i) => sum + ((i.resolvedAt ?? i.closedAt) - i.createdAt),
                  0
                ) /
                (deptCompletedIssues.length * 1000 * 60 * 60)
              ).toFixed(1)
            )
          : 0
      );

      return {
        department: dept,
        totalIssues: deptIssues.length,
        resolvedIssues: deptResolved.length,
        activeIssues: deptIssues.filter((i) =>
          ['assigned', 'in_progress', 'pending_uo_verification', 'rework_required'].includes(
            (i.status || '').toLowerCase().trim()
          )
        ).length,
        overdueIssues: deptIssues.filter(
          (i) =>
            i.slaDeadline &&
            i.slaDeadline < now &&
            !['resolved', 'closed', 'rejected', 'withdrawn'].includes(
              (i.status || '').toLowerCase().trim()
            )
        ).length,
        totalOfficers: deptOfficers.length,
        unitOfficers: deptOfficers.filter((ow) => ow.officer.role === 'unit_officer').length,
        fieldOfficers: deptOfficers.filter((ow) => ow.officer.role === 'field_officer').length,
        avgCompletionRate: averageScore(deptOfficers.map((ow) => ow.completionRate)),
        avgResolutionTime: deptResolutionTime,
        avgSlaComplianceRate: deptSla,
        avgCitizenRating: deptRating,
        avgEfficiencyScore: averageScore(deptOfficers.map((ow) => ow.efficiencyScore)),
      };
    });

    // Officer leaderboards
    const officerLeaderboards = {
      topOverall: [...officerWorkload]
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
        .slice(0, 10),
      topUnitOfficers: officerWorkload
        .filter((ow) => ow.officer.role === 'unit_officer')
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
        .slice(0, 10),
      topFieldOfficers: officerWorkload
        .filter((ow) => ow.officer.role === 'field_officer')
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
        .slice(0, 10),
      needsAttention: officerWorkload
        .filter((ow) => ow.riskLevel === 'Needs Attention')
        .sort((a, b) => a.efficiencyScore - b.efficiencyScore)
        .slice(0, 10),
      highRisk: officerWorkload
        .filter((ow) => ow.riskLevel === 'High Risk')
        .sort((a, b) => a.efficiencyScore - b.efficiencyScore)
        .slice(0, 10),
      overloaded: officerWorkload
        .filter((ow) => ow.workloadStatus === 'overloaded')
        .sort((a, b) => b.workloadPercentage - a.workloadPercentage)
        .slice(0, 10),
      underutilized: officerWorkload
        .filter((ow) => ow.workloadStatus === 'underutilized')
        .sort((a, b) => a.workloadPercentage - b.workloadPercentage)
        .slice(0, 10),
      bestSla: [...officerWorkload]
        .sort((a, b) => b.slaComplianceRate - a.slaComplianceRate)
        .slice(0, 10),
      bestRated: [...officerWorkload]
        .sort((a, b) => b.citizenRating - a.citizenRating)
        .slice(0, 10),
      fastestResolution: officerWorkload
        .filter((ow) => ow.resolved > 0)
        .sort((a, b) => a.avgResolutionTime - b.avgResolutionTime)
        .slice(0, 10),
    };

    // Risk Analysis
    const highRiskCount = officerWorkload.filter((ow) => ow.riskLevel === 'High Risk').length;
    const needsAttentionCount = officerWorkload.filter(
      (ow) => ow.riskLevel === 'Needs Attention'
    ).length;
    const overloadedCount = officerWorkload.filter(
      (ow) => ow.workloadStatus === 'overloaded'
    ).length;
    const underutilizedCount = officerWorkload.filter(
      (ow) => ow.workloadStatus === 'underutilized'
    ).length;
    const slaBreachCount = officerWorkload.reduce((sum, ow) => sum + ow.slaBreaches, 0);

    const riskByCity = cities.map((city) => {
      const cityOfficers = officerWorkload.filter((ow) => ow.officer.city === city);
      return {
        city,
        highRiskCount: cityOfficers.filter((ow) => ow.riskLevel === 'High Risk').length,
        needsAttentionCount: cityOfficers.filter((ow) => ow.riskLevel === 'Needs Attention').length,
      };
    });

    const riskByDepartment = departments.map((dept) => {
      const deptOfficers = officerWorkload.filter((ow) => ow.officer.department === dept);
      return {
        department: dept,
        highRiskCount: deptOfficers.filter((ow) => ow.riskLevel === 'High Risk').length,
        needsAttentionCount: deptOfficers.filter((ow) => ow.riskLevel === 'Needs Attention').length,
      };
    });

    const riskAnalysis = {
      highRiskCount,
      needsAttentionCount,
      overloadedCount,
      underutilizedCount,
      slaBreachCount,
      overdueCount: overdueIssuesCount,
      escalationCount: escalatedIssuesCount,
      reworkCount: reworkIssuesCount,
      reopenCount: reopenedIssuesCount,
      highRiskOfficers: officerWorkload.filter((ow) => ow.riskLevel === 'High Risk'),
      riskByCity,
      riskByDepartment,
    };

    // Workload Distribution
    const balancedCount = officerWorkload.filter((ow) => ow.workloadStatus === 'balanced').length;
    const averageWorkloadPercentage =
      totalOfficers > 0
        ? Math.round(
            officerWorkload.reduce((sum, ow) => sum + ow.workloadPercentage, 0) / totalOfficers
          )
        : 0;
    const fieldOfficersList = officerWorkload.filter((ow) => ow.officer.role === 'field_officer');
    const fieldOfficerCapacityUsage =
      fieldOfficersList.length > 0
        ? Math.round(
            fieldOfficersList.reduce((sum, ow) => sum + ow.workloadPercentage, 0) /
              fieldOfficersList.length
          )
        : 0;
    const unitOfficersList = officerWorkload.filter((ow) => ow.officer.role === 'unit_officer');
    const unitOfficerActiveLoad =
      unitOfficersList.length > 0
        ? Math.round(
            unitOfficersList.reduce((sum, ow) => sum + ow.workloadPercentage, 0) /
              unitOfficersList.length
          )
        : 0;

    const workloadDistribution = {
      balanced: balancedCount,
      overloaded: overloadedCount,
      underutilized: underutilizedCount,
      averageWorkloadPercentage,
      fieldOfficerCapacityUsage,
      unitOfficerActiveLoad,
    };

    // Quality Metrics
    const systemFirstTimeFixCount = resolvedIssuesList.filter((issue) => {
      const status = (issue.status || '').toLowerCase().trim();
      return (
        !issue.isReopened &&
        (issue.reopenCount ?? 0) === 0 &&
        !(issue.reworkReasons && issue.reworkReasons.length > 0) &&
        status !== 'rework_required'
      );
    }).length;

    const systemFirstTimeFixRate =
      resolvedIssuesList.length > 0
        ? Math.round((systemFirstTimeFixCount / resolvedIssuesList.length) * 100)
        : 0;

    const qualityMetrics = {
      firstTimeFixRate: systemFirstTimeFixRate,
      reworkRate: safePercent(reworkIssuesCount, totalIssues),
      reopenRate: safePercent(reopenedIssuesCount, totalIssues),
      escalationRate: safePercent(escalatedIssuesCount, totalIssues),
      citizenSatisfaction: Math.round(systemAvgCitizenRating * 20),
      slaComplianceRate: systemAvgSlaComplianceRate,
    };

    const filters = {
      cities,
      departments,
      roles: ['all', 'unit_officer', 'field_officer'],
      riskLevels: ['all', 'Good', 'Needs Attention', 'High Risk'],
      workloadStatuses: ['all', 'balanced', 'overloaded', 'underutilized'],
    };

    // Return the old compatible lists and stats PLUS the new extended analytics
    return {
      unitOfficers,
      fieldOfficers,
      officers: combinedOfficers,
      issues: rawIssues,
      officerWorkload: filteredWorkload, // Return filtered workloads for frontend list
      stats: {
        totalOfficers,
        totalUnitOfficers,
        totalFieldOfficers,
        assignedIssues: assignedIssuesCount,
        overdueIssues: overdueIssuesCount,
        balancedCount,
        overloadedCount,
        underutilizedCount,
        avgCompletion: systemAvgCompletionRate,
      },
      performanceSummary,
      cityPerformance,
      departmentPerformance,
      officerLeaderboards,
      riskAnalysis,
      workloadDistribution,
      qualityMetrics,
      filters,
    };
  },
});

export const getAssignableOfficers = query({
  args: {
    issueId: v.optional(v.id('issues')),
    officerType: v.optional(v.union(v.literal('unit_officer'), v.literal('field_officer'))),
  },
  handler: async (ctx, args) => {
    const rawUnitOfficers = await ctx.db.query('unitOfficers').collect();
    const rawFieldOfficers = await ctx.db.query('fieldOfficers').collect();

    const unitOfficers = await Promise.all(
      rawUnitOfficers.map(async (officer) => {
        const user = await ctx.db.get(officer.userId).catch(() => null);
        const profilePictureUrl = officer.profilePicture
          ? await ctx.storage.getUrl(officer.profilePicture).catch(() => null)
          : null;
        const currentWorkload = Array.isArray(officer.activeIssueIds)
          ? officer.activeIssueIds.length
          : 0;
        const maximumCapacity = 50;

        return {
          _id: officer._id,
          profileId: officer._id,
          userId: officer.userId ?? '',
          fullName: officer.fullName ?? user?.fullName ?? 'Unit Officer',
          name: officer.fullName ?? user?.fullName ?? 'Unit Officer',
          email: officer.email ?? user?.email ?? '',
          phone: officer.phone ?? '',
          city: officer.city ?? '',
          state: officer.state ?? '',
          district: officer.district ?? '',
          department: officer.department ?? 'General',
          rating: officer.rating ?? 0,
          efficiencyScore: officer.efficiencyScore ?? 80,
          activeIssueCount: currentWorkload,
          currentWorkload,
          maximumCapacity,
          availableCapacity: Math.max(0, maximumCapacity - currentWorkload),
          isAtCapacity: currentWorkload >= maximumCapacity,
          accountApproved: officer.accountApproved,
          profilePictureUrl,
        };
      })
    );

    const fieldOfficers = await Promise.all(
      rawFieldOfficers.map(async (officer) => {
        const user = await ctx.db.get(officer.userId).catch(() => null);
        const profilePictureUrl = officer.profilePicture
          ? await ctx.storage.getUrl(officer.profilePicture).catch(() => null)
          : null;
        const currentWorkload = officer.currentActiveIssues ?? 0;
        const maximumCapacity = officer.maxIssueCapacity ?? 10;

        return {
          _id: officer._id,
          profileId: officer._id,
          userId: officer.userId ?? '',
          fullName: officer.fullName ?? user?.fullName ?? 'Field Officer',
          name: officer.fullName ?? user?.fullName ?? 'Field Officer',
          email: officer.email ?? user?.email ?? '',
          phone: officer.phone ?? '',
          city: officer.city ?? '',
          state: officer.state ?? '',
          district: officer.district ?? '',
          department: officer.department ?? 'General',
          specialisations: officer.specialisations ?? [],
          currentActiveIssues: currentWorkload,
          activeIssueCount: currentWorkload,
          currentWorkload,
          maxIssueCapacity: maximumCapacity,
          maximumCapacity,
          availableCapacity: Math.max(0, maximumCapacity - currentWorkload),
          isAtCapacity: currentWorkload >= maximumCapacity,
          rating: officer.rating ?? 0,
          efficiencyScore: officer.efficiencyScore ?? 80,
          accountApproved: officer.accountApproved,
          profilePictureUrl,
        };
      })
    );

    let issue = null;
    if (args.issueId) {
      issue = await ctx.db.get(args.issueId);
      if (!issue) {
        throw new Error('Issue not found.');
      }
    }

    const requestedType = args.officerType || 'unit_officer';

    let currentOfficerUserId = null;
    if (issue) {
      currentOfficerUserId =
        requestedType === 'unit_officer' ? issue.assignedUnitOfficer : issue.assignedFieldOfficer;
    }

    let currentOfficer = null;
    if (currentOfficerUserId) {
      const sourceList = requestedType === 'unit_officer' ? unitOfficers : fieldOfficers;
      const found = sourceList.find((o) => String(o.userId) === String(currentOfficerUserId));
      if (found) {
        currentOfficer = {
          ...found,
          role: requestedType,
          isCurrentOfficer: true,
        };
      } else {
        const user = await ctx.db.get(currentOfficerUserId);
        if (user) {
          currentOfficer = {
            userId: user._id,
            profileId: null,
            name: user.fullName || 'Officer',
            fullName: user.fullName || 'Officer',
            email: user.email || null,
            phone: null,
            department: issue?.department || issue?.category || 'General',
            city: issue?.city || '',
            state: issue?.state || '',
            rating: 0,
            efficiencyScore: 80,
            currentWorkload: 0,
            maximumCapacity: null,
            role: requestedType,
            isCurrentOfficer: true,
          };
        }
      }
    }

    let candidates = [];
    if (args.officerType) {
      const sourceList = args.officerType === 'unit_officer' ? unitOfficers : fieldOfficers;
      const targetCity = issue?.city || '';
      const targetDept = issue ? issue.department || issue.category : '';

      const rawCandidates = sourceList.filter((o) => {
        if (o.accountApproved === false) return false;
        if (currentOfficerUserId && String(o.userId) === String(currentOfficerUserId)) {
          return false;
        }

        if (targetCity) {
          const cityMatch = Boolean(
            o.city && normalizeLocation(o.city) === normalizeLocation(targetCity)
          );
          if (!cityMatch) return false;
        }

        if (targetDept) {
          const departmentMatch = Boolean(
            o.department && normalizeDepartment(o.department) === normalizeDepartment(targetDept)
          );
          if (!departmentMatch) return false;
        }

        return true;
      });

      candidates = rawCandidates.map((o) => {
        const cityMatch = true;
        const departmentMatch = true;
        const isAtCapacity = o.isAtCapacity;
        const isRecommended = !isAtCapacity;

        let matchTier = isAtCapacity ? 5 : 1;

        const compatibilityWarnings = [];
        if (isAtCapacity) compatibilityWarnings.push('Capacity Reached');

        return {
          ...o,
          role: args.officerType,
          performanceScore: o.efficiencyScore || 80,
          cityMatch: true,
          departmentMatch: true,
          isSameCity: true,
          isSameDepartment: true,
          isRecommended,
          recommendationReason: isAtCapacity
            ? 'Capacity Reached'
            : 'Same city & department with available capacity',
          compatibilityWarnings,
          isCurrentOfficer: false,
          matchTier,
        };
      });

      candidates.sort((a, b) => {
        if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier;
        if (a.currentWorkload !== b.currentWorkload) return a.currentWorkload - b.currentWorkload;
        if (b.efficiencyScore !== a.efficiencyScore) return b.efficiencyScore - a.efficiencyScore;
        return b.rating - a.rating;
      });
    }

    return {
      issueContext: issue
        ? {
            issueId: issue._id,
            city: issue.city,
            state: issue.state,
            category: issue.category,
            department: issue.department || issue.category,
          }
        : null,
      currentOfficer,
      candidates,
      unitOfficers,
      fieldOfficers,
    };
  },
});

export const resolveAdminId = query({
  args: { adminUserIdStr: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await resolveAdminUserId(ctx, args.adminUserIdStr || '2');
  },
});

export const adminAssignIssue = mutation({
  args: {
    issueId: v.id('issues'),
    officerUserId: v.id('users'),
    role: v.union(v.literal('unit_officer'), v.literal('field_officer')),
    adminUserId: v.string(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminUserId);

    if (args.role === 'unit_officer') {
      const uo = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.officerUserId))
        .unique();
      if (!uo) throw new Error('Unit Officer profile not found');

      if (uo.accountApproved === false) {
        throw new Error('Selected Unit Officer account is not approved.');
      }

      if (!isOfficerCompatible({ issue, profile: uo })) {
        throw new Error(
          `Selected Unit Officer is not eligible for this issue. Officer must belong to the same city (${issue.city || 'Unknown'}) and exact department (${issue.department || issue.category || 'Unknown'}).`
        );
      }

      const currentWorkload = Array.isArray(uo.activeIssueIds) ? uo.activeIssueIds.length : 0;
      if (currentWorkload >= 50) {
        throw new Error('Selected Unit Officer is currently at maximum workload capacity.');
      }

      await ctx.db.patch(args.issueId, {
        assignedUnitOfficer: args.officerUserId,
      });

      const activeIssues = uo.activeIssueIds || [];
      if (!activeIssues.includes(args.issueId)) {
        await ctx.db.patch(uo._id, {
          activeIssueIds: [...activeIssues, args.issueId],
        });
      }

      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: issue.status,
        comment:
          args.comment ||
          `Issue has been assigned to Ward Officer ${uo.fullName} for verification.`,
        updatedBy: adminDbId,
        role: 'admin',
        attachments: [],
        scope: 'officer_and_citizen',
        createdAt: now,
      });

      // Citizen Notification
      await ctx.db.insert('notifications', {
        userId: issue.reportedBy,
        issueId: args.issueId,
        title: `Ward Officer Assigned - "${issue.title}"`,
        message: `Your issue has been assigned to Ward Officer ${uo.fullName} for verification.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });

      // Officer Notification
      await ctx.db.insert('notifications', {
        userId: args.officerUserId,
        issueId: args.issueId,
        title: `New Issue Assigned - "${issue.title}"`,
        message: `You have been assigned a new issue for verification: "${issue.title} (${issue.issueCode})"`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });

      // Universal Audit Log
      await auditIssueAction(ctx, {
        issue,
        performedByUserId: adminDbId,
        performerRole: 'admin',
        action: 'assign_unit_officer',
        actionCategory: 'assignment',
        oldValue: {
          assignedUnitOfficer: issue.assignedUnitOfficer ?? null,
        },
        newValue: {
          assignedUnitOfficer: args.officerUserId,
        },
        reason: args.comment,
        description: `System Admin assigned Unit Officer ${uo.fullName} to issue ${issue.issueCode}.`,
        source: 'web',
      });
    } else {
      const fo = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.officerUserId))
        .unique();
      if (!fo) throw new Error('Field Officer profile not found');

      if (fo.accountApproved === false) {
        throw new Error('Selected Field Officer account is not approved.');
      }

      if (!isOfficerCompatible({ issue, profile: fo })) {
        throw new Error(
          `Selected Field Officer is not eligible for this issue. Officer must belong to the same city (${issue.city || 'Unknown'}) and exact department (${issue.department || issue.category || 'Unknown'}).`
        );
      }

      const currentWorkload = fo.currentActiveIssues ?? 0;
      const maxCap = fo.maxIssueCapacity ?? 10;
      if (currentWorkload >= maxCap) {
        throw new Error('Selected Field Officer is currently at maximum workload capacity.');
      }

      await ctx.db.patch(args.issueId, {
        assignedFieldOfficer: args.officerUserId,
        status: 'assigned',
      });

      const assignedIssues = fo.assignedIssueIds || [];
      if (!assignedIssues.includes(args.issueId)) {
        const updated = [...assignedIssues, args.issueId];
        await ctx.db.patch(fo._id, {
          assignedIssueIds: updated,
          currentActiveIssues: updated.length,
        });
      }

      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: 'assigned',
        comment:
          args.comment || `Issue has been assigned to Field Officer ${fo.fullName} for resolution.`,
        updatedBy: adminDbId,
        role: 'admin',
        attachments: [],
        scope: 'officer_and_citizen',
        createdAt: now,
      });

      // Citizen Notification
      await ctx.db.insert('notifications', {
        userId: issue.reportedBy,
        issueId: args.issueId,
        title: `Field Officer Assigned - "${issue.title}"`,
        message: `Your issue has been assigned to Field Officer ${fo.fullName} for resolution.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });

      // Officer Notification
      await ctx.db.insert('notifications', {
        userId: args.officerUserId,
        issueId: args.issueId,
        title: `New Field Assignment - "${issue.title}"`,
        message: `You have been assigned issue "${issue.title} (${issue.issueCode})" for on-ground resolution.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });

      // Universal Audit Log
      const isReassign = Boolean(issue.assignedFieldOfficer);
      await auditIssueAction(ctx, {
        issue,
        performedByUserId: adminDbId,
        performerRole: 'admin',
        action: isReassign ? 'reassign_field_officer' : 'assign_field_officer',
        actionCategory: 'assignment',
        oldValue: {
          assignedFieldOfficer: issue.assignedFieldOfficer ?? null,
        },
        newValue: {
          assignedFieldOfficer: args.officerUserId,
        },
        reason: args.comment,
        description: `System Admin ${isReassign ? 'reassigned' : 'assigned'} Field Officer ${fo.fullName} to issue ${issue.issueCode}.`,
        source: 'web',
      });
    }

    return { success: true };
  },
});

export const adminReassignIssue = mutation({
  args: {
    issueId: v.id('issues'),
    newOfficerUserId: v.id('users'),
    role: v.union(v.literal('unit_officer'), v.literal('field_officer')),
    adminUserId: v.string(),
    reason: v.string(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminUserId);

    if (args.role === 'unit_officer') {
      const oldOfficerUserId = issue.assignedUnitOfficer;
      if (String(oldOfficerUserId || '') === String(args.newOfficerUserId)) {
        throw new Error('The selected Unit Officer is already assigned to this issue.');
      }
      const newUO = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.newOfficerUserId))
        .unique();
      if (!newUO) throw new Error('Selected user is not a valid Unit Officer.');

      if (newUO.accountApproved === false) {
        throw new Error('Selected Unit Officer account is not approved.');
      }

      if (!isOfficerCompatible({ issue, profile: newUO })) {
        throw new Error(
          `Selected Unit Officer is not eligible for this issue. Officer must belong to the same city (${issue.city || 'Unknown'}) and exact department (${issue.department || issue.category || 'Unknown'}).`
        );
      }

      const currentWorkload = Array.isArray(newUO.activeIssueIds) ? newUO.activeIssueIds.length : 0;
      if (currentWorkload >= 50) {
        throw new Error('Selected Unit Officer is currently at maximum workload capacity.');
      }

      // Revoke old officer
      if (oldOfficerUserId) {
        const oldUO = await ctx.db
          .query('unitOfficers')
          .withIndex('by_user', (q) => q.eq('userId', oldOfficerUserId))
          .unique();
        if (oldUO) {
          await ctx.db.patch(oldUO._id, {
            activeIssueIds: (oldUO.activeIssueIds || []).filter((id) => id !== args.issueId),
            resolvedIssueIds: (oldUO.resolvedIssueIds || []).filter((id) => id !== args.issueId),
          });
          await ctx.db.insert('notifications', {
            userId: oldOfficerUserId,
            issueId: args.issueId,
            title: `Issue Reassigned - "${issue.title}"`,
            message: `Issue "${issue.title} (${issue.issueCode})" has been reassigned from you to Ward Officer ${newUO.fullName}.`,
            type: 'assigned',
            read: false,
            createdAt: now,
          });
        }
      }

      // Check if current Field Officer is still valid under issue department and city
      let keepFieldOfficer = issue.assignedFieldOfficer;
      if (issue.assignedFieldOfficer) {
        const currentFoProfile = await ctx.db
          .query('fieldOfficers')
          .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer))
          .unique();
        if (currentFoProfile && !isOfficerCompatible({ issue, profile: currentFoProfile })) {
          keepFieldOfficer = null;
          const assigned = (currentFoProfile.assignedIssueIds || []).filter(
            (id) => String(id) !== String(args.issueId)
          );
          await ctx.db.patch(currentFoProfile._id, {
            assignedIssueIds: assigned,
            currentActiveIssues: Math.max(0, assigned.length),
          });
        }
      }

      // Assign new officer
      await ctx.db.patch(args.issueId, {
        assignedUnitOfficer: args.newOfficerUserId,
        assignedFieldOfficer: keepFieldOfficer,
      });

      const activeIssues = newUO.activeIssueIds || [];
      if (!activeIssues.includes(args.issueId)) {
        await ctx.db.patch(newUO._id, {
          activeIssueIds: [...activeIssues, args.issueId],
        });
      }

      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: issue.status,
        comment: `Ward Officer reassigned: ${args.reason}${args.comment ? ` - ${args.comment}` : ''}`,
        updatedBy: adminDbId,
        role: 'admin',
        attachments: [],
        scope: 'officer_and_citizen',
        createdAt: now,
      });

      await ctx.db.insert('notifications', {
        userId: args.newOfficerUserId,
        issueId: args.issueId,
        title: `Issue Reassigned to You - "${issue.title}"`,
        message: `You have been reassigned to issue "${issue.title} (${issue.issueCode})" by admin.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });

      await ctx.db.insert('notifications', {
        userId: issue.reportedBy,
        issueId: args.issueId,
        title: `Ward Officer Reassigned - "${issue.title}"`,
        message: `Your issue has been reassigned to Ward Officer ${newUO.fullName}.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });

      // Universal Audit Log
      await auditIssueAction(ctx, {
        issue,
        performedByUserId: adminDbId,
        performerRole: 'admin',
        action: 'reassign_unit_officer',
        actionCategory: 'assignment',
        oldValue: {
          assignedUnitOfficer: oldOfficerUserId ?? null,
        },
        newValue: {
          assignedUnitOfficer: args.newOfficerUserId,
        },
        reason: args.reason,
        description: `System Admin reassigned Unit Officer ${newUO.fullName} to issue ${issue.issueCode}.`,
        source: 'web',
      });
    } else {
      // field_officer
      const oldOfficerUserId = issue.assignedFieldOfficer;
      if (String(oldOfficerUserId || '') === String(args.newOfficerUserId)) {
        throw new Error('The selected Field Officer is already assigned to this issue.');
      }
      const newFO = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.newOfficerUserId))
        .unique();
      if (!newFO) throw new Error('Selected user is not a valid Field Officer.');

      if (newFO.accountApproved === false) {
        throw new Error('Selected Field Officer account is not approved.');
      }

      if (!isOfficerCompatible({ issue, profile: newFO })) {
        throw new Error(
          `Selected Field Officer is not eligible for this issue. Officer must belong to the same city (${issue.city || 'Unknown'}) and exact department (${issue.department || issue.category || 'Unknown'}).`
        );
      }

      const currentWorkload = newFO.currentActiveIssues ?? 0;
      const maxCap = newFO.maxIssueCapacity ?? 10;
      if (currentWorkload >= maxCap) {
        throw new Error('Selected Field Officer is currently at maximum workload capacity.');
      }

      // Revoke old officer
      if (oldOfficerUserId) {
        const oldFO = await ctx.db
          .query('fieldOfficers')
          .withIndex('by_user', (q) => q.eq('userId', oldOfficerUserId))
          .unique();
        if (oldFO) {
          const assigned = (oldFO.assignedIssueIds || []).filter((id) => id !== args.issueId);
          await ctx.db.patch(oldFO._id, {
            assignedIssueIds: assigned,
            currentActiveIssues: assigned.length,
            completedIssueIds: (oldFO.completedIssueIds || []).filter((id) => id !== args.issueId),
          });
          await ctx.db.insert('notifications', {
            userId: oldOfficerUserId,
            issueId: args.issueId,
            title: `Issue Reassigned - "${issue.title}"`,
            message: `Issue "${issue.title} (${issue.issueCode})" has been reassigned from you to Field Officer ${newFO.fullName}.`,
            type: 'assigned',
            read: false,
            createdAt: now,
          });
        }
      }

      // Assign new officer
      await ctx.db.patch(args.issueId, {
        assignedFieldOfficer: args.newOfficerUserId,
      });

      const assignedIssues = newFO.assignedIssueIds || [];
      if (!assignedIssues.includes(args.issueId)) {
        const updated = [...assignedIssues, args.issueId];
        await ctx.db.patch(newFO._id, {
          assignedIssueIds: updated,
          currentActiveIssues: updated.length,
        });
      }

      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: issue.status,
        comment: `Field Officer reassigned: ${args.reason}${args.comment ? ` - ${args.comment}` : ''}`,
        updatedBy: adminDbId,
        role: 'admin',
        attachments: [],
        scope: 'officer_and_citizen',
        createdAt: now,
      });

      await ctx.db.insert('notifications', {
        userId: args.newOfficerUserId,
        issueId: args.issueId,
        title: `Issue Reassigned to You - "${issue.title}"`,
        message: `You have been reassigned to resolve issue "${issue.title} (${issue.issueCode})" by admin.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });

      await ctx.db.insert('notifications', {
        userId: issue.reportedBy,
        issueId: args.issueId,
        title: `Field Officer Reassigned - "${issue.title}"`,
        message: `Your issue has been reassigned to Field Officer ${newFO.fullName} for resolution.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });

      // Universal Audit Log
      await auditIssueAction(ctx, {
        issue,
        performedByUserId: adminDbId,
        performerRole: 'admin',
        action: 'reassign_field_officer',
        actionCategory: 'assignment',
        oldValue: {
          assignedFieldOfficer: oldOfficerUserId ?? null,
        },
        newValue: {
          assignedFieldOfficer: args.newOfficerUserId,
        },
        reason: args.reason,
        description: `System Admin reassigned Field Officer ${newFO.fullName} to issue ${issue.issueCode}.`,
        source: 'web',
      });
    }

    return { success: true };
  },
});

export const adminRejectIssue = mutation({
  args: {
    issueId: v.id('issues'),
    adminUserId: v.string(),
    reason: v.string(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminUserId);

    await ctx.db.patch(args.issueId, {
      status: 'rejected',
      rejection: {
        reason: args.reason,
        comment: args.comment,
        rejectedBy: adminDbId,
        rejectedAt: now,
      },
      assignedFieldOfficer: null, // Clear FO assignment
    });

    // Clean up Unit Officer workload
    if (issue.assignedUnitOfficer) {
      const uo = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedUnitOfficer))
        .unique();
      if (uo) {
        await ctx.db.patch(uo._id, {
          activeIssueIds: (uo.activeIssueIds || []).filter((id) => id !== args.issueId),
          resolvedIssueIds: (uo.resolvedIssueIds || []).filter((id) => id !== args.issueId),
        });
      }
      await ctx.db.insert('notifications', {
        userId: issue.assignedUnitOfficer,
        issueId: args.issueId,
        title: `Issue Rejected - "${issue.title}"`,
        message: `Issue "${issue.title} (${issue.issueCode})" has been rejected by Administrator.`,
        type: 'rejected',
        read: false,
        createdAt: now,
      });
    }

    // Clean up Field Officer workload
    if (issue.assignedFieldOfficer) {
      const fo = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer))
        .unique();
      if (fo) {
        const assigned = (fo.assignedIssueIds || []).filter((id) => id !== args.issueId);
        await ctx.db.patch(fo._id, {
          assignedIssueIds: assigned,
          currentActiveIssues: assigned.length,
          completedIssueIds: (fo.completedIssueIds || []).filter((id) => id !== args.issueId),
        });
      }
      await ctx.db.insert('notifications', {
        userId: issue.assignedFieldOfficer,
        issueId: args.issueId,
        title: `Issue Rejected - "${issue.title}"`,
        message: `Issue "${issue.title} (${issue.issueCode})" has been rejected by Administrator.`,
        type: 'rejected',
        read: false,
        createdAt: now,
      });
    }

    // Timeline Update
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'rejected',
      comment: `Issue rejected by Administrator.\nReason: ${args.reason}\nExplanation: ${args.comment}`,
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
      title: `Issue Rejected - "${issue.title}"`,
      message: `Your reported issue "${issue.title}" has been rejected. Reason: ${args.reason}.`,
      type: 'rejected',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});

export const adminRevokeAssignment = mutation({
  args: {
    issueId: v.id('issues'),
    adminUserId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminUserId);
    let oldOfficerUserId = null;
    let newStatus = issue.status;

    if (issue.assignedFieldOfficer) {
      oldOfficerUserId = issue.assignedFieldOfficer;
      const fo = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', oldOfficerUserId))
        .unique();
      if (fo) {
        const assigned = (fo.assignedIssueIds || []).filter((id) => id !== args.issueId);
        await ctx.db.patch(fo._id, {
          assignedIssueIds: assigned,
          currentActiveIssues: assigned.length,
          completedIssueIds: (fo.completedIssueIds || []).filter((id) => id !== args.issueId),
        });
      }
      await ctx.db.patch(args.issueId, {
        assignedFieldOfficer: null,
        status: 'verified',
      });
      newStatus = 'verified';
    } else if (issue.assignedUnitOfficer) {
      oldOfficerUserId = issue.assignedUnitOfficer;
      const uo = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', oldOfficerUserId))
        .unique();
      if (uo) {
        await ctx.db.patch(uo._id, {
          activeIssueIds: (uo.activeIssueIds || []).filter((id) => id !== args.issueId),
          resolvedIssueIds: (uo.resolvedIssueIds || []).filter((id) => id !== args.issueId),
        });
      }
      await ctx.db.patch(args.issueId, {
        assignedUnitOfficer: null,
        status: 'pending',
      });
      newStatus = 'pending';
    }

    // Timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: newStatus,
      comment: `Assignment revoked by Administrator. Reason: ${args.reason}`,
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Officer
    if (oldOfficerUserId) {
      await ctx.db.insert('notifications', {
        userId: oldOfficerUserId,
        issueId: args.issueId,
        title: `Assignment Revoked - "${issue.title}"`,
        message: `Your assignment to issue "${issue.title} (${issue.issueCode})" has been revoked by Administrator.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    // Notify Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
      title: `Issue Assignment Revoked - "${issue.title}"`,
      message: `The assignment on your issue has been revoked. Status updated to ${newStatus}.`,
      type: 'assigned',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});

export const adminExtendSLA = mutation({
  args: {
    issueId: v.id('issues'),
    adminUserId: v.string(),
    newDeadline: v.number(),
    reason: v.string(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminUserId);

    await ctx.db.patch(args.issueId, {
      slaDeadline: args.newDeadline,
      slaBreached: false,
      slaExtension: {
        reason: args.reason,
        comment: args.comment || '',
        extendedBy: adminDbId,
        extendedAt: now,
        newSlaDeadline: args.newDeadline,
      },
      slaBreachedCount: (issue.slaBreachedCount || 0) + 1,
    });

    // Timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: `SLA extended by Administrator.\nReason: ${args.reason}\nNote: ${args.comment || 'N/A'}\nNew Deadline: ${new Date(args.newDeadline).toLocaleDateString()}`,
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Field Officer
    if (issue.assignedFieldOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedFieldOfficer,
        issueId: args.issueId,
        title: `SLA Deadline Extended`,
        message: `The SLA deadline for issue "${issue.title}" has been extended to ${new Date(args.newDeadline).toLocaleDateString()} by Administrator.`,
        type: 'sla_alert',
        read: false,
        createdAt: now,
      });
    }

    // Notify Unit Officer
    if (issue.assignedUnitOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedUnitOfficer,
        issueId: args.issueId,
        title: `SLA Deadline Extended`,
        message: `The SLA deadline for issue "${issue.title}" has been extended to ${new Date(args.newDeadline).toLocaleDateString()} by Administrator.`,
        type: 'sla_alert',
        read: false,
        createdAt: now,
      });
    }

    // Notify Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
      title: `SLA Deadline Extended`,
      message: `The SLA deadline for your issue "${issue.title}" has been updated to ${new Date(args.newDeadline).toLocaleDateString()}.`,
      type: 'sla_alert',
      read: false,
      createdAt: now,
    });

    // Universal Audit Log
    await auditIssueAction(ctx, {
      issue,
      performedByUserId: adminDbId,
      performerRole: 'admin',
      action: 'extend_sla',
      actionCategory: 'sla',
      oldValue: {
        slaDeadline: issue.slaDeadline,
      },
      newValue: {
        slaDeadline: args.newDeadline,
      },
      reason: args.reason,
      description: `System Admin extended SLA deadline to ${new Date(args.newDeadline).toLocaleDateString()}.`,
      source: 'web',
    });

    return { success: true };
  },
});

export const adminSendForRework = mutation({
  args: {
    issueId: v.id('issues'),
    adminUserId: v.string(),
    reworkReason: v.string(),
    reworkComment: v.string(),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminUserId);

    await ctx.db.patch(args.issueId, {
      status: 'rework_required',
      reworkNote: args.reworkComment.trim(),
      reworkReasons: [args.reworkReason],
      lastReworkRequestedAt: now,
    });

    // Timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'rework_required',
      comment: `Rework requested by Administrator.\nReason: ${args.reworkReason}\nNote: ${args.reworkComment}`,
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Field Officer
    if (issue.assignedFieldOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedFieldOfficer,
        issueId: args.issueId,
        title: `Rework Required - "${issue.title}"`,
        message: `Administrator has requested rework on issue "${issue.title}". Note: ${args.reworkComment}`,
        type: 'rework',
        read: false,
        createdAt: now,
      });
    }

    // Notify Unit Officer
    if (issue.assignedUnitOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedUnitOfficer,
        issueId: args.issueId,
        title: `Rework Requested - "${issue.title}"`,
        message: `Administrator has requested rework on issue "${issue.title}". Note: ${args.reworkComment}`,
        type: 'rework',
        read: false,
        createdAt: now,
      });
    }

    // Notify Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
      title: `Issue Update - "${issue.title}"`,
      message: `Your issue has been sent back to the field officer for rework. We apologize for the delay.`,
      type: 'rework',
      read: false,
      createdAt: now,
    });

    // Universal Audit Log
    await auditIssueAction(ctx, {
      issue,
      performedByUserId: adminDbId,
      performerRole: 'admin',
      action: 'rework_requested',
      actionCategory: 'rework',
      oldValue: {
        status: issue.status,
      },
      newValue: {
        status: 'rework_required',
      },
      reason: args.reworkReason,
      description: `System Admin requested rework for issue ${issue.issueCode}.`,
      source: 'web',
    });

    return { success: true };
  },
});

export const adminCloseIssue = mutation({
  args: {
    issueId: v.id('issues'),
    adminUserId: v.string(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminUserId);

    await ctx.db.patch(args.issueId, {
      status: 'closed',
      closedAt: now,
    });

    // Update Field Officer active list -> completed list
    if (issue.assignedFieldOfficer) {
      const fo = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer))
        .unique();
      if (fo) {
        const assigned = (fo.assignedIssueIds || []).filter((id) => id !== args.issueId);
        const completed = fo.completedIssueIds || [];
        await ctx.db.patch(fo._id, {
          assignedIssueIds: assigned,
          currentActiveIssues: assigned.length,
          completedIssueIds: completed.includes(args.issueId)
            ? completed
            : [...completed, args.issueId],
          totalResolvedIssues: (fo.totalResolvedIssues || 0) + 1,
        });
      }
      await ctx.db.insert('notifications', {
        userId: issue.assignedFieldOfficer,
        issueId: args.issueId,
        title: `Issue Closed - "${issue.title}"`,
        message: `Issue "${issue.title} (${issue.issueCode})" has been closed by Administrator.`,
        type: 'closed',
        read: false,
        createdAt: now,
      });
    }

    // Update Unit Officer active list -> resolved list
    if (issue.assignedUnitOfficer) {
      const uo = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedUnitOfficer))
        .unique();
      if (uo) {
        const active = (uo.activeIssueIds || []).filter((id) => id !== args.issueId);
        const resolved = uo.resolvedIssueIds || [];
        await ctx.db.patch(uo._id, {
          activeIssueIds: active,
          resolvedIssueIds: resolved.includes(args.issueId)
            ? resolved
            : [...resolved, args.issueId],
        });
      }
      await ctx.db.insert('notifications', {
        userId: issue.assignedUnitOfficer,
        issueId: args.issueId,
        title: `Issue Closed - "${issue.title}"`,
        message: `Issue "${issue.title} (${issue.issueCode})" has been closed by Administrator.`,
        type: 'closed',
        read: false,
        createdAt: now,
      });
    }

    // Timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'closed',
      comment: args.comment || 'Issue has been closed by Administrator.',
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
      title: `Issue Closed - "${issue.title}"`,
      message: `Your reported issue "${issue.title}" has been closed. Thank you for using CityCare!`,
      type: 'closed',
      read: false,
      createdAt: now,
    });

    // Universal Audit Log
    await auditIssueAction(ctx, {
      issue,
      performedByUserId: adminDbId,
      performerRole: 'admin',
      action: 'issue_closed',
      actionCategory: 'resolution',
      oldValue: {
        status: issue.status,
      },
      newValue: {
        status: 'closed',
      },
      reason: args.comment,
      description: `System Admin closed issue ${issue.issueCode}.`,
      source: 'web',
    });

    return { success: true };
  },
});

export const adminEscalateIssue = mutation({
  args: {
    issueId: v.id('issues'),
    escalatedBy: v.id('users'),
    category: v.union(
      v.literal('sla_breach'),
      v.literal('resource_shortage'),
      v.literal('technical_complexity'),
      v.literal('public_safety_risk'),
      v.literal('legal_or_regulatory'),
      v.literal('citizen_escalation'),
      v.literal('repeat_failure'),
      v.literal('cross_department_dependency'),
      v.literal('budget_approval_required'),
      v.literal('emergency_response'),
      v.literal('officer_non_responsiveness'),
      v.literal('technical_dependency'),
      v.literal('third_party_dependency'),
      v.literal('environmental_risk'),
      v.literal('administrative_approval_pending'),
      v.literal('other')
    ),
    priority: v.union(v.literal('medium'), v.literal('high'), v.literal('critical')),
    reason: v.string(),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    if (args.reason.length < 50) {
      throw new Error('Escalation reason must be at least 50 characters long');
    }

    const now = Date.now();

    await ctx.db.patch(args.issueId, {
      status: 'escalated',
      escalatedToAdmin: true,
      escalation: {
        category: args.category,
        priority: args.priority,
        reason: args.reason,
        comments: args.comments,
        escalatedBy: args.escalatedBy,
        escalatedAt: now,
        resolved: false,
        adminReviewStatus: 'pending',
        escalationCount: (issue.escalation?.escalationCount || 0) + 1,
        prevIssueStatus: issue.status,
      },
    });

    const categoryLabels = {
      sla_breach: 'SLA Breach',
      resource_shortage: 'Resource Shortage',
      technical_complexity: 'Technical Complexity',
      public_safety_risk: 'Public Safety Risk',
      legal_or_regulatory: 'Legal / Regulatory',
      citizen_escalation: 'Citizen Escalation',
      repeat_failure: 'Repeat Failure',
      cross_department_dependency: 'Cross Department Dependency',
      budget_approval_required: 'Budget Approval Required',
      emergency_response: 'Emergency Response',
      officer_non_responsiveness: 'Officer Non-Responsiveness',
      technical_dependency: 'Technical Dependency',
      third_party_dependency: 'Third Party Dependency',
      environmental_risk: 'Environmental Risk',
      administrative_approval_pending: 'Administrative Approval Pending',
      other: 'Other',
    };

    const priorityLabels = {
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    };

    const updateComment = `Issue escalated by Admin.\n\nCategory: ${categoryLabels[args.category]}\nPriority: ${priorityLabels[args.priority]}\n\nReason:\n${args.reason}${args.comments ? `\n\nAdditional Comments:\n${args.comments}` : ''}`;

    // Timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'escalated',
      comment: updateComment,
      updatedBy: args.escalatedBy,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Field Officer
    if (issue.assignedFieldOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedFieldOfficer,
        issueId: args.issueId,
        title: `Issue Escalated to Admin`,
        message: `Issue "${issue.title}" has been escalated to Administrator for intervention. Priority: ${priorityLabels[args.priority]}.`,
        type: 'escalated',
        read: false,
        createdAt: now,
      });
    }

    // Notify Unit Officer
    if (issue.assignedUnitOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedUnitOfficer,
        issueId: args.issueId,
        title: `Issue Escalated to Admin`,
        message: `Issue "${issue.title}" has been escalated to Administrator for intervention. Priority: ${priorityLabels[args.priority]}.`,
        type: 'escalated',
        read: false,
        createdAt: now,
      });
    }

    // Notify Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
      title: `Issue Escalated to Admin`,
      message: `Your reported issue "${issue.title}" has been escalated to Administrator. We will review it shortly. Priority: ${priorityLabels[args.priority]}.`,
      type: 'escalated',
      read: false,
      createdAt: now,
    });

    // Universal Audit Log
    await auditIssueAction(ctx, {
      issue,
      performedByUserId: args.escalatedBy,
      performerRole: 'admin',
      action: 'issue_escalated',
      actionCategory: 'escalation',
      oldValue: {
        status: issue.status,
        escalatedToAdmin: false,
      },
      newValue: {
        status: 'escalated',
        escalatedToAdmin: true,
        escalationCategory: args.category,
        escalationPriority: args.priority,
      },
      reason: args.reason,
      description: `Issue ${issue.issueCode} escalated to Admin.`,
      source: 'web',
    });

    // Notify Admin Team (All Admins)
    const admins = await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', 'admin'))
      .collect();
    for (const admin of admins) {
      await ctx.db.insert('notifications', {
        userId: admin._id,
        issueId: args.issueId,
        title: `Issue Escalated - "${issue.title}"`,
        message: `An issue has been escalated. Category: ${categoryLabels[args.category]}, Priority: ${priorityLabels[args.priority]}.`,
        type: 'escalated',
        read: false,
        createdAt: now,
      });
    }

    // Notify City Admin on Critical Priority
    if (args.priority === 'critical') {
      const cityAdmins = await ctx.db
        .query('users')
        .withIndex('by_role', (q) => q.eq('role', 'city_admin'))
        .collect();
      for (const ca of cityAdmins) {
        await ctx.db.insert('notifications', {
          userId: ca._id,
          issueId: args.issueId,
          title: `🚨 CRITICAL Escalation - "${issue.title}"`,
          message: `CRITICAL Public Safety or Emergency escalation registered: "${issue.title} (${issue.issueCode})"`,
          type: 'escalated',
          read: false,
          createdAt: now,
        });
      }
    }

    return { success: true };
  },
});

export const adminReopenIssue = mutation({
  args: {
    issueId: v.id('issues'),
    adminUserId: v.string(),
    reopenReason: v.string(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminUserId);

    await ctx.db.patch(args.issueId, {
      status: 'pending',
      isReopened: true,
      reopenCount: (issue.reopenCount || 0) + 1,
      reopenReason: args.reopenReason,
      // Clear field officer assignment if any (goes back to pending verification)
      assignedFieldOfficer: null,
    });

    // Timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'pending',
      comment: `Issue reopened by Administrator. Reason: ${args.reopenReason}${args.comment ? ` - ${args.comment}` : ''}`,
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Unit Officer
    if (issue.assignedUnitOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedUnitOfficer,
        issueId: args.issueId,
        title: `Issue Reopened - "${issue.title}"`,
        message: `Issue "${issue.title} (${issue.issueCode})" has been reopened by Administrator.`,
        type: 'reopened',
        read: false,
        createdAt: now,
      });
    }

    // Notify Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
      title: `Issue Reopened - "${issue.title}"`,
      message: `Your issue has been reopened by Administrator and returned to the verification stage.`,
      type: 'reopened',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});
