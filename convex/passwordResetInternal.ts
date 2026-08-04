import { v, ConvexError } from 'convex/values';
import { internalQuery, internalMutation } from './_generated/server';

export const getUserById = internalQuery({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getOfficerByEmailAndRole = internalQuery({
  args: {
    emailNormalized: v.string(),
    officerRole: v.union(v.literal('unit_officer'), v.literal('field_officer')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.emailNormalized))
      .first();

    if (!user) return null;

    if (args.officerRole === 'unit_officer') {
      const officer = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first();

      if (!officer) return null;
      return { user, officer, userId: user._id };
    } else {
      const officer = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first();

      if (!officer) return null;
      return { user, officer, userId: user._id };
    }
  },
});

export const createResetRequest = internalMutation({
  args: {
    userId: v.id('users'),
    officerRole: v.union(v.literal('unit_officer'), v.literal('field_officer')),
    emailNormalized: v.string(),
    maskedDeliveryEmail: v.string(),
    otpHash: v.string(),
    expiresAt: v.number(),
    resendAllowedAt: v.number(),
    attemptsRemaining: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Cancel old active pending requests prior to creating new request
    const existing = await ctx.db
      .query('passwordResetRequests')
      .withIndex('by_email', (q) => q.eq('emailNormalized', args.emailNormalized))
      .collect();

    for (const req of existing) {
      if (req.status === 'pending') {
        await ctx.db.patch(req._id, {
          status: 'cancelled',
          invalidatedAt: now,
          updatedAt: now,
        });
      }
    }

    const requestId = await ctx.db.insert('passwordResetRequests', {
      userId: args.userId,
      officerRole: args.officerRole,
      emailNormalized: args.emailNormalized,
      maskedDeliveryEmail: args.maskedDeliveryEmail,
      otpHash: args.otpHash,
      expiresAt: args.expiresAt,
      resendAllowedAt: args.resendAllowedAt,
      attemptsRemaining: args.attemptsRemaining,
      status: 'pending',
      deliveryStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return requestId;
  },
});

export const markEmailDeliverySent = internalMutation({
  args: {
    requestId: v.id('passwordResetRequests'),
    providerMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      deliveryStatus: 'sent',
      emailSentAt: now,
      providerMessageId: args.providerMessageId,
      updatedAt: now,
    });
  },
});

export const markEmailDeliveryFailed = internalMutation({
  args: {
    requestId: v.id('passwordResetRequests'),
    deliveryFailureCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      deliveryStatus: 'failed',
      deliveryFailureCategory: args.deliveryFailureCategory,
      updatedAt: now,
    });
  },
});

export const getOtpVerificationData = internalQuery({
  args: {
    requestId: v.id('passwordResetRequests'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.requestId);
  },
});

export const recordFailedAttempt = internalMutation({
  args: {
    requestId: v.id('passwordResetRequests'),
    attemptsRemaining: v.number(),
    status: v.union(v.literal('pending'), v.literal('locked')),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      attemptsRemaining: args.attemptsRemaining,
      status: args.status,
      updatedAt: now,
    });
  },
});

export const markOtpVerifiedAndCreateSession = internalMutation({
  args: {
    requestId: v.id('passwordResetRequests'),
    userId: v.id('users'),
    tokenHash: v.string(),
    sessionExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Mark request as verified
    await ctx.db.patch(args.requestId, {
      status: 'verified',
      verifiedAt: now,
      updatedAt: now,
    });

    // Revoke old sessions for this user
    const existingSessions = await ctx.db
      .query('passwordResetSessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    for (const session of existingSessions) {
      if (!session.usedAt && !session.revokedAt) {
        await ctx.db.patch(session._id, {
          revokedAt: now,
        });
      }
    }

    // Insert new session token hash
    const sessionId = await ctx.db.insert('passwordResetSessions', {
      userId: args.userId,
      requestId: args.requestId,
      tokenHash: args.tokenHash,
      expiresAt: args.sessionExpiresAt,
      createdAt: now,
    });

    return sessionId;
  },
});

export const getSessionByTokenHash = internalQuery({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('passwordResetSessions')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', args.tokenHash))
      .first();
  },
});

export const completePasswordResetInternal = internalMutation({
  args: {
    userId: v.id('users'),
    officerRole: v.union(v.literal('unit_officer'), v.literal('field_officer')),
    newPasswordHash: v.string(),
    passwordChangedAt: v.number(),
    nextPasswordChangeAllowedAt: v.number(),
    passwordChangeCooldownDays: v.number(),
    resetSessionId: v.id('passwordResetSessions'),
    resetRequestId: v.id('passwordResetRequests'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new ConvexError({
        code: 'USER_NOT_FOUND',
        message: 'The officer account could not be found.',
      });
    }

    if (user.role !== 'unit_officer' && user.role !== 'field_officer') {
      throw new ConvexError({
        code: 'INVALID_OFFICER_ROLE',
        message: 'This account is not eligible for officer password reset.',
      });
    }

    if (user.role !== args.officerRole) {
      throw new ConvexError({
        code: 'OFFICER_ROLE_MISMATCH',
        message: 'The officer role does not match the account.',
      });
    }

    const resetSession = await ctx.db.get(args.resetSessionId);

    if (!resetSession) {
      throw new ConvexError({
        code: 'RESET_SESSION_INVALID',
        message: 'The password-reset session is invalid.',
      });
    }

    if (resetSession.userId !== args.userId) {
      throw new ConvexError({
        code: 'RESET_SESSION_INVALID',
        message: 'The password-reset session is invalid.',
      });
    }

    if (resetSession.usedAt) {
      throw new ConvexError({
        code: 'RESET_SESSION_USED',
        message: 'This password-reset session has already been used.',
      });
    }

    if (resetSession.revokedAt) {
      throw new ConvexError({
        code: 'RESET_SESSION_REVOKED',
        message: 'This password-reset session is no longer valid.',
      });
    }

    if (resetSession.expiresAt <= args.passwordChangedAt) {
      throw new ConvexError({
        code: 'RESET_SESSION_EXPIRED',
        message: 'The password-reset session has expired.',
      });
    }

    console.info('PATCHING_USER_PASSWORD_FIELD', {
      userId: args.userId,
      field: 'password',
    });

    /*
     * Store the bcrypt hash in the existing
     * users.password field.
     *
     * Never write a passwordHash property.
     */
    await ctx.db.patch(args.userId, {
      password: args.newPasswordHash,
    });

    if (args.officerRole === 'unit_officer') {
      const officer = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .unique();

      if (!officer) {
        throw new ConvexError({
          code: 'OFFICER_PROFILE_NOT_FOUND',
          message: 'The Unit Officer profile could not be found.',
        });
      }

      await ctx.db.patch(officer._id, {
        mustChangePassword: false,
        passwordChangedAt: args.passwordChangedAt,
        nextPasswordChangeAllowedAt: args.nextPasswordChangeAllowedAt,
        passwordChangeCooldownDays: args.passwordChangeCooldownDays,
      });
    } else {
      const officer = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .unique();

      if (!officer) {
        throw new ConvexError({
          code: 'OFFICER_PROFILE_NOT_FOUND',
          message: 'The Field Officer profile could not be found.',
        });
      }

      await ctx.db.patch(officer._id, {
        mustChangePassword: false,
        passwordChangedAt: args.passwordChangedAt,
        nextPasswordChangeAllowedAt: args.nextPasswordChangeAllowedAt,
        passwordChangeCooldownDays: args.passwordChangeCooldownDays,
      });
    }

    await ctx.db.patch(args.resetSessionId, {
      usedAt: args.passwordChangedAt,
    });

    await ctx.db.patch(args.resetRequestId, {
      status: 'completed',
      completedAt: args.passwordChangedAt,
      updatedAt: args.passwordChangedAt,
    });

    return {
      success: true,
    };
  },
});

export const completePasswordResetTransaction = completePasswordResetInternal;
