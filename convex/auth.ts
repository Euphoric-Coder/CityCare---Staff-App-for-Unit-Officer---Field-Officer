'use node';

import { action } from './_generated/server';
import { v } from 'convex/values';
import bcrypt from 'bcryptjs';
import { api } from './_generated/api';

// @ts-ignore
export const verifyUser = action({
  args: {
    email: v.string(),
    password: v.string(),
    role: v.optional(v.string()),
  },

  // @ts-ignore
  handler: async (ctx, args) => {
    // @ts-ignore
    const user = await ctx.runQuery(api.users.getUserByEmail, {
      email: args.email.toLowerCase(),
    });

    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    const isValid = await bcrypt.compare(args.password, user.password);

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    const normalizedRole = args.role?.toLowerCase().replace(/\s+/g, '_');

    if (normalizedRole && user.role !== normalizedRole) {
      return {
        success: false,
        error: 'Role mismatch. Please select the correct role.',
      };
    }

    let mustChangePassword = false;

    if (user.role === 'unit_officer' || user.role === 'field_officer') {
      const officer = await ctx.runQuery(api.users.getOfficerProfile, {
        userId: user._id,
        role: user.role,
      });

      mustChangePassword = officer?.mustChangePassword ?? true;
    }

    return {
      success: true,

      token: 'token-' + user._id,

      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        mustChangePassword,
      },
    };
  },
});
