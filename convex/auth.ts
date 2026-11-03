'use node';

import { action } from './_generated/server';
import { v } from 'convex/values';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { api, internal } from './_generated/api';

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

    // Generate 256-bit cryptographically secure session token
    const tokenBytes = crypto.randomBytes(32).toString('hex');
    const sessionToken = 'citycare_sec_' + tokenBytes;

    const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'citycare-session-token-secret-v1';
    const tokenHash = crypto.createHmac('sha256', secret).update(sessionToken).digest('hex');
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.runMutation((internal as any).authInternal.createSessionRecord, {
      userId: user._id,
      role: user.role,
      tokenHash,
      expiresAt,
    });

    return {
      success: true,
      token: sessionToken,
      sessionToken: sessionToken,
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
