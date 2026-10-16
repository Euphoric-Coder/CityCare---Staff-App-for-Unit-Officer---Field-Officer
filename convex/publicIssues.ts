import { requireApprovedUnitOfficer } from './officerAuth';
import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';

const toISO = (value: string | number | undefined | null) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return new Date(value).toISOString();
};

const normalizeDepartment = (value: any) => {
  return String(value || '')
    .trim()
    
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
};

const getPhotoUrls = async (ctx: any, storageIds: string[] = []) => {
  const urls = await Promise.all(
    storageIds.map(async (id: string) => await ctx.storage.getUrl(id))
  );

  return urls.filter(Boolean);
};

export const syncPublicIssues = internalMutation({
  args: {},

  handler: async (ctx) => {
    const resolvedIssues = await ctx.db
      .query('issues')
      .withIndex('by_status', (q) => q.eq('status', 'resolved'))
      .collect();

    const rejectedIssues = await ctx.db
      .query('issues')
      .withIndex('by_status', (q) => q.eq('status', 'rejected'))
      .collect();

    const issues = [...resolvedIssues, ...rejectedIssues];

    let inserted = 0;
    let updated = 0;

    for (const issue of issues) {
      const existing = await ctx.db
        .query('publicIssues')
        .withIndex('by_issue', (q) => q.eq('issueId', issue._id))
        .unique();

      const isResolved = issue.status === 'resolved';

      const photosBefore = await getPhotoUrls(
        ctx,
        issue.beforePhotos?.length ? issue.beforePhotos : []
      );

      const photosAfter = await getPhotoUrls(ctx, issue.afterPhotos || []);

      // Only fields that should stay synchronized with the original issue.
      const syncedPayload = {
        issueId: issue._id,

        issueCode: issue.issueCode,

        // Do NOT overwrite a moderated/published title after publication.
        // Preserve existing public title if one already exists.
        title: existing?.title ?? issue.title,

        description: issue.description,

        category: issue.category,
        status: issue.status,

        ward: issue.city,

        address: issue.address,
        city: issue.city,
        state: issue.state,
        postal: issue.postal,

        latitude: Number(issue.latitude),
        longitude: Number(issue.longitude),

        createdAt: toISO(issue.createdAt),

        reviewedAt: issue.verificationChecklist?.verifiedAt
          ? toISO(issue.verificationChecklist.verifiedAt)
          : null,

        resolvedAt: isResolved ? toISO(issue.resolvedAt) : null,

        rejectedAt: !isResolved ? toISO(issue.rejection?.rejectedAt) : null,

        rejectionReason: !isResolved
          ? issue.rejection?.reason ||
            issue.rejection?.comment ||
            'Issue was rejected after review.'
          : null,

        photosBefore,
        photosAfter: isResolved ? photosAfter : [],
      };

      if (existing) {
        // IMPORTANT:
        // Only synchronize issue-derived fields.
        // Do NOT reset moderation/publication state.
        await ctx.db.patch(existing._id, syncedPayload as any);

        updated++;
      } else {
        // Only a brand-new public issue starts as a draft.
        await ctx.db.insert('publicIssues', {
          ...syncedPayload,

          publicCompletionNote: null,

          publicVisible: false,
          publishStatus: 'draft',

          foVisible: false,

          createdPublicAt: Date.now(),
        } as any);

        inserted++;
      }
    }

    return {
      total: issues.length,
      inserted,
      updated,
    };
  },
});

export const getPublicIssues = query({
  args: {
    unitOfficerId: v.id('users'),
  },

  handler: async (ctx, args) => {
    await requireApprovedUnitOfficer(ctx, args.unitOfficerId);
    const unitOfficer = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.unitOfficerId))
      .unique();

    if (!unitOfficer) return [];

    const unitOfficerUser = await ctx.db.get(unitOfficer.userId);

    const publicIssues = await ctx.db
      .query('publicIssues')
      .withIndex('by_city', (q) => q.eq('city', unitOfficer.city))
      .collect();

    const filteredPublicIssues = publicIssues.filter(
      (issue) => issue.category === normalizeDepartment(unitOfficer.department)
    );

    const enriched = await Promise.all(
      filteredPublicIssues.map(async (publicIssue) => {
        const issue = await ctx.db.get(publicIssue.issueId);

        let fieldOfficerUser = null;

        if (issue?.assignedFieldOfficer) {
          fieldOfficerUser = await ctx.db.get(issue.assignedFieldOfficer);
        }

        return {
          id: publicIssue._id,
          issueId: publicIssue.issueId,

          issueCode: publicIssue.issueCode,
          title: publicIssue.title,
          description: publicIssue.description,

          category: publicIssue.category,
          status: publicIssue.status,

          ward: publicIssue.ward,

          address: publicIssue.address,
          city: publicIssue.city,
          state: publicIssue.state,
          postal: publicIssue.postal,

          latitude: publicIssue.latitude,
          longitude: publicIssue.longitude,

          createdAt: publicIssue.createdAt,
          reviewedAt: publicIssue.reviewedAt,
          resolvedAt: publicIssue.resolvedAt,
          rejectedAt: publicIssue.rejectedAt,

          citizenRating: issue?.citizenRating ?? null,

          publicCompletionNote: publicIssue.publicCompletionNote,
          rejectionReason: publicIssue.rejectionReason,

          photosBefore: publicIssue.photosBefore,
          photosAfter: publicIssue.photosAfter,

          publicVisible: publicIssue.publicVisible,
          publishStatus: publicIssue.publishStatus,

          moderatedBy: unitOfficerUser?.fullName || unitOfficer.fullName,
          resolvedBy: fieldOfficerUser?.fullName || 'Field Officer Team',
        };
      })
    );

    return enriched.sort(
      (a, b) =>
        new Date(b.resolvedAt || b.rejectedAt || b.createdAt).getTime() -
        new Date(a.resolvedAt || a.rejectedAt || a.createdAt).getTime()
    );
  },
});

export const getCityPublicIssues = query({
  args: {
    city: v.string(),
  },

  handler: async (ctx, args) => {
    const publicIssues = await ctx.db
      .query('publicIssues')
      .withIndex('by_city', (q) => q.eq('city', args.city))
      .collect();

    const enriched = await Promise.all(
      publicIssues.map(async (publicIssue) => {
        const issue = await ctx.db.get(publicIssue.issueId);

        let fieldOfficerUser = null;
        let unitOfficerUser = null;

        if (issue?.assignedFieldOfficer) {
          fieldOfficerUser = await ctx.db.get(issue.assignedFieldOfficer);
        }

        if (issue?.assignedUnitOfficer) {
          unitOfficerUser = await ctx.db.get(issue.assignedUnitOfficer);
        }

        return {
          id: publicIssue._id,
          issueId: publicIssue.issueId,

          issueCode: publicIssue.issueCode,
          title: publicIssue.title,
          description: publicIssue.description,

          category: publicIssue.category,
          status: publicIssue.status,

          ward: publicIssue.ward,

          address: publicIssue.address,
          city: publicIssue.city,
          state: publicIssue.state,
          postal: publicIssue.postal,

          latitude: publicIssue.latitude,
          longitude: publicIssue.longitude,

          createdAt: publicIssue.createdAt,
          reviewedAt: publicIssue.reviewedAt,
          resolvedAt: publicIssue.resolvedAt,
          rejectedAt: publicIssue.rejectedAt,

          citizenRating: issue?.citizenRating ?? null,

          publicCompletionNote: publicIssue.publicCompletionNote,
          rejectionReason: publicIssue.rejectionReason,

          photosBefore: publicIssue.photosBefore,
          photosAfter: publicIssue.photosAfter,

          publicVisible: publicIssue.publicVisible,
          publishStatus: publicIssue.publishStatus,

          moderatedBy: unitOfficerUser?.fullName || 'Unit Officer',
          resolvedBy: fieldOfficerUser?.fullName || 'Field Officer Team',
        };
      })
    );

    return enriched.sort(
      (a, b) =>
        new Date(b.resolvedAt || b.rejectedAt || b.createdAt).getTime() -
        new Date(a.resolvedAt || a.rejectedAt || a.createdAt).getTime()
    );
  },
});

export const getCityPublicIssueByIssueCode = query({
  args: {
    city: v.string(),
    issueCode: v.string(),
  },

  handler: async (ctx, args) => {
    const publicIssues = await ctx.db
      .query('publicIssues')
      .withIndex('by_city', (q) => q.eq('city', args.city))
      .collect();

    const publicIssue = publicIssues.find((issue) => issue.issueCode === args.issueCode);

    if (!publicIssue) return null;

    const issue = await ctx.db.get(publicIssue.issueId);

    let fieldOfficerUser = null;
    let unitOfficerUser = null;

    if (issue?.assignedFieldOfficer) {
      fieldOfficerUser = await ctx.db.get(issue.assignedFieldOfficer);
    }

    if (issue?.assignedUnitOfficer) {
      unitOfficerUser = await ctx.db.get(issue.assignedUnitOfficer);
    }

    return {
      id: publicIssue._id,
      issueId: publicIssue.issueId,

      issueCode: publicIssue.issueCode,
      title: publicIssue.title,
      description: publicIssue.description,

      category: publicIssue.category,
      status: publicIssue.status,

      ward: publicIssue.ward,

      address: publicIssue.address,
      city: publicIssue.city,
      state: publicIssue.state,
      postal: publicIssue.postal,

      latitude: publicIssue.latitude,
      longitude: publicIssue.longitude,

      createdAt: publicIssue.createdAt,
      reviewedAt: publicIssue.reviewedAt,
      resolvedAt: publicIssue.resolvedAt,
      rejectedAt: publicIssue.rejectedAt,

      citizenRating: issue?.citizenRating ?? null,

      publicCompletionNote: publicIssue.publicCompletionNote,
      rejectionReason: publicIssue.rejectionReason,

      photosBefore: publicIssue.photosBefore,
      photosAfter: publicIssue.photosAfter,

      publicVisible: publicIssue.publicVisible,
      publishStatus: publicIssue.publishStatus,

      moderatedBy: unitOfficerUser?.fullName || 'Unit Officer',
      resolvedBy: fieldOfficerUser?.fullName || 'Field Officer Team',
    };
  },
});

export const publishPublicIssue = mutation({
  args: {
    unitOfficerId: v.id('users'),
    id: v.id('publicIssues'),
    title: v.string(),
    publicCompletionNote: v.string(),
    foVisible: v.optional(v.boolean()),
    moderatedAt: v.number(),
  },

  handler: async (ctx, args) => {
    await requireApprovedUnitOfficer(ctx, args.unitOfficerId);
    const publicIssue = await ctx.db.get(args.id);

    if (!publicIssue) {
      throw new Error('Public issue not found');
    }

    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      publicCompletionNote: args.publicCompletionNote.trim(),

      publicVisible: true,
      publishStatus: 'published',

      foVisible: args.foVisible,
      moderatedAt: args.moderatedAt,
      createdPublicAt: args.moderatedAt,
    });

    return {
      success: true,
      id: args.id,
      message: 'Issue published successfully',
    };
  },
});

export const unpublishPublicIssue = mutation({
  args: {
    unitOfficerId: v.id('users'),
    id: v.id('publicIssues'),
  },

  handler: async (ctx, args) => {
    await requireApprovedUnitOfficer(ctx, args.unitOfficerId);
    const publicIssue = await ctx.db.get(args.id);

    if (!publicIssue) {
      throw new Error('Public issue not found');
    }

    await ctx.db.patch(args.id, {
      publicCompletionNote: null,
      publicVisible: false,
      publishStatus: 'draft',
      moderatedAt: new Date().getTime(),
    });

    return {
      success: true,
      id: args.id,
      message: 'Issue moved back to draft',
    };
  },
});

export const saveDraftPublicIssue = mutation({
  args: {
    unitOfficerId: v.id('users'),
    id: v.id('publicIssues'),
    title: v.string(),
    publicCompletionNote: v.optional(v.string()),
    foVisible: v.boolean(),
  },

  handler: async (ctx, args) => {
    await requireApprovedUnitOfficer(ctx, args.unitOfficerId);
    const publicIssue = await ctx.db.get(args.id);

    if (!publicIssue) {
      throw new Error('Public issue not found');
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      publicCompletionNote: args.publicCompletionNote,
      foVisible: args.foVisible,
      publicVisible: false,
      publishStatus: 'draft',
    });

    return {
      success: true,
      id: args.id,
      message: 'Draft saved successfully',
    };
  },
});
