import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Helper function to resolve the admin's database user ID (v.id("users"))
// even if a mock or invalid ID (like "2") is passed from the client.
async function resolveAdminUserId(ctx, adminUserIdStr) {
  if (adminUserIdStr) {
    try {
      const user = await ctx.db.get(adminUserIdStr);
      if (user && user.role === 'admin') {
        return user._id;
      }
    } catch (e) {
      // Not a valid ID format or not found
    }
  }

  // Fallback 1: search for first admin in users table
  const firstAdmin = await ctx.db
    .query('users')
    .withIndex('by_role', (q) => q.eq('role', 'admin'))
    .first();
  if (firstAdmin) {
    return firstAdmin._id;
  }

  // Fallback 2: filter query for admin role
  const anyAdmin = await ctx.db
    .query('users')
    .filter((q) => q.eq(q.field('role'), 'admin'))
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

export const getOfficerCommandCenterData = query({
  args: {},
  handler: async (ctx) => {
    const rawUnitOfficers = await ctx.db.query('unitOfficers').collect();
    const rawFieldOfficers = await ctx.db.query('fieldOfficers').collect();
    const rawIssues = await ctx.db.query('issues').collect();

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
      ...unitOfficers.map((o) => ({
        id: o.userId,
        userId: o.userId,
        fullName: o.fullName,
        full_name: o.fullName, // alias for backwards compatibility
        email: o.email,
        phone: o.phone,
        role: 'unit_officer',
        city: o.city,
        state: o.state,
        district: o.district,
        department: o.department,
        ward_zone: o.city || o.district, // alias
        profilePictureUrl: o.profilePictureUrl,
        rating: o.rating,
        efficiencyScore: o.efficiencyScore,
        avgResolutionTime: o.avgResolutionTime,
        accountApproved: o.accountApproved,
        specialisations: [],
        currentActiveIssues: o.activeIssueIds?.length ?? 0,
        maxIssueCapacity: 50,
      })),
      ...fieldOfficers.map((o) => ({
        id: o.userId,
        userId: o.userId,
        fullName: o.fullName,
        full_name: o.fullName, // alias for backwards compatibility
        email: o.email,
        phone: o.phone,
        role: 'field_officer',
        city: o.city,
        state: o.state,
        district: o.district,
        department: o.department,
        ward_zone: o.city || o.district, // alias
        profilePictureUrl: o.profilePictureUrl,
        rating: o.rating,
        efficiencyScore: o.efficiencyScore,
        avgResolutionTime: o.avgResolutionTime,
        accountApproved: o.accountApproved,
        specialisations: o.specialisations ?? [],
        currentActiveIssues: o.currentActiveIssues ?? 0,
        maxIssueCapacity: o.maxIssueCapacity ?? 15,
      })),
    ];

    const now = Date.now();

    // Build officerWorkload
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

      assignedIssues.forEach((issue) => {
        const status = (issue.status || '').toLowerCase().trim();

        // Overdue rule: slaDeadline exists, is in the past, and issue is not resolved, closed, rejected, withdrawn
        const isOverdue =
          issue.slaDeadline &&
          issue.slaDeadline < now &&
          !['resolved', 'closed', 'rejected', 'withdrawn'].includes(status);

        if (isOverdue) {
          overdue++;
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
          // Unit officer
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

      // Workload Status
      let workloadStatus = 'balanced';
      if (officer.role === 'field_officer') {
        const activeCount = officer.currentActiveIssues;
        const capacity = officer.maxIssueCapacity || 15;
        const workloadPct = capacity > 0 ? (activeCount / capacity) * 100 : 0;
        if (activeCount >= capacity || workloadPct >= 85) {
          workloadStatus = 'overloaded';
        } else if (activeCount <= 1 || workloadPct <= 25) {
          workloadStatus = 'underutilized';
        }
      } else {
        // Unit Officer workload rules
        const activeCount = assignedIssues.filter(
          (i) =>
            !['resolved', 'closed', 'rejected', 'withdrawn'].includes(
              (i.status || '').toLowerCase().trim()
            )
        ).length;
        if (activeCount >= 15) {
          workloadStatus = 'overloaded';
        } else if (activeCount <= 4) {
          workloadStatus = 'underutilized';
        }
      }

      return {
        officer,
        total,
        pending,
        inProgress,
        resolved,
        rejected,
        overdue,
        issues: assignedIssues,
        completionRate,
        avgResolutionTime: officer.avgResolutionTime ?? 0,
        workloadStatus,
        rating: officer.rating ?? 0,
      };
    });

    // Stats calculations
    const totalOfficers = combinedOfficers.length;
    const totalUnitOfficers = unitOfficers.length;
    const totalFieldOfficers = fieldOfficers.length;

    const assignedIssues = rawIssues.filter(
      (i) => i.assignedUnitOfficer || i.assignedFieldOfficer
    ).length;

    const overdueIssues = rawIssues.filter((issue) => {
      const status = (issue.status || '').toLowerCase().trim();
      return (
        issue.slaDeadline &&
        issue.slaDeadline < now &&
        !['resolved', 'closed', 'rejected', 'withdrawn'].includes(status)
      );
    }).length;

    const balancedCount = officerWorkload.filter((ow) => ow.workloadStatus === 'balanced').length;
    const overloadedCount = officerWorkload.filter(
      (ow) => ow.workloadStatus === 'overloaded'
    ).length;
    const underutilizedCount = officerWorkload.filter(
      (ow) => ow.workloadStatus === 'underutilized'
    ).length;

    const avgCompletion =
      totalOfficers > 0
        ? Math.round(
            officerWorkload.reduce((sum, ow) => sum + ow.completionRate, 0) / totalOfficers
          )
        : 0;

    return {
      unitOfficers,
      fieldOfficers,
      officers: combinedOfficers,
      issues: rawIssues,
      officerWorkload,
      stats: {
        totalOfficers,
        totalUnitOfficers,
        totalFieldOfficers,
        assignedIssues,
        overdueIssues,
        balancedCount,
        overloadedCount,
        underutilizedCount,
        avgCompletion,
      },
    };
  },
});

export const getAssignableOfficers = query({
  args: {},
  handler: async (ctx) => {
    const rawUnitOfficers = await ctx.db.query('unitOfficers').collect();
    const rawFieldOfficers = await ctx.db.query('fieldOfficers').collect();

    const unitOfficers = await Promise.all(
      rawUnitOfficers.map(async (officer) => {
        const profilePictureUrl = officer.profilePicture
          ? await ctx.storage.getUrl(officer.profilePicture)
          : null;
        return {
          _id: officer._id,
          userId: officer.userId,
          fullName: officer.fullName,
          email: officer.email,
          phone: officer.phone,
          city: officer.city,
          state: officer.state,
          district: officer.district,
          department: officer.department,
          rating: officer.rating ?? 0,
          efficiencyScore: officer.efficiencyScore ?? 0,
          activeIssueCount: officer.activeIssueIds?.length ?? 0,
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
          _id: officer._id,
          userId: officer.userId,
          fullName: officer.fullName,
          email: officer.email,
          phone: officer.phone,
          city: officer.city,
          state: officer.state,
          district: officer.district,
          department: officer.department,
          specialisations: officer.specialisations ?? [],
          currentActiveIssues: officer.currentActiveIssues ?? 0,
          maxIssueCapacity: officer.maxIssueCapacity ?? 15,
          rating: officer.rating ?? 0,
          efficiencyScore: officer.efficiencyScore ?? 0,
          profilePictureUrl,
        };
      })
    );

    return {
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
    } else {
      const fo = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.officerUserId))
        .unique();
      if (!fo) throw new Error('Field Officer profile not found');

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
      const newUO = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.newOfficerUserId))
        .unique();
      if (!newUO) throw new Error('New Unit Officer profile not found');

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

      // Assign new officer
      await ctx.db.patch(args.issueId, {
        assignedUnitOfficer: args.newOfficerUserId,
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
    } else {
      // field_officer
      const oldOfficerUserId = issue.assignedFieldOfficer;
      const newFO = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.newOfficerUserId))
        .unique();
      if (!newFO) throw new Error('New Field Officer profile not found');

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
