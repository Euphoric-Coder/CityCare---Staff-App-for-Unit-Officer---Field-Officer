import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* Generate Upload URL */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/* Get Public URL */
export const getMediaUrl = query({
  args: {
    storageId: v.id("_storage"),
  },

  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/* Delete Media */
export const deleteMedia = mutation({
  args: {
    storageId: v.id("_storage"),
  },

  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});

export const getFileMeta = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    const meta = await ctx.db.system.get(args.storageId);

    return {
      url,
      contentType: meta?.contentType || "",
    };
  },
});
