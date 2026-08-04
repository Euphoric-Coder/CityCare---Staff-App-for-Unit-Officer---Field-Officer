import { v } from 'convex/values';
import { query } from './_generated/server';

export const checkPasswordResetRequestStatus = query({
  args: {
    requestId: v.id('passwordResetRequests'),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return {
        status: 'expired' as const,
        deliveryStatus: 'failed' as const,
        expiresAt: 0,
        resendAllowedAt: 0,
        attemptsRemaining: 0,
      };
    }

    const now = Date.now();
    let currentStatus = request.status;

    if (currentStatus === 'pending' && request.expiresAt <= now) {
      currentStatus = 'expired';
    }

    return {
      status: currentStatus,
      deliveryStatus: request.deliveryStatus,
      expiresAt: request.expiresAt,
      resendAllowedAt: request.resendAllowedAt,
      attemptsRemaining: request.attemptsRemaining,
      supersededByRequestId: request.supersededByRequestId,
    };
  },
});

export const checkPasswordResetSessionStatus = query({
  args: {
    resetSessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.resetSessionToken || args.resetSessionToken.trim().length === 0) {
      return {
        valid: false,
        status: 'invalid' as const,
      };
    }

    // Standard HMAC SHA256 using Web Crypto API in Convex environment
    const secret = process.env.PASSWORD_RESET_TOKEN_SECRET || 'citycare-token-secret-default-key';
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const tokenData = encoder.encode(args.resetSessionToken);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, tokenData);
    const tokenHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const session = await ctx.db
      .query('passwordResetSessions')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', tokenHash))
      .first();

    if (!session) {
      return {
        valid: false,
        status: 'invalid' as const,
      };
    }

    const now = Date.now();

    if (session.usedAt) {
      return {
        valid: false,
        status: 'used' as const,
      };
    }

    if (session.revokedAt) {
      return {
        valid: false,
        status: 'revoked' as const,
      };
    }

    if (session.expiresAt <= now) {
      return {
        valid: false,
        status: 'expired' as const,
      };
    }

    return {
      valid: true,
      status: 'valid' as const,
      expiresAt: session.expiresAt,
    };
  },
});
