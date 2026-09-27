'use node';

import bcrypt from 'bcryptjs';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';

const DEMO_PASSWORD = 'CityCare@Demo2026';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

/**
 * Node action to repair passwords of known deterministic demo users.
 * Checks existing passwords with bcrypt.compare; if invalid or plaintext, patches with valid bcrypt hash.
 */
export const repairDemoPasswords = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; checked: number; repaired: number; unchanged: number }> => {
    const demoUsers: Array<{ _id: Id<'users'>; email: string; password?: string }> =
      await ctx.runQuery(internal.demoSeed.getDemoUsersForPasswordRepair, {});

    const idsToRepair: Id<'users'>[] = [];

    for (const user of demoUsers) {
      let isValid = false;
      try {
        if (user.password && typeof user.password === 'string') {
          isValid = await bcrypt.compare(DEMO_PASSWORD, user.password);
        }
      } catch {
        isValid = false;
      }

      if (!isValid) {
        idsToRepair.push(user._id);
      }
    }

    if (idsToRepair.length === 0) {
      return {
        success: true,
        checked: demoUsers.length,
        repaired: 0,
        unchanged: demoUsers.length,
      };
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

    const result = await ctx.runMutation(
      internal.demoSeed.applyDemoPasswordRepair,
      {
        userIds: idsToRepair,
        passwordHash,
      }
    );

    return {
      success: true,
      checked: demoUsers.length,
      repaired: result.repaired,
      unchanged: demoUsers.length - result.repaired,
    };
  },
});

export const repairDemoPasswordsAction = repairDemoPasswords;

/**
 * Main Node action orchestrator invoked by Cron or manual trigger.
 * Generates bcrypt passwordHash, seeds demo baseline data if needed, and repairs existing demo passwords.
 */
export const ensureDemoBaseline = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; seed: any; passwordRepair: any }> => {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

    const seedResult = await ctx.runMutation(
      internal.demoSeed.seedDemoDataOnce,
      { passwordHash }
    );

    const passwordRepairResult = await ctx.runAction(
      internal.demoSeedPasswords.repairDemoPasswords,
      {}
    );

    return {
      success: true,
      seed: seedResult,
      passwordRepair: passwordRepairResult,
    };
  },
});
