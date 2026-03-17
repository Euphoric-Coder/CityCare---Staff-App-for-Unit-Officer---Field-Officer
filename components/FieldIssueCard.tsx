import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  MapPin,
  Clock,
  TriangleAlert as AlertTriangle,
  User,
  Navigation,
  Tag,
  ChevronRight,
  Flame,
} from 'lucide-react-native';
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
  Assigned: {
    bg: 'bg-teal-100',
    darkBg: 'dark:bg-teal-900/40',
    text: 'text-teal-700',
    darkText: 'dark:text-teal-300',
    dot: '#0D9488',
  },
  'In Progress': {
    bg: 'bg-amber-100',
    darkBg: 'dark:bg-amber-900/40',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-300',
    dot: '#F59E0B',
  },
  'Pending UO Verification': {
    bg: 'bg-blue-100',
    darkBg: 'dark:bg-blue-900/40',
    text: 'text-blue-700',
    darkText: 'dark:text-blue-300',
    dot: '#3B82F6',
  },
  'Rework Required': {
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
  Critical: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
    dot: '#DC2626',
  },
  High: {
    bg: 'bg-orange-100',
    darkBg: 'dark:bg-orange-900/40',
    text: 'text-orange-700',
    darkText: 'dark:text-orange-300',
    dot: '#F97316',
  },
  Medium: {
    bg: 'bg-amber-100',
    darkBg: 'dark:bg-amber-900/40',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-300',
    dot: '#F59E0B',
  },
  Low: {
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
    darkBg: 'dark:bg-slate-700/40',
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

export default function FieldIssueCard({ issue, onPress }: FieldIssueCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

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

  const sm = STATUS_META[issue.status] ?? {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-700/50',
    text: 'text-slate-600',
    darkText: 'dark:text-slate-400',
    dot: '#94A3B8',
  };
  const pm = PRIORITY_META[issue.priority] ?? PRIORITY_META.Low;
  const cm = CATEGORY_META[issue.category] ?? {
    bg: 'bg-slate-50',
    darkBg: 'dark:bg-slate-800',
    text: 'text-slate-500',
    darkText: 'dark:text-slate-400',
  };

  const borderClass = isOverdue
    ? 'border-red-300 dark:border-red-700/60'
    : isUrgent
      ? 'border-amber-300 dark:border-amber-700/60'
      : 'border-slate-100 dark:border-slate-700/60';

  return (
    <TouchableOpacity
      onPress={() => onPress(issue)}
      activeOpacity={0.78}
      className={`mb-3 overflow-hidden rounded-3xl border bg-white dark:bg-slate-800 ${borderClass}`}
      style={styles.card}>
      {/* Overdue / urgent banners */}
      {isOverdue && (
        <View className="flex-row items-center gap-1.5 bg-red-500 px-4 py-1.5 dark:bg-red-700">
          <Flame color="#FFFFFF" size={11} strokeWidth={2.5} />
          <Text className="text-[10px] font-extrabold tracking-wider text-white">SLA OVERDUE</Text>
        </View>
      )}
      {!isOverdue && isUrgent && (
        <View className="flex-row items-center gap-1.5 bg-amber-400 px-4 py-1.5 dark:bg-amber-700">
          <AlertTriangle color="#FFFFFF" size={11} strokeWidth={2.5} />
          <Text className="text-[10px] font-extrabold tracking-wider text-white">
            SLA CRITICAL — UNDER 3 HRS
          </Text>
        </View>
      )}

      <View className="p-4">
        {/* Category + Priority row */}
        <View className="mb-3 flex-row items-center justify-between">
          <View
            className={`flex-row items-center gap-1.5 rounded-lg px-2.5 py-1 ${cm.bg} ${cm.darkBg}`}>
            <Tag size={10} strokeWidth={2.5} color={undefined} />
            <Text className={`text-[10px] font-extrabold tracking-wide ${cm.text} ${cm.darkText}`}>
              {issue.category.toUpperCase()}
            </Text>
          </View>
          <View
            className={`flex-row items-center gap-1 rounded-lg px-2.5 py-1 ${pm.bg} ${pm.darkBg}`}>
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pm.dot }} />
            <Text className={`text-[10px] font-extrabold ${pm.text} ${pm.darkText}`}>
              {issue.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text
          className="mb-3 text-[16px] font-extrabold leading-[22px] text-slate-900 dark:text-slate-50"
          numberOfLines={2}>
          {issue.title}
        </Text>

        {/* Location + Distance */}
        <View className="mb-3 flex-row items-center justify-between">
          <View className="mr-3 flex-1 flex-row items-center gap-1.5">
            <MapPin color="#9CA3AF" size={13} strokeWidth={2} />
            <Text
              className="flex-1 text-[12px] text-slate-500 dark:text-slate-400"
              numberOfLines={1}>
              {issue.location}
            </Text>
          </View>
          <View className="flex-row items-center gap-1 rounded-xl border border-teal-100 bg-teal-50 px-2.5 py-1 dark:border-teal-800/50 dark:bg-teal-900/30">
            <Navigation color="#0D9488" size={11} strokeWidth={2.5} />
            <Text className="text-[11px] font-extrabold text-teal-700 dark:text-teal-400">
              {distance.toFixed(1)} km
            </Text>
          </View>
        </View>

        {/* Citizen */}
        <View className="mb-4 flex-row items-center gap-1.5">
          <View className="h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <User color="#94A3B8" size={10} strokeWidth={2} />
          </View>
          <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
            {issue.citizenName}
          </Text>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700/70">
          {/* Status badge */}
          <View
            className={`flex-row items-center gap-1 rounded-xl px-2.5 py-1.5 ${sm.bg} ${sm.darkBg}`}>
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sm.dot }} />
            <Text className={`text-[10px] font-extrabold ${sm.text} ${sm.darkText}`}>
              {issue.status}
            </Text>
          </View>

          {/* SLA timer */}
          <View
            className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
              isOverdue
                ? 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/30'
                : isUrgent
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/30'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50'
            }`}>
            <Clock
              color={isOverdue ? '#DC2626' : isUrgent ? '#F59E0B' : '#94A3B8'}
              size={12}
              strokeWidth={2.5}
            />
            <Text
              className={`text-[11px] font-extrabold ${
                isOverdue
                  ? 'text-red-600 dark:text-red-400'
                  : isUrgent
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
              }`}>
              {timeRemaining}
            </Text>
          </View>

          {/* Arrow */}
          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <ChevronRight color="#6B7280" size={14} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
});
