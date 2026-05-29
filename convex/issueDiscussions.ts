import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

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

    return await ctx.db.insert('issueDiscussionForum', {
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
