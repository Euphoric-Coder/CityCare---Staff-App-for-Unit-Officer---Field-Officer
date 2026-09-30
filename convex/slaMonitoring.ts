// @ts-nocheck
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireCityAdmin } from '../lib/cityAdminAuth';
import { auditIssueAction } from '../lib/auditLogger';

const TERMINAL_ISSUE_STATUSES = new Set(['resolved', 'closed', 'rejected', 'withdrawn']);

function normalizeStatus(status: any) {
  return String(status || '')
    .trim()
    .toLowerCase();
}

function isActiveIssue(issue: any) {
  return !TERMINAL_ISSUE_STATUSES.has(normalizeStatus(issue.status));
}

function getTimestamp(value: any) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const timestamp = typeof value === 'number' ? value : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * Centralized SLA state helper for backend queries, table filters, and KPI cards.
 */
function getSlaState(issue: any, now = Date.now()) {
  if (!isActiveIssue(issue)) {
    return {
      status: 'completed',
      deadline: getTimestamp(issue.slaDeadline ?? issue.sla?.deadline),
      hoursRemaining: 0,
      overdueHours: 0,
    };
  }

  const deadline = getTimestamp(issue.slaDeadline ?? issue.sla?.deadline);

  if (deadline === null) {
    return {
      status: 'no_deadline',
      deadline: null,
      hoursRemaining: null,
      overdueHours: 0,
    };
  }

  const difference = deadline - now;
  const hoursRemaining = Math.ceil(difference / (1000 * 60 * 60));

  if (difference < 0) {
    return {
      status: 'breached',
      deadline,
      hoursRemaining,
      overdueHours: Math.ceil(Math.abs(difference) / (1000 * 60 * 60)),
    };
  }

  if (difference <= 24 * 60 * 60 * 1000) {
    return {
      status: 'due_soon',
      deadline,
      hoursRemaining,
      overdueHours: 0,
    };
  }

  if (difference <= 48 * 60 * 60 * 1000) {
    return {
      status: 'at_risk',
      deadline,
      hoursRemaining,
      overdueHours: 0,
    };
  }

  return {
    status: 'on_track',
    deadline,
    hoursRemaining,
    overdueHours: 0,
  };
}

function hasNonEmptyValue(value: any) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

/**
 * Centralized Escalation state helper with strict validation.
 */
function getEscalationState(issue: any) {
  const nested =
    issue?.escalation && typeof issue.escalation === 'object' ? issue.escalation : null;

  if (!nested) {
    return {
      hasHistory: false,
      isEscalated: false,
      isActive: false,
      resolved: false,
      reviewStatus: null,
    };
  }

  const reviewStatus = String(nested.adminReviewStatus || '')
    .trim()
    .toLowerCase();

  const terminalReviewStatuses = new Set(['resolved', 'rejected', 'dismissed']);

  const resolved =
    nested.resolved === true || (reviewStatus !== '' && terminalReviewStatuses.has(reviewStatus));

  const hasHistory = Boolean(nested.escalatedAt) || Number(nested.escalationCount ?? 0) > 0;

  const currentlyQueued = issue.escalatedToAdmin === true;

  const isActive = currentlyQueued && !resolved;

  return {
    hasHistory,
    isEscalated: currentlyQueued,
    isActive,
    resolved,
    reviewStatus: hasHistory ? reviewStatus || 'pending' : null,
  };
}

/**
 * Scoped SLA Monitoring Data Query for City Admin.
 */
export const getScopedSLAMonitoringData = query({
  args: {
    cityAdminUserId: v.id('users'),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(v.string()),
    slaStatus: v.optional(v.string()),
    escalationStatus: v.optional(v.string()),
    assignmentStatus: v.optional(v.string()),
    dateRange: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { city, state } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const now = Date.now();

    // 1. Fetch raw issues in this city using index
    const issuesList = await ctx.db
      .query('issues')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();

    // 2. Fetch escalation resolution action history
    const allActions = await ctx.db.query('escalationResolutionActions').collect();
    const actionsByIssue = new Map();
    allActions.forEach((a: any) => {
      const list = actionsByIssue.get(String(a.issueId)) || [];
      list.push(a);
      actionsByIssue.set(String(a.issueId), list);
    });

    // 3. User mapping
    const userIds = new Set();
    issuesList.forEach((i: any) => {
      if (i.reportedBy) userIds.add(i.reportedBy);
      if (i.assignedUnitOfficer) userIds.add(i.assignedUnitOfficer);
      if (i.assignedFieldOfficer) userIds.add(i.assignedFieldOfficer);
    });
    const users = await Promise.all(Array.from(userIds).map((id: any) => ctx.db.get(id)));
    const userMap = new Map(users.filter(Boolean).map((u: any) => [String(u._id), u]));

    // 4. Officer profiles for department & workload
    const allUos = await ctx.db
      .query('unitOfficers')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();
    const allFos = await ctx.db
      .query('fieldOfficers')
      .withIndex('by_city', (q) => q.eq('city', city))
      .collect();

    const uoProfileMapByUserId = new Map(allUos.map((p: any) => [String(p.userId), p]));
    const foProfileMapByUserId = new Map(allFos.map((p: any) => [String(p.userId), p]));

    // 5. Normalise list into standard issue shape
    const normalisedIssues = await Promise.all(
      issuesList.map(async (issue: any) => {
        const uoUser = userMap.get(String(issue.assignedUnitOfficer));
        const foUser = userMap.get(String(issue.assignedFieldOfficer));
        const uoProfile = uoProfileMapByUserId.get(String(issue.assignedUnitOfficer));
        const foProfile = foProfileMapByUserId.get(String(issue.assignedFieldOfficer));

        const slaState = getSlaState(issue, now);
        const escalationState = getEscalationState(issue);

        const rawActions = actionsByIssue.get(String(issue._id)) || [];
        const enrichedActions = await Promise.all(
          rawActions.map(async (a: any) => {
            const perf = await ctx.db.get(a.performedBy);
            return {
              id: a._id,
              issueId: a.issueId,
              type: a.actionType,
              performed_by: perf?.fullName ?? 'Administrator',
              performedByRole: perf?.role ?? 'admin',
              performed_at: a.performedAt,
              old_value: a.oldValue,
              new_value: a.newValue,
              notes: a.notes,
            };
          })
        );
        enrichedActions.sort((x: any, y: any) => x.performed_at - y.performed_at);

        const subcategoryList = Array.isArray(issue.subcategory)
          ? issue.subcategory
          : issue.subcategory
            ? [issue.subcategory]
            : [];

        const assignedUnitOfficer =
          uoProfile || uoUser
            ? {
                id: uoUser?._id || uoProfile?.userId,
                profileId: uoProfile?._id,
                userId: uoUser?._id || uoProfile?.userId,
                name: uoProfile?.fullName || uoUser?.fullName || 'Unit Officer',
                email: uoUser?.email || uoProfile?.email || null,
                department: uoProfile?.department || issue.category,
              }
            : null;

        const assignedFieldOfficer =
          foProfile || foUser
            ? {
                id: foUser?._id || foProfile?.userId,
                profileId: foProfile?._id,
                userId: foUser?._id || foProfile?.userId,
                name: foProfile?.fullName || foUser?.fullName || 'Field Officer',
                email: foUser?.email || foProfile?.email || null,
                department: foProfile?.department || issue.category,
              }
            : null;

        const ESCALATION_ACTION_TYPES = new Set([
          'escalate',
          'issue_escalated',
          'review_escalation',
          'extend_sla',
          'reassign_unit_officer',
          'reassign_field_officer',
          'reassign_officer',
          'change_classification',
          'change_category',
          'update_priority',
          'request_corrective_action',
          'approve_escalation',
          'reject_escalation',
          'resolve_escalation',
          'dismiss_escalation',
        ]);

        const escalationActions = enrichedActions.filter((action) =>
          ESCALATION_ACTION_TYPES.has(
            String(action.type ?? action.actionType ?? '')
              .trim()
              .toLowerCase()
          )
        );
        const hasEscalationActions = escalationActions.length > 0;
        const escHasHistory = escalationState.hasHistory || hasEscalationActions;
        const finalIsEscalated = escHasHistory;

        const escAt = finalIsEscalated
          ? getTimestamp(issue.escalatedAt ?? issue.escalationAt ?? issue.escalation?.escalatedAt)
          : null;

        const escCategory = finalIsEscalated
          ? (issue.escalationCategory ?? issue.escalation?.category ?? null)
          : null;

        const escPriority = finalIsEscalated
          ? (issue.escalationPriority ?? issue.escalation?.priority ?? null)
          : null;

        const escReason = finalIsEscalated
          ? (issue.escalationReason ?? issue.escalation?.reason ?? null)
          : null;

        const escComments = finalIsEscalated
          ? (issue.escalationComments ?? issue.escalation?.comments ?? null)
          : null;

        const storedEscalationCount = Number(
          issue.escalationCount ?? issue.escalation?.escalationCount ?? 0
        );
        const escCount = finalIsEscalated ? Math.max(storedEscalationCount, 1) : 0;

        const escBy = finalIsEscalated
          ? (issue.escalatedBy ?? issue.escalation?.escalatedBy ?? null)
          : null;

        const escReviewedAt = finalIsEscalated
          ? getTimestamp(issue.escalationReviewedAt ?? issue.escalation?.reviewedAt)
          : null;

        const escReviewedBy = finalIsEscalated
          ? (issue.escalationReviewedBy ?? issue.escalation?.reviewedBy ?? null)
          : null;

        const escResolved = finalIsEscalated ? escalationState.resolved : false;
        const escResolvedAt = finalIsEscalated
          ? getTimestamp(issue.escalationResolvedAt ?? issue.escalation?.resolvedAt)
          : null;

        const escResolutionNotes = finalIsEscalated
          ? (issue.escalationResolutionNotes ??
            issue.escalation?.resolutionNote ??
            issue.escalation?.resolutionNotes ??
            null)
          : null;

        if (!finalIsEscalated && (escAt !== null || escCount > 0 || escalationActions.length > 0)) {
          console.warn('[SLA escalation normalization inconsistency]', {
            issueId: String(issue._id),
            issueCode: issue.issueCode,
            isEscalated: finalIsEscalated,
            escalatedAt: escAt,
            escalationCount: escCount,
            actionCount: escalationActions.length,
          });
        }

        return {
          id: issue._id,
          code: issue.issueCode,
          ticket_id: issue.issueCode,
          title: issue.title,
          description: issue.description,
          category: issue.category,
          subcategory: subcategoryList,
          department: issue.department || issue.category,
          status: issue.status,
          priority: issue.priority,
          severity: issue.priority,
          address: issue.address,
          city: issue.city,
          state: issue.state,
          createdAt: issue.createdAt ?? issue._creationTime,
          updatedAt: issue.updatedAt,

          assignedUnitOfficer,
          assignedFieldOfficer,
          assigned_officer: assignedUnitOfficer,
          field_officer: assignedFieldOfficer,

          sla: {
            originalDeadline: issue.originalSlaDeadline || issue.slaDeadline,
            deadline: issue.slaDeadline,
            status: slaState.status,
            hoursRemaining: slaState.hoursRemaining,
            overdueHours: slaState.overdueHours,
            extensionCount: issue.slaExtensionCount ?? issue.slaExtendedCount ?? 0,
            extensionHistory: issue.slaExtensionHistory ?? [],
          },
          sla_deadline: issue.slaDeadline,
          sla_status: slaState.status,
          hours_remaining: slaState.hoursRemaining,
          overdue_hours: slaState.overdueHours,

          escalation: {
            hasHistory: escHasHistory,
            isEscalated: escalationState.isActive,
            isActive: escalationState.isActive,
            status: escalationState.reviewStatus,
            category: escHasHistory ? escCategory : null,
            priority: escHasHistory ? escPriority : null,
            reason: escHasHistory ? escReason : null,
            comments: escHasHistory ? escComments : null,
            escalatedAt: escHasHistory ? escAt : null,
            escalatedBy: escHasHistory ? escBy : null,
            reviewedAt: escHasHistory ? escReviewedAt : null,
            reviewedBy: escHasHistory ? escReviewedBy : null,
            resolved: escResolved,
            resolvedAt: escHasHistory ? escResolvedAt : null,
            resolutionNotes: escHasHistory ? escResolutionNotes : null,
            resolutionActions: escHasHistory ? escalationActions : [],
            count: escHasHistory ? escCount : 0,
          },
          is_escalated: escalationState.isActive,
          escalation_category: escHasHistory ? escCategory : null,
          escalation_priority: escHasHistory ? escPriority : null,
          escalation_reason: escHasHistory ? escReason : null,
          escalation_comments: escHasHistory ? escComments : null,
          escalated_at: escHasHistory ? escAt : null,
          escalation_admin_review_status: escalationState.reviewStatus,
          escalation_resolved: escResolved,
          escalation_resolved_at: escResolvedAt,
          escalation_resolution_notes: escResolutionNotes,
          escalation_resolution_actions: finalIsEscalated ? escalationActions : [],
          escalation_count: escCount,
        };
      })
    );

    // 6. Calculate summary metrics across full city dataset
    const scopedIssues = normalisedIssues;
    const totalIssues = scopedIssues.length;
    const activeIssuesList = scopedIssues.filter(isActiveIssue);
    const activeIssues = activeIssuesList.length;

    const monitoredIssuesList = scopedIssues.filter(
      (issue: any) =>
        isActiveIssue(issue) && getTimestamp(issue.slaDeadline ?? issue.sla?.deadline) !== null
    );
    const monitoredIssues = monitoredIssuesList.length;

    const slaStates = scopedIssues.map((issue: any) => ({
      issue,
      state: getSlaState(issue, now),
    }));

    const breachedCount = slaStates.filter(({ state }: any) => state.status === 'breached').length;
    const dueSoonCount = slaStates.filter(({ state }: any) => state.status === 'due_soon').length;
    const atRiskCount = slaStates.filter(({ state }: any) => state.status === 'at_risk').length;
    const onTrackCount = slaStates.filter(({ state }: any) => state.status === 'on_track').length;
    const noDeadlineCount = slaStates.filter(
      ({ state }: any) => state.status === 'no_deadline'
    ).length;
    const completedCount = slaStates.filter(
      ({ state }: any) => state.status === 'completed'
    ).length;

    const activeMonitoredCount = breachedCount + dueSoonCount + atRiskCount + onTrackCount;
    const compliantActiveCount = dueSoonCount + atRiskCount + onTrackCount;

    const complianceRate =
      activeMonitoredCount > 0
        ? Number(((compliantActiveCount / activeMonitoredCount) * 100).toFixed(1))
        : null;

    const escalationStates = scopedIssues.map((issue: any) => getEscalationState(issue));

    const escalatedCount = escalationStates.filter((state: any) => state.isEscalated).length;
    const activeEscalationCount = escalationStates.filter((state: any) => state.isActive).length;
    const pendingReviewCount = escalationStates.filter(
      (state) => state.isActive && state.reviewStatus === 'pending'
    ).length;
    const reviewedEscalationCount = escalationStates.filter(
      (state) =>
        state.isEscalated &&
        ['reviewed', 'action_required', 'approved', 'dismissed'].includes(state.reviewStatus)
    ).length;
    const resolvedEscalationCount = escalationStates.filter((state: any) => state.resolved).length;

    const criticalEscalations = scopedIssues.filter((i: any) => {
      const state = getEscalationState(i);
      return state.isActive && i.priority === 'critical';
    }).length;

    const unassignedIssues = activeIssuesList.filter(
      (i: any) => !i.assignedUnitOfficer && !i.assignedFieldOfficer
    ).length;

    const resolvedIssues = normalisedIssues.filter(
      (i: any) => TERMINAL_ISSUE_STATUSES.has(i.status) && i.sla.deadline
    );
    const totalResolutionMs = resolvedIssues.reduce(
      (sum: number, i: any) => sum + Math.max(0, (i.updatedAt || now) - i.createdAt),
      0
    );
    const averageResolutionHours =
      resolvedIssues.length > 0
        ? Math.round(totalResolutionMs / (1000 * 60 * 60) / resolvedIssues.length)
        : 0;

    const reviewedEscalationItems = normalisedIssues.filter(
      (i: any) => i.escalation.reviewedAt && i.escalation.escalatedAt
    );
    const totalAckMs = reviewedEscalationItems.reduce(
      (sum: number, i: any) =>
        sum + Math.max(0, i.escalation.reviewedAt - i.escalation.escalatedAt),
      0
    );
    const averageAcknowledgementHours =
      reviewedEscalationItems.length > 0
        ? Math.round(totalAckMs / (1000 * 60 * 60) / reviewedEscalationItems.length)
        : 0;

    // 7. Escalation Analytics
    const categoryCounts: any = {};
    const deptCounts: any = {};
    const priorityCounts: any = {};
    normalisedIssues.forEach((i: any) => {
      if (i.escalation.isEscalated) {
        const cat = i.escalation.category || i.category || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        const dept = i.department || i.category || 'other';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;

        const prio = i.priority || 'medium';
        priorityCounts[prio] = (priorityCounts[prio] || 0) + 1;
      }
    });

    const byCategory = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));
    const byDepartment = Object.entries(deptCounts).map(([department, count]) => ({
      department,
      count,
    }));
    const byPriority = Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count,
    }));

    const activeMonitoredItems = normalisedIssues.filter(
      (i) => !TERMINAL_ISSUE_STATUSES.has(normalizeStatus(i.status))
    );

    const mostDelayed = activeMonitoredItems
      .filter((i: any) => i.sla.status === 'breached')
      .sort((a: any, b: any) => (b.sla.overdueHours || 0) - (a.sla.overdueHours || 0))
      .slice(0, 5);

    const unresolvedCritical = activeMonitoredItems
      .filter(
        (i: any) =>
          i.priority === 'critical' &&
          (i.sla.status === 'breached' || i.sla.status === 'due_soon' || i.escalation.isEscalated)
      )
      .slice(0, 5);

    const repeatedEscalations = activeMonitoredItems
      .filter((i: any) => (i.escalation.count || 0) > 1)
      .slice(0, 5);

    // 8. Apply Filtering
    let filtered = normalisedIssues;

    if (args.search) {
      const q = args.search.toLowerCase().trim();
      filtered = filtered.filter(
        (i: any) =>
          i.code.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          (i.address || '').toLowerCase().includes(q) ||
          (i.department || '').toLowerCase().includes(q) ||
          (i.assignedUnitOfficer?.name || '').toLowerCase().includes(q) ||
          (i.assignedFieldOfficer?.name || '').toLowerCase().includes(q) ||
          (i.escalation?.reason || '').toLowerCase().includes(q)
      );
    }

    if (args.status && args.status !== 'all') {
      filtered = filtered.filter((i: any) => i.status === args.status);
    }

    if (args.category && args.category !== 'all') {
      filtered = filtered.filter((i: any) => i.category === args.category);
    }

    if (args.priority && args.priority !== 'all') {
      filtered = filtered.filter((i: any) => i.priority === args.priority);
    }

    if (args.slaStatus && args.slaStatus !== 'all') {
      filtered = filtered.filter((i: any) => i.sla.status === args.slaStatus);
    }

    if (args.escalationStatus && args.escalationStatus !== 'all') {
      filtered = filtered.filter((i: any) => {
        if (args.escalationStatus === 'escalated') {
          return i.escalation.isEscalated === true;
        }
        if (args.escalationStatus === 'pending') {
          return (
            i.escalation.isEscalated === true &&
            i.escalation.resolved !== true &&
            i.escalation.status === 'pending'
          );
        }
        if (args.escalationStatus === 'reviewed') {
          return i.escalation.isEscalated === true && i.escalation.status === 'reviewed';
        }
        if (args.escalationStatus === 'resolved') {
          return i.escalation.isEscalated === true && i.escalation.resolved === true;
        }
        return true;
      });
    }

    if (args.assignmentStatus && args.assignmentStatus !== 'all') {
      filtered = filtered.filter((i: any) => {
        if (args.assignmentStatus === 'fully_assigned')
          return Boolean(i.assignedUnitOfficer && i.assignedFieldOfficer);
        if (args.assignmentStatus === 'partially_assigned')
          return Boolean(
            (i.assignedUnitOfficer && !i.assignedFieldOfficer) ||
            (!i.assignedUnitOfficer && i.assignedFieldOfficer)
          );
        if (args.assignmentStatus === 'unassigned')
          return !i.assignedUnitOfficer && !i.assignedFieldOfficer;
        return true;
      });
    }

    if (args.dateRange && args.dateRange !== 'all') {
      const periodMs =
        args.dateRange === '24h'
          ? 24 * 60 * 60 * 1000
          : args.dateRange === '7d'
            ? 7 * 24 * 60 * 60 * 1000
            : args.dateRange === '30d'
              ? 30 * 24 * 60 * 60 * 1000
              : 0;
      if (periodMs > 0) {
        filtered = filtered.filter((i: any) => i.createdAt >= now - periodMs);
      }
    }

    // 9. Sorting
    const sortBy = args.sortBy || 'newest';
    filtered.sort((a: any, b: any) => {
      if (sortBy === 'oldest') {
        return a.createdAt - b.createdAt;
      }
      if (sortBy === 'sla_urgency') {
        const deadlineA = a.sla.deadline || Infinity;
        const deadlineB = b.sla.deadline || Infinity;
        return deadlineA - deadlineB;
      }
      if (sortBy === 'escalated_at') {
        return (b.escalation.escalatedAt || 0) - (a.escalation.escalatedAt || 0);
      }
      if (sortBy === 'updated') {
        return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
      }
      return b.createdAt - a.createdAt;
    });

    // 10. Pagination
    const page = args.page || 1;
    const pageSize = args.pageSize || 10;
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const cityInfo = {
      city,
      state,
    };

    const metrics = {
      totalIssues,
      activeIssues,
      monitoredIssues,

      complianceRate,

      breachedCount,
      atRiskCount,
      dueSoonCount,
      onTrackCount,
      noDeadlineCount,

      escalatedCount: activeEscalationCount,
      activeEscalationCount,
      pendingReviewCount,
      reviewedEscalationCount,
      resolvedEscalationCount,

      slaStatusDistribution: {
        breached: breachedCount,
        at_risk: atRiskCount,
        due_soon: dueSoonCount,
        on_track: onTrackCount,
        no_deadline: noDeadlineCount,
        completed: completedCount,
      },
    };

    const summary = {
      ...metrics,
      breached: breachedCount,
      atRisk: atRiskCount,
      dueSoon: dueSoonCount,
      onTrack: onTrackCount,
      noDeadline: noDeadlineCount,

      escalated: activeEscalationCount,
      pendingAdminReview: pendingReviewCount,

      reviewedEscalations: reviewedEscalationCount,
      resolvedEscalations: resolvedEscalationCount,

      criticalEscalations,
      unassignedIssues,
      averageResolutionHours,
      averageAcknowledgementHours,

      slaStatusDistribution: {
        breached: breachedCount,
        at_risk: atRiskCount,
        due_soon: dueSoonCount,
        on_track: onTrackCount,
        no_deadline: noDeadlineCount,
        completed: completedCount,
      },
    };

    return {
      cityInfo,
      scope: {
        mode: 'city',
        city,
        state,
      },
      metrics,
      summary,
      issues: paginated,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      escalationAnalytics: {
        byCategory,
        byDepartment,
        byPriority,
        mostDelayed,
        unresolvedCritical,
        repeatedEscalations,
      },
    };
  },
});

/**
 * Acknowledge Escalation Mutation (Formally marks escalation as reviewed by City Admin)
 */
export const reviewEscalation = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized for this city');
    }

    const now = Date.now();

    await ctx.db.patch(args.issueId, {
      escalation: {
        ...(issue.escalation || {}),
        adminReviewStatus: 'reviewed',
      },
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'review_escalation',
      performedBy: args.cityAdminUserId,
      performedAt: now,
      notes: 'Escalation formally acknowledged and under review by City Admin.',
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: 'Escalation review formally initiated by City Admin.',
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    await ctx.db.insert('cityAdminAuditLogs', {
      action: 'Escalation Acknowledged',
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      city,
      affectedEntityType: 'issue_escalation',
      affectedEntityId: issue._id,
      issueCode: issue.issueCode,
      oldValue: 'pending',
      newValue: 'reviewed',
      reason: 'Formally acknowledged escalation',
      timestamp: now,
    });

    // Universal Audit Log
    await auditIssueAction(ctx, {
      issue,
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      action: 'review_escalation',
      actionCategory: 'escalation',
      oldValue: {
        adminReviewStatus: 'pending',
      },
      newValue: {
        adminReviewStatus: 'reviewed',
      },
      description: 'City Admin started handling the escalation.',
      source: 'web',
    });

    const notifyUsers = [issue.assignedUnitOfficer, issue.assignedFieldOfficer].filter(Boolean);
    for (const userId of notifyUsers) {
      await ctx.db.insert('notifications', {
        userId,
        issueId: args.issueId,
        title: 'Escalation Acknowledged',
        message: `The escalation for issue ${issue.issueCode} was formally acknowledged by City Admin.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Request Corrective Action Mutation
 * Sends corrective instructions to the currently assigned Unit Officer and Field Officer.
 * Communication-only action: does not patch issue/escalation status, does not create an escalation resolution action,
 * and does not send citizen/public notifications.
 */
export const requestCorrectiveAction = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    actionRequest: v.string(),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized for this city');
    }

    const actionRequest = args.actionRequest.trim();
    if (!actionRequest) {
      throw new Error('Corrective action instructions are required.');
    }

    const officerRecipientIds = [issue.assignedUnitOfficer, issue.assignedFieldOfficer].filter(
      Boolean
    );

    const uniqueOfficerRecipientIds = officerRecipientIds.filter(
      (id: any, index: number, array: any[]) =>
        array.findIndex((candidate) => String(candidate) === String(id)) === index
    );

    if (uniqueOfficerRecipientIds.length === 0) {
      throw new Error(
        'No assigned officers are available to receive the corrective action request.'
      );
    }

    const now = Date.now();

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: `Corrective action requested by City Admin: ${actionRequest}`,
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer',
      createdAt: now,
    });

    for (const officerUserId of uniqueOfficerRecipientIds) {
      await ctx.db.insert('notifications', {
        userId: String(officerUserId),
        issueId: args.issueId,
        title: `Corrective Action Required - ${issue.issueCode || issue.title}`,
        message: actionRequest,
        type: 'corrective_action_requested',
        read: false,
        createdAt: now,
      });
    }

    // Universal Audit Log
    await auditIssueAction(ctx, {
      issue,
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      action: 'request_corrective_action',
      actionCategory: 'escalation',
      oldValue: undefined,
      newValue: {
        instruction: actionRequest,
      },
      reason: actionRequest,
      description: 'City Admin requested corrective action from assigned officers.',
      source: 'web',
    });

    return {
      success: true,
      notifiedOfficerCount: uniqueOfficerRecipientIds.length,
    };
  },
});

/**
 * Approve Escalation Resolution Mutation
 * Resolves the administrative escalation. The civic issue retains its current operational status.
 */
export const approveEscalation = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized for this city');
    }

    const now = Date.now();

    await ctx.db.patch(args.issueId, {
      escalatedToAdmin: false,
      status: issue.escalation?.prevIssueStatus || 'pending',
      escalation: {
        ...(issue.escalation || {}),
        resolved: true,
        resolvedAt: now,
        resolutionNote: args.notes,
        adminReviewStatus: 'resolved',
      },
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'approve_escalation',
      performedBy: args.cityAdminUserId,
      performedAt: now,
      notes: args.notes,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: `Escalation approved and resolved by City Admin. Note: ${args.notes}`,
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    await ctx.db.insert('cityAdminAuditLogs', {
      action: 'Escalation Resolution Approved',
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      city,
      affectedEntityType: 'issue_escalation',
      affectedEntityId: issue._id,
      issueCode: issue.issueCode,
      oldValue: 'reviewed',
      newValue: 'resolved',
      reason: args.notes,
      timestamp: now,
    });

    // Universal Audit Log
    await auditIssueAction(ctx, {
      issue,
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      action: 'approve_escalation',
      actionCategory: 'escalation',
      oldValue: {
        status: issue.status,
        escalatedToAdmin: true,
      },
      newValue: {
        status: issue.escalation?.prevIssueStatus || 'pending',
        escalatedToAdmin: false,
        resolved: true,
      },
      reason: args.notes,
      description: `Escalation approved by City Admin for issue ${issue.issueCode}.`,
      source: 'web',
    });

    const notifyUsers = [issue.assignedUnitOfficer, issue.assignedFieldOfficer].filter(Boolean);
    for (const userId of notifyUsers) {
      await ctx.db.insert('notifications', {
        userId,
        issueId: args.issueId,
        title: 'Escalation Resolved',
        message: `Administrative escalation for issue ${issue.issueCode} has been resolved by City Admin.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Reject Escalation Response Mutation
 * Formally rejects an officer's submitted corrective response as insufficient.
 * Keeps the escalation open and sets review status back to action_required.
 */
export const rejectEscalationResponse = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueId: v.id('issues'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { city } = await requireCityAdmin(ctx, args.cityAdminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue || issue.city !== city) {
      throw new Error('Issue not found or unauthorized for this city');
    }

    const now = Date.now();

    await ctx.db.patch(args.issueId, {
      escalatedToAdmin: false,
      status: issue.escalation?.prevIssueStatus || 'pending',
      escalation: {
        ...(issue.escalation || {}),
        resolved: true,
        adminReviewStatus: 'resolved',
        comments: args.reason,
        resolvedAt: now,
        resolutionNote: `The Escalation is being rejected as "${args.reason}".`,
      },
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'reject_escalation',
      performedBy: args.cityAdminUserId,
      performedAt: now,
      notes: `Escalation response rejected as insufficient. Reason: ${args.reason}`,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: `Escalation response rejected by City Admin. Reason: ${args.reason}`,
      updatedBy: args.cityAdminUserId,
      role: 'city_admin',
      attachments: [],
      scope: 'officer',
      createdAt: now,
    });

    await ctx.db.insert('cityAdminAuditLogs', {
      action: 'Escalation Response Rejected',
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      city,
      affectedEntityType: 'issue_escalation',
      affectedEntityId: issue._id,
      issueCode: issue.issueCode,
      oldValue: 'response_submitted',
      newValue: 'rejected',
      reason: args.reason,
      timestamp: now,
    });

    // Universal Audit Log
    await auditIssueAction(ctx, {
      issue,
      performedByUserId: args.cityAdminUserId,
      performerRole: 'city_admin',
      action: 'reject_escalation',
      actionCategory: 'escalation',
      oldValue: {
        status: issue.status,
        escalatedToAdmin: true,
      },
      newValue: {
        status: issue.escalation?.prevIssueStatus || 'pending',
        escalatedToAdmin: false,
        resolved: true,
      },
      reason: args.reason,
      description: `Escalation rejected by City Admin for issue ${issue.issueCode}.`,
      source: 'web',
    });

    const notifyUsers = [issue.assignedUnitOfficer, issue.assignedFieldOfficer].filter(Boolean);
    for (const userId of notifyUsers) {
      await ctx.db.insert('notifications', {
        userId,
        issueId: args.issueId,
        title: 'Escalation Response Rejected',
        message: `City Admin rejected your escalation response for issue ${issue.issueCode}: "${args.reason}".`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Bulk Acknowledge Escalations Mutation exclusively for City Admin
 */
export const bulkAcknowledgeEscalations = mutation({
  args: {
    cityAdminUserId: v.id('users'),
    issueIds: v.array(v.id('issues')),
    note: v.optional(v.string()),
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
        skippedIssues.push({ issueId, reason: 'Unauthorized' });
        continue;
      }

      const escalationState = getEscalationState(issue);
      if (!escalationState.isEscalated) {
        skippedIssues.push({ issueId, reason: 'No active escalation' });
        continue;
      }

      if (
        issue.escalationResolved ||
        escalationState.reviewStatus === 'resolved' ||
        escalationState.reviewStatus === 'dismissed'
      ) {
        skippedIssues.push({ issueId, reason: 'Escalation already closed' });
        continue;
      }

      await ctx.db.patch(issue._id, {
        escalationAdminReviewStatus: 'reviewed',
        escalationReviewedAt: now,
        escalationReviewedBy: args.cityAdminUserId,
        escalation: {
          ...(issue.escalation || {}),
          adminReviewStatus: 'reviewed',
          reviewedAt: now,
          reviewedBy: args.cityAdminUserId,
        },
        updatedAt: now,
      });

      await ctx.db.insert('escalationResolutionActions', {
        issueId: issue._id,
        actionType: 'review_escalation',
        performedBy: args.cityAdminUserId,
        performedAt: now,
        notes: args.note || 'Escalation acknowledged in bulk by City Admin.',
      });

      await ctx.db.insert('issueUpdates', {
        issueId: issue._id,
        status: issue.status,
        comment: `Escalation acknowledged in bulk by City Admin.\nNote: ${args.note || 'Under review'}`,
        updatedBy: args.cityAdminUserId,
        role: 'city_admin',
        attachments: [],
        scope: 'officer_and_citizen',
        createdAt: now,
      });

      await ctx.db.insert('cityAdminAuditLogs', {
        action: 'Escalation Acknowledged',
        performedByUserId: args.cityAdminUserId,
        performerRole: 'city_admin',
        city,
        affectedEntityType: 'issue_escalation',
        affectedEntityId: issue._id,
        issueCode: issue.issueCode,
        oldValue: 'pending',
        newValue: 'reviewed',
        reason: args.note || 'Bulk Acknowledgement',
        timestamp: now,
      });

      // Universal Audit Log per affected issue
      await auditIssueAction(ctx, {
        issue,
        performedByUserId: args.cityAdminUserId,
        performerRole: 'city_admin',
        action: 'review_escalation',
        actionCategory: 'escalation',
        oldValue: {
          adminReviewStatus: 'pending',
        },
        newValue: {
          adminReviewStatus: 'reviewed',
        },
        reason: args.note || 'Bulk Acknowledgement',
        description: `City Admin bulk acknowledged escalation for issue ${issue.issueCode}.`,
        source: 'web',
      });

      successfulIssueIds.push(issueId);
    }

    return {
      successfulIssueIds,
      skippedIssues,
    };
  },
});
