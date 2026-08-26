"use node";

import bcrypt from "bcryptjs";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const DEMO_PASSWORD = "CityCare@Demo2026";

export const repairDemoPasswordsAction = internalAction({
  args: {},
  handler: async (ctx) => {
    const demoUsers: Array<{ _id: any; email: string; password?: string }> =
      await ctx.runQuery(internal.demoSeed.getDemoUsersForPasswordRepair, {});

    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
    const idsToRepair: any[] = [];

    for (const user of demoUsers) {
      let isValid = false;
      if (user.password) {
        try {
          isValid = await bcrypt.compare(DEMO_PASSWORD, user.password);
        } catch {
          isValid = false;
        }
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

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, rounds);

    const repairResult = await ctx.runMutation(
      internal.demoSeed.applyDemoPasswordRepair,
      {
        userIds: idsToRepair,
        passwordHash,
      }
    );

    return {
      success: true,
      checked: demoUsers.length,
      repaired: repairResult.repaired,
      unchanged: demoUsers.length - repairResult.repaired,
    };
  },
});

export const ensureDemoBaseline = internalAction({
  args: {},
  handler: async (ctx) => {
    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, rounds);

    const seedResult = await ctx.runMutation(
      internal.demoSeed.seedDemoDataOnce,
      {
        passwordHash,
      }
    );

    const passwordRepair = await ctx.runAction(
      internal.demoSeedPasswords.repairDemoPasswordsAction,
      {}
    );

    return {
      success: true,
      seed: seedResult,
      passwordRepair,
    };
  },
});
