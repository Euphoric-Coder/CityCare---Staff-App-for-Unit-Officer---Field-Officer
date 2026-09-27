'use node';

import { action } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export interface ProvisioningRowResult {
  rowNumber: number;
  email: string;
  fullName: string;
  role: "unit_officer" | "field_officer" | "city_admin";
  status: "created" | "skipped" | "failed";
  userId?: Id<"users">;
  tempPassword?: string;
  reason?: string;
}

export interface InsertOfficerResult {
  success: boolean;
  userId: Id<"users">;
  officerId: Id<"unitOfficers"> | Id<"fieldOfficers">;
  role: "unit_officer" | "field_officer";
}

export interface InsertCityAdminResult {
  success: boolean;
  userId: Id<"users">;
  cityAdminId: Id<"cityAdmins">;
  role: "city_admin";
}

/**
 * Action to manually create a single Officer with hashed credential
 */
export const createPreProvisionedOfficer = action({
  args: {
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    dob: v.optional(v.string()),
    state: v.string(),
    city: v.string(),
    district: v.string(),
    department: v.string(),
    role: v.union(v.literal("unit_officer"), v.literal("field_officer")),
    specialisations: v.optional(v.array(v.string())),
    reportingUnitOfficerId: v.optional(v.id("unitOfficers")),
    maxIssueCapacity: v.optional(v.number()),
    rawPassword: v.string(),
  },
  handler: async (ctx, args): Promise<InsertOfficerResult> => {
    const passwordHash = await bcrypt.hash(args.rawPassword, 10);

    const result = (await ctx.runMutation(api.accountProvisioning.insertOfficerRecords, {
      fullName: args.fullName,
      email: args.email,
      passwordHash,
      phone: args.phone,
      state: args.state,
      city: args.city,
      district: args.district,
      department: args.department,
      role: args.role,
      specialisations: args.specialisations,
      reportingUnitOfficerId: args.reportingUnitOfficerId,
      maxIssueCapacity: args.maxIssueCapacity,
    })) as InsertOfficerResult;

    return result;
  },
});

/**
 * Action to manually create a single City Admin
 */
export const createPreProvisionedCityAdmin = action({
  args: {
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    dob: v.optional(v.string()),
    state: v.string(),
    city: v.string(),
    rawPassword: v.string(),
    creatorUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<InsertCityAdminResult> => {
    const passwordHash = await bcrypt.hash(args.rawPassword, 10);

    const result = (await ctx.runMutation(api.accountProvisioning.insertCityAdminRecord, {
      fullName: args.fullName,
      email: args.email,
      passwordHash,
      phone: args.phone,
      state: args.state,
      city: args.city,
      creatorUserId: args.creatorUserId,
    })) as InsertCityAdminResult;

    return result;
  },
});

/**
 * Multi-pass Bulk Officer Provisioning Action
 */
export const bulkCreatePreProvisionedOfficers = action({
  args: {
    fileName: v.string(),
    uploadedBy: v.id("users"),
    rows: v.array(
      v.object({
        clientRowId: v.string(),
        rowNumber: v.number(),
        fullName: v.string(),
        email: v.string(),
        phone: v.string(),
        dob: v.optional(v.string()),
        state: v.string(),
        city: v.string(),
        district: v.string(),
        department: v.string(),
        role: v.string(),
        specialisation: v.optional(v.string()),
        tempPassword: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const totalRows = args.rows.length;
    let createdRows = 0;
    let skippedRows = 0;
    let failedRows = 0;

    const rowResults: ProvisioningRowResult[] = [];

    const unitOfficerRows = args.rows.filter(
      (r) => r.role === "unit_officer" || r.role === "Unit Officer"
    );
    const fieldOfficerRows = args.rows.filter(
      (r) => r.role === "field_officer" || r.role === "Field Officer"
    );

    const uoByCityDept = new Map<string, Id<"unitOfficers">>();

    /* ── PASS 1: Create Unit Officers ── */
    for (const row of unitOfficerRows) {
      try {
        const passwordHash = await bcrypt.hash(row.tempPassword, 10);

        const res = (await ctx.runMutation(api.accountProvisioning.insertOfficerRecords, {
          fullName: row.fullName,
          email: row.email,
          passwordHash,
          phone: row.phone,
          state: row.state,
          city: row.city,
          district: row.district || row.city,
          department: row.department,
          role: "unit_officer",
        })) as InsertOfficerResult;

        createdRows++;
        const cityDeptKey = `${row.city.toLowerCase().trim()}_${row.department.toLowerCase().trim()}`;
        uoByCityDept.set(cityDeptKey, res.officerId as Id<"unitOfficers">);

        rowResults.push({
          rowNumber: row.rowNumber,
          email: row.email,
          fullName: row.fullName,
          role: "unit_officer",
          status: "created",
          userId: res.userId,
          tempPassword: row.tempPassword,
        });
      } catch (err: unknown) {
        const message = (err as Error)?.message || String(err);
        if (message.includes("already exists")) {
          skippedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: "unit_officer",
            status: "skipped",
            reason: "Account with this email already exists",
          });
        } else {
          failedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: "unit_officer",
            status: "failed",
            reason: message,
          });
        }
      }
    }

    /* ── Fetch existing UOs from database for Pass 2 FO linking ── */
    const refData = await ctx.runQuery(api.accountProvisioning.getProvisioningReferenceData);
    refData.existingUODepartments.forEach((uo: { id: Id<"unitOfficers">; city: string; department: string }) => {
      const cityDeptKey = `${uo.city}_${uo.department}`;
      if (!uoByCityDept.has(cityDeptKey)) {
        uoByCityDept.set(cityDeptKey, uo.id);
      }
    });

    /* ── PASS 2: Create Field Officers & Link UO ── */
    for (const row of fieldOfficerRows) {
      try {
        const passwordHash = await bcrypt.hash(row.tempPassword, 10);
        const cityDeptKey = `${row.city.toLowerCase().trim()}_${row.department.toLowerCase().trim()}`;
        const reportingUnitOfficerId = uoByCityDept.get(cityDeptKey) || undefined;

        const specs = row.specialisation
          ? row.specialisation
              .split(/[;,]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        const res = (await ctx.runMutation(api.accountProvisioning.insertOfficerRecords, {
          fullName: row.fullName,
          email: row.email,
          passwordHash,
          phone: row.phone,
          state: row.state,
          city: row.city,
          district: row.district || row.city,
          department: row.department,
          role: "field_officer",
          specialisations: specs,
          reportingUnitOfficerId,
        })) as InsertOfficerResult;

        createdRows++;
        rowResults.push({
          rowNumber: row.rowNumber,
          email: row.email,
          fullName: row.fullName,
          role: "field_officer",
          status: "created",
          userId: res.userId,
          tempPassword: row.tempPassword,
        });
      } catch (err: unknown) {
        const message = (err as Error)?.message || String(err);
        if (message.includes("already exists")) {
          skippedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: "field_officer",
            status: "skipped",
            reason: "Account with this email already exists",
          });
        } else {
          failedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: "field_officer",
            status: "failed",
            reason: message,
          });
        }
      }
    }

    const finalStatus =
      failedRows === 0 ? "completed" : createdRows > 0 ? "partially_completed" : "failed";

    await ctx.runMutation(api.accountProvisioning.recordImportHistory, {
      importType: "officers",
      fileName: args.fileName,
      uploadedBy: args.uploadedBy,
      totalRows,
      validRows: totalRows - failedRows,
      createdRows,
      skippedRows,
      failedRows,
      status: finalStatus,
      details: JSON.stringify(rowResults),
    });

    return {
      success: true,
      totalRows,
      createdRows,
      skippedRows,
      failedRows,
      status: finalStatus,
      rowResults,
    };
  },
});

/**
 * Bulk City Admin Provisioning Action
 */
export const bulkCreatePreProvisionedCityAdmins = action({
  args: {
    fileName: v.string(),
    uploadedBy: v.id("users"),
    rows: v.array(
      v.object({
        clientRowId: v.string(),
        rowNumber: v.number(),
        fullName: v.string(),
        email: v.string(),
        phone: v.string(),
        dob: v.optional(v.string()),
        state: v.string(),
        city: v.string(),
        tempPassword: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const totalRows = args.rows.length;
    let createdRows = 0;
    let skippedRows = 0;
    let failedRows = 0;

    const rowResults: ProvisioningRowResult[] = [];

    for (const row of args.rows) {
      try {
        const passwordHash = await bcrypt.hash(row.tempPassword, 10);

        const res = (await ctx.runMutation(api.accountProvisioning.insertCityAdminRecord, {
          fullName: row.fullName,
          email: row.email,
          passwordHash,
          phone: row.phone,
          state: row.state,
          city: row.city,
          creatorUserId: args.uploadedBy,
        })) as InsertCityAdminResult;

        createdRows++;
        rowResults.push({
          rowNumber: row.rowNumber,
          email: row.email,
          fullName: row.fullName,
          role: "city_admin",
          status: "created",
          userId: res.userId,
          tempPassword: row.tempPassword,
        });
      } catch (err: unknown) {
        const message = (err as Error)?.message || String(err);
        if (message.includes("already exists")) {
          skippedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: "city_admin",
            status: "skipped",
            reason: "Account with this email already exists",
          });
        } else {
          failedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: "city_admin",
            status: "failed",
            reason: message,
          });
        }
      }
    }

    const finalStatus =
      failedRows === 0 ? "completed" : createdRows > 0 ? "partially_completed" : "failed";

    await ctx.runMutation(api.accountProvisioning.recordImportHistory, {
      importType: "city_admins",
      fileName: args.fileName,
      uploadedBy: args.uploadedBy,
      totalRows,
      validRows: totalRows - failedRows,
      createdRows,
      skippedRows,
      failedRows,
      status: finalStatus,
      details: JSON.stringify(rowResults),
    });

    return {
      success: true,
      totalRows,
      createdRows,
      skippedRows,
      failedRows,
      status: finalStatus,
      rowResults,
    };
  },
});

/**
 * Resend / regenerate temporary password for a pre-provisioned user
 */
export const resendProvisioningCredentials = action({
  args: {
    userId: v.id("users"),
    newRawPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const passwordHash = await bcrypt.hash(args.newRawPassword, 10);

    await ctx.runMutation(api.accountProvisioning.updateUserPasswordHash, {
      userId: args.userId,
      passwordHash,
    });

    return { success: true };
  },
});
