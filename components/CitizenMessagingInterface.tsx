import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useColorScheme,
  Alert,
  Linking,
  Keyboard,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  X,
  Send,
  MessageCircle,
  User,
  Phone,
  CheckCheck,
  Check,
  Tag,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react-native';
import { CitizenMessage, Issue } from 'lib/types';
import { useUser } from 'context/UserContext';
import { useMutation, useQuery } from 'convex/react';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';

const FO_ID = 'fo-1';
const FO_NAME = 'Rajesh Kumar';
const FO_AVATAR = 'https://i.pravatar.cc/150?img=12';

function formatTime(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateDivider(createdAt: string): string {
  const date = new Date(createdAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function shouldShowDateDivider(messages: CitizenMessage[], index: number): boolean {
  if (index === 0) return true;
  const curr = new Date(messages[index].createdAt).toDateString();
  const prev = new Date(messages[index - 1].createdAt).toDateString();
  return curr !== prev;
}

interface MessageBubbleProps {
  message: CitizenMessage;
  isOwn: boolean;
  showAvatar: boolean;
  isDark: boolean;
}

function MessageBubble({ message, isOwn, showAvatar, isDark }: MessageBubbleProps) {
  return (
    <View className={`mb-3 flex-row items-end gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <View className={`max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {showAvatar && !isOwn && (
          <View className="mb-1.5 ml-1 flex-row items-center gap-1.5">
            <Text className="text-[12px] font-extrabold text-slate-600 dark:text-slate-400">
              {message.fromName}
            </Text>
            <Text className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
              • Citizen
            </Text>
          </View>
        )}

        {isOwn ? (
          <LinearGradient
            colors={['#0D9488', '#0F766E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ownBubble}
            className="border border-teal-500/30">
            <Text className="text-[15px] font-medium leading-[22px] text-white">
              {message.text}
            </Text>
            <View className="mt-1.5 flex-row items-center justify-end gap-1.5">
              <Text className="text-[10px] font-bold text-teal-100/80">
                {formatTime(message.createdAt)}
              </Text>
              {message.read ? (
                <CheckCheck size={14} color="#5EEAD4" strokeWidth={2.5} />
              ) : (
                <CheckCheck size={14} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
              )}
            </View>
          </LinearGradient>
        ) : (
          <View
            style={styles.citizenBubble}
            className="border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800/90">
            <Text className="text-[15px] font-medium leading-[22px] text-slate-800 dark:text-slate-100">
              {message.text}
            </Text>
            <View className="mt-1.5 flex-row items-center justify-start gap-1.5">
              <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {formatTime(message.createdAt)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {isOwn && (
        <View className="mb-1 h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-teal-200 shadow-sm dark:border-teal-800">
          {showAvatar ? (
            <Image source={{ uri: FO_AVATAR }} style={{ width: 36, height: 36 }} />
          ) : (
            <View className="h-9 w-9" />
          )}
        </View>
      )}
    </View>
  );
}

interface CitizenMessagingInterfaceProps {
  visible: boolean;
  onClose: () => void;
  issue: any;
  initialMessages?: CitizenMessage[];
  officer?: 'UnitOfficer' | 'FieldOfficer';
}

export default function CitizenMessagingInterface({
  visible,
  onClose,
  issue,
}: CitizenMessagingInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const user = useUser();
  const currentUserId = user?.id as Id<'users'> | undefined;

  const chatPartnerId = issue.reportedBy as Id<'users'> | undefined;

  const rawMessages = useQuery(
    api.messages.getOfficerIssueMessages,
    currentUserId && chatPartnerId && issue.id
      ? {
          issueId: issue.id as Id<'issues'>,
          currentUserId: currentUserId,
          citizenId: chatPartnerId,
        }
      : 'skip'
  );

  const sendMessageMutation = useMutation(api.messages.sendMessage);
  const markAsReadMutation = useMutation(api.messages.markMessagesAsRead);

  const messages: CitizenMessage[] = React.useMemo(() => {
    if (!rawMessages) return [];
    return rawMessages.map((msg: any) => ({
      id: msg._id,
      issueId: msg.issueId,
      senderId: msg.senderId,
      fromName: msg.sender?.fullName || 'Unknown',
      fromRole: msg.sender?.role,
      text: msg.message,
      createdAt: new Date(msg.createdAt).toISOString(),
      read: msg.isRead,
    }));
  }, [rawMessages]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          onClose();
        }
      },
      onPanResponderTerminate: (_, gestureState) => {
        if (gestureState.dy > 50) {
          onClose();
        }
      },
    })
  ).current;
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (visible && currentUserId && chatPartnerId && issue.id) {
      const hasUnread = messages.some((m) => !m.read && m.senderId === chatPartnerId);
      if (hasUnread) {
        markAsReadMutation({
          issueId: issue.id as Id<'issues'>,
          currentUserId: currentUserId,
          senderId: chatPartnerId,
        }).catch(console.error);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [visible, currentUserId, chatPartnerId, issue.id, messages]);

  const citizenName =
    messages.find((m) => m.fromRole === 'citizen' || m.fromRole === 'Citizen')?.fromName ??
    issue.citizenName ??
    'Citizen';
  const citizenAvatar = null;

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !currentUserId || !chatPartnerId || !issue.id) return;

    setInputText('');
    Keyboard.dismiss();

    try {
      await sendMessageMutation({
        issueId: issue.id as Id<'issues'>,
        senderId: currentUserId,
        recipientId: chatPartnerId,
        message: text,
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const STATUS_COLOR: Record<string, string> = {
    Assigned: '#3B82F6',
    'In Progress': '#F59E0B',
    'Pending UO Verification': '#8B5CF6',
    'Rework Required': '#EF4444',
    Closed: '#94A3B8',
  };
  const statusColor = STATUS_COLOR[issue.status] ?? '#64748B';

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.panelContainer,
            { marginTop: insets.top + (Platform.OS === 'ios' ? 20 : 60) },
            isDark ? styles.panelDark : styles.panelLight,
          ]}>
          {/* ── Breathtaking Mesh Gradient Background ── */}
          <View style={StyleSheet.absoluteFill} className="overflow-hidden">
            <View className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-teal-400/20 dark:bg-teal-600/20" />
            <View className="absolute -bottom-32 -right-20 h-[400px] w-[400px] rounded-full bg-blue-400/20 dark:bg-blue-800/20" />
            <View className="absolute right-10 top-1/3 h-[250px] w-[250px] rounded-full bg-emerald-400/15 dark:bg-emerald-600/15" />
            <BlurView
              intensity={120}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}>
            <View className="flex-1">
              {/* ── Breathtaking Header ── */}
              <View>
                <LinearGradient
                  colors={
                    isDark
                      ? ['#115E59', '#0D9488', 'transparent']
                      : ['#0D9488', '#0F766E', 'transparent']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}>
                  {/* Modal Drag Handle */}
                  <View
                    {...panResponder.panHandlers}
                    className="-mt-4 mb-2 w-full items-center py-4">
                    <View className="h-1.5 w-12 rounded-full bg-white/40" />
                  </View>

                  <View className="w-full flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center gap-3.5 pr-2">
                      <TouchableOpacity
                        onPress={onClose}
                        activeOpacity={0.7}
                        className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/20 shadow-sm">
                        <X size={20} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>

                      <View className="relative">
                        {citizenAvatar ? (
                          <Image source={{ uri: citizenAvatar }} style={styles.headerAvatar} />
                        ) : (
                          <View
                            style={styles.headerAvatar}
                            className="items-center justify-center border border-white/30 bg-white/25 shadow-sm">
                            <User size={22} color="#FFFFFF" strokeWidth={2.5} />
                          </View>
                        )}
                        {/* Pulsating / Glowing Online Badge */}
                        <View className="shadow-xs absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-teal-800 bg-emerald-400" />
                      </View>

                      <View className="flex-1 justify-center">
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            className="text-[17px] font-black tracking-tight text-white"
                            numberOfLines={1}>
                            {citizenName}
                          </Text>
                          <View className="rounded-full border border-white/20 bg-white/20 px-2 py-0.5">
                            <Text className="text-[9px] font-extrabold uppercase tracking-wider text-white">
                              Citizen
                            </Text>
                          </View>
                        </View>

                        <View className="mt-0.5 flex-row items-center gap-1.5">
                          <View className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                          <Text className="text-[11px] font-bold tracking-wide text-teal-100">
                            Active Now
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => {
                          if (issue.citizenPhone) {
                            Linking.openURL(`tel:${issue.citizenPhone}`);
                          } else {
                            Alert.alert('Unavailable', 'Citizen phone number is not available.');
                          }
                        }}
                        activeOpacity={0.7}
                        className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/20 shadow-sm">
                        <Phone size={18} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Issue Intelligence Details',
                            `Title: ${issue.title}\n\nCategory: ${issue.category}\nStatus: ${issue.status.toUpperCase()}\nCitizen: ${issue.citizenName} (${issue.citizenPhone})\nLocation: ${issue.location ?? issue.address ?? 'N/A'}\n\nDescription:\n${issue.description ?? 'No description provided.'}`
                          );
                        }}
                        activeOpacity={0.7}
                        className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/20 shadow-sm">
                        <Info size={18} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* ── Floating Intelligence Pod ── */}
              <View className="-mt-6 mb-2 px-4">
                <BlurView
                  intensity={80}
                  tint={isDark ? 'dark' : 'light'}
                  className="gap-2.5 overflow-hidden rounded-2xl border border-white/40 bg-white/40 px-4 py-3.5 shadow-lg dark:border-white/10 dark:bg-black/40">
                  {/* Top Row: Pills */}
                  <View className="w-full flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View
                        className="rounded-xl border px-3 py-1"
                        style={{
                          backgroundColor: statusColor + '20',
                          borderColor: statusColor + '50',
                        }}>
                        <Text
                          className="text-[11px] font-black uppercase tracking-wider"
                          style={{ color: statusColor }}>
                          {issue.status.toUpperCase()}
                        </Text>
                      </View>

                      <View className="rounded-xl border border-slate-200/50 bg-slate-100/50 px-2.5 py-1 dark:border-slate-700/50 dark:bg-slate-800/50">
                        <Text className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          {issue.category}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-1.5 rounded-full border border-slate-200/50 bg-slate-100/50 px-3 py-1 dark:border-slate-700/50 dark:bg-slate-800/50">
                      <MessageCircle size={13} color="#0D9488" strokeWidth={2.5} />
                      <Text className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                        {messages.length} {messages.length === 1 ? 'Msg' : 'Msgs'}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Row: Text Stack */}
                  <View className="gap-1 pl-0.5">
                    <Text
                      className="text-[15px] font-extrabold leading-[22px] text-slate-900 dark:text-white"
                      numberOfLines={3}>
                      {issue.title}
                    </Text>
                    <Text
                      className="text-[12px] font-bold text-teal-700 dark:text-teal-400"
                      numberOfLines={1}>
                      #{issue.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text
                      className="text-[11px] font-medium text-slate-600 dark:text-slate-400"
                      numberOfLines={2}>
                      {issue.location ?? `${issue.address ?? ''} ${issue.city ?? ''}`}
                    </Text>
                  </View>
                </BlurView>
              </View>

              {/* ── Messages ── */}
              <ScrollView
                ref={scrollRef}
                className="flex-1 bg-transparent"
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onLayout={() => scrollRef.current?.scrollToEnd({ animated: true })}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
                {messages.map((msg, index) => {
                  const isOwn = msg.senderId === currentUserId;
                  const nextMsg = messages[index + 1];
                  const showAvatar = !nextMsg || nextMsg.senderId !== msg.senderId;
                  const showDivider = shouldShowDateDivider(messages, index);

                  return (
                    <View key={msg.id}>
                      {showDivider && (
                        <View className="my-5 items-center">
                          <View className="shadow-xs flex-row items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-1.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
                            <Clock size={12} color="#0D9488" strokeWidth={2.5} />
                            <Text className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400">
                              {formatDateDivider(msg.createdAt)}
                            </Text>
                          </View>
                        </View>
                      )}
                      <MessageBubble
                        message={msg}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                        isDark={isDark}
                      />
                    </View>
                  );
                })}
              </ScrollView>

              {/* ── Floating AI Quick Replies & Input Container ── */}
              <View
                className="px-3"
                style={{ paddingBottom: Math.max(insets.bottom, 12), paddingTop: 8 }}>
                {/* Quick Replies */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 4, paddingBottom: 12 }}>
                  {[
                    'We will be there shortly to resolve this.',
                    'Work has officially started on location.',
                    'The issue has been successfully resolved.',
                    'Could you please share a recent photo?',
                    'Our team is inspecting the site right now.',
                  ].map((reply) => (
                    <TouchableOpacity
                      key={reply}
                      onPress={() => {
                        setInputText(reply);
                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                      }}
                      activeOpacity={0.7}
                      className="flex-row items-center gap-1.5 rounded-full border border-teal-500/20 bg-white/70 px-3.5 py-2 shadow-sm dark:border-teal-400/20 dark:bg-black/50">
                      <Sparkles size={12} color="#0D9488" strokeWidth={2.5} />
                      <Text className="text-[12px] font-bold text-teal-900 dark:text-teal-200">
                        {reply}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Floating Glass Input Bar */}
                <BlurView
                  intensity={80}
                  tint={isDark ? 'dark' : 'light'}
                  className="flex-row items-end gap-2.5 overflow-hidden rounded-[32px] border border-white/50 bg-white/50 px-2.5 py-2.5 shadow-lg dark:border-white/10 dark:bg-black/50">
                  <View className="min-h-[44px] flex-1 justify-center rounded-[24px] border border-white/40 bg-white/70 px-4 py-1 dark:border-white/5 dark:bg-black/40">
                    <TextInput
                      value={inputText}
                      onChangeText={setInputText}
                      onFocus={() => {
                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
                      }}
                      placeholder="Message citizen..."
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      multiline
                      scrollEnabled={true}
                      maxLength={500}
                      className="text-[15px] leading-[22px] text-slate-900 dark:text-slate-100"
                      style={{
                        maxHeight: 120,
                        paddingTop: Platform.OS === 'ios' ? 10 : 8,
                        paddingBottom: Platform.OS === 'ios' ? 10 : 8,
                      }}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={!inputText.trim()}
                    activeOpacity={0.8}
                    style={[
                      styles.sendBtn,
                      { opacity: inputText.trim() ? 1 : 0.4, marginBottom: 0 },
                    ]}>
                    <LinearGradient
                      colors={['#0D9488', '#0F766E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sendGrad}>
                      <Send size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 2 }} />
                    </LinearGradient>
                  </TouchableOpacity>
                </BlurView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panelContainer: {
    flex: 1,
    width: '100%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  panelLight: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  panelDark: {
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  headerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 4,
  },
  ownBubble: {
    backgroundColor: '#0D9488',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  citizenBubble: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sendBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    width: 48,
    height: 48,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendGrad: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
