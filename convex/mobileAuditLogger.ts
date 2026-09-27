import { Id } from "./_generated/dataModel";

export interface CreateAuditLogParams {
  performedByUserId?: Id<"users">;
  performerRole: "citizen" | "unit_officer" | "field_officer" | "city_admin" | "admin" | "system";

  action: string;
  actionCategory:
    | "issue"
    | "verification"
    | "assignment"
    | "resolution"
    | "rework"
    | "rejection"
    | "withdrawal"
    | "reopen"
    | "sla"
    | "escalation"
    | "classification"
    | "priority"
    | "other";

  affectedEntityType?: string;
  affectedEntityId?: string | Id<"issues"> | Id<"users"> | any;

  issueId?: Id<"issues">;
  issueCode?: string;

  city?: string;
  department?: string;

  oldValue?: any;
  newValue?: any;

  reason?: string;
  description?: string;

  source?: "web" | "mobile" | "system";
  timestamp?: number;
}

export async function createAuditLog(
  ctx: any,
  {
    performedByUserId,
    performerRole,

    action,
    actionCategory,

    affectedEntityType = "issue",
    affectedEntityId,

    issueId,
    issueCode,

    city,
    department,

    oldValue,
    newValue,

    reason,
    description,

    source = "mobile",

    timestamp = Date.now(),
  }: CreateAuditLogParams
) {
  try {
    return await ctx.db.insert("auditLogs", {
      performedByUserId,
      performerRole,

      action,
      actionCategory,

      affectedEntityType,

      affectedEntityId: affectedEntityId ? String(affectedEntityId) : undefined,

      issueId,
      issueCode,

      city,
      department,

      oldValue,
      newValue,

      reason,
      description,

      source,
      timestamp,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    return null;
  }
}

export interface AuditIssueActionParams {
  issue: any;
  performedByUserId?: Id<"users">;
  performerRole: "citizen" | "unit_officer" | "field_officer" | "city_admin" | "admin" | "system";

  action: string;
  actionCategory:
    | "issue"
    | "verification"
    | "assignment"
    | "resolution"
    | "rework"
    | "rejection"
    | "withdrawal"
    | "reopen"
    | "sla"
    | "escalation"
    | "classification"
    | "priority"
    | "other";

  oldValue?: any;
  newValue?: any;

  reason?: string;
  description?: string;
}

export async function auditIssueActionMobile(
  ctx: any,
  {
    issue,
    performedByUserId,
    performerRole,

    action,
    actionCategory,

    oldValue,
    newValue,

    reason,
    description,
  }: AuditIssueActionParams
) {
  if (!issue) return null;

  return createAuditLog(ctx, {
    performedByUserId,
    performerRole,

    action,
    actionCategory,

    affectedEntityType: "issue",
    affectedEntityId: issue._id,

    issueId: issue._id,
    issueCode: issue.issueCode,

    city: issue.city,
    department: issue.department ?? issue.category,

    oldValue,
    newValue,

    reason,
    description,

    source: "mobile",
  });
}
