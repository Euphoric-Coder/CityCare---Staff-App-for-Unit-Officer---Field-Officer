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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
} from 'lucide-react-native';
import { CitizenMessage, Issue } from '../lib/types';

const FO_ID = 'fo-1';
const FO_NAME = 'Rajesh Kumar';
const FO_AVATAR = 'https://i.pravatar.cc/150?img=12';

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateDivider(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function shouldShowDateDivider(messages: CitizenMessage[], index: number): boolean {
  if (index === 0) return true;
  const curr = new Date(messages[index].timestamp).toDateString();
  const prev = new Date(messages[index - 1].timestamp).toDateString();
  return curr !== prev;
}

interface MessageBubbleProps {
  message: CitizenMessage;
  isOwn: boolean;
  showAvatar: boolean;
}

function MessageBubble({ message, isOwn, showAvatar }: MessageBubbleProps) {
  return (
    <View className={`mb-1.5 flex-row items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && (
        <View className="mb-0.5 h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
          {showAvatar ? (
            message.fromAvatar ? (
              <Image source={{ uri: message.fromAvatar }} style={{ width: 32, height: 32 }} />
            ) : (
              <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-600">
                <User size={16} color="#94A3B8" strokeWidth={2} />
              </View>
            )
          ) : (
            <View className="h-8 w-8" />
          )}
        </View>
      )}

      <View className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {showAvatar && !isOwn && (
          <Text className="mb-1 ml-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
            {message.fromName}
          </Text>
        )}

        <View
          className={`rounded-2xl px-4 py-2.5 ${
            isOwn
              ? 'rounded-br-sm'
              : 'rounded-bl-sm border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800'
          }`}
          style={isOwn ? styles.ownBubble : undefined}>
          <Text
            className={`text-[14px] leading-[20px] ${
              isOwn ? 'text-white' : 'text-slate-800 dark:text-slate-100'
            }`}>
            {message.text}
          </Text>

          <View
            className={`mt-1 flex-row items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <Text
              className={`text-[10px] ${isOwn ? 'text-teal-100' : 'text-slate-400 dark:text-slate-500'}`}>
              {formatTime(message.timestamp)}
            </Text>
            {isOwn &&
              (message.read ? (
                <CheckCheck size={12} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
              ) : (
                <Check size={12} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
              ))}
          </View>
        </View>
      </View>

      {isOwn && (
        <View className="mb-0.5 h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
          {showAvatar ? (
            <Image source={{ uri: FO_AVATAR }} style={{ width: 32, height: 32 }} />
          ) : (
            <View className="h-8 w-8" />
          )}
        </View>
      )}
    </View>
  );
}

interface CitizenMessagingInterfaceProps {
  visible: boolean;
  onClose: () => void;
  issue: Issue;
  initialMessages: CitizenMessage[];
}

export default function CitizenMessagingInterface({
  visible,
  onClose,
  issue,
  initialMessages,
}: CitizenMessagingInterfaceProps) {
  const [messages, setMessages] = useState<CitizenMessage[]>(
    initialMessages.map((m) => ({ ...m, read: true }))
  );
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setMessages(initialMessages.map((m) => ({ ...m, read: true })));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [visible, initialMessages]);

  const citizenName =
    initialMessages.find((m) => m.fromRole === 'Citizen')?.fromName ?? issue.citizenName;
  const citizenAvatar = initialMessages.find((m) => m.fromRole === 'Citizen')?.fromAvatar;

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    const newMsg: CitizenMessage = {
      id: `cm-new-${Date.now()}`,
      issueId: issue.id,
      fromId: FO_ID,
      fromName: FO_NAME,
      fromRole: 'FieldOfficer',
      fromAvatar: FO_AVATAR,
      text,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top', 'bottom']}>
        <View className="flex-1">
          {/* ── Header ── */}
          <LinearGradient
            colors={['#0D9488', '#0891B2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGrad}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <X size={18} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <View className="mx-3 flex-1 flex-row items-center gap-3">
              <View className="relative">
                {citizenAvatar ? (
                  <Image source={{ uri: citizenAvatar }} style={styles.headerAvatar} />
                ) : (
                  <View
                    style={styles.headerAvatar}
                    className="items-center justify-center bg-white/20">
                    <User size={20} color="#FFFFFF" strokeWidth={2} />
                  </View>
                )}
                <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-teal-700 bg-green-400" />
              </View>

              <View className="flex-1">
                <Text
                  className="text-[16px] font-extrabold tracking-tight text-white"
                  numberOfLines={1}>
                  {citizenName}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <View className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  <Text className="text-[11px] font-medium text-white/80">Citizen</Text>
                  <Text className="mx-1 text-[10px] text-white/50">•</Text>
                  <Tag size={9} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
                  <Text className="text-[11px] font-medium text-white/70" numberOfLines={1}>
                    {issue.title}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Phone size={16} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </LinearGradient>

          {/* ── Issue Context Strip ── */}
          <View className="flex-row items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <View
              className="rounded-lg px-2.5 py-1"
              style={{ backgroundColor: statusColor + '18' }}>
              <Text
                className="text-[10px] font-extrabold tracking-wide"
                style={{ color: statusColor }}>
                {issue.status.toUpperCase()}
              </Text>
            </View>
            <Text
              className="flex-1 text-[12px] font-semibold text-slate-500 dark:text-slate-400"
              numberOfLines={1}>
              #{issue.id.slice(0, 10)} — {issue.category}
            </Text>
            <View className="flex-row items-center gap-1">
              <Clock size={11} color="#94A3B8" strokeWidth={2} />
              <Text className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                {messages.length} messages
              </Text>
            </View>
          </View>

          {/* ── Messages ── */}
          <ScrollView
            ref={scrollRef}
            className="flex-1 bg-slate-50 dark:bg-slate-950"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
            {messages.map((msg, index) => {
              const isOwn = msg.fromId === FO_ID;
              const nextMsg = messages[index + 1];
              const showAvatar = !nextMsg || nextMsg.fromId !== msg.fromId;
              const showDivider = shouldShowDateDivider(messages, index);

              return (
                <View key={msg.id}>
                  {showDivider && (
                    <View className="my-4 items-center">
                      <View className="rounded-full bg-slate-200 px-3 py-1 dark:bg-slate-800">
                        <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {formatDateDivider(msg.timestamp)}
                        </Text>
                      </View>
                    </View>
                  )}
                  <MessageBubble message={msg} isOwn={isOwn} showAvatar={showAvatar} />
                </View>
              );
            })}
          </ScrollView>

          {/* ── Typing Quick Replies ── */}
          <View className="border-t border-slate-100 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}>
              {[
                'We will be there shortly.',
                'Work has started.',
                'Issue has been resolved.',
                'Please send a photo.',
              ].map((reply) => (
                <TouchableOpacity
                  key={reply}
                  onPress={() => setInputText(reply)}
                  activeOpacity={0.7}
                  className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 dark:border-teal-800/60 dark:bg-teal-900/20">
                  <Text className="text-[12px] font-semibold text-teal-700 dark:text-teal-400">
                    {reply}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Input Bar ── */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="flex-row items-end gap-3 border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <View className="min-h-[44px] flex-1 justify-center rounded-3xl bg-slate-100 px-4 py-2.5 dark:bg-slate-800">
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Message citizen..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  maxLength={500}
                  className="text-[14px] leading-[20px] text-slate-900 dark:text-slate-100"
                  style={{ maxHeight: 120 }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSend}
                disabled={!inputText.trim()}
                activeOpacity={0.8}
                style={[styles.sendBtn, { opacity: inputText.trim() ? 1 : 0.4 }]}>
                <LinearGradient
                  colors={['#0D9488', '#0891B2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendGrad}>
                  <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 2,
  },
  ownBubble: {
    backgroundColor: '#0D9488',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtn: {
    borderRadius: 22,
    overflow: 'hidden',
    width: 44,
    height: 44,
  },
  sendGrad: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
