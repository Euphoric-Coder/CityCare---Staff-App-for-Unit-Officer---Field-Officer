'use node';

import { v, ConvexError } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { randomInt, randomBytes, createHmac } from 'node:crypto';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

const OTP_SECRET = process.env.PASSWORD_RESET_OTP_SECRET || 'citycare-otp-secret-default-key';
const TOKEN_SECRET = process.env.PASSWORD_RESET_TOKEN_SECRET || 'citycare-token-secret-default-key';
const SENDER_EMAIL = process.env.CITYCARE_EMAIL_FROM || 'CityCare Security <security@citycare.dev>';

const getResendClient = (): Resend => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new ConvexError({
      code: 'RESEND_KEY_MISSING',
      message: 'RESEND_API_KEY is not configured on backend environment.',
    });
  }
  return new Resend(apiKey);
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const parts = normalized.split('@');
  if (parts.length !== 2) return email;

  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }

  const firstChar = name[0];
  const lastChar = name[name.length - 1];
  const maskedMiddle = '*'.repeat(Math.min(name.length - 2, 4));

  return `${firstChar}${maskedMiddle}${lastChar}@${domain}`;
}

function hashOtp(otp: string): string {
  return createHmac('sha256', OTP_SECRET).update(otp).digest('hex');
}

function hashResetToken(token: string): string {
  return createHmac('sha256', TOKEN_SECRET).update(token).digest('hex');
}

function generateOtpEmailTemplate(otp: string) {
  const cityCareLogoUrl =
    process.env.CITYCARE_LOGO_URL ??
    'https://ik.imagekit.io/5zzchrjn8/logo.png?updatedAt=1776289771752';
  const supportEmail =
    process.env.CITYCARE_SUPPORT_EMAIL ?? 'support@citycare.dev';
  const currentYear = new Date().getFullYear();

  const text = `
CityCare Security

Your password verification code is: ${otp}

This code expires in 10 minutes.

Enter this code in the CityCare officer mobile application to continue resetting your password.

Never share this code with anyone. CityCare administrators will never ask for your verification code or password.

If you did not request this password reset, you can safely ignore this email.
`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>CityCare Password Verification</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #ecfdf5;
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="
        width: 100%;
        margin: 0;
        padding: 0;
        background-color: #ecfdf5;
      "
    >
      <tr>
        <td
          align="center"
          style="
            padding: 40px 16px;
          "
        >
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              width: 100%;
              max-width: 580px;
              background-color: #ffffff;
              border: 1px solid #a7f3d0;
              border-radius: 22px;
              overflow: hidden;
              box-shadow: 0 18px 45px rgba(6, 95, 70, 0.12);
            "
          >
            <!-- Header -->
            <tr>
              <td
                align="center"
                style="
                  padding: 36px 32px 30px;
                  background-color: #d1fae5;
                  background-image: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 48%, #ccfbf1 100%);
                  border-bottom: 1px solid #a7f3d0;
                "
              >
                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  <tr>
                    <td
                      align="center"
                      style="
                        padding: 10px;
                        background-color: #ffffff;
                        border: 1px solid #a7f3d0;
                        border-radius: 18px;
                        box-shadow: 0 8px 20px rgba(5, 150, 105, 0.12);
                      "
                    >
                      <img
                        src="${cityCareLogoUrl}"
                        width="72"
                        height="72"
                        alt="CityCare logo"
                        style="
                          display: block;
                          width: 72px;
                          height: 72px;
                          object-fit: contain;
                          border: 0;
                          outline: none;
                          text-decoration: none;
                        "
                      />
                    </td>
                  </tr>
                </table>

                <h1
                  style="
                    margin: 18px 0 0;
                    color: #064e3b;
                    font-size: 28px;
                    line-height: 1.2;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                  "
                >
                  CityCare Security
                </h1>

                <p
                  style="
                    margin: 8px 0 0;
                    color: #047857;
                    font-size: 14px;
                    line-height: 1.5;
                    font-weight: 700;
                  "
                >
                  Municipal Officer Account Recovery
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td
                style="
                  padding: 34px 34px 30px;
                "
              >
                <p
                  style="
                    margin: 0 0 10px;
                    color: #0f172a;
                    font-size: 19px;
                    line-height: 1.5;
                    font-weight: 800;
                  "
                >
                  Verify your password-reset request
                </p>

                <p
                  style="
                    margin: 0 0 26px;
                    color: #475569;
                    font-size: 14px;
                    line-height: 1.75;
                  "
                >
                  We received a request to reset the password for your CityCare officer account. Enter the verification code below in the CityCare mobile application.
                </p>

                <!-- OTP Card -->
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    width: 100%;
                    margin-bottom: 24px;
                  "
                >
                  <tr>
                    <td
                      align="center"
                      style="
                        padding: 28px 18px;
                        background-color: #ecfdf5;
                        border: 2px solid #6ee7b7;
                        border-radius: 18px;
                      "
                    >
                      <p
                        style="
                          margin: 0 0 12px;
                          color: #047857;
                          font-size: 12px;
                          line-height: 1.4;
                          font-weight: 800;
                          letter-spacing: 1.5px;
                          text-transform: uppercase;
                        "
                      >
                        Your verification code
                      </p>

                      <div
                        style="
                          display: inline-block;
                          padding: 6px 12px;
                          color: #064e3b;
                          font-family: 'Courier New', Courier, monospace;
                          font-size: 40px;
                          line-height: 1.25;
                          font-weight: 900;
                          letter-spacing: 10px;
                          white-space: nowrap;
                        "
                      >
                        ${otp}
                      </div>

                      <table
                        role="presentation"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        style="
                          margin-top: 16px;
                        "
                      >
                        <tr>
                          <td
                            style="
                              padding: 7px 13px;
                              background-color: #ffffff;
                              border: 1px solid #a7f3d0;
                              border-radius: 999px;
                            "
                          >
                            <span
                              style="
                                color: #059669;
                                font-size: 12px;
                                line-height: 1.4;
                                font-weight: 800;
                              "
                            >
                              Expires in 10 minutes
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Steps -->
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    width: 100%;
                    margin-bottom: 24px;
                  "
                >
                  <tr>
                    <td
                      style="
                        padding: 18px 20px;
                        background-color: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 14px;
                      "
                    >
                      <p
                        style="
                          margin: 0 0 10px;
                          color: #334155;
                          font-size: 13px;
                          font-weight: 800;
                        "
                      >
                        What to do next
                      </p>

                      <p
                        style="
                          margin: 0 0 6px;
                          color: #475569;
                          font-size: 13px;
                          line-height: 1.6;
                        "
                      >
                        1. Open the CityCare officer mobile application.
                      </p>

                      <p
                        style="
                          margin: 0 0 6px;
                          color: #475569;
                          font-size: 13px;
                          line-height: 1.6;
                        "
                      >
                        2. Enter the six-digit verification code.
                      </p>

                      <p
                        style="
                          margin: 0;
                          color: #475569;
                          font-size: 13px;
                          line-height: 1.6;
                        "
                      >
                        3. Create and confirm your new password.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Security Notice -->
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    width: 100%;
                    margin-bottom: 24px;
                  "
                >
                  <tr>
                    <td
                      style="
                        padding: 17px 18px;
                        background-color: #fffbeb;
                        border: 1px solid #fde68a;
                        border-radius: 14px;
                      "
                    >
                      <p
                        style="
                          margin: 0 0 6px;
                          color: #92400e;
                          font-size: 13px;
                          line-height: 1.5;
                          font-weight: 800;
                        "
                      >
                        Security reminder
                      </p>

                      <p
                        style="
                          margin: 0;
                          color: #a16207;
                          font-size: 13px;
                          line-height: 1.65;
                        "
                      >
                        Never share this code with anyone. CityCare administrators will never ask for your verification code or password.
                      </p>
                    </td>
                  </tr>
                </table>

                <p
                  style="
                    margin: 0;
                    color: #64748b;
                    font-size: 13px;
                    line-height: 1.7;
                  "
                >
                  If you did not request this password reset, you can safely ignore this email. Your current password will remain unchanged.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                align="center"
                style="
                  padding: 22px 30px;
                  background-color: #f8fafc;
                  border-top: 1px solid #e2e8f0;
                "
              >
                <p
                  style="
                    margin: 0;
                    color: #64748b;
                    font-size: 12px;
                    line-height: 1.6;
                  "
                >
                  This is an automated security email from CityCare. Please do not reply.
                </p>

                <p
                  style="
                    margin: 8px 0 0;
                    color: #64748b;
                    font-size: 12px;
                    line-height: 1.5;
                  "
                >
                  Need help? Contact ${supportEmail}
                </p>

                <p
                  style="
                    margin: 8px 0 0;
                    color: #94a3b8;
                    font-size: 11px;
                    line-height: 1.5;
                  "
                >
                  © ${currentYear} CityCare Municipal Services
                </p>
              </td>
            </tr>
          </table>

          <p
            style="
              max-width: 520px;
              margin: 18px auto 0;
              color: #94a3b8;
              font-size: 11px;
              line-height: 1.6;
              text-align: center;
            "
          >
            This message was sent because a password-reset request was made for a registered CityCare officer account.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { text, html };
}

export const requestPasswordResetOtp = action({
  args: {
    email: v.string(),
    role: v.union(v.literal('unit_officer'), v.literal('field_officer')),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);

    const officerData = await ctx.runQuery(
      internal.passwordResetInternal.getOfficerByEmailAndRole,
      {
        emailNormalized: normalizedEmail,
        officerRole: args.role,
      }
    );

    if (!officerData) {
      return {
        success: false as const,
        code: 'OTP_REQUEST_NOT_FOUND' as const,
      };
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(otp);
    const maskedDeliveryEmail = maskEmail(normalizedEmail);

    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;
    const resendAllowedAt = now + 60 * 1000;

    const requestId = await ctx.runMutation(
      internal.passwordResetInternal.createResetRequest,
      {
        userId: officerData.userId,
        officerRole: args.role,
        emailNormalized: normalizedEmail,
        maskedDeliveryEmail,
        otpHash,
        expiresAt,
        resendAllowedAt,
        attemptsRemaining: 5,
      }
    );

    const resend = getResendClient();
    const { text, html } = generateOtpEmailTemplate(otp);

    try {
      const emailResponse = await resend.emails.send({
        from: SENDER_EMAIL,
        to: normalizedEmail,
        subject: 'Your CityCare password verification code',
        text,
        html,
      });

      await ctx.runMutation(internal.passwordResetInternal.markEmailDeliverySent, {
        requestId,
        providerMessageId: emailResponse.data?.id,
      });
    } catch (deliveryError: any) {
      await ctx.runMutation(internal.passwordResetInternal.markEmailDeliveryFailed, {
        requestId,
        deliveryFailureCategory: deliveryError?.message || 'Delivery error',
      });
      throw new ConvexError({
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'Failed to send verification code email via Resend.',
      });
    }

    return {
      success: true as const,
      requestId,
      maskedDeliveryEmail,
      officerRole: args.role,
      expiresAt,
      resendAllowedAt,
    };
  },
});

export const resendPasswordResetOtp = action({
  args: {
    requestId: v.id('passwordResetRequests'),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.runQuery(
      internal.passwordResetInternal.getOtpVerificationData,
      { requestId: args.requestId }
    );

    if (!existing) {
      throw new ConvexError({
        code: 'OTP_REQUEST_NOT_FOUND',
        message: 'The password-reset request was not found.',
      });
    }

    const now = Date.now();
    if (existing.resendAllowedAt > now) {
      const remainingSecs = Math.ceil((existing.resendAllowedAt - now) / 1000);
      throw new ConvexError({
        code: 'RESEND_COOLDOWN_ACTIVE',
        message: `Please wait ${remainingSecs} seconds before requesting another code.`,
      });
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(otp);

    const expiresAt = now + 10 * 60 * 1000;
    const resendAllowedAt = now + 60 * 1000;

    const newRequestId = await ctx.runMutation(
      internal.passwordResetInternal.createResetRequest,
      {
        userId: existing.userId,
        officerRole: existing.officerRole,
        emailNormalized: existing.emailNormalized,
        maskedDeliveryEmail: existing.maskedDeliveryEmail,
        otpHash,
        expiresAt,
        resendAllowedAt,
        attemptsRemaining: 5,
      }
    );

    const resend = getResendClient();
    const { text, html } = generateOtpEmailTemplate(otp);

    try {
      const emailResponse = await resend.emails.send({
        from: SENDER_EMAIL,
        to: existing.emailNormalized,
        subject: 'Your CityCare password verification code',
        text,
        html,
      });

      await ctx.runMutation(internal.passwordResetInternal.markEmailDeliverySent, {
        requestId: newRequestId,
        providerMessageId: emailResponse.data?.id,
      });
    } catch (err: any) {
      await ctx.runMutation(internal.passwordResetInternal.markEmailDeliveryFailed, {
        requestId: newRequestId,
        deliveryFailureCategory: err?.message || 'Delivery error',
      });
      throw new ConvexError({
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'Failed to deliver new verification code.',
      });
    }

    return {
      success: true,
      requestId: newRequestId,
      maskedDeliveryEmail: existing.maskedDeliveryEmail,
      expiresAt,
      resendAllowedAt,
    };
  },
});

export const verifyPasswordResetOtp = action({
  args: {
    requestId: v.id('passwordResetRequests'),
    otp: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.runQuery(
      internal.passwordResetInternal.getOtpVerificationData,
      { requestId: args.requestId }
    );

    if (!request) {
      throw new ConvexError({
        code: 'OTP_REQUEST_NOT_FOUND',
        message: 'The password-reset request was not found.',
      });
    }

    const now = Date.now();

    if (request.status === 'cancelled') {
      throw new ConvexError({
        code: 'OTP_CANCELLED',
        message: 'This verification request was cancelled. Please request a new code.',
      });
    }

    if (request.supersededByRequestId) {
      throw new ConvexError({
        code: 'OTP_SUPERSEDED',
        message: 'A newer verification code was issued. Please check your inbox for the latest code.',
      });
    }

    if (request.status === 'expired' || request.expiresAt <= now) {
      throw new ConvexError({
        code: 'OTP_EXPIRED',
        message: 'This verification code has expired. Request a new code.',
      });
    }

    if (request.status === 'locked' || request.attemptsRemaining <= 0) {
      throw new ConvexError({
        code: 'OTP_LOCKED',
        message: 'Too many incorrect attempts. Request a new verification code.',
      });
    }

    if (request.status !== 'pending') {
      throw new ConvexError({
        code: 'OTP_INVALID_STATUS',
        message: 'This verification code is no longer valid.',
      });
    }

    const submittedHash = hashOtp(args.otp.trim());

    if (submittedHash !== request.otpHash) {
      const remaining = Math.max(0, request.attemptsRemaining - 1);
      const newStatus = remaining === 0 ? 'locked' : 'pending';

      await ctx.runMutation(internal.passwordResetInternal.recordFailedAttempt, {
        requestId: args.requestId,
        attemptsRemaining: remaining,
        status: newStatus,
      });

      if (remaining === 0) {
        throw new ConvexError({
          code: 'OTP_LOCKED',
          message: 'Incorrect verification code. Too many attempts; code locked.',
        });
      }

      throw new ConvexError({
        code: 'OTP_INCORRECT',
        message: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
    }

    const resetToken = randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(resetToken);
    const sessionExpiresAt = now + 10 * 60 * 1000;

    await ctx.runMutation(
      internal.passwordResetInternal.markOtpVerifiedAndCreateSession,
      {
        requestId: args.requestId,
        userId: request.userId,
        tokenHash,
        sessionExpiresAt,
      }
    );

    return {
      success: true,
      resetSessionToken: resetToken,
      resetSessionExpiresAt: sessionExpiresAt,
    };
  },
});

export const completeForgottenPasswordReset = action({
  args: {
    resetSessionToken: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.resetSessionToken || args.resetSessionToken.trim().length === 0) {
      throw new ConvexError({
        code: 'RESET_SESSION_INVALID',
        message: 'Invalid password-reset session token.',
      });
    }

    const tokenHash = hashResetToken(args.resetSessionToken);
    const session = await ctx.runQuery(
      internal.passwordResetInternal.getSessionByTokenHash,
      { tokenHash }
    );

    if (!session) {
      throw new ConvexError({
        code: 'RESET_SESSION_INVALID',
        message: 'Password-reset session not found.',
      });
    }

    const now = Date.now();

    if (session.usedAt) {
      throw new ConvexError({
        code: 'RESET_SESSION_USED',
        message: 'This password-reset session has already been used.',
      });
    }

    if (session.revokedAt) {
      throw new ConvexError({
        code: 'RESET_SESSION_REVOKED',
        message: 'This password-reset session was revoked.',
      });
    }

    if (session.expiresAt <= now) {
      throw new ConvexError({
        code: 'RESET_SESSION_EXPIRED',
        message: 'Your password-reset session has expired. Please start again.',
      });
    }

    const request = await ctx.runQuery(
      internal.passwordResetInternal.getOtpVerificationData,
      { requestId: session.requestId }
    );

    if (!request) {
      throw new ConvexError({
        code: 'RESET_SESSION_INVALID',
        message: 'Associated password reset request was not found.',
      });
    }

    if (args.newPassword.length < 8) {
      throw new ConvexError({
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters long.',
      });
    }

    const user = await ctx.runQuery(internal.passwordResetInternal.getUserById, {
      userId: session.userId,
    });

    if (user && user.password) {
      const isPasswordReused = await bcrypt.compare(args.newPassword, user.password);
      if (isPasswordReused) {
        throw new ConvexError({
          code: 'PASSWORD_REUSE_NOT_ALLOWED',
          message: 'Your new password must be different from your current password.',
        });
      }
    }

    const changedAt = Date.now();
    const cooldownDays = 7;
    const nextAllowedAt = changedAt + cooldownDays * 24 * 60 * 60 * 1000;
    const newPasswordHash = await bcrypt.hash(args.newPassword, 10);

    console.info('PASSWORD_RESET_WRITE_CHECK', {
      hasUserId: Boolean(session.userId),
      officerRole: request.officerRole,
      hasNewPasswordHash: Boolean(newPasswordHash),
      resetSessionId: session._id,
      resetRequestId: request._id,
    });

    await ctx.runMutation(
      internal.passwordResetInternal.completePasswordResetInternal,
      {
        userId: session.userId,
        officerRole: request.officerRole,
        newPasswordHash,
        passwordChangedAt: changedAt,
        nextPasswordChangeAllowedAt: nextAllowedAt,
        passwordChangeCooldownDays: cooldownDays,
        resetSessionId: session._id,
        resetRequestId: request._id,
      }
    );

    return { success: true };
  },
});

export const getPasswordResetSessionStatus = action({
  args: {
    resetSessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.resetSessionToken || args.resetSessionToken.trim().length === 0) {
      return { valid: false, status: 'invalid' as const };
    }

    const tokenHash = hashResetToken(args.resetSessionToken);
    const session = await ctx.runQuery(
      internal.passwordResetInternal.getSessionByTokenHash,
      { tokenHash }
    );

    if (!session) {
      return { valid: false, status: 'invalid' as const };
    }

    const now = Date.now();
    if (session.usedAt) return { valid: false, status: 'used' as const };
    if (session.revokedAt) return { valid: false, status: 'revoked' as const };
    if (session.expiresAt <= now) return { valid: false, status: 'expired' as const };

    return {
      valid: true,
      status: 'valid' as const,
      expiresAt: session.expiresAt,
    };
  },
});
