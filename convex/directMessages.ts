import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

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
    const currentUO = allUnitOfficers.find(u => u.userId === args.userId);
    if (currentUO) {
      currentUserDept = currentUO.department;
    } else {
      const allFieldOfficers = await ctx.db.query('fieldOfficers').collect();
      const currentFO = allFieldOfficers.find(f => f.userId === args.userId);
      if (currentFO) {
        currentUserDept = currentFO.department;
      }
    }

    // Fetch Admins and City Admins
    const allUsers = await ctx.db.query('users').collect();
    const admins = allUsers.filter(u => u.role === 'admin' || u.role === 'city_admin');
    for (const admin of admins) {
      officials.push({
        id: admin._id,
        name: admin.fullName,
        role: admin.role === 'admin' ? 'Admin' : 'CityAdmin',
        designation: admin.role === 'admin' ? 'Deputy Commissioner' : 'City Administrator',
        department: 'Municipal Corporation',
        city: 'Varanasi', // Fallback or could be fetched if stored in users
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.fullName)}&background=random`,
      });
    }

    // Fetch Unit Officers
    let unitOfficers = await ctx.db.query('unitOfficers').collect();
    if (currentUserDept) {
      unitOfficers = unitOfficers.filter(uo => uo.department === currentUserDept);
    }
    
    for (const uo of unitOfficers) {
      const user = await ctx.db.get(uo.userId);
      if (user) {
        officials.push({
          id: user._id,
          name: uo.fullName,
          role: 'UnitOfficer',
          designation: 'Unit Officer',
          department: uo.department || 'Municipal Corporation',
          city: uo.city,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(uo.fullName)}&background=random`,
        });
      }
    }

    // Fetch Field Officers
    let fieldOfficers = await ctx.db.query('fieldOfficers').collect();
    if (currentUserDept) {
      fieldOfficers = fieldOfficers.filter(fo => fo.department === currentUserDept);
    }
    
    for (const fo of fieldOfficers) {
      const user = await ctx.db.get(fo.userId);
      if (user) {
        officials.push({
          id: user._id,
          name: fo.fullName,
          role: 'FieldOfficer',
          designation: 'Field Officer',
          department: fo.department || 'Municipal Corporation',
          city: fo.city,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fo.fullName)}&background=random`,
        });
      }
    }

    return officials;
  },
});
