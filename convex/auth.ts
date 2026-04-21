"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { api } from "./_generated/api";

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

    // Do NOT throw
    if (!user) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    const isValid = await bcrypt.compare(args.password, user.password);

    if (!isValid) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Role mismatch check
    if (args.role && user.role !== args.role.toLowerCase().replace(" ", "_")) {
      return {
        success: false,
        error: "Role mismatch. Please select the correct role.",
      };
    }

    return {
      success: true,
      token: "token-" + user._id,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  },
});
