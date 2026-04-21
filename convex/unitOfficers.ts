import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUnitOfficerByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("unitOfficers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const getUnitOfficerIssues = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const officer = await ctx.db
      .query("unitOfficers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!officer) return [];

    const issues = await Promise.all(
      officer.activeIssueIds.map((id) => ctx.db.get(id)),
    );

    return issues.filter(Boolean);
  },
});

export const verifyIssue = mutation({
  args: {
    issueId: v.id("issues"),

    issueCode: v.string(),

    verificationChecklist: v.object({
      locationValid: v.boolean(),
      isWithinJurisdiction: v.boolean(),
      hasSufficientEvidence: v.boolean(),
      notDuplicate: v.boolean(),
    }),

    notes: v.optional(v.string()),

    slaDeadline: v.number(),

    UOName: v.string(),

    verifiedBy: v.id("users"),

    issueName: v.string(),

    reporterId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error("Issue not found");

    // Update Issue Status
    await ctx.db.patch(args.issueId, {
      status: "verified",

      verificationChecklist: {
        ...args.verificationChecklist,
        notes: args.notes,
        verifiedBy: args.verifiedBy,
        verifiedAt: Date.now(),
      },

      slaDeadline: args.slaDeadline,
    });

    // Add the Issue Timeline Update
    await ctx.db.insert("issueUpdates", {
      issueId: args.issueId,
      status: "verified",
      comment: `Issue verified by Unit Officer ${args.UOName} and ready for assignment.`,
      role: "unit_officer",
      attachments: [],
      updatedBy: args.verifiedBy,
      scope: "field_and_citizen",
      createdAt: Date.now(),
    });

    // Add Notification to Citizen
    await ctx.db.insert("notifications", {
      userId: args.reporterId, // citizen
      issueId: args.issueId,
      message: `Your issue "${args.issueName}" with Issue Code "${args.issueCode}" has been successfully verified by the Unit Officer ${args.UOName} and will be assigned shortly.`,
      type: "verified",
      read: false,
      createdAt: Date.now(),
    });

    // Add Notification to Unit Officer
    await ctx.db.insert("notifications", {
      userId: args.verifiedBy,
      issueId: args.issueId,
      message: `You have successfully verified the issue "${args.issueName}" with Issue Code "${args.issueCode}".`,
      type: "verified",
      read: false,
      createdAt: Date.now(),
    });
  },
});
