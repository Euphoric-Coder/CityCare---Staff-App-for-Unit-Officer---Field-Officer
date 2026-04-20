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
    const officer = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (!officer) return [];

    const issues = await Promise.all(officer.activeIssueIds.map((id) => ctx.db.get(id)));

    return issues.filter(Boolean);
  },
});

export const verifyIssue = mutation({
  args: {
    issueId: v.id('issues'),

    checklist: v.object({
      isValidIssue: v.boolean(),
      isWithinJurisdiction: v.boolean(),
      hasSufficientEvidence: v.boolean(),
      isDuplicate: v.boolean(),
    }),

    notes: v.optional(v.string()),

    slaDeadline: v.number(),

    verifiedBy: v.id('users'),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error('Issue not found');

    // Update Issue Status to "verified" and add verification details
    await ctx.db.patch(args.issueId, {
      status: 'verified',

      verificationChecklist: {
        ...args.checklist,
        notes: args.notes,
        verifiedBy: args.verifiedBy,
        verifiedAt: Date.now(),
      },

      slaDeadline: args.slaDeadline,
    });

    // Add timeline update
    await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: 'verified',
      comment: 'Issue verified and ready for assignment',
      role: 'unit_officer',
      attachments: [],
      updatedBy: args.verifiedBy,
      scope: 'field_and_citizen',
      createdAt: Date.now(),
    });
  },
});
