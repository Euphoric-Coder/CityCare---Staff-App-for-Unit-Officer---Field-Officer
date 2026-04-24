import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

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

        return {
          ...issue,

          citizenDetails: {
            fullName: citizen?.fullName ?? 'Unknown',
            email: citizen?.email ?? 'N/A',
            phone: citizen?.phone ?? 'N/A',
          },
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

    // Resolve videos (if exists)
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

    // Add the Issue Timeline Update
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'verified',
      comment: `Issue verified by Unit Officer ${args.UOName} and ready for assignment.`,
      role: 'unit_officer',
      attachments: [],
      updatedBy: args.verifiedBy,
      scope: 'field_and_citizen',
      createdAt: Date.now(),
    });

    // Add Notification to Citizen
    await ctx.db.insert('notifications', {
      userId: args.reporterId, // citizen
      issueId: args.issueId,
      message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been successfully verified by the Unit Officer ${args.UOName} and will be assigned shortly.`,
      type: 'verified',
      read: false,
      createdAt: Date.now(),
    });

    // Add Notification to Unit Officer
    await ctx.db.insert('notifications', {
      userId: args.verifiedBy,
      issueId: args.issueId,
      message: `You have successfully verified the issue "${args.issueName}" with Issue Code "${args.issueCode}".`,
      type: 'verified',
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const rejectIssue = mutation({
  args: {
    issueId: v.id('issues'),
    issueCode: v.string(),
    reason: v.string(),
    comment: v.string(),
    UOName: v.string(),
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

    // Add the Issue Timeline Update
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

    // Add Notification to Citizen
    await ctx.db.insert('notifications', {
      userId: args.reporterId, // citizen
      issueId: args.issueId,
      message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been rejected by the Unit Officer ${args.UOName}.`,
      type: 'rejected',
      read: false,
      createdAt: now,
    });

    // Add Notification to Unit Officer
    await ctx.db.insert('notifications', {
      userId: args.rejectedBy,
      issueId: args.issueId,
      message: `You have successfully rejected the issue "${args.issueName}" with Issue Code "${args.issueCode}".`,
      type: 'rejected',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});
