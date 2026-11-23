import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  AlertTriangle,
  Activity,
  Clock,
  Layers,
  X,
} from 'lucide-react-native';

type TrendRange = 7 | 30 | 90 | 'all';

interface TrendAnalyserPanelProps {
  trendAnalytics: any;
  loading?: boolean;
  selectedRange: TrendRange;
  onRangeChange: (range: TrendRange) => void;
}

export default function TrendAnalyserPanel({
  trendAnalytics,
  loading,
  selectedRange,
  onRangeChange,
}: TrendAnalyserPanelProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [modalVisible, setModalVisible] = useState(false);

  const scope = trendAnalytics?.scope;
  const summary = trendAnalytics?.summary;
  const trendDirection = trendAnalytics?.trendDirection;
  const hotspotTrends = trendAnalytics?.hotspotTrends || [];
  const duplicateTrend = trendAnalytics?.duplicateTrend;
  const recommendations = trendAnalytics?.recommendations || [];

  const rangeOptions: { label: string; value: TrendRange }[] = [
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
    { label: 'All', value: 'all' },
  ];

  const selectedRangeHasData =
    selectedRange === 'all'
      ? (summary?.totalIssuesAnalysed ?? summary?.totalIssues ?? 0) > 0
      : (summary?.currentWindowIssues ?? summary?.totalIssues ?? 0) > 0;

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return {
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
          border: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2',
          text: isDark ? '#FCA5A5' : '#DC2626',
          iconColor: isDark ? '#F87171' : '#EF4444',
          dot: '#EF4444',
        };
      case 'high':
        return {
          bg: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
          border: isDark ? 'rgba(249, 115, 22, 0.35)' : '#FFEDD5',
          text: isDark ? '#FDBA74' : '#EA580C',
          iconColor: isDark ? '#FB923C' : '#F97316',
          dot: '#F97316',
        };
      case 'medium':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
          border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FEF3C7',
          text: isDark ? '#FCD34D' : '#D97706',
          iconColor: isDark ? '#FBBF24' : '#F59E0B',
          dot: '#F59E0B',
        };
      default:
        return {
          bg: isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF',
          border: isDark ? 'rgba(56, 189, 248, 0.35)' : '#E0F2FE',
          text: isDark ? '#7DD3FC' : '#0284C7',
          iconColor: isDark ? '#38BDF8' : '#0EA5E9',
          dot: '#0EA5E9',
        };
    }
  };

  const renderHeader = () => {
    return (
      <LinearGradient
        colors={isDark ? ['#0F172A', '#1E293B'] : ['#E0F2FE', '#F0F9FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Activity size={16} color={isDark ? '#38BDF8' : '#0284C7'} strokeWidth={2.5} />
              <Text className="text-[12px] font-black uppercase tracking-[2.5px] text-sky-600 dark:text-sky-400">
                Trend Analyser
              </Text>
            </View>
            <Text className="text-[15px] font-black text-slate-800 dark:text-slate-100">
              Operational Pattern Insights
            </Text>
            <Text className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Department: {scope?.department || 'Civic'} • City: {scope?.city || 'Not assigned'}
            </Text>
          </View>
          <View className="items-end">
            <View
              style={{
                backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#E0F2FE',
                borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                borderWidth: isDark ? 1 : 0,
              }}
              className="rounded-full px-2.5 py-1"
            >
              <Text className="text-[9px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                {selectedRange === 'all' ? 'All Time' : `${selectedRange} Days`}
              </Text>
            </View>
            <Text className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
              Live updates
            </Text>
          </View>
        </View>

        {/* Range Selector chips */}
        <View
          style={{
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderWidth: 1,
          }}
          className="mt-4 flex-row rounded-2xl p-1"
        >
          {rangeOptions.map((option) => {
            const active = selectedRange === option.value;

            return (
              <TouchableOpacity
                key={String(option.value)}
                onPress={() => onRangeChange(option.value)}
                activeOpacity={0.85}
                className={`flex-1 rounded-xl px-2 py-2 ${
                  active ? 'bg-sky-600 dark:bg-sky-500' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-center text-[11px] font-black ${
                    active ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    );
  };

  if (loading) {
    return (
      <View
        style={{
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? '#1E293B' : '#F1F5F9',
        }}
        className="my-4 rounded-3xl p-6 shadow-sm border items-center justify-center"
      >
        <ActivityIndicator size="small" color="#0EA5E9" />
        <Text className="mt-2.5 text-[13px] font-bold text-slate-500 dark:text-slate-400">
          Analyzing issue patterns & hotspots...
        </Text>
      </View>
    );
  }

  if (!trendAnalytics || !summary || !selectedRangeHasData) {
    return (
      <View
        style={{
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? '#1E293B' : '#E2E8F0',
        }}
        className="my-4 rounded-[28px] overflow-hidden border shadow-sm"
      >
        {renderHeader()}
        <View
          style={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }}
          className="p-6 items-center justify-center py-8"
        >
          <Activity size={24} color={isDark ? '#64748B' : '#94A3B8'} className="mb-2.5" />
          <Text className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 text-center">
            {selectedRange === 'all'
              ? 'No Trend Data Available Yet'
              : `No Analytics for This ${selectedRange}-Day Range`}
          </Text>
          <Text className="mt-1.5 text-[12px] text-slate-400 dark:text-slate-400 text-center max-w-[280px]">
            {selectedRange === 'all'
              ? 'Trends will appear here automatically as more civic issues are reported and analyzed in your assigned area.'
              : `No issues were reported in the last ${selectedRange} days for your assigned scope. Try 30D, 90D, or All Time to view older operational patterns.`}
          </Text>
        </View>
      </View>
    );
  }

  const duplicateGroupIssueCount =
    duplicateTrend?.duplicateGroupIssueCount ??
    duplicateTrend?.totalDuplicateIssues ??
    summary?.duplicateIssues ??
    0;

  const redundantDuplicateIssues =
    duplicateTrend?.redundantDuplicateIssues ??
    summary?.redundantDuplicateIssues ??
    0;

  const duplicateRate =
    duplicateTrend?.duplicateRate ?? summary?.duplicateRate ?? 0;

  const duplicateGroups =
    duplicateTrend?.totalGroups ?? summary?.duplicateGroups ?? 0;

  const pendingDuplicateCandidateCount =
    duplicateTrend?.pendingDuplicateCandidateCount ??
    summary?.pendingDuplicateCandidateCount ??
    0;

  const duplicateExplanation =
    pendingDuplicateCandidateCount <= 0
      ? 'No pending issues available for duplicate review.'
      : duplicateGroupIssueCount > 0
        ? `Out of ${pendingDuplicateCandidateCount} pending ${pendingDuplicateCandidateCount === 1 ? 'issue' : 'issues'}, ${duplicateGroupIssueCount} ${duplicateGroupIssueCount === 1 ? 'is' : 'are'} part of duplicate groups.`
        : `Out of ${pendingDuplicateCandidateCount} pending ${pendingDuplicateCandidateCount === 1 ? 'issue' : 'issues'}, no duplicate group was detected.`;

  const hotspotAreaCount = summary?.hotspotAreaCount ?? hotspotTrends.length;
  const hotspotIssueCount = summary?.hotspotIssueCount ?? hotspotTrends.reduce((s: number, h: any) => s + h.issueCount, 0);

  return (
    <View
      style={{
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        borderColor: isDark ? '#1E293B' : '#E2E8F0',
      }}
      className="my-4 rounded-[28px] overflow-hidden border shadow-sm"
    >
      {/* Header Banner */}
      {renderHeader()}

      <View className="p-4">
        {/* Range selection helper line */}
        <Text className="text-[10px] text-slate-400 dark:text-slate-400 mb-3.5">
          {selectedRange === 'all'
            ? 'Showing all-time operational patterns.'
            : `Showing analytics for issues reported in the last ${selectedRange} days.`}
        </Text>

        {/* Summary metric cards */}
        <View className="flex-row flex-wrap gap-2.5 mb-4">
          {/* Card 1: Duplicate Rate */}
          <View
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9',
            }}
            className="flex-1 min-w-[45%] rounded-2xl p-3 border"
          >
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Duplicates
              </Text>
              <Layers size={14} color={isDark ? '#38BDF8' : '#0284C7'} />
            </View>
            <Text className="text-[20px] font-black text-slate-800 dark:text-slate-100">
              {duplicateRate}%
            </Text>
            <Text className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5" numberOfLines={1}>
              {duplicateGroupIssueCount} pending issues in {duplicateGroups} {duplicateGroups === 1 ? 'group' : 'groups'}
            </Text>
            {redundantDuplicateIssues > 0 && (
              <Text className="text-[9px] text-slate-400 dark:text-slate-400 mt-0.5" numberOfLines={1}>
                {redundantDuplicateIssues} likely redundant {redundantDuplicateIssues === 1 ? 'complaint' : 'complaints'}
              </Text>
            )}
            <Text className="text-[8.5px] text-slate-400 dark:text-slate-400 mt-1" numberOfLines={2}>
              {duplicateExplanation}
            </Text>
          </View>

          {/* Card 2: Hotspots */}
          <View
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9',
            }}
            className="flex-1 min-w-[45%] rounded-2xl p-3 border"
          >
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Geo Hotspots
              </Text>
              <MapPin size={14} color={isDark ? '#F87171' : '#EF4444'} />
            </View>
            <Text className="text-[20px] font-black text-slate-800 dark:text-slate-100">
              {hotspotAreaCount} Areas
            </Text>
            <Text className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5" numberOfLines={1}>
              {hotspotIssueCount} issues inside hotspots
            </Text>
          </View>

          {/* Card 3: SLA Risk */}
          <View
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9',
            }}
            className="flex-1 min-w-[45%] rounded-2xl p-3 border"
          >
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                SLA Risk
              </Text>
              <Clock size={14} color={isDark ? '#FBBF24' : '#F59E0B'} />
            </View>
            <Text className="text-[20px] font-black text-slate-800 dark:text-slate-100">
              {summary.slaRiskCount} Issues
            </Text>
            <Text className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5" numberOfLines={1}>
              {summary.overdueIssues} currently overdue
            </Text>
          </View>

          {/* Card 4: Reporting Trend */}
          <View
            style={{
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9',
            }}
            className="flex-1 min-w-[45%] rounded-2xl p-3 border"
          >
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Reporting Rate
              </Text>
              {trendDirection?.direction === 'up' ? (
                <TrendingUp size={14} color={isDark ? '#34D399' : '#10B981'} />
              ) : trendDirection?.direction === 'down' ? (
                <TrendingDown size={14} color={isDark ? '#F87171' : '#EF4444'} />
              ) : (
                <Activity size={14} color={isDark ? '#94A3B8' : '#64748B'} />
              )}
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-[20px] font-black text-slate-800 dark:text-slate-100">
                {trendDirection?.direction === 'stable' ? 'Stable' : `${Math.abs(trendDirection?.changePercent || 0)}%`}
              </Text>
              {trendDirection?.direction !== 'stable' && (
                <Text
                  className={`text-[10px] font-bold ${
                    trendDirection?.direction === 'up'
                      ? isDark
                        ? 'text-red-400'
                        : 'text-red-500'
                      : isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-500'
                  }`}
                >
                  {trendDirection?.direction === 'up' ? '▲' : '▼'}
                </Text>
              )}
            </View>
            <Text className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5" numberOfLines={1}>
              {selectedRange !== 'all' && (summary?.totalIssues === 0 || summary?.currentWindowIssues === 0)
                ? `No new complaints in this ${selectedRange}-day window`
                : trendDirection?.label || 'reporting rate'}
            </Text>
          </View>
        </View>

        {/* Priority Recommendation block */}
        {recommendations.slice(0, 1).map((rec: any, idx: number) => {
          const colors = severityColor(rec.severity);
          return (
            <View
              key={idx}
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
              }}
              className="rounded-2xl p-4 border"
            >
              <View className="flex-row items-center gap-2 mb-1.5">
                <AlertTriangle size={16} color={colors.iconColor} />
                <Text
                  style={{ color: colors.text }}
                  className="text-[13px] font-black uppercase tracking-wider"
                >
                  Action Recommended ({rec.severity})
                </Text>
              </View>
              <Text className="text-[13px] font-black text-slate-800 dark:text-slate-100">
                {rec.title}
              </Text>
              <Text className="text-[12px] leading-[18px] text-slate-600 dark:text-slate-300 mt-1">
                {rec.message}
              </Text>
            </View>
          );
        })}

        {/* View Details Button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
          style={{
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          }}
          className="mt-3 flex-row items-center justify-center py-2.5 rounded-xl border"
        >
          <Text className="mr-1.5 text-[12px] font-black text-slate-600 dark:text-slate-200">
            View Full Trend Analysis
          </Text>
          <TrendingUp size={14} color={isDark ? '#38BDF8' : '#0284C7'} />
        </TouchableOpacity>
      </View>

      {/* Expanded Modal Sheet */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setModalVisible(false)}
          />
          <View
            style={{
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            }}
            className="rounded-t-[32px] max-h-[85%] border-t overflow-hidden"
          >
            {/* Modal Header */}
            <View
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderBottomColor: isDark ? '#334155' : '#E2E8F0',
              }}
              className="p-5 border-b flex-row justify-between items-center"
            >
              <View>
                <Text className="text-[16px] font-black text-slate-800 dark:text-slate-100">
                  Detailed Trend Analysis
                </Text>
                <Text className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Department: {scope?.department || 'Civic'} • City: {scope?.city || 'Not assigned'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  backgroundColor: isDark ? '#334155' : 'rgba(226, 232, 240, 0.8)',
                }}
                className="rounded-full p-2"
              >
                <X size={16} color={isDark ? '#F1F5F9' : '#475569'} />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="p-5"
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Department Scope Summary */}
              <View
                style={{
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#F1F5F9',
                }}
                className="mb-6 rounded-2xl p-4 border"
              >
                <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-400 mb-3">
                  Department Scope Summary
                </Text>

                <View
                  style={{
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  }}
                  className="flex-row justify-between py-1.5 border-b"
                >
                  <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">
                    Department
                  </Text>
                  <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">
                    {scope?.department || 'Civic'}
                  </Text>
                </View>

                <View
                  style={{
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  }}
                  className="flex-row justify-between py-1.5 border-b"
                >
                  <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">
                    City
                  </Text>
                  <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">
                    {scope?.city || 'Not assigned'}
                  </Text>
                </View>

                <View className="flex-row justify-between py-1.5">
                  <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">
                    Issues in selected range
                  </Text>
                  <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">
                    {summary?.totalIssues ?? 0}
                  </Text>
                </View>
              </View>

              {/* Hotspots Panel */}
              {hotspotTrends.length > 0 && (
                <View className="mb-6">
                  <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-400 mb-3">
                    Identified Location Hotspots
                  </Text>
                  {hotspotTrends.slice(0, 3).map((hotspot: any, i: number) => {
                    const colors = severityColor(hotspot.severity);
                    return (
                      <View
                        key={i}
                        style={{
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: isDark ? '#334155' : '#F1F5F9',
                        }}
                        className="mb-2.5 flex-row items-center justify-between rounded-2xl p-3.5 border"
                      >
                        <View className="flex-1 pr-3">
                          <Text className="text-[13px] font-black text-slate-800 dark:text-slate-100" numberOfLines={1}>
                            {hotspot.approximateAddress}
                          </Text>
                          <Text className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
                            {hotspot.issueCount} complaints • {hotspot.categories[0]}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                          }}
                          className="rounded-lg px-2.5 py-1 border"
                        >
                          <Text
                            style={{ color: colors.text }}
                            className="text-[10px] font-black uppercase tracking-wider"
                          >
                            {hotspot.severity}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Duplicate Details Panel */}
              <View className="mb-6">
                <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-400 mb-3">
                  Duplicate Analysis Details
                </Text>
                <View
                  style={{
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#F1F5F9',
                  }}
                  className="rounded-2xl p-4 border"
                >
                  <View
                    style={{
                      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    }}
                    className="flex-row justify-between py-1.5 border-b"
                  >
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Pending duplicate coverage</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{duplicateRate}%</Text>
                  </View>
                  <View
                    style={{
                      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    }}
                    className="flex-row justify-between py-1.5 border-b"
                  >
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Pending issues checked</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{pendingDuplicateCandidateCount}</Text>
                  </View>
                  <View
                    style={{
                      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    }}
                    className="flex-row justify-between py-1.5 border-b"
                  >
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Pending issues inside duplicate groups</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{duplicateGroupIssueCount}</Text>
                  </View>
                  <View
                    style={{
                      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    }}
                    className="flex-row justify-between py-1.5 border-b"
                  >
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Likely redundant complaints</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{redundantDuplicateIssues}</Text>
                  </View>
                  <View
                    style={{
                      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    }}
                    className="flex-row justify-between py-1.5 border-b"
                  >
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Pending duplicate groups</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{duplicateGroups}</Text>
                  </View>
                  <View className="flex-row justify-between py-1.5">
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Strongest score</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{duplicateTrend?.strongestGroupScore || summary?.strongestGroupScore || 0}</Text>
                  </View>
                </View>
                <Text className="mt-2 text-[10px] leading-[15px] text-slate-400 dark:text-slate-400">
                  {duplicateExplanation} The percentage is calculated using pending issues checked for duplicate review.
                </Text>
              </View>

              {/* Recommendations List */}
              {recommendations.length > 0 && (
                <View className="mb-8">
                  <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-400 mb-3">
                    Actionable Recommendations
                  </Text>
                  {recommendations.map((rec: any, idx: number) => {
                    const colors = severityColor(rec.severity);
                    return (
                      <View
                        key={idx}
                        style={{
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: isDark ? '#334155' : '#F1F5F9',
                        }}
                        className="mb-3 rounded-2xl border p-4"
                      >
                        <View className="flex-row items-center gap-1.5 mb-1.5">
                          <View
                            style={{ backgroundColor: colors.dot }}
                            className="h-2 w-2 rounded-full"
                          />
                          <Text className="text-[13px] font-black text-slate-800 dark:text-slate-100">
                            {rec.title}
                          </Text>
                        </View>
                        <Text className="text-[12px] leading-[18px] text-slate-500 dark:text-slate-300">
                          {rec.message}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
