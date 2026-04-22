import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getByIssueId = query({
  args: {
    issueId: v.id('issues'),
  },
  handler: async (ctx, args) => {
    const updates = await ctx.db
      .query('issueUpdates')
      .withIndex('by_issue', (q) => q.eq('issueId', args.issueId))
      .order('asc')
      .collect();

    const enriched = await Promise.all(
      updates.map(async (u) => {
        const user = await ctx.db.get(u.updatedBy);

        const attachments = await Promise.all(
          (u.attachments || []).map(async (fileId) => {
            const url = await ctx.storage.getUrl(fileId);

            // KEY PART
            const meta = await ctx.db.system.get(fileId);

            return {
              url,
              contentType: meta?.contentType || '',
              storageId: fileId,
            };
          })
        );

        return {
          ...u,
          updater: user,
          attachments,
        };
      })
    );

    return enriched;
  },
});

export const createIssueUpdate = mutation({
  args: {
    issueId: v.id('issues'),
    status: v.string(),
    comment: v.optional(v.string()),
    updatedBy: v.optional(v.id('users')),
    role: v.union(
      v.literal('citizen'),
      v.literal('unit_officer'),
      v.literal('field_officer'),
      v.literal('admin')
    ),
    attachments: v.optional(v.array(v.id('_storage'))),
    scope: v.union(v.literal('field_and_citizen'), v.literal('citizen'), v.literal('admin_only')),
  },

  handler: async (ctx, args) => {
    const updateId = await ctx.db.insert('issueUpdates', {
      issueId: args.issueId,
      status: args.status,
      comment: args.comment ?? null,
      updatedBy: args.updatedBy,
      role: args.role,
      attachments: args.attachments ?? [],
      scope: args.scope,
      createdAt: Date.now(),
    });

    return updateId;
  },
});
