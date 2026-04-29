import { internalMutation } from './_generated/server';

export const autoAssignIssues = internalMutation({
  args: {},

  handler: async (ctx) => {
    const now = Date.now();

    // 1. Get all unassigned issues
    const issues = await ctx.db
      .query('issues')
      .filter((q) =>
        q.and(
          q.eq(q.field('assignedUnitOfficer'), null),
          q.eq(q.field('status'), 'pending'),
          q.eq(q.field('escalatedToAdmin'), false)
        )
      )
      .collect();

    if (issues.length === 0) return 'No issues to assign';

    for (const issue of issues) {
      // 2. Get eligible unit officers
      const officers = await ctx.db
        .query('unitOfficers')
        .filter((q) =>
          q.and(
            q.eq(q.field('city'), issue.city),
            q.eq(q.field('department'), issue.category),
            q.eq(q.field('accountApproved'), true)
          )
        )
        .collect();

      if (officers.length === 0) {
        console.log('No officer found for:', issue._id);
        continue;
      }

      // 3. Load balancing (least active issues)
      let selectedOfficer = officers[0];

      for (const officer of officers) {
        if ((officer.activeIssueIds?.length || 0) < (selectedOfficer.activeIssueIds?.length || 0)) {
          selectedOfficer = officer;
        }
      }

      // 4. Get officer user details (for name)
      const officerUser = await ctx.db.get(selectedOfficer.userId);

      const officerName = officerUser?.fullName || 'Unit Officer';

      // 5. Assign issue
      await ctx.db.patch(issue._id, {
        assignedUnitOfficer: selectedOfficer.userId,
      });

      // 6. Update officer workload
      await ctx.db.patch(selectedOfficer._id, {
        activeIssueIds: [...(selectedOfficer.activeIssueIds || []), issue._id],
      });

      // 7. ISSUE UPDATE ENTRY
      await ctx.db.insert('issueUpdates', {
        issueId: issue._id,
        status: 'pending',
        comment: `Issue has been assigned to ${officerName} for further processing.`,
        updatedBy: selectedOfficer.userId,
        role: 'unit_officer',
        attachments: [],
        scope: 'citizen',
        createdAt: now,
      });

      // 8. NOTIFICATION → Citizen
      await ctx.db.insert('notifications', {
        userId: issue.reportedBy,
        issueId: issue._id,
        message: `Your issue "${issue.title}" has been assigned to ${officerName}.`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });

      // 9. NOTIFICATION → Unit Officer
      await ctx.db.insert('notifications', {
        userId: selectedOfficer.userId,
        issueId: issue._id,
        message: `You have been assigned a new issue: "${issue.title}".`,
        type: 'assigned',
        read: false,
        createdAt: now,
      });
    }

    return `Assigned ${issues.length} issues successfully`;
  },
});

export const assignFieldOfficersToUnitOfficers = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all Unit Officers
    const unitOfficers = await ctx.db.query('unitOfficers').collect();

    // Get all Field Officers
    const fieldOfficers = await ctx.db.query('fieldOfficers').collect();

    for (const uo of unitOfficers) {
      // Match by city and department
      const matchingFOs = fieldOfficers.filter(
        (fo) =>
          fo.city === uo.city && fo.department === uo.department && fo.accountApproved === true
      );

      const fieldOfficerIds = matchingFOs.map((fo) => fo._id);

      // Update Unit Officer with assigned FOs
      await ctx.db.patch(uo._id, {
        assignedFieldOfficers: fieldOfficerIds,
      });

      // Update each Field Officer with reporting UO
      for (const fo of matchingFOs) {
        await ctx.db.patch(fo._id, {
          reportingUnitOfficerId: uo._id,
        });
      }
    }

    return {
      success: true,
      message: 'Field Officers successfully assigned to Unit Officers',
    };
  },
});
