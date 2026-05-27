import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  MessageSquare,
  Send,
  ArrowLeft,
  Plus,
  CheckCheck,
  Check,
  Tag,
  Users,
  X,
  MapPin,
  Zap,
  Droplets,
  Trash2,
  Recycle,
  Package,
  HeartPulse,
  MoreHorizontal,
  Briefcase,
} from 'lucide-react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { DirectConversation, DirectMessage, OfficialUser, Issue } from 'lib/types';
import IssueRefModal from './IssueRefModal';
import IssuePickerSheet from './IssuePickerSheet';
import OfficialProfileScreen from './OfficialProfileScreen';
import { useUser } from 'context/UserContext';
import { Id } from 'convex/_generated/dataModel';

type Screen = 'list' | 'chat' | 'new' | 'profile';

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; bgClass: string; textClass: string }
> = {
  Admin: {
    label: 'Admin',
    color: '#DC2626',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
  },
  CityAdmin: {
    label: 'City Admin',
    color: '#7C3AED',
    bgClass: 'bg-violet-100 dark:bg-violet-900/30',
    textClass: 'text-violet-700 dark:text-violet-400',
  },
  UnitOfficer: {
    label: 'Unit Officer',
    color: '#0284C7',
    bgClass: 'bg-sky-100 dark:bg-sky-900/30',
    textClass: 'text-sky-700 dark:text-sky-400',
  },
  FieldOfficer: {
    label: 'Field Officer',
    color: '#059669',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
};

const DEPARTMENT_CATEGORIES = [
  {
    value: 'road',
    label: 'Road & Infrastructure',
    icon: MapPin,
    color: 'text-blue-600 dark:text-blue-400',
    iconColor: '#3B82F6',
  },
  {
    value: 'electricity',
    label: 'Electricity & Lighting',
    icon: Zap,
    color: 'text-yellow-600 dark:text-yellow-400',
    iconColor: '#EAB308',
  },
  {
    value: 'water',
    label: 'Water Supply',
    icon: Droplets,
    color: 'text-cyan-600 dark:text-cyan-400',
    iconColor: '#06B6D4',
  },
  {
    value: 'sanitation',
    label: 'Sanitation & Waste',
    icon: Trash2,
    color: 'text-green-600 dark:text-green-400',
    iconColor: '#22C55E',
  },
  {
    value: 'drainage',
    label: 'Drainage & Sewer',
    icon: Recycle,
    color: 'text-purple-600 dark:text-purple-400',
    iconColor: '#A855F7',
  },
  {
    value: 'solid_waste',
    label: 'Solid Waste Management',
    icon: Package,
    color: 'text-orange-600 dark:text-orange-400',
    iconColor: '#F97316',
  },
  {
    value: 'public_health',
    label: 'Public Health',
    icon: HeartPulse,
    color: 'text-red-600 dark:text-red-400',
    iconColor: '#EF4444',
  },
  {
    value: 'other',
    label: 'Other',
    icon: MoreHorizontal,
    color: 'text-slate-600 dark:text-slate-400',
    iconColor: '#64748B',
  },
];

const getCategoryForDept = (dept: string) => {
  if (!dept) return DEPARTMENT_CATEGORIES[7];
  const d = dept.toLowerCase();
  if (d.includes('road') || d.includes('infra')) return DEPARTMENT_CATEGORIES[0];
  if (d.includes('electri') || d.includes('light') || d.includes('power'))
    return DEPARTMENT_CATEGORIES[1];
  if (d.includes('water')) return DEPARTMENT_CATEGORIES[2];
  if (d.includes('sanitation') || d.includes('clean')) return DEPARTMENT_CATEGORIES[3];
  if (d.includes('drain') || d.includes('sewer')) return DEPARTMENT_CATEGORIES[4];
  if (d.includes('solid') || d.includes('waste')) return DEPARTMENT_CATEGORIES[5];
  if (d.includes('health') || d.includes('medical')) return DEPARTMENT_CATEGORIES[6];
  return DEPARTMENT_CATEGORIES[7];
};

const STATUS_COLORS: Record<string, string> = {
  'Pending UO Verification': '#8B5CF6',
  'Rework Required': '#EF4444',
  'In Progress': '#F59E0B',
  Assigned: '#3B82F6',
  Closed: '#22C55E',
  Escalated: '#F97316',
  Pending: '#F59E0B',
  Verified: '#3B82F6',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatChatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function AvatarWithStatus({ uri, size = 48 }: { uri: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E2E8F0' }}
      />
    </View>
  );
}

function IssueChip({
  issueId,
  issueTitle,
  onPress,
  isOwn = false,
}: {
  issueId: string;
  issueTitle: string;
  onPress: () => void;
  isOwn?: boolean;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={isOwn ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 } : {}}
      className={`mb-1.5 self-start flex-row items-center gap-2 rounded-[16px] px-3.5 py-2 border ${
        isOwn 
          ? 'bg-white border-white dark:bg-slate-900/60 dark:border-slate-800/80' 
          : 'bg-teal-50/80 border-teal-200/60 dark:bg-slate-900/50 dark:border-slate-700/60'
      }`}>
      <View 
        style={!isOwn ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 } : {}}
        className={`h-6 w-6 items-center justify-center rounded-full ${
          isOwn 
            ? 'bg-teal-100 dark:bg-teal-500/20' 
            : 'bg-white border border-slate-100 dark:bg-slate-800 dark:border-slate-700'
        }`}>
        <Tag size={12} color={(isOwn && isDark) ? '#2DD4BF' : '#0F766E'} strokeWidth={2.5} />
      </View>
      <Text className={`text-[10px] font-black uppercase tracking-widest shrink ${isOwn ? 'text-[#0F766E] dark:text-teal-300' : 'text-[#0F766E] dark:text-teal-400'}`} numberOfLines={1}>
        {issueTitle}
      </Text>
    </TouchableOpacity>
  );
}

export default function MessagesTab() {
  const user = useUser();
  const CURRENT_USER_ID = user?.id as string;
  const [screen, setScreen] = useState<Screen>('list');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newSearchQuery, setNewSearchQuery] = useState('');
  const [issueRefModalId, setIssueRefModalId] = useState<string | null>(null);
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'message' | 'conversation'>('message');
  const [pendingIssueRef, setPendingIssueRef] = useState<Issue | null>(null);
  const [profileOfficial, setProfileOfficial] = useState<OfficialUser | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const rawConvs =
    useQuery(api.directMessages.getUserConversations, { userId: CURRENT_USER_ID as any }) || [];
  const rawMessages =
    useQuery(
      api.directMessages.getMessagesByConversation,
      selectedConvId ? { conversationId: selectedConvId as any } : 'skip'
    ) || [];

  const startConversation = useMutation(api.directMessages.startConversation);
  const sendMessageMutation = useMutation(api.directMessages.sendMessage);
  const markMessagesAsRead = useMutation(api.directMessages.markMessagesAsRead);
  const updateConversationIssue = useMutation(api.directMessages.updateConversationIssue);

  const rawOfficials =
    useQuery(api.directMessages.getAllOfficials, { userId: CURRENT_USER_ID as any }) || [];

  const conversations = rawConvs.map((conv) => {
    const otherUser = rawOfficials.find(
      (o) => o.id !== CURRENT_USER_ID && conv.participantIds.includes(o.id)
    );
    return {
      ...conv,
      id: conv._id as string,
      otherUser,
      unreadCount: conv.unreadCountMap ? (conv.unreadCountMap as any)[CURRENT_USER_ID] || 0 : 0,
      lastMessage: conv.lastMessage || '',
      lastMessageTime: conv.lastMessageTime
        ? new Date(conv.lastMessageTime).toISOString()
        : new Date().toISOString(),
    };
  });

  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      conv.otherUser?.name.toLowerCase().includes(q) ||
      conv.issueRef?.issueTitle.toLowerCase().includes(q) ||
      conv.lastMessage.toLowerCase().includes(q)
    );
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const chatMessages = rawMessages.map((m) => ({
    id: m._id,
    conversationId: m.conversationId,
    fromUserId: m.fromId,
    fromUserName: m.fromName,
    fromRole: m.fromRole,
    text: m.message,
    timestamp: new Date(m.createdAt).toISOString(),
    read: m.read,
    issueRef:
      m.issueIds && m.issueIds.length > 0
        ? { issueId: m.issueIds[0], issueTitle: 'Referenced Issue' }
        : undefined,
  }));

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const otherOfficials = rawOfficials.filter(
    (o) => o.id !== CURRENT_USER_ID && !rawConvs.some((c) => c.participantIds.includes(o.id))
  );
  const filteredNewOfficials = otherOfficials.filter(
    (o) =>
      !newSearchQuery ||
      o.name.toLowerCase().includes(newSearchQuery.toLowerCase()) ||
      o.designation.toLowerCase().includes(newSearchQuery.toLowerCase()) ||
      o.department.toLowerCase().includes(newSearchQuery.toLowerCase())
  );

  const handleSend = async () => {
    if (!messageText.trim() || !selectedConvId) return;

    await sendMessageMutation({
      conversationId: selectedConvId as any,
      fromId: CURRENT_USER_ID as any,
      fromName: user?.name as string,
      fromRole: user?.role as string,
      message: messageText.trim(),
      issueIds: pendingIssueRef ? [pendingIssueRef._id as any] : undefined,
    });

    setMessageText('');
    setPendingIssueRef(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const handleStartConversation = async (
    official: OfficialUser,
    message: string,
    issueRef?: Issue
  ) => {
    const convId = await startConversation({
      participantIds: [CURRENT_USER_ID as any, official.id as any],
      initialMessage: message,
      fromId: CURRENT_USER_ID as any,
      fromName: user?.name as string,
      fromRole: user?.role as string,
      issueId: issueRef ? (issueRef._id as Id<'issues'>) : undefined,
      issueTitle: issueRef ? issueRef.title : undefined,
      issueStatus: issueRef ? issueRef.status : undefined,
    });

    setSelectedConvId(convId);
    setProfileOfficial(null);
    setScreen('chat');
  };

  useEffect(() => {
    if (screen === 'chat' && selectedConvId) {
      markMessagesAsRead({ conversationId: selectedConvId as any, userId: CURRENT_USER_ID as any });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [screen, selectedConvId, rawMessages.length]);

  if (screen === 'profile' && profileOfficial) {
    return (
      <OfficialProfileScreen
        official={profileOfficial}
        onBack={() => setScreen('new')}
        onStartConversation={handleStartConversation}
      />
    );
  }

  if (screen === 'new') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
        {/* Advanced Header */}
        <View className="px-5 pb-4 pt-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 z-10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => setScreen('list')}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              activeOpacity={0.7}>
              <ArrowLeft size={20} color="#64748B" strokeWidth={2.5} />
            </TouchableOpacity>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/20">
              <Plus size={20} color="#0F766E" strokeWidth={2.5} />
            </View>
          </View>
          <Text className="text-[28px] font-black tracking-tight text-slate-800 dark:text-slate-100">
            New Message
          </Text>
          <Text className="text-[14px] font-medium text-slate-500 dark:text-slate-400 mt-1">
            Find an official to start a secure conversation.
          </Text>
        </View>

        {/* Elevated Search Bar */}
        <View className="px-5 pt-5 pb-1">
          <View 
            style={{ shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 }}
            className="flex-row items-center gap-3 rounded-[20px] bg-white px-4 py-3.5 border border-slate-100 dark:border-slate-800 dark:bg-slate-900/80">
            <Search size={18} color="#94A3B8" strokeWidth={2.5} />
            <TextInput
              className="flex-1 text-[15px] font-bold text-slate-800 dark:text-slate-200 p-0"
              placeholder="Search by name, dept..."
              placeholderTextColor="#94A3B8"
              value={newSearchQuery}
              onChangeText={setNewSearchQuery}
            />
            {newSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setNewSearchQuery('')} activeOpacity={0.7} className="h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <X size={12} color="#64748B" strokeWidth={3} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          className="mt-2 flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}>
          {Object.entries(
            filteredNewOfficials.reduce<Record<string, OfficialUser[]>>((acc, o) => {
              let g = 'Field Officers';
              if (o.role === 'Admin' || o.role === 'CityAdmin') g = 'Administration';
              else if (o.role === 'UnitOfficer') g = 'Unit Officers';
              
              if (!acc[g]) acc[g] = [];
              acc[g].push(o);
              return acc;
            }, {})
          ).map(([group, officials]) => (
            <View key={group} className="mt-6">
              <Text className="mb-3 ml-2 text-[11px] font-black uppercase tracking-widest text-[#0F766E] dark:text-teal-400">
                {group}
              </Text>
              <View className="gap-3">
                {officials.map((official) => {
                  const roleCfg = ROLE_CONFIG[official.role] ?? ROLE_CONFIG.FieldOfficer;
                  const deptCat = getCategoryForDept(official.department);
                  const DeptIcon = deptCat.icon;
                  return (
                    <TouchableOpacity
                      key={official.id}
                      className="flex-row items-center gap-4 rounded-[24px] border border-slate-100 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900/80"
                      style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                      activeOpacity={0.75}
                      onPress={() => {
                        setProfileOfficial(official);
                        setScreen('profile');
                      }}>
                      <AvatarWithStatus uri={official.avatar} size={52} />
                      <View className="flex-1 justify-center gap-1">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[16px] font-black text-slate-800 dark:text-slate-100 flex-1 mr-2" numberOfLines={1}>
                            {official.name}
                          </Text>
                          <View className={`rounded-xl px-2.5 py-1 border ${roleCfg.bgClass.replace('bg-', 'border-').replace('/30', '/50')} ${roleCfg.bgClass}`}>
                            <Text className={`text-[9px] font-black uppercase tracking-widest ${roleCfg.textClass}`}>
                              {roleCfg.label}
                            </Text>
                          </View>
                        </View>
                        
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <View className={`h-6 w-6 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50`}>
                            <DeptIcon size={11} color={deptCat.iconColor} />
                          </View>
                          <Text className={`text-[12px] font-bold ${deptCat.color} flex-1`} numberOfLines={1}>
                            {deptCat.label}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {filteredNewOfficials.length === 0 && (
            <View className="items-center justify-center gap-3 py-20">
              <View className="h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Users size={40} color="#CBD5E1" strokeWidth={1.5} />
              </View>
              <Text className="text-[18px] font-black tracking-tight text-slate-800 dark:text-slate-200">
                No officials found
              </Text>
              <Text className="px-8 text-center text-[14px] font-medium text-slate-500 dark:text-slate-400">
                Try searching for a different name or department.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'chat' && selectedConv) {
    const other = selectedConv.otherUser;
    const roleCfg = other
      ? (ROLE_CONFIG[other.role] ?? ROLE_CONFIG.FieldOfficer)
      : ROLE_CONFIG.FieldOfficer;

    const deptCat = other ? getCategoryForDept(other.department) : DEPARTMENT_CATEGORIES[7];
    const DeptIcon = deptCat.icon;

    return (
      <SafeAreaView className="flex-1 bg-[#0F766E] dark:bg-slate-900" edges={['top']}>
        {/* Header Background */}
        <View 
          style={{ shadowColor: '#134e4a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 }}
          className="absolute top-0 left-0 right-0 h-40 bg-[#0F766E] z-0 overflow-hidden">
           <View className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-teal-400/20" />
           <View className="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-teal-900/30" />
        </View>

        <View className="flex-row items-center gap-4 px-5 py-4 z-10">
          <TouchableOpacity
            onPress={() => setScreen('list')}
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30"
            activeOpacity={0.7}>
            <ArrowLeft size={20} color="#FFFFFF" strokeWidth={3} />
          </TouchableOpacity>

          {other && (
            <View className="flex-1 flex-row items-center gap-3">
              <View style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }} className="rounded-full border border-white/20">
                <AvatarWithStatus uri={other.avatar} size={46} />
              </View>
              <View className="flex-1 justify-center">
                <Text
                  className="text-[18px] font-black tracking-tight text-white"
                  style={{ textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}
                  numberOfLines={1}>
                  {other.name}
                </Text>
                <View className="mt-1 gap-1">
                  <View className="flex-row items-center gap-1.5 opacity-90">
                    <DeptIcon size={12} color="#ccfbf1" />
                    <Text className="text-[11px] font-bold text-teal-50 uppercase tracking-widest" numberOfLines={1}>
                      {deptCat.label}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5 opacity-90">
                    <Briefcase size={11} color="#5eead4" strokeWidth={2.5} />
                    <Text className="text-[10px] font-extrabold text-teal-200 uppercase tracking-wider" numberOfLines={1}>
                      {roleCfg.label}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        <View className="flex-1 bg-slate-50 dark:bg-slate-950 mt-2 rounded-t-[32px] overflow-hidden z-10">
          {/* Issue Banner as a floating pill inside the chat area */}
          <View className="px-5 pt-5 pb-2 z-20">
            {selectedConv.issueRef ? (
              <View 
                style={{
                  backgroundColor: (STATUS_COLORS[selectedConv.issueRef.status] ?? '#0F766E') + '15',
                  borderColor: (STATUS_COLORS[selectedConv.issueRef.status] ?? '#0F766E') + '30',
                }}
                className="flex-row items-center rounded-2xl border px-3.5 py-3">
                <TouchableOpacity 
                  onPress={() => setIssueRefModalId(selectedConv.issueRef!.issueId)}
                  activeOpacity={0.7}
                  className="flex-1 flex-row items-center gap-3">
                  <View style={{ backgroundColor: STATUS_COLORS[selectedConv.issueRef.status] ?? '#0F766E' }} className="h-9 w-9 items-center justify-center rounded-full">
                    <Tag size={16} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text
                      style={{ color: STATUS_COLORS[selectedConv.issueRef.status] ?? '#0F766E' }}
                      className="text-[13px] font-extrabold tracking-tight"
                      numberOfLines={1}>
                      {selectedConv.issueRef.issueTitle}
                    </Text>
                    <Text style={{ color: STATUS_COLORS[selectedConv.issueRef.status] ?? '#0F766E' }} className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-0.5">
                      {selectedConv.issueRef.status}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setPickerMode('conversation');
                    setShowIssuePicker(true);
                  }}
                  activeOpacity={0.7}
                  style={{ backgroundColor: (STATUS_COLORS[selectedConv.issueRef.status] ?? '#0F766E') + '20' }}
                  className="ml-2 items-center justify-center rounded-full px-4 py-2">
                  <Text style={{ color: STATUS_COLORS[selectedConv.issueRef.status] ?? '#0F766E' }} className="text-[11px] font-black uppercase tracking-wider">Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Tag size={16} color="#94A3B8" strokeWidth={2.5} />
                  </View>
                  <Text className="text-[13px] font-bold text-slate-500 dark:text-slate-400">No linked context</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setPickerMode('conversation');
                    setShowIssuePicker(true);
                  }}
                  activeOpacity={0.7}
                  className="items-center justify-center rounded-full bg-[#0F766E] px-5 py-2.5">
                  <Text className="text-[11px] font-black text-white uppercase tracking-wider">Link Issue</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              ref={scrollRef}
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 10 }}
              showsVerticalScrollIndicator={false}>
              {chatMessages.map((msg, index) => {
                const isOwn = msg.fromUserId === CURRENT_USER_ID;
                const showDate =
                  index === 0 ||
                  new Date(msg.timestamp).toDateString() !==
                    new Date(chatMessages[index - 1].timestamp).toDateString();
                
                const isNextOwn = index < chatMessages.length - 1 && chatMessages[index + 1].fromUserId === CURRENT_USER_ID;
                const showAvatar = !isOwn && (!isNextOwn || chatMessages[index + 1].fromUserId !== msg.fromUserId);

                return (
                  <View key={msg.id}>
                    {showDate && (
                      <View className="my-6 flex-row items-center justify-center">
                        <View className="rounded-full bg-slate-200/80 px-4 py-1.5 dark:bg-slate-800/80">
                          <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-widest dark:text-slate-400">
                            {new Date(msg.timestamp).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View
                      className={`mb-2 flex-row items-end gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && other ? (
                        showAvatar ? (
                          <Image
                            source={{ uri: other.avatar }}
                            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, backgroundColor: '#E2E8F0' }}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <View className="w-8" />
                        )
                      ) : null}

                      <View
                        style={{ maxWidth: '75%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                        className={`gap-1.5 px-4 py-3 ${
                          isOwn
                            ? 'bg-[#0F766E] rounded-[22px] rounded-br-[8px]'
                            : 'bg-white dark:bg-slate-800 rounded-[22px] rounded-bl-[8px] border border-slate-100 dark:border-slate-700'
                        }`}>
                        {msg.issueRef && (
                          <View className="mb-0.5">
                            <IssueChip
                              issueId={msg.issueRef.issueId}
                              issueTitle={msg.issueRef.issueTitle}
                              isOwn={isOwn}
                              onPress={() => setIssueRefModalId(msg.issueRef!.issueId)}
                            />
                          </View>
                        )}
                        <Text
                          className={`text-[15px] font-medium leading-[22px] tracking-tight ${isOwn ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                          {msg.text}
                        </Text>
                        
                        <View className="flex-row items-center justify-end gap-1.5 mt-0.5">
                          <Text
                            className={`text-[10px] font-bold tracking-wide ${isOwn ? 'text-teal-200' : 'text-slate-400 dark:text-slate-500'}`}>
                            {formatChatTime(msg.timestamp)}
                          </Text>
                          {isOwn &&
                            (msg.read ? (
                              <CheckCheck size={14} color="#FBBF24" strokeWidth={3} />
                            ) : (
                              <Check size={14} color="#99F6E4" strokeWidth={3} />
                            ))}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View className="px-5 pb-6 pt-2 bg-slate-50 dark:bg-slate-950">
              {pendingIssueRef && (
                <View 
                  style={{ shadowColor: '#e0f2fe', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 }}
                  className="mb-3 flex-row items-center gap-3 rounded-2xl border border-sky-200/60 bg-white px-4 py-3 dark:border-sky-800 dark:bg-slate-900">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900">
                    <Tag size={14} color="#0891B2" strokeWidth={2.5} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] font-extrabold text-sky-700 uppercase tracking-widest dark:text-sky-300">
                      Linking {pendingIssueRef.id}
                    </Text>
                    <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mt-0.5" numberOfLines={1}>
                      {pendingIssueRef.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setPendingIssueRef(null)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                    activeOpacity={0.7}>
                    <X size={14} color="#64748B" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              )}

              <View className="flex-row items-end gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setPickerMode('message');
                    setShowIssuePicker(true);
                  }}
                  style={{ shadowColor: '#e2e8f0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2 }}
                  className="mb-1 h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900"
                  activeOpacity={0.7}>
                  <Tag size={20} color="#0F766E" strokeWidth={2.5} />
                </TouchableOpacity>

                <View 
                  style={{ shadowColor: '#e2e8f0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2 }}
                  className="flex-1 flex-row items-end rounded-[28px] border-[1.5px] border-slate-200 bg-white pl-5 pr-2 py-2 dark:border-slate-700 dark:bg-slate-900">
                  <TextInput
                    className="max-h-28 flex-1 text-[15px] font-medium text-slate-800 dark:text-slate-200 pt-2.5 pb-2.5"
                    placeholder="Type a message..."
                    placeholderTextColor="#94A3B8"
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                  />
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={!messageText.trim()}
                    activeOpacity={0.8}
                    style={messageText.trim() ? { shadowColor: '#0f766e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 } : {}}
                    className={`ml-2 h-10 w-10 items-center justify-center rounded-full ${messageText.trim() ? 'bg-[#0F766E]' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Send
                      size={18}
                      color={messageText.trim() ? '#FFFFFF' : '#94A3B8'}
                      strokeWidth={2.5}
                      style={{ marginLeft: 2 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>

        <IssueRefModal issueId={issueRefModalId} onClose={() => setIssueRefModalId(null)} />
        <IssuePickerSheet
          visible={showIssuePicker}
          onClose={() => setShowIssuePicker(false)}
          onSelect={(issue) => {
            if (pickerMode === 'conversation' && selectedConvId) {
              updateConversationIssue({
                conversationId: selectedConvId as any,
                issueId: issue._id as any,
                issueTitle: issue.title,
                issueStatus: issue.status,
              });
            } else {
              setPendingIssueRef(issue);
            }
            setShowIssuePicker(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0F766E] dark:bg-slate-900" edges={['top']}>
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="relative z-10 overflow-hidden rounded-b-[40px] bg-[#0F766E] px-6 pb-12 pt-8 dark:bg-slate-900" style={{ shadowColor: '#134E4A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 }}>
          {/* Abstract decorative shapes */}
          <View className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-teal-400/20" />
          <View className="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-teal-900/30" />
          
          <View className="relative z-10 mb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-[38px] font-black tracking-tighter text-white" style={{ textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                Messages
              </Text>
              <Text className="mt-1 text-[13px] font-bold uppercase tracking-widest text-teal-100/90">
                Official Comms
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setScreen('new')}
              className="h-14 w-14 items-center justify-center rounded-full border-2 border-white/30 bg-white/20" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 }}
              activeOpacity={0.8}>
              <Plus size={26} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>
          {totalUnread > 0 && (
            <View className="relative z-10 flex-row items-center gap-2.5 self-start rounded-full border border-white/20 bg-white/20 px-5 py-2.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
              <View className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" style={{ shadowColor: '#FBBF24', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.5, shadowRadius: 2, elevation: 1 }} />
              <Text className="text-[14px] font-extrabold tracking-wide text-white">
                {totalUnread} new message{totalUnread > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        <View className="mx-6 -mt-8 z-20 flex-row items-center gap-3 rounded-[24px] border-[1.5px] border-slate-100 bg-white/95 px-5 py-4 dark:border-slate-700 dark:bg-slate-800" style={{ shadowColor: '#cbd5e1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}>
          <Search size={20} color="#94A3B8" strokeWidth={3} />
          <TextInput
            className="flex-1 text-[16px] font-bold text-slate-800 dark:text-slate-200"
            placeholder="Search conversations..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7} className="rounded-full bg-slate-100 p-1.5 dark:bg-slate-700">
              <X size={16} color="#64748B" strokeWidth={3} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          className="z-0 mt-2 flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}>
          {filteredConversations.map((conv) => {
            const other = conv.otherUser;
            const roleCfg = other
              ? (ROLE_CONFIG[other.role] ?? ROLE_CONFIG.FieldOfficer)
              : ROLE_CONFIG.FieldOfficer;
            const isOwnLast = conv.lastMessageSenderId === CURRENT_USER_ID;
            const statusColor = conv.issueRef
              ? (STATUS_COLORS[conv.issueRef.status] ?? '#94A3B8')
              : '#0F766E';

            const deptCat = other ? getCategoryForDept(other.department) : DEPARTMENT_CATEGORIES[7];
            const DeptIcon = deptCat.icon;

            return (
              <TouchableOpacity
                key={conv.id}
                className="mb-4 overflow-hidden rounded-[32px] bg-white dark:bg-slate-900"
                style={{ elevation: 3 }}
                onPress={() => {
                  setSelectedConvId(conv.id);
                  setScreen('chat');
                }}
                activeOpacity={0.85}>
                
                {/* Vibrant Status Accent Line */}
                <View style={{ backgroundColor: statusColor }} className="absolute bottom-0 left-0 top-0 w-1.5 opacity-90" />

                <View className="p-5 pl-6">
                  <View className="flex-row items-center gap-4">
                    {other && (
                      <View className="relative rounded-full" style={{ shadowColor: '#e2e8f0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2 }}>
                        <AvatarWithStatus uri={other.avatar} size={64} />
                      </View>
                    )}

                    <View className="flex-1 justify-center gap-2">
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1">
                          <Text
                            className="mb-1 text-[18px] font-black tracking-tight text-slate-900 dark:text-slate-50"
                            numberOfLines={1}>
                            {other?.name ?? 'Unknown'}
                          </Text>
                          <View className="flex-row items-center gap-2 flex-wrap">
                            <View className={`rounded-lg px-2 py-0.5 ${roleCfg.bgClass}`}>
                              <Text className={`text-[10px] font-extrabold uppercase tracking-wide ${roleCfg.textClass}`}>
                                {roleCfg.label}
                              </Text>
                            </View>
                            {other && (
                              <View className="flex-row items-center gap-1">
                                <DeptIcon size={12} color={deptCat.iconColor} />
                                <Text className={`text-[11px] font-bold ${deptCat.color}`} numberOfLines={1}>
                                  {deptCat.label}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        
                        <View className="items-end gap-1.5">
                          <Text className="text-[12px] font-extrabold text-slate-400 dark:text-slate-500">
                            {formatTime(conv.lastMessageTime)}
                          </Text>
                          {conv.unreadCount > 0 && (
                            <View className="min-w-[24px] items-center justify-center rounded-full bg-rose-500 px-2 py-1" style={{ shadowColor: '#f43f5e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 2 }}>
                              <Text className="text-[11px] font-black text-white">
                                {conv.unreadCount}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View className="mt-1 flex-row items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                        {isOwnLast && <CheckCheck size={16} color="#0D9488" strokeWidth={2.5} />}
                        <Text
                          className={`flex-1 text-[15px] ${conv.unreadCount > 0 ? 'font-bold text-slate-800 dark:text-slate-200' : 'font-medium text-slate-500 dark:text-slate-400'}`}
                          numberOfLines={1}>
                          {isOwnLast ? 'You: ' : ''}
                          {conv.lastMessage}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {conv.issueRef && (
                    <View className="mt-3 flex-row self-start">
                      <TouchableOpacity
                        onPress={() => setIssueRefModalId(conv.issueRef!.issueId)}
                        activeOpacity={0.7}
                        style={{
                          borderColor: statusColor + '40',
                          backgroundColor: statusColor + '10',
                        }}
                        className="flex-row items-start gap-2 rounded-xl border px-3 py-2 shrink">
                        <View className="mt-[1.5px]">
                          <Tag size={12} color={statusColor} strokeWidth={2.5} />
                        </View>
                        <Text
                          style={{ color: statusColor }}
                          className="text-[11px] font-extrabold uppercase tracking-widest shrink leading-[16px]">
                          {conv.issueRef.issueTitle}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredConversations.length === 0 && (
            <View className="items-center justify-center gap-4 py-20">
              <View className="h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <MessageSquare size={40} color="#CBD5E1" strokeWidth={2} />
              </View>
              <Text className="text-xl font-black text-slate-800 dark:text-slate-200">
                No conversations
              </Text>
              <Text className="px-10 text-center text-[15px] font-medium text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? 'No results match your exact search criteria'
                  : 'Start a new high-priority conversation with an official'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  onPress={() => setScreen('new')}
                  className="mt-4 flex-row items-center gap-2 rounded-full bg-[#0F766E] px-8 py-4" style={{ shadowColor: '#0d9488', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
                  activeOpacity={0.8}>
                  <Plus size={18} color="#FFFFFF" strokeWidth={3} />
                  <Text className="text-[15px] font-black text-white">Start Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>
      <IssueRefModal issueId={issueRefModalId} onClose={() => setIssueRefModalId(null)} />
    </SafeAreaView>
  );
}
