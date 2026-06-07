import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// // Auto assignment every 30 minutes
// crons.interval(
//   "auto assign civic issues",
//   { minutes: 30 },
//   internal.officerAssign.autoAssignIssues,
// );

// // Sync resolved/rejected issues to publicIssues every 30 minutes
// crons.interval(
//   "sync public issues",
//   { minutes: 30 },
//   internal.publicIssues.syncPublicIssues,
// );

crons.interval(
  'ensure default system badges',
  { hours: 24 },
  internal.badges.ensureDefaultBadges,
  {}
);

export default crons;
