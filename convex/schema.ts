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
      v.literal('admin'),
      v.literal('city_admin')
    ),

    createdAt: v.string(),
  })
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  citizens: defineTable({
  userId: v.id("users"),

  fullName: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),

  city: v.string(),
  state: v.string(),
  region: v.string(),

  postal: v.string(),
  fullAddress: v.string(),

  latitude: v.string(),
  longitude: v.string(),

  // Fast summary total
  points: v.number(),

  // Gamification summary
  level: v.optional(v.number()),
  levelTitle: v.optional(v.string()),
  badgeCount: v.optional(v.number()),

  // Activity statistics
  reportsSubmitted: v.optional(v.number()),
  reportsVerified: v.optional(v.number()),
  reportsResolved: v.optional(v.number()),
  reportsRejected: v.optional(v.number()),
  duplicateReports: v.optional(v.number()),

  commentsAdded: v.optional(v.number()),
  upvotesReceived: v.optional(v.number()),

  // Optional evidence statistics
  videoEvidenceAdded: v.optional(v.number()),

  // Streaks
  currentStreak: v.optional(v.number()),
  longestStreak: v.optional(v.number()),
  lastActivityAt: v.optional(v.number()),

  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_city", ["city"])
  .index("by_points", ["points"])
  .index("by_city_points", ["city", "points"])
  .index("by_region_points", ["region", "points"]),

  citizenPointTransactions: defineTable({
  citizenId: v.id("citizens"),
  userId: v.id("users"),

  type: v.union(
    v.literal("issue_submitted"),
    v.literal("video_evidence_added"),
    v.literal("issue_verified"),
    v.literal("issue_assigned"),
    v.literal("issue_resolved"),
    v.literal("issue_closed"),
    v.literal("issue_rejected"),
    v.literal("duplicate_report"),
    v.literal("issue_withdrawn"),
    v.literal("comment_added"),
    v.literal("comment_liked"),
    v.literal("report_upvoted"),
    v.literal("streak_bonus"),
    v.literal("badge_bonus"),
    v.literal("manual_adjustment")
  ),

  points: v.number(),
  reason: v.string(),

  relatedIssueId: v.optional(v.id("issues")),
  relatedCommentId: v.optional(v.id("issueDiscussionForum")),
  relatedReplyId: v.optional(v.id("issueDiscussionReplies")),
  relatedBadgeId: v.optional(v.id("badges")),

  metadata: v.optional(
    v.object({
      previousPoints: v.optional(v.number()),
      newPoints: v.optional(v.number()),
      officerId: v.optional(v.string()),
      duplicateGroupId: v.optional(v.string()),
      source: v.optional(v.string()),
    })
  ),

  createdAt: v.number(),
})
  .index("by_citizen", ["citizenId"])
  .index("by_user", ["userId"])
  .index("by_type", ["type"])
  .index("by_issue", ["relatedIssueId"])
  .index("by_citizen_type", ["citizenId", "type"])
  .index("by_citizen_created", ["citizenId", "createdAt"]),

  badges: defineTable({
  code: v.string(),

  name: v.string(),
  description: v.string(),

  icon: v.string(),

  category: v.union(
    v.literal("reporting"),
    v.literal("resolution"),
    v.literal("community"),
    v.literal("streak"),
    v.literal("quality"),
    v.literal("special")
  ),

  requiredPoints: v.optional(v.number()),
  requiredCount: v.optional(v.number()),

  isActive: v.boolean(),

  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_code", ["code"])
  .index("by_category", ["category"])
  .index("by_active", ["isActive"]),

  citizenBadges: defineTable({
  citizenId: v.id("citizens"),
  userId: v.id("users"),

  badgeId: v.id("badges"),
  badgeCode: v.string(),

  earnedAt: v.number(),

  relatedIssueId: v.optional(v.id("issues")),

  metadata: v.optional(
    v.object({
      reason: v.optional(v.string()),
      pointsAwarded: v.optional(v.number()),
    })
  ),
})
  .index("by_citizen", ["citizenId"])
  .index("by_user", ["userId"])
  .index("by_badge", ["badgeId"])
  .index("by_citizen_badge_code", ["citizenId", "badgeCode"]),

  unitOfficers: defineTable({
    userId: v.id('users'),
    profilePicture: v.optional(v.id('_storage')),

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
    profilePicture: v.optional(v.id('_storage')),

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

    // Field Officer Reports
    beforePhotos: v.optional(v.array(v.id('_storage'))),
    beforeLocation: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
      })
    ),
    afterPhotos: v.optional(v.array(v.id('_storage'))),
    afterLocation: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
      })
    ),
    notes: v.optional(v.string()),

    // Workflow
    status: v.string(),

    // Citizen Withdrawal
    withdrawnAt: v.optional(v.number()),
    withdrawalReason: v.optional(v.string()),
    withdrawalCategory: v.optional(v.string()),

    // Assignments
    assignedUnitOfficer: v.union(v.id('users'), v.null()),
    assignedFieldOfficer: v.union(v.id('users'), v.null()),

    // Issue Verification
    verificationChecklist: v.optional(
      v.object({
        locationValid: v.boolean(),
        hasSufficientEvidence: v.boolean(),
        notDuplicate: v.boolean(),
        isWithinJurisdiction: v.boolean(),
        notes: v.optional(v.string()),
        verifiedBy: v.id('users'),
        verifiedAt: v.number(),
      })
    ),

    // Issue Rejection
    rejection: v.optional(
      v.object({
        reason: v.string(),
        comment: v.string(),
        rejectedBy: v.id('users'),
        rejectedAt: v.number(),
      })
    ),

    // Rework Workflow
    reworkNote: v.optional(v.string()),
    reworkReasons: v.optional(v.array(v.string())),
    lastReworkRequestedAt: v.optional(v.number()),

    possibleDuplicateIds: v.array(v.id('issues')),

    escalatedToAdmin: v.boolean(),

    slaCategory: v.string(),
    slaDeadline: v.union(v.number(), v.null()),
    slaBreached: v.boolean(),

    slaBreachedCount: v.optional(v.number()),

    slaExtension: v.optional(
      v.object({
        reason: v.string(),
        comment: v.optional(v.string()),
        extendedBy: v.id('users'),
        extendedAt: v.number(),
        newSlaDeadline: v.number(),
      })
    ),

    slaReassignment: v.optional(
      v.object({
        reason: v.string(),
        comment: v.optional(v.string()),
        previousFieldOfficer: v.id('users'),
        newFieldOfficer: v.id('users'),
        reassignedBy: v.id('users'),
        reassignedAt: v.number(),
        newSlaDeadline: v.number(),
      })
    ),

    slaRejection: v.optional(
      v.object({
        reason: v.string(),
        comment: v.optional(v.string()),
        rejectedBy: v.id('users'),
        rejectedAt: v.number(),
      })
    ),

    resolvedAt: v.union(v.number(), v.null()),
    closedAt: v.union(v.number(), v.null()),

    citizenRating: v.union(v.number(), v.null()),
    citizenFeedback: v.union(v.string(), v.null()),

    reopenCount: v.number(),
    reopenCategory: v.optional(v.string()),
    reopenReason: v.union(v.string(), v.null()),
    isReopened: v.boolean(),

    createdAt: v.number(),
  })
    .index('by_reporter', ['reportedBy'])
    .index('by_status', ['status'])
    .index('by_city', ['city'])
    .index('by_category', ['category'])
    .index('by_assigned_unit_officer', ['assignedUnitOfficer'])
    .index('by_assigned_field_officer', ['assignedFieldOfficer']),

  issueUpdates: defineTable({
    // Reference
    issueId: v.id('issues'),

    // Workflow status after update
    status: v.string(),

    // Remarks / notes
    comment: v.union(v.string(), v.null()),

    // Who performed the update
    updatedBy: v.optional(v.id('users')),

    role: v.union(
      v.literal('citizen'),
      v.literal('unit_officer'),
      v.literal('field_officer'),
      v.literal('admin')
    ),

    // Attachments (photos/videos/documents)
    attachments: v.optional(v.array(v.id('_storage'))),

    // Visibility scope
    scope: v.union(
      v.literal('officer_and_citizen'), // visible to citizen and officers
      v.literal('citizen'), // citizens only
      v.literal('admin_only') // admin only
    ),

    // Timestamp
    createdAt: v.number(),
  })
    .index('by_issue', ['issueId'])
    .index('by_issue_status', ['issueId', 'status'])
    .index('by_updated_by', ['updatedBy'])
    .index('by_role', ['role']),

  notifications: defineTable({
    userId: v.string(),
    issueId: v.optional(v.id('issues')),
    title: v.optional(v.string()),
    message: v.string(),
    type: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_unread', ['userId', 'read']),

  issueMessages: defineTable({
    issueId: v.id('issues'),

    senderId: v.id('users'),
    recipientId: v.id('users'),

    message: v.string(),

    isRead: v.boolean(),

    createdAt: v.number(),
  })
    .index('by_issue', ['issueId'])
    .index('by_sender', ['senderId'])
    .index('by_recipient', ['recipientId'])
    .index('by_issue_createdAt', ['issueId', 'createdAt'])
    .index('by_recipient_read', ['recipientId', 'isRead']),

  publicIssues: defineTable({
    issueId: v.id('issues'),

    issueCode: v.string(),
    title: v.string(),
    description: v.string(),

    category: v.string(),
    status: v.union(v.literal('resolved'), v.literal('rejected')),

    ward: v.string(),

    address: v.string(),
    city: v.string(),
    state: v.string(),
    postal: v.string(),

    latitude: v.number(),
    longitude: v.number(),

    createdAt: v.string(),
    reviewedAt: v.union(v.string(), v.null()),
    resolvedAt: v.union(v.string(), v.null()),
    rejectedAt: v.union(v.string(), v.null()),

    foVisible: v.optional(v.boolean()),

    publicCompletionNote: v.union(v.string(), v.null()),
    rejectionReason: v.union(v.string(), v.null()),

    photosBefore: v.array(v.string()),
    photosAfter: v.array(v.string()),

    publicVisible: v.boolean(),
    publishStatus: v.union(v.literal('published'), v.literal('draft')),

    moderatedAt: v.optional(v.number()),
    createdPublicAt: v.number(),
  })
    .index('by_city', ['city'])
    .index('by_issue', ['issueId'])
    .index('by_status', ['status'])
    .index('by_resolved_at', ['resolvedAt'])
    .index('by_rejected_at', ['rejectedAt'])
    .index('by_created_at', ['createdAt']),

  issueDiscussionForum: defineTable({
    issueId: v.id('publicIssues'),

    citizenId: v.id('users'),

    comments: v.string(),

    isAnonymous: v.boolean(),

    createdAt: v.number(),

    likeCount: v.number(),

    likedBy: v.optional(v.array(v.id('users'))),
    isHidden: v.boolean(),

    replyCount: v.number(),
  })
    .index('by_issue', ['issueId'])
    .index('by_citizen', ['citizenId'])
    .index('by_issue_created', ['issueId', 'createdAt']),

  issueDiscussionReplies: defineTable({
    issueId: v.id('publicIssues'),

    discussionId: v.id('issueDiscussionForum'),

    userId: v.id('users'),

    reply: v.string(),

    isAnonymous: v.boolean(),

    createdAt: v.number(),

    likeCount: v.number(),

    likedBy: v.optional(v.array(v.id('users'))),
    isHidden: v.boolean(),
  })
    .index('by_issue', ['issueId'])
    .index('by_discussion', ['discussionId'])
    .index('by_user', ['userId']),

  messages: defineTable({
    conversationId: v.id('conversations'),
    fromId: v.id('users'),
    toId: v.id('users'),
    message: v.string(),
    createdAt: v.number(),
    read: v.boolean(),
    issueIds: v.optional(v.array(v.id('issues'))),
    fromRole: v.string(),
    fromName: v.string(),
    isDeleted: v.optional(v.boolean()),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_receiver', ['toId'])
    .index('by_sender', ['fromId']),

  conversations: defineTable({
    participantIds: v.array(v.id('users')),
    lastMessage: v.optional(v.string()),
    lastMessageTime: v.optional(v.number()),
    lastMessageSenderId: v.optional(v.id('users')),
    unreadCountMap: v.optional(v.record(v.id('users'), v.number())),
    issueRef: v.optional(
      v.object({
        issueId: v.id('issues'),
        issueTitle: v.string(),
        status: v.string(),
      })
    ),
  }).index('by_participants', ['participantIds']),
});
