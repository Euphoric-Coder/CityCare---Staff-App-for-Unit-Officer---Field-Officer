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

export const passwordRecoveryRoleValidator = v.union(
  v.literal('citizen'),
  v.literal('unit_officer'),
  v.literal('field_officer'),
  v.literal('city_admin'),
  v.literal('admin')
);

export const getPasswordResetAccountByEmailAndRole = internalQuery({
  args: {
    emailNormalized: v.string(),
    accountRole: passwordRecoveryRoleValidator,
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.emailNormalized.trim().toLowerCase();

    let user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', normalizedEmail))
      .first();

    if (!user) {
      const candidates = await ctx.db.query('users').collect();
      user = candidates.find((c) => c.email.trim().toLowerCase() === normalizedEmail) ?? null;
    }

    if (!user) return null;

    if (user.role !== args.accountRole) {
      return null;
    }

    switch (args.accountRole) {
      case 'citizen': {
        const profile = await ctx.db
          .query('citizens')
          .withIndex('by_user', (q) => q.eq('userId', user._id!))
          .first();
        return { user, profile: profile ?? null, userId: user._id, role: 'citizen' as const };
      }
      case 'unit_officer': {
        const profile = await ctx.db
          .query('unitOfficers')
          .withIndex('by_user', (q) => q.eq('userId', user._id!))
          .first();
        if (!profile) return null;
        return { user, profile, userId: user._id, role: 'unit_officer' as const };
      }
      case 'field_officer': {
        const profile = await ctx.db
          .query('fieldOfficers')
          .withIndex('by_user', (q) => q.eq('userId', user._id!))
          .first();
        if (!profile) return null;
        return { user, profile, userId: user._id, role: 'field_officer' as const };
      }
      case 'city_admin': {
        const profile = await ctx.db
          .query('cityAdmins')
          .withIndex('by_user', (q) => q.eq('userId', user._id!))
          .first();
        return { user, profile: profile ?? null, userId: user._id, role: 'city_admin' as const };
      }
      case 'admin':
        return { user, profile: null, userId: user._id, role: 'admin' as const };
    }
  },
});

export const createResetRequest = internalMutation({
  args: {
    userId: v.id('users'),
    officerRole: passwordRecoveryRoleValidator,
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
    officerRole: passwordRecoveryRoleValidator,
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

    // Accept any valid recovery role (handled by the schema validator automatically).

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
      nextPasswordChangeAllowedAt: args.nextPasswordChangeAllowedAt,
    });

    if (args.officerRole === 'unit_officer') {
      const officer = await ctx.db.query('unitOfficers').withIndex('by_user', (q) => q.eq('userId', args.userId)).unique();
      if (officer) {
        await ctx.db.patch(officer._id, {
          mustChangePassword: false,
          passwordChangedAt: args.passwordChangedAt,
          nextPasswordChangeAllowedAt: args.nextPasswordChangeAllowedAt,
          passwordChangeCooldownDays: args.passwordChangeCooldownDays,
        });
      }
    } else if (args.officerRole === 'field_officer') {
      const officer = await ctx.db.query('fieldOfficers').withIndex('by_user', (q) => q.eq('userId', args.userId)).unique();
      if (officer) {
        await ctx.db.patch(officer._id, {
          mustChangePassword: false,
          passwordChangedAt: args.passwordChangedAt,
          nextPasswordChangeAllowedAt: args.nextPasswordChangeAllowedAt,
          passwordChangeCooldownDays: args.passwordChangeCooldownDays,
        });
      }
    } else if (args.officerRole === 'city_admin') {
      const cityAdmin = await ctx.db.query('cityAdmins').withIndex('by_user', (q) => q.eq('userId', args.userId)).unique();
      if (cityAdmin) {
        await ctx.db.patch(cityAdmin._id, { 
          mustChangePassword: false,
          nextPasswordChangeAllowedAt: args.nextPasswordChangeAllowedAt,
        });
      }
    } else if (args.officerRole === 'citizen') {
      const citizen = await ctx.db.query('citizens').withIndex('by_user', (q) => q.eq('userId', args.userId)).first();
      if (citizen) {
        await ctx.db.patch(citizen._id, {
          nextPasswordChangeAllowedAt: args.nextPasswordChangeAllowedAt,
        });
      }
    }
    // Admin does not require a dedicated profile update because the users table patch above already applies nextPasswordChangeAllowedAt to their primary record.


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
