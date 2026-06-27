import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getUserByEmail = query({
  args: { email: v.string() },

  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();
  },
});

export const getUserById = query({
  args: { userId: v.id('users') },

  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const seedCityAdminIfNeeded = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== 'city_admin') return { success: false };

    const existing = await ctx.db
      .query('cityAdmins')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (!existing) {
      await ctx.db.insert('cityAdmins', {
        userId: args.userId,
        fullName: user.fullName,
        email: user.email,
        phone: '',
        state: 'Uttar Pradesh',
        city: 'Varanasi',
        managedUnitOfficers: [],
        managedFieldOfficers: [],
        mustChangePassword: false,
        totalIssuesInCity: 0,
        issuesResolved: 0,
        issuesPending: 0,
        avgResolutionTime: 0,
        slaComplianceRate: 100,
        createdAt: Date.now(),
        createdBy: args.userId,
      });
      return { success: true, seeded: true };
    }
    return { success: true, seeded: false };
  },
});
