import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Auto assignment every 30 minutes
// crons.interval(
//   "auto assign civic issues",
//   { minutes: 30 },
//   internal.issues.autoAssignIssues,
// );

export default crons;
