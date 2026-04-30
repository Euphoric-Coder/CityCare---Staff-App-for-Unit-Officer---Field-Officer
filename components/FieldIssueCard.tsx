import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
  useColorScheme,
  Animated,
} from 'react-native';
import {
  MapPin,
  Clock,
  TriangleAlert as AlertTriangle,
  User,
  Navigation,
  Tag,
  ChevronRight,
  Flame,
  AlertCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Issue } from '../lib/types';

interface FieldIssueCardProps {
  issue: Issue;
  onPress: (issue: Issue) => void;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const STATUS_META: Record<
  string,
  { bg: string; darkBg: string; text: string; darkText: string; dot: string }
> = {
  assigned: {
    bg: 'bg-teal-100',
    darkBg: 'dark:bg-teal-900/40',
    text: 'text-teal-700',
    darkText: 'dark:text-teal-300',
    dot: '#0D9488',
  },
  in_progress: {
    bg: 'bg-amber-100',
    darkBg: 'dark:bg-amber-900/40',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-300',
    dot: '#F59E0B',
  },
  pending_uo_verification: {
    bg: 'bg-blue-100',
    darkBg: 'dark:bg-blue-900/40',
    text: 'text-blue-700',
    darkText: 'dark:text-blue-300',
    dot: '#3B82F6',
  },
  rework_required: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
    dot: '#DC2626',
  },
};

const PRIORITY_META: Record<
  string,
  { bg: string; darkBg: string; text: string; darkText: string; dot: string }
> = {
  critical: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
    dot: '#DC2626',
  },
  high: {
    bg: 'bg-orange-100',
    darkBg: 'dark:bg-orange-900/40',
    text: 'text-orange-700',
    darkText: 'dark:text-orange-300',
    dot: '#F97316',
  },
  medium: {
    bg: 'bg-amber-100',
    darkBg: 'dark:bg-amber-900/40',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-300',
    dot: '#F59E0B',
  },
  low: {
    bg: 'bg-green-100',
    darkBg: 'dark:bg-green-900/40',
    text: 'text-green-700',
    darkText: 'dark:text-green-300',
    dot: '#16A34A',
  },
};

const CATEGORY_META: Record<
  string,
  { bg: string; darkBg: string; text: string; darkText: string }
> = {
  Pothole: {
    bg: 'bg-orange-50',
    darkBg: 'dark:bg-orange-900/20',
    text: 'text-orange-600',
    darkText: 'dark:text-orange-400',
  },
  'Street Light': {
    bg: 'bg-yellow-50',
    darkBg: 'dark:bg-yellow-900/20',
    text: 'text-yellow-600',
    darkText: 'dark:text-yellow-400',
  },
  'Waste Management': {
    bg: 'bg-green-50',
    darkBg: 'dark:bg-green-900/20',
    text: 'text-green-600',
    darkText: 'dark:text-green-400',
  },
  'Water Supply': {
    bg: 'bg-blue-50',
    darkBg: 'dark:bg-blue-900/20',
    text: 'text-blue-600',
    darkText: 'dark:text-blue-400',
  },
  Drainage: {
    bg: 'bg-cyan-50',
    darkBg: 'dark:bg-cyan-900/20',
    text: 'text-cyan-600',
    darkText: 'dark:text-cyan-400',
  },
  'Road Repair': {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-800/40',
    text: 'text-slate-600',
    darkText: 'dark:text-slate-400',
  },
  'Park Maintenance': {
    bg: 'bg-emerald-50',
    darkBg: 'dark:bg-emerald-900/20',
    text: 'text-emerald-600',
    darkText: 'dark:text-emerald-400',
  },
  'Public Safety': {
    bg: 'bg-red-50',
    darkBg: 'dark:bg-red-900/20',
    text: 'text-red-600',
    darkText: 'dark:text-red-400',
  },
};

// Breathtaking aura gradients and shadows based on status
const STATUS_AURA: Record<
  string,
  {
    lightG: [string, string];
    darkG: [string, string];
    shadowLight: string;
    shadowDark: string;
    orbColor: string;
    borderLight: string;
    borderDark: string;
  }
> = {
  assigned: {
    lightG: ['#ffffff', '#ccfbf1'],
    darkG: ['rgba(15, 23, 42, 0.95)', 'rgba(13, 148, 136, 0.35)'],
    shadowLight: 'rgba(13, 148, 136, 0.5)',
    shadowDark: 'rgba(13, 148, 136, 0.7)',
    orbColor: 'rgba(13, 148, 136, 0.3)',
    borderLight: 'rgba(20, 184, 166, 0.5)',
    borderDark: 'rgba(20, 184, 166, 0.6)',
  },
  in_progress: {
    lightG: ['#ffffff', '#fef3c7'],
    darkG: ['rgba(15, 23, 42, 0.95)', 'rgba(245, 158, 11, 0.35)'],
    shadowLight: 'rgba(245, 158, 11, 0.5)',
    shadowDark: 'rgba(245, 158, 11, 0.7)',
    orbColor: 'rgba(245, 158, 11, 0.3)',
    borderLight: 'rgba(245, 158, 11, 0.5)',
    borderDark: 'rgba(245, 158, 11, 0.6)',
  },
  pending_uo_verification: {
    lightG: ['#ffffff', '#dbeafe'],
    darkG: ['rgba(15, 23, 42, 0.95)', 'rgba(59, 130, 246, 0.35)'],
    shadowLight: 'rgba(59, 130, 246, 0.5)',
    shadowDark: 'rgba(59, 130, 246, 0.7)',
    orbColor: 'rgba(59, 130, 246, 0.3)',
    borderLight: 'rgba(59, 130, 246, 0.5)',
    borderDark: 'rgba(59, 130, 246, 0.6)',
  },
  rework_required: {
    lightG: ['#ffffff', '#fee2e2'],
    darkG: ['rgba(15, 23, 42, 0.95)', 'rgba(220, 38, 38, 0.35)'],
    shadowLight: 'rgba(220, 38, 38, 0.5)',
    shadowDark: 'rgba(220, 38, 38, 0.7)',
    orbColor: 'rgba(220, 38, 38, 0.3)',
    borderLight: 'rgba(220, 38, 38, 0.5)',
    borderDark: 'rgba(220, 38, 38, 0.6)',
  },
};

export default function FieldIssueCard({ issue, onPress }: FieldIssueCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const officerLocation = { latitude: 25.3176, longitude: 82.9739 };
  const distance = issue.coordinates
    ? calculateDistance(
        officerLocation.latitude,
        officerLocation.longitude,
        issue.coordinates.latitude,
        issue.coordinates.longitude
      )
    : 0;

  useEffect(() => {
    const calculate = () => {
      if (!issue.slaDeadline) {
        setTimeRemaining('No deadline');
        return;
      }
      const now = Date.now();
      const deadline = new Date(issue.slaDeadline).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining('OVERDUE');
        setIsOverdue(true);
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setIsUrgent(hours < 3);
      setTimeRemaining(
        hours < 24 ? `${hours}h ${minutes}m` : `${Math.floor(hours / 24)}d ${hours % 24}h`
      );
    };

    calculate();
    const iv = setInterval(calculate, 60000);
    return () => clearInterval(iv);
  }, [issue.slaDeadline]);

  useEffect(() => {
    if (isOverdue || isUrgent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.015, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isOverdue, isUrgent, pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const sm = STATUS_META[issue.status] ?? {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-800/50',
    text: 'text-slate-600',
    darkText: 'dark:text-slate-400',
    dot: '#94A3B8',
  };
  const pm = PRIORITY_META[issue.priority] ?? PRIORITY_META.low;
  const cm = CATEGORY_META[issue.category] ?? {
    bg: 'bg-slate-50',
    darkBg: 'dark:bg-slate-800/40',
    text: 'text-slate-500',
    darkText: 'dark:text-slate-400',
  };

  const aura = STATUS_AURA[issue.status] ?? STATUS_AURA['assigned'];

  const bgColors = isDark ? aura.darkG : aura.lightG;

  const borderColor = isOverdue
    ? isDark
      ? 'rgba(239, 68, 68, 0.9)'
      : 'rgba(239, 68, 68, 0.7)'
    : isUrgent
      ? isDark
        ? 'rgba(245, 158, 11, 0.9)'
        : 'rgba(245, 158, 11, 0.7)'
      : isDark
        ? aura.borderDark
        : aura.borderLight;

  const shadowProps = {
    shadowColor: isOverdue
      ? '#EF4444'
      : isUrgent
        ? '#F59E0B'
        : isDark
          ? aura.shadowDark
          : aura.shadowLight,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: isDark ? 0.7 : 0.9,
    shadowRadius: 24,
    elevation: isDark ? 16 : 20, // Massive bump for Android shadow prominence
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onPress(issue)}>
      <Animated.View
        style={[
          { marginBottom: 20, transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] },
          shadowProps,
        ]}>
        <LinearGradient
          colors={bgColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cardGradient, { borderColor, borderWidth: 1.5 }]}>
          {/* Ambient Glowing Orb */}
          <View
            style={[
              styles.ambientOrb,
              { backgroundColor: aura.orbColor, opacity: isDark ? 0.3 : 0.6 },
            ]}
          />

          {/* Overdue / Urgent Banners */}
          {isOverdue && (
            <LinearGradient
              colors={['#EF4444', '#991B1B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="flex-row items-center gap-2 px-5 py-3">
              <Flame color="#FFFFFF" size={14} strokeWidth={2.5} />
              <Text className="text-[11px] font-black tracking-widest text-white">SLA OVERDUE</Text>
            </LinearGradient>
          )}
          {!isOverdue && isUrgent && (
            <LinearGradient
              colors={['#F59E0B', '#B45309']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="flex-row items-center gap-2 px-5 py-3">
              <AlertCircle color="#FFFFFF" size={14} strokeWidth={2.5} />
              <Text className="text-[11px] font-black tracking-widest text-white">
                SLA CRITICAL — UNDER 3 HRS
              </Text>
            </LinearGradient>
          )}

          <View className="p-5">
            {/* Header: Category & Priority */}
            <View className="mb-5 flex-row items-center justify-between">
              <View
                className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5 ${cm.bg} ${cm.darkBg} border border-white/40 shadow-sm dark:border-white/5`}>
                <Tag size={12} strokeWidth={2.5} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text
                  className={`text-[11px] font-black tracking-widest ${cm.text} ${cm.darkText}`}>
                  {issue.category.toUpperCase()}
                </Text>
              </View>
              <View
                className={`flex-row items-center gap-2 rounded-full px-3.5 py-1.5 ${pm.bg} ${pm.darkBg} border border-white/40 shadow-sm dark:border-white/5`}>
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: pm.dot,
                    shadowColor: pm.dot,
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
                <Text
                  className={`text-[11px] font-black tracking-widest ${pm.text} ${pm.darkText}`}>
                  {issue.priority.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text
              className="mb-6 text-[20px] font-black leading-[28px] tracking-tight text-slate-900 dark:text-white"
              numberOfLines={2}>
              {issue.title}
            </Text>

            {/* Info Rows */}
            <View className="mb-6 gap-3.5">
              <View className="flex-row items-center gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-white/60 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/80">
                  <MapPin color={isDark ? '#9CA3AF' : '#64748B'} size={14} strokeWidth={2.5} />
                </View>
                <Text
                  className="flex-1 text-[14px] font-bold text-slate-700 dark:text-slate-200"
                  numberOfLines={1}>
                  {issue.location}
                </Text>
                {/* Distance Badge */}
                <View className="flex-row items-center gap-1.5 rounded-full border border-teal-200/50 bg-teal-50 px-3 py-1.5 shadow-sm dark:border-teal-800/50 dark:bg-teal-900/60">
                  <Navigation color="#0D9488" size={11} strokeWidth={3} />
                  <Text className="text-[12px] font-black tracking-wide text-teal-700 dark:text-teal-400">
                    {distance.toFixed(1)} km
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-white/60 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/80">
                  <User color={isDark ? '#9CA3AF' : '#64748B'} size={14} strokeWidth={2.5} />
                </View>
                <Text className="text-[14px] font-bold text-slate-700 dark:text-slate-200">
                  {issue.citizenName}
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View className="flex-row items-center justify-between border-t border-slate-200/60 pt-5 dark:border-slate-700/60">
              {/* Status Badge */}
              <View
                className={`flex-row items-center gap-2 rounded-xl px-4 py-2 ${sm.bg} ${sm.darkBg} border border-white/40 shadow-sm dark:border-white/5`}>
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: sm.dot }} />
                <Text
                  className={`text-[12px] font-black uppercase tracking-widest ${sm.text} ${sm.darkText}`}>
                  {issue.status.replace(/_/g, ' ')}
                </Text>
              </View>

              {/* SLA Timer & Arrow */}
              <View className="flex-row items-center gap-3.5">
                <View
                  className={`flex-row items-center gap-2 rounded-xl border px-4 py-2 shadow-sm ${
                    isOverdue
                      ? 'border-red-300/50 bg-red-50 dark:border-red-800/50 dark:bg-red-900/40'
                      : isUrgent
                        ? 'border-amber-300/50 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/40'
                        : 'border-white/60 bg-white/50 dark:border-slate-700/50 dark:bg-slate-800/80'
                  }`}>
                  <Clock
                    color={
                      isOverdue ? '#DC2626' : isUrgent ? '#F59E0B' : isDark ? '#94A3B8' : '#64748B'
                    }
                    size={14}
                    strokeWidth={2.5}
                  />
                  <Text
                    className={`text-[13px] font-black tracking-wider ${
                      isOverdue
                        ? 'text-red-600 dark:text-red-400'
                        : isUrgent
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-700 dark:text-slate-200'
                    }`}>
                    {timeRemaining}
                  </Text>
                </View>

                {/* Glassmorphic Arrow Button */}
                <View className="h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/80 shadow-sm dark:border-slate-700/50 dark:bg-slate-800">
                  <ChevronRight color={isDark ? '#F8FAFC' : '#0F172A'} size={20} strokeWidth={3} />
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  cardGradient: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  ambientOrb: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    transform: [{ scale: 1.5 }],
  },
});
