import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const signUp = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    password: v.string(),

    role: v.union(
      v.literal("citizen"),
      v.literal("unit_officer"),
      v.literal("field_officer"),
      v.literal("admin"),
    ),

    // Common
    city: v.optional(v.string()),
    state: v.optional(v.string()),

    // Citizen
    region: v.optional(v.string()),
    postal: v.optional(v.string()),
    fullAddress: v.optional(v.string()),
    latitude: v.optional(v.string()),
    longitude: v.optional(v.string()),

    // Officers
    district: v.optional(v.string()),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),

    // Field Officer
    specialisations: v.optional(v.array(v.string())),
  },

  handler: async (ctx, args) => {
    /* ---------------------------
       Check Existing User
    ---------------------------- */

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      return { success: false, error: "User already exists." };
    }

    /* ---------------------------
       Create User (Auth)
    ---------------------------- */

    const userId = await ctx.db.insert("users", {
      fullName: args.fullName,
      email: args.email,
      password: args.password,
      role: args.role,
      createdAt: new Date().toISOString(),
    });

    /* ---------------------------
       Create Profile
    ---------------------------- */

    // Citizen Profile
    if (args.role === "citizen") {
      await ctx.db.insert("citizens", {
        userId,

        fullName: args.fullName,
        email: args.email,

        city: args.city || "",
        state: args.state || "",
        region: args.region || "",

        postal: args.postal || "",
        fullAddress: args.fullAddress || "",

        latitude: args.latitude || "",
        longitude: args.longitude || "",

        points: 0,
      });
    }

    // Unit Officer Profile
    if (args.role === "unit_officer") {
      await ctx.db.insert("unitOfficers", {
        userId,

        fullName: args.fullName,
        email: args.email,
        phone: args.phone || "",

        state: args.state || "",
        city: args.city || "",
        district: args.district || "",

        department: args.department || "",

        totalVerifiedIssues: 0,
        totalRejectedIssues: 0,

        avgResolutionTime: 0,

        accountApproved: false,

        rating: 0,
        efficiencyScore: 0,

        lastLogin: undefined,

        assignedFieldOfficers: [],
        activeIssueIds: [],
        resolvedIssueIds: [],
      });
    }

    // Field Officer Profile
    if (args.role === "field_officer") {
      await ctx.db.insert("fieldOfficers", {
        userId,

        fullName: args.fullName,
        email: args.email,
        phone: args.phone || "",

        state: args.state || "",
        city: args.city || "",
        district: args.district || "",

        department: args.department || "",

        specialisations: args.specialisations || [],

        reportingUnitOfficerId: undefined,

        currentActiveIssues: 0,
        maxIssueCapacity: 10,

        assignedIssueIds: [],
        completedIssueIds: [],

        totalResolvedIssues: 0,

        avgResolutionTime: 0,
        onTimeCompletionRate: 0,

        accountApproved: false,

        rating: 0,
        efficiencyScore: 0,

        lastLogin: undefined,
      });
    }

    /* ---------------------------
       Admin (Optional)
    ---------------------------- */

    if (args.role === "admin") {
      await ctx.db.insert("admins", {
        userId,
        fullName: args.fullName,
        email: args.email,
        lastLogin: undefined,
      });
    }

    return { success: true, userId };
  },
});
