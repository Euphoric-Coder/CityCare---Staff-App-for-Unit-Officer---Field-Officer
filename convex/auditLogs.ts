import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCategory } from "../lib/auditLogger";

/**
 * Universal Action Category Inference Helper for specialized or legacy logs
 */
function inferActionCategory(action?: string): ActionCategory {
  const value = String(action || "").toLowerCase();

  if (value.includes("assign")) return "assignment";
  if (value.includes("sla") || value.includes("deadline")) return "sla";
  if (value.includes("escalat")) return "escalation";
  if (value.includes("priority")) return "priority";
  if (value.includes("classif") || value.includes("category")) return "classification";
  if (value.includes("rework")) return "rework";
  if (value.includes("verif")) return "verification";
  if (value.includes("reject")) return "rejection";
  if (value.includes("withdraw")) return "withdrawal";
  if (value.includes("reopen")) return "reopen";
  if (value.includes("resolv") || value.includes("close")) return "resolution";

  return "issue";
}

/**
 * Format Action Label for Display
 */
function formatActionLabel(action?: string): string {
  if (!action) return "System Action";
  const actionMap: Record<string, string> = {
    issue_created: "Issue Created",
    issue_verified: "Issue Verified",
    assign_field_officer: "Field Officer Assigned",
    reassign_field_officer: "Field Officer Reassigned",
    assign_unit_officer: "Unit Officer Assigned",
    reassign_unit_officer: "Unit Officer Reassigned",
    work_started: "Work Started",
    resolution_submitted: "Resolution Submitted",
    resolution_approved: "Resolution Approved",
    rework_requested: "Rework Requested",
    rework_resubmitted: "Rework Resubmitted",
    issue_rejected: "Issue Rejected",
    issue_withdrawn: "Issue Withdrawn",
    issue_reopened: "Issue Reopened",
    issue_escalated: "Issue Escalated",
    review_escalation: "Escalation Reviewed",
    approve_escalation: "Escalation Approved",
    reject_escalation: "Escalation Rejected",
    request_corrective_action: "Corrective Action Requested",
    extend_sla: "SLA Extended",
    change_classification: "Classification Changed",
    update_priority: "Priority Updated",
    override_issue_status: "Status Overridden",
    reclassify_issue: "Issue Reclassified",
    status_override: "Status Overridden",
    bulk_change_priority: "Bulk Priority Updated",
    bulk_assign_department: "Bulk Department Assigned",
    citizen_feedback_submitted: "Citizen Feedback Submitted",
    demo_city_seeded: "Demo Baseline Seeded",
  };

  if (actionMap[action]) return actionMap[action];

  return action.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Helper to check if record falls within date cutoff
 */
function isWithinDateRange(timestamp: number, dateRange?: string): boolean {
  if (!dateRange || dateRange === "all") return true;
  const now = Date.now();

  if (dateRange === "today") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return timestamp >= startOfToday.getTime();
  }

  let durationMs = 0;
  if (dateRange === "24h") durationMs = 24 * 60 * 60 * 1000;
  else if (dateRange === "7d") durationMs = 7 * 24 * 60 * 60 * 1000;
  else if (dateRange === "30d") durationMs = 30 * 24 * 60 * 60 * 1000;
  else if (dateRange === "90d") durationMs = 90 * 24 * 60 * 60 * 1000;

  return durationMs > 0 ? timestamp >= now - durationMs : true;
}

export interface NormalizedAuditLog {
  id: Id<"auditLogs"> | Id<"cityAdminAuditLogs">;
  auditSource: "universal" | "city_admin_specialized";
  action: string;
  actionFormatted: string;
  actionCategory: string;
  performer: {
    userId: string | null;
    name: string;
    role: string;
  };
  affectedEntityType: string;
  affectedEntityId: string | null;
  issueId: string | null;
  issueCode: string | null;
  issueTitle: string | null;
  city: string;
  department: string;
  oldValue: any;
  newValue: any;
  reason: string | null;
  description: string | null;
  source: string;
  timestamp: number;
}

/**
 * City Admin Query: Fetch city-scoped universal and specialized audit logs
 * Strictly authorized to the authenticated City Admin's assigned city.
 */
export const getCityAdminAuditLogs = query({
  args: {
    cityAdminUserId: v.id("users"),
    search: v.optional(v.string()),
    role: v.optional(v.string()),
    category: v.optional(v.string()),
    department: v.optional(v.string()),
    source: v.optional(v.string()),
    dateRange: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Authorize & derive City Admin profile
    const user = await ctx.db.get(args.cityAdminUserId);
    if (!user || user.role !== "city_admin") {
      throw new Error("Unauthorized: City Admin access required.");
    }

    const cityAdmin = await ctx.db
      .query("cityAdmins")
      .withIndex("by_user", (q) => q.eq("userId", args.cityAdminUserId))
      .unique();

    if (!cityAdmin) {
      throw new Error("City Admin profile not found.");
    }

    const city = cityAdmin.city;
    const state = cityAdmin.state || "";

    // 2. Fetch universal audit logs for this city
    const universalLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_city_timestamp", (q) => q.eq("city", city))
      .order("desc")
      .collect();

    // 3. Fetch specialized cityAdminAuditLogs for this city
    const specializedLogs = await ctx.db
      .query("cityAdminAuditLogs")
      .withIndex("by_city", (q) => q.eq("city", city))
      .collect();

    // 4. Batch resolve performer user profiles
    const performerIds = Array.from(
      new Set([
        ...universalLogs
          .map((l) => l.performedByUserId)
          .filter((id): id is Id<"users"> => Boolean(id)),
        ...specializedLogs
          .map((l) => l.performedByUserId)
          .filter((id): id is Id<"users"> => Boolean(id)),
      ])
    );

    const userMap = new Map<string, Doc<"users">>();
    for (const userId of performerIds) {
      try {
        const u = await ctx.db.get(userId);
        if (u) userMap.set(String(userId), u);
      } catch {
        // Ignore invalid IDs
      }
    }

    // 5. Batch resolve linked issue details
    const issueIds = Array.from(
      new Set([
        ...universalLogs.map((l) => l.issueId).filter((id): id is Id<"issues"> => Boolean(id)),
        ...specializedLogs
          .map((l) => l.affectedEntityId)
          .filter((id): id is Id<"issues"> => Boolean(id)),
      ])
    );

    const issueMap = new Map<string, Doc<"issues">>();
    for (const issId of issueIds) {
      try {
        const issueDoc = await ctx.db.get(issId);
        if (issueDoc) issueMap.set(String(issId), issueDoc);
      } catch {
        // Ignore invalid IDs
      }
    }

    // 6. Normalize universal audit records
    const universalNormalized: NormalizedAuditLog[] = universalLogs.map((log) => {
      const performerUser = log.performedByUserId
        ? userMap.get(String(log.performedByUserId))
        : null;
      const issueDoc = log.issueId ? issueMap.get(String(log.issueId)) : null;

      let performerName = "CityCare System";
      let performerRole: string = log.performerRole || "system";

      if (performerUser) {
        performerName = performerUser.fullName || (performerUser as any).name || "User";
      } else if (log.performerRole !== "system" && !log.performedByUserId) {
        performerName = "System Automation";
      }

      return {
        id: log._id,
        auditSource: "universal",
        action: log.action,
        actionFormatted: formatActionLabel(log.action),
        actionCategory: log.actionCategory,
        performer: {
          userId: log.performedByUserId ? String(log.performedByUserId) : null,
          name: performerName,
          role: performerRole,
        },
        affectedEntityType: log.affectedEntityType || "issue",
        affectedEntityId: log.affectedEntityId || (log.issueId ? String(log.issueId) : null),
        issueId: log.issueId ? String(log.issueId) : null,
        issueCode: log.issueCode || issueDoc?.issueCode || null,
        issueTitle: issueDoc?.title || null,
        city: log.city || city,
        department: log.department || issueDoc?.department || issueDoc?.category || "general",
        oldValue: log.oldValue ?? null,
        newValue: log.newValue ?? null,
        reason: log.reason ?? null,
        description: log.description ?? null,
        source: log.source || "web",
        timestamp: log.timestamp,
      };
    });

    // 7. Normalize specialized cityAdminAuditLogs
    const specializedNormalized: NormalizedAuditLog[] = specializedLogs.map((log) => {
      const performerUser = userMap.get(String(log.performedByUserId));
      const issueDoc = issueMap.get(String(log.affectedEntityId));

      return {
        id: log._id,
        auditSource: "city_admin_specialized",
        action: log.action,
        actionFormatted: formatActionLabel(log.action),
        actionCategory: inferActionCategory(log.action),
        performer: {
          userId: String(log.performedByUserId),
          name: performerUser?.fullName || (performerUser as any)?.name || "City Admin",
          role: "city_admin",
        },
        affectedEntityType: log.affectedEntityType || "issue",
        affectedEntityId: String(log.affectedEntityId),
        issueId: String(log.affectedEntityId),
        issueCode: log.issueCode || issueDoc?.issueCode || null,
        issueTitle: issueDoc?.title || null,
        city: log.city || city,
        department: issueDoc?.department || issueDoc?.category || "general",
        oldValue: log.oldValue ?? null,
        newValue: log.newValue ?? null,
        reason: log.reason ?? null,
        description: `City Admin action: ${log.action}`,
        source: "web",
        timestamp: log.timestamp,
      };
    });

    // 8. Merge and Deduplicate dual-written City Admin actions (within 2000ms window)
    const deduplicated: NormalizedAuditLog[] = [...universalNormalized];

    for (const spec of specializedNormalized) {
      const isDuplicateIndex = universalNormalized.findIndex((u) => {
        const sameIssue = u.issueCode === spec.issueCode || u.issueId === spec.issueId;
        const samePerformer = u.performer.userId === spec.performer.userId;
        const timeDiff = Math.abs(u.timestamp - spec.timestamp);
        return sameIssue && samePerformer && timeDiff <= 2000;
      });

      if (isDuplicateIndex !== -1) {
        // Enrich universal record with any missing details from specialized record
        const u = deduplicated[isDuplicateIndex];
        if (!u.reason && spec.reason) u.reason = spec.reason;
        if (!u.oldValue && spec.oldValue) u.oldValue = spec.oldValue;
        if (!u.newValue && spec.newValue) u.newValue = spec.newValue;
      } else {
        deduplicated.push(spec);
      }
    }

    // Sort descending by timestamp
    deduplicated.sort((a, b) => b.timestamp - a.timestamp);

    // 9. Apply Filter Options Extraction
    const availableDepts = Array.from(
      new Set(deduplicated.map((l) => l.department).filter((d): d is string => Boolean(d)))
    ).sort();
    const availableRoles = Array.from(
      new Set(deduplicated.map((l) => l.performer.role).filter((r): r is string => Boolean(r)))
    ).sort();
    const availableCategories = Array.from(
      new Set(deduplicated.map((l) => l.actionCategory).filter((c): c is string => Boolean(c)))
    ).sort();
    const availableSources = Array.from(
      new Set(deduplicated.map((l) => l.source).filter((s): s is string => Boolean(s)))
    ).sort();

    // 10. Apply Filters
    let filtered = deduplicated;

    if (args.search && args.search.trim()) {
      const q = args.search.toLowerCase().trim();
      filtered = filtered.filter(
        (l) =>
          l.actionFormatted.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q)) ||
          (l.reason && l.reason.toLowerCase().includes(q)) ||
          (l.performer.name && l.performer.name.toLowerCase().includes(q)) ||
          (l.performer.role && l.performer.role.toLowerCase().includes(q)) ||
          (l.issueCode && l.issueCode.toLowerCase().includes(q)) ||
          (l.issueTitle && l.issueTitle.toLowerCase().includes(q)) ||
          (l.department && l.department.toLowerCase().includes(q)) ||
          (l.affectedEntityType && l.affectedEntityType.toLowerCase().includes(q))
      );
    }

    if (args.role && args.role !== "all") {
      filtered = filtered.filter((l) => l.performer.role === args.role);
    }

    if (args.category && args.category !== "all") {
      filtered = filtered.filter((l) => l.actionCategory === args.category);
    }

    if (args.department && args.department !== "all") {
      filtered = filtered.filter(
        (l) => l.department?.toLowerCase() === args.department!.toLowerCase()
      );
    }

    if (args.source && args.source !== "all") {
      filtered = filtered.filter((l) => l.source === args.source);
    }

    if (args.dateRange && args.dateRange !== "all") {
      filtered = filtered.filter((l) => isWithinDateRange(l.timestamp, args.dateRange));
    }

    // 11. Calculate Summary Metrics for City Admin
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTs = startOfToday.getTime();

    const summary = {
      totalLogs: filtered.length,
      todayActions: filtered.filter((l) => l.timestamp >= todayTs).length,
      citizenActions: filtered.filter((l) => l.performer.role === "citizen").length,
      unitOfficerActions: filtered.filter((l) => l.performer.role === "unit_officer").length,
      fieldOfficerActions: filtered.filter((l) => l.performer.role === "field_officer").length,
      cityAdminActions: filtered.filter((l) => l.performer.role === "city_admin").length,
      systemAdminActions: filtered.filter((l) => l.performer.role === "admin").length,
      systemActions: filtered.filter((l) => l.performer.role === "system").length,
      webActions: filtered.filter((l) => l.source === "web").length,
      mobileActions: filtered.filter((l) => l.source === "mobile").length,
    };

    // 12. Paginate
    const page = args.page || 1;
    const pageSize = args.pageSize || 25;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedLogs = filtered.slice(startIndex, startIndex + pageSize);

    return {
      scope: {
        city,
        state,
      },
      logs: paginatedLogs,
      summary,
      filterOptions: {
        departments: availableDepts,
        roles: availableRoles,
        categories: availableCategories,
        sources: availableSources,
      },
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },
});

/**
 * System Admin Query: Fetch global platform-wide universal audit logs
 * Strictly authorized to System Admins (`role === "admin"`).
 */
export const getSystemAdminAuditLogs = query({
  args: {
    adminUserId: v.id("users"),
    search: v.optional(v.string()),
    role: v.optional(v.string()),
    city: v.optional(v.string()),
    department: v.optional(v.string()),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    dateRange: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Auth check
    const user = await ctx.db.get(args.adminUserId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: System Admin privileges required.");
    }

    // 2. Fetch universal audit logs globally
    const universalLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    // 3. Batch resolve performer users
    const performerIds = Array.from(
      new Set(
        universalLogs
          .map((l) => l.performedByUserId)
          .filter((id): id is Id<"users"> => Boolean(id))
      )
    );

    const userMap = new Map<string, Doc<"users">>();
    for (const userId of performerIds) {
      try {
        const u = await ctx.db.get(userId);
        if (u) userMap.set(String(userId), u);
      } catch {
        // Ignore invalid IDs
      }
    }

    // 4. Batch resolve linked issues
    const issueIds = Array.from(
      new Set(
        universalLogs.map((l) => l.issueId).filter((id): id is Id<"issues"> => Boolean(id))
      )
    );

    const issueMap = new Map<string, Doc<"issues">>();
    for (const issId of issueIds) {
      try {
        const issueDoc = await ctx.db.get(issId);
        if (issueDoc) issueMap.set(String(issId), issueDoc);
      } catch {
        // Ignore invalid IDs
      }
    }

    // 5. Normalize universal audit records
    const normalized: NormalizedAuditLog[] = universalLogs.map((log) => {
      const performerUser = log.performedByUserId
        ? userMap.get(String(log.performedByUserId))
        : null;
      const issueDoc = log.issueId ? issueMap.get(String(log.issueId)) : null;

      let performerName = "CityCare System";
      let performerRole: string = log.performerRole || "system";

      if (performerUser) {
        performerName = performerUser.fullName || (performerUser as any).name || "User";
      } else if (log.performerRole !== "system" && !log.performedByUserId) {
        performerName = "System Automation";
      }

      return {
        id: log._id,
        auditSource: "universal",
        action: log.action,
        actionFormatted: formatActionLabel(log.action),
        actionCategory: log.actionCategory,
        performer: {
          userId: log.performedByUserId ? String(log.performedByUserId) : null,
          name: performerName,
          role: performerRole,
        },
        affectedEntityType: log.affectedEntityType || "issue",
        affectedEntityId: log.affectedEntityId || (log.issueId ? String(log.issueId) : null),
        issueId: log.issueId ? String(log.issueId) : null,
        issueCode: log.issueCode || issueDoc?.issueCode || null,
        issueTitle: issueDoc?.title || null,
        city: log.city || issueDoc?.city || "Global",
        department: log.department || issueDoc?.department || issueDoc?.category || "general",
        oldValue: log.oldValue ?? null,
        newValue: log.newValue ?? null,
        reason: log.reason ?? null,
        description: log.description ?? null,
        source: log.source || "web",
        timestamp: log.timestamp,
      };
    });

    // 6. Extract filter options
    const availableCities = Array.from(
      new Set(normalized.map((l) => l.city).filter((c): c is string => Boolean(c)))
    ).sort();
    const availableDepts = Array.from(
      new Set(normalized.map((l) => l.department).filter((d): d is string => Boolean(d)))
    ).sort();
    const availableRoles = Array.from(
      new Set(normalized.map((l) => l.performer.role).filter((r): r is string => Boolean(r)))
    ).sort();
    const availableCategories = Array.from(
      new Set(normalized.map((l) => l.actionCategory).filter((c): c is string => Boolean(c)))
    ).sort();
    const availableSources = Array.from(
      new Set(normalized.map((l) => l.source).filter((s): s is string => Boolean(s)))
    ).sort();

    // 7. Apply Filters
    let filtered = normalized;

    if (args.search && args.search.trim()) {
      const q = args.search.toLowerCase().trim();
      filtered = filtered.filter(
        (l) =>
          l.actionFormatted.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q)) ||
          (l.reason && l.reason.toLowerCase().includes(q)) ||
          (l.performer.name && l.performer.name.toLowerCase().includes(q)) ||
          (l.performer.role && l.performer.role.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.issueCode && l.issueCode.toLowerCase().includes(q)) ||
          (l.issueTitle && l.issueTitle.toLowerCase().includes(q)) ||
          (l.department && l.department.toLowerCase().includes(q)) ||
          (l.affectedEntityType && l.affectedEntityType.toLowerCase().includes(q))
      );
    }

    if (args.role && args.role !== "all") {
      filtered = filtered.filter((l) => l.performer.role === args.role);
    }

    if (args.city && args.city !== "all") {
      filtered = filtered.filter(
        (l) => l.city?.toLowerCase() === args.city!.toLowerCase()
      );
    }

    if (args.category && args.category !== "all") {
      filtered = filtered.filter((l) => l.actionCategory === args.category);
    }

    if (args.department && args.department !== "all") {
      filtered = filtered.filter(
        (l) => l.department?.toLowerCase() === args.department!.toLowerCase()
      );
    }

    if (args.source && args.source !== "all") {
      filtered = filtered.filter((l) => l.source === args.source);
    }

    if (args.dateRange && args.dateRange !== "all") {
      filtered = filtered.filter((l) => isWithinDateRange(l.timestamp, args.dateRange));
    }

    // 8. Calculate Summary Metrics for System Admin
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTs = startOfToday.getTime();

    const citiesWithActivity = new Set(
      filtered.map((l) => l.city).filter((c): c is string => Boolean(c))
    ).size;

    const summary = {
      totalLogs: filtered.length,
      todayActions: filtered.filter((l) => l.timestamp >= todayTs).length,
      citizenActions: filtered.filter((l) => l.performer.role === "citizen").length,
      unitOfficerActions: filtered.filter((l) => l.performer.role === "unit_officer").length,
      fieldOfficerActions: filtered.filter((l) => l.performer.role === "field_officer").length,
      cityAdminActions: filtered.filter((l) => l.performer.role === "city_admin").length,
      systemAdminActions: filtered.filter((l) => l.performer.role === "admin").length,
      systemActions: filtered.filter((l) => l.performer.role === "system").length,
      webActions: filtered.filter((l) => l.source === "web").length,
      mobileActions: filtered.filter((l) => l.source === "mobile").length,
      systemGeneratedActions: filtered.filter(
        (l) => l.source === "system" || l.performer.role === "system"
      ).length,
      citiesWithActivity,
    };

    // 9. Paginate
    const page = args.page || 1;
    const pageSize = args.pageSize || 25;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedLogs = filtered.slice(startIndex, startIndex + pageSize);

    return {
      logs: paginatedLogs,
      summary,
      filterOptions: {
        cities: availableCities,
        departments: availableDepts,
        roles: availableRoles,
        categories: availableCategories,
        sources: availableSources,
      },
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },
});

// Aliases for backwards compatibility
export const getCityAuditLogs = getCityAdminAuditLogs;
export const getSystemAuditLogs = getSystemAdminAuditLogs;
