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
        message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been successfully verified again by the Unit Officer ${args.UOName} after reopening and will be assigned shortly.`,
        type: 'verified',
        read: false,
        createdAt: Date.now(),
      });

      // Add Notification to Unit Officer for the reopenened issues
      await ctx.db.insert('notifications', {
        userId: args.verifiedBy,
        issueId: args.issueId,
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
        message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been successfully verified by the Unit Officer ${args.UOName} and will be assigned shortly.`,
        type: 'verified',
        read: false,
        createdAt: Date.now(),
      });

      // Add Notification to Unit Officer for the verified issues
      await ctx.db.insert('notifications', {
        userId: args.verifiedBy,
        issueId: args.issueId,
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
        message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been rejected again by the Unit Officer ${args.UOName} after issue reopened by citizen`,
        type: 'rejected',
        read: false,
        createdAt: now,
      });

      // Add Notification to Unit Officer for reopened issue
      await ctx.db.insert('notifications', {
        userId: args.rejectedBy,
        issueId: args.issueId,
        message: `You have successfully rejected again after reopening of the issue "${args.issueName}" with Issue Code "${args.issueCode}".`,
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
        message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been rejected by the Unit Officer ${args.UOName}.`,
        type: 'rejected',
        read: false,
        createdAt: now,
      });

      // Add Notification to Unit Officer for rejected issue
      await ctx.db.insert('notifications', {
        userId: args.rejectedBy,
        issueId: args.issueId,
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
        }${args.reassignmentComment ? `\n${args.reassignmentComment}` : ''}`
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
      message: `You have been assigned issue "${args.issueTitle}" with Issue Code "${args.issueCode}" by Unit Officer ${unitOfficer.fullName}.`,
      type: 'assigned',
      read: false,
      createdAt: now,
    });

    // Notification to Unit Officer
    await ctx.db.insert('notifications', {
      userId: args.assignedBy,
      issueId: args.issueId,
      message: `You assigned issue "${args.issueTitle}" with Issue Code "${args.issueCode}" to ${fieldOfficer.fullName}.`,
      type: 'assigned',
      read: false,
      createdAt: now,
    });

    // Notification to Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
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
