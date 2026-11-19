import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';

export const CANONICAL_DEPARTMENTS = [
  'road',
  'electricity',
  'water',
  'sanitation',
  'drainage',
  'solid_waste',
  'public_health',
  'other',
] as const;

export type CanonicalDepartment = (typeof CANONICAL_DEPARTMENTS)[number];

/* ==========================================================================
   INTERFACES & TYPES
   ========================================================================== */

export interface MonthlyQuotaUsage {
  yearMonth: string;
  count: number;
  limit: number;
  remaining: number;
  isLimitReached: boolean;
}

export interface ProvisioningOverview {
  totalProvisioned: number;
  unitOfficersCount: number;
  fieldOfficersCount: number;
  cityAdminsCount: number;
  pendingFirstLogin: number;
  activeAccounts: number;
  disabledAccounts: number;
  totalImportsCount: number;
  monthlyQuota: MonthlyQuotaUsage;
}

export interface ProvisionedUnitOfficer extends Omit<Doc<'unitOfficers'>, 'lastLogin'> {
  role: 'unit_officer';
  mustChangePassword: boolean;
  userCreatedAt: string;
  lastLogin: string | null;
  accountApproved: boolean;
}

export interface ProvisionedFieldOfficer extends Omit<Doc<'fieldOfficers'>, 'lastLogin'> {
  role: 'field_officer';
  mustChangePassword: boolean;
  userCreatedAt: string;
  lastLogin: string | null;
  accountApproved: boolean;
  reportingUnitOfficerName: string | null;
}

export type ProvisionedOfficer = ProvisionedUnitOfficer | ProvisionedFieldOfficer;

export interface ProvisionedCityAdmin extends Doc<'cityAdmins'> {
  role: 'city_admin';
  mustChangePassword: boolean;
  userCreatedAt: string;
  accountApproved: boolean;
}

export interface ProvisioningReferenceData {
  canonicalDepartments: readonly string[];
  existingUODepartments: Array<{
    id: Id<'unitOfficers'>;
    userId: Id<'users'>;
    fullName: string;
    email: string;
    city: string;
    department: string;
  }>;
  existingCityAdmins: Array<{
    id: Id<'cityAdmins'>;
    userId: Id<'users'>;
    fullName: string;
    email: string;
    city: string;
  }>;
  existingUserEmails: string[];
  unitOfficersList: Array<{
    id: Id<'unitOfficers'>;
    userId: Id<'users'>;
    fullName: string;
    email: string;
    city: string;
    department: string;
  }>;
}

export interface EmailAvailabilityResult {
  available: boolean;
  exists: boolean;
}

export interface ImportHistoryRecord extends Doc<'accountProvisioningImports'> {
  uploadedByName: string;
}

export interface InsertOfficerResult {
  success: true;
  userId: Id<'users'>;
  officerId: Id<'unitOfficers'> | Id<'fieldOfficers'>;
  role: 'unit_officer' | 'field_officer';
}

export interface InsertCityAdminResult {
  success: true;
  userId: Id<'users'>;
  cityAdminId: Id<'cityAdmins'>;
  role: 'city_admin';
}

export type ToggleAccountApprovalResult =
  | { success: true; error?: undefined }
  | { success: false; error: string };

export type CheckMonthlyLimitResult =
  | {
      allowed: true;
      count: number;
      limit: number;
      remaining: number;
    }
  | {
      allowed: false;
      reason: string;
      count: number;
      limit: number;
      remaining: number;
    };

/* ==========================================================================
   QUERIES & MUTATIONS (STANDARD CONVEX RUNTIME)
   ========================================================================== */

/**
 * Overview statistics for Account Provisioning dashboard
 */
export const getProvisioningOverview = query({
  args: {},
  handler: async (ctx): Promise<ProvisioningOverview> => {
    const users = await ctx.db.query('users').collect();
    const unitOfficers = await ctx.db.query('unitOfficers').collect();
    const fieldOfficers = await ctx.db.query('fieldOfficers').collect();
    const cityAdmins = await ctx.db.query('cityAdmins').collect();
    const imports = await ctx.db.query('accountProvisioningImports').collect();

    let pendingFirstLogin = 0;
    let activeAccounts = 0;
    let disabledAccounts = 0;

    users.forEach((user) => {
      const isProvisionedRole =
        user.role === 'unit_officer' || user.role === 'field_officer' || user.role === 'city_admin';

      if (!isProvisionedRole) return;

      let mustChange = false;
      let isApproved = true;

      if (user.role === 'unit_officer') {
        const profile = unitOfficers.find((u) => u.userId === user._id);
        mustChange = Boolean(profile?.mustChangePassword);
        isApproved = profile?.accountApproved !== false;
      } else if (user.role === 'field_officer') {
        const profile = fieldOfficers.find((f) => f.userId === user._id);
        mustChange = Boolean(profile?.mustChangePassword);
        isApproved = profile?.accountApproved !== false;
      } else if (user.role === 'city_admin') {
        const profile = cityAdmins.find((c) => c.userId === user._id);
        mustChange = Boolean(profile?.mustChangePassword);
        isApproved = true;
      }

      if (mustChange) {
        pendingFirstLogin++;
      }

      if (!isApproved) {
        disabledAccounts++;
      } else {
        activeAccounts++;
      }
    });

    const currentYm = new Date().toISOString().slice(0, 7);
    const monthlyRecord = await ctx.db
      .query('monthlyProvisioningLimits')
      .withIndex('by_year_month', (q) => q.eq('yearMonth', currentYm))
      .first();

    const monthlyCount = monthlyRecord?.count ?? 0;
    const monthlyLimit = monthlyRecord?.limit ?? 1000;
    const monthlyRemaining = Math.max(0, monthlyLimit - monthlyCount);

    return {
      totalProvisioned: unitOfficers.length + fieldOfficers.length + cityAdmins.length,
      unitOfficersCount: unitOfficers.length,
      fieldOfficersCount: fieldOfficers.length,
      cityAdminsCount: cityAdmins.length,
      pendingFirstLogin,
      activeAccounts,
      disabledAccounts,
      totalImportsCount: imports.length,
      monthlyQuota: {
        yearMonth: currentYm,
        count: monthlyCount,
        limit: monthlyLimit,
        remaining: monthlyRemaining,
        isLimitReached: monthlyCount >= monthlyLimit,
      },
    };
  },
});

/**
 * Returns all provisioned Unit Officers and Field Officers with user status
 */
export const getProvisionedOfficers = query({
  args: {},
  handler: async (ctx): Promise<{
    unitOfficers: ProvisionedUnitOfficer[];
    fieldOfficers: ProvisionedFieldOfficer[];
    allOfficers: ProvisionedOfficer[];
  }> => {
    const unitOfficers = await ctx.db.query('unitOfficers').collect();
    const fieldOfficers = await ctx.db.query('fieldOfficers').collect();
    const users = await ctx.db.query('users').collect();

    const userMap = new Map<Id<'users'>, Doc<'users'>>(users.map((u) => [u._id, u]));
    const uoMap = new Map<Id<'unitOfficers'>, Doc<'unitOfficers'>>(unitOfficers.map((u) => [u._id, u]));

    const formattedUnitOfficers: ProvisionedUnitOfficer[] = unitOfficers.map((uo) => {
      const u = userMap.get(uo.userId);
      return {
        ...uo,
        role: 'unit_officer',
        mustChangePassword: uo.mustChangePassword ?? true,
        userCreatedAt: u?.createdAt || new Date(uo._creationTime).toISOString(),
        lastLogin: uo.lastLogin || null,
        accountApproved: uo.accountApproved !== false,
      };
    });

    const formattedFieldOfficers: ProvisionedFieldOfficer[] = fieldOfficers.map((fo) => {
      const u = userMap.get(fo.userId);
      const reportingUO = fo.reportingUnitOfficerId ? uoMap.get(fo.reportingUnitOfficerId) : null;

      return {
        ...fo,
        role: 'field_officer',
        mustChangePassword: fo.mustChangePassword ?? true,
        userCreatedAt: u?.createdAt || new Date(fo._creationTime).toISOString(),
        lastLogin: fo.lastLogin || null,
        accountApproved: fo.accountApproved !== false,
        reportingUnitOfficerName: reportingUO?.fullName || null,
      };
    });

    const allOfficers: ProvisionedOfficer[] = [
      ...formattedUnitOfficers,
      ...formattedFieldOfficers,
    ].sort((a, b) => (b.userId > a.userId ? 1 : -1));

    return {
      unitOfficers: formattedUnitOfficers,
      fieldOfficers: formattedFieldOfficers,
      allOfficers,
    };
  },
});

/**
 * Returns all provisioned City Admins with user status
 */
export const getProvisionedCityAdmins = query({
  args: {},
  handler: async (ctx): Promise<ProvisionedCityAdmin[]> => {
    const cityAdmins = await ctx.db.query('cityAdmins').collect();
    const users = await ctx.db.query('users').collect();

    const userMap = new Map<Id<'users'>, Doc<'users'>>(users.map((u) => [u._id, u]));

    return cityAdmins.map((ca): ProvisionedCityAdmin => {
      const u = userMap.get(ca.userId);
      return {
        ...ca,
        role: 'city_admin',
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
  handler: async (ctx): Promise<ProvisioningReferenceData> => {
    const users = await ctx.db.query('users').collect();
    const unitOfficers = await ctx.db.query('unitOfficers').collect();
    const fieldOfficers = await ctx.db.query('fieldOfficers').collect();
    const cityAdmins = await ctx.db.query('cityAdmins').collect();

    const existingUserEmails = Array.from(
      new Set([
        ...users.map((u) => u.email?.toLowerCase().trim()).filter((e): e is string => Boolean(e)),
        ...unitOfficers.map((u) => u.email?.toLowerCase().trim()).filter((e): e is string => Boolean(e)),
        ...fieldOfficers.map((f) => f.email?.toLowerCase().trim()).filter((e): e is string => Boolean(e)),
        ...cityAdmins.map((c) => c.email?.toLowerCase().trim()).filter((e): e is string => Boolean(e)),
      ])
    );

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
      existingUserEmails,
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
 * Checks whether an email address already exists in the Convex users database
 */
export const checkEmailAvailability = query({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<EmailAvailabilityResult> => {
    const normalized = args.email.toLowerCase().trim();
    if (!normalized) return { available: true, exists: false };
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', normalized))
      .first();
    return { available: !user, exists: Boolean(user) };
  },
});

/**
 * Gets import history records
 */
export const getProvisioningImportHistory = query({
  args: {},
  handler: async (ctx): Promise<ImportHistoryRecord[]> => {
    const history = await ctx.db
      .query('accountProvisioningImports')
      .withIndex('by_created_at')
      .order('desc')
      .take(50);

    const users = await ctx.db.query('users').collect();
    const userMap = new Map<Id<'users'>, Doc<'users'>>(users.map((u) => [u._id, u]));

    return history.map((h): ImportHistoryRecord => ({
      ...h,
      uploadedByName: userMap.get(h.uploadedBy)?.fullName || 'System Admin',
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
    role: v.union(v.literal('unit_officer'), v.literal('field_officer')),
    specialisations: v.optional(v.array(v.string())),
    reportingUnitOfficerId: v.optional(v.id('unitOfficers')),
    maxIssueCapacity: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<InsertOfficerResult> => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', normalizedEmail))
      .first();

    if (existingUser) {
      throw new Error(`User with email ${normalizedEmail} already exists`);
    }

    const userId = await ctx.db.insert('users', {
      fullName: args.fullName.trim(),
      email: normalizedEmail,
      password: args.passwordHash,
      role: args.role,
      createdAt: new Date().toISOString(),
    });

    if (args.role === 'unit_officer') {
      const uoId = await ctx.db.insert('unitOfficers', {
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

      return { success: true, userId, officerId: uoId, role: 'unit_officer' };
    } else {
      const foId = await ctx.db.insert('fieldOfficers', {
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

      return { success: true, userId, officerId: foId, role: 'field_officer' };
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
    creatorUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, args): Promise<InsertCityAdminResult> => {
    const normalizedEmail = args.email.toLowerCase().trim();

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', normalizedEmail))
      .first();

    if (existingUser) {
      throw new Error(`User with email ${normalizedEmail} already exists`);
    }

    let createdBy = args.creatorUserId;
    if (!createdBy) {
      const anyAdmin = await ctx.db
        .query('users')
        .withIndex('by_role', (q) => q.eq('role', 'admin'))
        .first();
      createdBy = anyAdmin?._id;
    }

    const userId = await ctx.db.insert('users', {
      fullName: args.fullName.trim(),
      email: normalizedEmail,
      password: args.passwordHash,
      role: 'city_admin',
      createdAt: new Date().toISOString(),
    });

    const cityAdminId = await ctx.db.insert('cityAdmins', {
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

    return { success: true, userId, cityAdminId, role: 'city_admin' };
  },
});

/**
 * Toggle account status (active/disabled)
 */
export const toggleAccountApproval = mutation({
  args: {
    userId: v.id('users'),
    role: v.string(),
    approved: v.boolean(),
  },
  handler: async (ctx, args): Promise<ToggleAccountApprovalResult> => {
    if (args.role === 'unit_officer') {
      const uo = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .first();

      if (uo) {
        await ctx.db.patch(uo._id, { accountApproved: args.approved });
        return { success: true };
      }
    } else if (args.role === 'field_officer') {
      const fo = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .first();

      if (fo) {
        await ctx.db.patch(fo._id, { accountApproved: args.approved });
        return { success: true };
      }
    }

    return { success: false, error: 'Account profile not found' };
  },
});

/**
 * Record import history entry
 */
export const recordImportHistory = mutation({
  args: {
    importType: v.union(v.literal('officers'), v.literal('city_admins')),
    fileName: v.string(),
    uploadedBy: v.id('users'),
    totalRows: v.number(),
    validRows: v.number(),
    createdRows: v.number(),
    skippedRows: v.number(),
    failedRows: v.number(),
    status: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<'accountProvisioningImports'>> => {
    return await ctx.db.insert('accountProvisioningImports', {
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
    userId: v.id('users'),
    passwordHash: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: true }> => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found');

    await ctx.db.patch(args.userId, {
      password: args.passwordHash,
    });

    if (user.role === 'unit_officer') {
      const uo = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .first();
      if (uo) await ctx.db.patch(uo._id, { mustChangePassword: true });
    } else if (user.role === 'field_officer') {
      const fo = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .first();
      if (fo) await ctx.db.patch(fo._id, { mustChangePassword: true });
    } else if (user.role === 'city_admin') {
      const ca = await ctx.db
        .query('cityAdmins')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .first();
      if (ca) await ctx.db.patch(ca._id, { mustChangePassword: true });
    }

    return { success: true };
  },
});

/**
 * Query to get monthly provisioning quota usage
 */
export const getMonthlyProvisioningUsage = query({
  args: {
    yearMonth: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<MonthlyQuotaUsage> => {
    const ym = args.yearMonth || new Date().toISOString().slice(0, 7);
    const record = await ctx.db
      .query('monthlyProvisioningLimits')
      .withIndex('by_year_month', (q) => q.eq('yearMonth', ym))
      .first();

    const count = record?.count ?? 0;
    const limit = record?.limit ?? 1000;
    const remaining = Math.max(0, limit - count);

    return {
      yearMonth: ym,
      count,
      limit,
      remaining,
      isLimitReached: count >= limit,
    };
  },
});

/**
 * Check if provisioning is allowed within monthly limit
 */
export const checkMonthlyProvisioningLimit = query({
  args: {
    requestedCount: v.number(),
    yearMonth: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CheckMonthlyLimitResult> => {
    const ym = args.yearMonth || new Date().toISOString().slice(0, 7);
    const record = await ctx.db
      .query('monthlyProvisioningLimits')
      .withIndex('by_year_month', (q) => q.eq('yearMonth', ym))
      .first();

    const count = record?.count ?? 0;
    const limit = record?.limit ?? 1000;
    const remaining = Math.max(0, limit - count);

    if (count >= limit) {
      return {
        allowed: false,
        reason: `Monthly provisioning limit of ${limit} accounts reached for ${ym}. Provisioning is paused to respect email limitations.`,
        count,
        limit,
        remaining: 0,
      };
    }

    if (count + args.requestedCount > limit) {
      return {
        allowed: false,
        reason: `Monthly provisioning limit exceeded. Only ${remaining} slots remaining this month out of ${limit}, but requested ${args.requestedCount}.`,
        count,
        limit,
        remaining,
      };
    }

    return {
      allowed: true,
      count,
      limit,
      remaining,
    };
  },
});

/**
 * Mutation to increment monthly provisioning counter
 */
export const incrementMonthlyProvisioningCount = mutation({
  args: {
    incrementBy: v.number(),
    yearMonth: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ yearMonth: string; count: number; limit: number }> => {
    const ym = args.yearMonth || new Date().toISOString().slice(0, 7);
    const record = await ctx.db
      .query('monthlyProvisioningLimits')
      .withIndex('by_year_month', (q) => q.eq('yearMonth', ym))
      .first();

    const now = Date.now();
    if (record) {
      const newCount = record.count + args.incrementBy;
      await ctx.db.patch(record._id, {
        count: newCount,
        lastUpdated: now,
      });
      return { yearMonth: ym, count: newCount, limit: record.limit };
    } else {
      const newCount = args.incrementBy;
      await ctx.db.insert('monthlyProvisioningLimits', {
        yearMonth: ym,
        count: newCount,
        limit: 1000,
        lastUpdated: now,
      });
      return { yearMonth: ym, count: newCount, limit: 1000 };
    }
  },
});
