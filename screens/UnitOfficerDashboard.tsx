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
} from '../lib/types';
import { mockDashboardStats as mockStats, mockDuplicateGroups } from '../lib/mockData';
import { useNavigation } from '@react-navigation/native';
import DuplicateDetectionBanner from '../components/DuplicateDetectionBanner';
import { DuplicateGroup } from '../lib/types';
import NotificationPanel from 'components/NotificationPanel';
import { User } from '../lib/auth';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { mapIssueToUI } from 'lib/issueMapper';
import { useUser } from 'context/UserContext';
import { Id } from 'convex/_generated/dataModel';

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
  closed: {
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
      case 'closed':
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
      case 'closed':
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

        {/* High-Fidelity SLA Banner */}
        {isOverdue && (
          <LinearGradient
            colors={['#EF4444', '#7F1D1D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            className="flex-row items-center gap-3 px-8 py-4">
            <View className="rounded-full bg-white/25 p-1.5">
              <AlertCircle color="#FFFFFF" size={14} strokeWidth={3} />
            </View>
            <Text className="text-[11px] font-black tracking-[0.2em] text-white">
              SLA BREACHED — IMMEDIATE ACTION
            </Text>
          </LinearGradient>
        )}
        {isDueSoon && !isOverdue && (
          <LinearGradient
            colors={['#F59E0B', '#92400E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            className="flex-row items-center gap-3 px-8 py-4">
            <View className="rounded-full bg-white/25 p-1.5">
              <Clock color="#FFFFFF" size={14} strokeWidth={3} />
            </View>
            <Text className="text-[11px] font-black tracking-[0.2em] text-white">
              SLA DUE SOON — PRIORITY TASK
            </Text>
          </LinearGradient>
        )}

        {/* Priority Level Indicator Strip (Side) */}
        <View
          className="absolute bottom-0 left-0 top-0 z-20 w-[10px]"
          style={{
            backgroundColor: pm.dot,
            shadowColor: pm.dot,
            shadowOpacity: 1,
            shadowRadius: 15,
            shadowOffset: { width: 4, height: 0 },
          }}
        />

        {/* Card Content */}
        <View className="py-8 pl-10 pr-6">
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
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        
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
            <View className="flex-row items-center justify-between mb-8">
              <View 
                style={{ backgroundColor: statusColor + '20', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 }}
                className="flex-row items-center gap-2">
                <ShieldCheck color={statusColor} size={14} strokeWidth={3} />
                <Text style={{ color: statusColor }} className="text-[10px] font-black tracking-widest uppercase">
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
            <View className="items-center mb-10">
              <View 
                style={{ borderColor: statusColor, borderWidth: 3, borderRadius: 32 }}
                className="h-24 w-24 items-center justify-center bg-white shadow-xl dark:bg-slate-800">
                <UserCheck color={statusColor} size={48} strokeWidth={2.5} />
              </View>
              <Text className="mt-5 text-[28px] font-black text-slate-900 dark:text-white text-center">
                {officer.fullName}
              </Text>
              <Text className="text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1">
                Mission Intelligence Profile
              </Text>
            </View>

            {/* Stats Grid */}
            <View className="flex-row gap-4 mb-10">
              <View className="flex-1 items-center p-4 rounded-3xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100/50 dark:border-amber-500/20">
                <Star color="#F59E0B" fill="#F59E0B" size={18} />
                <Text className="mt-2 text-[18px] font-black text-amber-700 dark:text-amber-400">
                  {officer.rating.toFixed(1)}
                </Text>
                <Text className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest mt-0.5">Rating</Text>
              </View>
              <View className="flex-1 items-center p-4 rounded-3xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100/50 dark:border-blue-500/20">
                <Award color="#3B82F6" size={18} strokeWidth={2.5} />
                <Text className="mt-2 text-[18px] font-black text-blue-700 dark:text-blue-400">
                  {officer.efficiencyScore}%
                </Text>
                <Text className="text-[9px] font-black text-blue-600/60 uppercase tracking-widest mt-0.5">Efficiency</Text>
              </View>
              <View className="flex-1 items-center p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100/50 dark:border-emerald-500/20">
                <PieChart color="#10B981" size={18} strokeWidth={2.5} />
                <Text className="mt-2 text-[18px] font-black text-emerald-700 dark:text-emerald-400">
                  {officer.workloadPercentage.toFixed(0)}%
                </Text>
                <Text className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mt-0.5">Load</Text>
              </View>
            </View>

            {/* Contact Intelligence */}
            <View className="gap-3 mb-10">
              <View className="flex-row items-center gap-5 p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                  <Mail color={statusColor} size={18} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Direct Channel</Text>
                  <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">{officer.email}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-5 p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                  <Phone color={statusColor} size={18} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Operational Line</Text>
                  <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">{officer.phone}</Text>
                </View>
              </View>
            </View>

            {/* Specialisations */}
            <View>
              <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 pl-1">Sector Specialisations</Text>
              <View className="flex-row flex-wrap gap-2.5">
                {officer.specialisations.map((spec: string, idx: number) => (
                  <View 
                    key={idx}
                    style={{ borderColor: statusColor + '40', borderWidth: 1, borderRadius: 100 }}
                    className="px-4 py-2 bg-white dark:bg-slate-900 shadow-sm">
                    <Text className="text-[11px] font-black text-slate-700 dark:text-slate-300 capitalize">{spec}</Text>
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
  subCategory: IssueSubCategory | 'all';
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
  const [local, setLocal] = useState<FilterState>(filters);
  const [openSection, setOpenSection] = useState<FilterSection | null>('status');

  useEffect(() => {
    if (
      local.category !== 'all' &&
      !SUBCATEGORY_MAP[local.category]?.includes(local.subCategory as IssueSubCategory)
    ) {
      setLocal((prev) => ({
        ...prev,
        subCategory: 'all',
      }));
    }
  }, [local.category]);

  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  const availableSubcats: (IssueSubCategory | 'all')[] = useMemo(() => {
    if (!local.category || local.category === 'all') return ['all'];

    return ['all', ...(SUBCATEGORY_MAP[local.category] || [])];
  }, [local.category]);

  const activeCount = [
    local.status !== 'all',
    local.sla !== 'all',
    local.subCategory !== 'all',
    local.priority !== 'all',
  ].filter(Boolean).length;

  const handleApply = () => {
    onChange(local);
    onClose();
  };

  const handleReset = () => {
    const reset: FilterState = {
      status: 'all',
      sla: 'all',
      category: department as CategoryKey,
      subCategory: 'all',
      priority: 'all',
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
              activeValue={local.status !== 'all' ? local.status : undefined}
              activeMeta={local.status !== 'all' ? STATUS_META[local.status] : undefined}>
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
              activeValue={local.sla !== 'all' ? local.sla : undefined}
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
              activeValue={local.priority !== 'all' ? local.priority : undefined}
              activeMeta={local.priority !== 'all' ? PRIORITY_META[local.priority] : undefined}>
              <View className="flex-row flex-wrap gap-2 px-5 pb-4">
                {PRIORITY_OPTIONS.map((p) => {
                  const m =
                    p !== 'all'
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
                      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: m?.dot }} />
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

            {/* SUBCATEGORY - only shown when category is selected */}
            {local.category !== 'all' && (
              <FilterAccordion
                title="Sub-Category"
                icon={<Layers size={15} color="#8B5CF6" strokeWidth={2.5} />}
                isOpen={openSection === 'subcategory'}
                onToggle={() => toggleSection('subcategory')}
                activeValue={local.subCategory !== 'all' ? local.subCategory : undefined}>
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

  // Fetch Unit Officer Notifications
  const notifications = useQuery(
    api.notifications.getByUser,
    user?.id ? { userId: user.id } : 'skip'
  );

  const markAll = useMutation(api.notifications.markAllAsRead);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>(mockDuplicateGroups);

  const unreadNotifCount = notifications?.filter((n) => !n.read).length;

  console.log('Unread Notification Count: ', unreadNotifCount);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    sla: 'all',
    category: 'all',
    subCategory: 'all',
    priority: 'all',
  });

  const activeFilterCount = [
    filters.status !== 'all',
    filters.sla !== 'all',
    filters.subCategory !== 'all',
    filters.priority !== 'all',
  ].filter(Boolean).length;

  useEffect(() => {
    if (unitOfficer?.department) {
      const dept = unitOfficer.department as CategoryKey;

      setFilters((prev) => ({
        ...prev,
        category: dept,
        subCategory: 'all',
      }));
    }
  }, [unitOfficer]);

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
      if (filters.subCategory !== 'all') {
        const hasSub = issue?.subCategories?.includes(filters.subCategory as IssueSubCategory);
        if (!hasSub) return false;
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
                {unreadNotifCount !== undefined && unreadNotifCount > 0 && (
                  <View style={styles.bellDot}>
                    {unreadNotifCount <= 99 && (
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
                    {unreadNotifCount > 99 && (
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 8,
                          fontWeight: '800',
                          lineHeight: 10,
                        }}>
                        99+
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
          role="UnitOfficer"
        />
      )}
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
