import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  X,
  Bell,
  BellOff,
  CheckCheck,
  UserCheck,
  Clock,
  RotateCcw,
  TriangleAlert as AlertTriangle,
  CircleCheck as CheckCircle,
  MessageSquare,
  Settings,
  CircleArrowUp as ArrowUpCircle,
  ChevronRight,
  Sparkles,
  Inbox,
  LayoutGrid,
  Trash2,
  Eye,
  TrendingUp,
  AlertCircle,
  Clock3,
  SendHorizontal,
  XCircle,
} from 'lucide-react-native';
import { AppNotification, NotificationType } from 'lib/types';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TYPE_CONFIG: Record<
  NotificationType,
  {
    icon: (color: string) => React.ReactNode;
    color: string;
    bg: string;
    darkBg: string;
    darkColor: string;
    label: string;
  }
> = {
  status: {
    icon: (c) => <AlertCircle size={16} color={c} strokeWidth={2.5} />,
    color: '#2563EB',
    darkColor: '#60A5FA',
    bg: '#DBEAFE',
    darkBg: '#1E3A8A',
    label: 'Status',
  },

  upvote: {
    icon: (c) => <TrendingUp size={16} color={c} strokeWidth={2.5} />,
    color: '#059669',
    darkColor: '#34D399',
    bg: '#D1FAE5',
    darkBg: '#022C22',
    label: 'Upvote',
  },

  comment: {
    icon: (c) => <MessageSquare size={16} color={c} strokeWidth={2.5} />,
    color: '#D97706',
    darkColor: '#FBBF24',
    bg: '#FEF3C7',
    darkBg: '#451A03',
    label: 'Comment',
  },

  assigned: {
    icon: (c) => <UserCheck size={16} color={c} strokeWidth={2.5} />,
    color: '#0891B2',
    darkColor: '#38BDF8',
    bg: '#E0F2FE',
    darkBg: '#082F49',
    label: 'Assignment',
  },

  sla_alert: {
    icon: (c) => <AlertTriangle size={16} color={c} strokeWidth={2.5} />,
    color: '#DC2626',
    darkColor: '#F87171',
    bg: '#FEE2E2',
    darkBg: '#450A0A',
    label: 'SLA Alert',
  },

  rework: {
    icon: (c) => <RotateCcw size={16} color={c} strokeWidth={2.5} />,
    color: '#F97316',
    darkColor: '#FB923C',
    bg: '#FFEDD5',
    darkBg: '#431407',
    label: 'Rework Required',
  },

  escalation: {
    icon: (c) => <ArrowUpCircle size={16} color={c} strokeWidth={2.5} />,
    color: '#7C3AED',
    darkColor: '#A78BFA',
    bg: '#EDE9FE',
    darkBg: '#2E1065',
    label: 'Escalated',
  },

  verified: {
    icon: (c) => <CheckCircle size={16} color={c} strokeWidth={2.5} />,
    color: '#059669',
    darkColor: '#34D399',
    bg: '#D1FAE5',
    darkBg: '#022C22',
    label: 'Verification',
  },

  resolution: {
    icon: (c) => <CheckCheck size={16} color={c} strokeWidth={2.5} />,
    color: '#10B981',
    darkColor: '#6EE7B7',
    bg: '#D1FAE5',
    darkBg: '#022C22',
    label: 'Resolution',
  },

  reopened: {
    icon: (c) => <RotateCcw size={16} color={c} strokeWidth={2.5} />,
    color: '#EC4899',
    darkColor: '#F472B6',
    bg: '#FCE7F3',
    darkBg: '#500724',
    label: 'Issue Reopened',
  },

  message: {
    icon: (c) => <MessageSquare size={16} color={c} strokeWidth={2.5} />,
    color: '#3B82F6',
    darkColor: '#60A5FA',
    bg: '#DBEAFE',
    darkBg: '#1E3A8A',
    label: 'Citizen Message',
  },

  in_progress: {
    icon: (c) => <Clock3 size={16} color={c} strokeWidth={2.5} />,
    color: '#2563EB',
    darkColor: '#60A5FA',
    bg: '#DBEAFE',
    darkBg: '#1E3A8A',
    label: 'In Progress',
  },

  submitted_for_review: {
    icon: (c) => <SendHorizontal size={16} color={c} strokeWidth={2.5} />,
    color: '#9333EA',
    darkColor: '#C084FC',
    bg: '#F3E8FF',
    darkBg: '#3B0764',
    label: 'Submitted for Review',
  },

  rejected: {
    icon: (c) => <XCircle size={16} color={c} strokeWidth={2.5} />,
    color: '#DC2626',
    darkColor: '#F87171',
    bg: '#FEE2E2',
    darkBg: '#450A0A',
    label: 'Rejected',
  },

  system: {
    icon: (c) => <Settings size={16} color={c} strokeWidth={2.5} />,
    color: '#64748B',
    darkColor: '#94A3B8',
    bg: '#F1F5F9',
    darkBg: '#1E293B',
    label: 'System Update',
  },
};

function formatTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
  notification: AppNotification[];
  role: 'UnitOfficer' | 'FieldOfficer';
  handleMarkAllAsRead: () => void;
  handleDelete: (id: string) => void;
}

export default function NotificationPanel({
  visible,
  onClose,
  notification,
  role,
  handleMarkAllAsRead,
  handleDelete,
}: NotificationPanelProps) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const markRead = useMutation(api.notifications.markAsRead);
  const unreadCount = notification.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    try {
      await markRead({ id: id as Id<'notifications'> });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const accentColor = role === 'FieldOfficer' ? '#0EA5A4' : '#0891B2';

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={[styles.panelContainer, isDark ? styles.panelDark : styles.panelLight]}>
          <BlurView
            intensity={isDark ? 40 : 60}
            style={StyleSheet.absoluteFill}
            tint={isDark ? 'dark' : 'light'}
          />

          {/* ── Header ── */}
          <View style={styles.header}>
            <View className="flex-row items-center justify-between">
              <View>
                <View className="flex-row items-center gap-2">
                  <View style={[styles.bellIconBox, { backgroundColor: accentColor + '15' }]}>
                    <Bell size={18} color={accentColor} strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text style={[styles.headerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                      Notifications
                    </Text>
                    {unreadCount > 0 && (
                      <View style={[styles.unreadBadge, { backgroundColor: accentColor }]}>
                        <Text style={styles.unreadBadgeText}>{unreadCount} NEW</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={styles.headerSubtitle}>NOTIFICATION CENTER</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' },
                ]}>
                <X size={20} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <View className="mt-6 flex-row items-center justify-between">
              <View style={styles.filterPill}>
                <LayoutGrid size={12} color={accentColor} />
                <Text style={[styles.filterText, { color: accentColor }]}>ALL NOTIFICATIONS</Text>
              </View>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllAsRead}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-1.5">
                  <CheckCheck size={14} color={accentColor} strokeWidth={2.5} />
                  <Text style={[styles.markAllText, { color: accentColor }]}>MARK ALL READ</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Notification List ── */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: Platform.OS === 'android' ? insets.bottom + 60 : insets.bottom + 20,
            }}>
            {notification.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Inbox size={48} color={isDark ? '#1E293B' : '#E2E8F0'} strokeWidth={1} />
                </View>
                <Text style={[styles.emptyTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                  All Caught Up
                </Text>
                <Text style={styles.emptySub}>
                  You have no active notifications. Check back later for operational updates.
                </Text>
              </View>
            ) : (
              notification.map((item) => {
                const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
                const typeColor = isDark ? config.darkColor : config.color;

                const isExpanded = expandedId === item._id;

                return (
                  <TouchableOpacity
                    key={item._id}
                    activeOpacity={0.9}
                    onPress={() => setExpandedId(isExpanded ? null : item._id)}
                    style={[
                      styles.card,
                      isDark ? styles.cardDark : styles.cardLight,
                      !item.read && styles.unreadCard,
                      isExpanded && styles.expandedCard,
                    ]}>
                    <View style={[styles.typeIndicator, { backgroundColor: typeColor }]} />

                    <View className="flex-1 p-4 pl-5">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <View className="mb-1.5 flex-row items-center gap-2">
                            <View
                              style={[
                                styles.iconBox,
                                { backgroundColor: isDark ? config.darkBg : config.bg },
                              ]}>
                              {config.icon(typeColor)}
                            </View>
                            <Text style={[styles.typeLabel, { color: typeColor }]}>
                              {config.label.toUpperCase()}
                            </Text>
                            {!item.read && <View style={styles.unreadDot} />}
                          </View>
                          <Text
                            style={[
                              styles.notifTitle,
                              { color: isDark ? '#F8FAFC' : '#0F172A' },
                              !item.read && { fontWeight: '900' },
                            ]}>
                            {item.title}
                          </Text>
                        </View>
                        <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                      </View>

                      <Text
                        numberOfLines={isExpanded ? undefined : 2}
                        style={[styles.notifMessage, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        {item.message}
                      </Text>

                      {isExpanded ? (
                        <View style={styles.actionRow}>
                          {!item.read && (
                            <TouchableOpacity
                              onPress={() => handleMarkRead(item._id)}
                              activeOpacity={0.7}
                              style={[styles.actionBtn, styles.markReadBtn]}>
                              <Eye size={14} color="#FFFFFF" strokeWidth={2.5} />
                              <Text style={styles.actionBtnText}>Mark as Read</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => handleDelete(item._id)}
                            activeOpacity={0.7}
                            style={[styles.actionBtn, styles.deleteBtn]}>
                            <Trash2 size={14} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.actionBtnText}>Delete Notification</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View className="mt-3 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1.5">
                            <Sparkles size={12} color={isDark ? '#334155' : '#CBD5E1'} />
                            <Text style={styles.intelMeta}>FIELD UPDATE</Text>
                          </View>
                          <ChevronRight
                            size={14}
                            color={isDark ? '#334155' : '#CBD5E1'}
                            strokeWidth={2.5}
                          />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
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
    height: '82%',
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
  header: {
    padding: 24,
    paddingTop: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  bellIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0EA5A4',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14,165,164,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(14,165,164,0.1)',
  },
  filterText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  card: {
    marginBottom: 12,
    borderRadius: 28,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      },
      android: {
        elevation: 0, // Disabled to prevent shadow bleeding through transparent backgrounds
      },
    }),
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardDark: {
    backgroundColor: 'rgba(30,41,59,0.5)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  unreadCard: {
    borderColor: 'rgba(14,165,164,0.3)',
    backgroundColor: 'rgba(14,165,164,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#0EA5A4',
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    alignSelf: 'flex-start',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  expandedCard: {
    borderColor: 'rgba(14,165,164,0.3)',
    backgroundColor: 'rgba(14,165,164,0.03)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  markReadBtn: {
    backgroundColor: '#0EA5A4',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  typeIndicator: {
    width: 6,
    height: '100%',
  },
  iconBox: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0EA5A4',
    marginLeft: 2,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 8,
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  intelMeta: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(14,165,164,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: '70%',
  },
});
