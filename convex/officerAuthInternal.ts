import { internalMutation, internalQuery } from './_generated/server';
import { v, ConvexError } from 'convex/values';

export const getOfficerPasswordChangeData = internalQuery({
  args: {
    userId: v.id('users'),
  },

  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new ConvexError('User account was not found');
    }

    if (user.role !== 'unit_officer' && user.role !== 'field_officer') {
      throw new ConvexError('Password change is available only to officers');
    }

    if (user.role === 'unit_officer') {
      const officer = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .unique();

      if (!officer) {
        throw new ConvexError('Unit Officer profile was not found');
      }

      return {
        userId: user._id,
        role: user.role,
        passwordHash: user.password,
        officerProfileId: officer._id,
        mustChangePassword: officer.mustChangePassword ?? true,
      };
    }

    const officer = await ctx.db
      .query('fieldOfficers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique();

    if (!officer) {
      throw new ConvexError('Field Officer profile was not found');
    }

    return {
      userId: user._id,
      role: user.role,
      passwordHash: user.password,
      officerProfileId: officer._id,
      mustChangePassword: officer.mustChangePassword ?? true,
    };
  },
});

export const saveOfficerPasswordChange = internalMutation({
  args: {
    userId: v.id('users'),
    role: v.union(v.literal('unit_officer'), v.literal('field_officer')),
    newPasswordHash: v.string(),
    changedAt: v.number(),
    expectedCurrentPasswordHash: v.string(),
  },

  handler: async (ctx, args) => {
    // 1. Re-read and verify the user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError('User account was not found');
    }

    // 2. Protect from stale concurrent requests
    if (user.password !== args.expectedCurrentPasswordHash) {
      throw new ConvexError(
        'The password was changed by another request. Please sign in again.'
      );
    }

    // 3. Update user password
    await ctx.db.patch(args.userId, {
      password: args.newPasswordHash,
    });

    // 4. Update the matching officer profile and set mustChangePassword: false, passwordChangedAt
    if (args.role === 'unit_officer') {
      const officer = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .unique();

      if (!officer) {
        throw new ConvexError('Unit Officer profile was not found');
      }

      await ctx.db.patch(officer._id, {
        mustChangePassword: false,
        passwordChangedAt: args.changedAt,
      });
    } else if (args.role === 'field_officer') {
      const officer = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .unique();

      if (!officer) {
        throw new ConvexError('Field Officer profile was not found');
      }

      await ctx.db.patch(officer._id, {
        mustChangePassword: false,
        passwordChangedAt: args.changedAt,
      });
    }

    return { success: true };
  },
});
