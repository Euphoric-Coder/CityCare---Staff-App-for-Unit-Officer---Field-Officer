import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import {
  TERMINAL_STATUSES,
  ACTIVE_STATUSES,
  DUPLICATE_THRESHOLD,
  normalizeLocation,
  safePercentage,
  calculateMedian,
  getRangeStart,
  getPreviousRangeBounds,
  getIssueId,
  getPossibleDuplicateIds,
  getIssueCreatedAt,
  calculateDuplicatePairs,
  buildPersistedDuplicatePairs,
  mergeDuplicatePairs,
  buildCalculatedDuplicateGroups,
  enrichCalculatedDuplicateGroup,
  buildTimeBuckets,
} from '../lib/cityIssueAnalytics';

const normalizeKey = (val) => (val || '').toLowerCase().trim();

export function normalizeDepartment(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

// Helper to resolve the admin's database user ID (v.id("users"))
async function resolveCityAdminUserId(ctx, cityAdminUserIdStr) {
  if (cityAdminUserIdStr) {
    try {
      const user = await ctx.db.get(cityAdminUserIdStr);
      if (user && user.role === 'city_admin') {
        return user._id;
      }
    } catch (e) {
      // Not a valid ID format or not found
    }
  }
  return null;
}

export const getCityAdminOverview = query({
  args: {
    cityAdminUserId: v.id('users'),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Resolve user & role
    const user = await ctx.db.get(args.cityAdminUserId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role !== 'city_admin') {
      throw new Error('Unauthorized. Only City Admins can access this data.');
    }

    // 2. Query cityAdmins profile
    const cityAdmin = await ctx.db
      .query('cityAdmins')
      .withIndex('by_user', (q) => q.eq('userId', args.cityAdminUserId))
      .unique();
    if (!cityAdmin) {
      throw new Error('City Admin profile not found.');
    }

    const city = cityAdmin.city;
    const state = cityAdmin.state;
    const now = Date.now();
    const rangeDays = args.days ?? 7;
    const isAllTime = rangeDays === 0;

    // Filter range calculation
    const cutoff = isAllTime ? 0 : now - rangeDays * 24 * 60 * 60 * 1000;

    // 3. Query issues within the city (indexed)
    const allCityIssues = await ctx.db
      .query('issues')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();

    // Split into all-time vs range-filtered
    const rangeIssues = allCityIssues.filter((i) => {
      const created = i.createdAt ?? i._creationTime ?? now;
      return isAllTime || created >= cutoff;
    });

    // 4. Query officers within the city (indexed/filtered)
    const unitOfficers = await ctx.db
      .query('unitOfficers')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();

    const fieldOfficers = await ctx.db
      .query('fieldOfficers')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();

    // 5. Active & Terminal classifications
    const activeStatuses = [
      'pending',
      'verified',
      'assigned',
      'in_progress',
      'pending_uo_verification',
      'rework_required',
      'reopened',
      'escalated',
    ];

    const getStatusCount = (issuesList, statusName) =>
      issuesList.filter((i) => normalizeKey(i.status) === normalizeKey(statusName)).length;

    // SLA Calculations
    let overdueIssuesCount = 0;
    let dueSoonIssuesCount = 0;
    let onTrackIssuesCount = 0;
    let totalCompletedWithSla = 0;
    let compliantCompletedCount = 0;
    let totalResolutionTimeMs = 0;
    let resolvedWithTimeCount = 0;

    const activeSlaIssues = [];

    // Let's process active issues for current SLA status
    for (const issue of allCityIssues) {
      const isTerminal = ['resolved', 'closed', 'rejected', 'withdrawn'].includes(
        normalizeKey(issue.status)
      );
      if (!isTerminal) {
        if (issue.slaDeadline) {
          if (issue.slaDeadline < now) {
            overdueIssuesCount++;
            activeSlaIssues.push({ issue, type: 'overdue', delay: now - issue.slaDeadline });
          } else if (issue.slaDeadline - now < 48 * 60 * 60 * 1000) {
            dueSoonIssuesCount++;
            activeSlaIssues.push({ issue, type: 'due_soon', remaining: issue.slaDeadline - now });
          } else {
            onTrackIssuesCount++;
          }
        }
      } else {
        // Historical metrics on completed/terminal issues
        if (issue.slaDeadline && (issue.resolvedAt || issue.closedAt)) {
          totalCompletedWithSla++;
          const completedAt = issue.resolvedAt ?? issue.closedAt ?? now;
          if (completedAt <= issue.slaDeadline) {
            compliantCompletedCount++;
          }
        }
        if (issue.createdAt && (issue.resolvedAt || issue.closedAt)) {
          const completedAt = issue.resolvedAt ?? issue.closedAt ?? now;
          totalResolutionTimeMs += completedAt - issue.createdAt;
          resolvedWithTimeCount++;
        }
      }
    }

    const slaComplianceRate =
      totalCompletedWithSla > 0
        ? Math.round((compliantCompletedCount / totalCompletedWithSla) * 100)
        : 100;

    const averageResolutionTimeHours =
      resolvedWithTimeCount > 0
        ? Math.round(totalResolutionTimeMs / resolvedWithTimeCount / (1000 * 60 * 60))
        : 0;

    // Find nearest upcoming deadline
    let nearestDeadline = null;
    let nearestDeadlineIssue = null;
    let mostOverdueIssue = null;
    let maxOverdueDelay = -1;

    for (const item of activeSlaIssues) {
      if (item.type === 'due_soon' || item.type === 'on_track') {
        if (nearestDeadline === null || item.issue.slaDeadline < nearestDeadline) {
          nearestDeadline = item.issue.slaDeadline;
          nearestDeadlineIssue = {
            id: item.issue._id,
            code: item.issue.issueCode,
            title: item.issue.title,
            deadline: item.issue.slaDeadline,
          };
        }
      } else if (item.type === 'overdue') {
        if (item.delay > maxOverdueDelay) {
          maxOverdueDelay = item.delay;
          mostOverdueIssue = {
            id: item.issue._id,
            code: item.issue.issueCode,
            title: item.issue.title,
            overdueHours: Math.round(item.delay / (1000 * 60 * 60)),
          };
        }
      }
    }

    // Duplicate detection inside city (from rangeIssues)
    const duplicateGroupsList = [];
    const processed = new Set();
    let duplicateIssuesCount = 0;
    let redundantDuplicateIssuesCount = 0;

    const calculateSimilarity = (str1, str2) => {
      const words1 = new Set((str1 || '').toLowerCase().split(/\s+/));
      const words2 = new Set((str2 || '').toLowerCase().split(/\s+/));
      const intersection = new Set([...words1].filter((x) => words2.has(x)));
      return intersection.size / Math.max(words1.size, words2.size);
    };

    for (let i = 0; i < rangeIssues.length; i++) {
      const issue = rangeIssues[i];
      if (processed.has(issue._id)) continue;

      const groupDuplicates = [];
      for (let j = 0; j < rangeIssues.length; j++) {
        const other = rangeIssues[j];
        if (i === j || processed.has(other._id)) continue;

        const similarity = calculateSimilarity(issue.title, other.title);
        if (similarity > 0.7) {
          groupDuplicates.push({
            id: other._id,
            code: other.issueCode,
            title: other.title,
            address: other.address,
            similarity: Math.round(similarity * 100),
          });
          processed.add(other._id);
        }
      }

      if (groupDuplicates.length > 0) {
        duplicateGroupsList.push({
          primary: {
            id: issue._id,
            code: issue.issueCode,
            title: issue.title,
            address: issue.address,
          },
          duplicates: groupDuplicates,
        });
        processed.add(issue._id);
        duplicateIssuesCount += groupDuplicates.length + 1;
        redundantDuplicateIssuesCount += groupDuplicates.length;
      }
    }

    // Officers overview stats
    const activeOfficersCount =
      unitOfficers.filter((o) => o.accountApproved).length +
      fieldOfficers.filter((o) => o.accountApproved).length;

    const overloadedOfficersList = fieldOfficers.filter(
      (o) => o.accountApproved && (o.assignedIssueIds || []).length >= 5
    );
    const officersWithOverdue = new Set();
    for (const item of activeSlaIssues) {
      if (item.type === 'overdue' && item.issue.assignedUnitOfficer) {
        officersWithOverdue.add(String(item.issue.assignedUnitOfficer));
      }
      if (item.type === 'overdue' && item.issue.assignedFieldOfficer) {
        officersWithOverdue.add(String(item.issue.assignedFieldOfficer));
      }
    }

    // Top performing officer
    let topPerformingOfficer = null;
    let maxResolvedCount = -1;
    for (const uo of unitOfficers) {
      const resolvedCount = (uo.resolvedIssueIds || []).length;
      if (resolvedCount > maxResolvedCount) {
        maxResolvedCount = resolvedCount;
        topPerformingOfficer = {
          id: uo._id,
          name: uo.fullName,
          role: 'unit_officer',
          resolvedCount,
        };
      }
    }
    for (const fo of fieldOfficers) {
      const resolvedCount = fo.totalResolvedIssues || 0;
      if (resolvedCount > maxResolvedCount) {
        maxResolvedCount = resolvedCount;
        topPerformingOfficer = {
          id: fo._id,
          name: fo.fullName,
          role: 'field_officer',
          resolvedCount,
        };
      }
    }

    // Officer requiring attention
    let officerRequiringAttention = null;
    if (overloadedOfficersList.length > 0) {
      const target = overloadedOfficersList[0];
      officerRequiringAttention = {
        id: target._id,
        name: target.fullName,
        reason: 'Overloaded capacity',
      };
    } else if (officersWithOverdue.size > 0) {
      const officerId = [...officersWithOverdue][0];
      const uo = unitOfficers.find((o) => String(o.userId) === officerId);
      const fo = fieldOfficers.find((o) => String(o.userId) === officerId);
      if (uo) {
        officerRequiringAttention = {
          id: uo._id,
          name: uo.fullName,
          reason: 'Has overdue issues assigned',
        };
      } else if (fo) {
        officerRequiringAttention = {
          id: fo._id,
          name: fo.fullName,
          reason: 'Has overdue issues assigned',
        };
      }
    }

    const getIssueSlaStatusAndHours = (issue, nowTime) => {
      const isTerminal = ['resolved', 'closed', 'rejected', 'withdrawn'].includes(
        normalizeKey(issue.status)
      );
      if (isTerminal) return { slaStatus: 'resolved', hoursRemaining: 0 };
      if (!issue.slaDeadline) return { slaStatus: 'no_sla', hoursRemaining: 0 };
      const diff = issue.slaDeadline - nowTime;
      const hours = Math.round(diff / (1000 * 60 * 60));
      if (diff < 0) {
        return { slaStatus: 'breached', hoursRemaining: hours };
      }
      if (diff < 48 * 60 * 60 * 1000) {
        return { slaStatus: 'at_risk', hoursRemaining: hours };
      }
      return { slaStatus: 'on_track', hoursRemaining: hours };
    };

    const officerIds = new Set();
    for (const issue of rangeIssues) {
      if (issue.assignedUnitOfficer) officerIds.add(String(issue.assignedUnitOfficer));
      if (issue.assignedFieldOfficer) officerIds.add(String(issue.assignedFieldOfficer));
    }

    const officerNamesMap = new Map();
    for (const id of officerIds) {
      const u = await ctx.db.get(id);
      if (u) {
        officerNamesMap.set(id, u.fullName);
      }
    }

    const mapIssues = rangeIssues
      .filter((i) => {
        const lat = Number(i.latitude);
        const lng = Number(i.longitude);
        return (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        );
      })
      .map((i) => {
        const { slaStatus, hoursRemaining } = getIssueSlaStatusAndHours(i, now);
        const assignedUnitOfficerName = i.assignedUnitOfficer
          ? (officerNamesMap.get(String(i.assignedUnitOfficer)) ?? null)
          : null;
        const assignedFieldOfficerName = i.assignedFieldOfficer
          ? (officerNamesMap.get(String(i.assignedFieldOfficer)) ?? null)
          : null;
        return {
          id: i._id,
          code: i.issueCode,
          title: i.title,
          description: i.description || '',
          category: i.category,
          subcategory: i.subcategory ?? [],
          priority: i.priority,
          status: i.status,

          address: i.address,
          city: i.city,
          state: i.state,
          postal: i.postal,

          latitude: Number(i.latitude),
          longitude: Number(i.longitude),

          createdAt: i.createdAt ?? i._creationTime,
          slaDeadline: i.slaDeadline,

          assignedUnitOfficerId: i.assignedUnitOfficer,
          assignedUnitOfficerName,

          assignedFieldOfficerId: i.assignedFieldOfficer,
          assignedFieldOfficerName,

          isEscalated:
            i.escalatedToAdmin === true || i.status === 'escalated' || Boolean(i.escalation),

          slaStatus,
          hoursRemaining,
        };
      });

    function getIssueSlaStatus(issue, nowTime) {
      const isTerminal = ['resolved', 'closed', 'rejected', 'withdrawn'].includes(
        normalizeKey(issue.status)
      );
      if (isTerminal) return 'resolved';
      if (!issue.slaDeadline) return 'no_sla';
      if (issue.slaDeadline < nowTime) return 'breached';
      if (issue.slaDeadline - nowTime < 48 * 60 * 60 * 1000) return 'at_risk';
      return 'on_track';
    }

    // Recent Issues (limit 5)
    const recentIssues = [...rangeIssues]
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 5)
      .map((i) => ({
        id: i._id,
        code: i.issueCode,
        title: i.title,
        status: i.status,
        category: i.category,
        createdAt: i.createdAt,
      }));

    // Needs Urgent Attention list
    const urgentIssues = rangeIssues
      .filter((i) => {
        const isTerminal = ['resolved', 'closed', 'rejected', 'withdrawn'].includes(
          normalizeKey(i.status)
        );
        if (isTerminal) return false;
        const slaStatus = getIssueSlaStatus(i, now);
        const isEsc = !!i.escalatedToAdmin || (i.escalation && !i.escalation.resolved);
        const isReopened = !!i.isReopened;
        const isHighPriority = i.priority === 'high' || i.priority === 'critical';
        const isUnassigned = !i.assignedUnitOfficer && !i.assignedFieldOfficer;
        return (
          slaStatus === 'breached' ||
          slaStatus === 'at_risk' ||
          isEsc ||
          isReopened ||
          isHighPriority ||
          isUnassigned
        );
      })
      .map((i) => {
        let reason = 'Requires review';
        const slaStatus = getIssueSlaStatus(i, now);
        if (slaStatus === 'breached') {
          reason = 'SLA Deadline Breached';
        } else if (i.escalation && !i.escalation.resolved) {
          reason = `Escalated: ${i.escalation.reason}`;
        } else if (i.isReopened) {
          reason = 'Reopened by citizen';
        } else if (i.priority === 'critical' || i.priority === 'high') {
          reason = `${i.priority} severity issue`;
        } else if (!i.assignedUnitOfficer && !i.assignedFieldOfficer) {
          reason = 'Unassigned ticket';
        }
        return {
          id: i._id,
          code: i.issueCode,
          title: i.title,
          status: i.status,
          category: i.category,
          priority: i.priority,
          reason,
        };
      })
      .slice(0, 5);

    // Escalated Issues Section
    const cityEscalations = rangeIssues.filter((i) => i.escalation && !i.escalation.resolved);

    const recentEscalations = [...cityEscalations]
      .sort((a, b) => (b.escalation.escalatedAt ?? 0) - (a.escalation.escalatedAt ?? 0))
      .slice(0, 5)
      .map((i) => ({
        id: i._id,
        code: i.issueCode,
        title: i.title,
        category: i.category,
        priority: i.priority,
        status: i.status,
        assignedUnitOfficer: i.assignedUnitOfficer,
        assignedFieldOfficer: i.assignedFieldOfficer,
        escalationCategory: i.escalation.category,
        escalationReason: i.escalation.reason,
        escalatedAt: i.escalation.escalatedAt,
        adminReviewStatus: i.escalation.adminReviewStatus || 'pending',
      }));

    // Status distribution
    const statusKeys = [...new Set(rangeIssues.map((i) => i.status).filter(Boolean))];
    const statusDistribution = statusKeys.map((key) => ({
      status: key,
      count: rangeIssues.filter((i) => i.status === key).length,
    }));

    // Category distribution
    const categoryKeys = [...new Set(rangeIssues.map((i) => i.category).filter(Boolean))];
    const categoryDistribution = categoryKeys.map((key) => ({
      category: key,
      count: rangeIssues.filter((i) => i.category === key).length,
    }));

    // Department/Category performance breakdown
    const departmentPerformance = categoryKeys.map((cat) => {
      const catIssues = allCityIssues.filter((i) => i.category === cat);
      const activeCat = catIssues.filter((i) => activeStatuses.includes(normalizeKey(i.status)));
      const overdueCat = catIssues.filter((i) => getIssueSlaStatus(i, now) === 'breached');
      const escalatedCat = catIssues.filter((i) => i.escalation && !i.escalation.resolved);
      const resolvedCat = catIssues.filter((i) =>
        ['resolved', 'closed'].includes(normalizeKey(i.status))
      );

      let compRate = 100;
      const resolvedWithSla = resolvedCat.filter((i) => i.slaDeadline);
      if (resolvedWithSla.length > 0) {
        const compliant = resolvedWithSla.filter(
          (i) => (i.resolvedAt ?? i.closedAt ?? 0) <= i.slaDeadline
        );
        compRate = Math.round((compliant.length / resolvedWithSla.length) * 100);
      }

      return {
        department: cat,
        totalIssues: catIssues.length,
        activeIssues: activeCat.length,
        overdueIssues: overdueCat.length,
        escalatedIssues: escalatedCat.length,
        slaComplianceRate: compRate,
      };
    });

    // Recent Administrative Activity
    const rawUpdates = await ctx.db.query('issueUpdates').collect();
    const cityIssuesSet = new Set(allCityIssues.map((i) => String(i._id)));
    const cityAdminUpdates = rawUpdates
      .filter((u) => cityIssuesSet.has(String(u.issueId)))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

    const recentAdministrativeActivity = [];
    for (const update of cityAdminUpdates) {
      const updater = await ctx.db.get(update.updatedBy);
      const targetIssue = allCityIssues.find((i) => String(i._id) === String(update.issueId));
      recentAdministrativeActivity.push({
        id: update._id,
        action: update.comment || 'Workflow updated',
        performedBy: updater?.fullName || 'Administrative System',
        performerRole: updater?.role || 'system',
        timestamp: new Date(update.createdAt).toLocaleString(),
        affectedEntity: targetIssue?.issueCode || 'Unknown',
        notes: `Status changed to ${update.status}`,
      });
    }

    return {
      scope: {
        cityAdminUserId: args.cityAdminUserId,
        cityAdminProfileId: cityAdmin._id,
        city,
        state,
        rangeDays,
        rangeLabel: isAllTime ? 'All Time' : `${rangeDays} Days`,
        generatedAt: now,
      },

      summary: {
        totalIssues: rangeIssues.length,
        invalidCoordsCount: rangeIssues.length - mapIssues.length,
        activeIssues: rangeIssues.filter((i) => activeStatuses.includes(normalizeKey(i.status)))
          .length,
        pendingIssues: getStatusCount(rangeIssues, 'pending'),
        verifiedIssues: getStatusCount(rangeIssues, 'verified'),
        assignedIssues: getStatusCount(rangeIssues, 'assigned'),
        inProgressIssues: getStatusCount(rangeIssues, 'in_progress'),
        pendingVerificationIssues: getStatusCount(rangeIssues, 'pending_uo_verification'),
        reworkRequiredIssues: getStatusCount(rangeIssues, 'rework_required'),
        reopenedIssues:
          getStatusCount(rangeIssues, 'reopened') + rangeIssues.filter((i) => i.isReopened).length,
        escalatedIssues: getStatusCount(rangeIssues, 'escalated') + cityEscalations.length,
        resolvedIssues: getStatusCount(rangeIssues, 'resolved'),
        closedIssues: getStatusCount(rangeIssues, 'closed'),
        rejectedIssues:
          getStatusCount(rangeIssues, 'rejected') + rangeIssues.filter((i) => i.rejection).length,
        withdrawnIssues: getStatusCount(rangeIssues, 'withdrawn'),

        overdueIssues: overdueIssuesCount,
        dueSoonIssues: dueSoonIssuesCount,
        onTrackIssues: onTrackIssuesCount,
        slaComplianceRate,
        averageResolutionTimeHours,

        totalUnitOfficers: unitOfficers.length,
        totalFieldOfficers: fieldOfficers.length,
        activeOfficers: activeOfficersCount,
        overloadedOfficers: overloadedOfficersList.length,

        duplicateGroups: duplicateGroupsList.length,
        duplicateIssues: duplicateIssuesCount,
        redundantDuplicateIssues: redundantDuplicateIssuesCount,
      },

      recentIssues,
      urgentIssues,
      recentEscalations,
      slaSnapshot: {
        overdueCount: overdueIssuesCount,
        dueSoonCount: dueSoonIssuesCount,
        onTrackCount: onTrackIssuesCount,
        nearestDeadline: nearestDeadline ? new Date(nearestDeadline).toISOString() : null,
        nearestDeadlineIssue,
        mostOverdueIssue,
      },
      mapIssues,
      statusDistribution,
      categoryDistribution,
      departmentPerformance,
      recentAdministrativeActivity,
      officerSnapshot: {
        totalUnitOfficers: unitOfficers.length,
        totalFieldOfficers: fieldOfficers.length,
        activeOfficers: activeOfficersCount,
        unassignedOfficers:
          unitOfficers.filter((o) => (o.activeIssueIds || []).length === 0).length +
          fieldOfficers.filter((o) => (o.assignedIssueIds || []).length === 0).length,
        overloadedFieldOfficers: overloadedOfficersList.length,
        officersWithOverdueCount: officersWithOverdue.size,
        topPerformingOfficer,
        officerRequiringAttention,
      },
    };
  },
});

export const getCityAdminProfile = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== 'city_admin') {
      return null;
    }
    const profile = await ctx.db
      .query('cityAdmins')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
    return profile;
  },
});

async function requireCityAdmin(ctx, cityAdminUserId) {
  const user = await ctx.db.get(cityAdminUserId);
  if (!user || user.role !== 'city_admin') {
    throw new Error('Unauthorised: City Admin access required');
  }

  const profile = await ctx.db
    .query('cityAdmins')
    .withIndex('by_user', (q) => q.eq('userId', cityAdminUserId))
    .unique();

  if (!profile) {
    throw new Error('City Admin profile not found');
  }

  return {
    user,
    profile,
    city: profile.city,
    state: profile.state,
  };
}

export const getCityAdminIssues = query({
  args: {
    cityAdminUserId: v.id('users'),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(v.string()),
    department: v.optional(v.string()),
    assignmentStatus: v.optional(v.string()),
    slaStatus: v.optional(v.string()),
    escalationStatus: v.optional(v.string()),
    dateRange: v.optional(
      v.union(v.literal('today'), v.literal('7d'), v.literal('30d'), v.literal('all'))
    ),
    sortBy: v.optional(v.string()),
    sortDirection: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { city, state } = await requireCityAdmin(ctx, args.cityAdminUserId);

    // Fetch all issues in the city (indexed)
    const allIssues = await ctx.db
      .query('issues')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();

    const now = Date.now();

    // Collect all unique user IDs to resolve in one batch
    const userIds = new Set();
    allIssues.forEach((issue) => {
      if (issue.reportedBy) userIds.add(issue.reportedBy);
      if (issue.assignedUnitOfficer) userIds.add(issue.assignedUnitOfficer);
      if (issue.assignedFieldOfficer) userIds.add(issue.assignedFieldOfficer);
    });

    const usersList = await Promise.all(Array.from(userIds).map((id) => ctx.db.get(id)));
    const userMap = new Map(usersList.filter(Boolean).map((u) => [String(u._id), u]));

    // Batch fetch unitOfficer profiles
    const unitOfficersList = await ctx.db
      .query('unitOfficers')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();
    const unitOfficerMap = new Map(unitOfficersList.map((o) => [String(o.userId), o]));

    // Batch fetch fieldOfficer profiles
    const fieldOfficersList = await ctx.db
      .query('fieldOfficers')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();
    const fieldOfficerMap = new Map(fieldOfficersList.map((o) => [String(o.userId), o]));

    // Filter issues in memory
    let filtered = allIssues;

    // 1. Search
    if (args.search) {
      const q = args.search.toLowerCase().trim();
      filtered = filtered.filter((i) => {
        const citizenUser = userMap.get(String(i.reportedBy));
        const uoUser = i.assignedUnitOfficer ? userMap.get(String(i.assignedUnitOfficer)) : null;
        const foUser = i.assignedFieldOfficer ? userMap.get(String(i.assignedFieldOfficer)) : null;

        return (
          (i.issueCode || '').toLowerCase().includes(q) ||
          (i.title || '').toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          (i.address || '').toLowerCase().includes(q) ||
          (i.category || '').toLowerCase().includes(q) ||
          (citizenUser?.fullName || '').toLowerCase().includes(q) ||
          (uoUser?.fullName || '').toLowerCase().includes(q) ||
          (foUser?.fullName || '').toLowerCase().includes(q)
        );
      });
    }

    // 2. Date Range
    if (args.dateRange && args.dateRange !== 'all') {
      let limit = 0;
      if (args.dateRange === 'today') limit = now - 24 * 60 * 60 * 1000;
      else if (args.dateRange === '7d') limit = now - 7 * 24 * 60 * 60 * 1000;
      else if (args.dateRange === '30d') limit = now - 30 * 24 * 60 * 60 * 1000;

      filtered = filtered.filter((i) => {
        const created = i.createdAt ?? i._creationTime ?? now;
        return created >= limit;
      });
    }

    // Compute filter counts on filtered issues (before page layout split)
    const activeStatuses = [
      'pending',
      'verified',
      'assigned',
      'in_progress',
      'pending_uo_verification',
      'rework_required',
      'reopened',
      'escalated',
    ];

    const getCount = (list, filterFn) => list.filter(filterFn).length;

    const filterCounts = {
      total: filtered.length,
      active: getCount(filtered, (i) => activeStatuses.includes(i.status)),
      pending: getCount(filtered, (i) => i.status === 'pending'),
      verified: getCount(filtered, (i) => i.status === 'verified'),
      assigned: getCount(filtered, (i) => i.status === 'assigned'),
      inProgress: getCount(filtered, (i) => i.status === 'in_progress'),
      pendingVerification: getCount(filtered, (i) => i.status === 'pending_uo_verification'),
      reworkRequired: getCount(filtered, (i) => i.status === 'rework_required'),
      reopened: getCount(filtered, (i) => i.status === 'reopened' || i.isReopened),
      escalated: getCount(
        filtered,
        (i) => i.status === 'escalated' || (i.escalation && !i.escalation.resolved)
      ),
      resolved: getCount(filtered, (i) => i.status === 'resolved'),
      closed: getCount(filtered, (i) => i.status === 'closed'),
      rejected: getCount(filtered, (i) => i.status === 'rejected'),
      overdue: getCount(filtered, (i) =>
        i.slaDeadline
          ? i.slaDeadline < now &&
            !['resolved', 'closed', 'rejected', 'withdrawn'].includes(i.status)
          : false
      ),
      dueSoon: getCount(filtered, (i) =>
        i.slaDeadline
          ? i.slaDeadline >= now &&
            i.slaDeadline - now < 48 * 60 * 60 * 1000 &&
            !['resolved', 'closed', 'rejected', 'withdrawn'].includes(i.status)
          : false
      ),
      unassigned: getCount(filtered, (i) => !i.assignedUnitOfficer && !i.assignedFieldOfficer),
    };

    // 3. Status
    if (args.status && args.status !== 'all') {
      filtered = filtered.filter((i) => i.status === args.status);
    }

    // 4. Category
    if (args.category && args.category !== 'all') {
      filtered = filtered.filter((i) => i.category === args.category);
    }

    // 5. Priority
    if (args.priority && args.priority !== 'all') {
      filtered = filtered.filter((i) => i.priority === args.priority);
    }

    // 6. Department
    if (args.department && args.department !== 'all') {
      filtered = filtered.filter((i) => i.department === args.department);
    }

    // 7. Assignment Status
    if (args.assignmentStatus && args.assignmentStatus !== 'all') {
      filtered = filtered.filter((i) => {
        const hasUO = !!i.assignedUnitOfficer;
        const hasFO = !!i.assignedFieldOfficer;
        if (args.assignmentStatus === 'fully_assigned') return hasUO && hasFO;
        if (args.assignmentStatus === 'unit_officer_only') return hasUO && !hasFO;
        if (args.assignmentStatus === 'field_officer_only') return !hasUO && hasFO;
        if (args.assignmentStatus === 'unassigned') return !hasUO && !hasFO;
        return true;
      });
    }

    // 8. SLA Status
    if (args.slaStatus && args.slaStatus !== 'all') {
      filtered = filtered.filter((i) => {
        const slaStatus = i.slaDeadline
          ? i.slaDeadline < now
            ? 'overdue'
            : i.slaDeadline - now < 48 * 60 * 60 * 1000
              ? 'due_soon'
              : 'on_track'
          : 'no_deadline';
        return slaStatus === args.slaStatus;
      });
    }

    // 9. Escalation Status
    if (args.escalationStatus && args.escalationStatus !== 'all') {
      filtered = filtered.filter((i) => {
        const isEscalated = !!i.escalatedToAdmin || (i.escalation && !i.escalation.resolved);
        if (args.escalationStatus === 'escalated') return isEscalated;
        if (args.escalationStatus === 'not_escalated') return !isEscalated;
        return true;
      });
    }

    // Sorting
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    filtered.sort((a, b) => {
      const aCreated = a.createdAt ?? a._creationTime ?? 0;
      const bCreated = b.createdAt ?? b._creationTime ?? 0;

      if (args.sortBy === 'oldest') {
        return aCreated - bCreated;
      }
      if (args.sortBy === 'priority_high') {
        const aP = priorityWeight[a.priority] ?? 0;
        const bP = priorityWeight[b.priority] ?? 0;
        return bP - aP;
      }
      if (args.sortBy === 'priority_low') {
        const aP = priorityWeight[a.priority] ?? 0;
        const bP = priorityWeight[b.priority] ?? 0;
        return aP - bP;
      }
      if (args.sortBy === 'sla_soon') {
        const aDl = a.slaDeadline ?? Infinity;
        const bDl = b.slaDeadline ?? Infinity;
        return aDl - bDl;
      }
      if (args.sortBy === 'sla_overdue') {
        const aOver = a.slaDeadline ? Math.max(0, now - a.slaDeadline) : 0;
        const bOver = b.slaDeadline ? Math.max(0, now - b.slaDeadline) : 0;
        return bOver - aOver;
      }
      if (args.sortBy === 'updated') {
        return (b.updatedAt ?? bCreated) - (a.updatedAt ?? aCreated);
      }
      return bCreated - aCreated; // default newest
    });

    // Pagination
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 20;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedIssues = filtered.slice(startIndex, startIndex + pageSize);

    const mappedIssues = [];
    for (const issue of paginatedIssues) {
      const citizenUser = userMap.get(String(issue.reportedBy));

      const uoUser = issue.assignedUnitOfficer
        ? userMap.get(String(issue.assignedUnitOfficer))
        : null;
      const uoProfile = issue.assignedUnitOfficer
        ? unitOfficerMap.get(String(issue.assignedUnitOfficer))
        : null;

      const foUser = issue.assignedFieldOfficer
        ? userMap.get(String(issue.assignedFieldOfficer))
        : null;
      const foProfile = issue.assignedFieldOfficer
        ? fieldOfficerMap.get(String(issue.assignedFieldOfficer))
        : null;

      // SLA calculations
      let calculatedSlaStatus = 'no_sla';
      let hoursRemaining = 0;
      let overdueHours = 0;
      if (issue.slaDeadline) {
        const diff = issue.slaDeadline - now;
        hoursRemaining = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
        overdueHours = Math.max(0, Math.floor(-diff / (1000 * 60 * 60)));

        if (issue.status === 'resolved' || issue.status === 'closed') {
          const completedAt = issue.resolvedAt ?? issue.closedAt ?? now;
          calculatedSlaStatus = completedAt <= issue.slaDeadline ? 'resolved_on_time' : 'breached';
        } else {
          if (issue.slaDeadline < now) {
            calculatedSlaStatus = 'breached';
          } else if (diff < 48 * 60 * 60 * 1000) {
            calculatedSlaStatus = 'at_risk';
          } else {
            calculatedSlaStatus = 'on_track';
          }
        }
      }

      const commentCount = 0;
      const evidenceCount = (issue.photos?.length || 0) + (issue.videos ? 1 : 0);

      mappedIssues.push({
        id: issue._id,
        code: issue.issueCode,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        subcategory: issue.subcategory ?? [],
        department: issue.department,
        status: issue.status,
        priority: issue.priority,
        address: issue.address,
        city: issue.city,
        state: issue.state,
        postal: issue.postal,
        latitude: issue.latitude,
        longitude: issue.longitude,
        createdAt: issue.createdAt ?? issue._creationTime,
        updatedAt: issue.updatedAt ?? issue.createdAt ?? issue._creationTime,

        citizen: {
          id: citizenUser?._id,
          name: citizenUser?.fullName || 'Anonymous',
          email: citizenUser?.email || '',
          phone: '',
        },

        assignedUnitOfficer: uoProfile
          ? {
              profileId: uoProfile._id,
              userId: uoProfile.userId,
              name: uoUser?.fullName || '',
              email: uoUser?.email || '',
              department: uoProfile.department,
            }
          : null,

        assignedFieldOfficer: foProfile
          ? {
              profileId: foProfile._id,
              userId: foProfile.userId,
              name: foUser?.fullName || '',
              email: foUser?.email || '',
              department: foProfile.department,
            }
          : null,

        sla: {
          deadline: issue.slaDeadline,
          originalDeadline: issue.slaDeadline,
          status: calculatedSlaStatus,
          hoursRemaining,
          overdueHours,
          extensionCount: issue.slaExtendedCount ?? 0,
        },

        escalation: {
          isEscalated: !!issue.escalatedToAdmin || (issue.escalation && !issue.escalation.resolved),
          category: issue.escalation?.category ?? '',
          reason: issue.escalation?.reason ?? '',
          escalatedAt: issue.escalation?.escalatedAt ?? 0,
          escalatedBy: issue.escalation?.escalatedBy ?? '',
        },

        duplicate: {
          isPotentialDuplicate: (issue.possibleDuplicateIds || []).length > 0,
          groupId: issue.duplicateGroupId ?? '',
          confidence: issue.duplicateConfidence ?? 0,
        },

        evidenceCount,
        commentCount,
        activityCount: 0,
      });
    }

    return {
      scope: {
        city,
        state,
      },
      issues: mappedIssues,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filterCounts,
    };
  },
});

export const getAssignmentCandidates = query({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    officerType: v.union(v.literal('unit_officer'), v.literal('field_officer')),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized');
    }

    if (args.officerType === 'unit_officer') {
      const officers = await ctx.db
        .query('unitOfficers')
        .withIndex('by_city', (q) => q.eq('city', city))
        .collect();

      const userIds = officers.map((o) => o.userId);
      const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
      const userMap = new Map(users.filter(Boolean).map((u) => [String(u._id), u]));

      const candidates = officers
        .map((o) => {
          const u = userMap.get(String(o.userId));
          const activeCount = (o.activeIssueIds || []).length;
          const workload = activeCount;
          const limit = 50;

          return {
            profileId: o._id,
            userId: o.userId,
            name: o.fullName || u?.fullName || '',
            email: o.email || u?.email || '',
            department: o.department,
            currentWorkload: workload,
            maximumCapacity: limit,
            availableCapacity: Math.max(0, limit - workload),
            activeIssueCount: activeCount,
            overdueIssueCount: 0,
            performanceScore: o.efficiencyScore || 80,
            isRecommended:
              normalizeDepartment(o.department) === normalizeDepartment(issue.category) &&
              workload < limit,
            recommendationReason:
              normalizeDepartment(o.department) === normalizeDepartment(issue.category)
                ? 'Compatible department and available capacity'
                : 'Available capacity',
            compatibilityWarnings:
              normalizeDepartment(o.department) !== normalizeDepartment(issue.category)
                ? ['Department mismatch']
                : [],
          };
        })
        .sort(
          (a, b) =>
            (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0) ||
            a.currentWorkload - b.currentWorkload
        );

      return {
        officerType: args.officerType,
        candidates,
      };
    } else {
      const officers = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_city', (q) => q.eq('city', city))
        .collect();

      const userIds = officers.map((o) => o.userId);
      const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
      const userMap = new Map(users.filter(Boolean).map((u) => [String(u._id), u]));

      const candidates = officers
        .map((o) => {
          const u = userMap.get(String(o.userId));
          const activeCount = o.currentActiveIssues || 0;
          const limit = o.maxIssueCapacity || 10;

          return {
            profileId: o._id,
            userId: o.userId,
            name: o.fullName || u?.fullName || '',
            email: o.email || u?.email || '',
            department: o.department,
            currentWorkload: activeCount,
            maximumCapacity: limit,
            availableCapacity: Math.max(0, limit - activeCount),
            activeIssueCount: activeCount,
            overdueIssueCount: 0,
            performanceScore: o.efficiencyScore || 80,
            isRecommended:
              normalizeDepartment(o.department) === normalizeDepartment(issue.category) &&
              activeCount < limit,
            recommendationReason:
              normalizeDepartment(o.department) === normalizeDepartment(issue.category)
                ? 'Compatible department and available capacity'
                : 'Available capacity',
            compatibilityWarnings:
              normalizeDepartment(o.department) !== normalizeDepartment(issue.category)
                ? ['Department mismatch']
                : [],
          };
        })
        .sort(
          (a, b) =>
            (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0) ||
            a.currentWorkload - b.currentWorkload
        );

      return {
        officerType: args.officerType,
        candidates,
      };
    }
  },
});

export const assignOrReassignUnitOfficer = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    newUnitOfficerId: v.id('unitOfficers'),
    reason: v.string(),
    clearIncompatibleFieldOfficer: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized');
    }

    const newOfficer = await ctx.db.get(args.newUnitOfficerId);
    if (!newOfficer || newOfficer.city !== city || !newOfficer.accountApproved) {
      throw new Error('Invalid or unapproved Unit Officer selected');
    }

    const previousUnitOfficerUserId = issue.assignedUnitOfficer;
    const now = Date.now();

    // Check compatibility of existing Field Officer if any
    if (issue.assignedFieldOfficer) {
      const foProfile = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer))
        .unique();

      if (
        foProfile &&
        foProfile.reportingUnitOfficerId &&
        String(foProfile.reportingUnitOfficerId) !== String(args.newUnitOfficerId)
      ) {
        if (!args.clearIncompatibleFieldOfficer) {
          return {
            success: false,
            code: 'INCOMPATIBLE_FIELD_OFFICER',
            message: `The current Field Officer (${foProfile.fullName}) reports to a different Unit Officer. Reassigning will require clearing or replacing the Field Officer.`,
          };
        } else {
          // Clear field officer workload
          const assignedList = (foProfile.assignedIssueIds || []).filter(
            (id) => String(id) !== String(issue._id)
          );
          await ctx.db.patch(foProfile._id, {
            assignedIssueIds: assignedList,
            currentActiveIssues: Math.max(0, (foProfile.currentActiveIssues || 0) - 1),
          });

          await ctx.db.patch(issue._id, {
            assignedFieldOfficer: null,
          });

          // Insert timeline note
          await ctx.db.insert('issueUpdates', {
            issueId: issue._id,
            status: issue.status,
            comment: `Field Officer (${foProfile.fullName}) assignment cleared due to Unit Officer reassignment incompatibility.`,
            updatedBy: args.cityAdminUserId,
            role: 'city_admin',
            attachments: [],
            scope: 'officer_and_citizen',
            createdAt: now,
          });

          // Notification to old Field Officer
          await ctx.db.insert('notifications', {
            userId: foProfile.userId,
            title: 'Issue Assignment Cleared',
            message: `Your assignment on issue ${issue.issueCode} was cleared due to Unit Officer reassignment.`,
            type: 'assigned',
            read: false,
            createdAt: now,
          });
        }
      }
    }

    // 1. Remove issue from previous Unit Officer's active list
    if (previousUnitOfficerUserId) {
      const prevOfficerProfile = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', previousUnitOfficerUserId))
        .unique();
      if (prevOfficerProfile) {
        const activeList = (prevOfficerProfile.activeIssueIds || []).filter(
          (id) => String(id) !== String(issue._id)
        );
        await ctx.db.patch(prevOfficerProfile._id, { activeIssueIds: activeList });
      }
    }

    // 2. Add issue to new Unit Officer's active list
    const newActiveList = Array.from(new Set([...(newOfficer.activeIssueIds || []), issue._id]));
    await ctx.db.patch(newOfficer._id, { activeIssueIds: newActiveList });

    // 3. Update issues fields
    const nextStatus =
      issue.status === 'pending' || issue.status === 'verified' ? 'assigned' : issue.status;
    await ctx.db.patch(issue._id, {
      assignedUnitOfficer: newOfficer.userId,
      status: nextStatus,
    });

    // 4. Create timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: issue._id,
      status: nextStatus,
      comment: `Unit Officer assigned by City Admin.\nNew Officer: ${newOfficer.fullName}\nReason: ${args.reason}`,
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // 5. Create audit log
    await ctx.db.insert('cityAdminAuditLogs', {
      action: 'assign_unit_officer',
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      city,
      affectedEntityType: 'issue',
      affectedEntityId: issue._id,
      issueCode: issue.issueCode,
      oldValue: previousUnitOfficerUserId ? String(previousUnitOfficerUserId) : 'Unassigned',
      newValue: String(newOfficer.userId),
      reason: args.reason,
      timestamp: now,
    });

    // 6. Create notifications
    if (previousUnitOfficerUserId) {
      await ctx.db.insert('notifications', {
        userId: previousUnitOfficerUserId,
        title: 'Issue Assignment Revoked',
        message: `The issue ${issue.issueCode} has been reassigned to another Unit Officer.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    await ctx.db.insert('notifications', {
      userId: newOfficer.userId,
      title: 'New Issue Assigned',
      message: `You have been assigned issue ${issue.issueCode}.`,
      type: 'assigned',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});

export const assignOrReassignFieldOfficer = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    newFieldOfficerId: v.id('fieldOfficers'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized');
    }

    const newOfficer = await ctx.db.get(args.newFieldOfficerId);
    if (!newOfficer || newOfficer.city !== city || !newOfficer.accountApproved) {
      throw new Error('Invalid or unapproved Field Officer selected');
    }

    const currentActive = newOfficer.currentActiveIssues || 0;
    const maxCapacity = newOfficer.maxIssueCapacity || 10;
    if (currentActive >= maxCapacity) {
      throw new Error('Officer has reached maximum active workload capacity');
    }

    const previousFieldOfficerUserId = issue.assignedFieldOfficer;
    const now = Date.now();

    // 1. Remove issue from previous Field Officer's active list
    if (previousFieldOfficerUserId) {
      const prevOfficerProfile = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', previousFieldOfficerUserId))
        .unique();
      if (prevOfficerProfile) {
        const assignedList = (prevOfficerProfile.assignedIssueIds || []).filter(
          (id) => String(id) !== String(issue._id)
        );
        await ctx.db.patch(prevOfficerProfile._id, {
          assignedIssueIds: assignedList,
          currentActiveIssues: Math.max(0, (prevOfficerProfile.currentActiveIssues || 0) - 1),
        });
      }
    }

    // 2. Add issue to new Field Officer's active list
    const newAssignedList = Array.from(
      new Set([...(newOfficer.assignedIssueIds || []), issue._id])
    );
    await ctx.db.patch(newOfficer._id, {
      assignedIssueIds: newAssignedList,
      currentActiveIssues: (newOfficer.currentActiveIssues || 0) + 1,
    });

    // 3. Update issue fields
    const nextStatus = issue.status === 'assigned' ? 'in_progress' : issue.status;
    await ctx.db.patch(issue._id, {
      assignedFieldOfficer: newOfficer.userId,
      status: nextStatus,
    });

    // 4. Create timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: issue._id,
      status: nextStatus,
      comment: `Field Officer assigned by City Admin.\nNew Officer: ${newOfficer.fullName}\nReason: ${args.reason}`,
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // 5. Create audit log
    await ctx.db.insert('cityAdminAuditLogs', {
      action: 'assign_field_officer',
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      city,
      affectedEntityType: 'issue',
      affectedEntityId: issue._id,
      issueCode: issue.issueCode,
      oldValue: previousFieldOfficerUserId ? String(previousFieldOfficerUserId) : 'Unassigned',
      newValue: String(newOfficer.userId),
      reason: args.reason,
      timestamp: now,
    });

    // 6. Create notifications
    if (previousFieldOfficerUserId) {
      await ctx.db.insert('notifications', {
        userId: previousFieldOfficerUserId,
        title: 'Issue Assignment Revoked',
        message: `The issue ${issue.issueCode} has been reassigned to another Field Officer.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    await ctx.db.insert('notifications', {
      userId: newOfficer.userId,
      title: 'New Issue Assigned',
      message: `You have been assigned issue ${issue.issueCode}.`,
      type: 'assigned',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});

const CATEGORY_TO_DEPARTMENT = {
  road: 'road',
  electricity: 'electricity',
  water: 'water',
  sanitation: 'sanitation',
  drainage: 'drainage',
  solid_waste: 'solid_waste',
  public_health: 'public_health',
  other: 'other',
};

export const changeIssueClassification = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    category: v.string(),
    subcategory: v.array(v.string()),
    reason: v.string(),
    clearIncompatibleOfficers: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized');
    }

    const normalizedCategory = normalizeDepartment(args.category);
    const expectedDepartment = CATEGORY_TO_DEPARTMENT[normalizedCategory];
    if (!expectedDepartment) {
      throw new Error('Invalid issue category.');
    }

    const now = Date.now();
    let uoCleared = false;
    let foCleared = false;

    // Check compatibility of current Unit Officer
    if (issue.assignedUnitOfficer) {
      const uoProfile = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedUnitOfficer))
        .unique();

      if (uoProfile && normalizeDepartment(uoProfile.department) !== expectedDepartment) {
        if (!args.clearIncompatibleOfficers) {
          return {
            success: false,
            code: 'INCOMPATIBLE_OFFICERS',
            message: `The current Unit Officer (${uoProfile.fullName}) works in a different department (${uoProfile.department}). Reclassifying requires clearing or replacing the assignments.`,
          };
        } else {
          // Clear unit officer active list
          const activeList = (uoProfile.activeIssueIds || []).filter(
            (id) => String(id) !== String(issue._id)
          );
          await ctx.db.patch(uoProfile._id, { activeIssueIds: activeList });
          uoCleared = true;
        }
      }
    }

    // Check compatibility of current Field Officer
    if (issue.assignedFieldOfficer) {
      const foProfile = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer))
        .unique();

      if (foProfile && normalizeDepartment(foProfile.department) !== expectedDepartment) {
        if (!args.clearIncompatibleOfficers) {
          return {
            success: false,
            code: 'INCOMPATIBLE_OFFICERS',
            message: `The current Field Officer (${foProfile.fullName}) works in a different department (${foProfile.department}). Reclassifying requires clearing or replacing the assignments.`,
          };
        } else {
          // Clear field officer active list
          const assignedList = (foProfile.assignedIssueIds || []).filter(
            (id) => String(id) !== String(issue._id)
          );
          await ctx.db.patch(foProfile._id, {
            assignedIssueIds: assignedList,
            currentActiveIssues: Math.max(0, (foProfile.currentActiveIssues || 0) - 1),
          });
          foCleared = true;
        }
      }
    }

    // Perform reclassification patch
    const updatePayload = {
      category: normalizedCategory,
      subcategory: args.subcategory,
      department: expectedDepartment,
    };
    if (uoCleared) updatePayload.assignedUnitOfficer = null;
    if (foCleared) updatePayload.assignedFieldOfficer = null;

    await ctx.db.patch(issue._id, updatePayload);

    // Timeline comment
    let comment = `Issue classification updated by City Admin.\nNew Category: ${normalizedCategory}\nNew Department: ${expectedDepartment}\nReason: ${args.reason}`;
    if (uoCleared || foCleared) {
      comment += `\nCleared incompatible assignments: ${uoCleared ? 'Unit Officer' : ''} ${foCleared ? 'Field Officer' : ''}`;
    }

    await ctx.db.insert('issueUpdates', {
      issueId: issue._id,
      status: issue.status,
      comment,
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Audit log
    await ctx.db.insert('cityAdminAuditLogs', {
      action: 'reclassify_issue',
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      city,
      affectedEntityType: 'issue',
      affectedEntityId: issue._id,
      issueCode: issue.issueCode,
      oldValue: `${issue.category} | ${issue.department}`,
      newValue: `${normalizedCategory} | ${expectedDepartment}`,
      reason: args.reason,
      timestamp: now,
    });

    return { success: true };
  },
});

export const updateIssuePriority = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    priority: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized');
    }

    if ((args.priority === 'high' || args.priority === 'critical') && !args.reason.trim()) {
      throw new Error('A reason is required when raising priority to High or Critical');
    }

    const now = Date.now();
    const oldPriority = issue.priority;

    await ctx.db.patch(issue._id, {
      priority: args.priority,
    });

    // Timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: issue._id,
      status: issue.status,
      comment: `Issue priority updated by City Admin from "${oldPriority}" to "${args.priority}".\nReason: ${args.reason}`,
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Audit log
    await ctx.db.insert('cityAdminAuditLogs', {
      action: 'update_priority',
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      city,
      affectedEntityType: 'issue',
      affectedEntityId: issue._id,
      issueCode: issue.issueCode,
      oldValue: oldPriority,
      newValue: args.priority,
      reason: args.reason,
      timestamp: now,
    });

    // Notifications
    const notifyUserIds = [issue.assignedUnitOfficer, issue.assignedFieldOfficer].filter(Boolean);
    for (const userId of notifyUserIds) {
      await ctx.db.insert('notifications', {
        userId,
        title: 'Issue Priority Changed',
        message: `Priority for issue ${issue.issueCode} was updated to ${args.priority.toUpperCase()}.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

export const overrideIssueStatus = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    newStatus: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized');
    }

    if (!args.reason.trim()) {
      throw new Error('A reason is required to perform status override');
    }

    const currentStatus = issue.status;
    const newStatus = args.newStatus;

    // Disallowed transitions
    if (currentStatus === 'withdrawn') {
      throw new Error('Withdrawn issues cannot be reactivated');
    }
    if (currentStatus === 'rejected' && newStatus === 'resolved') {
      throw new Error(
        'Rejected issues must be reopened or reactivated, not directly marked resolved'
      );
    }
    if (currentStatus === 'closed') {
      throw new Error('Closed issues cannot be returned to active state directly');
    }

    const now = Date.now();

    await ctx.db.patch(issue._id, {
      status: newStatus,
      resolvedAt: newStatus === 'resolved' ? now : issue.resolvedAt,
      closedAt: newStatus === 'closed' ? now : issue.closedAt,
    });

    // Timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: issue._id,
      status: newStatus,
      comment: `Status overridden by City Admin from "${currentStatus}" to "${newStatus}".\nReason: ${args.reason}`,
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Audit log
    await ctx.db.insert('cityAdminAuditLogs', {
      action: 'status_override',
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      city,
      affectedEntityType: 'issue',
      affectedEntityId: issue._id,
      issueCode: issue.issueCode,
      oldValue: currentStatus,
      newValue: newStatus,
      reason: args.reason,
      timestamp: now,
    });

    // Notifications
    const notifyUserIds = [
      issue.assignedUnitOfficer,
      issue.assignedFieldOfficer,
      issue.reportedBy,
    ].filter(Boolean);
    for (const userId of notifyUserIds) {
      await ctx.db.insert('notifications', {
        userId,
        title: 'Issue Status Overridden',
        message: `Status for issue ${issue.issueCode} was overridden to ${newStatus.replace(/_/g, ' ')}.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

export const escalateIssue = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    category: v.string(),
    priority: v.union(v.literal('medium'), v.literal('high'), v.literal('critical')),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized');
    }

    if (issue.escalatedToAdmin || (issue.escalation && !issue.escalation.resolved)) {
      throw new Error('Issue is already escalated');
    }

    const now = Date.now();

    await ctx.db.patch(issue._id, {
      escalatedToAdmin: true,
      status: 'escalated',
      escalation: {
        category: args.category,
        priority: args.priority,
        reason: args.reason,
        escalatedBy: args.cityAdminUserId,
        prevIssueStatus: issue.status,
        escalatedAt: now,
        resolved: false,
        adminReviewStatus: 'pending',
        escalationCount: (issue.escalation?.escalationCount || 0) + 1,
      },
    });

    // Timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: issue._id,
      status: 'escalated',
      comment: `Issue escalated by City Admin to Platform Administration.\nCategory: ${args.category}\nReason: ${args.reason}`,
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Audit log
    await ctx.db.insert('cityAdminAuditLogs', {
      action: 'escalate_issue',
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      city,
      affectedEntityType: 'issue',
      affectedEntityId: issue._id,
      issueCode: issue.issueCode,
      oldValue: issue.status,
      newValue: 'escalated',
      reason: args.reason,
      timestamp: now,
    });

    // Notifications
    const notifyUserIds = [issue.assignedUnitOfficer, issue.assignedFieldOfficer].filter(Boolean);
    for (const userId of notifyUserIds) {
      await ctx.db.insert('notifications', {
        userId,
        title: 'Issue Escalated',
        message: `Issue ${issue.issueCode} was escalated by City Administration.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

export const updateSlaDeadline = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    oldDeadline: v.number(),
    newDeadline: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized');
    }

    const now = Date.now();
    const oldDeadlineStr = args.oldDeadline ? new Date(args.oldDeadline).toISOString() : 'None';
    const newDeadlineStr = new Date(args.newDeadline).toISOString();

    await ctx.db.patch(issue._id, {
      slaDeadline: args.newDeadline,
      slaBreached: false,
      slaExtendedCount: (issue.slaExtendedCount || 0) + 1,
      lastSlaExtensionAt: now,
      slaExtension: {
        reason: args.reason,
        comment: '',
        extendedBy: args.cityAdminUserId,
        extendedAt: now,
        newSlaDeadline: args.newDeadline,
      },
    });

    // Resolution action record
    await ctx.db.insert('escalationResolutionActions', {
      issueId: issue._id,
      actionType: 'extend_sla',
      performedBy: args.cityAdminUserId,
      performedAt: now,
      oldValue: oldDeadlineStr,
      newValue: newDeadlineStr,
      notes: args.reason,
    });

    // Timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: issue._id,
      status: issue.status,
      comment: `SLA Deadline updated by City Admin.\nNew Deadline: ${new Date(args.newDeadline).toLocaleDateString()}\nReason: ${args.reason}`,
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Audit log
    await ctx.db.insert('cityAdminAuditLogs', {
      action: 'extend_sla',
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      city,
      affectedEntityType: 'issue',
      affectedEntityId: issue._id,
      issueCode: issue.issueCode,
      oldValue: args.oldDeadline ? String(args.oldDeadline) : 'None',
      newValue: String(args.newDeadline),
      reason: args.reason,
      timestamp: now,
    });

    // Notifications
    const notifyUserIds = [issue.assignedUnitOfficer, issue.assignedFieldOfficer].filter(Boolean);
    for (const userId of notifyUserIds) {
      await ctx.db.insert('notifications', {
        userId,
        title: 'Issue SLA Updated',
        message: `The SLA deadline for issue ${issue.issueCode} was updated.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

export const sendIssueMessage = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    recipientUserId: v.id('users'),
    messageText: v.string(),
  },
  handler: async (ctx, args) => {
    const { city, user: adminUser } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized');
    }

    const recipient = await ctx.db.get(args.recipientUserId);
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Verify recipient belongs to the same city
    if (recipient.role === 'unit_officer') {
      const uo = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', recipient._id))
        .unique();
      if (!uo || uo.city !== city) {
        throw new Error('Recipient does not belong to authorized city');
      }
    } else if (recipient.role === 'field_officer') {
      const fo = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', recipient._id))
        .unique();
      if (!fo || fo.city !== city) {
        throw new Error('Recipient does not belong to authorized city');
      }
    } else {
      throw new Error('Can only message officers in your city');
    }

    const now = Date.now();
    const messageContent = `[Issue Context: ${issue.issueCode} - ${issue.title} (Status: ${issue.status})]\n\n${args.messageText}`;

    // Find if conversation already exists between City Admin and Recipient
    const conversations = await ctx.db.query('conversations').collect();
    const existingConv = conversations.find(
      (c) =>
        c.participantIds.includes(args.cityAdminUserId) &&
        c.participantIds.includes(args.recipientUserId)
    );

    let conversationId;
    if (existingConv) {
      conversationId = existingConv._id;
      await ctx.db.insert('messages', {
        conversationId,
        fromId: args.cityAdminUserId,
        toId: args.recipientUserId,
        message: messageContent,
        createdAt: now,
        read: false,
        fromName: adminUser.fullName,
        fromRole: 'city_admin',
        issueIds: [args.issueId],
      });

      const unreadCountMap = existingConv.unreadCountMap || {};
      const updatedUnread = { ...unreadCountMap };
      updatedUnread[args.recipientUserId] = (updatedUnread[args.recipientUserId] || 0) + 1;

      await ctx.db.patch(conversationId, {
        lastMessage: messageContent,
        lastMessageTime: now,
        lastMessageSenderId: args.cityAdminUserId,
        unreadCountMap: updatedUnread,
        issueRef: {
          issueId: issue._id,
          issueTitle: issue.title,
          status: issue.status,
        },
      });
    } else {
      conversationId = await ctx.db.insert('conversations', {
        participantIds: [args.cityAdminUserId, args.recipientUserId],
        lastMessage: messageContent,
        lastMessageTime: now,
        lastMessageSenderId: args.cityAdminUserId,
        unreadCountMap: {
          [args.cityAdminUserId]: 0,
          [args.recipientUserId]: 1,
        },
        issueRef: {
          issueId: issue._id,
          issueTitle: issue.title,
          status: issue.status,
        },
      });

      await ctx.db.insert('messages', {
        conversationId,
        fromId: args.cityAdminUserId,
        toId: args.recipientUserId,
        message: messageContent,
        createdAt: now,
        read: false,
        fromName: adminUser.fullName,
        fromRole: 'city_admin',
        issueIds: [args.issueId],
      });
    }

    return { success: true, conversationId };
  },
});

export const bulkUpdateIssues = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueIds: v.array(v.id('issues')),
    actionType: v.union(
      v.literal('send_reminder'),
      v.literal('change_priority'),
      v.literal('assign_department')
    ),
    priority: v.optional(v.string()),
    department: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const now = Date.now();
    const successfulIssueIds = [];
    const skippedIssues = [];

    for (const issueId of args.issueIds) {
      const issue = await ctx.db.get(issueId);
      if (!issue) {
        skippedIssues.push({ issueId, reason: 'Issue not found' });
        continue;
      }
      if (issue.city !== city) {
        skippedIssues.push({ issueId, reason: 'Unauthorized: Issue belongs to another city' });
        continue;
      }

      if (args.actionType === 'send_reminder') {
        const uo = issue.assignedUnitOfficer;
        const fo = issue.assignedFieldOfficer;
        if (!uo && !fo) {
          skippedIssues.push({ issueId, reason: 'No officers assigned to this issue' });
          continue;
        }

        if (uo) {
          await ctx.db.insert('notifications', {
            userId: uo,
            title: 'Reminder: Pending Action Required',
            message: `Administrative reminder to review issue ${issue.issueCode}.`,
            type: 'assigned',
            read: false,
            createdAt: now,
          });
        }
        if (fo) {
          await ctx.db.insert('notifications', {
            userId: fo,
            title: 'Reminder: Pending Action Required',
            message: `Administrative reminder to review issue ${issue.issueCode}.`,
            type: 'assigned',
            read: false,
            createdAt: now,
          });
        }

        await ctx.db.insert('issueUpdates', {
          issueId: issue._id,
          status: issue.status,
          comment: `Reminder sent to assigned officers by City Admin.\nReason: ${args.reason}`,
          updatedBy: args.cityAdminUserId,
          role: 'city_admin',
          attachments: [],
          scope: 'officer_and_citizen',
          createdAt: now,
        });

        successfulIssueIds.push(issueId);
      } else if (args.actionType === 'change_priority') {
        if (!args.priority) {
          skippedIssues.push({ issueId, reason: 'Priority value is missing' });
          continue;
        }
        const oldPriority = issue.priority;
        await ctx.db.patch(issue._id, { priority: args.priority });

        await ctx.db.insert('issueUpdates', {
          issueId: issue._id,
          status: issue.status,
          comment: `Priority updated in bulk by City Admin from "${oldPriority}" to "${args.priority}".\nReason: ${args.reason}`,
          updatedBy: args.cityAdminUserId,
          role: 'city_admin',
          attachments: [],
          scope: 'officer_and_citizen',
          createdAt: now,
        });

        await ctx.db.insert('cityAdminAuditLogs', {
          action: 'bulk_change_priority',
          performedByUserId: args.cityAdminUserId,
          performerRole: 'city_admin',
          city,
          affectedEntityType: 'issue',
          affectedEntityId: issue._id,
          issueCode: issue.issueCode,
          oldValue: oldPriority,
          newValue: args.priority,
          reason: args.reason,
          timestamp: now,
        });

        successfulIssueIds.push(issueId);
      } else if (args.actionType === 'assign_department') {
        if (!args.department) {
          skippedIssues.push({ issueId, reason: 'Department value is missing' });
          continue;
        }
        const oldDept = issue.department || 'None';
        await ctx.db.patch(issue._id, { department: args.department });

        await ctx.db.insert('issueUpdates', {
          issueId: issue._id,
          status: issue.status,
          comment: `Department updated in bulk by City Admin from "${oldDept}" to "${args.department}".\nReason: ${args.reason}`,
          updatedBy: args.cityAdminUserId,
          role: 'city_admin',
          attachments: [],
          scope: 'officer_and_citizen',
          createdAt: now,
        });

        await ctx.db.insert('cityAdminAuditLogs', {
          action: 'bulk_assign_department',
          performedByUserId: args.cityAdminUserId,
          performerRole: 'city_admin',
          city,
          affectedEntityType: 'issue',
          affectedEntityId: issue._id,
          issueCode: issue.issueCode,
          oldValue: oldDept,
          newValue: args.department,
          reason: args.reason,
          timestamp: now,
        });

        successfulIssueIds.push(issueId);
      }
    }

    return {
      successfulIssueIds,
      skippedIssues,
    };
  },
});

export const migrateLegacyDepartments = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Migrate issues
    const issues = await ctx.db.query('issues').collect();
    let issuesMigrated = 0;
    for (const issue of issues) {
      const normalizedCategory = normalizeDepartment(issue.category);
      const expectedDepartment = CATEGORY_TO_DEPARTMENT[normalizedCategory] || normalizedCategory;

      if (issue.category !== normalizedCategory || issue.department !== expectedDepartment) {
        await ctx.db.patch(issue._id, {
          category: normalizedCategory,
          department: expectedDepartment,
        });
        issuesMigrated++;
      }
    }

    // 2. Migrate unitOfficers
    const unitOfficers = await ctx.db.query('unitOfficers').collect();
    let unitOfficersMigrated = 0;
    for (const officer of unitOfficers) {
      const normalizedDept = normalizeDepartment(officer.department);
      if (officer.department !== normalizedDept) {
        await ctx.db.patch(officer._id, {
          department: normalizedDept,
        });
        unitOfficersMigrated++;
      }
    }

    // 3. Migrate fieldOfficers
    const fieldOfficers = await ctx.db.query('fieldOfficers').collect();
    let fieldOfficersMigrated = 0;
    for (const officer of fieldOfficers) {
      const normalizedDept = normalizeDepartment(officer.department);
      if (officer.department !== normalizedDept) {
        await ctx.db.patch(officer._id, {
          department: normalizedDept,
        });
        fieldOfficersMigrated++;
      }
    }

    return {
      success: true,
      issuesMigrated,
      unitOfficersMigrated,
      fieldOfficersMigrated,
    };
  },
});

/**
 * Read-only City Issue Analytics Query
 * Returns city-wide analytics, connected-component duplicate groups, time trends, category/department breakdowns, and SLA health.
 */
export const getCityIssueAnalytics = query({
  args: {
    cityAdminUserId: v.id('users'),
    range: v.optional(
      v.union(
        v.literal('today'),
        v.literal('7d'),
        v.literal('30d'),
        v.literal('90d'),
        v.literal('all')
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.cityAdminUserId);
    if (!user || user.role !== 'city_admin') {
      throw new Error('Unauthorized. Only City Admins can access analytics.');
    }

    const cityAdmin = await ctx.db
      .query('cityAdmins')
      .withIndex('by_user', (q) => q.eq('userId', args.cityAdminUserId))
      .unique();

    if (!cityAdmin) {
      throw new Error('City Admin profile not found.');
    }

    const city = cityAdmin.city;
    const state = cityAdmin.state;
    const normalizedAdminCity = normalizeLocation(city);
    const normalizedAdminState = normalizeLocation(state);
    const now = Date.now();
    const selectedRange = args.range || 'all';
    const rangeStart = getRangeStart(selectedRange, now);

    // 1. Fetch all issues in database safely to prevent city-name casing/whitespace mismatch
    const allIssues = await ctx.db.query('issues').collect();

    const allCityIssues = allIssues.filter((issue) => {
      const cityMatches = normalizeLocation(issue.city) === normalizedAdminCity;
      const stateMatches =
        !normalizedAdminState ||
        !issue.state ||
        normalizeLocation(issue.state) === normalizedAdminState;
      return cityMatches && stateMatches;
    });

    // 2. Fetch explicitly referenced duplicate issues by ID (handles cross-city or missing reference edge cases)
    const referencedDuplicateIds = new Map();
    for (const issue of allCityIssues) {
      const issueId = getIssueId(issue);
      const dupIds = getPossibleDuplicateIds(issue);
      for (const duplicateId of dupIds) {
        const key = String(duplicateId);
        if (key && key !== issueId) {
          referencedDuplicateIds.set(key, duplicateId);
        }
      }
    }

    const existingCityIssueIds = new Set(
      allCityIssues.map((issue) => getIssueId(issue)).filter(Boolean)
    );
    const missingReferenceIds = [...referencedDuplicateIds.entries()]
      .filter(([key]) => !existingCityIssueIds.has(key))
      .map(([, id]) => id);

    const referencedIssues = await Promise.all(
      missingReferenceIds.map(async (id) => {
        try {
          return await ctx.db.get(id);
        } catch {
          return null;
        }
      })
    );

    const validReferencedIssues = referencedIssues.filter(
      (issue) =>
        issue &&
        normalizeLocation(issue.city) === normalizedAdminCity &&
        (!normalizedAdminState ||
          !issue.state ||
          normalizeLocation(issue.state) === normalizedAdminState)
    );

    const analyticsIssueMap = new Map();
    for (const issue of [...allCityIssues, ...validReferencedIssues]) {
      const id = getIssueId(issue);
      if (id) {
        analyticsIssueMap.set(id, issue);
      }
    }

    const duplicateSourceIssues = [...analyticsIssueMap.values()];

    // 3. Ranged issues for volume metrics
    const rangedIssues = allCityIssues.filter((i) => {
      if (rangeStart === null) return true;
      const created = getIssueCreatedAt(i) ?? now;
      return created >= rangeStart && created <= now;
    });

    const rangedIssueIdSet = new Set(rangedIssues.map((i) => getIssueId(i)).filter(Boolean));

    // 4. Connected Component Duplicate Groups (Dynamic Similarity + Persisted)
    const { pairs: calculatedPairs } = calculateDuplicatePairs(duplicateSourceIssues, {
      threshold: DUPLICATE_THRESHOLD,
    });

    const persistedPairs = buildPersistedDuplicatePairs(duplicateSourceIssues);
    const duplicatePairs = mergeDuplicatePairs(persistedPairs, calculatedPairs);

    const rawCalculatedGroups = buildCalculatedDuplicateGroups(
      duplicateSourceIssues,
      duplicatePairs
    );

    const enrichedAllGroups = rawCalculatedGroups.map((g, idx) =>
      enrichCalculatedDuplicateGroup(g, idx)
    );

    // Filter duplicate groups matching selected range (at least 1 member created in range)
    const matchingGroups = enrichedAllGroups.filter((group) => {
      if (rangeStart === null) return true;
      return group.members.some((member) => {
        const createdAt = member.createdAt;
        return createdAt !== null && createdAt >= rangeStart && createdAt <= now;
      });
    });

    // Canonical duplicate-linked set containing all unique member string IDs across matching groups
    const duplicateLinkedSet = new Set();
    for (const group of matchingGroups) {
      for (const member of group.members || []) {
        const memberId = getIssueId(member);
        if (memberId) {
          duplicateLinkedSet.add(memberId);
        }
      }
    }

    const duplicateLinkedInRangeSet = new Set();
    for (const issueId of duplicateLinkedSet) {
      if (rangedIssueIdSet.has(issueId)) {
        duplicateLinkedInRangeSet.add(issueId);
      }
    }

    const duplicateRate = safePercentage(duplicateLinkedInRangeSet.size, rangedIssues.length);
    const duplicateLinkedIssueCount = duplicateLinkedSet.size;
    const duplicateLinkedIssuesInRange = duplicateLinkedInRangeSet.size;
    const redundantIssueCount = matchingGroups.reduce(
      (sum, g) => sum + Math.max(0, Number(g.redundantIssueCount || 0)),
      0
    );
    const groupCount = matchingGroups.length;
    const averageGroupSize =
      groupCount > 0 ? Number((duplicateLinkedIssueCount / groupCount).toFixed(1)) : 0;
    const largestGroupSize = matchingGroups.reduce((max, g) => Math.max(max, g.memberCount), 0);

    const activeGroupCount = matchingGroups.filter((g) => g.activeMemberCount > 0).length;
    const resolvedGroupCount = matchingGroups.filter((g) => g.activeMemberCount === 0).length;

    // 2. City Overview Metrics
    const totalCityIssues = allCityIssues.length;
    const issuesCreatedInRange = rangedIssues.length;
    const currentActiveIssues = allCityIssues.filter(
      (i) => !TERMINAL_STATUSES.has(i.status)
    ).length;

    const resolvedInRange = rangedIssues.filter(
      (i) => i.status === 'resolved' || i.status === 'closed'
    );
    const resolutionRate = safePercentage(resolvedInRange.length, issuesCreatedInRange);

    const resolutionDurations = resolvedInRange
      .map((i) => {
        const created = getIssueCreatedAt(i) ?? 0;
        const resolved = i.resolvedAt ?? i.closedAt ?? i.updatedAt ?? 0;
        if (created > 0 && resolved >= created) {
          return (resolved - created) / (1000 * 60 * 60);
        }
        return null;
      })
      .filter((h) => h !== null);

    const averageResolutionHours =
      resolutionDurations.length > 0
        ? Number(
            (resolutionDurations.reduce((a, b) => a + b, 0) / resolutionDurations.length).toFixed(1)
          )
        : 0;
    const medianResolutionHours = calculateMedian(resolutionDurations);

    const currentSlaBreaches = allCityIssues.filter(
      (i) => !TERMINAL_STATUSES.has(i.status) && (i.slaBreached || i.sla?.status === 'breached')
    ).length;
    const currentEscalations = allCityIssues.filter(
      (i) =>
        !TERMINAL_STATUSES.has(i.status) &&
        (i.escalatedToAdmin || i.is_escalated || i.escalation?.isEscalated)
    ).length;
    const reopenedIssues = rangedIssues.filter((i) => i.isReopened || i.reopenCount > 0).length;
    const unassignedIssues = allCityIssues.filter(
      (i) => !TERMINAL_STATUSES.has(i.status) && !i.assignedUnitOfficer && !i.assignedFieldOfficer
    ).length;

    const ratedIssues = rangedIssues.filter(
      (i) => typeof i.citizenRating === 'number' && i.citizenRating >= 1 && i.citizenRating <= 5
    );
    const ratedIssueCount = ratedIssues.length;
    const averageCitizenRating =
      ratedIssueCount > 0
        ? Number(
            (ratedIssues.reduce((sum, i) => sum + i.citizenRating, 0) / ratedIssueCount).toFixed(1)
          )
        : 0;

    // 3. Time Series Trends
    const trends = buildTimeBuckets(rangedIssues, selectedRange, now, {
      duplicateLinkedIssueIds: duplicateLinkedSet,
    });

    // 4. Status Analytics
    const statusCounts = {};
    allCityIssues.forEach((i) => {
      const st = i.status || 'unknown';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    // 5. Category Analytics
    const categoryMap = new Map();
    rangedIssues.forEach((i) => {
      const cat = i.category || 'other';
      const issueId = getIssueId(i);
      const isDupLinked = issueId ? duplicateLinkedSet.has(issueId) : false;

      const existing = categoryMap.get(cat) || {
        category: cat,
        totalIssues: 0,
        activeIssues: 0,
        resolvedIssues: 0,
        duplicateLinkedIssues: 0,
        escalatedIssues: 0,
        slaBreachedIssues: 0,
        reopenedIssues: 0,
        resHours: [],
        ratings: [],
      };

      existing.totalIssues++;
      if (!TERMINAL_STATUSES.has(i.status)) existing.activeIssues++;
      if (i.status === 'resolved' || i.status === 'closed') existing.resolvedIssues++;
      if (isDupLinked) existing.duplicateLinkedIssues++;
      if (i.escalatedToAdmin || i.is_escalated || i.escalation?.isEscalated)
        existing.escalatedIssues++;
      if (i.slaBreached || i.sla?.status === 'breached') existing.slaBreachedIssues++;
      if (i.isReopened || i.reopenCount > 0) existing.reopenedIssues++;

      const created = getIssueCreatedAt(i) ?? 0;
      const resolved = i.resolvedAt ?? i.closedAt ?? null;
      if (resolved && created && resolved >= created) {
        existing.resHours.push((resolved - created) / (1000 * 60 * 60));
      }
      if (typeof i.citizenRating === 'number' && i.citizenRating > 0) {
        existing.ratings.push(i.citizenRating);
      }

      categoryMap.set(cat, existing);
    });

    const categoryAnalytics = Array.from(categoryMap.values())
      .map((c) => ({
        category: c.category,
        totalIssues: c.totalIssues,
        activeIssues: c.activeIssues,
        resolvedIssues: c.resolvedIssues,
        duplicateLinkedIssues: c.duplicateLinkedIssues,
        duplicateRate: safePercentage(c.duplicateLinkedIssues, c.totalIssues),
        escalatedIssues: c.escalatedIssues,
        slaBreachedIssues: c.slaBreachedIssues,
        reopenedIssues: c.reopenedIssues,
        averageResolutionHours:
          c.resHours.length > 0
            ? Number((c.resHours.reduce((a, b) => a + b, 0) / c.resHours.length).toFixed(1))
            : 0,
        averageCitizenRating:
          c.ratings.length > 0
            ? Number((c.ratings.reduce((a, b) => a + b, 0) / c.ratings.length).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.totalIssues - a.totalIssues);

    // 6. Department Analytics
    const deptMap = new Map();
    rangedIssues.forEach((i) => {
      const dept = i.department || i.category || 'unassigned';
      const issueId = getIssueId(i);
      const isDupLinked = issueId ? duplicateLinkedSet.has(issueId) : false;

      const existing = deptMap.get(dept) || {
        department: dept,
        totalIssues: 0,
        activeIssues: 0,
        resolvedIssues: 0,
        duplicateLinkedIssues: 0,
        escalatedIssues: 0,
        slaBreachedIssues: 0,
        unassignedUnitOfficerCount: 0,
        unassignedFieldOfficerCount: 0,
        resHours: [],
      };

      existing.totalIssues++;
      if (!TERMINAL_STATUSES.has(i.status)) existing.activeIssues++;
      if (i.status === 'resolved' || i.status === 'closed') existing.resolvedIssues++;
      if (isDupLinked) existing.duplicateLinkedIssues++;
      if (i.escalatedToAdmin || i.is_escalated || i.escalation?.isEscalated)
        existing.escalatedIssues++;
      if (i.slaBreached || i.sla?.status === 'breached') existing.slaBreachedIssues++;
      if (!i.assignedUnitOfficer) existing.unassignedUnitOfficerCount++;
      if (!i.assignedFieldOfficer) existing.unassignedFieldOfficerCount++;

      const created = getIssueCreatedAt(i) ?? 0;
      const resolved = i.resolvedAt ?? i.closedAt ?? null;
      if (resolved && created && resolved >= created) {
        existing.resHours.push((resolved - created) / (1000 * 60 * 60));
      }

      deptMap.set(dept, existing);
    });

    const departmentAnalytics = Array.from(deptMap.values())
      .map((d) => ({
        department: d.department,
        totalIssues: d.totalIssues,
        activeIssues: d.activeIssues,
        resolvedIssues: d.resolvedIssues,
        duplicateLinkedIssues: d.duplicateLinkedIssues,
        escalatedIssues: d.escalatedIssues,
        slaBreachedIssues: d.slaBreachedIssues,
        unassignedUnitOfficerCount: d.unassignedUnitOfficerCount,
        unassignedFieldOfficerCount: d.unassignedFieldOfficerCount,
        averageResolutionHours:
          d.resHours.length > 0
            ? Number((d.resHours.reduce((a, b) => a + b, 0) / d.resHours.length).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.totalIssues - a.totalIssues);

    // 7. Priority Analytics
    const priorityMap = new Map();
    rangedIssues.forEach((i) => {
      const prio = i.priority || 'medium';
      const issueId = getIssueId(i);
      const isDupLinked = issueId ? duplicateLinkedSet.has(issueId) : false;

      const existing = priorityMap.get(prio) || {
        priority: prio,
        totalIssues: 0,
        activeIssues: 0,
        resolvedIssues: 0,
        duplicateLinkedIssues: 0,
        slaBreachedIssues: 0,
        escalatedIssues: 0,
      };

      existing.totalIssues++;
      if (!TERMINAL_STATUSES.has(i.status)) existing.activeIssues++;
      if (i.status === 'resolved' || i.status === 'closed') existing.resolvedIssues++;
      if (isDupLinked) existing.duplicateLinkedIssues++;
      if (i.slaBreached || i.sla?.status === 'breached') existing.slaBreachedIssues++;
      if (i.escalatedToAdmin || i.is_escalated || i.escalation?.isEscalated)
        existing.escalatedIssues++;

      priorityMap.set(prio, existing);
    });

    const priorityAnalytics = Array.from(priorityMap.values()).map((p) => ({
      priority: p.priority,
      totalIssues: p.totalIssues,
      activeIssues: p.activeIssues,
      duplicateLinkedIssues: p.duplicateLinkedIssues,
      slaBreachedIssues: p.slaBreachedIssues,
      escalatedIssues: p.escalatedIssues,
      resolutionRate: safePercentage(p.resolvedIssues, p.totalIssues),
    }));

    // 8. Previous Period Comparison
    let comparison = null;
    const prevBounds = getPreviousRangeBounds(selectedRange, now);
    if (prevBounds) {
      const prevIssues = allCityIssues.filter((i) => {
        const created = i.createdAt ?? i._creationTime ?? 0;
        return created >= prevBounds.start && created <= prevBounds.end;
      });

      const prevCount = prevIssues.length;
      const currentCount = rangedIssues.length;
      const issueVolumeChangePercent =
        prevCount > 0 ? safePercentage(currentCount - prevCount, prevCount) : 0;

      const prevDupLinked = prevIssues.filter(
        (i) => Array.isArray(i.possibleDuplicateIds) && i.possibleDuplicateIds.length > 0
      ).length;
      const prevDupRate = safePercentage(prevDupLinked, prevCount);
      const duplicateRateChangePoints = Number((duplicateRate - prevDupRate).toFixed(1));

      const prevResolved = prevIssues.filter(
        (i) => i.status === 'resolved' || i.status === 'closed'
      ).length;
      const prevResRate = safePercentage(prevResolved, prevCount);
      const resolutionRateChangePoints = Number((resolutionRate - prevResRate).toFixed(1));

      const prevBreached = prevIssues.filter(
        (i) => i.slaBreached || i.sla?.status === 'breached'
      ).length;
      const slaBreachChangePercent =
        prevBreached > 0 ? safePercentage(currentSlaBreaches - prevBreached, prevBreached) : 0;

      const prevEscalated = prevIssues.filter(
        (i) => i.escalatedToAdmin || i.is_escalated || i.escalation?.isEscalated
      ).length;
      const escalationChangePercent =
        prevEscalated > 0 ? safePercentage(currentEscalations - prevEscalated, prevEscalated) : 0;

      comparison = {
        previousStart: prevBounds.start,
        previousEnd: prevBounds.end,
        issueVolumeChangePercent,
        duplicateRateChangePoints,
        resolutionRateChangePoints,
        slaBreachChangePercent,
        escalationChangePercent,
      };
    }

    return {
      scope: {
        city,
        state,
      },
      range: {
        selected: selectedRange,
        label:
          selectedRange === 'today'
            ? 'Today'
            : selectedRange === '7d'
              ? 'Last 7 Days'
              : selectedRange === '30d'
                ? 'Last 30 Days'
                : selectedRange === '90d'
                  ? 'Last 90 Days'
                  : 'All Time',
        startAt: rangeStart,
        endAt: now,
        bucketType: trends.bucketType,
      },
      overview: {
        totalCityIssues,
        issuesCreatedInRange,
        currentActiveIssues,
        resolvedInRange: resolvedInRange.length,
        resolutionRate,
        averageResolutionHours,
        medianResolutionHours,
        currentSlaBreaches,
        currentEscalations,
        reopenedIssues,
        unassignedIssues,
        averageCitizenRating,
        ratedIssueCount,
      },
      duplicateAnalytics: {
        groupCount,
        duplicateLinkedIssueCount,
        duplicateLinkedIssuesInRange,
        redundantIssueCount,
        duplicateRate,
        averageGroupSize,
        largestGroupSize,
        activeGroupCount,
        resolvedGroupCount,
        persistedPairCount: persistedPairs.length,
        calculatedPairCount: calculatedPairs.length,
        groups: matchingGroups,
      },
      trends,
      statusAnalytics: {
        distribution: statusCounts,
      },
      categoryAnalytics,
      departmentAnalytics,
      priorityAnalytics,
      comparison,
    };
  },
});

/**
 * Query for City Admin Department Performance & Officers Analytics Dashboard
 */
export const getCityDepartmentPerformance = query({
  args: {
    cityAdminUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    // 1. Resolve City Admin user & profile
    let cityAdmin = null;

    if (args.cityAdminUserId) {
      cityAdmin = await ctx.db
        .query('cityAdmins')
        .withIndex('by_user', (q) => q.eq('userId', args.cityAdminUserId))
        .first();
    }

    if (!cityAdmin) {
      cityAdmin = await ctx.db.query('cityAdmins').first();
    }

    if (!cityAdmin) {
      return {
        scope: { cityAdminId: null, city: 'City-Wide', state: '' },
        summary: {
          totalDepartments: 0,
          totalIssues: 0,
          activeIssues: 0,
          resolvedIssues: 0,
          closedIssues: 0,
          overallSlaComplianceRate: 100,
          totalUnitOfficers: 0,
          totalFieldOfficers: 0,
        },
        departments: [],
      };
    }

    const city = cityAdmin.city;
    const state = cityAdmin.state;
    const now = Date.now();

    // 2. Fetch issues and officers in city
    const allCityIssues = await ctx.db
      .query('issues')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();

    const unitOfficers = await ctx.db
      .query('unitOfficers')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();

    const fieldOfficers = await ctx.db
      .query('fieldOfficers')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();

    // Fetch user names for officer resolution
    const userIds = [
      ...new Set([
        ...unitOfficers.map((u) => u.userId),
        ...fieldOfficers.map((f) => f.userId),
        ...allCityIssues.map((i) => i.assignedUnitOfficer).filter(Boolean),
        ...allCityIssues.map((i) => i.assignedFieldOfficer).filter(Boolean),
      ]),
    ];

    const userMap = new Map();
    for (const uid of userIds) {
      const u = await ctx.db.get(uid);
      if (u) userMap.set(String(uid), u);
    }

    // Canonical Department Definitions
    const CANONICAL_DEPTS = [
      { key: 'road', label: 'Road & Infrastructure' },
      { key: 'electricity', label: 'Electricity & Lighting' },
      { key: 'water', label: 'Water Supply' },
      { key: 'sanitation', label: 'Public Sanitation' },
      { key: 'drainage', label: 'Drainage & Sewerage' },
      { key: 'solid_waste', label: 'Solid Waste Management' },
      { key: 'public_health', label: 'Public Health' },
      { key: 'other', label: 'Other Civic Maintenance' },
    ];

    const normalizeDeptKey = (deptStr = '') => {
      const cleaned = String(deptStr)
        .toLowerCase()
        .trim()
        .replace(/[\s\-\/]+/g, '_');
      if (cleaned.includes('road') || cleaned.includes('infrastruct')) return 'road';
      if (cleaned.includes('electr') || cleaned.includes('power')) return 'electricity';
      if (cleaned.includes('water') || cleaned.includes('sewag')) return 'water';
      if (cleaned.includes('sanitat')) return 'sanitation';
      if (cleaned.includes('drain')) return 'drainage';
      if (cleaned.includes('solid') || cleaned.includes('garbage')) return 'solid_waste';
      if (cleaned.includes('health') || cleaned.includes('hygien')) return 'public_health';
      return 'other';
    };

    const activeStatuses = new Set([
      'pending',
      'verified',
      'assigned',
      'in_progress',
      'pending_uo_verification',
      'rework_required',
      'reopened',
      'escalated',
    ]);

    let globalTotalIssues = 0;
    let globalActiveIssues = 0;
    let globalResolvedIssues = 0;
    let globalClosedIssues = 0;
    let globalOverdueIssues = 0;

    const departmentResults = CANONICAL_DEPTS.map(({ key, label }) => {
      const deptIssues = allCityIssues.filter(
        (i) => normalizeDeptKey(i.department || i.category) === key
      );
      const deptUos = unitOfficers.filter((u) => normalizeDeptKey(u.department) === key);
      const deptFos = fieldOfficers.filter((f) => normalizeDeptKey(f.department) === key);

      let activeCount = 0;
      let resolvedCount = 0;
      let closedCount = 0;
      let rejectedCount = 0;
      let overdueCount = 0;
      let totalResolutionMs = 0;
      let resolvedWithTimeCount = 0;

      const statusBreakdown = {
        pending: 0,
        verified: 0,
        assigned: 0,
        in_progress: 0,
        pending_uo_verification: 0,
        rework_required: 0,
        reopened: 0,
        escalated: 0,
        resolved: 0,
        closed: 0,
        rejected: 0,
      };

      const priorityBreakdown = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      deptIssues.forEach((i) => {
        const st = String(i.status || '').toLowerCase();
        const prio = String(i.priority || '').toLowerCase();
        const created = i.createdAt ?? i._creationTime ?? now;

        if (statusBreakdown[st] !== undefined) {
          statusBreakdown[st]++;
        } else if (st) {
          statusBreakdown.pending++;
        }

        if (priorityBreakdown[prio] !== undefined) {
          priorityBreakdown[prio]++;
        } else if (prio) {
          priorityBreakdown.medium++;
        }

        if (activeStatuses.has(st)) {
          activeCount++;
          if (i.slaBreached || (i.slaDeadline && i.slaDeadline < now)) {
            overdueCount++;
          }
        } else if (st === 'resolved') {
          resolvedCount++;
          if (i.resolvedAt && i.resolvedAt > created) {
            totalResolutionMs += i.resolvedAt - created;
            resolvedWithTimeCount++;
          }
        } else if (st === 'closed') {
          closedCount++;
          if (i.closedAt && i.closedAt > created) {
            totalResolutionMs += i.closedAt - created;
            resolvedWithTimeCount++;
          }
        } else if (st === 'rejected') {
          rejectedCount++;
        }
      });

      const totalDeptIssues = deptIssues.length;
      const completedDeptIssues = resolvedCount + closedCount;

      globalTotalIssues += totalDeptIssues;
      globalActiveIssues += activeCount;
      globalResolvedIssues += resolvedCount;
      globalClosedIssues += closedCount;
      globalOverdueIssues += overdueCount;

      const resolutionRate =
        totalDeptIssues > 0 ? Math.round((completedDeptIssues / totalDeptIssues) * 100) : 0;

      const slaComplianceRate =
        totalDeptIssues > 0
          ? Math.max(0, Math.round(((totalDeptIssues - overdueCount) / totalDeptIssues) * 100))
          : 100;

      const avgResolutionHours =
        resolvedWithTimeCount > 0
          ? Math.round(totalResolutionMs / (1000 * 60 * 60 * resolvedWithTimeCount))
          : 0;

      const avgResolutionDays = Math.round((avgResolutionHours / 24) * 10) / 10;

      const foEfficiencies = deptFos.map(
        (f) => f.efficiencyScore ?? (f.rating ? f.rating * 20 : 85)
      );
      const averageFieldOfficerEfficiency =
        foEfficiencies.length > 0
          ? Math.round(foEfficiencies.reduce((a, b) => a + b, 0) / foEfficiencies.length)
          : 85;

      const enrichedUos = deptUos.map((u) => {
        const usr = userMap.get(String(u.userId));
        return {
          ...u,
          fullName: u.fullName || usr?.fullName || 'Unit Officer',
          email: u.email || usr?.email || '',
          activeIssueCount: Array.isArray(u.activeIssueIds) ? u.activeIssueIds.length : 0,
          resolvedIssueCount: Array.isArray(u.resolvedIssueIds) ? u.resolvedIssueIds.length : 0,
        };
      });

      const enrichedFos = deptFos.map((f) => {
        const usr = userMap.get(String(f.userId));
        return {
          ...f,
          fullName: f.fullName || usr?.fullName || 'Field Officer',
          email: f.email || usr?.email || '',
          activeIssueCount:
            f.currentActiveIssues ??
            (Array.isArray(f.assignedIssueIds) ? f.assignedIssueIds.length : 0),
          resolvedIssueCount:
            f.totalResolvedIssues ??
            (Array.isArray(f.completedIssueIds) ? f.completedIssueIds.length : 0),
        };
      });

      const enrichedIssues = deptIssues.map((i) => {
        const uoUser = userMap.get(String(i.assignedUnitOfficer));
        const foUser = userMap.get(String(i.assignedFieldOfficer));

        return {
          _id: i._id,
          issueCode: i.issueCode,
          title: i.title,
          description: i.description,
          category: i.category,
          department: i.department || i.category,
          status: i.status,
          priority: i.priority,
          address: i.address,
          city: i.city,
          state: i.state,
          createdAt: i.createdAt ?? i._creationTime,
          slaDeadline: i.slaDeadline,
          slaBreached: i.slaBreached || (i.slaDeadline ? i.slaDeadline < now : false),
          assignedUnitOfficer: uoUser?.fullName || 'Unassigned',
          assignedFieldOfficer: foUser?.fullName || 'Unassigned',
        };
      });

      return {
        department: key,
        label,
        metrics: {
          totalIssues: totalDeptIssues,
          activeIssues: activeCount,
          resolvedIssues: resolvedCount,
          closedIssues: closedCount,
          rejectedIssues: rejectedCount,
          overdueIssues: overdueCount,
          resolutionRate,
          slaComplianceRate,
          avgResolutionHours,
          avgResolutionDays,
          unitOfficerCount: deptUos.length,
          fieldOfficerCount: deptFos.length,
          averageFieldOfficerEfficiency,
        },
        statusBreakdown,
        priorityBreakdown,
        unitOfficers: enrichedUos,
        fieldOfficers: enrichedFos,
        issues: enrichedIssues,
      };
    });

    const overallSlaComplianceRate =
      globalTotalIssues > 0
        ? Math.max(
            0,
            Math.round(((globalTotalIssues - globalOverdueIssues) / globalTotalIssues) * 100)
          )
        : 100;

    return {
      scope: {
        cityAdminId: cityAdmin._id,
        city: cityAdmin.city,
        state: cityAdmin.state,
      },
      summary: {
        totalDepartments: CANONICAL_DEPTS.length,
        totalIssues: globalTotalIssues,
        activeIssues: globalActiveIssues,
        resolvedIssues: globalResolvedIssues,
        closedIssues: globalClosedIssues,
        overallSlaComplianceRate,
        totalUnitOfficers: unitOfficers.length,
        totalFieldOfficers: fieldOfficers.length,
      },
      departments: departmentResults,
    };
  },
});

/**
 * Query detailed issue information for City Admin Dashboard Modal
 */
export const getCityIssueDetails = query({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);

    const issue = await ctx.db.get(args.issueId);
    if (!issue) return null;

    // Verify issue belongs to the City Admin's assigned city
    if (normalizeLocation(issue.city) !== normalizeLocation(city)) {
      return null;
    }

    const now = Date.now();

    // 1. Fetch Reporter details
    let citizen = null;
    if (issue.reportedBy) {
      const citizenUser = await ctx.db.get(issue.reportedBy);
      const citizenProfile = await ctx.db
        .query('citizens')
        .withIndex('by_user', (q) => q.eq('userId', issue.reportedBy))
        .first();

      if (citizenUser || citizenProfile) {
        citizen = {
          id: citizenUser?._id,
          name: citizenProfile?.fullName || citizenUser?.fullName || 'Anonymous Citizen',
          fullName: citizenProfile?.fullName || citizenUser?.fullName || 'Anonymous Citizen',
          email: citizenUser?.email || citizenProfile?.email || '',
          phone: citizenProfile?.phone || '',
          points: citizenProfile?.points ?? 0,
          levelTitle: citizenProfile?.levelTitle || 'Civic Starter',
          reportsSubmitted: citizenProfile?.reportsSubmitted ?? 0,
        };
      }
    }

    // 2. Fetch Assigned Unit Officer details
    let assignedUnitOfficer = null;
    if (issue.assignedUnitOfficer) {
      const uoUser = await ctx.db.get(issue.assignedUnitOfficer);
      const uoProfile = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedUnitOfficer))
        .first();

      if (uoUser || uoProfile) {
        assignedUnitOfficer = {
          profileId: uoProfile?._id ?? null,
          userId: uoUser?._id ?? uoProfile?.userId,
          name: uoProfile?.fullName || uoUser?.fullName || 'Unit Officer',
          fullName: uoProfile?.fullName || uoUser?.fullName || 'Unit Officer',
          email: uoUser?.email || uoProfile?.email || '',
          phone: uoProfile?.phone || '',
          department: uoProfile?.department || issue.department || issue.category,
          city: uoProfile?.city || issue.city,
          rating: uoProfile?.rating ?? 0,
          efficiencyScore: uoProfile?.efficiencyScore ?? 0,
        };
      }
    }

    // 3. Fetch Assigned Field Officer details
    let assignedFieldOfficer = null;
    if (issue.assignedFieldOfficer) {
      const foUser = await ctx.db.get(issue.assignedFieldOfficer);
      const foProfile = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer))
        .first();

      if (foUser || foProfile) {
        assignedFieldOfficer = {
          profileId: foProfile?._id ?? null,
          userId: foUser?._id ?? foProfile?.userId,
          name: foProfile?.fullName || foUser?.fullName || 'Field Officer',
          fullName: foProfile?.fullName || foUser?.fullName || 'Field Officer',
          email: foUser?.email || foProfile?.email || '',
          phone: foProfile?.phone || '',
          department: foProfile?.department || issue.department || issue.category,
          city: foProfile?.city || issue.city,
          rating: foProfile?.rating ?? 0,
          efficiencyScore: foProfile?.efficiencyScore ?? 0,
        };
      }
    }

    // 4. Fetch Issue Updates / Timeline
    const rawUpdates = await ctx.db
      .query('issueUpdates')
      .withIndex('by_issue', (q) => q.eq('issueId', args.issueId))
      .collect();

    const updates = await Promise.all(
      rawUpdates.map(async (u) => {
        let updaterName = 'System';
        if (u.updatedBy) {
          const updaterUser = await ctx.db.get(u.updatedBy);
          if (updaterUser) updaterName = updaterUser.fullName;
        }
        return {
          id: u._id,
          status: u.status,
          comment: u.comment,
          role: u.role,
          updatedByName: updaterName,
          attachments: u.attachments || [],
          createdAt: u.createdAt ?? u._creationTime,
        };
      })
    );

    // 5. Fetch Audit Logs for this issue
    const rawAuditLogs = await ctx.db
      .query('auditLogs')
      .withIndex('by_issue', (q) => q.eq('issueId', args.issueId))
      .collect();

    const auditLogs = await Promise.all(
      rawAuditLogs.map(async (a) => {
        let actorName = 'System';
        if (a.performedByUserId) {
          const actorUser = await ctx.db.get(a.performedByUserId);
          if (actorUser) actorName = actorUser.fullName;
        }
        return {
          id: a._id,
          action: a.action,
          actionCategory: a.actionCategory,
          performedByRole: a.performerRole,
          performedByName: actorName,
          oldValue: a.oldValue,
          newValue: a.newValue,
          reason: a.reason,
          timestamp: a.timestamp,
        };
      })
    );

    // 6. SLA State calculations
    let slaStatus = 'no_sla';
    let hoursRemaining = 0;
    let overdueHours = 0;
    if (issue.slaDeadline) {
      const diff = issue.slaDeadline - now;
      hoursRemaining = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
      overdueHours = Math.max(0, Math.floor(-diff / (1000 * 60 * 60)));

      if (issue.status === 'resolved' || issue.status === 'closed') {
        const completedAt = issue.resolvedAt ?? issue.closedAt ?? now;
        slaStatus = completedAt <= issue.slaDeadline ? 'resolved_on_time' : 'breached';
      } else {
        if (issue.slaDeadline < now) {
          slaStatus = 'breached';
        } else if (diff < 48 * 60 * 60 * 1000) {
          slaStatus = 'at_risk';
        } else {
          slaStatus = 'on_track';
        }
      }
    }

    return {
      _id: issue._id,
      id: issue._id,
      issueCode: issue.issueCode,
      code: issue.issueCode,
      ticket_id: issue.issueCode,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      subcategory: Array.isArray(issue.subcategory)
        ? issue.subcategory
        : issue.subcategory
          ? [issue.subcategory]
          : [],
      department: issue.department || issue.category,
      status: issue.status,
      priority: issue.priority,
      severity: issue.priority,
      address: issue.address,
      location: issue.address,
      city: issue.city,
      state: issue.state,
      postal: issue.postal,
      latitude: issue.latitude,
      longitude: issue.longitude,
      createdAt: issue.createdAt ?? issue._creationTime,
      created_at: issue.createdAt ?? issue._creationTime,
      updatedAt: issue.updatedAt ?? issue.createdAt ?? issue._creationTime,
      updated_at: issue.updatedAt ?? issue.createdAt ?? issue._creationTime,
      resolvedAt: issue.resolvedAt,
      closedAt: issue.closedAt,

      citizen,
      unitOfficerDetails: assignedUnitOfficer,
      assignedUnitOfficer,
      assignedUnitOfficerDetails: assignedUnitOfficer,
      fieldOfficerDetails: assignedFieldOfficer,
      assignedFieldOfficer,
      assignedFieldOfficerDetails: assignedFieldOfficer,

      sla: {
        deadline: issue.slaDeadline,
        status: slaStatus,
        hoursRemaining,
        overdueHours,
        extensionCount: issue.slaExtendedCount ?? 0,
      },
      slaDeadline: issue.slaDeadline,
      slaStatus,
      slaBreached: issue.slaBreached || (issue.slaDeadline ? issue.slaDeadline < now : false),

      escalatedToAdmin: issue.escalatedToAdmin || false,
      is_escalated: issue.escalatedToAdmin || Boolean(issue.escalation),
      escalation: issue.escalation || null,

      rejection: issue.rejection || null,
      rejectionReason: issue.rejectionReason || null,

      images: issue.photos || issue.images || [],
      photos: issue.photos || issue.images || [],
      attachments: issue.attachments || [],
      beforePhotos: issue.beforePhotos || [],
      afterPhotos: issue.afterPhotos || [],
      resolutionImages: issue.resolutionImages || [],

      updates,
      auditLogs,
    };
  },
});