import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { Id } from './_generated/dataModel';

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
    const now = Date.now();

    const toId = args.participantIds.find((id) => id !== args.fromId)!;

    const convId = await ctx.db.insert('conversations', {
      participantIds: args.participantIds,
      lastMessage: args.initialMessage,
      lastMessageTime: now,
      lastMessageSenderId: args.fromId,
      unreadCountMap: {
        [args.fromId]: 0,
        [toId]: 1,
      },

      issueRef: args.issueId
        ? {
            issueId: args.issueId,
            issueTitle: args.issueTitle!,
            status: args.issueStatus!,
          }
        : undefined,
    });

    await ctx.db.insert('messages', {
      conversationId: convId,
      fromId: args.fromId,
      toId: args.participantIds.find((id) => id !== args.fromId)!,
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

    const toId = conv.participantIds.find((id) => id !== args.fromId);
    if (!toId) throw new Error('Invalid conversation');

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

    // Create a new object to satisfy Convex schema constraints for record
    const updatedUnreadCountMap = { ...unreadCountMap };
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
    if (args.issueId) {
      await ctx.db.patch(args.conversationId, {
        issueRef: {
          issueId: args.issueId,
          issueTitle: args.issueTitle!,
          status: args.issueStatus!,
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

    let updated = false;
    for (const msg of messages) {
      if (msg.toId === args.userId && !msg.read) {
        await ctx.db.patch(msg._id, { read: true });
        updated = true;
      }
    }

    const conv = await ctx.db.get(args.conversationId);
    if (conv) {
      const updatedUnreadCountMap = { ...(conv.unreadCountMap || {}) };
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
    const officials = [];

    // Find if current user is unit/field officer and get their department
    let currentUserDept = null;

    // We don't have 'by_user' index defined for unitOfficers/fieldOfficers in the provided schema snippet maybe?
    // Let's just collect all and find, or use filter.
    const allUnitOfficers = await ctx.db.query('unitOfficers').collect();
    const currentUO = allUnitOfficers.find((u) => u.userId === args.userId);
    if (currentUO) {
      currentUserDept = currentUO.department;
    } else {
      const allFieldOfficers = await ctx.db.query('fieldOfficers').collect();
      const currentFO = allFieldOfficers.find((f) => f.userId === args.userId);
      if (currentFO) {
        currentUserDept = currentFO.department;
      }
    }

    // Fetch Admins and City Admins
    const allUsers = await ctx.db.query('users').collect();
    const admins = allUsers.filter((u) => u.role === 'admin' || u.role === 'city_admin');

    const fallbackAvatar =
      process.env.EXPO_PUBLIC_AVATAR ||
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
      unitOfficers = unitOfficers.filter((uo) => uo.department === currentUserDept);
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
      fieldOfficers = fieldOfficers.filter((fo) => fo.department === currentUserDept);
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
      const updatedUnreadCountMap = { ...unreadCountMap };
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

      let issueRef = undefined;
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

      const convId = await ctx.db.insert('conversations', {
        participantIds: [args.fromId, args.toId],
        lastMessage: args.message,
        lastMessageTime: now,
        lastMessageSenderId: args.fromId,
        // @ts-ignore
        unreadCountMap: {
          [args.fromId]: { ...{} },
        },
        issueRef,
      });

      // Convex records don't allow general dynamic keys in records without explicit definition,
      // but let's look at schema.js for conversations:
      // unreadCountMap: v.optional(v.record(v.id("users"), v.number()))
      // record(keys, values) means we can set it:
      const initialUnreadMap = {};
      // @ts-ignore
      initialUnreadMap[args.fromId] = 0;
      // @ts-ignore
      initialUnreadMap[args.toId] = 1;

      await ctx.db.patch(convId, {
        unreadCountMap: initialUnreadMap as any,
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

    let targetDept = null;
    let targetCity = null;

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

    // Map priority/severity and filter based on category & city if targetDept/targetCity exist
    let issues = allIssues;

    // If not admin/city_admin, restrict to assigned issues
    if (user.role !== 'admin' && user.role !== 'city_admin') {
      issues = issues.filter(
        (issue) =>
          issue.assignedUnitOfficer === args.userId || issue.assignedFieldOfficer === args.userId
      );
    }

    const categoryMatchesDepartment = (category: string, department: string) => {
      if (!category || !department) return false;
      const cat = category.toLowerCase().trim();
      const dept = department.toLowerCase().trim();

      if (cat === 'road' && (dept.includes('road') || dept.includes('infra'))) return true;
      if (
        cat === 'electricity' &&
        (dept.includes('electri') || dept.includes('light') || dept.includes('power'))
      )
        return true;
      if (cat === 'water' && dept.includes('water')) return true;
      if (cat === 'sanitation' && (dept.includes('sanitation') || dept.includes('clean')))
        return true;
      if (cat === 'drainage' && (dept.includes('drain') || dept.includes('sewer'))) return true;
      if (cat === 'solid_waste' && (dept.includes('solid') || dept.includes('waste'))) return true;
      if (cat === 'public_health' && (dept.includes('health') || dept.includes('medical')))
        return true;
      if (cat === 'other') return true;

      return cat.includes(dept) || dept.includes(cat);
    };

    if (targetDept) {
      issues = issues.filter((issue) => categoryMatchesDepartment(issue.category, targetDept));
    }

    if (targetCity) {
      issues = issues.filter(
        (issue) => (issue.city || '').toLowerCase().trim() === targetCity.toLowerCase().trim()
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
