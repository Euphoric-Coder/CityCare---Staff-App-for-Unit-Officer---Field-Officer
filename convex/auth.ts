'use node';

import { action } from './_generated/server';
import { v } from 'convex/values';
import bcrypt from 'bcryptjs';
import { api } from './_generated/api';

export const verifyUser = action({
  args: {
    email: v.string(),
    password: v.string(),
  },

  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getUserByEmail, {
      email: args.email.toLowerCase(),
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(args.password, user.password);

    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    return {
      token: 'token-' + user._id,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  },
});
