import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

const CANONICAL_DEPARTMENTS: readonly string[] = [
  "road",
  "electricity",
  "water",
  "sanitation",
  "drainage",
  "solid_waste",
  "public_health",
  "other",
];

/* ==========================================================================
   QUERIES & MUTATIONS (STANDARD CONVEX RUNTIME)
   ========================================================================== */

/**
 * Overview statistics for Account Provisioning dashboard
 */
export const getProvisioningOverview = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const unitOfficers = await ctx.db.query("unitOfficers").collect();
    const fieldOfficers = await ctx.db.query("fieldOfficers").collect();
    const cityAdmins = await ctx.db.query("cityAdmins").collect();
    const imports = await ctx.db.query("accountProvisioningImports").collect();

    let pendingFirstLogin = 0;
    let activeAccounts = 0;
    let disabledAccounts = 0;

    users.forEach((user) => {
      const isProvisionedRole =
        user.role === "unit_officer" || user.role === "field_officer" || user.role === "city_admin";

      if (!isProvisionedRole) return;

      let mustChangePassword = false;
      let isAccountDisabled = false;

      if (user.role === "unit_officer") {
        const profile = unitOfficers.find((u) => u.userId === user._id);
        mustChangePassword = Boolean(profile?.mustChangePassword);
        isAccountDisabled = profile?.accountApproved === false;
      } else if (user.role === "field_officer") {
        const profile = fieldOfficers.find((f) => f.userId === user._id);
        mustChangePassword = Boolean(profile?.mustChangePassword);
        isAccountDisabled = profile?.accountApproved === false;
      } else if (user.role === "city_admin") {
        const profile = cityAdmins.find((c) => c.userId === user._id);
        mustChangePassword = Boolean(profile?.mustChangePassword);
        isAccountDisabled = false;
      }

      if (mustChangePassword) {
        pendingFirstLogin++;
      }

      if (isAccountDisabled) {
        disabledAccounts++;
      } else {
        activeAccounts++;
      }
    });

    return {
      totalProvisioned: unitOfficers.length + fieldOfficers.length + cityAdmins.length,
      unitOfficersCount: unitOfficers.length,
      fieldOfficersCount: fieldOfficers.length,
      cityAdminsCount: cityAdmins.length,
      pendingFirstLogin,
      activeAccounts,
      disabledAccounts,
      totalImportsCount: imports.length,
    };
  },
});

/**
 * Returns all provisioned Unit Officers and Field Officers with user status
 */
export const getProvisionedOfficers = query({
  args: {},
  handler: async (ctx) => {
    const unitOfficers = await ctx.db.query("unitOfficers").collect();
    const fieldOfficers = await ctx.db.query("fieldOfficers").collect();
    const users = await ctx.db.query("users").collect();

    const userMap = new Map<Id<"users">, Doc<"users">>(users.map((u) => [u._id, u]));
    const uoMap = new Map<Id<"unitOfficers">, Doc<"unitOfficers">>(unitOfficers.map((u) => [u._id, u]));

    const formattedUnitOfficers = unitOfficers.map((uo) => {
      const u = userMap.get(uo.userId);
      return {
        ...uo,
        role: "unit_officer" as const,
        mustChangePassword: uo.mustChangePassword ?? true,
        userCreatedAt: u?.createdAt || new Date(uo.userId).toISOString(),
        lastLogin: uo.lastLogin || null,
        accountApproved: uo.accountApproved !== false,
      };
    });

    const formattedFieldOfficers = fieldOfficers.map((fo) => {
      const u = userMap.get(fo.userId);
      const reportingUO = fo.reportingUnitOfficerId ? uoMap.get(fo.reportingUnitOfficerId) : null;

      return {
        ...fo,
        role: "field_officer" as const,
        mustChangePassword: fo.mustChangePassword ?? true,
        userCreatedAt: u?.createdAt || new Date(fo.userId).toISOString(),
        lastLogin: fo.lastLogin || null,
        accountApproved: fo.accountApproved !== false,
        reportingUnitOfficerName: reportingUO?.fullName || null,
      };
    });

    return {
      unitOfficers: formattedUnitOfficers,
      fieldOfficers: formattedFieldOfficers,
      allOfficers: [...formattedUnitOfficers, ...formattedFieldOfficers].sort((a, b) =>
        b.userId > a.userId ? 1 : -1
      ),
    };
  },
});

/**
 * Returns all provisioned City Admins with user status
 */
export const getProvisionedCityAdmins = query({
  args: {},
  handler: async (ctx) => {
    const cityAdmins = await ctx.db.query("cityAdmins").collect();
    const users = await ctx.db.query("users").collect();

    const userMap = new Map<Id<"users">, Doc<"users">>(users.map((u) => [u._id, u]));

    return cityAdmins.map((ca) => {
      const u = userMap.get(ca.userId);
      return {
        ...ca,
        role: "city_admin" as const,
        mustChangePassword: ca.mustChangePassword ?? true,
        userCreatedAt: u?.createdAt || new Date(ca.createdAt).toISOString(),
        accountApproved: true,
      };
    });
  },
});

/**
 * Returns canonical reference data needed for forms and validation
 */
export const getProvisioningReferenceData = query({
  args: {},
  handler: async (ctx) => {
    const unitOfficers = await ctx.db.query("unitOfficers").collect();
    const cityAdmins = await ctx.db.query("cityAdmins").collect();

    const existingUODepartments = unitOfficers.map((uo) => ({
      id: uo._id,
      userId: uo.userId,
      fullName: uo.fullName,
      email: uo.email,
      city: uo.city.toLowerCase().trim(),
      department: uo.department.toLowerCase().trim(),
    }));

    const existingCityAdmins = cityAdmins.map((ca) => ({
      id: ca._id,
      userId: ca.userId,
      fullName: ca.fullName,
      email: ca.email,
      city: ca.city.toLowerCase().trim(),
    }));

    return {
      canonicalDepartments: CANONICAL_DEPARTMENTS,
      existingUODepartments,
      existingCityAdmins,
      unitOfficersList: unitOfficers.map((uo) => ({
        id: uo._id,
        userId: uo.userId,
        fullName: uo.fullName,
        email: uo.email,
        city: uo.city,
        department: uo.department,
      })),
    };
  },
});

/**
 * Gets import history records
 */
export const getProvisioningImportHistory = query({
  args: {},
  handler: async (ctx) => {
    const history = await ctx.db
      .query("accountProvisioningImports")
      .withIndex("by_created_at")
      .order("desc")
      .take(50);

    const users = await ctx.db.query("users").collect();
    const userMap = new Map<Id<"users">, Doc<"users">>(users.map((u) => [u._id, u]));

    return history.map((h) => ({
      ...h,
      uploadedByName: userMap.get(h.uploadedBy)?.fullName || "System Admin",
    }));
  },
});

/**
 * Internal mutation to create a single Unit Officer or Field Officer document
 */
export const insertOfficerRecords = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    phone: v.string(),
    state: v.string(),
    city: v.string(),
    district: v.string(),
    department: v.string(),
    role: v.union(v.literal("unit_officer"), v.literal("field_officer")),
    specialisations: v.optional(v.array(v.string())),
    reportingUnitOfficerId: v.optional(v.id("unitOfficers")),
    maxIssueCapacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existingUser) {
      throw new Error(`User with email ${normalizedEmail} already exists`);
    }

    const userId = await ctx.db.insert("users", {
      fullName: args.fullName.trim(),
      email: normalizedEmail,
      password: args.passwordHash,
      role: args.role,
      createdAt: new Date().toISOString(),
    });

    if (args.role === "unit_officer") {
      const uoId = await ctx.db.insert("unitOfficers", {
        userId,
        fullName: args.fullName.trim(),
        email: normalizedEmail,
        phone: args.phone.trim(),
        state: args.state.trim(),
        city: args.city.trim(),
        district: args.district.trim(),
        department: args.department.toLowerCase().trim(),
        totalVerifiedIssues: 0,
        totalRejectedIssues: 0,
        avgResolutionTime: 0,
        accountApproved: true,
        rating: 5.0,
        efficiencyScore: 100,
        assignedFieldOfficers: [],
        activeIssueIds: [],
        resolvedIssueIds: [],
        mustChangePassword: true,
      });

      return { success: true, userId, officerId: uoId, role: "unit_officer" as const };
    } else {
      const foId = await ctx.db.insert("fieldOfficers", {
        userId,
        fullName: args.fullName.trim(),
        email: normalizedEmail,
        phone: args.phone.trim(),
        state: args.state.trim(),
        city: args.city.trim(),
        district: args.district.trim(),
        department: args.department.toLowerCase().trim(),
        specialisations: args.specialisations || [],
        reportingUnitOfficerId: args.reportingUnitOfficerId,
        currentActiveIssues: 0,
        maxIssueCapacity: args.maxIssueCapacity || 10,
        assignedIssueIds: [],
        completedIssueIds: [],
        totalResolvedIssues: 0,
        avgResolutionTime: 0,
        onTimeCompletionRate: 100,
        accountApproved: true,
        rating: 5.0,
        efficiencyScore: 100,
        mustChangePassword: true,
      });

      if (args.reportingUnitOfficerId) {
        const uo = await ctx.db.get(args.reportingUnitOfficerId);
        if (uo) {
          const currentAssignees = uo.assignedFieldOfficers || [];
          if (!currentAssignees.includes(foId)) {
            await ctx.db.patch(args.reportingUnitOfficerId, {
              assignedFieldOfficers: [...currentAssignees, foId],
            });
          }
        }
      }

      return { success: true, userId, officerId: foId, role: "field_officer" as const };
    }
  },
});

/**
 * Internal mutation to create a City Admin document
 */
export const insertCityAdminRecord = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    phone: v.string(),
    state: v.string(),
    city: v.string(),
    creatorUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existingUser) {
      throw new Error(`User with email ${normalizedEmail} already exists`);
    }

    let createdBy: Id<"users"> | undefined = args.creatorUserId;
    if (!createdBy) {
      const anyAdmin = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .first();
      createdBy = anyAdmin?._id;
    }

    const userId = await ctx.db.insert("users", {
      fullName: args.fullName.trim(),
      email: normalizedEmail,
      password: args.passwordHash,
      role: "city_admin",
      createdAt: new Date().toISOString(),
    });

    const cityAdminId = await ctx.db.insert("cityAdmins", {
      userId,
      fullName: args.fullName.trim(),
      email: normalizedEmail,
      phone: args.phone.trim(),
      state: args.state.trim(),
      city: args.city.trim(),
      managedUnitOfficers: [],
      managedFieldOfficers: [],
      mustChangePassword: true,
      totalIssuesInCity: 0,
      issuesResolved: 0,
      issuesPending: 0,
      avgResolutionTime: 0,
      slaComplianceRate: 100,
      createdAt: Date.now(),
      createdBy: createdBy || userId,
    });

    return { success: true, userId, cityAdminId, role: "city_admin" as const };
  },
});

/**
 * Toggle account status (active/disabled)
 */
export const toggleAccountApproval = mutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
    approved: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.role === "unit_officer") {
      const uo = await ctx.db
        .query("unitOfficers")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();

      if (uo) {
        await ctx.db.patch(uo._id, { accountApproved: args.approved });
        return { success: true };
      }
    } else if (args.role === "field_officer") {
      const fo = await ctx.db
        .query("fieldOfficers")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();

      if (fo) {
        await ctx.db.patch(fo._id, { accountApproved: args.approved });
        return { success: true };
      }
    }

    return { success: false, error: "Account profile not found" };
  },
});

/**
 * Record import history entry
 */
export const recordImportHistory = mutation({
  args: {
    importType: v.union(v.literal("officers"), v.literal("city_admins")),
    fileName: v.string(),
    uploadedBy: v.id("users"),
    totalRows: v.number(),
    validRows: v.number(),
    createdRows: v.number(),
    skippedRows: v.number(),
    failedRows: v.number(),
    status: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("accountProvisioningImports", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to update password hash for resend credentials
 */
export const updateUserPasswordHash = mutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      password: args.passwordHash,
    });

    if (user.role === "unit_officer") {
      const uo = await ctx.db
        .query("unitOfficers")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
      if (uo) await ctx.db.patch(uo._id, { mustChangePassword: true });
    } else if (user.role === "field_officer") {
      const fo = await ctx.db
        .query("fieldOfficers")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
      if (fo) await ctx.db.patch(fo._id, { mustChangePassword: true });
    } else if (user.role === "city_admin") {
      const ca = await ctx.db
        .query("cityAdmins")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
      if (ca) await ctx.db.patch(ca._id, { mustChangePassword: true });
    }

    return { success: true };
  },
});
