import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Auto assignment every 30 minutes
crons.interval(
  "auto assign civic issues",
  { minutes: 30 },
  internal.officerAssign.autoAssignIssues,
);

// Sync resolved/rejected issues to publicIssues every 30 minutes
crons.interval(
  "sync public issues",
  { minutes: 30 },
  internal.publicIssues.syncPublicIssues,
);

// Daily officer performance metric synchronization (runs every 24 hours)
crons.interval(
  "daily-officer-performance-refresh",
  { hours: 24 },
  internal.officerPerformanceMaintenance.refreshAllOfficerPerformance,
);

crons.interval(
  'ensure default system badges',
  { hours: 24 },
  internal.badges.ensureDefaultBadges,
  {}
);

export default crons;
