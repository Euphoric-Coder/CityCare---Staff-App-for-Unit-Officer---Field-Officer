import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { awardCitizenPoints, checkAndAwardCitizenBadges } from '../lib/gamificationAwards';

const getCitizenByUserId = async (ctx: any, userId: any) => {
  return await ctx.db
    .query('citizens')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .first();
};

export const getIssueDiscussions = query({
  args: {
    issueId: v.id('publicIssues'),
  },

  handler: async (ctx, args) => {
    const discussions = await ctx.db
      .query('issueDiscussionForum')
      .withIndex('by_issue', (q) => q.eq('issueId', args.issueId))
      .collect();

    const visibleDiscussions = discussions.filter((discussion) => !discussion.isHidden);

    const enriched = await Promise.all(
      visibleDiscussions.map(async (discussion) => {
        const citizen = await ctx.db.get(discussion.citizenId);

        const replies = await ctx.db
          .query('issueDiscussionReplies')
          .withIndex('by_discussion', (q) => q.eq('discussionId', discussion._id))
          .collect();

        const visibleReplies = replies.filter((reply) => !reply.isHidden);

        const enrichedReplies = await Promise.all(
          visibleReplies.map(async (reply) => {
            const user = await ctx.db.get(reply.userId);

            return {
              id: reply._id,
              issueId: reply.issueId,
              discussionId: reply.discussionId,

              userId: reply.userId,
              userName: reply.isAnonymous ? 'Anonymous User' : user?.fullName || 'Unknown User',
              userRole: reply.isAnonymous ? 'citizen' : user?.role || 'citizen',

              reply: reply.reply,
              isAnonymous: reply.isAnonymous,

              createdAt: reply.createdAt,
              likeCount: reply.likeCount,

              likedBy: reply.likedBy || [],
              isHidden: reply.isHidden,
            };
          })
        );

        return {
          id: discussion._id,
          issueId: discussion.issueId,

          citizenId: discussion.citizenId,
          userName: discussion.isAnonymous
            ? 'Anonymous Citizen'
            : citizen?.fullName || 'Unknown Citizen',
          userRole: discussion.isAnonymous ? 'citizen' : citizen?.role || 'citizen',

          comments: discussion.comments,
          isAnonymous: discussion.isAnonymous,

          createdAt: discussion.createdAt,
          likeCount: discussion.likeCount,

          likedBy: discussion.likedBy || [],
          isHidden: discussion.isHidden,

          replyCount: visibleReplies.length,
          replies: enrichedReplies.sort((a, b) => a.createdAt - b.createdAt),
        };
      })
    );

    return enriched.sort((a, b) => b.likeCount - a.likeCount);
  },
});

export const addIssueDiscussion = mutation({
  args: {
    issueId: v.id('publicIssues'),
    citizenId: v.id('users'),
    comments: v.string(),
    isAnonymous: v.boolean(),
  },

  handler: async (ctx, args) => {
    const publicIssue = await ctx.db.get(args.issueId);

    if (!publicIssue) {
      throw new Error('Public issue not found');
    }

    const discussionId = await ctx.db.insert('issueDiscussionForum', {
      issueId: args.issueId,
      citizenId: args.citizenId,
      comments: args.comments.trim(),
      isAnonymous: args.isAnonymous,

      createdAt: Date.now(),

      likeCount: 0,
      likedBy: [],
      isHidden: false,

      replyCount: 0,
    });

    // Gamification: Comment Added Reward
    // A citizen should receive this reward only once per public issue.
    const citizen = await getCitizenByUserId(ctx, args.citizenId);

    if (citizen) {
      const existingCommentReward = await ctx.db
        .query('citizenPointTransactions')
        .filter((q) =>
          q.and(
            q.eq(q.field('citizenId'), citizen._id),
            q.eq(q.field('userId'), citizen.userId),
            q.eq(q.field('type'), 'comment_added'),
            q.eq(q.field('relatedIssueId'), publicIssue.issueId),
            q.eq(q.field('metadata.source'), 'public_issue_discussion_comment')
          )
        )
        .first();

      if (!existingCommentReward) {
        await awardCitizenPoints(ctx, {
          citizenId: citizen._id,
          userId: citizen.userId,
          type: 'comment_added',
          points: 2,
          reason: 'Comment added on public issue discussion',
          relatedIssueId: publicIssue.issueId,
          relatedCommentId: discussionId,
          metadata: {
            source: 'public_issue_discussion_comment',
          },
        });

        await checkAndAwardCitizenBadges(ctx, {
          citizenId: citizen._id,
          userId: citizen.userId,
          relatedIssueId: publicIssue.issueId,
        });
      }
    }

    return discussionId;
  },
});

export const addIssueReply = mutation({
  args: {
    issueId: v.id('publicIssues'),
    discussionId: v.id('issueDiscussionForum'),
    userId: v.id('users'),
    reply: v.string(),
    isAnonymous: v.boolean(),
  },

  handler: async (ctx, args) => {
    const discussion = await ctx.db.get(args.discussionId);

    const publicIssue = await ctx.db.get(args.issueId);

    if (!discussion) {
      throw new Error('Discussion not found');
    }

    const replyId = await ctx.db.insert('issueDiscussionReplies', {
      issueId: args.issueId,
      discussionId: args.discussionId,

      userId: args.userId,

      reply: args.reply.trim(),
      isAnonymous: args.isAnonymous,

      createdAt: Date.now(),

      likeCount: 0,
      likedBy: [],
      isHidden: false,
    });

    await ctx.db.patch(args.discussionId, {
      replyCount: discussion.replyCount + 1,
    });

    // Gamification: Reply Added Reward
    // A citizen should receive this reward only once per public issue.
    const citizen = await getCitizenByUserId(ctx, args.userId);

    if (citizen) {
      const existingReplyReward = await ctx.db
        .query('citizenPointTransactions')
        .filter((q) =>
          q.and(
            q.eq(q.field('citizenId'), citizen._id),
            q.eq(q.field('userId'), citizen.userId),
            q.eq(q.field('type'), 'comment_added'),
            q.eq(q.field('relatedIssueId'), publicIssue?.issueId),
            q.eq(q.field('metadata.source'), 'public_issue_discussion_reply')
          )
        )
        .first();

      if (!existingReplyReward) {
        await awardCitizenPoints(ctx, {
          citizenId: citizen._id,
          userId: citizen.userId,
          type: 'comment_added',
          points: 2,
          reason: 'Reply added on public issue discussion',
          relatedIssueId: publicIssue?.issueId,
          relatedReplyId: replyId,
          relatedCommentId: args.discussionId,
          metadata: {
            source: 'public_issue_discussion_reply',
          },
        });

        await checkAndAwardCitizenBadges(ctx, {
          citizenId: citizen._id,
          userId: citizen.userId,
          relatedIssueId: publicIssue?.issueId,
        });
      }
    }

    return replyId;
  },
});

export const likeDiscussion = mutation({
  args: {
    discussionId: v.id('issueDiscussionForum'),
    userId: v.id('users'),
  },

  handler: async (ctx, args) => {
    const discussion = await ctx.db.get(args.discussionId);

    if (!discussion) {
      throw new Error('Discussion not found');
    }

    const publicIssue = await ctx.db.get(discussion.issueId);

    if (!publicIssue) {
      throw new Error('Public issue not found');
    }

    const likedBy = discussion.likedBy || [];

    // This means the user had already liked it before this click.
    const wasAlreadyLiked = likedBy.includes(args.userId);

    let newLikedBy;
    let newLikeCount;

    if (wasAlreadyLiked) {
      // Current action: unlike
      newLikedBy = likedBy.filter((id) => id !== args.userId);
      newLikeCount = Math.max(0, discussion.likeCount - 1);
    } else {
      // Current action: like
      newLikedBy = [...likedBy, args.userId];
      newLikeCount = discussion.likeCount + 1;
    }

    await ctx.db.patch(args.discussionId, {
      likedBy: newLikedBy,
      likeCount: newLikeCount,
    });

    // Gamification:
    // Points go to the owner of the comment, not the user who clicked like.
    // Self-like should not give points.
    if (discussion.citizenId !== args.userId) {
      const commentOwnerCitizen = await getCitizenByUserId(ctx, discussion.citizenId);

      if (commentOwnerCitizen) {
        if (!wasAlreadyLiked) {
          // Current action: LIKE
          // Comment owner gets +1.
          await awardCitizenPoints(ctx, {
            citizenId: commentOwnerCitizen._id,
            userId: commentOwnerCitizen.userId,
            type: 'comment_liked',
            points: 1,
            reason: 'Public discussion comment liked by another citizen',
            relatedIssueId: publicIssue.issueId,
            relatedCommentId: args.discussionId,
            metadata: {
              source: 'public_issue_discussion_comment_liked',
            },
          });

          await checkAndAwardCitizenBadges(ctx, {
            citizenId: commentOwnerCitizen._id,
            userId: commentOwnerCitizen.userId,
            relatedIssueId: publicIssue.issueId,
          });
        } else {
          // Current action: UNLIKE
          // Use manual_adjustment for reversal so it does not increase
          // comment_liked badge/activity counters again.
          await awardCitizenPoints(ctx, {
            citizenId: commentOwnerCitizen._id,
            userId: commentOwnerCitizen.userId,
            type: 'manual_adjustment',
            points: -1,
            reason: 'Public discussion comment like removed',
            relatedIssueId: publicIssue.issueId,
            relatedCommentId: args.discussionId,
            metadata: {
              source: 'public_issue_discussion_comment_unliked',
            },
          });
        }
      }
    }

    return {
      likeCount: newLikeCount,
      likedBy: newLikedBy,
      action: wasAlreadyLiked ? 'unliked' : 'liked',
    };
  },
});

export const likeReply = mutation({
  args: {
    replyId: v.id('issueDiscussionReplies'),
    userId: v.id('users'),
  },

  handler: async (ctx, args) => {
    const reply = await ctx.db.get(args.replyId);

    if (!reply) {
      throw new Error('Reply not found');
    }

    const publicIssue = await ctx.db.get(reply.issueId);

    if (!publicIssue) {
      throw new Error('Public issue not found');
    }

    const likedBy = reply.likedBy || [];

    // This means the user had already liked it before this click.
    const wasAlreadyLiked = likedBy.includes(args.userId);

    let newLikedBy;
    let newLikeCount;

    if (wasAlreadyLiked) {
      // Current action: unlike
      newLikedBy = likedBy.filter((id) => id !== args.userId);
      newLikeCount = Math.max(0, reply.likeCount - 1);
    } else {
      // Current action: like
      newLikedBy = [...likedBy, args.userId];
      newLikeCount = reply.likeCount + 1;
    }

    await ctx.db.patch(args.replyId, {
      likedBy: newLikedBy,
      likeCount: newLikeCount,
    });

    // Gamification:
    // Points go to the owner of the reply, not the user who clicked like.
    // Self-like should not give points.
    if (reply.userId !== args.userId) {
      const replyOwnerCitizen = await getCitizenByUserId(ctx, reply.userId);

      if (replyOwnerCitizen) {
        if (!wasAlreadyLiked) {
          // Current action: LIKE
          // Reply owner gets +1.
          await awardCitizenPoints(ctx, {
            citizenId: replyOwnerCitizen._id,
            userId: replyOwnerCitizen.userId,
            type: 'comment_liked',
            points: 1,
            reason: 'Public discussion reply liked by another citizen',
            relatedIssueId: publicIssue.issueId,
            relatedCommentId: reply.discussionId,
            relatedReplyId: args.replyId,
            metadata: {
              source: 'public_issue_discussion_reply_liked',
            },
          });

          await checkAndAwardCitizenBadges(ctx, {
            citizenId: replyOwnerCitizen._id,
            userId: replyOwnerCitizen.userId,
            relatedIssueId: publicIssue.issueId,
          });
        } else {
          // Current action: UNLIKE
          // Use manual_adjustment so comment_liked badge/activity counters
          // are not increased again during unlike reversal.
          await awardCitizenPoints(ctx, {
            citizenId: replyOwnerCitizen._id,
            userId: replyOwnerCitizen.userId,
            type: 'manual_adjustment',
            points: -1,
            reason: 'Public discussion reply like removed',
            relatedIssueId: publicIssue.issueId,
            relatedCommentId: reply.discussionId,
            relatedReplyId: args.replyId,
            metadata: {
              source: 'public_issue_discussion_reply_unliked',
            },
          });
        }
      }
    }

    return {
      likeCount: newLikeCount,
      likedBy: newLikedBy,
      action: wasAlreadyLiked ? 'unliked' : 'liked',
    };
  },
});

export const hideDiscussion = mutation({
  args: {
    discussionId: v.id('issueDiscussionForum'),
  },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.discussionId, {
      isHidden: true,
    });

    return true;
  },
});

export const hideReply = mutation({
  args: {
    replyId: v.id('issueDiscussionReplies'),
  },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.replyId, {
      isHidden: true,
    });

    return true;
  },
});
