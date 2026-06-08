import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  ShieldAlert,
  Eye,
  MapPin,
  Tag,
  Layers,
  Navigation,
  ChevronRight,
  Hash,
  CircleCheck,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Zap,
  Droplets,
  Trash2,
  Recycle,
  Package,
  HeartPulse,
  MoreHorizontal,
  Compass
} from 'lucide-react-native';
import { DuplicateGroup, Issue } from 'lib/types';
import { compareIssues } from 'lib/duplicateDetection';
import DuplicateMergeModal from './DuplicateMergeModal';

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

type DuplicateIssueCardProps = {
  duplicateFlags: any;
  isDark: boolean;
  statusHex?: string;
  onMerge: (keepIssueId: string, deleteIssueIds: string[], groupId: string) => void;
  onReject: (issueIds: string[], groupId: string) => Promise<void> | void;
};

function formatDistanceMeters(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} km`;
  return `${Math.round(value)}m`;
}

function formatDuplicateIssueId(id?: string) {
  if (!id) return "N/A";
  return id.length > 10 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
}

function getDuplicateRiskStyle(level?: string, score?: number, isDark?: boolean) {
  if (level === "Almost Certain Duplicate" || (score ?? 0) >= 90) {
    return {
      label: "Almost Certain",
      hex: "#DC2626",
      softBg: isDark ? "rgba(220,38,38,0.18)" : "#FEF2F2",
      border: isDark ? "rgba(248,113,113,0.45)" : "rgba(248,113,113,0.55)",
      gradientDark: ["#7F1D1D", "#0F172A", "#020617"],
      gradientLight: ["#FFFFFF", "#FEF2F2", "#FEE2E2"],
    };
  }

  if (level === "Strong Duplicate" || (score ?? 0) >= 80) {
    return {
      label: "Strong",
      hex: "#F97316",
      softBg: isDark ? "rgba(249,115,22,0.18)" : "#FFF7ED",
      border: isDark ? "rgba(251,146,60,0.45)" : "rgba(251,146,60,0.55)",
      gradientDark: ["#7C2D12", "#0F172A", "#020617"],
      gradientLight: ["#FFFFFF", "#FFF7ED", "#FFEDD5"],
    };
  }

  return {
    label: "Possible",
    hex: "#F59E0B",
    softBg: isDark ? "rgba(245,158,11,0.15)" : "#FFFBEB",
    border: isDark ? "rgba(245,158,11,0.45)" : "rgba(245,158,11,0.45)",
    gradientDark: ["#78350F", "#0F172A", "#020617"],
    gradientLight: ["#FFFFFF", "#FFFBEB", "#FEF3C7"],
  };
}

function getCategoryStyle(categoryValue: string, isDark: boolean) {
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
        iconBg: isDark ? 'rgba(75, 85, 99, 0.15)' : '#F1F5F9',
      };
  }
}

function MiniMetricBar({
  label,
  value,
  max = 100,
  color,
  suffix = "%",
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  suffix?: string;
}) {
  const safeValue = Math.max(0, Math.min(value, max));
  const width = `${(safeValue / max) * 100}%`;

  return (
    <View className="mb-3">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {label}
        </Text>
        <Text className="text-[11px] font-black text-slate-800 dark:text-slate-100">
          {Math.round(value)}{suffix}
        </Text>
      </View>

      <View className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
        <View
          style={{
            width: width as any,
            height: "100%",
            backgroundColor: color,
            borderRadius: 999,
          }}
        />
      </View>
    </View>
  );
}

function mapDuplicateFlagGroupToModalGroup(flagGroup: any) {
  const issues = [
    flagGroup.currentIssue,
    ...(flagGroup.duplicateIssues ?? []),
  ].filter(Boolean);

  const existingPairMetrics = flagGroup.pairMetrics ?? [];
  const completePairMetrics: any[] = [];

  for (let i = 0; i < issues.length; i++) {
    for (let j = i + 1; j < issues.length; j++) {
      const issA = issues[i];
      const issB = issues[j];

      const existing = existingPairMetrics.find(
        (p: any) =>
          (p.issueAId === issA.id && p.issueBId === issB.id) ||
          (p.issueAId === issB.id && p.issueBId === issA.id)
      );

      if (existing) {
        completePairMetrics.push(existing);
      } else {
        const computed = compareIssues(issA, issB);
        const matchedIssueId = issB.id;

        completePairMetrics.push({
          ...computed,
          matchedIssueId,
          matchedIssue: issB,
          distanceMeters: Math.round(computed.distanceMeters),
          titleSimilarityPercentage: Math.round(computed.titleSimilarity * 100),
          descriptionSimilarityPercentage: Math.round(computed.descriptionSimilarity * 100),
          locationSimilarityPercentage: Math.round(computed.locationSimilarity * 100),
          proximitySimilarityPercentage: Math.round(computed.proximitySimilarity * 100),
          strongDuplicate: computed.duplicateScore >= 80,
          almostCertainDuplicate: computed.duplicateScore >= 90,
        });
      }
    }
  }

  return {
    id: flagGroup.groupId,

    citizenId: flagGroup.citizenId,
    citizenName: flagGroup.citizenName,
    citizenEmail: flagGroup.citizenEmail,
    citizenPhone: flagGroup.citizenPhone,

    detectedAt: flagGroup.detectedAt,
    similarityReason: flagGroup.similarityReason,
    resolved: flagGroup.resolved ?? false,

    issues,

    similarityMetrics: {
      bestOverallScore: flagGroup.metrics?.bestOverallScore ?? 0,
      averageOverallScore: flagGroup.metrics?.averageOverallScore ?? 0,
      bestDuplicateScore: flagGroup.metrics?.bestDuplicateScore ?? 0,
      minimumDistanceMeters: flagGroup.metrics?.minimumDistanceMeters ?? 0,
      pairCount: flagGroup.metrics?.pairCount ?? 0,
      reasons: flagGroup.metrics?.reasons ?? [],
    },

    pairMetrics: completePairMetrics,
  };
}

export default function DuplicateIssueCard({
  duplicateFlags,
  isDark,
  statusHex,
  onMerge,
  onReject,
}: DuplicateIssueCardProps) {
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<any | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [resolvedDuplicateGroupIds, setResolvedDuplicateGroupIds] = useState<string[]>([]);
  const [rejectDialog, setRejectDialog] = useState<{
    visible: boolean;
    success: boolean;
    title: string;
    message: string;
  }>({ visible: false, success: true, title: '', message: '' });
  const [expandedDuplicatePairs, setExpandedDuplicatePairs] = useState<Record<string, boolean>>({});

  const toggleDuplicatePair = (pairKey: string) => {
    setExpandedDuplicatePairs((prev) => ({
      ...prev,
      [pairKey]: !prev[pairKey],
    }));
  };

  const openDuplicateModal = (flagGroup: any) => {
    setSelectedDuplicateGroup(mapDuplicateFlagGroupToModalGroup(flagGroup));
    setShowDuplicateModal(true);
  };

  const activeDuplicateGroups = useMemo(() => {
    if (!duplicateFlags?.groups?.length) return [];

    return duplicateFlags.groups.filter(
      (group: any) => !resolvedDuplicateGroupIds.includes(group.groupId)
    );
  }, [duplicateFlags, resolvedDuplicateGroupIds]);

  const highestDuplicateGroup = useMemo(() => {
    if (!activeDuplicateGroups.length) return null;

    return [...activeDuplicateGroups].sort(
      (a: any, b: any) => b.metrics.bestDuplicateScore - a.metrics.bestDuplicateScore
    )[0];
  }, [activeDuplicateGroups]);

  const premiumStatusDialog = (
    <Modal
      visible={rejectDialog.visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setRejectDialog((prev) => ({ ...prev, visible: false }))}
    >
      <View className="flex-1 items-center justify-center bg-slate-950/60 p-8">
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={() => setRejectDialog((prev) => ({ ...prev, visible: false }))}
        />

        <View
          style={{
            borderColor: isDark
              ? rejectDialog.success
                ? 'rgba(16,185,129,0.25)'
                : 'rgba(239,68,68,0.25)'
              : rejectDialog.success
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(239,68,68,0.15)',
            borderWidth: 1.5,
            shadowColor: rejectDialog.success ? '#10B981' : '#EF4444',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: isDark ? 0.4 : 0.15,
            shadowRadius: 40,
            elevation: 25,
            width: '100%',
            maxWidth: 360,
            borderRadius: 36,
            overflow: 'hidden',
            backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
          }}
        >
          <LinearGradient
            colors={
              isDark
                ? rejectDialog.success
                  ? ['#064E3B', '#0f172a']
                  : ['#7F1D1D', '#0f172a']
                : rejectDialog.success
                  ? ['#ECFDF5', '#FFFFFF']
                  : ['#FEF2F2', '#FFFFFF']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 36, paddingHorizontal: 28, alignItems: 'center' }}
          >
            {/* Icon */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 22,
                backgroundColor: rejectDialog.success
                  ? isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5'
                  : isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              {rejectDialog.success ? (
                <CheckCircle
                  size={32}
                  color={isDark ? '#34D399' : '#059669'}
                  strokeWidth={2.5}
                />
              ) : (
                <XCircle
                  size={32}
                  color={isDark ? '#F87171' : '#DC2626'}
                  strokeWidth={2.5}
                />
              )}
            </View>

            {/* Title */}
            <Text
              className="text-center text-[18px] font-black tracking-tight mb-2"
              style={{
                color: rejectDialog.success
                  ? isDark ? '#34D399' : '#065F46'
                  : isDark ? '#F87171' : '#991B1B',
              }}
            >
              {rejectDialog.title}
            </Text>

            {/* Message */}
            <Text
              className="text-center text-[14px] font-semibold leading-[20px] mb-7"
              style={{
                color: isDark ? '#94A3B8' : '#64748B',
              }}
            >
              {rejectDialog.message}
            </Text>

            {/* Dismiss Button */}
            <TouchableOpacity
              onPress={() => setRejectDialog((prev) => ({ ...prev, visible: false }))}
              activeOpacity={0.85}
              style={{
                width: '100%',
                borderRadius: 16,
                overflow: 'hidden',
                shadowColor: rejectDialog.success ? '#10B981' : '#EF4444',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isDark ? 0.4 : 0.2,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <LinearGradient
                colors={
                  rejectDialog.success
                    ? ['#10B981', '#059669']
                    : ['#EF4444', '#DC2626']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text className="text-[15px] font-black tracking-wide text-white">
                  {rejectDialog.success ? 'Done' : 'Dismiss'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  if (!duplicateFlags?.hasDuplicateFlags || !duplicateFlags?.groups?.length || !highestDuplicateGroup) {
    if (rejectDialog.visible) return premiumStatusDialog;
    return null;
  }

  const riskStyle = getDuplicateRiskStyle(
    highestDuplicateGroup.metrics.duplicateLevel,
    highestDuplicateGroup.metrics.bestDuplicateScore,
    isDark
  );

  const extraGroupsCount = activeDuplicateGroups.length - 1;

  return (
    <View
      style={{
        shadowColor: riskStyle.hex,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: isDark ? 0.35 : 0.1,
        shadowRadius: 30,
        elevation: 15,
        marginBottom: 32,
      }}>
      <LinearGradient
        colors={(isDark ? riskStyle.gradientDark : riskStyle.gradientLight) as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderColor: riskStyle.border,
          borderWidth: 1.5,
          borderRadius: 40,
          overflow: 'hidden',
          position: 'relative',
        }}>
        {/* Watermark Icon */}
        <View style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.04 }}>
          <ShieldAlert size={220} color={riskStyle.hex} strokeWidth={1} />
        </View>

        <View className="py-9 px-7">
          {/* Header */}
          <View className="mb-6 flex-row items-center gap-4">
            <View
              style={{
                height: 50,
                width: 50,
                borderRadius: 18,
                backgroundColor: riskStyle.softBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <ShieldAlert size={24} color={riskStyle.hex} strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                Duplicate Intelligence
              </Text>
              <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Potential duplicate reports detected for this issue.
              </Text>
            </View>
          </View>

          {/* Summary Pills */}
          <View className="mb-6 flex-row flex-wrap gap-2">
            <View className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-3 py-1.5">
              <Text className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                {duplicateFlags.duplicateGroupCount} {duplicateFlags.duplicateGroupCount === 1 ? 'Group' : 'Groups'}
              </Text>
            </View>
            <View className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-3 py-1.5">
              <Text className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                {duplicateFlags.duplicateIssueCount} {duplicateFlags.duplicateIssueCount === 1 ? 'Related Issue' : 'Related Issues'}
              </Text>
            </View>
            <View style={{ backgroundColor: riskStyle.softBg }} className="rounded-xl px-3 py-1.5">
              <Text style={{ color: riskStyle.hex }} className="text-[11px] font-black">
                {riskStyle.label} Duplicate
              </Text>
            </View>
            <View style={{ backgroundColor: riskStyle.softBg }} className="rounded-xl px-3 py-1.5">
              <Text style={{ color: riskStyle.hex }} className="text-[11px] font-black">
                Score {highestDuplicateGroup.metrics.bestDuplicateScore}/100
              </Text>
            </View>
          </View>

          {/* Hero Metric Grid */}
          <View className="mb-6 bg-white/40 dark:bg-slate-900/30 border border-slate-200/35 dark:border-slate-800/30 rounded-3xl p-4">
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 items-center border-r border-slate-200/30 dark:border-slate-800/40">
                <Text style={{ fontSize: Platform.OS === 'ios' ? 8 : 10 }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Best Score
                </Text>
                <Text style={{ color: riskStyle.hex, fontSize: Platform.OS === 'ios' ? 14 : 18 }} className="font-black">
                  {highestDuplicateGroup.metrics.bestDuplicateScore}%
                </Text>
              </View>
              <View className="flex-1 items-center border-r border-slate-200/30 dark:border-slate-800/40">
                <Text style={{ fontSize: Platform.OS === 'ios' ? 8 : 10 }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Nearest
                </Text>
                <Text style={{ fontSize: Platform.OS === 'ios' ? 14 : 18 }} className="font-black text-slate-800 dark:text-slate-100">
                  {formatDistanceMeters(highestDuplicateGroup.metrics.minimumDistanceMeters)}
                </Text>
              </View>
              <View className="flex-1 items-center border-r border-slate-200/30 dark:border-slate-800/40">
                <Text style={{ fontSize: Platform.OS === 'ios' ? 8 : 10 }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Related Issues
                </Text>
                <Text style={{ fontSize: Platform.OS === 'ios' ? 14 : 18 }} className="font-black text-slate-800 dark:text-slate-100">
                  {duplicateFlags.duplicateIssueCount}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text style={{ fontSize: Platform.OS === 'ios' ? 8 : 10 }} className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Threshold
                </Text>
                <Text style={{ fontSize: Platform.OS === 'ios' ? 14 : 18 }} className="font-black text-slate-800 dark:text-slate-100">
                  {highestDuplicateGroup.metrics.threshold}%
                </Text>
              </View>
            </View>

            {/* Best Duplicate Score Progress Bar */}
            <View className="h-1.5 bg-slate-200/60 dark:bg-slate-800 rounded-full overflow-hidden">
              <View
                style={{
                  width: `${Math.min(100, highestDuplicateGroup.metrics.bestDuplicateScore)}%`,
                  height: '100%',
                  backgroundColor: riskStyle.hex,
                  borderRadius: 99,
                }}
              />
            </View>
          </View>

          {/* Why Flagged reasons */}
          {highestDuplicateGroup.metrics.reasons && highestDuplicateGroup.metrics.reasons.length > 0 && (
            <View className="mb-6">
              <Text className="mb-3 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Why this was flagged
              </Text>
              <View style={{ gap: 8 }}>
                {highestDuplicateGroup.metrics.reasons.slice(0, 3).map((reason: string, idx: number) => (
                  <View
                    key={idx}
                    className="bg-white/40 dark:bg-slate-900/30 border border-slate-200/20 dark:border-slate-800/20 rounded-2xl p-3 flex-row items-center gap-3">
                    <View style={{ backgroundColor: riskStyle.softBg }} className="p-1.5 rounded-lg">
                      <ShieldCheck size={14} color={riskStyle.hex} strokeWidth={2.5} />
                    </View>
                    <Text className="flex-1 text-[13px] font-bold text-slate-700 dark:text-slate-200">
                      {reason}
                    </Text>
                  </View>
                ))}

                {/* More signals callout */}
                {highestDuplicateGroup.metrics.reasons.length > 3 && (
                  <Text className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-2">
                    +{highestDuplicateGroup.metrics.reasons.length - 3} more signals
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Duplicate Issue Cards */}
          <View className="mb-4">
            <Text className="mb-3 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Duplicate Reports Preview
            </Text>
            {highestDuplicateGroup.duplicateIssues.slice(0, 2).map((dupIssue: any) => {
              const pair = highestDuplicateGroup.pairMetrics.find(
                (p: any) => p.matchedIssueId === dupIssue.id
              );
              const pairKey = `${highestDuplicateGroup.groupId}-${dupIssue.id}`;
              const isExpanded = !!expandedDuplicatePairs[pairKey];
              const dupRisk = pair ? getDuplicateRiskStyle(pair.duplicateLevel, pair.duplicateScore, isDark) : riskStyle;
              const catStyle = getCategoryStyle(dupIssue.category, isDark);
              const CatIcon = catStyle.icon;

              return (
                <View
                  key={dupIssue.id}
                  className="mb-4 bg-white/60 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30 rounded-3xl p-5 overflow-hidden">
                  {/* Glowing card border indicator based on dupRisk */}
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      backgroundColor: dupRisk.hex,
                    }}
                  />

                  {/* Header Title / Badge Row */}
                  <View className="flex-row justify-between items-start mb-3 gap-3">
                    <Text className="flex-1 text-[15px] font-black text-slate-800 dark:text-slate-100" numberOfLines={2}>
                      {dupIssue.title}
                    </Text>
                    {pair && (
                      <View style={{ backgroundColor: dupRisk.softBg }} className="rounded-xl px-2.5 py-1 flex-row items-center gap-1 self-start border border-orange-500/20 dark:border-orange-500/10">
                        <Text style={{ color: dupRisk.hex }} className="text-[10px] font-black">
                          {pair.duplicateScore}% Match
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  {dupIssue.description ? (
                    <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-4 leading-[18px]" numberOfLines={2}>
                      {dupIssue.description}
                    </Text>
                  ) : null}

                  {/* Info Elements */}
                  <View className="mb-4 gap-3">
                    {/* Category and Status row */}
                    <View className="flex-row items-center gap-2">
                      {/* Custom Category Pill using getCategoryStyle */}
                      <View
                        style={{ backgroundColor: catStyle.bg, borderColor: catStyle.hex + '33' }}
                        className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-xl border">
                        <View style={{ backgroundColor: catStyle.hex }} className="p-0.5 rounded-md">
                          <CatIcon size={11} color="#FFFFFF" strokeWidth={3} />
                        </View>
                        <Text className={`text-[11px] font-black uppercase tracking-wider ${catStyle.textClass}`}>
                          {CATEGORY_LABEL_MAP[dupIssue.category] || dupIssue.category}
                        </Text>
                      </View>

                      {/* Status Pill */}
                      <View className="bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/40 dark:border-slate-700/40 rounded-xl px-2.5 py-1">
                        <Text className="text-[11px] font-black text-slate-600 dark:text-slate-300">
                          {dupIssue.status}
                        </Text>
                      </View>
                    </View>

                    {/* Nice design for Subcategories */}
                    {dupIssue.subCategories && dupIssue.subCategories.length > 0 ? (
                      <View className="flex-row flex-wrap gap-1.5">
                        {dupIssue.subCategories.map((sub: string, i: number) => (
                          <View
                            key={i}
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }}
                            className="px-2.5 py-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex-row items-center gap-1">
                            <Tag size={10} color="#94A3B8" strokeWidth={2.5} />
                            <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {sub}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {/* Location displayed completely and nicely styled */}
                    <View
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderWidth: 1,
                      }}
                      className="flex-row items-start gap-2.5 rounded-2xl p-3">
                      <MapPin size={14} color={dupRisk.hex} strokeWidth={2.5} style={{ marginTop: 2 }} />
                      <Text className="flex-1 text-[12px] font-bold leading-[18px] text-slate-600 dark:text-slate-300">
                        {dupIssue.location}
                        {pair?.distanceMeters !== undefined ? ` (~${formatDistanceMeters(pair.distanceMeters)} away)` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* View Similarity Metrics Toggle */}
                  {pair && (
                    <View>
                      <TouchableOpacity
                        onPress={() => toggleDuplicatePair(pairKey)}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between border-t border-slate-200/40 dark:border-slate-800/40 pt-3.5">
                        <Text className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Similarity Metrics Breakdown
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={16} color={dupRisk.hex} strokeWidth={3} />
                        ) : (
                          <ChevronDown size={16} color={dupRisk.hex} strokeWidth={3} />
                        )}
                      </TouchableOpacity>

                      {isExpanded && (
                        <View className="mt-4 border-t border-slate-200/30 dark:border-slate-800/30 pt-3">
                          <MiniMetricBar
                            label="Title Similarity"
                            value={pair.titleSimilarityPercentage}
                            color={dupRisk.hex}
                          />
                          <MiniMetricBar
                            label="Description Similarity"
                            value={pair.descriptionSimilarityPercentage}
                            color={dupRisk.hex}
                          />
                          <MiniMetricBar
                            label="Location Similarity"
                            value={pair.locationSimilarityPercentage}
                            color={dupRisk.hex}
                          />
                          <MiniMetricBar
                            label="Proximity Similarity"
                            value={pair.proximitySimilarityPercentage}
                            color={dupRisk.hex}
                          />
                          <MiniMetricBar
                            label="Overall Score"
                            value={pair.overallScore * 100}
                            color={dupRisk.hex}
                          />

                          {/* Match badges */}
                          <View className="flex-row flex-wrap gap-2 mt-2">
                            <View className={`rounded-full px-2.5 py-1 flex-row items-center gap-1 ${pair.categoryMatch ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-slate-100 dark:bg-slate-800/60'}`}>
                              <Text className={`text-[10px] font-black uppercase tracking-wider ${pair.categoryMatch ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                Category Match: {pair.categoryMatch ? 'Yes' : 'No'}
                              </Text>
                            </View>
                            <View className={`rounded-full px-2.5 py-1 flex-row items-center gap-1 ${pair.subCategoryMatch ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-slate-100 dark:bg-slate-800/60'}`}>
                              <Text className={`text-[10px] font-black uppercase tracking-wider ${pair.subCategoryMatch ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                Subcategory Match: {pair.subCategoryMatch ? 'Yes' : 'No'}
                              </Text>
                            </View>
                          </View>

                          {/* Matched Subcategories */}
                          {pair.matchedSubCategories && pair.matchedSubCategories.length > 0 && (
                            <View className="mt-3.5 flex-row flex-wrap gap-1.5">
                              <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest self-center mr-1">
                                Matched Subcats:
                              </Text>
                              {pair.matchedSubCategories.map((sub: string, i: number) => (
                                <View key={i} className="bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50">
                                  <Text className="text-[10px] font-black text-slate-600 dark:text-slate-300">
                                    {sub}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Action Hint Callout */}
          <View className="bg-white/30 dark:bg-slate-950/20 border border-slate-200/20 dark:border-slate-800/20 rounded-2xl p-4 flex-row items-start gap-3 mb-5">
            <Compass size={18} color={riskStyle.hex} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-[12px] font-bold leading-[18px] text-slate-600 dark:text-slate-400">
              {highestDuplicateGroup.metrics.almostCertainDuplicate
                ? 'This issue appears almost identical to an existing active issue. Review carefully before verification or assignment.'
                : highestDuplicateGroup.metrics.strongDuplicate
                  ? 'This issue has strong duplicate indicators. Consider merging or rejecting duplicates from the duplicate resolution panel.'
                  : 'This issue may be related to another active report. Review the metrics before taking action.'}
            </Text>
          </View>

          {/* Resolve Action Button */}
          <TouchableOpacity
            onPress={() => openDuplicateModal(highestDuplicateGroup)}
            activeOpacity={0.85}
            className="w-full rounded-[20px] overflow-hidden shadow-lg"
            style={{
              shadowColor: riskStyle.hex,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.45 : 0.25,
              shadowRadius: 16,
              elevation: 6,
            }}>
            <LinearGradient
              colors={isDark ? ['#1E293B', '#0F172A'] : [riskStyle.hex, riskStyle.hex]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: isDark ? 1.5 : 0,
                borderColor: riskStyle.hex + '55',
              }}>
              <Text className="text-[15px] font-black tracking-wide text-white">
                Open Duplicate Resolution
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Extra groups count indicator */}
          {extraGroupsCount > 0 && (
            <Text className="mt-3.5 text-center text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              +{extraGroupsCount} more duplicate group{extraGroupsCount > 1 ? 's' : ''} detected
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* Render DuplicateMergeModal */}
      {showDuplicateModal && selectedDuplicateGroup && (
        <DuplicateMergeModal
          group={selectedDuplicateGroup}
          onClose={() => {
            setShowDuplicateModal(false);
            setSelectedDuplicateGroup(null);
          }}
          onMerge={(keepIssueId, deleteIssueIds, groupId) => {
            onMerge(keepIssueId, deleteIssueIds, groupId);

            setResolvedDuplicateGroupIds((prev) => [...prev, groupId]);
            setShowDuplicateModal(false);
            setSelectedDuplicateGroup(null);
          }}
          onReject={async (issueIds, groupId) => {
            try {
              await onReject(issueIds, groupId);

              setRejectDialog({
                visible: true,
                success: true,
                title: 'Duplicate Issues Rejected',
                message: `${issueIds.length} duplicate issue${issueIds.length > 1 ? 's have' : ' has'} been rejected successfully.`,
              });

              // Only hide the entire group if all duplicate issues in it are rejected
              if (issueIds.length === selectedDuplicateGroup.issues.length - 1) {
                setResolvedDuplicateGroupIds((prev) => [...prev, groupId]);
              }
              setShowDuplicateModal(false);
              setSelectedDuplicateGroup(null);
            } catch (error) {
              console.error('Duplicate rejection failed:', error);
              setRejectDialog({
                visible: true,
                success: false,
                title: 'Rejection Failed',
                message: 'Failed to reject duplicate issues. Please try again.',
              });
            }
          }}
        />
      )}

      {premiumStatusDialog}
    </View>
  );
}
