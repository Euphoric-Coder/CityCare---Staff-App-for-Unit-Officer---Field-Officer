import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  Search,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle,
  Clock,
  FileText,
  ListFilter as Filter,
  ChevronDown,
  ChevronRight,
  Check,
  TrendingUp,
  MapPin,
  User as UserIcon,
  Calendar,
  UserCheck,
  X,
  Tag,
  Layers,
  TriangleAlert as AlertTriangle,
  SlidersHorizontal,
  Zap,
  Droplets,
  Trash2,
  Recycle,
  Package,
  HeartPulse,
  MoreHorizontal,
} from 'lucide-react-native';
import {
  Issue,
  IssueStatus,
  IssueCategory,
  IssueSubCategory,
  IssuePriority,
  StatusKey,
  StatusMeta,
  PriorityKey,
  PriorityMeta,
  CategoryKey,
  Meta,
  SLAKey,
  SLAMeta,
} from '../lib/types';
import {
  mockDashboardStats as mockStats,
  mockUnitOfficerNotifications,
  mockDuplicateGroups,
} from '../lib/mockData';
import { useNavigation } from '@react-navigation/native';
import DuplicateDetectionBanner from '../components/DuplicateDetectionBanner';
import { DuplicateGroup } from '../lib/types';
import NotificationPanel from 'components/NotificationPanel';
import { User } from '../lib/auth';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { mapIssueToUI } from 'lib/issueMapper';
import { useUser } from 'context/UserContext';

interface UnitOfficerDashboardProps {
  user: User;
}

const STATUS_OPTIONS: (StatusKey | 'all')[] = [
  'all',
  'pending',
  'verified',
  'assigned',
  'in_progress',
  'pending_uo_verification',
  'rework_required',
  'reopened',
  'escalated',
  'closed',
  'rejected',
];

const STATUS_LABEL_MAP: Record<StatusKey | 'all', string> = {
  all: 'All',
  pending: 'Pending',
  verified: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  pending_uo_verification: 'Pending UO Verification',
  rework_required: 'Rework Required',
  reopened: 'Reopened',
  escalated: 'Escalated',
  closed: 'Closed',
  rejected: 'Rejected',
};

export const CATEGORY_OPTIONS: (string | 'All')[] = [
  'All',
  'road',
  'electricity',
  'water',
  'sanitation',
  'drainage',
  'solid_waste',
  'public_health',
  'other',
];

export const CATEGORY_LABEL_MAP: Record<string, string> = {
  road: 'Road & Infrastructure',
  electricity: 'Electricity & Lighting',
  water: 'Water Supply',
  sanitation: 'Sanitation & Waste',
  drainage: 'Drainage & Sewer',
  solid_waste: 'Solid Waste Management',
  public_health: 'Public Health',
  other: 'Other',
};

export const SUBCATEGORY_MAP: Record<CategoryKey, IssueSubCategory[]> = {
  sanitation: [
    'Waste Collection',
    'Drain Cleaning',
    'Public Toilet Maintenance',
    'Garbage Segregation',
    'Sewage Handling',
  ],

  road: [
    'Pothole Repair',
    'Asphalt Laying',
    'Footpath Repair',
    'Speed Breaker Construction',
    'Road Marking',
  ],

  water: [
    'Pipeline Repair',
    'Leakage Detection',
    'Valve Maintenance',
    'Tanker Management',
    'Water Quality Testing',
  ],

  electricity: [
    'Street Light Repair',
    'Cable Maintenance',
    'Transformer Inspection',
    'Meter Repair',
  ],

  drainage: ['Manhole Cleaning', 'Flood Prevention', 'Storm Water Management', 'Sewer Line Repair'],

  solid_waste: ['Dumping Site Management', 'Waste Transportation', 'Recycling Operations'],

  public_health: [
    'Mosquito Control',
    'Disinfection',
    'Disease Prevention',
    'Sanitation Inspection',
  ],

  other: ['General Issue'],
};

const PRIORITY_OPTIONS: (IssuePriority | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low'];

type SLAFilter = 'All' | 'Overdue' | 'Due Soon' | 'On Track';
const SLA_OPTIONS: SLAFilter[] = ['All', 'Overdue', 'Due Soon', 'On Track'];

const STATUS_META: Record<StatusKey, StatusMeta> = {
  all: {
    bg: 'bg-blue-100',
    darkBg: 'dark:bg-blue-900/40',
    text: 'text-blue-700',
    darkText: 'dark:text-blue-300',
    dot: '#3B82F6',
    border: 'border-blue-200 dark:border-blue-800',
  },
  pending: {
    bg: 'bg-amber-100',
    darkBg: 'dark:bg-amber-900/40',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-300',
    dot: '#F59E0B',
    border: 'border-amber-200 dark:border-amber-800',
  },
  verified: {
    bg: 'bg-emerald-100',
    darkBg: 'dark:bg-emerald-900/40',
    text: 'text-emerald-700',
    darkText: 'dark:text-emerald-300',
    dot: '#10B981',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  assigned: {
    bg: 'bg-blue-100',
    darkBg: 'dark:bg-blue-900/40',
    text: 'text-blue-700',
    darkText: 'dark:text-blue-300',
    dot: '#3B82F6',
    border: 'border-blue-200 dark:border-blue-800',
  },
  in_progress: {
    bg: 'bg-violet-100',
    darkBg: 'dark:bg-violet-900/40',
    text: 'text-violet-700',
    darkText: 'dark:text-violet-300',
    dot: '#8B5CF6',
    border: 'border-violet-200 dark:border-violet-800',
  },
  pending_uo_verification: {
    bg: 'bg-amber-500',
    darkBg: 'dark:bg-amber-800',
    text: 'text-white',
    darkText: 'dark:text-white',
    dot: '#FFFFFF',
    border: 'border-amber-400 dark:border-amber-500',
  },
  rework_required: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
    dot: '#EF4444',
    border: 'border-red-200 dark:border-red-800',
  },
  reopened: {
    bg: 'bg-orange-100',
    darkBg: 'dark:bg-orange-900/40',
    text: 'text-orange-700',
    darkText: 'dark:text-orange-300',
    dot: '#F97316',
    border: 'border-orange-200 dark:border-orange-800',
  },
  escalated: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-800',
    darkText: 'dark:text-red-300',
    dot: '#DC2626',
    border: 'border-red-200 dark:border-red-800',
  },
  resolved: {
    bg: 'bg-emerald-500',
    darkBg: 'dark:bg-emerald-800',
    text: 'text-white',
    darkText: 'dark:text-white',
    dot: '#FFFFFF',
    border: 'border-emerald-400 dark:border-emerald-600',
  },
  closed: {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-700/50',
    text: 'text-slate-600',
    darkText: 'dark:text-slate-400',
    dot: '#94A3B8',
    border: 'border-slate-200 dark:border-slate-600',
  },
  rejected: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-900',
    darkText: 'dark:text-red-400',
    dot: '#991B1B',
    border: 'border-red-200 dark:border-red-800',
  },
};

const PRIORITY_META: Record<PriorityKey, PriorityMeta> = {
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

const CATEGORY_META: Record<CategoryKey, Meta> = {
  road: {
    bg: 'bg-blue-100',
    darkBg: 'dark:bg-blue-900/40',
    text: 'text-blue-700',
    darkText: 'dark:text-blue-300',
  },
  electricity: {
    bg: 'bg-yellow-100',
    darkBg: 'dark:bg-yellow-900/40',
    text: 'text-yellow-700',
    darkText: 'dark:text-yellow-300',
  },
  water: {
    bg: 'bg-cyan-100',
    darkBg: 'dark:bg-cyan-900/40',
    text: 'text-cyan-700',
    darkText: 'dark:text-cyan-300',
  },
  sanitation: {
    bg: 'bg-green-100',
    darkBg: 'dark:bg-green-900/40',
    text: 'text-green-700',
    darkText: 'dark:text-green-300',
  },
  drainage: {
    bg: 'bg-purple-100',
    darkBg: 'dark:bg-purple-900/40',
    text: 'text-purple-700',
    darkText: 'dark:text-purple-300',
  },
  solid_waste: {
    bg: 'bg-orange-100',
    darkBg: 'dark:bg-orange-900/40',
    text: 'text-orange-700',
    darkText: 'dark:text-orange-300',
  },
  public_health: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
  },
  other: {
    bg: 'bg-gray-100',
    darkBg: 'dark:bg-gray-700/50',
    text: 'text-gray-700',
    darkText: 'dark:text-gray-300',
  },
};

const SLA_META: Record<SLAKey, SLAMeta> = {
  all: {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-700/50',
    text: 'text-slate-600',
    darkText: 'dark:text-slate-300',
    dot: '#94A3B8',
  },
  overdue: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
    dot: '#DC2626',
  },
  due_soon: {
    bg: 'bg-amber-100',
    darkBg: 'dark:bg-amber-900/40',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-300',
    dot: '#F59E0B',
  },
  on_track: {
    bg: 'bg-emerald-100',
    darkBg: 'dark:bg-emerald-900/40',
    text: 'text-emerald-700',
    darkText: 'dark:text-emerald-300',
    dot: '#10B981',
  },
};

function getSlaStatus(slaDeadline?: string): SLAFilter {
  if (!slaDeadline) return 'On Track';
  const now = new Date();
  const deadline = new Date(slaDeadline);
  const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (diffHours < 0) return 'Overdue';
  if (diffHours < 48) return 'Due Soon';
  return 'On Track';
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatSlaDeadline(slaDeadline?: string): string | null {
  if (!slaDeadline) return null;
  const deadline = new Date(slaDeadline);
  return deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function IssueCard({ issue, onPress }: { issue: Issue; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const sm = STATUS_META[issue.status as StatusKey] ?? STATUS_META.pending;
  const pm = PRIORITY_META[issue.priority as PriorityKey] ?? PRIORITY_META.low;

  const getCategoryStyle = (categoryValue: string) => {
    switch (categoryValue) {
      case 'road': return { icon: MapPin, textClass: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200/50 dark:border-blue-500/30', hex: isDark ? '#60A5FA' : '#2563EB' };
      case 'electricity': return { icon: Zap, textClass: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200/50 dark:border-yellow-500/30', hex: isDark ? '#FACC15' : '#CA8A04' };
      case 'water': return { icon: Droplets, textClass: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200/50 dark:border-cyan-500/30', hex: isDark ? '#22D3EE' : '#0891B2' };
      case 'sanitation': return { icon: Trash2, textClass: 'text-green-600 dark:text-green-400', border: 'border-green-200/50 dark:border-green-500/30', hex: isDark ? '#4ADE80' : '#16A34A' };
      case 'drainage': return { icon: Recycle, textClass: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200/50 dark:border-purple-500/30', hex: isDark ? '#C084FC' : '#9333EA' };
      case 'solid_waste': return { icon: Package, textClass: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200/50 dark:border-orange-500/30', hex: isDark ? '#FB923C' : '#EA580C' };
      case 'public_health': return { icon: HeartPulse, textClass: 'text-red-600 dark:text-red-400', border: 'border-red-200/50 dark:border-red-500/30', hex: isDark ? '#F87171' : '#DC2626' };
      default: return { icon: MoreHorizontal, textClass: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200/50 dark:border-gray-500/30', hex: isDark ? '#9CA3AF' : '#4B5563' };
    }
  };
  const catStyle = getCategoryStyle(issue.category);
  const CategoryIcon = catStyle.icon;

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'pending': 
      case 'pending_uo_verification': return Clock;
      case 'verified': return CheckCircle;
      case 'assigned': return UserCheck;
      case 'in_progress': return TrendingUp;
      case 'rework_required': return AlertTriangle;
      case 'resolved':
      case 'closed': return CheckCircle;
      default: return AlertCircle;
    }
  };
  const StatusIcon = getStatusIcon(issue.status);
  
  const cm = CATEGORY_META[issue.category as CategoryKey] ?? CATEGORY_META.other;
  const slaStatus = getSlaStatus(issue.slaDeadline);
  const slaLabel = formatSlaDeadline(issue.slaDeadline);
  const isOverdue = slaStatus === 'Overdue';
  const isDueSoon = slaStatus === 'Due Soon';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        shadowColor: isDark ? '#000000' : '#475569',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: isDark ? 0.7 : 0.1,
        shadowRadius: 24,
        elevation: 8,
      }}
      className="mb-6 rounded-[30px] border border-white/80 bg-white/95 dark:border-slate-700/80 dark:bg-[#0F172A]">
      <View className="overflow-hidden rounded-[28px]">
      
      {/* EXTREME GLOWING PRIORITY STRIP ON THE LEFT */}
      <View className="absolute bottom-0 left-0 top-0 w-[5px] z-10" style={{ backgroundColor: pm.dot, opacity: isDark ? 1 : 1 }} />

      {/* SLA BANNER */}
      {isOverdue && (
        <LinearGradient
          colors={['#EF4444', '#9F1239']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="flex-row items-center justify-between px-5 py-3 pl-7">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-white/30 p-1.5 shadow-sm">
              <AlertTriangle color="#FFFFFF" size={12} strokeWidth={3} />
            </View>
            <Text className="text-[10px] font-black tracking-widest text-white">SLA OVERDUE</Text>
          </View>
          <View className="rounded-full bg-white px-2 py-1 shadow-sm">
             <Text className="text-[9px] font-black tracking-widest text-red-700">IMMEDIATE ACTION</Text>
          </View>
        </LinearGradient>
      )}
      {isDueSoon && !isOverdue && (
        <LinearGradient
          colors={['#F59E0B', '#92400E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="flex-row items-center justify-between px-5 py-3 pl-7">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-white/30 p-1.5 shadow-sm">
              <Clock color="#FFFFFF" size={12} strokeWidth={3} />
            </View>
            <Text className="text-[10px] font-black tracking-widest text-white">SLA DUE SOON</Text>
          </View>
        </LinearGradient>
      )}

      {/* BODY CONTENT */}
      <View className="px-5 py-5 pl-7">
        {/* PREMIUM TAG HEADERS */}
        <View className="mb-4 flex-row items-center justify-between gap-2">
          <View
            className={`flex-row flex-1 items-center gap-1.5 rounded-[14px] border px-2.5 py-1.5 shadow-sm ${cm.bg} ${cm.darkBg} ${catStyle.border}`}>
            <View className="rounded-full bg-white p-1 shadow-sm dark:bg-black/40">
              <CategoryIcon
                size={10}
                strokeWidth={2.5}
                color={catStyle.hex}
              />
            </View>
            <Text className={`flex-1 text-[10px] font-black tracking-widest ${catStyle.textClass}`} numberOfLines={1}>
              {CATEGORY_LABEL_MAP[issue.category]?.toUpperCase() ?? issue.category.toUpperCase()}
            </Text>
          </View>

          <View
            className={`flex-row items-center gap-1.5 rounded-[14px] border px-2.5 py-1.5 shadow-sm ${pm.bg} ${pm.darkBg} border-slate-200/50 dark:border-white/10 dark:bg-slate-800`}>
            <View
              className="h-2 w-2 rounded-full border border-white/50"
              style={{
                backgroundColor: pm.dot,
                shadowColor: pm.dot,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 1,
                shadowRadius: 3,
              }}
            />
            <Text className={`text-[10px] font-black tracking-widest ${pm.text} ${pm.darkText}`}>
              {issue.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* HERO TITLE */}
        <Text
          className="mb-4 text-[17px] font-black leading-[24px] tracking-tight text-slate-900 dark:text-white"
          numberOfLines={2}>
          {issue.title}
        </Text>

        {/* DATES MOVED TO TOP */}
        <View className="mb-5 flex-row flex-wrap items-center gap-2">
          <View className="flex-row items-center gap-1.5 rounded-[10px] border border-slate-200/60 bg-slate-50/80 px-2.5 py-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
            <Calendar color={isDark ? '#9CA3AF' : '#64748B'} size={11} strokeWidth={2.5} />
            <Text className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400">
              {formatRelativeDate(issue.dateReported)}
            </Text>
          </View>
          {slaLabel && !isOverdue && !isDueSoon && (
            <View className="flex-row items-center gap-1.5 rounded-[10px] border border-slate-200/60 bg-slate-50/80 px-2.5 py-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
              <Clock color={isDark ? '#9CA3AF' : '#64748B'} size={11} strokeWidth={2.5} />
              <Text className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400">
                {slaLabel}
              </Text>
            </View>
          )}
        </View>

        {/* ENHANCED METADATA BOX DEFINITE CONTRAST */}
        <View className="mb-5 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <View className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: catStyle.hex }} />
          <View className="flex-row items-start gap-3 border-b border-slate-100 p-3 pl-4 dark:border-slate-800">
            <View className="mt-0.5 rounded-[10px] bg-slate-50 p-1.5 shadow-sm dark:bg-slate-800">
              <MapPin color={isDark ? '#94A3B8' : '#475569'} size={14} strokeWidth={2.5} />
            </View>
            <View className="flex-1 justify-center pt-0.5">
              <Text
                className="text-[13px] font-black leading-[18px] text-slate-800 dark:text-slate-100"
                numberOfLines={2}>
                {[issue.city, issue.state, issue.postal].filter(Boolean).join(', ') || issue.location || issue.address || 'Location Unspecified'}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3 p-3 pl-4">
            <View className="rounded-[10px] bg-slate-50 p-1.5 shadow-sm dark:bg-slate-800">
              <UserIcon color={isDark ? '#94A3B8' : '#475569'} size={14} strokeWidth={2.5} />
            </View>
            <Text className="flex-1 text-[13px] font-black text-slate-800 dark:text-slate-100">
              {issue.citizenName}
            </Text>
          </View>
        </View>

        {/* DYNAMIC SUBCATEGORIES HIGH CONTRAST */}
        {issue.subCategories && issue.subCategories.length > 0 && (
          <View className="mb-5 flex-row flex-wrap gap-2">
            {issue.subCategories.slice(0, 3).map((sc) => (
              <View
                key={sc}
                className="rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 dark:border-slate-700/80 dark:bg-slate-800/80">
                <Text className="text-[9px] font-black tracking-wider text-slate-600 dark:text-slate-300">
                  {sc.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* PREMIUM ASSIGNED OFFICER POD */}
        {issue.assignedOfficer && (
          <LinearGradient
            colors={isDark ? ['#1E3A8A', '#312E81'] : ['#DBEAFE', '#EFF6FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="mb-5 flex-row items-center justify-between rounded-[22px] border border-blue-200 p-3.5 shadow-sm dark:border-blue-500/30">
            <View className="flex-row items-center gap-3.5">
              <View className="h-[42px] w-[42px] items-center justify-center rounded-2xl bg-white shadow-sm dark:border dark:border-blue-500/40 dark:bg-[#0F172A]">
                <UserCheck color={isDark ? '#60A5FA' : '#2563EB'} size={18} strokeWidth={2.5} />
              </View>
              <View>
                <Text className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
                  Assigned Officer
                </Text>
                <Text
                  className="mt-0.5 text-[14px] font-black text-blue-950 dark:text-white"
                  numberOfLines={1}>
                  {issue.assignedOfficer}
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* ELEGANT DIVIDER */}
        <View className="mb-4 h-[1px] w-full bg-slate-100 dark:bg-slate-800" />

        {/* BALANCED FOOTER */}
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500">
             ID: #{issue.id ? issue.id.slice(0, 6).toUpperCase() : 'ISSUE'}
          </Text>
          <View
            className={`flex-row shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 shadow-sm ${sm.bg} ${sm.darkBg} ${sm.border}`}>
            <StatusIcon size={12} strokeWidth={3} color={sm.text === 'text-white' || sm.bg.includes('500') ? '#FFFFFF' : sm.dot} />
            <Text className={`text-[10px] font-black tracking-widest ${sm.text} ${sm.darkText}`}>
              {STATUS_LABEL_MAP[issue.status as StatusKey]?.toUpperCase() ??
                issue.status.toUpperCase()}
            </Text>
          </View>
        </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface FilterState {
  status: StatusKey | 'all';
  sla: SLAFilter;
  category: CategoryKey | 'All';
  subCategory: IssueSubCategory | 'All';
  priority: IssuePriority | 'All';
}

type FilterSection = 'status' | 'sla' | 'category' | 'subcategory' | 'priority';

function FilterModal({
  visible,
  onClose,
  filters,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const [local, setLocal] = useState<FilterState>(filters);
  const [openSection, setOpenSection] = useState<FilterSection | null>('status');

  const availableSubcats: (IssueSubCategory | 'All')[] =
    local.category !== 'All' ? ['All', ...SUBCATEGORY_MAP[local.category]] : ['All'];

  const activeCount = [
    local.status !== 'All',
    local.sla !== 'All',
    local.category !== 'All',
    local.subCategory !== 'All',
    local.priority !== 'All',
  ].filter(Boolean).length;

  const handleApply = () => {
    onChange(local);
    onClose();
  };

  const handleReset = () => {
    const reset: FilterState = {
      status: 'All',
      sla: 'All',
      category: 'All',
      subCategory: 'All',
      priority: 'All',
    };
    setLocal(reset);
    onChange(reset);
  };

  const toggleSection = (s: FilterSection) => setOpenSection(openSection === s ? null : s);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          className="overflow-hidden rounded-t-3xl bg-white dark:bg-slate-900"
          style={styles.filterSheet}>
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 pb-4 pt-5 dark:border-slate-800">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/40">
                <SlidersHorizontal size={17} color="#0D9488" strokeWidth={2.5} />
              </View>
              <View>
                <Text className="text-[17px] font-extrabold text-slate-900 dark:text-slate-100">
                  Filters
                </Text>
                {activeCount > 0 && (
                  <Text className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                    {activeCount} active
                  </Text>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {activeCount > 0 && (
                <TouchableOpacity
                  onPress={handleReset}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                  <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
                    Reset
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <X size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* STATUS */}
            <FilterAccordion
              title="Status"
              icon={<CheckCircle size={15} color="#0D9488" strokeWidth={2.5} />}
              isOpen={openSection === 'status'}
              onToggle={() => toggleSection('status')}
              activeValue={local.status !== 'All' ? local.status : undefined}
              activeMeta={local.status !== 'All' ? STATUS_META[local.status] : undefined}>
              <View className="flex-row flex-wrap gap-2 px-5 pb-4">
                {STATUS_OPTIONS.map((s) => {
                  const key = s === 'all' ? 'pending' : s; // fallback meta
                  const m = STATUS_META[key];
                  const isActive = local.status === s;

                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setLocal({ ...local, status: s })}
                      className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
                        isActive
                          ? `${m.bg} ${m.darkBg} border-transparent`
                          : 'border-slate-200 bg-transparent dark:border-slate-700'
                      }`}>
                      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: m.dot }} />

                      <Text
                        className={`text-[12px] font-semibold ${
                          isActive
                            ? `${m.text} ${m.darkText}`
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                        {STATUS_LABEL_MAP[s]}
                      </Text>

                      {isActive && <Check size={11} color={m.dot} strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FilterAccordion>

            {/* SLA */}
            <FilterAccordion
              title="SLA Status"
              icon={<Clock size={15} color="#F59E0B" strokeWidth={2.5} />}
              isOpen={openSection === 'sla'}
              onToggle={() => toggleSection('sla')}
              activeValue={local.sla !== 'All' ? local.sla : undefined}
              activeMeta={
                local.status !== 'all' ? STATUS_META[local.status as StatusKey] : undefined
              }>
              <View className="flex-row flex-wrap gap-2 px-5 pb-4">
                {SLA_OPTIONS.map((s) => {
                  const m = SLA_META[s];
                  const isActive = local.sla === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setLocal({ ...local, sla: s })}
                      className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
                        isActive
                          ? `${m.bg} ${m.darkBg} border-transparent`
                          : 'border-slate-200 bg-transparent dark:border-slate-700'
                      }`}>
                      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: m.dot }} />
                      <Text
                        className={`text-[12px] font-semibold ${isActive ? `${m.text} ${m.darkText}` : 'text-slate-500 dark:text-slate-400'}`}>
                        {s}
                      </Text>
                      {isActive && <Check size={11} color={m.dot} strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FilterAccordion>

            {/* PRIORITY */}
            <FilterAccordion
              title="Priority"
              icon={<AlertTriangle size={15} color="#DC2626" strokeWidth={2.5} />}
              isOpen={openSection === 'priority'}
              onToggle={() => toggleSection('priority')}
              activeValue={local.priority !== 'All' ? local.priority : undefined}
              activeMeta={local.priority !== 'All' ? PRIORITY_META[local.priority] : undefined}>
              <View className="flex-row flex-wrap gap-2 px-5 pb-4">
                {PRIORITY_OPTIONS.map((p) => {
                  const m =
                    p !== 'All'
                      ? PRIORITY_META[p]
                      : {
                          bg: 'bg-slate-100',
                          darkBg: 'dark:bg-slate-700/50',
                          text: 'text-slate-600',
                          darkText: 'dark:text-slate-300',
                          dot: '#94A3B8',
                        };
                  const isActive = local.priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setLocal({ ...local, priority: p })}
                      className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
                        isActive
                          ? `${m.bg} ${m.darkBg} border-transparent`
                          : 'border-slate-200 bg-transparent dark:border-slate-700'
                      }`}>
                      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: m.dot }} />
                      <Text
                        className={`text-[12px] font-semibold ${isActive ? `${m.text} ${m.darkText}` : 'text-slate-500 dark:text-slate-400'}`}>
                        {p}
                      </Text>
                      {isActive && <Check size={11} color={m.dot} strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FilterAccordion>

            {/* CATEGORY */}
            <FilterAccordion
              title="Category"
              icon={<Tag size={15} color="#3B82F6" strokeWidth={2.5} />}
              isOpen={openSection === 'category'}
              onToggle={() => toggleSection('category')}
              activeValue={local.category !== 'All' ? local.category : undefined}
              activeMeta={local.category !== 'All' ? CATEGORY_META[local.category] : undefined}>
              <View className="flex-row flex-wrap gap-2 px-5 pb-4">
                {CATEGORY_OPTIONS.map((c) => {
                  const m =
                    c !== 'All'
                      ? CATEGORY_META[c]
                      : {
                          bg: 'bg-slate-100',
                          darkBg: 'dark:bg-slate-700/50',
                          text: 'text-slate-600',
                          darkText: 'dark:text-slate-300',
                        };
                  const isActive = local.category === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setLocal({ ...local, category: c, subCategory: 'All' })}
                      className={`rounded-xl border px-3 py-1.5 ${
                        isActive
                          ? `${m.bg} ${m.darkBg} border-transparent`
                          : 'border-slate-200 bg-transparent dark:border-slate-700'
                      }`}>
                      <Text
                        className={`text-[12px] font-semibold ${isActive ? `${m.text} ${m.darkText}` : 'text-slate-500 dark:text-slate-400'}`}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FilterAccordion>

            {/* SUBCATEGORY - only shown when category is selected */}
            {local.category !== 'All' && (
              <FilterAccordion
                title="Sub-Category"
                icon={<Layers size={15} color="#8B5CF6" strokeWidth={2.5} />}
                isOpen={openSection === 'subcategory'}
                onToggle={() => toggleSection('subcategory')}
                activeValue={local.subCategory !== 'All' ? local.subCategory : undefined}>
                <View className="flex-row flex-wrap gap-2 px-5 pb-4">
                  {availableSubcats.map((sc) => {
                    const isActive = local.subCategory === sc;
                    return (
                      <TouchableOpacity
                        key={sc}
                        onPress={() => setLocal({ ...local, subCategory: sc })}
                        className={`rounded-xl border px-3 py-1.5 ${
                          isActive
                            ? 'border-transparent bg-violet-100 dark:bg-violet-900/40'
                            : 'border-slate-200 bg-transparent dark:border-slate-700'
                        }`}>
                        <Text
                          className={`text-[12px] font-semibold ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {sc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </FilterAccordion>
            )}

            <View className="h-5" />
          </ScrollView>

          {/* Apply button */}
          <View className="mb-12 border-t border-slate-100 px-5 pb-6 pt-3 dark:border-slate-800">
            <TouchableOpacity
              onPress={handleApply}
              activeOpacity={0.85}
              className="overflow-hidden rounded-2xl">
              <LinearGradient
                colors={['#0D9488', '#0891B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 15,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                <Filter size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="text-[15px] font-extrabold text-white">
                  Apply Filters{activeCount > 0 ? ` (${activeCount})` : ''}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FilterAccordion({
  title,
  icon,
  isOpen,
  onToggle,
  activeValue,
  activeMeta,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  activeValue?: string;
  activeMeta?: { bg: string; darkBg: string; text: string; darkText: string };
  children: React.ReactNode;
}) {
  return (
    <View className="border-b border-slate-100 dark:border-slate-800">
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        className="flex-row items-center gap-3 px-5 py-3.5">
        <View className="h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
          {icon}
        </View>
        <Text className="flex-1 text-[14px] font-bold text-slate-800 dark:text-slate-200">
          {title}
        </Text>
        {activeValue && activeMeta && (
          <View className={`mr-1 rounded-lg px-2 py-0.5 ${activeMeta.bg} ${activeMeta.darkBg}`}>
            <Text
              className={`text-[10px] font-bold ${activeMeta.text} ${activeMeta.darkText}`}
              numberOfLines={1}>
              {activeValue}
            </Text>
          </View>
        )}
        <ChevronRight
          size={16}
          color="#9CA3AF"
          strokeWidth={2.5}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />
      </TouchableOpacity>
      {isOpen && children}
    </View>
  );
}

export default function UnitOfficerDashboard() {
  const user = useUser();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<any>();
  const unitOfficer = useQuery(
    api.unitOfficers.getUnitOfficerByUserId,
    // @ts-ignore
    user?.id ? { userId: user.id } : 'skip'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>(mockDuplicateGroups);

  const unreadNotifCount = mockUnitOfficerNotifications.filter((n) => !n.read).length;
  const [filters, setFilters] = useState<FilterState>({
    status: 'All',
    sla: 'All',
    category: 'All',
    subCategory: 'All',
    priority: 'All',
  });

  const activeFilterCount = [
    filters.status !== 'All',
    filters.sla !== 'All',
    filters.category !== 'All',
    filters.subCategory !== 'All',
    filters.priority !== 'All',
  ].filter(Boolean).length;

  const rawIssues = useQuery(
    api.unitOfficers.getUnitOfficerIssues,
    // @ts-ignore
    user?.id ? { userId: user.id } : 'skip'
  );

  const isLoading = rawIssues === undefined;

  // rawIssues?.forEach((issue, index) => {
  //   console.log(`Issue ${index + 1}:`);
  //   console.log(JSON.stringify(issue, null, 2));
  // });

  const issues = useMemo(() => {
    if (!rawIssues) return [];

    return rawIssues.map((issue) => mapIssueToUI(issue, {}));
  }, [rawIssues]);

  // console.log('USER ID:', user?.id);
  // console.log('RAW ISSUES:', rawIssues);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return issues.filter((issue) => {
      if (q) {
        const match =
          issue.title.toLowerCase().includes(q) ||
          issue.location.toLowerCase().includes(q) ||
          issue.citizenName.toLowerCase().includes(q) ||
          issue.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.status !== 'All' && issue.status !== filters.status) return false;
      if (filters.sla !== 'All' && getSlaStatus(issue.slaDeadline) !== filters.sla) return false;
      if (filters.category !== 'All' && issue.category !== filters.category) return false;
      if (filters.subCategory !== 'All') {
        const hasSub = issue.subCategories?.includes(filters.subCategory as IssueSubCategory);
        if (!hasSub) return false;
      }
      if (filters.priority !== 'All' && issue.priority !== filters.priority) return false;
      return true;
    });
  }, [issues, searchQuery, filters]);

  const overdueCount = useMemo(
    () => issues.filter((i) => getSlaStatus(i.slaDeadline) === 'Overdue').length,
    []
  );

  const stats = [
    {
      label: 'Total',
      value: mockStats.totalIssues,
      icon: <FileText color={isDark ? '#FFFFFF' : '#0284C7'} size={20} strokeWidth={2.5} />,
      iconBg: isDark ? 'rgba(255,255,255,0.15)' : '#E0F2FE',
    },
    {
      label: 'Pending',
      value: mockStats.pendingVerification,
      icon: <Clock color={isDark ? '#FDE047' : '#B45309'} size={20} strokeWidth={2.5} />,
      iconBg: isDark ? 'rgba(253,224,71,0.2)' : '#FEF3C7',
    },
    {
      label: 'Assigned',
      value: mockStats.assigned,
      icon: <AlertCircle color={isDark ? '#F9A8D4' : '#BE123C'} size={20} strokeWidth={2.5} />,
      iconBg: isDark ? 'rgba(249,168,212,0.2)' : '#FFE4E6',
    },
    {
      label: 'Closed',
      value: mockStats.closed,
      icon: <CheckCircle color={isDark ? '#6EE7B7' : '#047857'} size={20} strokeWidth={2.5} />,
      iconBg: isDark ? 'rgba(110,231,183,0.2)' : '#D1FAE5',
    },
  ];

  const activeStatus = filters.status !== 'All' ? STATUS_META[filters.status] : null;
  const activeSla = filters.sla !== 'All' ? SLA_META[filters.sla] : null;
  const activeCat = filters.category !== 'All' ? CATEGORY_META[filters.category] : null;
  const activePri = filters.priority !== 'All' ? PRIORITY_META[filters.priority] : null;

  if (!unitOfficer) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="mt-3 text-sm font-medium text-slate-400">
          Loading Unit Officer Dashboard...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ── HEADER ── */}
        <LinearGradient
          colors={isDark ? ['#164E63', '#083344', '#0E7490'] : ['#0891B2', '#06B6D4', '#22D3EE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          <View className="mb-6 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="mb-1 text-[13px] font-medium text-white/70">Welcome back,</Text>
              <Text className="mb-2.5 text-[26px] font-extrabold tracking-tight text-white">
                {unitOfficer?.fullName}
              </Text>
              <View className="flex-row items-center gap-1 self-start rounded-full bg-white/[0.16] px-2.5 py-1">
                <MapPin color="rgba(255,255,255,0.85)" size={10} strokeWidth={2.5} />
                <Text className="text-[11px] font-bold text-white">{unitOfficer?.city}</Text>
              </View>
            </View>
            <View className="items-end gap-2">
              <TouchableOpacity
                onPress={() => setShowNotifications(true)}
                activeOpacity={0.75}
                className="h-11 w-11 items-center justify-center rounded-[14px] bg-white/[0.16]">
                <Bell color="#FFFFFF" size={20} strokeWidth={2} />
                {unreadNotifCount > 0 && (
                  <View style={styles.bellDot}>
                    {unreadNotifCount <= 9 && (
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 8,
                          fontWeight: '800',
                          lineHeight: 10,
                        }}>
                        {unreadNotifCount}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
              {overdueCount > 0 && (
                <View className="flex-row items-center gap-1 rounded-full bg-red-500/80 px-2.5 py-1">
                  <AlertTriangle color="#FFFFFF" size={10} strokeWidth={2.5} />
                  <Text className="text-[11px] font-extrabold text-white">
                    {overdueCount} Overdue
                  </Text>
                </View>
              )}
              <View className="flex-row items-center gap-1 rounded-full bg-white/[0.14] px-2.5 py-1">
                <TrendingUp color="rgba(255,255,255,0.85)" size={10} strokeWidth={2.5} />
                <Text className="text-[11px] font-bold text-white">78% SLA</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row gap-2.5">
            {stats.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: s.iconBg }]}>{s.icon}</View>
                <Text className="text-2xl font-extrabold tracking-tight text-white">{s.value}</Text>
                <Text className="text-center text-[10px] font-semibold text-white/75">
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── BODY ── */}
        <View className="gap-3 bg-slate-50 px-4 pt-[18px] dark:bg-slate-900">
          {/* Duplicate Detection Banner */}
          <DuplicateDetectionBanner
            groups={duplicateGroups}
            // @ts-ignore
            onGroupResolved={(groupId) =>
              setDuplicateGroups((prev) =>
                prev.map((g) => (g.id === groupId ? { ...g, resolved: true } : g))
              )
            }
          />

          {/* Search */}
          <View
            className="flex-row items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 dark:border-slate-700 dark:bg-slate-800"
            style={styles.shadow}>
            <Search color="#9CA3AF" size={18} strokeWidth={2} />
            <TextInput
              className="flex-1 py-3.5 text-sm text-gray-900 dark:text-slate-100"
              placeholder="Search issues, locations, citizens..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className="h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-200 dark:bg-slate-700">
                <X size={11} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter trigger */}
          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            activeOpacity={0.8}
            className="flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800"
            style={styles.shadow}>
            <View className="flex-1 flex-row items-center gap-1.5">
              <SlidersHorizontal size={15} color="#0D9488" strokeWidth={2.5} />
              <Text className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                Filters
              </Text>
              {activeFilterCount > 0 && (
                <View className="ml-0.5 h-5 w-5 items-center justify-center rounded-full bg-teal-500">
                  <Text className="text-[10px] font-extrabold text-white">{activeFilterCount}</Text>
                </View>
              )}
            </View>

            {/* Active filter chips preview */}
            <View className="flex-1 flex-row justify-end gap-1.5">
              {activeStatus && (
                <View
                  className={`rounded-lg px-2 py-0.5 ${activeStatus.bg} ${activeStatus.darkBg}`}>
                  <Text
                    className={`text-[10px] font-bold ${activeStatus.text} ${activeStatus.darkText}`}
                    numberOfLines={1}>
                    {filters.status}
                  </Text>
                </View>
              )}
              {activeSla && (
                <View className={`rounded-lg px-2 py-0.5 ${activeSla.bg} ${activeSla.darkBg}`}>
                  <Text className={`text-[10px] font-bold ${activeSla.text} ${activeSla.darkText}`}>
                    {filters.sla}
                  </Text>
                </View>
              )}
              {activeCat && (
                <View className={`rounded-lg px-2 py-0.5 ${activeCat.bg} ${activeCat.darkBg}`}>
                  <Text
                    className={`text-[10px] font-bold ${activeCat.text} ${activeCat.darkText}`}
                    numberOfLines={1}>
                    {filters.category}
                  </Text>
                </View>
              )}
              {activePri && (
                <View className={`rounded-lg px-2 py-0.5 ${activePri.bg} ${activePri.darkBg}`}>
                  <Text className={`text-[10px] font-bold ${activePri.text} ${activePri.darkText}`}>
                    {filters.priority}
                  </Text>
                </View>
              )}
            </View>

            <ChevronDown size={15} color="#9CA3AF" strokeWidth={2} />
          </TouchableOpacity>

          {/* Issues header */}
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-[18px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {filters.status !== 'All' ? filters.status : 'All Issues'}
            </Text>
            <View className="rounded-full bg-blue-100 px-2.5 py-1 dark:bg-blue-900/40">
              <Text className="text-xs font-bold text-blue-700 dark:text-blue-300">
                {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
              </Text>
            </View>
          </View>

          {/* Issue list */}
          {isLoading ? (
            <View className="gap-3">
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700"
                />
              ))}
            </View>
          ) : filteredIssues.length === 0 ? (
            <View className="items-center gap-3 py-14">
              <View className="mb-1 h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800">
                <FileText color="#D1D5DB" size={40} strokeWidth={1.5} />
              </View>
              <Text className="text-[17px] font-bold text-slate-500 dark:text-slate-600">
                No issues found
              </Text>
              <Text className="text-center text-[13px] leading-5 text-slate-400 dark:text-slate-600">
                Try adjusting your filters or search query
              </Text>
            </View>
          ) : (
            filteredIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onPress={() =>
                  navigation.navigate('IssueDetail' as never, { issueId: issue.id } as never)
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onChange={setFilters}
      /> */}

      <NotificationPanel
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={mockUnitOfficerNotifications}
        role="UnitOfficer"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F87171',
    borderWidth: 1.5,
    borderColor: 'rgba(15,118,110,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  filterSheet: {
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
});
