import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByIssueId = query({
  args: {
    issueId: v.id("issues"),
  },
  handler: async (ctx, args) => {
    const updates = await ctx.db
      .query("issueUpdates")
      .withIndex("by_issue", (q) => q.eq("issueId", args.issueId))
      .order("asc")
      .collect();

    const enriched = await Promise.all(
      updates.map(async (u) => {
        const user = await ctx.db.get(u.updatedBy);

        const attachments = await Promise.all(
          (u.attachments || []).map(async (fileId) => {
            const url = await ctx.storage.getUrl(fileId);

            // KEY PART
            const meta = await ctx.db.system.get(fileId);

            return {
              url,
              contentType: meta?.contentType || "",
              storageId: fileId,
            };
          }),
        );

        return {
          ...u,
          updater: user,
          attachments,
        };
      }),
    );

    return enriched;
  },
});
