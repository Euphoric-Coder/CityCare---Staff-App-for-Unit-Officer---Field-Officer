import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Helper function to resolve the admin's database user ID
async function resolveAdminUserId(ctx: any, adminUserIdStr: string) {
  if (adminUserIdStr) {
    try {
      const user = await ctx.db.get(adminUserIdStr);
      if (
        user &&
        (user.role === 'admin' || user.role === 'city_admin' || user.role === 'unit_officer')
      ) {
        return user._id;
      }
    } catch (e) {
      // Not a valid ID format or not found
    }
  }

  // Fallback 1: search for first admin in users table
  const firstAdmin = await ctx.db
    .query('users')
    .withIndex('by_role', (q: any) => q.eq('role', 'admin'))
    .first();
  if (firstAdmin) {
    return firstAdmin._id;
  }

  // Fallback 2: filter query for admin role
  const anyAdmin = await ctx.db
    .query('users')
    .filter((q: any) => q.eq(q.field('role'), 'admin'))
    .first();
  if (anyAdmin) {
    return anyAdmin._id;
  }

  // Fallback 3: create a mock admin user if none exists
  const newAdminId = await ctx.db.insert('users', {
    fullName: 'System Admin',
    email: 'admin@citycare.gov',
    password: 'hashedpassword',
    role: 'admin',
    createdAt: new Date().toISOString(),
  });
  return newAdminId;
}

/**
 * Strict System Admin authorization helper.
 * Throws if user does not exist or is not a system admin (role !== "admin").
 */
async function requireSystemAdmin(ctx, adminUserId) {
  if (!adminUserId) {
    throw new Error('System Admin authentication is required.');
  }
  const user = await ctx.db.get(adminUserId);
  if (!user) {
    throw new Error('System Admin user not found.');
  }
  if (user.role !== 'admin') {
    throw new Error('Unauthorized. System Admin access required.');
  }
  return user;
}

function normalizeStatus(value: any) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeDepartment(value: any) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeLocation(value) {
  return normalizeText(value);
}

function isOfficerCompatibleWithIssue({
  officerDepartment,
  officerCity,
  issueDepartment,
  issueCity,
}) {
  const departmentMatches =
    normalizeDepartment(officerDepartment) === normalizeDepartment(issueDepartment);

  const cityMatches = normalizeText(officerCity) === normalizeText(issueCity);

  return departmentMatches && cityMatches;
}

const TERMINAL_ISSUE_STATUSES = new Set(['resolved', 'closed', 'rejected', 'withdrawn']);

function isActiveIssue(issue) {
  return !TERMINAL_ISSUE_STATUSES.has(normalizeStatus(issue?.status));
}

function getTimestamp(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const timestamp = typeof value === 'number' ? value : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getSlaState(issue, now = Date.now()) {
  const deadline = getTimestamp(issue?.slaDeadline ?? issue?.sla_deadline);
  const status = normalizeStatus(issue?.status);

  if (TERMINAL_ISSUE_STATUSES.has(status)) {
    return {
      status: 'completed',
      hoursRemaining: 0,
      overdueHours: 0,
      deadline,
    };
  }

  if (!deadline) {
    return {
      status: 'no_deadline',
      hoursRemaining: 0,
      overdueHours: 0,
      deadline: null,
    };
  }

  const diffMs = deadline - now;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    return {
      status: 'breached',
      hoursRemaining: overdueHours,
      overdueHours,
      deadline,
    };
  }

  if (diffHours <= 24) {
    return {
      status: 'due_soon',
      hoursRemaining: diffHours,
      overdueHours: 0,
      deadline,
    };
  }

  if (diffHours <= 48) {
    return {
      status: 'at_risk',
      hoursRemaining: diffHours,
      overdueHours: 0,
      deadline,
    };
  }

  return {
    status: 'on_track',
    hoursRemaining: diffHours,
    overdueHours: 0,
    deadline,
  };
}

function getEscalationState(issue) {
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

  const reviewStatus = normalizeStatus(nested.adminReviewStatus);
  const terminalStatuses = new Set(['resolved', 'rejected', 'dismissed']);

  const resolved =
    nested.resolved === true || (reviewStatus !== '' && terminalStatuses.has(reviewStatus));

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

async function insertEscalationActionIfActive(
  ctx,
  { issue, actionType, performedBy, performedAt, oldValue, newValue, notes }
) {
  const state = getEscalationState(issue);
  if (!state.isActive) {
    return null;
  }

  return await ctx.db.insert('escalationResolutionActions', {
    issueId: issue._id,
    actionType,
    performedBy,
    performedAt: performedAt ?? Date.now(),
    ...(oldValue !== undefined
      ? {
          oldValue: typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue),
        }
      : {}),
    ...(newValue !== undefined
      ? {
          newValue: typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
        }
      : {}),
    ...(notes ? { notes } : {}),
  });
}

function requireReviewedEscalation(issue) {
  const state = getEscalationState(issue);
  if (!state.isActive) {
    throw new Error('ESCALATION_NOT_ACTIVE: This issue does not have an active escalation.');
  }

  const reviewStatus = normalizeStatus(issue?.escalation?.adminReviewStatus);

  if (reviewStatus !== 'reviewed') {
    throw new Error(
      'ESCALATION_REVIEW_REQUIRED: Review and start handling this escalation before performing administrative actions.'
    );
  }

  return state;
}

/**
 * Global System Admin SLA & Escalation Query
 */
export const getSlaMonitoringIssues = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db.query('issues').collect();
    const now = Date.now();

    const allActions = await ctx.db.query('escalationResolutionActions').collect();
    const actionsByIssue = new Map();
    allActions.forEach((action) => {
      const list = actionsByIssue.get(action.issueId) || [];
      list.push(action);
      actionsByIssue.set(action.issueId, list);
    });

    const enrichedIssues = await Promise.all(
      issues.map(async (issue) => {
        const slaState = getSlaState(issue, now);
        const escalationState = getEscalationState(issue);

        // Fetch assigned Unit Officer profile
        let assignedUnitOfficer = null;
        if (issue.assignedUnitOfficer) {
          const uoUser = await ctx.db.get(issue.assignedUnitOfficer);
          const uoProfile = await ctx.db
            .query('unitOfficers')
            .withIndex('by_user', (q) => q.eq('userId', issue.assignedUnitOfficer))
            .first();

          if (uoUser || uoProfile) {
            assignedUnitOfficer = {
              userId: uoUser?._id ?? uoProfile?.userId,
              profileId: uoProfile?._id ?? null,
              name: uoProfile?.fullName ?? uoUser?.fullName ?? 'Unit Officer',
              fullName: uoProfile?.fullName ?? uoUser?.fullName ?? 'Unit Officer',
              email: uoProfile?.email ?? uoUser?.email ?? null,
              phone: uoProfile?.phone ?? null,
              department: uoProfile?.department ?? issue.department ?? issue.category,
              city: uoProfile?.city ?? issue.city ?? null,
              state: uoProfile?.state ?? issue.state ?? null,
              rating: uoProfile?.rating ?? null,
              efficiencyScore: uoProfile?.efficiencyScore ?? null,
              currentWorkload: Array.isArray(uoProfile?.activeIssueIds)
                ? uoProfile.activeIssueIds.length
                : 0,
            };
          }
        }

        // Fetch assigned Field Officer profile
        let assignedFieldOfficer = null;
        if (issue.assignedFieldOfficer) {
          const foUser = await ctx.db.get(issue.assignedFieldOfficer);
          const foProfile = await ctx.db
            .query('fieldOfficers')
            .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer))
            .first();

          if (foUser || foProfile) {
            assignedFieldOfficer = {
              userId: foUser?._id ?? foProfile?.userId,
              profileId: foProfile?._id ?? null,
              name: foProfile?.fullName ?? foUser?.fullName ?? 'Field Officer',
              fullName: foProfile?.fullName ?? foUser?.fullName ?? 'Field Officer',
              email: foProfile?.email ?? foUser?.email ?? null,
              phone: foProfile?.phone ?? null,
              department: foProfile?.department ?? issue.department ?? issue.category,
              city: foProfile?.city ?? issue.city ?? null,
              state: foProfile?.state ?? issue.state ?? null,
              rating: foProfile?.rating ?? null,
              efficiencyScore: foProfile?.efficiencyScore ?? null,
              currentWorkload: foProfile?.currentActiveIssues ?? 0,
              maximumCapacity: foProfile?.maxIssueCapacity ?? null,
            };
          }
        }

        // Fetch action logs
        const actions = actionsByIssue.get(issue._id) || [];
        const enrichedActions = await Promise.all(
          actions.map(async (a) => {
            const performer = await ctx.db.get(a.performedBy);
            return {
              id: a._id,
              issueId: a.issueId,
              type: a.actionType,
              actionType: a.actionType,
              performedBy: performer?.fullName ?? 'Administrator',
              performed_by: performer?.fullName ?? 'Administrator',
              performedByRole: performer?.role ?? 'admin',
              role: performer?.role ?? 'admin',
              performedAt: a.performedAt,
              performed_at: a.performedAt,
              oldValue: a.oldValue,
              old_value: a.oldValue,
              newValue: a.newValue,
              new_value: a.newValue,
              notes: a.notes,
            };
          })
        );
        enrichedActions.sort((x, y) => Number(x.performedAt) - Number(y.performedAt));

        const subcategoryList = Array.isArray(issue.subcategory)
          ? issue.subcategory
          : issue.subcategory
            ? [issue.subcategory]
            : [];

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

          assignedUnitOfficer,
          assignedFieldOfficer,
          assigned_officer: assignedUnitOfficer
            ? {
                id: assignedUnitOfficer.userId,
                full_name: assignedUnitOfficer.name,
                role: 'unit_officer',
              }
            : null,
          field_officer: assignedFieldOfficer
            ? {
                id: assignedFieldOfficer.userId,
                full_name: assignedFieldOfficer.name,
                role: 'field_officer',
              }
            : null,

          sla: {
            deadline: slaState.deadline,
            status: slaState.status,
            hoursRemaining: slaState.hoursRemaining,
            overdueHours: slaState.overdueHours,
            extensionCount: issue.slaExtendedCount ?? issue.slaExtensionCount ?? 0,
          },
          sla_deadline: slaState.deadline,
          sla_status: slaState.status,
          hours_remaining: slaState.hoursRemaining,
          overdue_hours: slaState.overdueHours,

          escalation: {
            hasHistory: escalationState.hasHistory,
            isEscalated: escalationState.isActive,
            isActive: escalationState.isActive,
            status: escalationState.reviewStatus,
            category: issue.escalation?.category ?? null,
            priority: issue.escalation?.priority ?? null,
            reason: issue.escalation?.reason ?? null,
            comments: issue.escalation?.comments ?? null,
            escalatedAt: issue.escalation?.escalatedAt ?? null,
            resolvedAt: issue.escalation?.resolvedAt ?? null,
            resolutionNote: issue.escalation?.resolutionNote ?? null,
            resolutionActions: enrichedActions,
          },
          is_escalated: escalationState.isActive,
          escalation_category: issue.escalation?.category ?? null,
          escalation_priority: issue.escalation?.priority ?? null,
          escalation_reason: issue.escalation?.reason ?? null,
          escalation_comments: issue.escalation?.comments ?? null,
          escalated_at: issue.escalation?.escalatedAt ?? null,
          escalation_count: issue.escalation?.escalationCount || 0,
          escalation_admin_review_status: escalationState.reviewStatus || 'N/A',
          escalation_resolved: escalationState.resolved,
          escalation_resolved_at: issue.escalation?.resolvedAt ?? null,
          escalation_resolution_notes: issue.escalation?.resolutionNote ?? null,
          escalation_resolution_actions: enrichedActions,
        };
      })
    );

    return enrichedIssues;
  },
});

export const escalateIssue = mutation({
  args: {
    issueId: v.id('issues'),
    prevIssueStatus: v.string(),
    escalationCategory: v.union(
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
    escalationPriority: v.union(v.literal('medium'), v.literal('high'), v.literal('critical')),
    escalationReason: v.string(),
    adminUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireSystemAdmin(ctx, args.adminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();

    await ctx.db.patch(args.issueId, {
      escalatedToAdmin: true,
      status: 'escalated',
      escalation: {
        category: args.escalationCategory,
        priority: args.escalationPriority,
        reason: args.escalationReason,
        comments: '',
        escalatedBy: adminUser._id,
        escalatedAt: now,
        prevIssueStatus: args.prevIssueStatus,
        resolved: false,
        adminReviewStatus: 'pending',
        escalationCount: (issue.escalation?.escalationCount || 0) + 1,
      },
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'escalate',
      performedBy: adminUser._id,
      performedAt: now,
      newValue: args.escalationCategory,
      notes: args.escalationReason,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'escalated',
      comment: `Escalated to Admin. Category: ${args.escalationCategory}. Priority: ${args.escalationPriority}. Reason: ${args.escalationReason}`,
      updatedBy: adminUser._id,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    return { success: true };
  },
});

export const reviewEscalation = mutation({
  args: {
    issueId: v.id('issues'),
    adminUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireSystemAdmin(ctx, args.adminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const state = getEscalationState(issue);
    if (!state.isActive) {
      throw new Error('ESCALATION_NOT_ACTIVE: This issue does not have an active escalation.');
    }
    if (!issue.escalation) {
      throw new Error('ESCALATION_NOT_FOUND: Escalation details are missing.');
    }
    if (state.resolved) {
      throw new Error('ESCALATION_ALREADY_CLOSED: This escalation has already been completed.');
    }

    const currentStatus = normalizeStatus(issue.escalation?.adminReviewStatus);

    if (currentStatus === 'reviewed') {
      return {
        success: true,
        alreadyReviewed: true,
        reviewStatus: 'reviewed',
      };
    }

    const now = Date.now();

    await ctx.db.patch(args.issueId, {
      escalation: {
        ...issue.escalation,
        adminReviewStatus: 'reviewed',
      },
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'review_escalation',
      performedBy: adminUser._id,
      performedAt: now,
      notes: 'Escalation acknowledged by System Admin.',
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: 'Escalation acknowledged by System Admin.',
      updatedBy: adminUser._id,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    return {
      success: true,
      alreadyReviewed: false,
      reviewStatus: 'reviewed',
      reviewedAt: now,
    };
  },
});

export const extendIssueSla = mutation({
  args: {
    issueId: v.id('issues'),
    newDeadline: v.number(),
    notes: v.string(),
    adminUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireSystemAdmin(ctx, args.adminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    if (getEscalationState(issue).isActive) {
      requireReviewedEscalation(issue);
    }

    const existingDeadline = getTimestamp(issue.slaDeadline ?? issue.sla_deadline);

    if (!existingDeadline) {
      throw new Error(
        'SLA_EXTENSION_NOT_ALLOWED: This issue does not have an existing SLA deadline.'
      );
    }

    if (args.newDeadline <= existingDeadline) {
      throw new Error('The new SLA deadline must be later than the current deadline.');
    }

    const now = Date.now();
    const oldDeadlineStr = new Date(existingDeadline).toISOString();
    const newDeadlineStr = new Date(args.newDeadline).toISOString();

    await ctx.db.patch(args.issueId, {
      slaDeadline: args.newDeadline,
      slaExtendedCount: (issue.slaExtendedCount || 0) + 1,
      lastSlaExtensionAt: now,
      slaBreached: false,
    });

    await insertEscalationActionIfActive(ctx, {
      issue,
      actionType: 'extend_sla',
      performedBy: adminUser._id,
      performedAt: now,
      oldValue: oldDeadlineStr,
      newValue: newDeadlineStr,
      notes: args.notes,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: `SLA Deadline extended to ${new Date(args.newDeadline).toLocaleString()} by System Admin. Reason: ${args.notes}`,
      updatedBy: adminUser._id,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    return { success: true };
  },
});

export const reassignIssueOfficer = mutation({
  args: {
    issueId: v.id('issues'),
    officerType: v.union(v.literal('unit_officer'), v.literal('field_officer')),
    newUnitOfficerProfileId: v.optional(v.id('unitOfficers')),
    newFieldOfficerProfileId: v.optional(v.id('fieldOfficers')),
    notes: v.string(),
    adminUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireSystemAdmin(ctx, args.adminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    if (getEscalationState(issue).isActive) {
      requireReviewedEscalation(issue);
    }

    const now = Date.now();
    const issueCity = normalizeLocation(issue.city);
    const issueDept = normalizeDepartment(issue.department || issue.category);

    if (args.officerType === 'unit_officer') {
      if (!args.newUnitOfficerProfileId) {
        throw new Error('Unit Officer profile selection is required.');
      }
      if (args.newFieldOfficerProfileId) {
        throw new Error('Field Officer profile ID is invalid for Unit Officer reassignment.');
      }

      const profile = await ctx.db.get(args.newUnitOfficerProfileId);
      if (!profile) throw new Error('Selected Unit Officer profile not found.');

      const officerUser = await ctx.db.get(profile.userId);
      if (officerUser && officerUser.accountApproved === false) {
        throw new Error('Selected Unit Officer account is not approved.');
      }

      if (String(issue.assignedUnitOfficer) === String(profile.userId)) {
        throw new Error('The selected Unit Officer is already assigned to this issue.');
      }

      const officerCity = normalizeLocation(profile.city);
      if (!officerCity || !issueCity || officerCity !== issueCity) {
        throw new Error(
          `The selected officer must belong to the same city as the issue. Issue city: ${issue.city || 'Unknown'}, officer city: ${profile.city || 'Unknown'}.`
        );
      }

      const officerDept = normalizeDepartment(profile.department);
      if (!issueDept || !officerDept || issueDept !== officerDept) {
        throw new Error(
          `The selected officer is not compatible with this issue department. Required: ${issue.department || issue.category}, officer department: ${profile.department || 'Unknown'}.`
        );
      }

      const oldUoUserId = issue.assignedUnitOfficer;
      let oldUoName = 'Unassigned';

      if (oldUoUserId) {
        const oldUoProfile = await ctx.db
          .query('unitOfficers')
          .withIndex('by_user', (q) => q.eq('userId', oldUoUserId))
          .first();
        if (oldUoProfile) {
          oldUoName = oldUoProfile.fullName;
          await ctx.db.patch(oldUoProfile._id, {
            activeIssueIds: (oldUoProfile.activeIssueIds || []).filter(
              (id) => String(id) !== String(args.issueId)
            ),
          });
        }
      }

      await ctx.db.patch(profile._id, {
        activeIssueIds: Array.from(new Set([...(profile.activeIssueIds || []), args.issueId])),
      });

      // Check if current Field Officer is still valid under new UO / department / city
      let keepFieldOfficer = issue.assignedFieldOfficer;
      let foClearedName = null;
      if (issue.assignedFieldOfficer) {
        const currentFoProfile = await ctx.db
          .query('fieldOfficers')
          .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer))
          .first();
        if (
          !currentFoProfile ||
          normalizeLocation(currentFoProfile.city) !== issueCity ||
          normalizeDepartment(currentFoProfile.department) !== issueDept
        ) {
          foClearedName = currentFoProfile?.fullName || 'Field Officer';
          keepFieldOfficer = null;
          if (currentFoProfile) {
            const assigned = (currentFoProfile.assignedIssueIds || []).filter(
              (id) => String(id) !== String(args.issueId)
            );
            await ctx.db.patch(currentFoProfile._id, {
              assignedIssueIds: assigned,
              currentActiveIssues: Math.max(0, assigned.length),
            });
          }
        }
      }

      const nextStatus =
        issue.status === 'pending' || issue.status === 'verified' ? 'assigned' : issue.status;

      await ctx.db.patch(args.issueId, {
        assignedUnitOfficer: profile.userId,
        assignedFieldOfficer: keepFieldOfficer,
        status: nextStatus,
      });

      await insertEscalationActionIfActive(ctx, {
        issue,
        actionType: 'reassign_unit_officer',
        performedBy: adminUser._id,
        performedAt: now,
        oldValue: oldUoName,
        newValue: profile.fullName,
        notes: args.notes,
      });

      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: nextStatus,
        comment: `Unit Officer reassigned by System Admin to ${profile.fullName}.${foClearedName ? ` Incompatible Field Officer (${foClearedName}) was unassigned.` : ''}\nNotes: ${args.notes}`,
        updatedBy: adminUser._id,
        role: 'admin',
        attachments: [],
        scope: 'officer_and_citizen',
        createdAt: now,
      });

      return { success: true };
    } else if (args.officerType === 'field_officer') {
      if (!args.newFieldOfficerProfileId) {
        throw new Error('Field Officer profile selection is required.');
      }
      if (args.newUnitOfficerProfileId) {
        throw new Error('Unit Officer profile ID is invalid for Field Officer reassignment.');
      }

      const profile = await ctx.db.get(args.newFieldOfficerProfileId);
      if (!profile) throw new Error('Selected Field Officer profile not found.');

      const officerUser = await ctx.db.get(profile.userId);
      if (officerUser && officerUser.accountApproved === false) {
        throw new Error('Selected Field Officer account is not approved.');
      }

      if (String(issue.assignedFieldOfficer) === String(profile.userId)) {
        throw new Error('The selected Field Officer is already assigned to this issue.');
      }

      const officerCity = normalizeLocation(profile.city);
      if (!officerCity || !issueCity || officerCity !== issueCity) {
        throw new Error(
          `The selected officer must belong to the same city as the issue. Issue city: ${issue.city || 'Unknown'}, officer city: ${profile.city || 'Unknown'}.`
        );
      }

      const officerDept = normalizeDepartment(profile.department);
      if (!issueDept || !officerDept || issueDept !== officerDept) {
        throw new Error(
          `The selected officer is not compatible with this issue department. Required: ${issue.department || issue.category}, officer department: ${profile.department || 'Unknown'}.`
        );
      }

      const oldFoUserId = issue.assignedFieldOfficer;
      let oldFoName = 'Unassigned';

      if (oldFoUserId) {
        const oldFoProfile = await ctx.db
          .query('fieldOfficers')
          .withIndex('by_user', (q) => q.eq('userId', oldFoUserId))
          .first();
        if (oldFoProfile) {
          oldFoName = oldFoProfile.fullName;
          const assigned = (oldFoProfile.assignedIssueIds || []).filter(
            (id) => String(id) !== String(args.issueId)
          );
          await ctx.db.patch(oldFoProfile._id, {
            assignedIssueIds: assigned,
            currentActiveIssues: Math.max(0, assigned.length),
          });
        }
      }

      const assigned = Array.from(new Set([...(profile.assignedIssueIds || []), args.issueId]));
      await ctx.db.patch(profile._id, {
        assignedIssueIds: assigned,
        currentActiveIssues: assigned.length,
      });

      const nextStatus = issue.status === 'assigned' ? 'in_progress' : issue.status;

      await ctx.db.patch(args.issueId, {
        assignedFieldOfficer: profile.userId,
        status: nextStatus,
      });

      await insertEscalationActionIfActive(ctx, {
        issue,
        actionType: 'reassign_field_officer',
        performedBy: adminUser._id,
        performedAt: now,
        oldValue: oldFoName,
        newValue: profile.fullName,
        notes: args.notes,
      });

      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: nextStatus,
        comment: `Field Officer reassigned by System Admin to ${profile.fullName}.\nNotes: ${args.notes}`,
        updatedBy: adminUser._id,
        role: 'admin',
        attachments: [],
        scope: 'officer_and_citizen',
        createdAt: now,
      });

      return { success: true };
    }

    throw new Error('Invalid officer type specified for reassignment.');
  },
});

export const updateIssuePriority = mutation({
  args: {
    issueId: v.id('issues'),
    priority: v.string(),
    notes: v.string(),
    adminUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireSystemAdmin(ctx, args.adminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    if (getEscalationState(issue).isActive) {
      requireReviewedEscalation(issue);
    }

    if ((args.priority === 'high' || args.priority === 'critical') && !args.notes.trim()) {
      throw new Error('A reason is required when raising priority to High or Critical');
    }

    const now = Date.now();
    const oldPriority = issue.priority;

    await ctx.db.patch(args.issueId, {
      priority: args.priority,
    });

    await insertEscalationActionIfActive(ctx, {
      issue,
      actionType: 'update_priority',
      performedBy: adminUser._id,
      performedAt: now,
      oldValue: oldPriority,
      newValue: args.priority,
      notes: args.notes,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: `Issue priority updated by System Admin from "${oldPriority}" to "${args.priority}".\nNotes: ${args.notes}`,
      updatedBy: adminUser._id,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    return { success: true };
  },
});

export const changeIssueClassification = mutation({
  args: {
    issueId: v.id('issues'),
    category: v.optional(v.string()),
    newCategory: v.optional(v.string()),
    subcategory: v.optional(v.array(v.string())),
    newSubcategories: v.optional(v.array(v.string())),
    department: v.optional(v.string()),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    adminUserId: v.id('users'),
    confirmClearIncompatibleOfficers: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireSystemAdmin(ctx, args.adminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    if (getEscalationState(issue).isActive) {
      requireReviewedEscalation(issue);
    }

    const now = Date.now();
    const targetCategory = String(args.newCategory || args.category || '').trim();
    if (!targetCategory) {
      throw new Error('Category selection is required.');
    }
    const newDepartment = normalizeDepartment(args.department || targetCategory);
    const targetReason = String(args.reason || args.notes || '').trim();

    const normalizedSubcategories = [
      ...new Set(
        (args.newSubcategories || args.subcategory || [])
          .map((v) => String(v || '').trim())
          .filter(Boolean)
      ),
    ];

    const oldDepartment = normalizeDepartment(issue.department || issue.category);
    const oldCategory = String(issue.category || '').trim();
    const oldSubcategories = Array.isArray(issue.subcategory)
      ? issue.subcategory
      : issue.subcategory
        ? [issue.subcategory]
        : [];

    const categoryChanged = normalizeDepartment(targetCategory) !== oldDepartment;
    const subcategoryChanged =
      JSON.stringify(normalizedSubcategories) !== JSON.stringify(oldSubcategories);

    if (!categoryChanged && !subcategoryChanged) {
      throw new Error('Select a different category or modify the subcategories.');
    }

    let currentUoProfile = null;
    if (issue.assignedUnitOfficer) {
      currentUoProfile = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedUnitOfficer))
        .unique();
    }

    let currentFoProfile = null;
    if (issue.assignedFieldOfficer) {
      currentFoProfile = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer))
        .unique();
    }

    const unitOfficerCompatible = !issue.assignedUnitOfficer
      ? true
      : Boolean(
          currentUoProfile &&
          isOfficerCompatibleWithIssue({
            officerDepartment: currentUoProfile.department,
            officerCity: currentUoProfile.city,
            issueDepartment: newDepartment,
            issueCity: issue.city,
          })
        );

    const fieldOfficerCompatible = !issue.assignedFieldOfficer
      ? true
      : Boolean(
          currentFoProfile &&
          isOfficerCompatibleWithIssue({
            officerDepartment: currentFoProfile.department,
            officerCity: currentFoProfile.city,
            issueDepartment: newDepartment,
            issueCity: issue.city,
          })
        );

    const incompatibleOfficers = [];

    if (issue.assignedUnitOfficer && !unitOfficerCompatible) {
      const uoUser = await ctx.db.get(issue.assignedUnitOfficer);
      incompatibleOfficers.push({
        role: 'unit_officer',
        roleLabel: 'Unit Officer',
        userId: issue.assignedUnitOfficer,
        profileId: currentUoProfile?._id ?? null,
        name: currentUoProfile?.fullName ?? uoUser?.fullName ?? 'Assigned Unit Officer',
        department: currentUoProfile?.department ?? null,
        city: currentUoProfile?.city ?? null,
        reason: 'The officer does not match the new issue department and/or city.',
      });
    }

    if (issue.assignedFieldOfficer && !fieldOfficerCompatible) {
      const foUser = await ctx.db.get(issue.assignedFieldOfficer);
      incompatibleOfficers.push({
        role: 'field_officer',
        roleLabel: 'Field Officer',
        userId: issue.assignedFieldOfficer,
        profileId: currentFoProfile?._id ?? null,
        name: currentFoProfile?.fullName ?? foUser?.fullName ?? 'Assigned Field Officer',
        department: currentFoProfile?.department ?? null,
        city: currentFoProfile?.city ?? null,
        reason: 'The officer does not match the new issue department and/or city.',
      });
    }

    if (incompatibleOfficers.length > 0 && args.confirmClearIncompatibleOfficers !== true) {
      return {
        success: false,
        requiresConfirmation: true,
        code: 'INCOMPATIBLE_OFFICERS_CONFIRMATION_REQUIRED',
        message:
          'The new classification is not compatible with one or more currently assigned officers.',
        newClassification: {
          category: targetCategory,
          department: newDepartment,
          subcategories: normalizedSubcategories,
        },
        incompatibleOfficers,
      };
    }

    let nextUnitOfficer = issue.assignedUnitOfficer;
    if (!unitOfficerCompatible) {
      nextUnitOfficer = null;
      if (currentUoProfile) {
        await ctx.db.patch(currentUoProfile._id, {
          activeIssueIds: (currentUoProfile.activeIssueIds || []).filter(
            (id) => String(id) !== String(args.issueId)
          ),
        });
      }
    }

    let nextFieldOfficer = issue.assignedFieldOfficer;
    if (!fieldOfficerCompatible) {
      nextFieldOfficer = null;
      if (currentFoProfile) {
        const newAssignedIssueIds = (currentFoProfile.assignedIssueIds || []).filter(
          (id) => String(id) !== String(args.issueId)
        );
        await ctx.db.patch(currentFoProfile._id, {
          assignedIssueIds: newAssignedIssueIds,
          currentActiveIssues: Math.max(0, newAssignedIssueIds.length),
        });
      }
    }

    await ctx.db.patch(args.issueId, {
      category: targetCategory,
      department: newDepartment,
      subcategory: normalizedSubcategories,
      assignedUnitOfficer: nextUnitOfficer,
      assignedFieldOfficer: nextFieldOfficer,
    });

    await insertEscalationActionIfActive(ctx, {
      issue,
      actionType: 'change_classification',
      performedBy: adminUser._id,
      performedAt: now,
      oldValue: {
        category: oldCategory,
        department: oldDepartment,
        subcategory: oldSubcategories,
        assignedUnitOfficer: currentUoProfile?.fullName || null,
        assignedFieldOfficer: currentFoProfile?.fullName || null,
      },
      newValue: {
        category: targetCategory,
        department: newDepartment,
        subcategory: normalizedSubcategories,
        assignedUnitOfficer: nextUnitOfficer ? currentUoProfile?.fullName || null : null,
        assignedFieldOfficer: nextFieldOfficer ? currentFoProfile?.fullName || null : null,
        clearedOfficers: incompatibleOfficers.map((o) => ({
          type: o.type,
          name: o.name,
        })),
      },
      notes: targetReason,
    });

    let updateComment = `Issue classification changed from "${oldCategory}" to "${targetCategory}" by System Admin.`;
    if (normalizedSubcategories.length > 0) {
      updateComment += `\nSubcategories: ${normalizedSubcategories.join(', ')}`;
    }
    if (incompatibleOfficers.length > 0) {
      updateComment += `\nCleared incompatible assignments: ${incompatibleOfficers.map((o) => `${o.type === 'unit_officer' ? 'Unit Officer' : 'Field Officer'}: ${o.name}`).join(', ')}.`;
    } else {
      updateComment += `\nAll current officer assignments remained compatible.`;
    }
    if (targetReason) {
      updateComment += `\nReason: ${targetReason}`;
    }

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: updateComment,
      updatedBy: adminUser._id,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    return {
      success: true,
      category: targetCategory,
      department: newDepartment,
      subcategories: normalizedSubcategories,
      clearedUnitOfficer: !unitOfficerCompatible && Boolean(issue.assignedUnitOfficer),
      clearedFieldOfficer: !fieldOfficerCompatible && Boolean(issue.assignedFieldOfficer),
      clearedOfficers: incompatibleOfficers,
    };
  },
});

export const approveEscalation = mutation({
  args: {
    issueId: v.id('issues'),
    notes: v.string(),
    adminUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireSystemAdmin(ctx, args.adminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    requireReviewedEscalation(issue);

    const now = Date.now();

    const targetStatus =
      normalizeStatus(issue.status) === 'escalated'
        ? issue.escalation?.prevIssueStatus || 'in_progress'
        : issue.status;

    await ctx.db.patch(args.issueId, {
      status: targetStatus,
      escalatedToAdmin: false,
      escalation: {
        ...(issue.escalation || {}),
        resolved: true,
        resolvedAt: now,
        resolutionNote: args.notes,
      },
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'approve_escalation',
      performedBy: adminUser._id,
      performedAt: now,
      notes: args.notes,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: targetStatus,
      comment: `Escalation approved and resolved by System Admin. Resolution: ${args.notes}`,
      updatedBy: adminUser._id,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    return { success: true };
  },
});

export const rejectEscalation = mutation({
  args: {
    issueId: v.id('issues'),
    reason: v.string(),
    adminUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireSystemAdmin(ctx, args.adminUserId);
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found.');

    requireReviewedEscalation(issue);

    const reason = args.reason.trim();
    if (!reason) {
      throw new Error('A reason for rejecting the escalation is required.');
    }

    const now = Date.now();

    const targetStatus =
      normalizeStatus(issue.status) === 'escalated'
        ? issue.escalation?.prevIssueStatus || 'in_progress'
        : issue.status;

    await ctx.db.patch(args.issueId, {
      status: targetStatus,
      escalatedToAdmin: false,
      escalation: {
        ...(issue.escalation || {}),
        resolved: true,
        resolvedAt: now,
        resolutionNote: reason,
      },
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'reject_escalation',
      performedBy: adminUser._id,
      performedAt: now,
      oldValue: issue.escalation?.adminReviewStatus || 'pending',
      newValue: 'rejected',
      notes: reason,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: targetStatus,
      comment: `Escalation response rejected by System Admin. Reason: ${reason}`,
      updatedBy: adminUser._id,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    return {
      success: true,
    };
  },
});

export const getEscalationAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db.query('issues').collect();
    const now = Date.now();

    const escalatedIssues = issues.filter((i) => i.escalatedToAdmin);

    const totalEscalations = escalatedIssues.length;
    const criticalEscalations = escalatedIssues.filter(
      (i) => i.escalation?.priority === 'critical'
    ).length;
    const pendingReviews = escalatedIssues.filter(
      (i) => i.escalation?.adminReviewStatus === 'pending' || !i.escalation?.adminReviewStatus
    ).length;
    const resolvedEscalations = escalatedIssues.filter((i) => i.escalation?.resolved).length;
    const repeatedEscalations = escalatedIssues.filter(
      (i) => (i.escalation?.escalationCount || 0) > 1
    ).length;

    const breachedIssues = issues.filter(
      (i) =>
        i.slaDeadline &&
        i.slaDeadline < now &&
        !TERMINAL_ISSUE_STATUSES.has(normalizeStatus(i.status))
    );
    const totalDelayMs = breachedIssues.reduce((sum, i) => sum + (now - i.slaDeadline), 0);
    const averageDelayHours =
      breachedIssues.length > 0
        ? Math.round(totalDelayMs / (1000 * 60 * 60) / breachedIssues.length)
        : 0;

    const categoryCounts = {};
    escalatedIssues.forEach((i) => {
      const cat = i.escalation?.category || 'other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const escalationsByCategory = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    const deptCounts = {};
    escalatedIssues.forEach((i) => {
      const dept = i.category || 'Other';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    const escalationsByDepartment = Object.entries(deptCounts).map(([department, count]) => ({
      department,
      count,
    }));

    const officerDelayMap = new Map();
    for (const issue of breachedIssues) {
      const delayHours = (now - issue.slaDeadline) / (1000 * 60 * 60);
      if (issue.assignedFieldOfficer) {
        const fo = await ctx.db.get(issue.assignedFieldOfficer);
        if (fo) {
          const val = officerDelayMap.get(fo.fullName) || 0;
          officerDelayMap.set(fo.fullName, val + delayHours);
        }
      }
      if (issue.assignedUnitOfficer) {
        const uo = await ctx.db.get(issue.assignedUnitOfficer);
        if (uo) {
          const val = officerDelayMap.get(uo.fullName) || 0;
          officerDelayMap.set(uo.fullName, val + delayHours);
        }
      }
    }
    const mostDelayedOfficers = Array.from(officerDelayMap.entries())
      .map(([name, delay]) => ({ name, delay: Math.round(delay) }))
      .sort((a, b) => b.delay - a.delay)
      .slice(0, 5);

    return {
      totalEscalations,
      criticalEscalations,
      pendingReviews,
      resolvedEscalations,
      averageDelayHours,
      repeatedEscalations,
      escalationsByCategory,
      escalationsByDepartment,
      mostDelayedOfficers,
    };
  },
});

// Mobile Escalation Functions
export const getEscalationDetailsByIssueId = query({
  args: {
    issueId: v.id('issues'),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);

    if (!issue) return null;

    const actions = await ctx.db

      .query('escalationResolutionActions')

      .withIndex('by_issue', (q) => q.eq('issueId', args.issueId))

      .collect();

    const enrichedActions = await Promise.all(
      actions.map(async (a) => {
        const performer = await ctx.db.get(a.performedBy);

        return {
          id: a._id,

          issueId: a.issueId,

          type: a.actionType,

          performedBy: performer ? performer.fullName : 'System Admin',

          performedAt: a.performedAt,

          oldValue: a.oldValue,

          newValue: a.newValue,

          notes: a.notes,
        };
      })
    );

    enrichedActions.sort((x, y) => x.performedAt - y.performedAt);

    return {
      escalatedToAdmin: issue.escalatedToAdmin || false,

      status: issue.status,

      escalation: issue.escalation || null,

      actions: enrichedActions,
    };
  },
});

export const escalateIssueMobile = mutation({
  args: {
    issueId: v.id('issues'),

    prevIssueStatus: v.string(),

    escalationCategory: v.union(
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

    escalationPriority: v.union(v.literal('medium'), v.literal('high'), v.literal('critical')),

    escalationReason: v.string(),

    adminUserId: v.string(),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);

    if (!issue) throw new Error('Issue not found');

    const now = Date.now();

    const adminDbId = await resolveAdminUserId(ctx, args.adminUserId);

    await ctx.db.patch(args.issueId, {
      escalatedToAdmin: true,

      status: 'escalated',

      escalation: {
        category: args.escalationCategory,

        priority: args.escalationPriority,

        reason: args.escalationReason,

        comments: '',

        escalatedBy: adminDbId,

        escalatedAt: now,

        prevIssueStatus: args.prevIssueStatus,

        resolved: false,

        adminReviewStatus: 'pending',

        escalationCount: (issue.escalation?.escalationCount || 0) + 1,
      },
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,

      actionType: 'escalate',

      performedBy: adminDbId,

      performedAt: now,

      newValue: args.escalationCategory,

      notes: args.escalationReason,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,

      status: 'escalated',

      comment: `Escalated to Admin. Category: ${args.escalationCategory}. Priority: ${args.escalationPriority}. Reason: ${args.escalationReason}`,

      updatedBy: adminDbId,

      role: 'admin',

      attachments: [],

      scope: 'officer_and_citizen',

      createdAt: now,
    });

    // Notify Reporter

    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,

      issueId: args.issueId,

      title: `Issue Escalated - "${issue.title}"`,

      message: `Your issue has been escalated to administrative queue. Category: ${args.escalationCategory}`,

      type: 'issue_escalated',

      read: false,

      createdAt: now,
    });

    // Notify Officers

    if (issue.assignedUnitOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedUnitOfficer,

        issueId: args.issueId,

        title: `Assigned Issue Escalated - "${issue.title}"`,

        message: `An issue assigned to you has been escalated to administrative queue. Category: ${args.escalationCategory}`,

        type: 'issue_escalated',

        read: false,

        createdAt: now,
      });
    }

    if (issue.assignedFieldOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedFieldOfficer,

        issueId: args.issueId,

        title: `Assigned Issue Escalated - "${issue.title}"`,

        message: `An issue assigned to you has been escalated to administrative queue. Category: ${args.escalationCategory}`,

        type: 'issue_escalated',

        read: false,

        createdAt: now,
      });
    }

    // Notify Admins

    const admins = await ctx.db

      .query('users')

      .withIndex('by_role', (q) => q.eq('role', 'admin'))

      .collect();

    for (const admin of admins) {
      await ctx.db.insert('notifications', {
        userId: admin._id,

        issueId: args.issueId,

        title: `Escalation Pending - "${issue.title}"`,

        message: `A new escalation is pending review: "${issue.title}". Category: ${args.escalationCategory}`,

        type: 'issue_escalated',

        read: false,

        createdAt: now,
      });
    }

    // Notify City Admins if critical

    if (args.escalationPriority === 'critical') {
      const cityAdmins = await ctx.db

        .query('users')

        .withIndex('by_role', (q) => q.eq('role', 'city_admin'))

        .collect();

      for (const ca of cityAdmins) {
        await ctx.db.insert('notifications', {
          userId: ca._id,

          issueId: args.issueId,

          title: `URGENT: Critical Escalation - "${issue.title}"`,

          message: `CRITICAL escalation requires immediate action: "${issue.title}". Category: ${args.escalationCategory}`,

          type: 'issue_escalated',

          read: false,

          createdAt: now,
        });
      }
    }

    return { success: true };
  },
});
