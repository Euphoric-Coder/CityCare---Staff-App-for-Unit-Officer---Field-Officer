import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { AppNotification, NotificationType } from '../lib/types';

const TYPE_CONFIG: Record<
  NotificationType,
  {
    icon: (color: string) => React.ReactNode;
    color: string;
    bg: string;
    label: string;
  }
> = {
  assignment: {
    icon: (c) => <UserCheck size={15} color={c} strokeWidth={2.5} />,
    color: '#0891B2',
    bg: '#E0F2FE',
    label: 'Assignment',
  },
  sla_alert: {
    icon: (c) => <AlertTriangle size={15} color={c} strokeWidth={2.5} />,
    color: '#DC2626',
    bg: '#FEE2E2',
    label: 'SLA Alert',
  },
  rework: {
    icon: (c) => <RotateCcw size={15} color={c} strokeWidth={2.5} />,
    color: '#F97316',
    bg: '#FFEDD5',
    label: 'Rework',
  },
  escalation: {
    icon: (c) => <ArrowUpCircle size={15} color={c} strokeWidth={2.5} />,
    color: '#7C3AED',
    bg: '#EDE9FE',
    label: 'Escalation',
  },
  verification: {
    icon: (c) => <CheckCircle size={15} color={c} strokeWidth={2.5} />,
    color: '#059669',
    bg: '#D1FAE5',
    label: 'Verification',
  },
  resolution: {
    icon: (c) => <CheckCheck size={15} color={c} strokeWidth={2.5} />,
    color: '#10B981',
    bg: '#D1FAE5',
    label: 'Resolution',
  },
  reopened: {
    icon: (c) => <RotateCcw size={15} color={c} strokeWidth={2.5} />,
    color: '#EC4899',
    bg: '#FCE7F3',
    label: 'Reopened',
  },
  message: {
    icon: (c) => <MessageSquare size={15} color={c} strokeWidth={2.5} />,
    color: '#3B82F6',
    bg: '#DBEAFE',
    label: 'Message',
  },
  system: {
    icon: (c) => <Settings size={15} color={c} strokeWidth={2.5} />,
    color: '#6B7280',
    bg: '#F1F5F9',
    label: 'System',
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

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;
  const isUnread = !notification.read;

  return (
    <View
      className={`mb-2.5 overflow-hidden rounded-2xl border ${
        isUnread
          ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
          : 'border-slate-100 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-800/50'
      }`}>
      {isUnread && (
        <View
          className="absolute bottom-0 left-0 top-0 w-0.5 rounded-l-2xl"
          style={{ backgroundColor: cfg.color }}
        />
      )}

      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.75}
        className="flex-row items-start gap-3 px-4 pb-3 pt-3.5">
        <View
          className="mt-0.5 h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: cfg.bg }}>
          {cfg.icon(cfg.color)}
        </View>

        <View className="min-w-0 flex-1">
          <View className="mb-0.5 flex-row items-center justify-between">
            <View className="mr-2 rounded-md px-1.5 py-0.5" style={{ backgroundColor: cfg.bg }}>
              <Text
                className="text-[9px] font-extrabold tracking-wider"
                style={{ color: cfg.color }}>
                {cfg.label.toUpperCase()}
              </Text>
            </View>
            <Text className="flex-shrink-0 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {formatTime(notification.createdAt)}
            </Text>
          </View>

          <Text
            className={`text-[13px] font-bold leading-[18px] ${
              isUnread ? 'text-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-300'
            }`}
            numberOfLines={expanded ? undefined : 1}>
            {notification.title}
          </Text>

          {expanded && (
            <Text className="mt-1 text-[12px] leading-[17px] text-slate-500 dark:text-slate-400">
              {notification.message}
            </Text>
          )}

          {!expanded && (
            <Text
              className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500"
              numberOfLines={1}>
              {notification.message}
            </Text>
          )}
        </View>

        <View className="mt-1 flex-shrink-0">
          {expanded ? (
            <ChevronUp size={14} color="#94A3B8" strokeWidth={2.5} />
          ) : (
            <ChevronDown size={14} color="#94A3B8" strokeWidth={2.5} />
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="flex-row items-center justify-between border-t border-slate-100 px-4 pb-3 pt-1 dark:border-slate-700/50">
          {notification.issueId && (
            <View className="flex-row items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 dark:bg-sky-900/20">
              <Text className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                {notification.issueId}
              </Text>
            </View>
          )}
          {isUnread && (
            <TouchableOpacity
              onPress={() => onMarkRead(notification.id)}
              activeOpacity={0.7}
              className="ml-auto flex-row items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 dark:bg-teal-900/20">
              <CheckCircle size={12} color="#0D9488" strokeWidth={2.5} />
              <Text className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                Mark as read
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  role: 'UnitOfficer' | 'FieldOfficer';
}

export default function NotificationPanel({
  visible,
  onClose,
  notifications,
  role,
}: NotificationPanelProps) {
  const [items, setItems] = useState<AppNotification[]>(notifications);

  React.useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  const unreadCount = items.filter((n) => !n.read).length;

  const handleMarkRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const accentColor = role === 'FieldOfficer' ? '#0D9488' : '#0891B2';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
          activeOpacity={1}
        />
        <View className="rounded-t-3xl bg-white dark:bg-slate-900" style={{ maxHeight: '82%' }}>
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 pb-4 pt-5 dark:border-slate-800">
            <View className="flex-row items-center gap-2.5">
              <View
                className="h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: accentColor + '18' }}>
                <Bell size={18} color={accentColor} strokeWidth={2.5} />
              </View>
              <View>
                <Text className="text-[17px] font-extrabold text-slate-900 dark:text-slate-50">
                  Notifications
                </Text>
                {unreadCount > 0 ? (
                  <Text className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                    {unreadCount} unread
                  </Text>
                ) : (
                  <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    All caught up
                  </Text>
                )}
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllRead}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 dark:bg-teal-900/20">
                  <CheckCheck size={14} color="#0D9488" strokeWidth={2.5} />
                  <Text className="text-[12px] font-bold text-teal-700 dark:text-teal-400">
                    All read
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <X size={16} color="#64748B" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
            {items.length === 0 ? (
              <View className="items-center justify-center gap-3 py-16">
                <View className="h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800">
                  <BellOff size={32} color="#CBD5E1" strokeWidth={1.5} />
                </View>
                <Text className="text-[15px] font-bold text-slate-500 dark:text-slate-400">
                  No notifications
                </Text>
                <Text className="px-8 text-center text-[12px] text-slate-400 dark:text-slate-500">
                  You're all caught up. Check back later.
                </Text>
              </View>
            ) : (
              items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
