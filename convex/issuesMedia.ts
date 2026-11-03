import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import {
  requireAuthenticatedUser,
  assertIdentityMatch,
  validateStoredMedia,
} from "./lib/authorization";

/* Generate Upload URL */
export const generateUploadUrl = mutation({
  args: {
    userId: v.optional(v.id("users")),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If caller provided session token or userId, enforce authentication check
    if (args.sessionToken || args.userId) {
      const auth = await requireAuthenticatedUser(ctx, args.sessionToken);
      if (args.userId) {
        assertIdentityMatch(auth.userId, args.userId);
      }
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/* Record and validate an uploaded media attachment */
export const recordMediaAttachment = mutation({
  args: {
    storageId: v.id("_storage"),
    userId: v.id("users"),
    issueId: v.optional(v.id("issues")),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionToken);
    assertIdentityMatch(auth.userId, args.userId);

    // Validate media against allowed MIME types and max size (15MB)
    const media = await validateStoredMedia(ctx, args.storageId, { allowDelete: true });

    // Track in mediaAttachments table
    const attachmentId = await ctx.db.insert("mediaAttachments", {
      storageId: args.storageId,
      uploadedBy: auth.userId,
      issueId: args.issueId,
      mimeType: media.contentType,
      size: media.size,
      status: "uploaded",
      createdAt: Date.now(),
    });

    return { success: true, attachmentId };
  },
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
    userId: v.optional(v.id("users")),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionToken);
    if (args.userId) {
      assertIdentityMatch(auth.userId, args.userId);
    }

    const attachment = await ctx.db
      .query("mediaAttachments")
      .withIndex("by_storage", (q: any) => q.eq("storageId", args.storageId))
      .first();

    if (attachment) {
      if (attachment.uploadedBy !== auth.userId && auth.role !== "admin") {
        throw new ConvexError("FORBIDDEN: You do not own this media file");
      }
      await ctx.db.patch(attachment._id, { status: "deleted" });
      await ctx.storage.delete(args.storageId);
      return { success: true };
    }

    // Legacy record fallback: Admins can delete
    if (auth.role === "admin") {
      await ctx.storage.delete(args.storageId);
      return { success: true };
    }

    // Check if caller is author or assigned officer on an issue referencing this storageId
    const userIssues = await ctx.db
      .query("issues")
      .filter((q: any) =>
        q.or(
          q.eq(q.field("reportedBy"), auth.userId),
          q.eq(q.field("assignedFieldOfficer"), auth.userId)
        )
      )
      .take(50);

    const isAuthorized = userIssues.some(
      (issue: any) =>
        issue.images?.some((img: any) => img.storageId === args.storageId) ||
        issue.fieldOfficerWork?.some(
          (w: any) =>
            w.beforePhotosId?.includes(args.storageId) ||
            w.afterPhotosId?.includes(args.storageId)
        )
    );

    if (!isAuthorized) {
      throw new ConvexError(
        "FORBIDDEN: You do not have permission to delete this media file"
      );
    }

    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});

/* Get File Metadata (Read-Only Query) */
export const getFileMeta = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const meta = await validateStoredMedia(ctx, args.storageId, { allowDelete: false });
    const url = await ctx.storage.getUrl(args.storageId);

    return {
      url,
      contentType: meta?.contentType || "",
      size: meta?.size || 0,
    };
  },
});
