import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';

export const getUnitOfficerByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
  },
});

export const getUnitOfficerIssues = query({
  args: { userId: v.id('users') },

  handler: async (ctx, args) => {
    // 1. Get Unit Officer
    const officer = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (!officer) return [];

    // 2. Fetch Issues
    const issues = await Promise.all(officer.activeIssueIds.map((id) => ctx.db.get(id)));

    const validIssues = issues.filter(Boolean);

    // 3. Fetch Citizen Data for each issue
    const enrichedIssues = await Promise.all(
      validIssues.map(async (issue) => {
        if (!issue) return null;

        // reportedBy = userId of citizen
        const citizen = await ctx.db
          .query('citizens')
          .withIndex('by_user', (q) => q.eq('userId', issue.reportedBy))
          .unique();

        // Fetch Field Officer using userId stored in issue
        let fieldOfficerDetails = null;

        if (issue.assignedFieldOfficer) {
          const fo = await ctx.db
            .query('fieldOfficers')
            .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer as Id<'users'>))
            .unique();

          if (fo) {
            const foUser = await ctx.db.get(fo.userId);

            fieldOfficerDetails = {
              _id: fo._id,
              userId: fo.userId,
              fullName: foUser?.fullName || fo.fullName,
              email: fo.email,
              phone: fo.phone,
              rating: fo.rating,
              efficiencyScore: fo.efficiencyScore,
              currentActiveIssues: fo.currentActiveIssues,
              maxIssueCapacity: fo.maxIssueCapacity,
              workloadPercentage: (fo.currentActiveIssues / fo.maxIssueCapacity) * 100,
              specialisations: fo.specialisations,
            };
          }
        }

        return {
          ...issue,

          citizenDetails: {
            fullName: citizen?.fullName ?? 'Unknown',
            email: citizen?.email ?? 'N/A',
            phone: citizen?.phone ?? 'N/A',
          },
          fieldOfficerDetails,
        };
      })
    );

    return enrichedIssues.filter(Boolean);
  },
});

export const getIssueById = query({
  args: {
    issueId: v.id('issues'),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);

    if (!issue) return null;

    // Fetch Citizen Details
    const citizen = await ctx.db
      .query('citizens')
      .withIndex('by_user', (q) => q.eq('userId', issue.reportedBy))
      .unique();

    // Fetch Field Officer using userId stored in issue
    let fieldOfficerDetails = null;

    if (issue.assignedFieldOfficer) {
      const fo = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer as Id<'users'>))
        .unique();

      if (fo) {
        const foUser = await ctx.db.get(fo.userId);

        fieldOfficerDetails = {
          _id: fo._id,
          userId: fo.userId,
          fullName: foUser?.fullName || fo.fullName,
          email: fo.email,
          phone: fo.phone,
          rating: fo.rating,
          efficiencyScore: fo.efficiencyScore,
          currentActiveIssues: fo.currentActiveIssues,
          maxIssueCapacity: fo.maxIssueCapacity,
          workloadPercentage: (fo.currentActiveIssues / fo.maxIssueCapacity) * 100,
          specialisations: fo.specialisations,
        };
      }
    }

    // Main preview (first photo)
    const photoUrl = await Promise.all(
      (issue.photos || []).map(async (fileId) => {
        const url = await ctx.storage.getUrl(fileId);
        return url;
      })
    );

    // Resolve BEFORE photos
    const beforePhotos = await Promise.all(
      (issue.beforePhotos || []).map(async (fileId) => {
        const url = await ctx.storage.getUrl(fileId);
        return url;
      })
    );

    // Resolve AFTER photos
    const afterPhotos = await Promise.all(
      (issue.afterPhotos || []).map(async (fileId) => {
        const url = await ctx.storage.getUrl(fileId);
        return url;
      })
    );

    // Citizen Video Evidence (if exists)
    let videoUrl = null;
    if (issue.videos) {
      videoUrl = await ctx.storage.getUrl(issue.videos);
    }

    return {
      ...issue,
      citizenDetails: {
        fullName: citizen?.fullName ?? 'Unknown',
        email: citizen?.email ?? 'N/A',
        phone: citizen?.phone ?? 'N/A',
      },
      photoUrl,
      beforePhotos,
      afterPhotos,
      videoUrl,
      fieldOfficerDetails,
    };
  },
});

export const verifyIssue = mutation({
  args: {
    issueId: v.id('issues'),

    issueCode: v.string(),

    verificationChecklist: v.object({
      locationValid: v.boolean(),
      isWithinJurisdiction: v.boolean(),
      hasSufficientEvidence: v.boolean(),
      notDuplicate: v.boolean(),
    }),

    notes: v.optional(v.string()),

    slaDeadline: v.number(),

    UOName: v.string(),

    status: v.string(),

    verifiedBy: v.id('users'),

    issueName: v.string(),

    reporterId: v.id('users'),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    // Update Issue Status
    await ctx.db.patch(args.issueId, {
      status: 'verified',

      verificationChecklist: {
        ...args.verificationChecklist,
        notes: args.notes,
        verifiedBy: args.verifiedBy,
        verifiedAt: Date.now(),
      },

      slaDeadline: args.slaDeadline,
    });

    if (args.status === 'reopened') {
      // Add the Issue Timeline Update for the reopened issues
      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: 'verified',
        comment: `Issue verified again by Unit Officer ${args.UOName} after reopening and ready for assignment.`,
        role: 'unit_officer',
        attachments: [],
        updatedBy: args.verifiedBy,
        scope: 'officer_and_citizen',
        createdAt: Date.now(),
      });

      // Add Notification to Citizen for the reopened issues
      await ctx.db.insert('notifications', {
        userId: args.reporterId, // citizen
        issueId: args.issueId,
        title: `Verified Re-opened Issue - "${args.issueName} (${args.issueCode})"`,
        message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been successfully verified again by the Unit Officer ${args.UOName} after reopening and will be assigned shortly.`,
        type: 'verified',
        read: false,
        createdAt: Date.now(),
      });

      // Add Notification to Unit Officer for the reopenened issues
      await ctx.db.insert('notifications', {
        userId: args.verifiedBy,
        issueId: args.issueId,
        title: `Verified Re-opened Issue - "${args.issueName} (${args.issueCode})"`,
        message: `You have successfully verified again the issue "${args.issueName}" with Issue Code "${args.issueCode}" after reopening.`,
        type: 'verified',
        read: false,
        createdAt: Date.now(),
      });
    } else {
      // Add the Issue Timeline Update for the verified issues
      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: 'verified',
        comment: `Issue verified by Unit Officer ${args.UOName} and ready for assignment.`,
        role: 'unit_officer',
        attachments: [],
        updatedBy: args.verifiedBy,
        scope: 'officer_and_citizen',
        createdAt: Date.now(),
      });

      // Add Notification to Citizen for the verified issues
      await ctx.db.insert('notifications', {
        userId: args.reporterId, // citizen
        issueId: args.issueId,
        title: `Verified Issue - "${args.issueName} (${args.issueCode})"`,
        message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been successfully verified by the Unit Officer ${args.UOName} and will be assigned shortly.`,
        type: 'verified',
        read: false,
        createdAt: Date.now(),
      });

      // Add Notification to Unit Officer for the verified issues
      await ctx.db.insert('notifications', {
        userId: args.verifiedBy,
        issueId: args.issueId,
        title: `Verified Issue - "${args.issueName} (${args.issueCode})"`,
        message: `You have successfully verified the issue "${args.issueName}" with Issue Code "${args.issueCode}".`,
        type: 'verified',
        read: false,
        createdAt: Date.now(),
      });
    }
  },
});

export const rejectIssue = mutation({
  args: {
    issueId: v.id('issues'),
    issueCode: v.string(),
    reason: v.string(),
    comment: v.string(),
    UOName: v.string(),
    status: v.string(),
    rejectedBy: v.id('users'),
    issueName: v.string(),
    reporterId: v.id('users'),
    isSlaRejection: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);

    // Fallback for missing issue
    if (!issue) {
      throw new Error('Issue not found');
    }

    // Fallback for already rejected issue (if any)
    if (issue.status === 'rejected') {
      throw new Error('Issue already rejected');
    }

    const now = Date.now();

    // Update issue status to "rejected" and add rejection details
    await ctx.db.patch(args.issueId, {
      status: 'rejected',
      rejection: {
        reason: args.reason,
        comment: args.comment ?? undefined,
        rejectedBy: args.rejectedBy,
        rejectedAt: now,
      },
      // Clear any existing assignments
      assignedFieldOfficer: null,
    });

    if (args.status === 'reopened') {
      // Add the Issue Timeline Update for reopened issue
      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: 'rejected',
        comment: `The Issue "${args.issueName}" with Issue Code "${args.issueCode}" has been rejected again by the Unit Officer ${args.UOName} after issue reopened by citizen.\nReason: ${args.reason}\nComment: ${args.comment}`,
        updatedBy: args.rejectedBy,
        role: 'unit_officer',
        attachments: [],
        scope: 'citizen',
        createdAt: now,
      });

      // Add Notification to Citizen for reopened issue
      await ctx.db.insert('notifications', {
        userId: args.reporterId, // citizen
        issueId: args.issueId,
        title: `Reopened Issue Rejected - "${args.issueName} (${args.issueCode})"`,
        message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been rejected again by the Unit Officer ${args.UOName} after issue reopened by citizen`,
        type: 'rejected',
        read: false,
        createdAt: now,
      });

      // Add Notification to Unit Officer for reopened issue
      await ctx.db.insert('notifications', {
        userId: args.rejectedBy,
        issueId: args.issueId,
        title: `Reopened Issue Rejected - "${args.issueName} (${args.issueCode})"`,
        message: `You have successfully rejected again after reopening of the issue "${args.issueName}" with Issue Code "${args.issueCode}".`,
        type: 'rejected',
        read: false,
        createdAt: now,
      });
    } else if (args.isSlaRejection) {
      // Add the Issue Timeline Update for rejected issue after missing SLA Deadline
      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: 'rejected',
        comment: `The Issue "${args.issueName}" with Issue Code "${args.issueCode}" has been rejected by the Unit Officer ${args.UOName}.\nReason: ${args.reason}\nComment: ${args.comment}\n We are very sorry for the inconvenience caused due to the delay in handling the issue.`,
        updatedBy: args.rejectedBy,
        role: 'unit_officer',
        attachments: [],
        scope: 'citizen',
        createdAt: now,
      });

      // Add Notification to Citizen for rejected issue after missing SLA Deadline
      await ctx.db.insert('notifications', {
        userId: args.reporterId, // citizen
        issueId: args.issueId,
        title: `Rejected Issue - "${args.issueName} (${args.issueCode})"`,
        message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been rejected by the Unit Officer ${args.UOName}.`,
        type: 'rejected',
        read: false,
        createdAt: now,
      });

      // Add Notification to Unit Officer for rejected issue after missing SLA Deadline
      await ctx.db.insert('notifications', {
        userId: args.rejectedBy,
        issueId: args.issueId,
        title: `Rejected Issue - "${args.issueName} (${args.issueCode})"`,
        message: `You have successfully rejected the issue "${args.issueName}" with Issue Code "${args.issueCode}" after SLA breach.`,
        type: 'rejected',
        read: false,
        createdAt: now,
      });
    } else {
      // Add the Issue Timeline Update for rejected issue
      await ctx.db.insert('issueUpdates', {
        issueId: args.issueId,
        status: 'rejected',
        comment: `The Issue "${args.issueName}" with Issue Code "${args.issueCode}" has been rejected by the Unit Officer ${args.UOName}.\nReason: ${args.reason}\nComment: ${args.comment}`,
        updatedBy: args.rejectedBy,
        role: 'unit_officer',
        attachments: [],
        scope: 'citizen',
        createdAt: now,
      });

      // Add Notification to Citizen for rejected issue
      await ctx.db.insert('notifications', {
        userId: args.reporterId, // citizen
        issueId: args.issueId,
        title: `Rejected Issue - "${args.issueName} (${args.issueCode})"`,
        message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been rejected by the Unit Officer ${args.UOName}.`,
        type: 'rejected',
        read: false,
        createdAt: now,
      });

      // Add Notification to Unit Officer for rejected issue
      await ctx.db.insert('notifications', {
        userId: args.rejectedBy,
        issueId: args.issueId,
        title: `Rejected Issue - "${args.issueName} (${args.issueCode})"`,
        message: `You have successfully rejected the issue "${args.issueName}" with Issue Code "${args.issueCode}".`,
        type: 'rejected',
        read: false,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

export const getAssignedFieldOfficers = query({
  args: {
    userId: v.id('users'),
  },

  handler: async (ctx, args) => {
    // Find Unit Officer using userId
    const unitOfficer = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (!unitOfficer) return [];

    // Fetch Field Officers using stored _id
    const fieldOfficers = await Promise.all(
      unitOfficer.assignedFieldOfficers.map((foId) => ctx.db.get(foId))
    );

    // Clean nulls (if any)
    return fieldOfficers.filter(Boolean);
  },
});

export const assignIssueToFieldOfficer = mutation({
  args: {
    issueId: v.id('issues'),
    fieldOfficerId: v.id('fieldOfficers'), // fieldOfficers table _id
    assignedBy: v.id('users'), // Unit Officer userId

    issueTitle: v.string(),
    issueCode: v.string(),

    isReassign: v.optional(v.boolean()),
    previousFieldOfficerName: v.optional(v.string()),
    reassignmentReason: v.optional(v.string()),
    reassignmentComment: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const fieldOfficer = await ctx.db.get(args.fieldOfficerId);
    if (!fieldOfficer) throw new Error('Field officer not found');

    const unitOfficer = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.assignedBy))
      .unique();

    if (!unitOfficer) throw new Error('Unit officer not found');

    const now = Date.now();

    // Handle reassignmet
    if (args.isReassign && issue.assignedFieldOfficer) {
      const prevFO = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer as Id<'users'>))
        .unique();

      if (prevFO) {
        // Notification to Previous Field Officer
        await ctx.db.insert('notifications', {
          userId: prevFO.userId,
          issueId: args.issueId,
          title: `Issue Reassigned - "${args.issueTitle} (${args.issueCode})"`,
          message: `Issue "${args.issueTitle}" with Issue Code "${args.issueCode}" has been reassigned from you by Unit Officer ${unitOfficer.fullName} to Field Officer ${fieldOfficer.fullName}.${
            args.reassignmentReason ? `\nReason: ${args.reassignmentReason}.` : ''
          }${args.reassignmentComment ? `\nComment: ${args.reassignmentComment}` : ''}`,
          type: 'assigned',
          read: false,
          createdAt: now,
        });

        // Remove the issue from previous field officer's assigned issues
        const updatedPrevIssues = prevFO.assignedIssueIds.filter((id) => id !== args.issueId);

        await ctx.db.patch(prevFO._id, {
          assignedIssueIds: updatedPrevIssues,
          currentActiveIssues: updatedPrevIssues.length,
        });
      }
    }

    // Updates the assigned status of the issue
    await ctx.db.patch(args.issueId, {
      status: 'assigned',

      // store FO userId
      assignedFieldOfficer: fieldOfficer.userId,
    });

    // Store the assigned issues id in the field officer
    let updatedAssignedIssues = fieldOfficer.assignedIssueIds;

    // Update the list of assigned issues
    if (!fieldOfficer.assignedIssueIds.includes(args.issueId)) {
      updatedAssignedIssues = [...fieldOfficer.assignedIssueIds, args.issueId];
    }

    // Update the field officer
    await ctx.db.patch(args.fieldOfficerId, {
      assignedIssueIds: updatedAssignedIssues,
      currentActiveIssues: updatedAssignedIssues.length,
    });

    // Custom Issue Update Comment for assigned issue
    const comment = args.isReassign
      ? `Issue reassigned from ${
          args.previousFieldOfficerName ?? 'previous field officer'
        } to ${fieldOfficer.fullName}.${
          args.reassignmentReason ? `\nReason: ${args.reassignmentReason}.` : ''
        }${args.reassignmentComment ? `\nComment: ${args.reassignmentComment}` : ''}`
      : `Issue assigned to Field Officer ${fieldOfficer.fullName}.`;

    // Add the Issue Timeline Update for assigned issue
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'assigned',
      comment,
      role: 'unit_officer',
      attachments: [],
      updatedBy: args.assignedBy,
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notification to Field Officer
    await ctx.db.insert('notifications', {
      userId: fieldOfficer.userId,
      issueId: args.issueId,
      title: `Issue Assigned to You - "${args.issueTitle} (${args.issueCode})"`,
      message: `You have been assigned issue "${args.issueTitle}" with Issue Code "${args.issueCode}" by Unit Officer ${unitOfficer.fullName}.`,
      type: 'assigned',
      read: false,
      createdAt: now,
    });

    // Notification to Unit Officer
    await ctx.db.insert('notifications', {
      userId: args.assignedBy,
      issueId: args.issueId,
      title: `Issue Assigned to FO ${fieldOfficer.fullName} - "${args.issueTitle} (${args.issueCode})"`,
      message: `You assigned issue "${args.issueTitle}" with Issue Code "${args.issueCode}" to ${fieldOfficer.fullName}.`,
      type: 'assigned',
      read: false,
      createdAt: now,
    });

    // Notification to Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
      title: `Issue Assigned to Field Officer - "${args.issueTitle} (${args.issueCode})"`,
      message: `Your issue "${args.issueTitle}" with Issue Code "${args.issueCode}" has been assigned to a Field Officer ${fieldOfficer.fullName} for further actions.`,
      type: 'assigned',
      read: false,
      createdAt: now,
    });

    return {
      success: true,
      assignedFieldOfficerUserId: fieldOfficer.userId,
      assignedFieldOfficerName: fieldOfficer.fullName,
    };
  },
});

export const approveIssueResolution = mutation({
  args: {
    issueId: v.id('issues'),
    updatedBy: v.id('users'),
    unitOfficerName: v.string(),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();

    // Update issue status
    await ctx.db.patch(args.issueId, {
      status: 'resolved',
      resolvedAt: now,
    });

    // Add issue update
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'resolved',
      comment: `Issue resolution of the issue "${issue.title}" (Issue Code: ${issue.issueCode}) has been verified and approved by Unit Officer ${args.unitOfficerName}.`,
      updatedBy: args.updatedBy,
      role: 'unit_officer',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Sending Notifications to the relevant users

    // For Citizen
    if (issue.reportedBy) {
      await ctx.db.insert('notifications', {
        userId: issue.reportedBy,
        issueId: args.issueId,
        title: `Issue "${issue.title}" (Issue Code: ${issue.issueCode}) Resolved`,
        message: `Your reported issue "${issue.title}" (Issue Code: ${issue.issueCode}) has been successfully resolved and closed by the Unit Officer ${args.unitOfficerName}.`,
        type: 'resolution',
        read: false,
        createdAt: now,
      });
    }

    // For Field Officer
    if (issue.assignedFieldOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedFieldOfficer,
        issueId: args.issueId,
        title: `Issue "${issue.title}" (Issue Code: ${issue.issueCode}) Resolution Verified`,
        message: `Your submitted work has been verified by the Unit Officer ${args.unitOfficerName} and marked as resolved.`,
        type: 'resolution',
        read: false,
        createdAt: now,
      });
    }

    // For Unit Officer
    await ctx.db.insert('notifications', {
      userId: args.updatedBy,
      issueId: args.issueId,
      title: `Issue "${issue.title}" (Issue Code: ${issue.issueCode}) Resolved`,
      message: `You have successfully marked the issue as resolved.`,
      type: 'resolution',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});

export const requestRework = mutation({
  args: {
    issueId: v.id('issues'),
    updatedBy: v.id('users'),
    unitOfficerName: v.string(),
    note: v.string(),
    reasons: v.optional(v.array(v.string())),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const now = Date.now();

    const reasonTags =
      args.reasons && args.reasons.length > 0 ? `[Issues: ${args.reasons.join(', ')}] ` : '';

    const fullNote = `Rework Note: ${args.note.trim()}${reasonTags ? `\nReason(s): ${reasonTags}` : ''}`;

    // Update issue status with rework details
    await ctx.db.patch(args.issueId, {
      status: 'rework_required',
      reworkNote: args.note.trim(),
      reworkReasons: args.reasons || [],
      lastReworkRequestedAt: now,
    });

    // Add issue update in issue timeline
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'rework_required',
      comment: `Rework requested by Unit Officer ${args.unitOfficerName}:\n${fullNote}`,
      updatedBy: args.updatedBy,
      role: 'unit_officer',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Field Officer
    if (issue.assignedFieldOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedFieldOfficer,
        issueId: args.issueId,
        title: `Rework Required for Issue "${issue.title}" (Issue Code: ${issue.issueCode})`,
        message: `Your submitted work requires corrections by Unit Officer ${args.unitOfficerName}.\n\nNote: ${args.note.trim()}\nReason(s): ${reasonTags}`,
        type: 'rework',
        read: false,
        createdAt: now,
      });
    }

    // Notify Citizen
    if (issue.reportedBy) {
      await ctx.db.insert('notifications', {
        userId: issue.reportedBy,
        issueId: args.issueId,
        title: `Issue Update for Issue "${issue.title}" (Issue Code: ${issue.issueCode})`,
        message: `Your reported issue "${issue.title}" has been sent back for correction by Unit Officer ${args.unitOfficerName}.\nWe sincerely apologize for any inconvenience caused due to delay in the resolution of this issue.`,
        type: 'rework',
        read: false,
        createdAt: now,
      });
    }

    // Notify Unit Officer
    await ctx.db.insert('notifications', {
      userId: args.updatedBy,
      issueId: args.issueId,
      title: `Rework Requested for Issue "${issue.title}" (Issue Code: ${issue.issueCode})`,
      message: `You have requested rework for issue "${issue.title}" with Issue Code "${issue.issueCode}".`,
      type: 'rework',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});

export const extendSLAOverdue = mutation({
  args: {
    issueId: v.id('issues'),
    issueCode: v.string(),
    issueName: v.string(),

    extendedBy: v.id('users'),
    extendedByName: v.string(),

    reporterId: v.id('users'),

    assignedFieldOfficerUserId: v.optional(v.id('users')),
    assignedFieldOfficerName: v.optional(v.string()),

    reason: v.string(),
    comment: v.string(),
    newSlaDeadline: v.number(),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);

    // Fallback for null values in issue
    if (!issue) {
      throw new Error('Issue not found');
    }

    // Fallback for resolved or rejected issues
    if (['resolved', 'closed', 'rejected', 'withdrawn'].includes(issue.status)) {
      throw new Error('Cannot extend SLA for a completed or rejected issue');
    }

    const now = Date.now();

    // Update Issue SLA Deadline
    await ctx.db.patch(args.issueId, {
      slaDeadline: args.newSlaDeadline,
      slaExtension: {
        reason: args.reason,
        comment: args.comment,
        extendedBy: args.extendedBy,
        extendedAt: now,
        newSlaDeadline: args.newSlaDeadline,
      },
      slaBreachedCount: (issue.slaBreachedCount || 0) + 1,
    });

    // Add issue update in the issue timeline
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status,
      comment: `SLA deadline extended by Unit Officer ${args.extendedByName}.\nReason: ${
        args.reason
      }\nNote: ${args.comment}\nNew SLA Deadline: ${new Date(
        args.newSlaDeadline
      ).toLocaleString()}\nWe sincerely apologize for any inconvenience caused due to delay in the resolution of this issue.`,
      updatedBy: args.extendedBy,
      role: 'unit_officer',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notification to the assigned Field Officer
    if (args.assignedFieldOfficerUserId) {
      await ctx.db.insert('notifications', {
        userId: String(args.assignedFieldOfficerUserId),
        issueId: args.issueId,
        title: 'SLA deadline extended',
        message: `The SLA deadline for issue "${args.issueName}" with Issue Code "${args.issueCode}" has been extended.`,
        type: 'sla_alert',
        read: false,
        createdAt: now,
      });
    }

    // Notification to the Citizen
    await ctx.db.insert('notifications', {
      userId: String(args.reporterId),
      issueId: args.issueId,
      title: 'SLA deadline updated',
      message: `The resolution timeline for your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been extended.We sincerely apologize for any inconvenience caused due to delay in the resolution of this issue.`,
      type: 'sla_alert',
      read: false,
      createdAt: now,
    });

    // Notification to the Unit Officer who extended the SLA deadline
    await ctx.db.insert('notifications', {
      userId: String(args.extendedBy),
      issueId: args.issueId,
      title: 'SLA extension completed',
      message: `You extended the SLA deadline for issue "${args.issueName}".`,
      type: 'sla_alert',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});
