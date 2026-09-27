/**
 * Universal Audit Logging System Helper for CityCare Backend
 */

import { GenericMutationCtx } from "convex/server";
import { DataModel, Doc, Id } from "../convex/_generated/dataModel";

export type PerformerRole =
  | "citizen"
  | "unit_officer"
  | "field_officer"
  | "city_admin"
  | "admin"
  | "system";

export type ActionCategory =
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

export type AuditSource = "web" | "mobile" | "system";

export interface CreateAuditLogParams {
  performedByUserId?: Id<"users">;
  performerRole: PerformerRole;

  action: string;
  actionCategory: ActionCategory;

  affectedEntityType?: string;
  affectedEntityId?: string | Id<"issues">;

  issueId?: Id<"issues">;
  issueCode?: string;

  city?: string;
  department?: string;

  oldValue?: any;
  newValue?: any;

  reason?: string;
  description?: string;

  source?: AuditSource;
  timestamp?: number;
}

export type AuditMutationCtx = {
  db: GenericMutationCtx<DataModel>["db"];
};

export async function createAuditLog(
  ctx: AuditMutationCtx,
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

    source = "web",
    timestamp = Date.now(),
  }: CreateAuditLogParams
) {
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
}

export interface AuditIssueActionParams {
  issue?:
    | (Partial<Doc<"issues">> & {
        _id: Id<"issues">;
        issueCode?: string;
        city?: string;
        category?: string;
        department?: string;
      })
    | null;
  performedByUserId?: Id<"users">;
  performerRole: PerformerRole;

  action: string;
  actionCategory: ActionCategory;

  oldValue?: any;
  newValue?: any;

  reason?: string;
  description?: string;

  source?: AuditSource;
}

export async function auditIssueAction(
  ctx: AuditMutationCtx,
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

    source = "web",
  }: AuditIssueActionParams
) {
  if (!issue) return;

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

    source,
  });
}
