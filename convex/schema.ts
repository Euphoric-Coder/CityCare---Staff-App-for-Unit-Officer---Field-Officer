import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    fullName: v.string(),
    email: v.string(),
    password: v.string(),

    role: v.union(
      v.literal('citizen'),
      v.literal('unit_officer'),
      v.literal('field_officer'),
      v.literal('admin')
    ),

    createdAt: v.string(),
  })
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  citizens: defineTable({
    userId: v.id('users'),

    fullName: v.string(),
    email: v.string(),

    city: v.string(),
    state: v.string(),
    region: v.string(),

    postal: v.string(),
    fullAddress: v.string(),

    latitude: v.string(),
    longitude: v.string(),

    points: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_city', ['city']),

  unitOfficers: defineTable({
    userId: v.id('users'),

    fullName: v.string(),
    email: v.string(),
    phone: v.string(),

    state: v.string(),
    city: v.string(),
    district: v.string(),

    department: v.string(),

    totalVerifiedIssues: v.number(),
    totalRejectedIssues: v.number(),

    avgResolutionTime: v.number(),

    accountApproved: v.boolean(),

    rating: v.number(),
    efficiencyScore: v.number(),

    lastLogin: v.optional(v.string()),

    assignedFieldOfficers: v.array(v.id('fieldOfficers')),

    activeIssueIds: v.array(v.id('issues')),
    resolvedIssueIds: v.array(v.id('issues')),
  })
    .index('by_user', ['userId'])
    .index('by_department', ['department'])
    .index('by_city', ['city']),

  fieldOfficers: defineTable({
    userId: v.id('users'),

    fullName: v.string(),
    email: v.string(),
    phone: v.string(),

    state: v.string(),
    city: v.string(),
    district: v.string(),

    department: v.string(),

    specialisations: v.array(v.string()),

    reportingUnitOfficerId: v.optional(v.id('unitOfficers')),

    currentActiveIssues: v.number(),
    maxIssueCapacity: v.number(),

    assignedIssueIds: v.array(v.id('issues')),
    completedIssueIds: v.array(v.id('issues')),

    totalResolvedIssues: v.number(),

    avgResolutionTime: v.number(),
    onTimeCompletionRate: v.number(),

    accountApproved: v.boolean(),

    rating: v.number(),
    efficiencyScore: v.number(),

    lastLogin: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_department', ['department'])
    .index('by_unit_officer', ['reportingUnitOfficerId']),

  issues: defineTable({
    // Core
    issueCode: v.string(),

    title: v.string(),
    description: v.string(),

    category: v.string(),

    subcategory: v.array(v.string()),

    otherCategoryName: v.union(v.string(), v.null()),

    priority: v.string(),

    tags: v.array(v.string()),

    // Location
    latitude: v.string(),
    longitude: v.string(),

    address: v.string(),
    city: v.string(),
    state: v.string(),
    postal: v.string(),

    googleMapUrl: v.string(),

    // Reporter
    reportedBy: v.id('users'),

    isAnonymous: v.boolean(),

    additionalEmail: v.union(v.string(), v.null()),

    // Media
    photos: v.array(v.id('_storage')),

    // Single videos
    videos: v.union(v.id('_storage'), v.null()),

    // Workflow
    status: v.string(),

    assignedUnitOfficer: v.union(v.id('users'), v.null()),
    assignedFieldOfficer: v.union(v.id('users'), v.null()),

    possibleDuplicateIds: v.array(v.id('issues')),

    escalatedToAdmin: v.boolean(),

    slaCategory: v.string(),
    slaDeadline: v.union(v.number(), v.null()),
    slaBreached: v.boolean(),

    resolvedAt: v.union(v.number(), v.null()),
    closedAt: v.union(v.number(), v.null()),

    citizenRating: v.union(v.number(), v.null()),
    citizenFeedback: v.union(v.string(), v.null()),

    reopenCount: v.number(),
    reopenReason: v.union(v.string(), v.null()),
    isReopened: v.boolean(),

    createdAt: v.number(),
  })
    .index('by_reporter', ['reportedBy'])
    .index('by_status', ['status'])
    .index('by_city', ['city'])
    .index('by_category', ['category']),

  issueUpdates: defineTable({
    // Reference
    issueId: v.id('issues'),

    // Workflow status after update
    status: v.string(),

    // Remarks / notes
    comment: v.union(v.string(), v.null()),

    // Who performed the update
    updatedBy: v.id('users'),

    role: v.union(
      v.literal('citizen'),
      v.literal('unit_officer'),
      v.literal('field_officer'),
      v.literal('admin')
    ),

    // Attachments (photos/videos/documents)
    attachments: v.array(v.id('_storage')),

    // Visibility scope
    scope: v.union(
      v.literal('public'), // visible to citizen
      v.literal('internal'), // officers only
      v.literal('admin_only') // admin audit
    ),

    // Timestamp
    createdAt: v.number(),
  })
    .index('by_issue', ['issueId'])
    .index('by_issue_status', ['issueId', 'status'])
    .index('by_updated_by', ['updatedBy'])
    .index('by_role', ['role']),
});
