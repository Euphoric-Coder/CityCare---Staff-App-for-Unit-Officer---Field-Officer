import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import {
  normalizeStatus,
  calculateFieldOfficerSummary,
  calculateUnitOfficerPersonalSummary,
  calculateUnitOfficerTeamSummary,
  FieldOfficerSummary,
} from '../lib/officerPerformanceCalculations';

function areArraysEqual(arr1: unknown[], arr2: unknown[]): boolean {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (String(arr1[i]) !== String(arr2[i])) return false;
  }
  return true;
}

export const refreshAllOfficerPerformance = internalMutation({
  args: {},
  handler: async (ctx) => {
    const startedAt = Date.now();
    const issueUpdateCache = new Map<string, any[]>();

    const fieldOfficers = await ctx.db.query('fieldOfficers').collect();
    const unitOfficers = await ctx.db.query('unitOfficers').collect();

    let foUpdated = 0;
    let foUnchanged = 0;
    let foFailed = 0;

    let uoUpdated = 0;
    let uoUnchanged = 0;
    let uoFailed = 0;

    const failures: Array<{
      role: 'field_officer' | 'unit_officer';
      officerId: string;
      error: string;
    }> = [];

    // --- STEP 1: REFRESH FIELD OFFICERS ---
    for (const fo of fieldOfficers) {
      try {
        const issues = await ctx.db
          .query('issues')
          .withIndex('by_assigned_field_officer', (q) => q.eq('assignedFieldOfficer', fo.userId))
          .collect();

        const summary = await calculateFieldOfficerSummary(
          ctx,
          fo,
          issues,
          'all',
          issueUpdateCache
        );

        // Active issues assigned to this FO
        const activeIssuesList = issues
          .filter((i) =>
            [
              'assigned',
              'in_progress',
              'submitted_for_review',
              'pending_uo_verification',
              'rework_required',
              'rework_requested',
            ].includes(normalizeStatus(i.status))
          )
          .sort((a, b) => a._creationTime - b._creationTime);

        // Completed issues assigned to this FO
        const completedIssuesList = issues
          .filter((i) => ['resolved', 'closed'].includes(normalizeStatus(i.status)))
          .sort((a, b) => a._creationTime - b._creationTime);

        const assignedIssueIds = Array.from(
          new Map(activeIssuesList.map((i) => [String(i._id), i._id])).values()
        );
        const completedIssueIds = Array.from(
          new Map(completedIssuesList.map((i) => [String(i._id), i._id])).values()
        );

        const newActiveCount = summary.activeIssues;
        const newResolvedCount = summary.totalResolved;
        const newAvgResTime = summary.avgResolutionTime;
        const newOnTimeRate = summary.slaComplianceRate;
        const newRating = summary.rating;
        const newEfficiency = summary.efficiencyScore;

        const hasChanged =
          fo.currentActiveIssues !== newActiveCount ||
          fo.totalResolvedIssues !== newResolvedCount ||
          fo.avgResolutionTime !== newAvgResTime ||
          fo.onTimeCompletionRate !== newOnTimeRate ||
          fo.rating !== newRating ||
          fo.efficiencyScore !== newEfficiency ||
          !areArraysEqual(fo.assignedIssueIds || [], assignedIssueIds) ||
          !areArraysEqual(fo.completedIssueIds || [], completedIssueIds);

        if (hasChanged) {
          await ctx.db.patch(fo._id, {
            currentActiveIssues: newActiveCount,
            assignedIssueIds,
            completedIssueIds,
            totalResolvedIssues: newResolvedCount,
            avgResolutionTime: newAvgResTime,
            onTimeCompletionRate: newOnTimeRate,
            rating: newRating,
            efficiencyScore: newEfficiency,
          });
          foUpdated++;
        } else {
          foUnchanged++;
        }
      } catch (err) {
        foFailed++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[Cron Performance Sync] Field Officer ${fo._id} sync failed:`, errorMessage);
        failures.push({
          role: 'field_officer',
          officerId: String(fo._id),
          error: errorMessage,
        });
      }
    }

    // --- STEP 2: REFRESH UNIT OFFICERS ---
    for (const uo of unitOfficers) {
      try {
        const uoIssues = await ctx.db
          .query('issues')
          .withIndex('by_assigned_unit_officer', (q) => q.eq('assignedUnitOfficer', uo.userId))
          .collect();

        const personal = await calculateUnitOfficerPersonalSummary(
          ctx,
          uo,
          uoIssues,
          'all',
          issueUpdateCache
        );

        // Active issue IDs for UO
        const activeIssuesList = uoIssues
          .filter((i) =>
            [
              'pending',
              'verified',
              'assigned',
              'in_progress',
              'submitted_for_review',
              'pending_uo_verification',
              'rework_required',
              'rework_requested',
            ].includes(normalizeStatus(i.status))
          )
          .sort((a, b) => a._creationTime - b._creationTime);

        // Resolved issue IDs for UO
        const completedIssuesList = uoIssues
          .filter((i) => ['resolved', 'closed'].includes(normalizeStatus(i.status)))
          .sort((a, b) => a._creationTime - b._creationTime);

        const activeIssueIds = Array.from(
          new Map(activeIssuesList.map((i) => [String(i._id), i._id])).values()
        );
        const resolvedIssueIds = Array.from(
          new Map(completedIssuesList.map((i) => [String(i._id), i._id])).values()
        );

        // UO Team calculation
        const teamFieldOfficers = await ctx.db
          .query('fieldOfficers')
          .withIndex('by_unit_officer', (q) => q.eq('reportingUnitOfficerId', uo._id))
          .collect();

        const filteredFos = teamFieldOfficers.filter(
          (fo) =>
            fo.city === uo.city && fo.department === uo.department && fo.accountApproved === true
        );

        const foSummaries: FieldOfficerSummary[] = [];
        for (const fo of filteredFos) {
          const foIssues = await ctx.db
            .query('issues')
            .withIndex('by_assigned_field_officer', (q) => q.eq('assignedFieldOfficer', fo.userId))
            .collect();

          const foSum = await calculateFieldOfficerSummary(
            ctx,
            fo,
            foIssues,
            'all',
            issueUpdateCache
          );
          foSummaries.push(foSum);
        }

        const team = calculateUnitOfficerTeamSummary(foSummaries);

        const teamResolutionRate =
          team.teamResolvedIssues + team.teamActiveIssues > 0
            ? (team.teamResolvedIssues / (team.teamResolvedIssues + team.teamActiveIssues)) * 100
            : 0;

        const assignmentTargetHours = 24;
        const assignmentScore =
          personal.avgAssignmentTime > 0
            ? Math.max(0, Math.min(100, (assignmentTargetHours / personal.avgAssignmentTime) * 100))
            : personal.totalReviewed > 0
              ? 50
              : 0;

        const finalEfficiencyScore = Math.max(
          0,
          Math.min(
            100,
            Math.round(
              personal.verificationRate * 0.25 +
                assignmentScore * 0.2 +
                team.teamSlaCompliance * 0.25 +
                teamResolutionRate * 0.2 +
                (team.teamCitizenRating / 5) * 100 * 0.1
            )
          )
        );

        const newVerifiedCount = personal.totalVerified;
        const newRejectedCount = personal.totalRejected;
        const newAvgResTime = personal.overallAvgResolutionTime;
        const newRating = personal.rating;

        const hasChanged =
          uo.totalVerifiedIssues !== newVerifiedCount ||
          uo.totalRejectedIssues !== newRejectedCount ||
          uo.avgResolutionTime !== newAvgResTime ||
          uo.rating !== newRating ||
          uo.efficiencyScore !== finalEfficiencyScore ||
          !areArraysEqual(uo.activeIssueIds || [], activeIssueIds) ||
          !areArraysEqual(uo.resolvedIssueIds || [], resolvedIssueIds);

        if (hasChanged) {
          await ctx.db.patch(uo._id, {
            totalVerifiedIssues: newVerifiedCount,
            totalRejectedIssues: newRejectedCount,
            avgResolutionTime: newAvgResTime,
            rating: newRating,
            efficiencyScore: finalEfficiencyScore,
            activeIssueIds,
            resolvedIssueIds,
          });
          uoUpdated++;
        } else {
          uoUnchanged++;
        }
      } catch (err) {
        uoFailed++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[Cron Performance Sync] Unit Officer ${uo._id} sync failed:`, errorMessage);
        failures.push({
          role: 'unit_officer',
          officerId: String(uo._id),
          error: errorMessage,
        });
      }
    }

    const durationMs = Date.now() - startedAt;

    return {
      success: failures.length === 0,
      fieldOfficers: {
        total: fieldOfficers.length,
        updated: foUpdated,
        unchanged: foUnchanged,
        failed: foFailed,
      },
      unitOfficers: {
        total: unitOfficers.length,
        updated: uoUpdated,
        unchanged: uoUnchanged,
        failed: uoFailed,
      },
      failures,
      durationMs,
    };
  },
});

export const refreshFieldOfficerPerformanceInternal = internalMutation({
  args: {
    fieldOfficerId: v.id('fieldOfficers'),
  },
  handler: async (ctx, args) => {
    const fo = await ctx.db.get(args.fieldOfficerId);
    if (!fo) throw new Error('Field Officer not found');

    const issues = await ctx.db
      .query('issues')
      .withIndex('by_assigned_field_officer', (q) => q.eq('assignedFieldOfficer', fo.userId))
      .collect();

    const summary = await calculateFieldOfficerSummary(ctx, fo, issues, 'all');

    const activeIssuesList = issues
      .filter((i) =>
        [
          'assigned',
          'in_progress',
          'submitted_for_review',
          'pending_uo_verification',
          'rework_required',
          'rework_requested',
        ].includes(normalizeStatus(i.status))
      )
      .sort((a, b) => a._creationTime - b._creationTime);

    const completedIssuesList = issues
      .filter((i) => ['resolved', 'closed'].includes(normalizeStatus(i.status)))
      .sort((a, b) => a._creationTime - b._creationTime);

    const assignedIssueIds = Array.from(
      new Map(activeIssuesList.map((i) => [String(i._id), i._id])).values()
    );
    const completedIssueIds = Array.from(
      new Map(completedIssuesList.map((i) => [String(i._id), i._id])).values()
    );

    await ctx.db.patch(fo._id, {
      currentActiveIssues: summary.activeIssues,
      assignedIssueIds,
      completedIssueIds,
      totalResolvedIssues: summary.totalResolved,
      avgResolutionTime: summary.avgResolutionTime,
      onTimeCompletionRate: summary.slaComplianceRate,
      rating: summary.rating,
      efficiencyScore: summary.efficiencyScore,
    });

    return { success: true, officerId: fo._id, summary };
  },
});

export const refreshUnitOfficerPerformanceInternal = internalMutation({
  args: {
    unitOfficerId: v.id('unitOfficers'),
  },
  handler: async (ctx, args) => {
    const uo = await ctx.db.get(args.unitOfficerId);
    if (!uo) throw new Error('Unit Officer not found');

    const uoIssues = await ctx.db
      .query('issues')
      .withIndex('by_assigned_unit_officer', (q) => q.eq('assignedUnitOfficer', uo.userId))
      .collect();

    const personal = await calculateUnitOfficerPersonalSummary(ctx, uo, uoIssues, 'all');

    const activeIssuesList = uoIssues
      .filter((i) =>
        [
          'pending',
          'verified',
          'assigned',
          'in_progress',
          'submitted_for_review',
          'pending_uo_verification',
          'rework_required',
          'rework_requested',
        ].includes(normalizeStatus(i.status))
      )
      .sort((a, b) => a._creationTime - b._creationTime);

    const completedIssuesList = uoIssues
      .filter((i) => ['resolved', 'closed'].includes(normalizeStatus(i.status)))
      .sort((a, b) => a._creationTime - b._creationTime);

    const activeIssueIds = Array.from(
      new Map(activeIssuesList.map((i) => [String(i._id), i._id])).values()
    );
    const resolvedIssueIds = Array.from(
      new Map(completedIssuesList.map((i) => [String(i._id), i._id])).values()
    );

    const teamFieldOfficers = await ctx.db
      .query('fieldOfficers')
      .withIndex('by_unit_officer', (q) => q.eq('reportingUnitOfficerId', uo._id))
      .collect();

    const filteredFos = teamFieldOfficers.filter(
      (fo) => fo.city === uo.city && fo.department === uo.department && fo.accountApproved === true
    );

    const foSummaries: FieldOfficerSummary[] = [];
    for (const fo of filteredFos) {
      const foIssues = await ctx.db
        .query('issues')
        .withIndex('by_assigned_field_officer', (q) => q.eq('assignedFieldOfficer', fo.userId))
        .collect();

      const foSum = await calculateFieldOfficerSummary(ctx, fo, foIssues, 'all');
      foSummaries.push(foSum);
    }

    const team = calculateUnitOfficerTeamSummary(foSummaries);

    const teamResolutionRate =
      team.teamResolvedIssues + team.teamActiveIssues > 0
        ? (team.teamResolvedIssues / (team.teamResolvedIssues + team.teamActiveIssues)) * 100
        : 0;

    const assignmentTargetHours = 24;
    const assignmentScore =
      personal.avgAssignmentTime > 0
        ? Math.max(0, Math.min(100, (assignmentTargetHours / personal.avgAssignmentTime) * 100))
        : personal.totalReviewed > 0
          ? 50
          : 0;

    const finalEfficiencyScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          personal.verificationRate * 0.25 +
            assignmentScore * 0.2 +
            team.teamSlaCompliance * 0.25 +
            teamResolutionRate * 0.2 +
            (team.teamCitizenRating / 5) * 100 * 0.1
        )
      )
    );

    await ctx.db.patch(uo._id, {
      totalVerifiedIssues: personal.totalVerified,
      totalRejectedIssues: personal.totalRejected,
      avgResolutionTime: personal.overallAvgResolutionTime,
      rating: personal.rating,
      efficiencyScore: finalEfficiencyScore,
      activeIssueIds,
      resolvedIssueIds,
    });

    return { success: true, officerId: uo._id, personal, team, finalEfficiencyScore };
  },
});
