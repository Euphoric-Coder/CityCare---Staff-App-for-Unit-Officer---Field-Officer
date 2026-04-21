import { v } from "convex/values";
import { query } from "./_generated/server";

export const getFieldOfficerByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fieldOfficers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});
