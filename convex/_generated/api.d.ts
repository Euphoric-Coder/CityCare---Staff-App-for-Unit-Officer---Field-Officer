/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as duplicateIssues from "../duplicateIssues.js";
import type * as fieldOfficers from "../fieldOfficers.js";
import type * as issueUpdates from "../issueUpdates.js";
import type * as issues from "../issues.js";
import type * as issuesMedia from "../issuesMedia.js";
import type * as notifications from "../notifications.js";
import type * as signUp from "../signUp.js";
import type * as unitOfficers from "../unitOfficers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  duplicateIssues: typeof duplicateIssues;
  fieldOfficers: typeof fieldOfficers;
  issueUpdates: typeof issueUpdates;
  issues: typeof issues;
  issuesMedia: typeof issuesMedia;
  notifications: typeof notifications;
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
