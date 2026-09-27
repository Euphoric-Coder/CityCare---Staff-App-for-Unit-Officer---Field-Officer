import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { Id } from './_generated/dataModel';

/**
 * Normalizes department strings for robust comparison across Web & Mobile formats.
 * E.g. "Road & Infrastructure", "road_and_infrastructure", "Road and Infrastructure" -> "road_and_infrastructure"
 */
const normalizeDepartment = (value: unknown): string => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
};

export const startConversation = mutation({
  args: {
    participantIds: v.array(v.id('users')),
    initialMessage: v.string(),

    fromId: v.id('users'),
    fromName: v.string(),
    fromRole: v.string(),

    issueId: v.optional(v.id('issues')),
    issueTitle: v.optional(v.string()),
    issueStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.participantIds || args.participantIds.length < 2) {
      throw new Error('Invalid conversation participants');
    }

    const toId = args.participantIds.find((id) => id !== args.fromId);
    if (!toId) {
      throw new Error('Invalid conversation participants');
    }

    const now = Date.now();

    let issueRef: { issueId: Id<'issues'>; issueTitle: string; status: string } | undefined = undefined;
    if (args.issueId) {
      const issue = await ctx.db.get(args.issueId);
      const title = issue?.title ?? args.issueTitle ?? '';
      const status = issue?.status ?? args.issueStatus ?? 'open';
      if (title && status) {
        issueRef = {
          issueId: args.issueId,
          issueTitle: title,
          status: status,
        };
      }
    }

    const initialUnreadCountMap: Record<string, number> = {
      [args.fromId]: 0,
      [toId]: 1,
    };

    const convId = await ctx.db.insert('conversations', {
      participantIds: args.participantIds,
      lastMessage: args.initialMessage,
      lastMessageTime: now,
      lastMessageSenderId: args.fromId,
      unreadCountMap: initialUnreadCountMap,
      issueRef,
    });

    await ctx.db.insert('messages', {
      conversationId: convId,
      fromId: args.fromId,
      toId,
      message: args.initialMessage,
      createdAt: now,
      read: false,
      fromName: args.fromName,
      fromRole: args.fromRole,
      issueIds: args.issueId ? [args.issueId] : undefined,
    });

    return convId;
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id('conversations'),

    fromId: v.id('users'),
    fromName: v.string(),
    fromRole: v.string(),

    message: v.string(),

    issueIds: v.optional(v.array(v.id('issues'))),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new Error('Conversation not found');

    if (!conv.participantIds.includes(args.fromId)) {
      throw new Error('Sender is not a participant in this conversation');
    }

    const toId = conv.participantIds.find((id) => id !== args.fromId);
    if (!toId) throw new Error('Invalid conversation participants');

    const now = Date.now();

    await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      fromId: args.fromId,
      toId,
      message: args.message,
      createdAt: now,
      read: false,

      fromName: args.fromName,
      fromRole: args.fromRole,

      issueIds: args.issueIds,
    });

    const unreadCountMap = conv.unreadCountMap || {
      [args.fromId]: 0,
      [toId]: 0,
    };

    const updatedUnreadCountMap: Record<string, number> = { ...unreadCountMap };
    updatedUnreadCountMap[toId] = (updatedUnreadCountMap[toId] || 0) + 1;

    await ctx.db.patch(args.conversationId, {
      lastMessage: args.message,
      lastMessageTime: now,
      lastMessageSenderId: args.fromId,
      unreadCountMap: updatedUnreadCountMap,
    });
  },
});

export const updateConversationIssue = mutation({
  args: {
    conversationId: v.id('conversations'),
    issueId: v.optional(v.id('issues')),
    issueTitle: v.optional(v.string()),
    issueStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new Error('Conversation not found');

    if (args.issueId) {
      const issue = await ctx.db.get(args.issueId);
      const title = issue?.title ?? args.issueTitle ?? '';
      const status = issue?.status ?? args.issueStatus ?? 'open';
      if (!title || !status) {
        throw new Error('Missing issue title or status');
      }

      await ctx.db.patch(args.conversationId, {
        issueRef: {
          issueId: args.issueId,
          issueTitle: title,
          status: status,
        },
      });
    } else {
      await ctx.db.patch(args.conversationId, {
        issueRef: undefined,
      });
    }
  },
});

export const getUserConversations = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query('conversations').collect();

    return conversations.filter((c) => c.participantIds.includes(args.userId));
  },
});

export const getMessagesByConversation = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .order('asc')
      .collect();
  },
});

export const markMessagesAsRead = mutation({
  args: {
    conversationId: v.id('conversations'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .collect();

    for (const msg of messages) {
      if (msg.toId === args.userId && !msg.read) {
        await ctx.db.patch(msg._id, { read: true });
      }
    }

    const conv = await ctx.db.get(args.conversationId);
    if (conv) {
      const updatedUnreadCountMap: Record<string, number> = { ...(conv.unreadCountMap || {}) };
      updatedUnreadCountMap[args.userId] = 0;

      await ctx.db.patch(args.conversationId, {
        unreadCountMap: updatedUnreadCountMap,
      });
    }
  },
});

export const getAllOfficials = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const officials: Array<{
      id: Id<'users'>;
      name: string;
      role: string;
      designation: string;
      department: string;
      city?: string;
      avatar: string;
    }> = [];

    // Find if current user is unit/field officer and get their department
    let currentUserDept: string | null = null;

    const currentUO = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
    if (currentUO) {
      currentUserDept = currentUO.department;
    } else {
      const currentFO = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .unique();
      if (currentFO) {
        currentUserDept = currentFO.department;
      }
    }

    // Fetch Admins and City Admins
    const allUsers = await ctx.db.query('users').collect();
    const admins = allUsers.filter((u) => u.role === 'admin' || u.role === 'city_admin');

    const fallbackAvatar =
      process.env.EXPO_PUBLIC_AVATAR ??
      process.env.NEXT_PUBLIC_AVATAR ??
      'https://ik.imagekit.io/o3jhcpnqcj/Patient-Profile-Photo/avatar.png?updatedAt=1758129736253';

    for (const admin of admins) {
      let city = 'Varanasi';
      if (admin.role === 'city_admin') {
        const caProfile = await ctx.db
          .query('cityAdmins')
          .withIndex('by_user', (q) => q.eq('userId', admin._id))
          .unique();
        if (caProfile) {
          city = caProfile.city;
        }
      }

      officials.push({
        id: admin._id,
        name: admin.fullName,
        role: admin.role === 'admin' ? 'Admin' : 'CityAdmin',
        designation: admin.role === 'admin' ? 'Deputy Commissioner' : 'City Administrator',
        department: 'Municipal Corporation',
        city: admin.role === 'admin' ? undefined : city,
        avatar: fallbackAvatar,
      });
    }

    // Fetch Unit Officers
    let unitOfficers = await ctx.db.query('unitOfficers').collect();
    if (currentUserDept) {
      const normalizedUserDept = normalizeDepartment(currentUserDept);
      unitOfficers = unitOfficers.filter(
        (uo) => normalizeDepartment(uo.department) === normalizedUserDept
      );
    }

    for (const uo of unitOfficers) {
      const user = await ctx.db.get(uo.userId);
      if (user) {
        let avatarUrl = fallbackAvatar;
        if (uo.profilePicture) {
          const url = await ctx.storage.getUrl(uo.profilePicture);
          if (url) avatarUrl = url;
        }

        officials.push({
          id: user._id,
          name: uo.fullName,
          role: 'UnitOfficer',
          designation: 'Unit Officer',
          department: uo.department || 'Municipal Corporation',
          city: uo.city,
          avatar: avatarUrl,
        });
      }
    }

    // Fetch Field Officers
    let fieldOfficers = await ctx.db.query('fieldOfficers').collect();
    if (currentUserDept) {
      const normalizedUserDept = normalizeDepartment(currentUserDept);
      fieldOfficers = fieldOfficers.filter(
        (fo) => normalizeDepartment(fo.department) === normalizedUserDept
      );
    }

    for (const fo of fieldOfficers) {
      const user = await ctx.db.get(fo.userId);
      if (user) {
        let avatarUrl = fallbackAvatar;
        if (fo.profilePicture) {
          const url = await ctx.storage.getUrl(fo.profilePicture);
          if (url) avatarUrl = url;
        }

        officials.push({
          id: user._id,
          name: fo.fullName,
          role: 'FieldOfficer',
          designation: 'Field Officer',
          department: fo.department || 'Municipal Corporation',
          city: fo.city,
          avatar: avatarUrl,
        });
      }
    }

    return officials;
  },
});

export const sendMessageToUser = mutation({
  args: {
    fromId: v.id('users'),
    fromName: v.string(),
    fromRole: v.string(),
    toId: v.id('users'),
    message: v.string(),
    issueIds: v.optional(v.array(v.id('issues'))),
  },
  handler: async (ctx, args) => {
    if (args.fromId === args.toId) {
      throw new Error('Cannot send direct message to oneself');
    }

    const conversations = await ctx.db.query('conversations').collect();
    const existing = conversations.find(
      (c) => c.participantIds.includes(args.fromId) && c.participantIds.includes(args.toId)
    );

    const now = Date.now();

    if (existing) {
      await ctx.db.insert('messages', {
        conversationId: existing._id,
        fromId: args.fromId,
        toId: args.toId,
        message: args.message,
        createdAt: now,
        read: false,
        fromName: args.fromName,
        fromRole: args.fromRole,
        issueIds: args.issueIds,
      });

      const unreadCountMap = existing.unreadCountMap || {};
      const updatedUnreadCountMap: Record<string, number> = { ...unreadCountMap };
      updatedUnreadCountMap[args.toId] = (updatedUnreadCountMap[args.toId] || 0) + 1;

      await ctx.db.patch(existing._id, {
        lastMessage: args.message,
        lastMessageTime: now,
        lastMessageSenderId: args.fromId,
        unreadCountMap: updatedUnreadCountMap,
      });
      return existing._id;
    } else {
      const toUser = await ctx.db.get(args.toId);
      if (!toUser) throw new Error('Recipient user not found');

      let issueRef: { issueId: Id<'issues'>; issueTitle: string; status: string } | undefined = undefined;
      if (args.issueIds && args.issueIds.length > 0) {
        const issue = await ctx.db.get(args.issueIds[0]);
        if (issue) {
          issueRef = {
            issueId: issue._id,
            issueTitle: issue.title,
            status: issue.status,
          };
        }
      }

      const initialUnreadCountMap: Record<string, number> = {
        [args.fromId]: 0,
        [args.toId]: 1,
      };

      const convId = await ctx.db.insert('conversations', {
        participantIds: [args.fromId, args.toId],
        lastMessage: args.message,
        lastMessageTime: now,
        lastMessageSenderId: args.fromId,
        unreadCountMap: initialUnreadCountMap,
        issueRef,
      });

      await ctx.db.insert('messages', {
        conversationId: convId,
        fromId: args.fromId,
        toId: args.toId,
        message: args.message,
        createdAt: now,
        read: false,
        fromName: args.fromName,
        fromRole: args.fromRole,
        issueIds: args.issueIds,
      });

      return convId;
    }
  },
});

export const getLinkableIssues = query({
  args: {
    userId: v.id('users'),
    otherUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    let targetDept: string | null = null;
    let targetCity: string | null = null;

    // Check if current user is unit/field officer and get their department & city
    const uoSelf = await ctx.db
      .query('unitOfficers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
    if (uoSelf) {
      targetDept = uoSelf.department;
      targetCity = uoSelf.city;
    } else {
      const foSelf = await ctx.db
        .query('fieldOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .unique();
      if (foSelf) {
        targetDept = foSelf.department;
        targetCity = foSelf.city;
      }
    }

    // If otherUserId is provided, check if other user is unit/field officer
    if (args.otherUserId) {
      const uoOther = await ctx.db
        .query('unitOfficers')
        .withIndex('by_user', (q) => q.eq('userId', args.otherUserId as Id<'users'>))
        .unique();
      if (uoOther) {
        targetDept = uoOther.department;
        targetCity = uoOther.city;
      } else {
        const foOther = await ctx.db
          .query('fieldOfficers')
          .withIndex('by_user', (q) => q.eq('userId', args.otherUserId as Id<'users'>))
          .unique();
        if (foOther) {
          targetDept = foOther.department;
          targetCity = foOther.city;
        }
      }
    }

    const allIssues = await ctx.db.query('issues').collect();

    let issues = allIssues;

    // If not admin/city_admin, restrict to assigned issues
    if (user.role !== 'admin' && user.role !== 'city_admin') {
      issues = issues.filter(
        (issue) =>
          issue.assignedUnitOfficer === args.userId || issue.assignedFieldOfficer === args.userId
      );
    }

    const categoryMatchesDepartment = (category?: string, department?: string): boolean => {
      if (!category || !department) return false;
      const normCat = normalizeDepartment(category);
      const normDept = normalizeDepartment(department);

      const catLower = category.toLowerCase().trim();
      const deptLower = department.toLowerCase().trim();

      if (normCat === 'road' && (deptLower.includes('road') || deptLower.includes('infra'))) return true;
      if (
        normCat === 'electricity' &&
        (deptLower.includes('electri') || deptLower.includes('light') || deptLower.includes('power'))
      )
        return true;
      if (normCat === 'water' && deptLower.includes('water')) return true;
      if (normCat === 'sanitation' && (deptLower.includes('sanitation') || deptLower.includes('clean')))
        return true;
      if (normCat === 'drainage' && (deptLower.includes('drain') || deptLower.includes('sewer'))) return true;
      if (normCat === 'solid_waste' && (deptLower.includes('solid') || deptLower.includes('waste'))) return true;
      if (normCat === 'public_health' && (deptLower.includes('health') || deptLower.includes('medical')))
        return true;
      if (normCat === 'other') return true;

      return normCat.includes(normDept) || normDept.includes(normCat) || catLower.includes(deptLower) || deptLower.includes(catLower);
    };

    if (targetDept) {
      issues = issues.filter((issue) => categoryMatchesDepartment(issue.category, targetDept ?? undefined));
    }

    if (targetCity) {
      issues = issues.filter(
        (issue) => (issue.city || '').toLowerCase().trim() === targetCity!.toLowerCase().trim()
      );
    }

    return issues.map((issue) => ({
      id: issue._id,
      ticket: issue.issueCode,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      severity: issue.priority,
      category: issue.category,
    }));
  },
});
