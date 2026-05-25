import React, { useState, useMemo, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  LinearTransition,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { KeyboardAvoidingView } from 'react-native';
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
  XCircle,
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
  Hash,
  RefreshCw,
  Star,
  Activity,
  Mail,
  Phone,
  Award,
  PieChart,
  ShieldCheck,
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
  MappedIssue,
} from 'lib/types';
import { mockDashboardStats as mockStats, mockDuplicateGroups } from 'lib/mockData';
import { useNavigation } from '@react-navigation/native';
import DuplicateDetectionBanner from 'components/UnitOfficer/DuplicateDetectionBanner';
import { DuplicateGroup } from 'lib/types';
import NotificationPanel from 'components/NotificationPanel';
import { User } from 'lib/auth';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { mapIssueToUI } from 'lib/issueMapper';
import { useUser } from 'context/UserContext';
import { Id } from 'convex/_generated/dataModel';
import { buildDuplicateGroupsFromIssues } from 'lib/duplicateDetection';

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
  'resolved',
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
  resolved: 'Closed',
  rejected: 'Rejected',
  resolved: 'Resolved',
  withdrawn: 'Withdrawn',
};

export const CATEGORY_OPTIONS: (string | 'all')[] = [
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

const PRIORITY_OPTIONS: (IssuePriority | 'all')[] = ['all', 'critical', 'high', 'medium', 'low'];

type SLAFilter = 'all' | 'overdue' | 'due_soon' | 'on_track';
const SLA_OPTIONS: SLAFilter[] = ['all', 'overdue', 'due_soon', 'on_track'];

const STATUS_META: Record<StatusKey, StatusMeta> = {
  all: {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-800/40',
    text: 'text-slate-700',
    darkText: 'dark:text-slate-300',
    dot: '#64748B',
    border: 'border-slate-200 dark:border-slate-800',
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
    bg: 'bg-cyan-100',
    darkBg: 'dark:bg-cyan-900/40',
    text: 'text-cyan-700',
    darkText: 'dark:text-cyan-300',
    dot: '#06B6D4',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  assigned: {
    bg: 'bg-indigo-100',
    darkBg: 'dark:bg-indigo-900/40',
    text: 'text-indigo-700',
    darkText: 'dark:text-indigo-300',
    dot: '#6366F1',
    border: 'border-indigo-200 dark:border-indigo-800',
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
    bg: 'bg-orange-100',
    darkBg: 'dark:bg-orange-900/40',
    text: 'text-orange-700',
    darkText: 'dark:text-orange-300',
    dot: '#F97316',
    border: 'border-orange-200 dark:border-orange-800',
  },
  rework_required: {
    bg: 'bg-pink-100',
    darkBg: 'dark:bg-pink-900/40',
    text: 'text-pink-700',
    darkText: 'dark:text-pink-300',
    dot: '#EC4899',
    border: 'border-pink-200 dark:border-pink-800',
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
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
    dot: '#EF4444',
    border: 'border-red-200 dark:border-red-800',
  },
  resolved: {
    bg: 'bg-emerald-100',
    darkBg: 'dark:bg-emerald-900/40',
    text: 'text-emerald-700',
    darkText: 'dark:text-emerald-300',
    dot: '#10B981',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  resolved: {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-700/50',
    text: 'text-slate-600',
    darkText: 'dark:text-slate-400',
    dot: '#64748B',
    border: 'border-slate-200 dark:border-slate-600',
  },
  rejected: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-700',
    darkText: 'dark:text-red-400',
    dot: '#EF4444',
    border: 'border-red-200 dark:border-red-800',
  },
  withdrawn: {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-800/40',
    text: 'text-slate-700',
    darkText: 'dark:text-slate-300',
    dot: '#64748B',
    border: 'border-slate-200 dark:border-slate-800',
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
  if (!slaDeadline) return 'on_track';
  const now = new Date();
  const deadline = new Date(slaDeadline);
  const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) return 'overdue';
  if (diffHours < 48) return 'due_soon';
  return 'on_track';
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

function IssueCard({ issue, onPress }: { issue: MappedIssue; onPress: () => void }) {
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const sm = STATUS_META[issue?.status as StatusKey] ?? STATUS_META.pending;
  const pm = PRIORITY_META[issue?.priority as PriorityKey] ?? PRIORITY_META.low;

  const getStatusStyle = (statusValue: string) => {
    switch (statusValue) {
      case 'pending':
        return {
          hex: '#F59E0B',
          bg: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
          border: isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.3)',
          glow: 'rgba(245, 158, 11, 0.6)',
        };
      case 'verified':
        return {
          hex: '#06B6D4',
          bg: isDark ? 'rgba(6, 182, 212, 0.12)' : '#ECFEFF',
          border: isDark ? 'rgba(6, 182, 212, 0.4)' : 'rgba(6, 182, 212, 0.3)',
          glow: 'rgba(6, 182, 212, 0.6)',
        };
      case 'assigned':
        return {
          hex: '#6366F1',
          bg: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
          border: isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)',
          glow: 'rgba(99, 102, 241, 0.6)',
        };
      case 'in_progress':
        return {
          hex: '#8B5CF6', // Violet
          bg: isDark ? 'rgba(139, 92, 246, 0.12)' : '#F5F3FF',
          border: isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.3)',
          glow: 'rgba(139, 92, 246, 0.6)',
        };
      case 'pending_uo_verification':
        return {
          hex: '#F97316',
          bg: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
          border: isDark ? 'rgba(249, 115, 22, 0.5)' : 'rgba(249, 115, 22, 0.4)',
          glow: 'rgba(249, 115, 22, 0.7)',
        };
      case 'rework_required':
        return {
          hex: '#EC4899',
          bg: isDark ? 'rgba(236, 72, 153, 0.12)' : '#FDF2F8',
          border: isDark ? 'rgba(236, 72, 153, 0.4)' : 'rgba(236, 72, 153, 0.3)',
          glow: 'rgba(236, 72, 153, 0.6)',
        };
      case 'reopened':
        return {
          hex: '#F97316',
          bg: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
          border: isDark ? 'rgba(249, 115, 22, 0.5)' : 'rgba(249, 115, 22, 0.4)',
          glow: 'rgba(249, 115, 22, 0.7)',
        };
      case 'escalated':
        return {
          hex: '#EF4444',
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
          border: isDark ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.4)',
          glow: 'rgba(239, 68, 68, 0.7)',
        };
      case 'resolved':
        return {
          hex: '#10B981',
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4',
          border: isDark ? 'rgba(16, 185, 129, 0.5)' : 'rgba(16, 185, 129, 0.4)',
          glow: 'rgba(16, 185, 129, 0.7)',
        };
      case 'rejected':
        return {
          hex: '#EF4444',
          bg: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
          border: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)',
          glow: 'rgba(239, 68, 68, 0.6)',
        };
      case 'withdrawn':
        return {
          hex: '#64748B',
          bg: isDark ? 'rgba(100, 116, 139, 0.12)' : '#F8FAFC',
          border: isDark ? 'rgba(100, 116, 139, 0.4)' : 'rgba(100, 116, 139, 0.3)',
          glow: 'rgba(100, 116, 139, 0.6)',
        };
      case 'resolved':
        return {
          hex: '#64748B',
          bg: isDark ? 'rgba(100, 116, 139, 0.08)' : '#F8FAFC',
          border: isDark ? 'rgba(100, 116, 139, 0.3)' : 'rgba(100, 116, 139, 0.2)',
          glow: 'rgba(100, 116, 139, 0.4)',
        };
      default:
        return {
          hex: '#3B82F6',
          bg: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
          border: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)',
          glow: 'rgba(59, 130, 246, 0.6)',
        };
    }
  };

  const getCategoryStyle = (categoryValue: string) => {
    switch (categoryValue) {
      case 'road':
        return {
          icon: MapPin,
          textClass: 'text-blue-600 dark:text-blue-400',
          border: 'border-blue-200/50 dark:border-blue-500/30',
          hex: isDark ? '#60A5FA' : '#2563EB',
          bg: isDark ? 'rgba(37, 99, 235, 0.05)' : '#EFF6FF',
          iconBg: isDark ? 'rgba(37, 99, 235, 0.15)' : '#DBEAFE',
        };
      case 'electricity':
        return {
          icon: Zap,
          textClass: 'text-yellow-600 dark:text-yellow-400',
          border: 'border-yellow-200/50 dark:border-yellow-500/30',
          hex: isDark ? '#FACC15' : '#CA8A04',
          bg: isDark ? 'rgba(202, 138, 4, 0.05)' : '#FEFCE8',
          iconBg: isDark ? 'rgba(202, 138, 4, 0.15)' : '#FEF9C3',
        };
      case 'water':
        return {
          icon: Droplets,
          textClass: 'text-cyan-600 dark:text-cyan-400',
          border: 'border-cyan-200/50 dark:border-cyan-500/30',
          hex: isDark ? '#22D3EE' : '#0891B2',
          bg: isDark ? 'rgba(8, 145, 178, 0.05)' : '#ECFEFF',
          iconBg: isDark ? 'rgba(8, 145, 178, 0.15)' : '#CFFAFE',
        };
      case 'sanitation':
        return {
          icon: Trash2,
          textClass: 'text-green-600 dark:text-green-400',
          border: 'border-green-200/50 dark:border-green-500/30',
          hex: isDark ? '#4ADE80' : '#16A34A',
          bg: isDark ? 'rgba(22, 163, 74, 0.05)' : '#F0FDF4',
          iconBg: isDark ? 'rgba(22, 163, 74, 0.15)' : '#DCFCE7',
        };
      case 'drainage':
        return {
          icon: Recycle,
          textClass: 'text-purple-600 dark:text-purple-400',
          border: 'border-purple-200/50 dark:border-purple-500/30',
          hex: isDark ? '#C084FC' : '#9333EA',
          bg: isDark ? 'rgba(147, 51, 234, 0.05)' : '#FAF5FF',
          iconBg: isDark ? 'rgba(147, 51, 234, 0.15)' : '#F3E8FF',
        };
      case 'solid_waste':
        return {
          icon: Package,
          textClass: 'text-orange-600 dark:text-orange-400',
          border: 'border-orange-200/50 dark:border-orange-500/30',
          hex: isDark ? '#FB923C' : '#EA580C',
          bg: isDark ? 'rgba(234, 88, 12, 0.05)' : '#FFF7ED',
          iconBg: isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFEDD5',
        };
      case 'public_health':
        return {
          icon: HeartPulse,
          textClass: 'text-red-600 dark:text-red-400',
          border: 'border-red-200/50 dark:border-red-500/30',
          hex: isDark ? '#F87171' : '#DC2626',
          bg: isDark ? 'rgba(220, 38, 38, 0.05)' : '#FEF2F2',
          iconBg: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2',
        };
      default:
        return {
          icon: MoreHorizontal,
          textClass: 'text-gray-600 dark:text-gray-400',
          border: 'border-gray-200/50 dark:border-gray-500/30',
          hex: isDark ? '#9CA3AF' : '#4B5563',
          bg: isDark ? 'rgba(75, 85, 99, 0.05)' : '#F8FAFC',
          iconBg: isDark ? (isDark ? 'rgba(75, 85, 99, 0.15)' : '#F1F5F9') : '#F1F5F9',
        };
    }
  };

  const statusStyle = getStatusStyle(issue?.status);
  const catStyle = getCategoryStyle(issue?.category);
  const CategoryIcon = catStyle.icon;

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'pending':
      case 'pending_uo_verification':
        return Clock;
      case 'verified':
        return CheckCircle;
      case 'assigned':
        return UserCheck;
      case 'in_progress':
        return TrendingUp;
      case 'rework_required':
        return AlertTriangle;
      case 'reopened':
        return RefreshCw;
      case 'escalated':
        return TrendingUp;
      case 'resolved':
        return CheckCircle;
      case 'withdrawn':
      case 'rejected':
        return XCircle;
      default:
        return AlertCircle;
    }
  };
  const StatusIcon = getStatusIcon(issue?.status);

  const cm = CATEGORY_META[issue?.category as CategoryKey] ?? CATEGORY_META.other;
  const slaStatus = getSlaStatus(issue?.slaDeadline ?? undefined);
  const slaLabel = formatSlaDeadline(issue?.slaDeadline ?? undefined);
  const isOverdue = slaStatus === 'overdue';
  const isDueSoon = slaStatus === 'due_soon';

  return (
    <View
      style={{
        shadowColor: statusStyle.hex,
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: isDark ? 0.5 : 0.2,
        shadowRadius: 40,
        elevation: 20,
        marginBottom: 32,
      }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{
          backgroundColor: isDark ? '#020617' : '#FFFFFF',
          borderColor: statusStyle.border,
          borderWidth: 2.5,
          borderRadius: 40,
          overflow: 'hidden',
        }}>
        {/* Status Ambient Tint Layer */}
        <View
          style={{
            backgroundColor: statusStyle.bg,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Dynamic Glow Aura (Status Based) */}
        <View
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: statusStyle.hex,
            opacity: isDark ? 0.15 : 0.08,
          }}
        />

        {/* Priority Level Indicator Strip (Side) */}
        <View
          className="absolute bottom-0 left-0 top-0 z-20 w-[10px]"
          style={{
            backgroundColor: pm.dot,
            shadowOffset: { width: 4, height: 0 },
          }}
        />

        {/* Card Content */}
        <View className="py-8 pl-10 pr-6">
          {/* High-Fidelity SLA Alert Pod */}
          {/* High-Fidelity SLA Alert Pod (Overdue) */}
          {isOverdue && (
            <View
              className="mb-6 overflow-hidden rounded-2xl border"
              style={{
                borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.3)',
              }}>
              <View
                className="flex-row items-center gap-3.5 px-4 py-3"
                style={{
                  backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(254,226,226,0.6)',
                }}>
                <View
                  className="h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)',
                  }}>
                  <AlertCircle color={isDark ? '#F87171' : '#DC2626'} size={16} strokeWidth={2.5} />
                </View>

                <View className="flex-1">
                  <Text
                    className="text-[12px] font-black uppercase tracking-widest text-red-600 dark:text-red-400"
                    numberOfLines={1}>
                    SLA Breached
                  </Text>
                  <Text
                    className="mt-0.5 text-[10px] font-bold text-red-500/80 dark:text-red-400/80"
                    numberOfLines={1}>
                    Immediate action required
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* High-Fidelity SLA Alert Pod (Due Soon) */}
          {isDueSoon && !isOverdue && (
            <View
              className="mb-6 overflow-hidden rounded-2xl border"
              style={{
                borderColor: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.3)',
              }}>
              <View
                className="flex-row items-center gap-3.5 px-4 py-3"
                style={{
                  backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(254,243,199,0.6)',
                }}>
                <View
                  className="h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)',
                  }}>
                  <Clock color={isDark ? '#FBBF24' : '#D97706'} size={16} strokeWidth={2.5} />
                </View>

                <View className="flex-1">
                  <Text
                    className="text-[12px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400"
                    numberOfLines={1}>
                    SLA Due Soon
                  </Text>
                  <Text
                    className="mt-0.5 text-[10px] font-bold text-amber-600/80 dark:text-amber-500/80"
                    numberOfLines={1}>
                    Priority task
                  </Text>
                </View>
              </View>
            </View>
          )}
          {/* Header Row */}
          <View className="mb-7 flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-2">
              <View
                style={{
                  backgroundColor: catStyle.iconBg,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderWidth: 1,
                  borderRadius: 20,
                }}
                className={`flex-row items-center gap-2.5 px-3.5 py-2.5 shadow-sm`}>
                <View className="rounded-full bg-white p-1.5 shadow-sm dark:bg-slate-900">
                  <CategoryIcon size={12} strokeWidth={3} color={catStyle.hex} />
                </View>
                <Text
                  className={`${Platform.OS === 'ios' ? 'text-[9px]' : 'text-[10px]'} font-black tracking-[0.08em] ${catStyle.textClass}`}
                  numberOfLines={1}>
                  {CATEGORY_LABEL_MAP[issue?.category]?.toUpperCase() ??
                    issue?.category.toUpperCase()}
                </Text>
              </View>
            </View>

            <View
              style={{ borderRadius: 100 }}
              className="flex-row items-center gap-2.5 border border-slate-200/50 bg-white/90 px-3.5 py-2.5 shadow-sm dark:border-slate-800/50 dark:bg-slate-900/90">
              <View
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: pm.dot,
                  shadowColor: pm.dot,
                  shadowOpacity: 0.9,
                  shadowRadius: 6,
                }}
              />
              <Text
                className={`${Platform.OS === 'ios' ? 'text-[9px]' : 'text-[10px]'} font-black tracking-widest ${pm.text} ${pm.darkText}`}>
                {issue?.priority.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Title and Tech Tag Row */}
          <View className="mb-7">
            <View className="mb-3 flex-row items-center gap-2">
              <View
                style={{ borderColor: statusStyle.border, borderWidth: 1, borderRadius: 8 }}
                className="flex-row items-center gap-2 bg-white/40 px-2.5 py-1 dark:bg-slate-900/40">
                <Hash size={10} color={statusStyle.hex} strokeWidth={3} />
                <Text
                  style={{ color: statusStyle.hex }}
                  className="text-[9px] font-black tracking-[0.2em]">
                  {issue?.issueCode || issue?.id?.slice(0, 8).toUpperCase()}
                </Text>
              </View>
            </View>
            <Text
              className="text-[24px] font-black leading-[34px] tracking-tight text-slate-900 dark:text-white"
              numberOfLines={2}>
              {issue?.title}
            </Text>
          </View>

          {/* Metadata Grid */}
          <View className="mb-8 flex-row flex-wrap gap-3.5">
            <View
              style={{ borderRadius: 16 }}
              className="flex-row items-center gap-2.5 border border-slate-200/60 bg-white/60 px-4 py-2.5 dark:border-slate-800/60 dark:bg-slate-950/60">
              <Calendar color={isDark ? '#94A3B8' : '#64748B'} size={14} strokeWidth={2.5} />
              <Text className="text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400">
                {formatRelativeDate(issue?.dateReported).toUpperCase()}
              </Text>
            </View>
            {slaLabel && !isOverdue && !isDueSoon && (
              <View
                style={{ borderRadius: 16 }}
                className="flex-row items-center gap-2.5 border border-slate-200/60 bg-white/60 px-4 py-2.5 dark:border-slate-800/60 dark:bg-slate-950/60">
                <Clock color={isDark ? '#94A3B8' : '#64748B'} size={14} strokeWidth={2.5} />
                <Text className="text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400">
                  DUE: {slaLabel.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Intelligence Pod (Ultra-Rounded Glass) */}
          <View
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
              borderWidth: 1.5,
              borderRadius: 40,
              overflow: 'hidden',
            }}
            className="mb-8 bg-white/95 shadow-sm dark:bg-slate-950/90">
            <View
              className="absolute bottom-0 left-0 top-0 w-1.5"
              style={{ backgroundColor: statusStyle.hex, opacity: 0.7 }}
            />
            <View className="flex-row items-center gap-6 border-b border-slate-100/50 p-6 pl-7 dark:border-slate-900/50">
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : statusStyle.bg,
                  borderRadius: 24,
                }}
                className="h-12 w-12 items-center justify-center shadow-sm">
                <MapPin color={statusStyle.hex} size={22} strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Location Profile
                </Text>
                <Text
                  className="text-[16px] font-black leading-[24px] text-slate-800 dark:text-slate-100"
                  numberOfLines={2}>
                  {[issue?.city, issue?.state].filter(Boolean).join(', ') ||
                    issue?.location ||
                    'Location Unspecified'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-6 p-6 pl-7">
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                  borderRadius: 24,
                }}
                className="h-12 w-12 items-center justify-center shadow-sm">
                <UserIcon color={statusStyle.hex} size={22} strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Reporting Citizen
                </Text>
                <Text
                  className="text-[15px] font-black text-slate-800 dark:text-slate-100"
                  numberOfLines={1}>
                  {issue?.citizenName}
                </Text>
              </View>
            </View>
          </View>

          {/* Assigned Officer Pod */}
          {issue?.assignedOfficer && (
            <View
              style={{
                shadowColor: statusStyle.hex,
                shadowOffset: { width: 0, height: 15 },
                shadowOpacity: 0.35,
                shadowRadius: 30,
                elevation: 12,
                marginBottom: 32,
              }}>
              <TouchableOpacity
                onPress={() => setShowOfficerModal(true)}
                activeOpacity={0.95}
                style={{
                  borderRadius: 40,
                  overflow: 'hidden',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                }}>
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(30, 27, 75, 0.7)', 'rgba(15, 23, 42, 0.7)']
                      : [statusStyle.bg, '#FFFFFF']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <View style={{ paddingVertical: 20, paddingHorizontal: 24 }}>
                    {/* Status Accent Strip */}
                    <View
                      style={{ backgroundColor: statusStyle.hex, opacity: 0.9 }}
                      className="absolute bottom-0 left-0 top-0 w-1.5"
                    />

                    <View className="flex-row items-center justify-between pl-2">
                      <View className="flex-1 flex-row items-center gap-3.5">
                        <View
                          style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                            borderColor: statusStyle.border,
                            borderWidth: 1.5,
                            borderRadius: 18,
                          }}
                          className="h-12 w-12 items-center justify-center shadow-sm">
                          <UserCheck color={statusStyle.hex} size={24} strokeWidth={2.5} />
                        </View>

                        <View className="flex-1">
                          <Text
                            style={{ color: statusStyle.hex }}
                            className="text-[9px] font-black uppercase tracking-[0.2em]">
                            Assigned Field Officer
                          </Text>
                          <Text
                            className="mt-0.5 text-[18px] font-black text-slate-950 dark:text-white"
                            numberOfLines={1}>
                            {issue?.assignedOfficer?.fullName}
                          </Text>

                          {/* Intelligence Tags */}
                          <View className="mt-3 flex-row items-center gap-2">
                            <View
                              style={{ borderRadius: 8 }}
                              className="flex-row items-center gap-1.5 bg-amber-50 px-2 py-1 shadow-sm dark:bg-amber-900/20">
                              <Star color="#F59E0B" size={10} fill="#F59E0B" />
                              <Text className="text-[9px] font-black text-amber-700 dark:text-amber-400">
                                {issue?.assignedOfficer?.rating.toFixed(1)}
                              </Text>
                            </View>
                            <View
                              style={{ borderRadius: 8 }}
                              className="flex-row items-center gap-1.5 bg-blue-50 px-2 py-1 shadow-sm dark:bg-blue-900/20">
                              <Activity color="#3B82F6" size={10} strokeWidth={3} />
                              <Text className="text-[9px] font-black text-blue-700 dark:text-blue-400">
                                {issue?.assignedOfficer?.workloadPercentage.toFixed(0)}% LOAD
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
                          borderRadius: 100,
                        }}
                        className="ml-4 h-9 w-9 items-center justify-center shadow-sm">
                        <ChevronRight color={statusStyle.hex} size={20} strokeWidth={4} />
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Enhanced Action Footer */}
          <View className="flex-row items-center justify-end border-t border-slate-100/50 pt-7 dark:border-slate-900/50">
            <View
              style={{
                shadowColor: statusStyle.hex,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 15,
                elevation: 10,
              }}
              className={`flex-row items-center gap-2.5 rounded-2xl border px-6 py-3 ${sm.bg} ${sm.darkBg} ${sm.border}`}>
              <StatusIcon
                size={14}
                strokeWidth={3}
                color={sm.text === 'text-white' || sm.bg.includes('500') ? '#FFFFFF' : sm.dot}
              />
              <Text
                className={`text-[12px] font-black tracking-[0.06em] ${sm.text} ${sm.darkText}`}>
                {STATUS_LABEL_MAP[issue?.status as StatusKey]?.toUpperCase() ??
                  issue?.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {issue?.assignedOfficer && (
        <OfficerDetailModal
          visible={showOfficerModal}
          onClose={() => setShowOfficerModal(false)}
          officer={issue.assignedOfficer}
          statusColor={statusStyle.hex}
        />
      )}
    </View>
  );
}

function OfficerDetailModal({
  visible,
  onClose,
  officer,
  statusColor,
}: {
  visible: boolean;
  onClose: () => void;
  officer: any; // Using any for now to match MappedIssue.assignedOfficer
  statusColor: string;
}) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/60 p-6">
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={{
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderWidth: 1.5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.3,
            shadowRadius: 40,
            elevation: 25,
            width: '100%',
            maxWidth: 400,
            borderRadius: 48,
            overflow: 'hidden',
            backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
          }}>
          <LinearGradient
            colors={isDark ? ['#1e293b', '#0f172a'] : ['#F8FAFC', '#FFFFFF']}
            style={{ padding: 32 }}>
            {/* Modal Header */}
            <View className="mb-8 flex-row items-center justify-between">
              <View
                style={{
                  backgroundColor: statusColor + '20',
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
                className="flex-row items-center gap-2">
                <ShieldCheck color={statusColor} size={14} strokeWidth={3} />
                <Text
                  style={{ color: statusColor }}
                  className="text-[10px] font-black uppercase tracking-widest">
                  Verified Field Agent
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <X color={isDark ? '#94A3B8' : '#64748B'} size={20} strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {/* Profile Section */}
            <View className="mb-10 items-center">
              <View
                style={{ borderColor: statusColor, borderWidth: 3, borderRadius: 32 }}
                className="h-24 w-24 items-center justify-center bg-white shadow-xl dark:bg-slate-800">
                <UserCheck color={statusColor} size={48} strokeWidth={2.5} />
              </View>
              <Text className="mt-5 text-center text-[28px] font-black text-slate-900 dark:text-white">
                {officer.fullName}
              </Text>
              <Text className="mt-1 text-[12px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                Mission Intelligence Profile
              </Text>
            </View>

            {/* Stats Grid */}
            <View className="mb-10 flex-row gap-4">
              <View className="flex-1 items-center rounded-3xl border border-amber-100/50 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-900/20">
                <Star color="#F59E0B" fill="#F59E0B" size={18} />
                <Text className="mt-2 text-[18px] font-black text-amber-700 dark:text-amber-400">
                  {officer.rating.toFixed(1)}
                </Text>
                <Text className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600/60">
                  Rating
                </Text>
              </View>
              <View className="flex-1 items-center rounded-3xl border border-blue-100/50 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-900/20">
                <Award color="#3B82F6" size={18} strokeWidth={2.5} />
                <Text className="mt-2 text-[18px] font-black text-blue-700 dark:text-blue-400">
                  {officer.efficiencyScore}%
                </Text>
                <Text className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600/60">
                  Efficiency
                </Text>
              </View>
              <View className="flex-1 items-center rounded-3xl border border-emerald-100/50 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-900/20">
                <PieChart color="#10B981" size={18} strokeWidth={2.5} />
                <Text className="mt-2 text-[18px] font-black text-emerald-700 dark:text-emerald-400">
                  {officer.workloadPercentage.toFixed(0)}%
                </Text>
                <Text className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-600/60">
                  Load
                </Text>
              </View>
            </View>

            {/* Contact Intelligence */}
            <View className="mb-10 gap-3">
              <View className="flex-row items-center gap-5 rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                  <Mail color={statusColor} size={18} />
                </View>
                <View className="flex-1">
                  <Text className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Direct Channel
                  </Text>
                  <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">
                    {officer.email}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-5 rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
                  <Phone color={statusColor} size={18} />
                </View>
                <View className="flex-1">
                  <Text className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Operational Line
                  </Text>
                  <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">
                    {officer.phone}
                  </Text>
                </View>
              </View>
            </View>

            {/* Specialisations */}
            <View>
              <Text className="mb-4 pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Sector Specialisations
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {officer.specialisations.map((spec: string, idx: number) => (
                  <View
                    key={idx}
                    style={{ borderColor: statusColor + '40', borderWidth: 1, borderRadius: 100 }}
                    className="bg-white px-4 py-2 shadow-sm dark:bg-slate-900">
                    <Text className="text-[11px] font-black capitalize text-slate-700 dark:text-slate-300">
                      {spec}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

interface FilterState {
  status: StatusKey | 'all';
  sla: SLAFilter;
  category: CategoryKey | 'all';
  subCategories: IssueSubCategory[];
  priority: IssuePriority | 'all';
}

type FilterSection = 'status' | 'sla' | 'category' | 'subcategory' | 'priority';

function FilterModal({
  visible,
  onClose,
  filters,
  onChange,
  department,
}: {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  department: string;
}) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [local, setLocal] = useState<FilterState>(filters);
  const [openSection, setOpenSection] = useState<FilterSection | null>('status');

  useEffect(() => {
    if (local.category !== 'all') {
      const validSubcats = SUBCATEGORY_MAP[local.category] || [];
      const newSubs = local.subCategories.filter((sc) => validSubcats.includes(sc));
      if (newSubs.length !== local.subCategories.length) {
        setLocal((prev) => ({
          ...prev,
          subCategories: newSubs,
        }));
      }
    }
  }, [local.category]);

  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  const availableSubcats: IssueSubCategory[] = useMemo(() => {
    if (!local.category || local.category === 'all') return [];

    return SUBCATEGORY_MAP[local.category] || [];
  }, [local.category]);

  const activeCount =
    [local.status !== 'all', local.sla !== 'all', local.priority !== 'all'].filter(Boolean).length +
    local.subCategories.length;

  const handleCloseAnim = () => {
    onClose();
  };

  const handleApply = () => {
    onChange(local);
    handleCloseAnim();
  };

  const handleReset = () => {
    const reset: FilterState = {
      status: 'all',
      sla: 'all',
      category: department as CategoryKey,
      subCategories: [],
      priority: 'all',
    };
    setLocal(reset);
    onChange(reset);
    handleCloseAnim();
  };

  const toggleSection = (s: FilterSection) => setOpenSection(openSection === s ? null : s);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleCloseAnim}>
      <View style={{ flex: 1 }}>
        {/* Animated backdrop */}
        <Animated.View
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(300)}
          style={StyleSheet.absoluteFillObject}>
          <BlurView
            intensity={isDark ? 40 : 25}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={handleCloseAnim}
            activeOpacity={1}
          />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.springify().damping(100).stiffness(200)}
          exiting={SlideOutDown.duration(300)}
          layout={LinearTransition}
          style={[
            styles.filterSheet,
            { width: '100%', position: 'absolute', bottom: 0, backgroundColor: 'transparent' },
          ]}>
          <BlurView
            intensity={isDark ? 80 : 100}
            tint={isDark ? 'dark' : 'light'}
            style={{
              width: '100%',
              flexShrink: 1,
              paddingBottom: insets.bottom,
              borderTopLeftRadius: 36,
              borderTopRightRadius: 36,
              overflow: 'hidden',
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderWidth: 1,
            }}>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(20, 184, 166, 0.05)', 'transparent']
                  : ['rgba(20, 184, 166, 0.05)', 'transparent']
              }
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.2 }}
              pointerEvents="none"
            />

            {/* Drag handle */}
            <View
              className="mb-2 mt-4 h-1.5 w-12 self-center rounded-full opacity-50"
              style={{ backgroundColor: isDark ? '#475569' : '#CBD5E1' }}
            />

            {/* Header */}
            <View
              className="flex-row items-center justify-between border-b px-6 pb-4 pt-2"
              style={{
                borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              }}>
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: isDark ? 'rgba(20, 184, 166, 0.2)' : '#CCFBF1',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(20, 184, 166, 0.3)' : '#99F6E4',
                  }}>
                  <SlidersHorizontal
                    size={18}
                    color={isDark ? '#5EEAD4' : '#0D9488'}
                    strokeWidth={2.5}
                  />
                </View>
                <View>
                  <Text className="text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    Filters
                  </Text>
                  {activeCount > 0 && (
                    <Animated.Text
                      entering={FadeInUp.springify()}
                      className="text-[12px] font-bold text-teal-600 dark:text-teal-400">
                      {activeCount} active {activeCount === 1 ? 'filter' : 'filters'}
                    </Animated.Text>
                  )}
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                {activeCount > 0 && (
                  <TouchableOpacity
                    onPress={handleReset}
                    className="rounded-full px-3.5 py-2"
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(30, 41, 59, 0.8)'
                        : 'rgba(241, 245, 249, 0.8)',
                    }}>
                    <Text className="text-[13px] font-extrabold text-slate-500 dark:text-slate-400">
                      Reset
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleCloseAnim}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)',
                  }}>
                  <X size={16} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* STATUS */}
              <FilterAccordion
                title="Status"
                icon={
                  <CheckCircle size={16} color={isDark ? '#5EEAD4' : '#0D9488'} strokeWidth={2.5} />
                }
                isOpen={openSection === 'status'}
                onToggle={() => toggleSection('status')}
                activeValue={local.status !== 'all' ? local.status : undefined}
                activeMeta={local.status !== 'all' ? STATUS_META[local.status] : undefined}
                isDark={isDark}>
                <View className="flex-row flex-wrap gap-2.5 px-6 pb-5 pt-1">
                  {STATUS_OPTIONS.filter((s) => s !== 'all').map((s, idx) => {
                    const m = STATUS_META[s];
                    const isActive = local.status === s;

                    return (
                      <FilterOption
                        key={s}
                        label={STATUS_LABEL_MAP[s]}
                        isActive={isActive}
                        dotColor={m.dot}
                        onPress={() =>
                          setLocal({ ...local, status: local.status === s ? 'all' : s })
                        }
                        isDark={isDark}
                        delay={idx * 50}
                      />
                    );
                  })}
                </View>
              </FilterAccordion>

              {/* SLA */}
              <FilterAccordion
                title="SLA Status"
                icon={<Clock size={16} color={isDark ? '#FCD34D' : '#F59E0B'} strokeWidth={2.5} />}
                isOpen={openSection === 'sla'}
                onToggle={() => toggleSection('sla')}
                activeValue={local.sla !== 'all' ? local.sla : undefined}
                activeMeta={
                  local.status !== 'all' ? STATUS_META[local.status as StatusKey] : undefined
                }
                isDark={isDark}>
                <View className="flex-row flex-wrap gap-2.5 px-6 pb-5 pt-1">
                  {SLA_OPTIONS.filter((s) => s !== 'all').map((s, idx) => {
                    const m = SLA_META[s];
                    const isActive = local.sla === s;
                    return (
                      <FilterOption
                        key={s}
                        label={s}
                        isActive={isActive}
                        dotColor={m.dot}
                        onPress={() => setLocal({ ...local, sla: local.sla === s ? 'all' : s })}
                        isDark={isDark}
                        delay={idx * 50}
                      />
                    );
                  })}
                </View>
              </FilterAccordion>

              {/* PRIORITY */}
              <FilterAccordion
                title="Priority"
                icon={
                  <AlertTriangle
                    size={16}
                    color={isDark ? '#FCA5A5' : '#EF4444'}
                    strokeWidth={2.5}
                  />
                }
                isOpen={openSection === 'priority'}
                onToggle={() => toggleSection('priority')}
                activeValue={local.priority !== 'all' ? local.priority : undefined}
                activeMeta={local.priority !== 'all' ? PRIORITY_META[local.priority] : undefined}
                isDark={isDark}>
                <View className="flex-row flex-wrap gap-2.5 px-6 pb-5 pt-1">
                  {PRIORITY_OPTIONS.filter((p) => p !== 'all').map((p, idx) => {
                    const m = PRIORITY_META[p];
                    const isActive = local.priority === p;
                    return (
                      <FilterOption
                        key={p}
                        label={p}
                        isActive={isActive}
                        dotColor={m.dot}
                        onPress={() =>
                          setLocal({ ...local, priority: local.priority === p ? 'all' : p })
                        }
                        isDark={isDark}
                        delay={idx * 50}
                      />
                    );
                  })}
                </View>
              </FilterAccordion>

              {/* SUBCATEGORY */}
              {local.category !== 'all' && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <FilterAccordion
                    title="Sub-Category"
                    icon={
                      <Layers size={16} color={isDark ? '#C4B5FD' : '#8B5CF6'} strokeWidth={2.5} />
                    }
                    isOpen={openSection === 'subcategory'}
                    onToggle={() => toggleSection('subcategory')}
                    activeValue={
                      local.subCategories.length > 0
                        ? local.subCategories.length === 1
                          ? local.subCategories[0]
                          : `${local.subCategories.length} Selected`
                        : undefined
                    }
                    isDark={isDark}>
                    <View className="flex-row flex-wrap gap-2.5 px-6 pb-5 pt-1">
                      {availableSubcats.map((sc, idx) => {
                        const isActive = local.subCategories.includes(sc);
                        return (
                          <FilterOption
                            key={sc}
                            label={sc}
                            isActive={isActive}
                            dotColor={isDark ? '#C4B5FD' : '#8B5CF6'}
                            onPress={() => {
                              if (isActive) {
                                setLocal({
                                  ...local,
                                  subCategories: local.subCategories.filter((s) => s !== sc),
                                });
                              } else {
                                setLocal({
                                  ...local,
                                  subCategories: [...local.subCategories, sc],
                                });
                              }
                            }}
                            isDark={isDark}
                            delay={idx * 50}
                          />
                        );
                      })}
                    </View>
                  </FilterAccordion>
                </Animated.View>
              )}

              <View className="h-8" />
            </ScrollView>

            {/* Apply button */}
            <View
              className="px-6 pb-6 pt-4"
              style={{
                borderTopWidth: 1,
                borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              }}>
              <TouchableOpacity
                onPress={handleApply}
                activeOpacity={0.85}
                className="overflow-hidden rounded-2xl"
                style={{
                  height: 56,
                  shadowColor: activeCount > 0 ? '#0D9488' : '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: activeCount > 0 ? 0.3 : 0.05,
                  shadowRadius: 12,
                  elevation: 8,
                }}>
                <LinearGradient
                  colors={
                    activeCount > 0
                      ? ['#0D9488', '#0F766E']
                      : isDark
                        ? ['#334155', '#1E293B']
                        : ['#F1F5F9', '#E2E8F0']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}>
                  {activeCount > 0 && (
                    <LinearGradient
                      colors={['rgba(255,255,255,0.25)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                  <View className="flex-1 flex-row items-center justify-center gap-2">
                    <Filter
                      size={18}
                      color={activeCount > 0 ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '800',
                        letterSpacing: -0.3,
                        color: activeCount > 0 ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B',
                      }}>
                      {`Apply Filters${activeCount > 0 ? ` (${activeCount})` : ''}`}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(TouchableOpacity);

function FilterOption({
  label,
  isActive,
  dotColor,
  onPress,
  isDark,
  delay,
}: {
  label: string;
  isActive: boolean;
  dotColor: string;
  onPress: () => void;
  isDark: boolean;
  delay: number;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-row items-center gap-2 rounded-[14px] border-[1.5px] px-3.5 py-2.5"
      style={{
        backgroundColor: isActive
          ? isDark
            ? 'rgba(30, 41, 59, 0.8)'
            : '#FFFFFF'
          : isDark
            ? 'rgba(30, 41, 59, 0.3)'
            : 'transparent',
        borderColor: isActive ? dotColor : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        shadowColor: isActive ? dotColor : '#000',
        shadowOffset: { width: 0, height: isActive ? 4 : 0 },
        shadowOpacity: isActive ? 0.2 : 0,
        shadowRadius: isActive ? 8 : 0,
        elevation: isActive ? 4 : 0,
      }}>
      {isActive && (
        <LinearGradient
          colors={isDark ? [`${dotColor}33`, `${dotColor}11`] : [`${dotColor}1A`, `${dotColor}05`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          borderRadius={14}
        />
      )}
      <View
        className="h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor: dotColor,
          shadowColor: dotColor,
          shadowOpacity: 0.5,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      <Text
        className="text-[13.5px] font-extrabold tracking-tight"
        style={{
          color: isActive ? (isDark ? '#F8FAFC' : '#0F172A') : isDark ? '#94A3B8' : '#64748B',
        }}>
        {label.replace(/_/g, ' ').toUpperCase()}
      </Text>
    </AnimatedPressable>
  );
}

function FilterAccordion({
  title,
  icon,
  isOpen,
  onToggle,
  activeValue,
  activeMeta,
  isDark,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  activeValue?: string;
  activeMeta?: { bg: string; darkBg: string; text: string; darkText: string; dot?: string };
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={{
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        className="flex-row items-center gap-3.5 px-6 py-4">
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
          {icon}
        </View>
        <Text
          className="flex-1 text-[16px] font-extrabold tracking-tight"
          style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
          {title}
        </Text>
        {activeValue && (
          <Animated.View
            entering={ZoomIn.springify().damping(18)}
            className="mr-2 flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              backgroundColor: activeMeta?.dot
                ? `${activeMeta.dot}22`
                : isDark
                  ? 'rgba(139, 92, 246, 0.2)'
                  : 'rgba(139, 92, 246, 0.15)',
            }}>
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: activeMeta?.dot || '#8B5CF6' }}
            />
            <Text
              className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: activeMeta?.dot || (isDark ? '#C4B5FD' : '#7C3AED') }}>
              {activeValue.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </Animated.View>
        )}
        <Animated.View layout={LinearTransition.duration(200)}>
          <ChevronRight
            size={18}
            color={isDark ? '#64748B' : '#94A3B8'}
            strokeWidth={2.5}
            style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
          />
        </Animated.View>
      </TouchableOpacity>
      {isOpen && <Animated.View entering={FadeIn.duration(200)}>{children}</Animated.View>}
    </Animated.View>
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

  // Fetch Unit Officer Notifications
  const notifications = useQuery(
    api.notifications.getByUser,
    user?.id ? { userId: user.id } : 'skip'
  );

  const markAll = useMutation(api.notifications.markAllAsRead);

  const deleteNotification = useMutation(api.notifications.deleteNotification);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifCount = notifications?.filter((n) => !n.read).length;

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    sla: 'all',
    category: 'all',
    subCategories: [],
    priority: 'all',
  });

  const activeFilterCount =
    [filters.status !== 'all', filters.sla !== 'all', filters.priority !== 'all'].filter(Boolean)
      .length + filters.subCategories.length;

  useEffect(() => {
    if (unitOfficer?.department) {
      const dept = unitOfficer.department as CategoryKey;

      setFilters((prev) => ({
        ...prev,
        category: dept,
        subCategories: [],
      }));
    }
  }, [unitOfficer]);

  const rawIssues = useQuery(
    api.unitOfficers.getUnitOfficerIssues,
    // @ts-ignore
    user?.id ? { userId: user.id } : 'skip'
  );

  const duplicateGroups = useMemo(() => {
    if (!rawIssues) return [];

    const activeIssues = rawIssues.filter((issue) => {
      const status = issue?.status?.toLowerCase().trim();

      return status !== 'resolved' && status !== 'rejected';
    });

    return buildDuplicateGroupsFromIssues(activeIssues);
  }, [rawIssues]);

  const isLoading = rawIssues === undefined;

  // rawIssues?.forEach((issue, index) => {
  //   console.log(`Issue ${index + 1}:`);
  //   console.log(JSON.stringify(issue, null, 2));
  // });

  const issues = useMemo(() => {
    if (!rawIssues) return [];

    return rawIssues.map((issue) => mapIssueToUI(issue));
  }, [rawIssues]);

  // console.log('USER ID:', user?.id);
  // console.log('RAW ISSUES:', rawIssues);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return issues.filter((issue) => {
      if (q) {
        const match =
          issue?.title.toLowerCase().includes(q) ||
          issue?.location.toLowerCase().includes(q) ||
          issue?.citizenName.toLowerCase().includes(q) ||
          issue?.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.status !== 'all' && issue?.status !== filters.status) return false;
      if (filters.sla !== 'all' && getSlaStatus(issue?.slaDeadline) !== filters.sla) return false;
      if (filters.category !== 'all' && issue?.category !== filters.category) return false;
      if (filters.subCategories.length > 0) {
        const matchesSub = filters.subCategories.some((sc) => issue?.subCategories?.includes(sc));
        if (!matchesSub) return false;
      }
      if (filters.priority !== 'all' && issue?.priority !== filters.priority) return false;
      return true;
    });
  }, [issues, searchQuery, filters]);

  const overdueCount = useMemo(
    () => issues.filter((i) => getSlaStatus(i?.slaDeadline) === 'overdue').length,
    []
  );

  async function handleMarkAllAsRead() {
    await markAll({ userId: user?.id as Id<'users'> });
  }

  async function handleDelete(id: string) {
    await deleteNotification({ id: id as Id<'notifications'> });
  }

  const stats = [
    {
      label: 'Total',
      value: mockStats.totalIssues,
      icon: <FileText color="#FFFFFF" size={22} strokeWidth={2.5} />,
      iconBg: '#3B82F6', // Vivid Blue
    },
    {
      label: 'Pending',
      value: mockStats.pendingVerification,
      icon: <Clock color="#FFFFFF" size={22} strokeWidth={2.5} />,
      iconBg: '#F59E0B', // Vivid Amber
    },
    {
      label: 'Assigned',
      value: mockStats.assigned,
      icon: <AlertCircle color="#FFFFFF" size={22} strokeWidth={2.5} />,
      iconBg: '#F43F5E', // Vivid Rose
    },
    {
      label: 'Closed',
      value: mockStats.closed,
      icon: <CheckCircle color="#FFFFFF" size={22} strokeWidth={2.5} />,
      iconBg: '#10B981', // Vivid Emerald
    },
  ];

  const activeStatus = filters.status !== 'all' ? STATUS_META[filters.status] : null;
  const activeSla = filters.sla !== 'all' ? SLA_META[filters.sla] : null;
  const activePri = filters.priority !== 'all' ? PRIORITY_META[filters.priority] : null;

  if (!unitOfficer && !notifications) {
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar style="light" />

        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* ── HEADER ── */}
          <View style={styles.headerWrapper}>
            <LinearGradient
              colors={
                isDark ? ['#082F49', '#164E63', '#0891B2'] : ['#0284C7', '#06B6D4', '#2DD4BF']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerBase}>
              {/* Depth Overlay */}
              <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.5)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              <Animated.View
                entering={FadeInDown.springify().damping(16).mass(0.8)}
                className="z-10 mb-8 flex-row items-start justify-between">
                <View className="flex-row items-center gap-4">
                  {/* Ultra-Premium Avatar */}
                  <View className="relative h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border border-white/20 bg-white/10 shadow-xl shadow-blue-900/40">
                    <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />
                    <LinearGradient
                      colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text className="text-[26px] font-black text-white drop-shadow-md">
                      {unitOfficer?.fullName?.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View>
                    <Text className="mb-1 text-[12px] font-bold uppercase tracking-[0.2em] text-blue-200/90">
                      Welcome back
                    </Text>
                    <Text className="text-[24px] font-black leading-tight tracking-tighter text-white drop-shadow-lg">
                      {unitOfficer?.fullName}
                    </Text>
                    <View className="mt-1.5 flex-row items-center gap-1.5 self-start rounded-full border border-white/10 bg-black/20 px-3 py-1">
                      <MapPin color="#93C5FD" size={11} strokeWidth={3} />
                      <Text className="text-[10px] font-black uppercase tracking-widest text-blue-100">
                        {unitOfficer?.city}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="items-end gap-3 pt-1">
                  <TouchableOpacity
                    onPress={() => setShowNotifications(true)}
                    activeOpacity={0.7}
                    className="relative z-50 items-center justify-center shadow-2xl">
                    {/* Glass Container (Handles blur & gradient without clipping the dot) */}
                    <View
                      className={`h-14 w-14 items-center justify-center overflow-hidden rounded-[22px] ${
                        unreadNotifCount && unreadNotifCount > 0
                          ? 'border border-white/50 bg-white/20 shadow-lg shadow-blue-400/50'
                          : 'border border-white/15 bg-black/20 shadow-lg shadow-blue-900/30'
                      }`}>
                      <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
                      <LinearGradient
                        colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <Bell
                        color={
                          unreadNotifCount && unreadNotifCount > 0
                            ? '#FFFFFF'
                            : 'rgba(255,255,255,0.9)'
                        }
                        size={28}
                        strokeWidth={2.5}
                        style={
                          unreadNotifCount && unreadNotifCount > 0
                            ? {
                                shadowColor: '#fff',
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.5,
                                shadowRadius: 8,
                              }
                            : {}
                        }
                      />
                    </View>

                    {/* Glowing Notification Badge (Unclipped) */}
                    {unreadNotifCount !== undefined && unreadNotifCount > 0 && (
                      <Animated.View
                        entering={ZoomIn.springify().damping(12).mass(0.9)}
                        style={styles.bellDot}>
                        <Text
                          className="text-[12px] font-black tracking-tighter text-white"
                          style={{ lineHeight: 14 }}>
                          {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                        </Text>
                      </Animated.View>
                    )}
                  </TouchableOpacity>

                  <View className="flex-row gap-2">
                    {overdueCount > 0 && (
                      <View className="flex-row items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/90 px-3 py-1.5 shadow-lg shadow-rose-900/40">
                        <AlertCircle color="#FFFFFF" size={11} strokeWidth={3} />
                        <Text className="text-[10px] font-black uppercase text-white">
                          {overdueCount} Critical
                        </Text>
                      </View>
                    )}
                    <View className="flex-row items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/80 px-3 py-1.5 shadow-lg shadow-cyan-900/30">
                      <TrendingUp color="#FFFFFF" size={11} strokeWidth={3} />
                      <Text className="text-[10px] font-black uppercase text-white">78% SLA</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* High-Fidelity Stats Cards */}
              <View className="z-10 mt-1 flex-row gap-3">
                {stats.map((s, i) => (
                  <Animated.View
                    entering={FadeInDown.delay(100 + i * 150)
                      .springify()
                      .damping(14)}
                    key={i}
                    style={[styles.statCardShadowWrap, { shadowColor: s.iconBg }]}>
                    <View style={styles.statCardGlassInner}>
                      <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />

                      {/* Deep Sweeping Glass Highlight */}
                      <LinearGradient
                        colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.05)', 'transparent']}
                        locations={[0, 0.4, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />

                      {/* Breathtaking Background Watermark */}
                      <Text
                        className="absolute -bottom-5 -right-3 text-[80px] font-black italic tracking-tighter"
                        style={{ color: 'rgba(255,255,255,0.08)', includeFontPadding: false }}>
                        {s.value}
                      </Text>

                      <View style={[styles.statIconShadowWrap, { shadowColor: s.iconBg }]}>
                        <View style={[styles.statIconInner, { backgroundColor: s.iconBg }]}>
                          <LinearGradient
                            colors={['rgba(255,255,255,0.25)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                          {s.icon}
                        </View>
                      </View>
                      <View className="mt-4 items-center">
                        <Text className="text-[28px] font-black leading-none tracking-tighter text-white drop-shadow-xl">
                          {s.value}
                        </Text>
                        <Text className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-blue-100">
                          {s.label}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </View>
            </LinearGradient>
          </View>

          {/* ── BODY ── */}
          <View className="gap-3 bg-slate-50 px-4 pt-[18px] dark:bg-slate-900">
            {/* Duplicate Detection Banner */}
            <DuplicateDetectionBanner
              groups={duplicateGroups}
              // @ts-ignore
              onGroupResolved={(groupId) => console.log(groupId)}
            />

            {/* Search */}
            <View
              className="flex-row items-center gap-3 overflow-hidden rounded-[20px] border-[1.5px] px-3"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 2,
              }}>
              <View
                className="ml-1 h-9 w-9 items-center justify-center rounded-[12px]"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                <Search color={isDark ? '#94A3B8' : '#64748B'} size={17} strokeWidth={2.5} />
              </View>
              <TextInput
                className="flex-1 py-4 text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100"
                placeholder="Search issues, locations, citizens..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                style={{ minHeight: 56 }}
              />
              {searchQuery.length > 0 && (
                <Animated.View entering={ZoomIn.springify().damping(15)}>
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    activeOpacity={0.7}
                    className="mr-1 h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    }}>
                    <X size={15} color={isDark ? '#E2E8F0' : '#475569'} strokeWidth={2.5} />
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>

            {/* Filter trigger */}
            <AnimatedPressable
              onPress={() => setFilterVisible(true)}
              activeOpacity={0.85}
              className="flex-row items-center gap-3 overflow-hidden rounded-[20px] border-[1.5px] px-4 py-3.5"
              style={{
                backgroundColor:
                  activeFilterCount > 0
                    ? isDark
                      ? 'rgba(13, 148, 136, 0.15)'
                      : '#F0FDFA'
                    : isDark
                      ? 'rgba(30, 41, 59, 0.7)'
                      : '#FFFFFF',
                borderColor:
                  activeFilterCount > 0
                    ? isDark
                      ? 'rgba(45, 212, 191, 0.3)'
                      : '#99F6E4'
                    : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.05)',
                shadowColor: activeFilterCount > 0 ? '#0D9488' : '#000',
                shadowOffset: { width: 0, height: activeFilterCount > 0 ? 4 : 2 },
                shadowOpacity: activeFilterCount > 0 ? 0.2 : 0.03,
                shadowRadius: activeFilterCount > 0 ? 12 : 8,
                elevation: activeFilterCount > 0 ? 6 : 2,
              }}>
              {activeFilterCount > 0 && (
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(20, 184, 166, 0.1)', 'transparent']
                      : ['rgba(45, 212, 191, 0.1)', 'transparent']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
              )}
              <View className="flex-row items-center gap-2.5">
                <View
                  className="h-9 w-9 items-center justify-center rounded-[12px]"
                  style={{
                    backgroundColor:
                      activeFilterCount > 0
                        ? isDark
                          ? 'rgba(45, 212, 191, 0.15)'
                          : '#CCFBF1'
                        : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.03)',
                  }}>
                  <SlidersHorizontal
                    size={17}
                    color={
                      activeFilterCount > 0
                        ? isDark
                          ? '#5EEAD4'
                          : '#0D9488'
                        : isDark
                          ? '#94A3B8'
                          : '#64748B'
                    }
                    strokeWidth={2.5}
                  />
                </View>
                <View className="flex-row items-center">
                  <Text
                    className="text-[15px] font-extrabold tracking-tight"
                    style={{
                      color:
                        activeFilterCount > 0
                          ? isDark
                            ? '#CCFBF1'
                            : '#0F766E'
                          : isDark
                            ? '#E2E8F0'
                            : '#334155',
                    }}>
                    Filters
                  </Text>
                  {activeFilterCount > 0 && (
                    <Animated.View
                      entering={ZoomIn.springify().damping(15)}
                      className="ml-2 h-5 w-5 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: isDark ? '#14B8A6' : '#0D9488',
                        shadowColor: '#0D9488',
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                      }}>
                      <Text className="text-[11px] font-black text-white">{activeFilterCount}</Text>
                    </Animated.View>
                  )}
                </View>
              </View>

              {/* Active filter count is shown above, chips removed per request */}
              <View className="flex-1" />

              <View
                className="ml-0.5 h-7 w-7 items-center justify-center rounded-full"
                style={{
                  backgroundColor:
                    activeFilterCount > 0
                      ? isDark
                        ? 'rgba(45, 212, 191, 0.15)'
                        : '#CCFBF1'
                      : isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.03)',
                }}>
                <ChevronDown
                  size={14}
                  color={
                    activeFilterCount > 0
                      ? isDark
                        ? '#5EEAD4'
                        : '#0D9488'
                      : isDark
                        ? '#64748B'
                        : '#9CA3AF'
                  }
                  strokeWidth={3}
                />
              </View>
            </AnimatedPressable>

            {/* Issues header */}
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="text-[18px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {filters.status !== 'all' ? filters.status : 'All Issues'}
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
                  key={issue?.id}
                  // @ts-ignore
                  issue={issue}
                  onPress={() =>
                    navigation.navigate('IssueDetail' as never, { issueId: issue?.id } as never)
                  }
                />
              ))
            )}
          </View>
        </ScrollView>

        <FilterModal
          visible={filterVisible}
          onClose={() => setFilterVisible(false)}
          filters={filters}
          onChange={setFilters}
          // @ts-ignore
          department={unitOfficer?.department}
        />

        {notifications && (
          <NotificationPanel
            visible={showNotifications}
            onClose={() => setShowNotifications(false)}
            // @ts-ignore
            notification={notifications}
            handleMarkAllAsRead={handleMarkAllAsRead}
            handleDelete={handleDelete}
            role="UnitOfficer"
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  headerWrapper: {
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  headerBase: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F43F5E', // Rose-500
    borderWidth: 2.5,
    borderColor: '#0891B2', // Matches the new cyan/turquoise theme
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  statCardShadowWrap: {
    flex: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    borderRadius: 28,
  },
  statCardGlassInner: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.4)',
    borderLeftColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  statIconShadowWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  statIconInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
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
