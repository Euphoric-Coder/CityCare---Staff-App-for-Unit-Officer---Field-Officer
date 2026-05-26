import { Id } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import { v } from 'convex/values';

const CATEGORY_PREFIX = {
  road: 'RD',
  electricity: 'EL',
  water: 'WT',
  sanitation: 'SN',
  drainage: 'DR',
  solid_waste: 'SW',
  public_health: 'PH',
  other: 'OT',
};

function generateRandomCode(length = 6) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();
}

export const createIssue = mutation({
  args: {
    // --- Issue Details ---
    title: v.string(),
    description: v.string(),

    category: v.string(),

    // Now array
    subcategory: v.array(v.string()),

    otherCategoryName: v.optional(v.string()),

    priority: v.string(),

    tags: v.array(v.string()),

    // --- Location (numbers, not strings) ---
    latitude: v.string(),
    longitude: v.string(),

    address: v.string(),
    city: v.string(),
    state: v.string(),
    postal: v.string(),

    googleMapUrl: v.string(),

    // --- Reporter ---
    reportedBy: v.id('users'),

    isAnonymous: v.boolean(),

    additionalEmail: v.optional(v.union(v.string(), v.null())),

    // --- Media ---
    photos: v.array(v.id('_storage')),

    // Single videos (optional)
    videos: v.union(v.id('_storage'), v.null()),
  },

  handler: async (ctx, args) => {
    // Generate Issue Code
    // @ts-ignore
    const prefix = CATEGORY_PREFIX[args.category] ?? 'OT';

    const randomPart = generateRandomCode(6);

    const issueCode = `${prefix}-${randomPart}`;

    await ctx.db.insert('issues', {
      // --- Core ---
      issueCode,

      title: args.title,
      description: args.description,

      category: args.category,

      subcategory: args.subcategory,
      otherCategoryName: args.otherCategoryName ?? null,

      priority: args.priority,

      tags: args.tags,

      // --- Location ---
      latitude: args.latitude,
      longitude: args.longitude,

      address: args.address,
      city: args.city,
      state: args.state,
      postal: args.postal,

      googleMapUrl: args.googleMapUrl,

      // --- Reporter ---
      reportedBy: args.reportedBy,

      isAnonymous: args.isAnonymous,

      additionalEmail: args.additionalEmail ?? null,

      // --- Media ---
      photos: args.photos,

      // Store as single ID (nullable)
      videos: args.videos ?? null,

      // --- Workflow ---
      status: 'pending',

      assignedUnitOfficer: null,
      assignedFieldOfficer: null,

      possibleDuplicateIds: [],

      escalatedToAdmin: false,

      slaCategory: 'standard',
      slaDeadline: null,
      slaBreached: false,

      resolvedAt: null,
      closedAt: null,

      citizenRating: null,
      citizenFeedback: null,

      reopenCount: 0,
      reopenReason: null,
      isReopened: false,

      createdAt: Date.now(),
    });

    return {
      success: true,
      issueCode,
    };
  },
});

export const getCitizenDashboardIssues = query({
  args: {
    userId: v.id('users'),
  },

  handler: async (ctx, args) => {
    // 1. Get citizen profile
    const citizen = await ctx.db
      .query('citizens')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (!citizen || !citizen.city) return [];

    // 2. Fetch ALL issues in same city (includes user's issues automatically)
    const issues = await ctx.db
      .query('issues')
      .withIndex('by_city', (q) => q.eq('city', citizen.city))
      .collect();

    // 3. Attach photo preview
    const resolvedIssues = await Promise.all(
      issues.map(async (issue) => {
        let photoUrl = null;

        if (issue.photos?.length > 0) {
          photoUrl = await ctx.storage.getUrl(issue.photos[0]);
        }

        // Fetch Field Officer using userId stored in issue
        let fieldOfficerDetails = null;

        if (issue.assignedFieldOfficer) {
          const fo = await ctx.db
            .query('fieldOfficers')
            .withIndex('by_user', (q) => q.eq('userId', issue.assignedFieldOfficer as Id<'users'>))
            .unique();

          if (fo) {
            fieldOfficerDetails = {
              id: fo._id,
              userId: fo.userId,
              role: 'field_officer',
              fullName: fo.fullName,
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

        // Also fetch Unit Officer
        let unitOfficerDetails = null;

        if (issue.assignedUnitOfficer) {
          const uo = await ctx.db
            .query('unitOfficers')
            .withIndex('by_user', (q) => q.eq('userId', issue.assignedUnitOfficer as Id<'users'>))
            .unique();

          if (uo) {
            unitOfficerDetails = {
              id: uo._id,
              userId: uo.userId,
              role: 'unit_officer',
              fullName: uo.fullName,
              email: uo.email,
              phone: uo.phone,
              department: uo.department,
              rating: uo.rating,
              efficiencyScore: uo.efficiencyScore,
            };
          }
        }

        return {
          ...issue,
          photoUrl,
          assignedFieldOfficer: fieldOfficerDetails,
          assignedUnitOfficer: unitOfficerDetails,
        };
      })
    );

    // 4. Sort latest first
    return resolvedIssues.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getCitizenCityByUserId = query({
  args: {
    userId: v.id('users'),
  },

  handler: async (ctx, args) => {
    const citizen = await ctx.db
      .query('citizens')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (!citizen) return null;

    return {
      city: citizen.city,
      state: citizen.state,
      region: citizen.region,
      postal: citizen.postal,
    };
  },
});

export const withdrawIssue = mutation({
  args: {
    issueId: v.id('issues'),
    userId: v.id('users'),
    withdrawalReason: v.string(),
    withdrawalCategory: v.string(),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);

    if (!issue) {
      throw new Error('Issue not found');
    }

    // Ensure only reporter can withdraw
    if (issue.reportedBy !== args.userId) {
      throw new Error('Unauthorized action');
    }

    // Prevent invalid cases
    if (
      issue.status === 'resolved' ||
      issue.status === 'rejected' ||
      issue.status === 'withdrawn'
    ) {
      throw new Error('Cannot withdraw this issue');
    }

    // Update issue details
    await ctx.db.patch(args.issueId, {
      status: 'withdrawn',

      withdrawnAt: Date.now(),
      withdrawalReason: args.withdrawalReason,
      withdrawalCategory: args.withdrawalCategory,
    });

    // Add timeline entry
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'withdrawn',

      comment: `Issue withdrawn.\nCategory: ${args.withdrawalCategory}\nReason: ${args.withdrawalReason}`,

      updatedBy: args.userId,
      role: 'citizen',

      attachments: [],
      scope: 'citizen',

      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const reopenIssue = mutation({
  args: {
    issueId: v.id('issues'),
    userId: v.id('users'),
    reason: v.string(),
    category: v.string(),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    // Changes issue status to "reopened" and logs the reason + category for reopening
    await ctx.db.patch(args.issueId, {
      status: 'reopened',
      isReopened: true,
      reopenCount: (issue.reopenCount || 0) + 1,
      reopenReason: args.reason,
      reopenCategory: args.category,
    });

    // Adds the Issue Update for reopening with reason and category details
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'reopened',
      comment: `Issue reopened.\nCategory: ${args.category.toUpperCase().replace('_', ' ')}\nReason: ${args.reason}`,
      updatedBy: args.userId,
      role: 'citizen',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: Date.now(),
    });

    // Notification for Citizen
    await ctx.db.insert('notifications', {
      userId: issue.reportedBy,
      issueId: args.issueId,
      title: `Reopened Issue - "${issue.title} (${issue.issueCode})"`,
      message: `The Issue "${issue.title}" with Issue Code: ${issue.issueCode} has been reopened by the citizen.`,
      type: 'reopened',
      read: false,
      createdAt: Date.now(),
    });

    // Notification for Unit Officer
    if (issue.assignedUnitOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedUnitOfficer,
        issueId: args.issueId,
        title: `Reopened Issue - "${issue.title} (${issue.issueCode})"`,
        message: `The Issue "${issue.title}" with Issue Code: ${issue.issueCode} has been reopened by the citizen.`,
        type: 'reopened',
        read: false,
        createdAt: Date.now(),
      });
    }
  },
});

export const submitIssueFeedback = mutation({
  args: {
    issueId: v.id('issues'),
    userId: v.id('users'),
    rating: v.number(),
    feedback: v.string(),
  },

  handler: async (ctx, args) => {
    const { issueId, userId, rating, feedback } = args;

    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error('Issue not found');

    // Fallback to ensures only the reporter can give feedback
    if (issue.reportedBy !== userId) {
      throw new Error('Unauthorized');
    }

    const now = Date.now();

    // Update Issue with citizen feedback and rating
    await ctx.db.patch(issueId, {
      citizenRating: rating,
      citizenFeedback: feedback,
      status: issue.status,
      closedAt: issue.status === 'resolved' ? now : issue.closedAt,
    });

    // Adds the Issue Update with feedback and rating details
    await ctx.db.insert('issueUpdates', {
      issueId,
      status: issue.status,
      comment: `Citizen submitted a feedback for the issue.\nRating: ${rating}/5 ${feedback ? `\nFeedback: ${feedback}` : ''}`,
      updatedBy: userId,
      role: 'citizen',
      attachments: [],
      scope: 'officer_and_citizen',
      createdAt: now,
    });

    // Notifications for Unit Officer and Citizen

    // Notify Unit Officer about the feedback submission
    if (issue.assignedUnitOfficer) {
      await ctx.db.insert('notifications', {
        userId: issue.assignedUnitOfficer,
        issueId,
        title: `Feedback received on "${issue.title} (${issue.issueCode})"`,
        message: `Feedback received for issue "${issue.title} (${issue.issueCode})" from the citizen. \nRating: ${rating}/5 ${feedback ? ` \nFeedback: ${feedback}` : ''}`,
        type: 'feedback',
        read: false,
        createdAt: now,
      });
    }

    // Notify Citizen about the feedback submission
    await ctx.db.insert('notifications', {
      userId: userId,
      issueId,
      title: `Feedback submitted for issue "${issue.title} (${issue.issueCode})"`,
      message: `Your feedback for issue "${issue.title} (${issue.issueCode})" has been successfully submitted.`,
      type: 'feedback_confirmation',
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});

export const getIssueById = query({
  args: {
    issueId: v.id('issues'),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);

    if (!issue) return null;

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
      photoUrl,
      beforePhotos,
      afterPhotos,
      videoUrl,
    };
  },
});

export const autoAssignIssues = internalMutation({
  args: {},

  handler: async (ctx) => {
    const now = Date.now();

    // 1. Get all unassigned issues
    const issues = await ctx.db
      .query('issues')
      .filter((q) =>
        q.and(
          q.eq(q.field('assignedUnitOfficer'), null),
          q.eq(q.field('status'), 'pending'),
          q.eq(q.field('escalatedToAdmin'), false)
        )
      )
      .collect();

    if (issues.length === 0) return 'No issues to assign';

    for (const issue of issues) {
      // 2. Get eligible unit officers
      const officers = await ctx.db
        .query('unitOfficers')
        .filter((q) =>
          q.and(
            q.eq(q.field('city'), issue.city),
            q.eq(q.field('department'), issue.category),
            q.eq(q.field('accountApproved'), true)
          )
        )
        .collect();

      if (officers.length === 0) {
        console.log('No officer found for:', issue._id);
        continue;
      }

      // 3. Load balancing (least active issues)
      let selectedOfficer = officers[0];

      for (const officer of officers) {
        if ((officer.activeIssueIds?.length || 0) < (selectedOfficer.activeIssueIds?.length || 0)) {
          selectedOfficer = officer;
        }
      }

      // 4. Get officer user details (for name)
      const officerUser = await ctx.db.get(selectedOfficer.userId);

      const officerName = officerUser?.fullName || 'Unit Officer';

      // 5. Assign issue
      await ctx.db.patch(issue._id, {
        assignedUnitOfficer: selectedOfficer.userId,
      });

      // 6. Update officer workload
      await ctx.db.patch(selectedOfficer._id, {
        activeIssueIds: [...(selectedOfficer.activeIssueIds || []), issue._id],
      });

      // 7. ISSUE UPDATE ENTRY
      await ctx.db.insert('issueUpdates', {
        issueId: issue._id,
        status: 'pending',
        comment: `Issue has been assigned to ${officerName} for further processing.`,
        updatedBy: selectedOfficer.userId,
        role: 'unit_officer',
        attachments: [],
        scope: 'citizen',
        createdAt: now,
      });

      // 8. NOTIFICATION → Citizen
      await ctx.db.insert('notifications', {
        userId: issue.reportedBy,
        issueId: issue._id,
        title: `Issue Assigned to Unit Officer ${officerName} - "${issue.title} (${issue.issueCode})"`,
        message: `Your issue "${issue.title}" with Issue Code "${issue.issueCode}" has been assigned to Unit Officer ${officerName}.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });

      // 9. NOTIFICATION → Unit Officer
      await ctx.db.insert('notifications', {
        userId: selectedOfficer.userId,
        issueId: issue._id,
        title: `New Issue Assigned - "${issue.title} (${issue.issueCode})"`,
        message: `You have been assigned a new issue: "${issue.title} (${issue.issueCode})".`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    return `Assigned ${issues.length} issues successfully`;
  },
});

export const getIssuesByOfficial = query({
  args: {
    officialId: v.id('users'),
  },

  handler: async (ctx, args) => {
    const unitOfficerIssues = await ctx.db
      .query('issues')
      .withIndex('by_assigned_unit_officer', (q) => q.eq('assignedUnitOfficer', args.officialId))
      .collect();

    const fieldOfficerIssues = await ctx.db
      .query('issues')
      .withIndex('by_assigned_field_officer', (q) => q.eq('assignedFieldOfficer', args.officialId))
      .collect();

    const merged = [...unitOfficerIssues, ...fieldOfficerIssues];

    const uniqueIssues = Array.from(new Map(merged.map((issue) => [issue._id, issue])).values());

    return uniqueIssues.sort((a, b) => b.createdAt - a.createdAt);
  },
});
