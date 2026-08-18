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
    const citizen = await getCitizenByUserId(ctx, args.citizenId);

    if (citizen) {
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
    const citizen = await getCitizenByUserId(ctx, args.userId);

    if (citizen) {
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

    const likedBy = discussion.likedBy || [];
    const isLiked = likedBy.includes(args.userId);

    let newLikedBy;
    let newLikeCount;

    if (isLiked) {
      newLikedBy = likedBy.filter((id) => id !== args.userId);
      newLikeCount = Math.max(0, discussion.likeCount - 1);
    } else {
      newLikedBy = [...likedBy, args.userId];
      newLikeCount = discussion.likeCount + 1;
    }

    await ctx.db.patch(args.discussionId, {
      likedBy: newLikedBy,
      likeCount: newLikeCount,
    });

    // Gamification: Comment Liked Reward / Unlike Reversal
    if (discussion.citizenId !== args.userId) {
      const commentOwnerCitizen = await getCitizenByUserId(ctx, discussion.citizenId);

      if (commentOwnerCitizen) {
        await awardCitizenPoints(ctx, {
          citizenId: commentOwnerCitizen._id,
          userId: commentOwnerCitizen.userId,
          type: 'comment_liked',
          points: isLiked ? -1 : 1,
          reason: isLiked
            ? 'Public discussion comment like removed'
            : 'Public discussion comment liked by another citizen',
          relatedIssueId: publicIssue?.issueId,
          relatedCommentId: args.discussionId,
          metadata: {
            source: isLiked
              ? 'public_issue_discussion_comment_unliked'
              : 'public_issue_discussion_comment_liked',
          },
        });

        await checkAndAwardCitizenBadges(ctx, {
          citizenId: commentOwnerCitizen._id,
          userId: commentOwnerCitizen.userId,
          relatedIssueId: publicIssue?.issueId,
        });
      }
    }

    return { likeCount: newLikeCount, likedBy: newLikedBy };
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

    const likedBy = reply.likedBy || [];
    const isLiked = likedBy.includes(args.userId);

    let newLikedBy;
    let newLikeCount;

    if (isLiked) {
      newLikedBy = likedBy.filter((id) => id !== args.userId);
      newLikeCount = Math.max(0, reply.likeCount - 1);
    } else {
      newLikedBy = [...likedBy, args.userId];
      newLikeCount = reply.likeCount + 1;
    }

    await ctx.db.patch(args.replyId, {
      likedBy: newLikedBy,
      likeCount: newLikeCount,
    });

    return { likeCount: newLikeCount, likedBy: newLikedBy };
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
