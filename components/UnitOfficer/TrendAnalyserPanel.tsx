import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, useColorScheme, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  AlertTriangle,
  Activity,
  Clock,
  Layers,
  X
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
  onRangeChange
}: TrendAnalyserPanelProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [modalVisible, setModalVisible] = useState(false);

  const scope = trendAnalytics?.scope;
  const summary = trendAnalytics?.summary;
  const trendDirection = trendAnalytics?.trendDirection;
  const categoryTrends = trendAnalytics?.categoryTrends || [];
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
            <Text className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Department: {scope?.department || 'Civic'} • City: {scope?.city || 'Not assigned'}
            </Text>
          </View>
          <View className="items-end">
            <View className="rounded-full bg-sky-100 dark:bg-sky-950/40 px-2.5 py-1">
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
        <View className="mt-4 flex-row rounded-2xl bg-white/70 p-1 dark:bg-slate-900/50">
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
      <View className="my-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 items-center justify-center">
        <ActivityIndicator size="small" color="#0EA5E9" />
        <Text className="mt-2.5 text-[13px] font-bold text-slate-500 dark:text-slate-400">
          Analyzing issue patterns & hotspots...
        </Text>
      </View>
    );
  }

  if (!trendAnalytics || !summary || !selectedRangeHasData) {
    return (
      <View className="my-4 rounded-[28px] overflow-hidden border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {renderHeader()}
        <View className="p-6 items-center justify-center bg-white dark:bg-slate-900 py-8">
          <Activity size={24} color={isDark ? '#475569' : '#94A3B8'} className="mb-2.5" />
          <Text className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 text-center">
            {selectedRange === 'all'
              ? 'No Trend Data Available Yet'
              : `No Analytics for This ${selectedRange}-Day Range`}
          </Text>
          <Text className="mt-1.5 text-[12px] text-slate-400 dark:text-slate-500 text-center max-w-[280px]">
            {selectedRange === 'all'
              ? 'Trends will appear here automatically as more civic issues are reported and analyzed in your assigned area.'
              : `No issues were reported in the last ${selectedRange} days for your assigned scope. Try 30D, 90D, or All Time to view older operational patterns.`}
          </Text>
        </View>
      </View>
    );
  }

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-900/30' };
      case 'high':
        return { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-900/30' };
      case 'medium':
        return { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' };
      default:
        return { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30' };
    }
  };

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

  const hotspotAreaCount = summary?.hotspotAreaCount ?? hotspotTrends.length;
  const hotspotIssueCount = summary?.hotspotIssueCount ?? hotspotTrends.reduce((s, h) => s + h.issueCount, 0);

  return (
    <View className="my-4 rounded-[28px] overflow-hidden border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header Banner */}
      {renderHeader()}

      <View className="p-4">
        {/* Range selection helper line */}
        <Text className="text-[10px] text-slate-400 dark:text-slate-500 mb-3.5">
          {selectedRange === 'all'
            ? 'Showing all-time operational patterns.'
            : `Showing analytics for issues reported in the last ${selectedRange} days.`}
        </Text>

        {/* Summary metric cards */}
        <View className="flex-row flex-wrap gap-2.5 mb-4">
          {/* Card 1: Duplicate Rate */}
          <View className="flex-1 min-w-[45%] rounded-2xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-850 dark:border-slate-800">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Duplicates
              </Text>
              <Layers size={14} color="#0284C7" />
            </View>
            <Text className="text-[20px] font-black text-slate-800 dark:text-slate-100">
              {duplicateRate}%
            </Text>
            <Text className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5" numberOfLines={1}>
              {duplicateGroupIssueCount} pending issues in {duplicateGroups} {duplicateGroups === 1 ? 'group' : 'groups'}
            </Text>
            {redundantDuplicateIssues > 0 && (
              <Text className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5" numberOfLines={1}>
                {redundantDuplicateIssues} likely redundant {redundantDuplicateIssues === 1 ? 'complaint' : 'complaints'}
              </Text>
            )}
            {duplicateGroups > 0 && (
              <Text className="text-[8.5px] text-slate-400 dark:text-slate-500 mt-1" numberOfLines={2}>
                Matches the pending duplicate review scope used by the banner.
              </Text>
            )}
          </View>

          {/* Card 2: Hotspots */}
          <View className="flex-1 min-w-[45%] rounded-2xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-850 dark:border-slate-800">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Geo Hotspots
              </Text>
              <MapPin size={14} color="#EF4444" />
            </View>
            <Text className="text-[20px] font-black text-slate-800 dark:text-slate-100">
              {hotspotAreaCount} Areas
            </Text>
            <Text className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5" numberOfLines={1}>
              {hotspotIssueCount} issues inside hotspots
            </Text>
          </View>

          {/* Card 3: SLA Risk */}
          <View className="flex-1 min-w-[45%] rounded-2xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-850 dark:border-slate-800">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                SLA Risk
              </Text>
              <Clock size={14} color="#F59E0B" />
            </View>
            <Text className="text-[20px] font-black text-slate-800 dark:text-slate-100">
              {summary.slaRiskCount} Issues
            </Text>
            <Text className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5" numberOfLines={1}>
              {summary.overdueIssues} currently overdue
            </Text>
          </View>

          {/* Card 4: Reporting Trend */}
          <View className="flex-1 min-w-[45%] rounded-2xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-850 dark:border-slate-800">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Reporting Rate
              </Text>
              {trendDirection?.direction === 'up' ? (
                <TrendingUp size={14} color="#10B981" />
              ) : trendDirection?.direction === 'down' ? (
                <TrendingDown size={14} color="#EF4444" />
              ) : (
                <Activity size={14} color="#64748B" />
              )}
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-[20px] font-black text-slate-800 dark:text-slate-100">
                {trendDirection?.direction === 'stable' ? 'Stable' : `${Math.abs(trendDirection?.changePercent || 0)}%`}
              </Text>
              {trendDirection?.direction !== 'stable' && (
                <Text
                  className={`text-[10px] font-bold ${
                    trendDirection?.direction === 'up' ? 'text-red-500' : 'text-emerald-500'
                  }`}
                >
                  {trendDirection?.direction === 'up' ? '▲' : '▼'}
                </Text>
              )}
            </View>
            <Text className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5" numberOfLines={1}>
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
            <View key={idx} className={`rounded-2xl p-4 border ${colors.bg} ${colors.border}`}>
              <View className="flex-row items-center gap-2 mb-1.5">
                <AlertTriangle size={16} className={colors.text} />
                <Text className={`text-[13px] font-black uppercase tracking-wider ${colors.text}`}>
                  Action Recommended ({rec.severity})
                </Text>
              </View>
              <Text className="text-[13px] font-black text-slate-800 dark:text-slate-100">
                {rec.title}
              </Text>
              <Text className="text-[12px] leading-[18px] text-slate-600 dark:text-slate-400 mt-1">
                {rec.message}
              </Text>
            </View>
          );
        })}

        {/* View Details Button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
          className="mt-3 flex-row items-center justify-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-855"
        >
          <Text className="mr-1.5 text-[12px] font-black text-slate-600 dark:text-slate-350">
            View Full Trend Analysis
          </Text>
          <TrendingUp size={14} color={isDark ? '#CBD5E1' : '#475569'} />
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
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] max-h-[85%] border-t border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <View className="p-5 border-b border-slate-100 dark:border-slate-800 flex-row justify-between items-center bg-slate-50 dark:bg-slate-900/40">
              <View>
                <Text className="text-[16px] font-black text-slate-850 dark:text-slate-100">
                  Detailed Trend Analysis
                </Text>
                <Text className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Department: {scope?.department || 'Civic'} • City: {scope?.city || 'Not assigned'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="rounded-full bg-slate-200/60 dark:bg-slate-800 p-2"
              >
                <X size={16} color={isDark ? '#CBD5E1' : '#475569'} />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
              {/* Category Trends */}
              <View className="mb-6">
                <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500 mb-3">
                  Top Complaint Categories
                </Text>
                {categoryTrends.slice(0, 4).map((item: any, i: number) => (
                  <View key={i} className="mb-3.5">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Text className="text-[13px] font-extrabold text-slate-700 dark:text-slate-300">
                        {item.category}
                      </Text>
                      <Text className="text-[12px] font-black text-slate-500 dark:text-slate-455">
                        {item.count} issues ({item.percentage}%)
                      </Text>
                    </View>
                    <View className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <View
                        style={{
                          width: `${item.percentage}%`,
                          height: '100%',
                          borderRadius: 8,
                          backgroundColor: i === 0 ? '#0EA5E9' : i === 1 ? '#10B981' : i === 2 ? '#F59E0B' : '#8B5CF6',
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>

              {/* Hotspots Panel */}
              {hotspotTrends.length > 0 && (
                <View className="mb-6">
                  <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500 mb-3">
                    Identified Location Hotspots
                  </Text>
                  {hotspotTrends.slice(0, 3).map((hotspot: any, i: number) => {
                    const colors = severityColor(hotspot.severity);
                    return (
                      <View
                        key={i}
                        className="mb-2.5 flex-row items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-850 border border-slate-100 dark:border-slate-800/40"
                      >
                        <View className="flex-1 pr-3">
                          <Text className="text-[13px] font-black text-slate-800 dark:text-slate-100" numberOfLines={1}>
                            {hotspot.approximateAddress}
                          </Text>
                          <Text className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {hotspot.issueCount} complaints • {hotspot.categories[0]}
                          </Text>
                        </View>
                        <View className={`rounded-lg px-2.5 py-1 border ${colors.bg} ${colors.border}`}>
                          <Text className={`text-[10px] font-black uppercase tracking-wider ${colors.text}`}>
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
                <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500 mb-3">
                  Duplicate Analysis Details
                </Text>
                <View className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-850 border border-slate-100 dark:border-slate-800/40">
                  <View className="flex-row justify-between py-1.5 border-b border-slate-200/40 dark:border-slate-800/40">
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Pending duplicate coverage</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{duplicateRate}%</Text>
                  </View>
                  <View className="flex-row justify-between py-1.5 border-b border-slate-200/40 dark:border-slate-800/40">
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Pending issues inside duplicate groups</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{duplicateGroupIssueCount}</Text>
                  </View>
                  <View className="flex-row justify-between py-1.5 border-b border-slate-200/40 dark:border-slate-800/40">
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Likely redundant complaints</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{redundantDuplicateIssues}</Text>
                  </View>
                  <View className="flex-row justify-between py-1.5 border-b border-slate-200/40 dark:border-slate-800/40">
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Pending duplicate groups</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{duplicateGroups}</Text>
                  </View>
                  <View className="flex-row justify-between py-1.5">
                    <Text className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">Strongest score</Text>
                    <Text className="text-[12px] font-black text-slate-800 dark:text-slate-100">{duplicateTrend?.strongestGroupScore || summary?.strongestGroupScore || 0}</Text>
                  </View>
                </View>
                <Text className="mt-2 text-[10px] leading-[15px] text-slate-400 dark:text-slate-500">
                  These duplicate metrics use the same pending-issue duplicate review scope as the Duplicate Detection Banner.
                </Text>
              </View>

              {/* Recommendations List */}
              {recommendations.length > 0 && (
                <View className="mb-8">
                  <Text className="text-[12px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500 mb-3">
                    Actionable Recommendations
                  </Text>
                  {recommendations.map((rec: any, idx: number) => {
                    const colors = severityColor(rec.severity);
                    return (
                      <View key={idx} className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850/50">
                        <View className="flex-row items-center gap-1.5 mb-1.5">
                          <View className={`h-2 w-2 rounded-full ${rec.severity === 'critical' ? 'bg-red-500' : rec.severity === 'high' ? 'bg-orange-500' : 'bg-amber-500'}`} />
                          <Text className="text-[13px] font-black text-slate-850 dark:text-slate-100">
                            {rec.title}
                          </Text>
                        </View>
                        <Text className="text-[12px] leading-[18px] text-slate-500 dark:text-slate-455">
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
