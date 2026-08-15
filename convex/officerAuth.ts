'use node';

import bcrypt from 'bcryptjs';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { v, ConvexError } from 'convex/values';

export const changeOfficerPassword = action({
  args: {
    userId: v.id('users'),
    currentPassword: v.string(),
    newPassword: v.string(),
  },

  handler: async (ctx, args) => {
    // 1. Trim current password check only for empty checking
    const currentTrimmed = args.currentPassword.trim();
    if (!args.currentPassword || currentTrimmed === '') {
      throw new ConvexError('Current password is required');
    }

    if (!args.newPassword) {
      throw new ConvexError('New password is required');
    }

    // Security Check / Documentation (Requirement 11)
    // Production authentication should verify that the user identity matches the target userId.
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      // If Convex Auth is configured, verify the authenticated identity corresponds to the requested user profile
      // Example check:
      // if (identity.subject !== args.userId) {
      //   throw new ConvexError("Unauthorized: You cannot change another user's password.");
      // }
    }

    // 2. Retrieve required user and officer information
    const data = await ctx.runQuery(internal.officerAuthInternal.getOfficerPasswordChangeData, {
      userId: args.userId,
    });

    // 3. Validate the current password with bcrypt.compare()
    // Compare the actual raw password string (untrimmed) for cryptographic matching
    const currentPasswordMatches = await bcrypt.compare(args.currentPassword, data.passwordHash);

    if (!currentPasswordMatches) {
      throw new ConvexError('The current password is incorrect');
    }

    // 4. Enforce new-password requirements matching the UI policy
    const newPwd = args.newPassword;
    const hasMinLength = newPwd.length >= 8;
    const hasUpperCase = /[A-Z]/.test(newPwd);
    const hasLowerCase = /[a-z]/.test(newPwd);
    const hasNumber = /[0-9]/.test(newPwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPwd);

    if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      throw new ConvexError(
        'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.'
      );
    }

    // 5. Enforce password difference checks
    if (args.newPassword === args.currentPassword) {
      throw new ConvexError('New password must be different from your current password');
    }

    // Enforce that new password does not hash to the same value as current hash
    const isSameAsOldHash = await bcrypt.compare(args.newPassword, data.passwordHash);
    if (isSameAsOldHash) {
      throw new ConvexError('New password must be different from your current password');
    }

    // 6. Generate the new hash with bcrypt.hash() using 10 rounds to match provisioning
    const newPasswordHash = await bcrypt.hash(args.newPassword, 10);

    // 7. Send resulting hash, role, and IDs to internal mutation
    await ctx.runMutation(internal.officerAuthInternal.saveOfficerPasswordChange, {
      userId: data.userId,
      role: data.role as 'unit_officer' | 'field_officer',
      newPasswordHash,
      changedAt: Date.now(),
      expectedCurrentPasswordHash: data.passwordHash,
    });

    return {
      success: true as const,
      mustChangePassword: false,
    };
  },
});
