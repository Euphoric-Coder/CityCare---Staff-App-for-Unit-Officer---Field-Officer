import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
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
  User,
  Calendar,
  UserCheck,
  X,
  Tag,
  Layers,
  TriangleAlert as AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react-native';
import { Issue, IssueStatus, IssueCategory, IssueSubCategory, IssuePriority } from '../lib/types';
import {
  mockIssues,
  mockDashboardStats as mockStats,
  mockUnitOfficerNotifications,
  mockDuplicateGroups,
} from '../lib/mockData';
import { useNavigation } from '@react-navigation/native';
import DuplicateDetectionBanner from '../components/DuplicateDetectionBanner';
import { DuplicateGroup } from '../lib/types';
import NotificationPanel from 'components/NotificationPanel';

interface UnitOfficerDashboardProps {
  userName?: string;
  ward?: string;
}

const STATUS_OPTIONS: (IssueStatus | 'All')[] = [
  'All',
  'Pending',
  'Verified',
  'Assigned',
  'In Progress',
  'Pending UO Verification',
  'Rework Required',
  'Reopened',
  'Escalated',
  'Closed',
  'Rejected',
];

const CATEGORY_OPTIONS: (IssueCategory | 'All')[] = [
  'All',
  'Pothole',
  'Street Light',
  'Waste Management',
  'Water Supply',
  'Drainage',
  'Road Repair',
  'Park Maintenance',
  'Public Safety',
];

const SUBCATEGORY_MAP: Record<IssueCategory, IssueSubCategory[]> = {
  Pothole: ['Minor Pothole', 'Major Pothole', 'Road Cave-in'],
  'Street Light': ['Street Light Out', 'Flickering Light', 'Damaged Pole'],
  'Waste Management': ['Garbage Overflow', 'Illegal Dumping'],
  'Water Supply': ['Water Leakage', 'No Water Supply'],
  Drainage: ['Drain Overflow', 'Blocked Drain'],
  'Road Repair': ['Footpath Damage', 'Median Damage'],
  'Park Maintenance': ['Tree Fallen', 'Equipment Broken'],
  'Public Safety': ['Noise Complaint', 'Encroachment', 'Other'],
};

const PRIORITY_OPTIONS: (IssuePriority | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low'];

type SLAFilter = 'All' | 'Overdue' | 'Due Soon' | 'On Track';
const SLA_OPTIONS: SLAFilter[] = ['All', 'Overdue', 'Due Soon', 'On Track'];

const STATUS_META: Record<
  string,
  { bg: string; darkBg: string; text: string; darkText: string; dot: string; border: string }
> = {
  All: {
    bg: 'bg-blue-100',
    darkBg: 'dark:bg-blue-900/40',
    text: 'text-blue-700',
    darkText: 'dark:text-blue-300',
    dot: '#3B82F6',
    border: 'border-blue-200 dark:border-blue-800',
  },
  Pending: {
    bg: 'bg-amber-100',
    darkBg: 'dark:bg-amber-900/40',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-300',
    dot: '#F59E0B',
    border: 'border-amber-200 dark:border-amber-800',
  },
  Verified: {
    bg: 'bg-emerald-100',
    darkBg: 'dark:bg-emerald-900/40',
    text: 'text-emerald-700',
    darkText: 'dark:text-emerald-300',
    dot: '#10B981',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  Assigned: {
    bg: 'bg-blue-100',
    darkBg: 'dark:bg-blue-900/40',
    text: 'text-blue-700',
    darkText: 'dark:text-blue-300',
    dot: '#3B82F6',
    border: 'border-blue-200 dark:border-blue-800',
  },
  'In Progress': {
    bg: 'bg-violet-100',
    darkBg: 'dark:bg-violet-900/40',
    text: 'text-violet-700',
    darkText: 'dark:text-violet-300',
    dot: '#8B5CF6',
    border: 'border-violet-200 dark:border-violet-800',
  },
  'Pending UO Verification': {
    bg: 'bg-amber-100',
    darkBg: 'dark:bg-amber-900/40',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-300',
    dot: '#F59E0B',
    border: 'border-amber-200 dark:border-amber-800',
  },
  'Rework Required': {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
    dot: '#EF4444',
    border: 'border-red-200 dark:border-red-800',
  },
  Reopened: {
    bg: 'bg-orange-100',
    darkBg: 'dark:bg-orange-900/40',
    text: 'text-orange-700',
    darkText: 'dark:text-orange-300',
    dot: '#F97316',
    border: 'border-orange-200 dark:border-orange-800',
  },
  Escalated: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-800',
    darkText: 'dark:text-red-300',
    dot: '#DC2626',
    border: 'border-red-200 dark:border-red-800',
  },
  Closed: {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-700/50',
    text: 'text-slate-600',
    darkText: 'dark:text-slate-400',
    dot: '#94A3B8',
    border: 'border-slate-200 dark:border-slate-600',
  },
  Rejected: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-900',
    darkText: 'dark:text-red-400',
    dot: '#991B1B',
    border: 'border-red-200 dark:border-red-800',
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
    bg: 'bg-orange-100',
    darkBg: 'dark:bg-orange-900/40',
    text: 'text-orange-700',
    darkText: 'dark:text-orange-300',
  },
  'Street Light': {
    bg: 'bg-yellow-100',
    darkBg: 'dark:bg-yellow-900/40',
    text: 'text-yellow-700',
    darkText: 'dark:text-yellow-300',
  },
  'Waste Management': {
    bg: 'bg-green-100',
    darkBg: 'dark:bg-green-900/40',
    text: 'text-green-700',
    darkText: 'dark:text-green-300',
  },
  'Water Supply': {
    bg: 'bg-blue-100',
    darkBg: 'dark:bg-blue-900/40',
    text: 'text-blue-700',
    darkText: 'dark:text-blue-300',
  },
  Drainage: {
    bg: 'bg-cyan-100',
    darkBg: 'dark:bg-cyan-900/40',
    text: 'text-cyan-700',
    darkText: 'dark:text-cyan-300',
  },
  'Road Repair': {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-700/50',
    text: 'text-slate-700',
    darkText: 'dark:text-slate-300',
  },
  'Park Maintenance': {
    bg: 'bg-emerald-100',
    darkBg: 'dark:bg-emerald-900/40',
    text: 'text-emerald-700',
    darkText: 'dark:text-emerald-300',
  },
  'Public Safety': {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
  },
};

const SLA_META: Record<
  SLAFilter,
  { bg: string; darkBg: string; text: string; darkText: string; dot: string }
> = {
  All: {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-700/50',
    text: 'text-slate-600',
    darkText: 'dark:text-slate-300',
    dot: '#94A3B8',
  },
  Overdue: {
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-900/40',
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
    dot: '#DC2626',
  },
  'Due Soon': {
    bg: 'bg-amber-100',
    darkBg: 'dark:bg-amber-900/40',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-300',
    dot: '#F59E0B',
  },
  'On Track': {
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
  const sm = STATUS_META[issue.status] ?? STATUS_META.All;
  const pm = PRIORITY_META[issue.priority] ?? PRIORITY_META.Low;
  const cm = CATEGORY_META[issue.category] ?? {
    bg: 'bg-slate-100',
    darkBg: 'dark:bg-slate-700/50',
    text: 'text-slate-700',
    darkText: 'dark:text-slate-300',
  };
  const slaStatus = getSlaStatus(issue.slaDeadline);
  const slaLabel = formatSlaDeadline(issue.slaDeadline);
  const isOverdue = slaStatus === 'Overdue';
  const isDueSoon = slaStatus === 'Due Soon';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      className={`mb-3 overflow-hidden rounded-3xl border bg-white dark:bg-slate-800 ${
        isOverdue
          ? 'border-red-200 dark:border-red-800/60'
          : isDueSoon
            ? 'border-amber-200 dark:border-amber-800/60'
            : 'border-slate-100 dark:border-slate-700'
      }`}
      style={styles.card}>
      {isOverdue && (
        <View className="flex-row items-center gap-1.5 bg-red-500 px-4 py-1.5 dark:bg-red-700">
          <AlertTriangle color="#FFFFFF" size={11} strokeWidth={2.5} />
          <Text className="text-[10px] font-extrabold tracking-wider text-white">SLA OVERDUE</Text>
        </View>
      )}
      {isDueSoon && !isOverdue && (
        <View className="flex-row items-center gap-1.5 bg-amber-400 px-4 py-1.5 dark:bg-amber-700">
          <Clock color="#FFFFFF" size={11} strokeWidth={2.5} />
          <Text className="text-[10px] font-extrabold tracking-wider text-white">SLA DUE SOON</Text>
        </View>
      )}

      <View className="p-4">
        {/* Top row: category + priority */}
        <View className="mb-3 flex-row items-center justify-between">
          <View
            className={`flex-row items-center gap-1.5 rounded-lg px-2.5 py-1 ${cm.bg} ${cm.darkBg}`}>
            <Tag
              size={10}
              strokeWidth={2.5}
              color={undefined}
              className={`${cm.text} ${cm.darkText}`}
            />
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
          className="mb-3 text-[15px] font-extrabold leading-[21px] text-slate-900 dark:text-slate-50"
          numberOfLines={2}>
          {issue.title}
        </Text>

        {/* Sub-categories */}
        {issue.subCategories && issue.subCategories.length > 0 && (
          <View className="mb-2.5 flex-row flex-wrap gap-1.5">
            {issue.subCategories.slice(0, 2).map((sc) => (
              <View key={sc} className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-700">
                <Text className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {sc}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Location + citizen */}
        <View className="mb-2.5 gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <MapPin color="#9CA3AF" size={12} strokeWidth={2} />
            <Text
              className="flex-1 text-[12px] text-slate-500 dark:text-slate-400"
              numberOfLines={1}>
              {issue.location}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <User color="#9CA3AF" size={12} strokeWidth={2} />
            <Text className="text-[12px] text-slate-500 dark:text-slate-400">
              {issue.citizenName}
            </Text>
          </View>
        </View>

        {/* Assigned officer pill */}
        {issue.assignedOfficer && (
          <View className="mb-3 flex-row items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 dark:border-teal-800/50 dark:bg-teal-900/30">
            <View className="h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 dark:bg-teal-500/30">
              <UserCheck color="#0F766E" size={11} strokeWidth={2.5} />
            </View>
            <Text
              className="flex-1 text-[12px] font-bold text-teal-700 dark:text-teal-400"
              numberOfLines={1}>
              {issue.assignedOfficer}
            </Text>
            <Text className="text-[10px] font-semibold text-teal-500 dark:text-teal-500">
              Assigned
            </Text>
          </View>
        )}

        {/* Footer: date + SLA + status */}
        <View className="flex-row items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-700/70">
          <View className="flex-row items-center gap-1.5">
            <Calendar color="#9CA3AF" size={11} strokeWidth={2} />
            <Text className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {formatRelativeDate(issue.dateReported)}
            </Text>
          </View>

          {slaLabel && (
            <View className="flex-row items-center gap-1">
              <Clock
                color={isOverdue ? '#DC2626' : isDueSoon ? '#F59E0B' : '#94A3B8'}
                size={11}
                strokeWidth={2}
              />
              <Text
                className={`text-[11px] font-bold ${
                  isOverdue
                    ? 'text-red-600 dark:text-red-400'
                    : isDueSoon
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 dark:text-slate-500'
                }`}>
                {isOverdue ? 'Overdue' : slaLabel}
              </Text>
            </View>
          )}

          <View
            className={`flex-row items-center gap-1 rounded-lg px-2.5 py-1 ${sm.bg} ${sm.darkBg}`}>
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sm.dot }} />
            <Text className={`text-[10px] font-bold ${sm.text} ${sm.darkText}`}>
              {issue.status}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface FilterState {
  status: IssueStatus | 'All';
  sla: SLAFilter;
  category: IssueCategory | 'All';
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
    local.category !== 'All' ? ['All', ...(SUBCATEGORY_MAP[local.category] ?? [])] : ['All'];

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
                  const m = STATUS_META[s] ?? STATUS_META.All;
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
                        className={`text-[12px] font-semibold ${isActive ? `${m.text} ${m.darkText}` : 'text-slate-500 dark:text-slate-400'}`}>
                        {s}
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
              activeMeta={local.sla !== 'All' ? SLA_META[local.sla] : undefined}>
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

export default function UnitOfficerDashboard({
  userName = 'Kumar Singh',
  ward = 'Varanasi Zone',
}: UnitOfficerDashboardProps) {
  const navigation = useNavigation();
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

  const filteredIssues = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return mockIssues.filter((issue) => {
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
  }, [searchQuery, filters]);

  const overdueCount = useMemo(
    () => mockIssues.filter((i) => getSlaStatus(i.slaDeadline) === 'Overdue').length,
    []
  );

  const stats = [
    {
      label: 'Total',
      value: mockStats.totalIssues,
      icon: <FileText color="#5EEAD4" size={20} strokeWidth={2} />,
      iconBg: 'rgba(94,234,212,0.18)',
    },
    {
      label: 'Pending',
      value: mockStats.pendingVerification,
      icon: <Clock color="#FDE68A" size={20} strokeWidth={2} />,
      iconBg: 'rgba(253,230,138,0.18)',
    },
    {
      label: 'Assigned',
      value: mockStats.assigned,
      icon: <AlertCircle color="#7DD3FC" size={20} strokeWidth={2} />,
      iconBg: 'rgba(125,211,252,0.18)',
    },
    {
      label: 'Closed',
      value: mockStats.closed,
      icon: <CheckCircle color="#86EFAC" size={20} strokeWidth={2} />,
      iconBg: 'rgba(134,239,172,0.18)',
    },
  ];

  const activeStatus = filters.status !== 'All' ? STATUS_META[filters.status] : null;
  const activeSla = filters.sla !== 'All' ? SLA_META[filters.sla] : null;
  const activeCat = filters.category !== 'All' ? CATEGORY_META[filters.category] : null;
  const activePri = filters.priority !== 'All' ? PRIORITY_META[filters.priority] : null;

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
          colors={['#0F766E', '#0891B2', '#0C4A6E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          <View className="mb-6 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="mb-1 text-[13px] font-medium text-white/70">Welcome back,</Text>
              <Text className="mb-2.5 text-[26px] font-extrabold tracking-tight text-white">
                {userName}
              </Text>
              <View className="flex-row items-center gap-1 self-start rounded-full bg-white/[0.16] px-2.5 py-1">
                <MapPin color="rgba(255,255,255,0.85)" size={10} strokeWidth={2.5} />
                <Text className="text-[11px] font-bold text-white">{ward}</Text>
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
          {filteredIssues.length === 0 ? (
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
                  // @ts-expect-error - navigation params typing
                  navigation.navigate('IssueDetail' as never, { issueId: issue.id } as never)
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
      />

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
