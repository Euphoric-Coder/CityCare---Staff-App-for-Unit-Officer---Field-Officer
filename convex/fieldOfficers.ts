import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';

export const getFieldOfficerByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('fieldOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
  },
});

export const getFieldOfficerIssues = query({
  args: { userId: v.id('users') },

  handler: async (ctx, args) => {
    // 1. Get Unit Officer
    const officer = await ctx.db
      .query('fieldOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (!officer) return [];

    // 2. Fetch Issues
    const issues = await Promise.all(officer.assignedIssueIds.map((id) => ctx.db.get(id)));

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

        // Main preview (first photo)
        const photoUrl = await Promise.all(
          (issue.photos || []).map(async (fileId) => {
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
          photoUrl,
          videoUrl,

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
      beforePhotosId: issue.beforePhotos,
      afterPhotos,
      afterPhotosId: issue.afterPhotos,
      videoUrl,
      fieldOfficerDetails,
    };
  },
});

export const startWork = mutation({
  args: {
    issueId: v.id('issues'),
    userId: v.id('users'),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const fieldOfficer = await ctx.db.get(args.userId);
    if (!fieldOfficer) throw new Error('Field Officer not found');

    const now = Date.now();

    // Update issue status to "in_progress"
    await ctx.db.patch(args.issueId, {
      status: 'in_progress',
    });

    // Add entry to issue timeline
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'in_progress',
      comment: `Field Officer ${fieldOfficer.fullName} has started work on this issue - "${issue.title}" with Issue Code "${issue.issueCode}".`,
      updatedBy: args.userId,
      role: 'field_officer',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notify Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
      title: `Field Officer ${fieldOfficer.fullName} has started work on ${issue.issueCode}`,
      message: `Field Officer ${fieldOfficer.fullName} has started work on your issue "${issue.title}" (${issue.issueCode}).`,
      type: 'in_progress',
      read: false,
      createdAt: now,
    });

    // Notify Field Officer
    await ctx.db.insert('notifications', {
      userId: issue.assignedFieldOfficer as Id<'users'>,
      issueId: args.issueId,
      title: `You have started work on ${issue.issueCode}`,
      message: `You have started work on this issue - "${issue.title}" (${issue.issueCode}).`,
      type: 'in_progress',
      read: false,
      createdAt: now,
    });

    // Notify Unit Officer
    await ctx.db.insert('notifications', {
      userId: issue.assignedUnitOfficer as Id<'users'>,
      issueId: args.issueId,
      title: `Field Officer ${fieldOfficer.fullName} has started work on ${issue.issueCode}`,
      message: `Field Officer ${fieldOfficer.fullName} has started work on this issue - "${issue.title}" (${issue.issueCode}).`,
      type: 'in_progress',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});

export const submitFieldOfficerWork = mutation({
  args: {
    issueId: v.id('issues'),

    beforePhotos: v.optional(v.array(v.id('_storage'))),
    afterPhotos: v.optional(v.array(v.id('_storage'))),

    beforeLocation: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
      })
    ),

    afterLocation: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
      })
    ),

    notes: v.string(),

    fieldOfficerId: v.id('users'),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    const fieldOfficer = await ctx.db.get(args.fieldOfficerId);
    if (!fieldOfficer) throw new Error('Field Officer not found');

    const now = Date.now();

    // Update Issue (FO submission)
    await ctx.db.patch(args.issueId, {
      beforePhotos: args.beforePhotos,
      afterPhotos: args.afterPhotos,
      beforeLocation: args.beforeLocation,
      afterLocation: args.afterLocation,
      notes: args.notes,
      status: 'pending_uo_verification',
    });

    // Timeline entry (VERY important for CityCare tracking)
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: issue.status === 'rework_required' ? issue.status : 'pending_uo_verification',
      updatedBy: args.fieldOfficerId,
      comment: `Field Officer ${fieldOfficer.fullName} has ${issue.status === 'rework_required' ? 'reworked and resubmitted' : 'submitted'} the resolution for issue "${issue.title}" (${issue.issueCode}).`,
      role: 'field_officer',
      scope: 'officer_and_citizen',
      attachments: [],
      createdAt: now,
    });

    // Notify Unit Officer
    if (issue.assignedUnitOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedUnitOfficer,
        type: 'submission_success',
        title:
          issue.status === 'rework_required'
            ? `Resolution rework submitted successfully for issue "${issue.title}" (${issue.issueCode})`
            : `Resolution submitted successfully for issue "${issue.title}" (${issue.issueCode})`,
        message:
          issue.status === 'rework_required'
            ? `Resolution rework submitted successfully by Field Officer ${fieldOfficer.fullName} for issue "${issue.title}" (${issue.issueCode}).`
            : `Resolution submitted successfully by Field Officer ${fieldOfficer.fullName} for issue "${issue.title}" (${issue.issueCode}).`,
        read: false,
        createdAt: now,
      });
    }

    // Notify Field Officer (confirmation)
    await ctx.db.insert('notifications', {
      userId: args.fieldOfficerId,
      type: 'submission_success',
      title:
        issue.status === 'rework_required'
          ? `Resolution rework submitted successfully for issue "${issue.title}" (${issue.issueCode})`
          : `Resolution submitted successfully for issue "${issue.title}" (${issue.issueCode})`,
      message:
        issue.status === 'rework_required'
          ? `Resolution rework submitted successfully by you for issue "${issue.title}" (${issue.issueCode}).`
          : `Resolution submitted successfully by you for issue "${issue.title}" (${issue.issueCode}).`,
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});
