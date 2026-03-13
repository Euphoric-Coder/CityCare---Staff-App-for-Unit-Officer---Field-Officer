import { query } from "./_generated/server";
import { v } from "convex/values";

export const getActiveIssuesForDuplicateCheck = query({
  args: {
    city: v.string(),
  },
  handler: async (ctx, args) => {
    const issues = await ctx.db
      .query("issues")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .collect();

    // Exclude resolved / closed
    return issues.filter(
      (issue) => issue.status !== "resolved" && issue.status !== "closed",
    );
  },
});
