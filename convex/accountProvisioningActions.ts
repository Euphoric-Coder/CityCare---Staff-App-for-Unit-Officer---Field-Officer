'use node';

import { action } from './_generated/server';
import { v } from 'convex/values';
import bcrypt from 'bcryptjs';
import { api } from './_generated/api';
import {
  sendOfficerProvisioningEmail,
  sendCityAdminProvisioningEmail,
} from '../lib/provisioningEmails';

/**
 * Action to manually create a single Officer with hashed credential and onboarding email
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
    role: v.union(v.literal('unit_officer'), v.literal('field_officer')),
    specialisations: v.optional(v.array(v.string())),
    reportingUnitOfficerId: v.optional(v.id('unitOfficers')),
    maxIssueCapacity: v.optional(v.number()),
    rawPassword: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    // 1. Check monthly provisioning quota (1000 limit)
    const quotaCheck = await ctx.runQuery(api.accountProvisioning.checkMonthlyProvisioningLimit, {
      requestedCount: 1,
    });
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.reason);
    }

    // 2. Hash password & insert database records
    const passwordHash = await bcrypt.hash(args.rawPassword, 10);

    const result: any = await ctx.runMutation(api.accountProvisioning.insertOfficerRecords, {
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
    });

    // 3. Send Onboarding Email via Resend
    let emailSent = false;
    let emailError = null;
    try {
      await sendOfficerProvisioningEmail({
        role: args.role,
        fullName: args.fullName,
        email: args.email,
        tempPassword: args.rawPassword,
        city: args.city,
        department: args.department,
        specialisations: args.specialisations,
      });
      emailSent = true;
    } catch (err: any) {
      console.error('Failed to send officer onboarding email:', err);
      emailError = err?.message || String(err);
    }

    // 4. Increment monthly provisioning counter
    await ctx.runMutation(api.accountProvisioning.incrementMonthlyProvisioningCount, {
      incrementBy: 1,
    });

    return {
      ...result,
      emailSent,
      emailError,
    };
  },
});

/**
 * Action to manually create a single City Admin and send onboarding email
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
    creatorUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, args): Promise<any> => {
    // 1. Check monthly provisioning quota (1000 limit)
    const quotaCheck = await ctx.runQuery(api.accountProvisioning.checkMonthlyProvisioningLimit, {
      requestedCount: 1,
    });
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.reason);
    }

    // 2. Hash password & insert database record
    const passwordHash = await bcrypt.hash(args.rawPassword, 10);

    const result: any = await ctx.runMutation(api.accountProvisioning.insertCityAdminRecord, {
      fullName: args.fullName,
      email: args.email,
      passwordHash,
      phone: args.phone,
      state: args.state,
      city: args.city,
      creatorUserId: args.creatorUserId,
    });

    // 3. Send Onboarding Email via Resend
    let emailSent = false;
    let emailError = null;
    try {
      await sendCityAdminProvisioningEmail({
        fullName: args.fullName,
        email: args.email,
        tempPassword: args.rawPassword,
        city: args.city,
        state: args.state,
      });
      emailSent = true;
    } catch (err: any) {
      console.error('Failed to send city admin onboarding email:', err);
      emailError = err?.message || String(err);
    }

    // 4. Increment monthly provisioning counter
    await ctx.runMutation(api.accountProvisioning.incrementMonthlyProvisioningCount, {
      incrementBy: 1,
    });

    return {
      ...result,
      emailSent,
      emailError,
    };
  },
});

/**
 * Multi-pass Bulk Officer Provisioning Action with Onboarding Email Dispatch
 */
export const bulkCreatePreProvisionedOfficers = action({
  args: {
    fileName: v.string(),
    uploadedBy: v.id('users'),
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
  handler: async (ctx, args): Promise<any> => {
    const totalRows = args.rows.length;

    // Check monthly provisioning quota (1000 limit)
    const quotaCheck = await ctx.runQuery(api.accountProvisioning.checkMonthlyProvisioningLimit, {
      requestedCount: totalRows,
    });
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.reason);
    }

    let createdRows = 0;
    let skippedRows = 0;
    let failedRows = 0;

    const rowResults = [];

    const unitOfficerRows = args.rows.filter(
      (r) => r.role === 'unit_officer' || r.role === 'Unit Officer'
    );
    const fieldOfficerRows = args.rows.filter(
      (r) => r.role === 'field_officer' || r.role === 'Field Officer'
    );

    const uoByCityDept = new Map();

    /* ── PASS 1: Create Unit Officers ── */
    for (const row of unitOfficerRows) {
      try {
        const passwordHash = await bcrypt.hash(row.tempPassword, 10);

        const res: any = await ctx.runMutation(api.accountProvisioning.insertOfficerRecords, {
          fullName: row.fullName,
          email: row.email,
          passwordHash,
          phone: row.phone,
          state: row.state,
          city: row.city,
          district: row.district || row.city,
          department: row.department,
          role: 'unit_officer',
        });

        createdRows++;
        const cityDeptKey = `${row.city.toLowerCase().trim()}_${row.department.toLowerCase().trim()}`;
        uoByCityDept.set(cityDeptKey, res.officerId);

        // Send onboarding email via Resend
        let emailSent = false;
        try {
          await sendOfficerProvisioningEmail({
            role: 'unit_officer',
            fullName: row.fullName,
            email: row.email,
            tempPassword: row.tempPassword,
            city: row.city,
            department: row.department,
          });
          emailSent = true;
        } catch (emailErr) {
          console.error(`Failed to send onboarding email to UO ${row.email}:`, emailErr);
        }

        rowResults.push({
          rowNumber: row.rowNumber,
          email: row.email,
          fullName: row.fullName,
          role: 'unit_officer',
          status: 'created',
          userId: res.userId,
          tempPassword: row.tempPassword,
          emailSent,
        });
      } catch (err: any) {
        const message = err?.message || String(err);
        if (message.includes('already exists')) {
          skippedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: 'unit_officer',
            status: 'skipped',
            reason: 'Account with this email already exists',
          });
        } else {
          failedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: 'unit_officer',
            status: 'failed',
            reason: message,
          });
        }
      }
    }

    /* ── Fetch existing UOs from database for Pass 2 FO linking ── */
    const refData = await ctx.runQuery(api.accountProvisioning.getProvisioningReferenceData);
    refData.existingUODepartments.forEach((uo) => {
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

        const res: any = await ctx.runMutation(api.accountProvisioning.insertOfficerRecords, {
          fullName: row.fullName,
          email: row.email,
          passwordHash,
          phone: row.phone,
          state: row.state,
          city: row.city,
          district: row.district || row.city,
          department: row.department,
          role: 'field_officer',
          specialisations: specs,
          reportingUnitOfficerId,
        });

        createdRows++;

        // Send onboarding email via Resend
        let emailSent = false;
        try {
          await sendOfficerProvisioningEmail({
            role: 'field_officer',
            fullName: row.fullName,
            email: row.email,
            tempPassword: row.tempPassword,
            city: row.city,
            department: row.department,
            specialisations: specs,
          });
          emailSent = true;
        } catch (emailErr) {
          console.error(`Failed to send onboarding email to FO ${row.email}:`, emailErr);
        }

        rowResults.push({
          rowNumber: row.rowNumber,
          email: row.email,
          fullName: row.fullName,
          role: 'field_officer',
          status: 'created',
          userId: res.userId,
          tempPassword: row.tempPassword,
          emailSent,
        });
      } catch (err: any) {
        const message = err?.message || String(err);
        if (message.includes('already exists')) {
          skippedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: 'field_officer',
            status: 'skipped',
            reason: 'Account with this email already exists',
          });
        } else {
          failedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: 'field_officer',
            status: 'failed',
            reason: message,
          });
        }
      }
    }

    // Increment monthly counter by actual accounts created
    if (createdRows > 0) {
      await ctx.runMutation(api.accountProvisioning.incrementMonthlyProvisioningCount, {
        incrementBy: createdRows,
      });
    }

    const finalStatus =
      failedRows === 0 ? 'completed' : createdRows > 0 ? 'partially_completed' : 'failed';

    await ctx.runMutation(api.accountProvisioning.recordImportHistory, {
      importType: 'officers',
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
 * Bulk City Admin Provisioning Action with Onboarding Email Dispatch
 */
export const bulkCreatePreProvisionedCityAdmins = action({
  args: {
    fileName: v.string(),
    uploadedBy: v.id('users'),
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
  handler: async (ctx, args): Promise<any> => {
    const totalRows = args.rows.length;

    // Check monthly provisioning quota (1000 limit)
    const quotaCheck = await ctx.runQuery(api.accountProvisioning.checkMonthlyProvisioningLimit, {
      requestedCount: totalRows,
    });
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.reason);
    }

    let createdRows = 0;
    let skippedRows = 0;
    let failedRows = 0;

    const rowResults = [];

    for (const row of args.rows) {
      try {
        const passwordHash = await bcrypt.hash(row.tempPassword, 10);

        const res: any = await ctx.runMutation(api.accountProvisioning.insertCityAdminRecord, {
          fullName: row.fullName,
          email: row.email,
          passwordHash,
          phone: row.phone,
          state: row.state,
          city: row.city,
          creatorUserId: args.uploadedBy,
        });

        createdRows++;

        // Send onboarding email via Resend
        let emailSent = false;
        try {
          await sendCityAdminProvisioningEmail({
            fullName: row.fullName,
            email: row.email,
            tempPassword: row.tempPassword,
            city: row.city,
            state: row.state,
          });
          emailSent = true;
        } catch (emailErr) {
          console.error(`Failed to send onboarding email to City Admin ${row.email}:`, emailErr);
        }

        rowResults.push({
          rowNumber: row.rowNumber,
          email: row.email,
          fullName: row.fullName,
          role: 'city_admin',
          status: 'created',
          userId: res.userId,
          tempPassword: row.tempPassword,
          emailSent,
        });
      } catch (err: any) {
        const message = err?.message || String(err);
        if (message.includes('already exists')) {
          skippedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: 'city_admin',
            status: 'skipped',
            reason: 'Account with this email already exists',
          });
        } else {
          failedRows++;
          rowResults.push({
            rowNumber: row.rowNumber,
            email: row.email,
            fullName: row.fullName,
            role: 'city_admin',
            status: 'failed',
            reason: message,
          });
        }
      }
    }

    // Increment monthly counter by actual accounts created
    if (createdRows > 0) {
      await ctx.runMutation(api.accountProvisioning.incrementMonthlyProvisioningCount, {
        incrementBy: createdRows,
      });
    }

    const finalStatus =
      failedRows === 0 ? 'completed' : createdRows > 0 ? 'partially_completed' : 'failed';

    await ctx.runMutation(api.accountProvisioning.recordImportHistory, {
      importType: 'city_admins',
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
    userId: v.id('users'),
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
