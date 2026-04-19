import { v } from 'convex/values';
import { query } from './_generated/server';

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
