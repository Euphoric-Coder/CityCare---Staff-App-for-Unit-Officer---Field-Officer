import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { auditIssueActionMobile } from './mobileAuditLogger';
import { Id } from './_generated/dataModel';

// Helper function to resolve the admin's database user ID
async function resolveAdminUserId(ctx: any, adminUserIdStr: any) {
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

export const getSlaMonitoringIssues = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db
      .query('issues')
      .filter((q) => q.neq(q.field('status'), 'resolved'))
      .collect();

    const allActions = await ctx.db.query('escalationResolutionActions').collect();
    const actionsByIssue = new Map();
    allActions.forEach((action) => {
      const list = actionsByIssue.get(action.issueId) || [];
      list.push(action);
      actionsByIssue.set(action.issueId, list);
    });

    const enrichedIssues = await Promise.all(
      issues.map(async (issue) => {
        // Fetch citizen details
        const citizenUser = await ctx.db.get(issue.reportedBy);

        // Fetch assigned unit officer
        let assignedOfficer = null;
        if (issue.assignedUnitOfficer) {
          const uoUser = await ctx.db.get(issue.assignedUnitOfficer);
          if (uoUser) {
            assignedOfficer = {
              id: uoUser._id,
              full_name: uoUser.fullName,
              role: 'unit_officer',
            };
          }
        }

        // Fetch assigned field officer
        let fieldOfficer = null;
        if (issue.assignedFieldOfficer) {
          const foUser = await ctx.db.get(issue.assignedFieldOfficer);
          if (foUser) {
            fieldOfficer = {
              id: foUser._id,
              full_name: foUser.fullName,
              role: 'field_officer',
            };
          }
        }

        // Fetch escalatedBy
        let escalatedByName = '';
        if (issue.escalation?.escalatedBy) {
          const escUser = await ctx.db.get(issue.escalation.escalatedBy);
          if (escUser) escalatedByName = escUser.fullName;
        }

        // Fetch action logs
        const actions = actionsByIssue.get(issue._id) || [];
        const enrichedActions = await Promise.all(
          actions.map(async (a: any) => {
            const performer = await ctx.db.get(a.performedBy);
            return {
              id: a._id,
              issueId: a.issueId,
              type: a.actionType,
              performed_by: performer ? (performer as any).fullName : 'System Admin',
              performed_at: a.performedAt,
              old_value: a.oldValue,
              new_value: a.newValue,
              notes: a.notes,
            };
          })
        );
        enrichedActions.sort((x, y) => x.performed_at - y.performed_at);

        return {
          id: issue._id,
          ticket_id: issue.issueCode,
          title: issue.title,
          description: issue.description,
          category: issue.category,
          subcategory: issue.subcategory?.[0] || '',
          location: issue.address,
          severity: issue.priority,
          status: issue.status,
          sla_deadline: issue.slaDeadline,
          is_escalated: issue.escalatedToAdmin || false,
          escalation_category: issue.escalation?.category,
          escalation_priority: issue.escalation?.priority,
          escalation_reason: issue.escalation?.reason,
          escalation_comments: issue.escalation?.comments,
          escalated_by: escalatedByName,
          escalated_at: issue.escalation?.escalatedAt,
          escalation_count: issue.escalation?.escalationCount || 0,
          escalation_admin_review_status: issue.escalation?.adminReviewStatus || 'pending',
          escalation_resolved: issue.escalation?.resolved || false,
          escalation_resolved_at: issue.escalation?.resolvedAt,
          escalation_resolution_notes: issue.escalation?.resolutionNote,
          sla_extended_count: issue.slaExtendedCount || 0,
          last_sla_extension_at: issue.lastSlaExtensionAt,
          assigned_officer: assignedOfficer,
          field_officer: fieldOfficer,
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
    adminUserId: v.optional(v.string()),
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

export const reviewEscalation = mutation({
  args: {
    issueId: v.id('issues'),
    adminUserId: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminUserId || args.reviewedBy);

    await ctx.db.patch(args.issueId, {
      escalation: issue.escalation
        ? {
            ...issue.escalation,
            adminReviewStatus: 'reviewed',
          }
        : undefined,
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'review_escalation',
      performedBy: adminDbId,
      performedAt: now,
      notes: 'Escalation reviewed by admin.',
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: 'Escalation reviewed by Administrator. Resolution pending action.',
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Officers & Reporter
    const parties = [issue.reportedBy];
    if (issue.assignedUnitOfficer) parties.push(issue.assignedUnitOfficer);
    if (issue.assignedFieldOfficer) parties.push(issue.assignedFieldOfficer);

    for (const p of parties) {
      await ctx.db.insert('notifications', {
        userId: p,
        issueId: args.issueId,
        title: `Escalation Reviewed - "${issue.title}"`,
        message: `The escalation for "${issue.title}" has been reviewed by the administrator.`,
        type: 'escalation_reviewed',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

export const extendIssueSla = mutation({
  args: {
    issueId: v.id('issues'),
    newDeadline: v.number(),
    notes: v.string(),
    adminId: v.optional(v.string()),
    adminUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminId || args.adminUserId);

    // Auto-log review if pending
    const currentStatus = issue.escalation?.adminReviewStatus;
    if (currentStatus === 'pending' || !currentStatus) {
      await ctx.db.insert('escalationResolutionActions', {
        issueId: args.issueId,
        actionType: 'review_escalation',
        performedBy: adminDbId,
        performedAt: now,
        notes: 'Escalation reviewed automatically during resolution.',
      });
    }

    const oldDeadlineStr = issue.slaDeadline ? new Date(issue.slaDeadline).toISOString() : 'None';
    const newDeadlineStr = new Date(args.newDeadline).toISOString();

    await ctx.db.patch(args.issueId, {
      slaDeadline: args.newDeadline,
      slaExtendedCount: (issue.slaExtendedCount || 0) + 1,
      lastSlaExtensionAt: now,
      slaBreached: false,
      escalation: issue.escalation
        ? {
            ...issue.escalation,
            adminReviewStatus:
              !issue.escalation.adminReviewStatus ||
              issue.escalation.adminReviewStatus === 'pending'
                ? 'reviewed'
                : issue.escalation.adminReviewStatus,
          }
        : undefined,
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'extend_sla',
      performedBy: adminDbId,
      performedAt: now,
      oldValue: oldDeadlineStr,
      newValue: newDeadlineStr,
      notes: args.notes,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: `SLA Deadline extended to ${new Date(args.newDeadline).toLocaleString()}. Reason: ${args.notes}`,
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Reporter and Assigned Officers
    const parties = [issue.reportedBy];
    if (issue.assignedUnitOfficer) parties.push(issue.assignedUnitOfficer);
    if (issue.assignedFieldOfficer) parties.push(issue.assignedFieldOfficer);

    for (const p of parties) {
      await ctx.db.insert('notifications', {
        userId: p,
        issueId: args.issueId,
        title: `SLA Extended - "${issue.title}"`,
        message: `SLA target resolution deadline extended. New deadline: ${new Date(args.newDeadline).toLocaleDateString()}`,
        type: 'sla_extended',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

export const reassignIssueOfficer = mutation({
  args: {
    issueId: v.id('issues'),
    officerType: v.optional(v.union(v.literal('unit_officer'), v.literal('field_officer'))),
    newOfficerProfileId: v.optional(v.string()),
    newUnitOfficerId: v.optional(v.string()),
    newFieldOfficerId: v.optional(v.string()),
    notes: v.string(),
    adminId: v.optional(v.string()),
    adminUserId: v.optional(v.string()),
    confirmCrossCity: v.optional(v.boolean()),
    confirmDepartmentMismatch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminId || args.adminUserId);

    const currentStatus = issue.escalation?.adminReviewStatus;
    if (currentStatus === 'pending' || !currentStatus) {
      await ctx.db.insert('escalationResolutionActions', {
        issueId: args.issueId,
        actionType: 'review_escalation',
        performedBy: adminDbId,
        performedAt: now,
        notes: 'Escalation reviewed automatically during resolution.',
      });
    }

    const effectiveType =
      args.officerType ||
      (args.newUnitOfficerId ? 'unit_officer' : args.newFieldOfficerId ? 'field_officer' : null);

    if (effectiveType === 'unit_officer') {
      const candidateIdStr = args.newOfficerProfileId || args.newUnitOfficerId;
      if (!candidateIdStr) throw new Error('Unit Officer selection required');

      let profile = await ctx.db.get(candidateIdStr as any).catch(() => null);
      if (!profile) {
        profile = await ctx.db
          .query('unitOfficers')
          .withIndex('by_user', (q) => q.eq('userId', candidateIdStr as any))
          .unique();
      }
      if (!profile) throw new Error('Selected Unit Officer profile not found.');

      const officerUser = await ctx.db.get((profile as any).userId);
      if (officerUser && (officerUser as any).accountApproved === false) {
        throw new Error('Selected Unit Officer account is not approved.');
      }

      if (
        (profile as any).city &&
        issue.city &&
        (profile as any).city !== issue.city &&
        !args.confirmCrossCity
      ) {
        return {
          code: 'CROSS_CITY_CONFIRMATION_REQUIRED',
          message: `The selected officer belongs to ${(profile as any).city}, while this issue belongs to ${issue.city}. Cross-city assignment confirmation is required.`,
          officerCity: (profile as any).city,
          issueCity: issue.city,
        };
      }

      const issueDept = issue.department || issue.category;
      if (
        (profile as any).department &&
        issueDept &&
        (profile as any).department !== issueDept &&
        !args.confirmDepartmentMismatch
      ) {
        return {
          code: 'DEPARTMENT_MISMATCH_CONFIRMATION_REQUIRED',
          message: `Issue Department: ${issueDept}. Selected Officer Department: ${(profile as any).department}. Department mismatch confirmation is required.`,
          officerDept: (profile as any).department,
          issueDept,
        };
      }

      const oldUo = issue.assignedUnitOfficer;

      if (oldUo) {
        const oldUoProfile = await ctx.db
          .query('unitOfficers')
          .withIndex('by_user', (q) => q.eq('userId', oldUo))
          .unique();
        if (oldUoProfile) {
          await ctx.db.patch(oldUoProfile._id, {
            activeIssueIds: (oldUoProfile.activeIssueIds || []).filter((id) => id !== args.issueId),
          });
        }
      }

      await ctx.db.patch(profile._id, {
        activeIssueIds: Array.from(
          new Set([...((profile as any).activeIssueIds || []), args.issueId])
        ),
      });

      await ctx.db.patch(args.issueId, {
        assignedUnitOfficer: (profile as any).userId,
        escalation: issue.escalation
          ? {
              ...issue.escalation,
              adminReviewStatus:
                issue.escalation.adminReviewStatus === 'pending' ||
                !issue.escalation.adminReviewStatus
                  ? 'reviewed'
                  : issue.escalation.adminReviewStatus,
            }
          : undefined,
      });

      await ctx.db.insert('escalationResolutionActions', {
        issueId: args.issueId,
        actionType: 'reassign_unit_officer',
        performedBy: adminDbId,
        performedAt: now,
        oldValue: oldUo || '',
        newValue: (profile as any).userId,
        notes: args.notes,
      });

      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: issue.status,
        comment: `Unit Officer reassigned by System Admin to ${(profile as any).fullName || (officerUser as any)?.fullName}. Notes: ${args.notes}`,
        updatedBy: adminDbId,
        role: 'admin',
        attachments: [],
        scope: 'officer_and_citizen',
        createdAt: now,
      });

      return { success: true };
    } else if (effectiveType === 'field_officer') {
      const candidateIdStr = args.newOfficerProfileId || args.newFieldOfficerId;
      if (!candidateIdStr) throw new Error('Field Officer selection required');

      let profile = await ctx.db.get(candidateIdStr as any).catch(() => null);
      if (!profile) {
        profile = await ctx.db
          .query('fieldOfficers')
          .withIndex('by_user', (q) => q.eq('userId', candidateIdStr as any))
          .unique();
      }
      if (!profile) throw new Error('Selected Field Officer profile not found.');

      const officerUser = await ctx.db.get((profile as any).userId);
      if (officerUser && (officerUser as any).accountApproved === false) {
        throw new Error('Selected Field Officer account is not approved.');
      }

      if (
        (profile as any).city &&
        issue.city &&
        (profile as any).city !== issue.city &&
        !args.confirmCrossCity
      ) {
        return {
          code: 'CROSS_CITY_CONFIRMATION_REQUIRED',
          message: `The selected officer belongs to ${(profile as any).city}, while this issue belongs to ${issue.city}. Cross-city assignment confirmation is required.`,
          officerCity: (profile as any).city,
          issueCity: issue.city,
        };
      }

      const issueDept = issue.department || issue.category;
      if (
        (profile as any).department &&
        issueDept &&
        (profile as any).department !== issueDept &&
        !args.confirmDepartmentMismatch
      ) {
        return {
          code: 'DEPARTMENT_MISMATCH_CONFIRMATION_REQUIRED',
          message: `Issue Department: ${issueDept}. Selected Officer Department: ${(profile as any).department}. Department mismatch confirmation is required.`,
          officerDept: (profile as any).department,
          issueDept,
        };
      }

      const oldFo = issue.assignedFieldOfficer;

      if (oldFo) {
        const oldFoProfile = await ctx.db
          .query('fieldOfficers')
          .withIndex('by_user', (q) => q.eq('userId', oldFo))
          .unique();
        if (oldFoProfile) {
          const assigned = (oldFoProfile.assignedIssueIds || []).filter(
            (id) => id !== args.issueId
          );
          await ctx.db.patch(oldFoProfile._id, {
            assignedIssueIds: assigned,
            currentActiveIssues: assigned.length,
          });
        }
      }

      const assigned = Array.from(
        new Set([...((profile as any).assignedIssueIds || []), args.issueId])
      );
      await ctx.db.patch(profile._id, {
        assignedIssueIds: assigned,
        currentActiveIssues: assigned.length,
      });

      await ctx.db.patch(args.issueId, {
        assignedFieldOfficer: (profile as any).userId,
        escalation: issue.escalation
          ? {
              ...issue.escalation,
              adminReviewStatus:
                issue.escalation.adminReviewStatus === 'pending' ||
                !issue.escalation.adminReviewStatus
                  ? 'reviewed'
                  : issue.escalation.adminReviewStatus,
            }
          : undefined,
      });

      await ctx.db.insert('escalationResolutionActions', {
        issueId: args.issueId,
        actionType: 'reassign_field_officer',
        performedBy: adminDbId,
        performedAt: now,
        oldValue: oldFo || '',
        newValue: (profile as any).userId,
        notes: args.notes,
      });

      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: issue.status,
        comment: `Field Officer reassigned by System Admin to ${(profile as any).fullName || (officerUser as any)?.fullName}. Notes: ${args.notes}`,
        updatedBy: adminDbId,
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

export const changeIssueCategory = mutation({
  args: {
    issueId: v.id('issues'),
    newCategory: v.string(),
    notes: v.string(),
    adminId: v.optional(v.string()),
    adminUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminId || args.adminUserId);

    const oldCategory = issue.category;

    await ctx.db.patch(args.issueId, {
      category: args.newCategory,
      department: args.newCategory,
      escalation: issue.escalation
        ? {
            ...issue.escalation,
            adminReviewStatus:
              !issue.escalation.adminReviewStatus ||
              issue.escalation.adminReviewStatus === 'pending'
                ? 'reviewed'
                : issue.escalation.adminReviewStatus,
          }
        : undefined,
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'change_category',
      performedBy: adminDbId,
      performedAt: now,
      oldValue: oldCategory,
      newValue: args.newCategory,
      notes: args.notes,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: `Category changed from "${oldCategory}" to "${args.newCategory}". Notes: ${args.notes}`,
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    return { success: true };
  },
});

export const approveEscalation = mutation({
  args: {
    issueId: v.id('issues'),
    notes: v.string(),
    adminId: v.optional(v.string()),
    adminUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminId || args.adminUserId);

    const targetStatus =
      issue.status === 'escalated'
        ? issue.escalation?.prevIssueStatus || 'in_progress'
        : issue.status;

    await ctx.db.patch(args.issueId, {
      status: targetStatus,
      escalatedToAdmin: false,
      escalation: issue.escalation
        ? {
            ...issue.escalation,
            resolved: true,
            resolvedAt: now,
            resolutionNote: args.notes,
            adminReviewStatus: 'resolved',
          }
        : undefined,
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'approve_escalation',
      performedBy: adminDbId,
      performedAt: now,
      notes: args.notes,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: targetStatus,
      comment: `Escalation approved and resolved by System Admin. Resolution: ${args.notes}`,
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    const notifyUsers = [issue.assignedUnitOfficer, issue.assignedFieldOfficer].filter(Boolean);
    for (const p of notifyUsers) {
      await ctx.db.insert('notifications', {
        userId: p as string,
        issueId: args.issueId,
        title: `Escalation Resolved - "${issue.title}"`,
        message: `The escalation review has been resolved. Action: ${args.notes}`,
        type: 'escalation_resolved',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

export const rejectEscalation = mutation({
  args: {
    issueId: v.id('issues'),
    reason: v.string(),
    adminId: v.optional(v.string()),
    adminUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found.');
    if (!issue.escalation) {
      throw new Error('This issue does not have an active escalation.');
    }

    const reason = args.reason.trim();
    if (!reason) {
      throw new Error('A reason for rejecting the escalation response is required.');
    }

    const now = Date.now();
    const adminDbId = await resolveAdminUserId(ctx, args.adminId || args.adminUserId);

    await ctx.db.patch(args.issueId, {
      escalatedToAdmin: true,
      escalation: {
        ...issue.escalation,
        resolved: false,
        resolvedAt: undefined,
        resolutionNote: undefined,
        adminReviewStatus: 'reviewed',
        responseRejectedAt: now,
        responseRejectedBy: adminDbId,
        responseRejectionReason: reason,
      } as any,
    });

    await ctx.db.insert('escalationResolutionActions', {
      issueId: args.issueId,
      actionType: 'reject_escalation_response',
      performedBy: adminDbId,
      performedAt: now,
      oldValue: issue.escalation.adminReviewStatus || 'pending',
      newValue: 'reviewed',
      notes: reason,
    });

    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: `Escalation response rejected by System Admin. Further corrective action is required. Reason: ${reason}`,
      updatedBy: adminDbId,
      role: 'admin',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    const notifyUsers = [issue.assignedUnitOfficer, issue.assignedFieldOfficer].filter(Boolean);
    for (const p of notifyUsers) {
      await ctx.db.insert('notifications', {
        userId: p as string,
        issueId: args.issueId,
        title: 'Further Escalation Action Required',
        message: `The submitted response for escalation on issue ${(issue as any).code || (issue as any).ticket_id || issue.title} was not accepted. Further corrective action is required. Reason: ${reason}`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    return {
      success: true,
      issueStatus: issue.status,
      escalationStatus: 'reviewed',
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

    // Calculate Average Delay Hours for breached issues
    const breachedIssues = issues.filter(
      (i) =>
        i.slaDeadline &&
        i.slaDeadline < now &&
        !['resolved', 'closed', 'rejected', 'withdrawn'].includes((i.status || '').toLowerCase())
    );
    const totalDelayMs = breachedIssues.reduce(
      (sum, i) => sum + (now - (i.slaDeadline as number)),
      0
    );
    const averageDelayHours =
      breachedIssues.length > 0
        ? Math.round(totalDelayMs / (1000 * 60 * 60) / breachedIssues.length)
        : 0;

    // Escalations by category
    const categoryCounts: Record<string, number> = {};
    escalatedIssues.forEach((i) => {
      const cat = i.escalation?.category || 'other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const escalationsByCategory = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    // Escalations by department (issue category)
    const deptCounts: Record<string, number> = {};
    escalatedIssues.forEach((i) => {
      const dept = i.category || 'Other';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    const escalationsByDepartment = Object.entries(deptCounts).map(([department, count]) => ({
      department,
      count,
    }));

    // Most delayed officers
    const officerDelayMap = new Map();
    for (const issue of breachedIssues) {
      const delayHours = (now - (issue.slaDeadline as number)) / (1000 * 60 * 60);
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
      actions.map(async (a: any) => {
        const performer = await ctx.db.get(a.performedBy);

        return {
          id: a._id,

          issueId: a.issueId,

          type: a.actionType,

          performedBy: performer ? (performer as any).fullName : 'System Admin',

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

    // Escalation Audit Log
    await auditIssueActionMobile(ctx, {
      issue,

      performedByUserId: args.adminUserId as Id<'users'>,
      performerRole: 'unit_officer',

      action: 'issue_escalated',
      actionCategory: 'escalation',

      oldValue: {
        status: issue.status,
        escalatedToAdmin: issue.escalatedToAdmin ?? false,
        escalation: issue.escalation ?? null,
      },

      newValue: {
        status: 'escalated',
        escalatedToAdmin: true,

        escalation: {
          category: args.escalationCategory,
          priority: args.escalationPriority,
          reason: args.escalationReason,
          escalatedBy: args.adminUserId,
          escalatedAt: now,
          prevIssueStatus: args.prevIssueStatus,
          resolved: false,
          adminReviewStatus: 'pending',
          escalationCount: (issue.escalation?.escalationCount || 0) + 1,
        },
      },

      reason: args.escalationReason,

      description:
        `Issue ${issue.issueCode} escalated to System Admin by Unit Officer. ` +
        `Category: ${args.escalationCategory}. ` +
        `Priority: ${args.escalationPriority}.`,
    });

    return { success: true };
  },
});
