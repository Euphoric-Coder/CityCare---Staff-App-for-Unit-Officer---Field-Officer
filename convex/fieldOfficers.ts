import { v } from 'convex/values';
import { query } from './_generated/server';

export const getFieldOfficerByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('fieldOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
  },
});

export const getFieldOfficerIssues = query({
  args: { userId: v.id('users') },

  handler: async (ctx, args) => {
    // 1. Get Unit Officer
    const officer = await ctx.db
      .query('fieldOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (!officer) return [];

    // 2. Fetch Issues
    const issues = await Promise.all(officer.assignedIssueIds.map((id) => ctx.db.get(id)));

    const validIssues = issues.filter(Boolean);

    // 3. Fetch Citizen Data for each issue
    const enrichedIssues = await Promise.all(
      validIssues.map(async (issue) => {
        if (!issue) return null;

        // reportedBy = userId of citizen
        const citizen = await ctx.db
          .query('citizens')
          .withIndex('by_user', (q) => q.eq('userId', issue.reportedBy))
          .unique();

        // Main preview (first photo)
        const photoUrl = await Promise.all(
          (issue.photos || []).map(async (fileId) => {
            const url = await ctx.storage.getUrl(fileId);
            return url;
          })
        );

        // Citizen Video Evidence (if exists)
        let videoUrl = null;
        if (issue.videos) {
          videoUrl = await ctx.storage.getUrl(issue.videos);
        }

        return {
          ...issue,
          photoUrl,
          videoUrl,

          citizenDetails: {
            fullName: citizen?.fullName ?? 'Unknown',
            email: citizen?.email ?? 'N/A',
            phone: citizen?.phone ?? 'N/A',
          },
        };
      })
    );

    return enrichedIssues.filter(Boolean);
  },
});
