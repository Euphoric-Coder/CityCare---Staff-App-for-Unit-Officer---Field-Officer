import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const CATEGORY_PREFIX = {
  road: "RD",
  electricity: "EL",
  water: "WT",
  sanitation: "SN",
  drainage: "DR",
  solid_waste: "SW",
  public_health: "PH",
  other: "OT",
};

function generateRandomCode(length = 6) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();
}

export const createIssue = mutation({
  args: {
    // --- Issue Details ---
    title: v.string(),
    description: v.string(),

    category: v.string(),

    // Now array
    subcategory: v.array(v.string()),

    otherCategoryName: v.optional(v.string()),

    priority: v.string(),

    tags: v.array(v.string()),

    // --- Location (numbers, not strings) ---
    latitude: v.string(),
    longitude: v.string(),

    address: v.string(),
    city: v.string(),
    state: v.string(),
    postal: v.string(),

    googleMapUrl: v.string(),

    // --- Reporter ---
    reportedBy: v.id("users"),

    isAnonymous: v.boolean(),

    additionalEmail: v.optional(v.union(v.string(), v.null())),

    // --- Media ---
    photos: v.array(v.id("_storage")),

    // Single videos (optional)
    videos: v.union(v.id("_storage"), v.null()),
  },

  handler: async (ctx, args) => {
    // Generate Issue Code
    const prefix = CATEGORY_PREFIX[args.category] ?? "OT";

    const randomPart = generateRandomCode(6);

    const issueCode = `${prefix}-${randomPart}`;

    await ctx.db.insert("issues", {
      // --- Core ---
      issueCode,

      title: args.title,
      description: args.description,

      category: args.category,

      subcategory: args.subcategory,
      otherCategoryName: args.otherCategoryName ?? null,

      priority: args.priority,

      tags: args.tags,

      // --- Location ---
      latitude: args.latitude,
      longitude: args.longitude,

      address: args.address,
      city: args.city,
      state: args.state,
      postal: args.postal,

      googleMapUrl: args.googleMapUrl,

      // --- Reporter ---
      reportedBy: args.reportedBy,

      isAnonymous: args.isAnonymous,

      additionalEmail: args.additionalEmail ?? null,

      // --- Media ---
      photos: args.photos,

      // Store as single ID (nullable)
      videos: args.videos ?? null,

      // --- Workflow ---
      status: "pending",

      assignedUnitOfficer: null,
      assignedFieldOfficer: null,

      possibleDuplicateIds: [],

      escalatedToAdmin: false,

      slaCategory: "standard",
      slaDeadline: null,
      slaBreached: false,

      resolvedAt: null,
      closedAt: null,

      citizenRating: null,
      citizenFeedback: null,

      reopenCount: 0,
      reopenReason: null,
      isReopened: false,

      createdAt: Date.now(),
    });

    return {
      success: true,
      issueCode,
    };
  },
});


export const getCitizenDashboardIssues = query({
  args: {
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    // Get citizen profile
    const citizen = await ctx.db
      .query("citizens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!citizen) return [];

    // Get issues reported by citizen
    const personalIssues = await ctx.db
      .query("issues")
      .withIndex("by_reporter", (q) => q.eq("reportedBy", args.userId))
      .collect();

    // Get city issues
    const cityIssues = await ctx.db
      .query("issues")
      .withIndex("by_city", (q) => q.eq("city", citizen.city))
      .collect();

    // Merge without duplicates
    const issueMap = new Map();

    [...personalIssues, ...cityIssues].forEach((issue) => {
      issueMap.set(issue._id, issue);
    });

    return Array.from(issueMap.values()).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  },
});
