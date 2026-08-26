/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auditLogger from "../auditLogger.js";
import type * as auth from "../auth.js";
import type * as badges from "../badges.js";
import type * as crons from "../crons.js";
import type * as demoSeed from "../demoSeed.js";
import type * as demoSeedPasswords from "../demoSeedPasswords.js";
import type * as directMessages from "../directMessages.js";
import type * as duplicateIssues from "../duplicateIssues.js";
import type * as escalation from "../escalation.js";
import type * as fieldOfficers from "../fieldOfficers.js";
import type * as gamification from "../gamification.js";
import type * as gamificationAutomation from "../gamificationAutomation.js";
import type * as issueAnalytics from "../issueAnalytics.js";
import type * as issueDiscussions from "../issueDiscussions.js";
import type * as issueReview from "../issueReview.js";
import type * as issueUpdates from "../issueUpdates.js";
import type * as issues from "../issues.js";
import type * as issuesMedia from "../issuesMedia.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as officerAssign from "../officerAssign.js";
import type * as officerAuth from "../officerAuth.js";
import type * as officerAuthInternal from "../officerAuthInternal.js";
import type * as officerPerformance from "../officerPerformance.js";
import type * as officerPerformanceMaintenance from "../officerPerformanceMaintenance.js";
import type * as passwordResetInternal from "../passwordResetInternal.js";
import type * as passwordResetNode from "../passwordResetNode.js";
import type * as passwordResetPublic from "../passwordResetPublic.js";
import type * as publicIssues from "../publicIssues.js";
import type * as signUp from "../signUp.js";
import type * as unitOfficers from "../unitOfficers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auditLogger: typeof auditLogger;
  auth: typeof auth;
  badges: typeof badges;
  crons: typeof crons;
  demoSeed: typeof demoSeed;
  demoSeedPasswords: typeof demoSeedPasswords;
  directMessages: typeof directMessages;
  duplicateIssues: typeof duplicateIssues;
  escalation: typeof escalation;
  fieldOfficers: typeof fieldOfficers;
  gamification: typeof gamification;
  gamificationAutomation: typeof gamificationAutomation;
  issueAnalytics: typeof issueAnalytics;
  issueDiscussions: typeof issueDiscussions;
  issueReview: typeof issueReview;
  issueUpdates: typeof issueUpdates;
  issues: typeof issues;
  issuesMedia: typeof issuesMedia;
  messages: typeof messages;
  notifications: typeof notifications;
  officerAssign: typeof officerAssign;
  officerAuth: typeof officerAuth;
  officerAuthInternal: typeof officerAuthInternal;
  officerPerformance: typeof officerPerformance;
  officerPerformanceMaintenance: typeof officerPerformanceMaintenance;
  passwordResetInternal: typeof passwordResetInternal;
  passwordResetNode: typeof passwordResetNode;
  passwordResetPublic: typeof passwordResetPublic;
  publicIssues: typeof publicIssues;
  signUp: typeof signUp;
  unitOfficers: typeof unitOfficers;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
