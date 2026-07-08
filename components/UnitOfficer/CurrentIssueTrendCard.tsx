import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import {
  TrendingUp,
  MapPin,
  AlertTriangle,
  Clock,
  Layers,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react-native';

interface CurrentIssueTrendCardProps {
  currentIssueTrend: any;
}

export default function CurrentIssueTrendCard({ currentIssueTrend }: CurrentIssueTrendCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isExpanded, setIsExpanded] = useState(false);

  if (!currentIssueTrend) return null;

  const duplicate = currentIssueTrend?.duplicateIntelligence ?? {};
  const local = currentIssueTrend?.localTrend ?? {};
  const category = currentIssueTrend?.categoryTrend ?? {};
  const department = currentIssueTrend?.departmentTrend ?? {};
  const time = currentIssueTrend?.timeTrend ?? {};
  const risk = currentIssueTrend?.operationalRisk ?? {};
  const action = currentIssueTrend?.suggestedOfficerAction ?? {};

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical':
      case 'overdue':
        return 'text-red-500 bg-red-50 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-900/30';
      case 'high':
      case 'due_soon':
        return 'text-orange-500 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 border-orange-100 dark:border-orange-900/30';
      case 'medium':
        return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
      default:
        return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
    }
  };

  const actionColors = () => {
    switch (action?.primaryAction) {
      case 'review_duplicates_before_verification':
        return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-100 dark:border-red-900/30', icon: <Layers size={16} color="#EF4444" /> };
      case 'prioritize_due_to_hotspot':
        return { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-100 dark:border-orange-900/30', icon: <MapPin size={16} color="#F97316" /> };
      case 'assign_specialised_field_officer':
        return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-100 dark:border-amber-900/30', icon: <Zap size={16} color="#D97706" /> };
      default:
        return { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/20', border: 'border-sky-100 dark:border-sky-900/30', icon: <ShieldCheck size={16} color="#0EA5E9" /> };
    }
  };

  const actColors = actionColors();

  return (
    <View className="my-3.5 rounded-[24px] border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 pr-4">
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <TrendingUp size={15} color={isDark ? '#38BDF8' : '#0284C7'} strokeWidth={2.5} />
            <Text className="text-[11px] font-black uppercase tracking-[2px] text-sky-600 dark:text-sky-400">
              Live Trend Analysis
            </Text>
          </View>
          <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">
            Current Issue Context
          </Text>
        </View>
        <View className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
          <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            {currentIssueTrend.issueCode}
          </Text>
        </View>
      </View>

      {/* Suggested Action Banner */}
      <View className={`rounded-2xl p-3 border mb-3 flex-row items-start gap-2.5 ${actColors.bg} ${actColors.border}`}>
        <View className="mt-0.5">{actColors.icon}</View>
        <View className="flex-1">
          <Text className={`text-[12px] font-black uppercase tracking-wider ${actColors.text}`}>
            {action?.title}
          </Text>
          <Text className="text-[11.5px] leading-[17px] text-slate-700 dark:text-slate-300 mt-0.5 font-medium">
            {action?.message}
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {(action?.actionHints || []).map((hint: string, i: number) => (
              <View key={i} className="rounded-md bg-white/60 dark:bg-slate-900/40 px-2 py-0.5">
                <Text className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400">
                  • {hint}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Local Area Hotspot & SLA Info summary */}
      <View className="flex-row gap-2.5 mb-2.5">
        <View className="flex-1 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-850">
          <Text className="text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Local Area (500m)
          </Text>
          <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">
            {local?.nearbyIssueCount500m ?? 0} Issues
          </Text>
          <Text className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {local?.unresolvedNearbyCount ?? 0} unresolved nearby
          </Text>
        </View>

        <View className="flex-1 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-850">
          <Text className="text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Same Type Nearby
          </Text>
          <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">
            {local?.sameCategoryNearbyCount ?? 0} Issues
          </Text>
          <Text className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {(local?.sameSubcategoryNearbyCount ?? 0)} same subcategory
          </Text>
        </View>
      </View>

      {/* Expandable detailed analysis */}
      {isExpanded && (
        <View className="border-t border-slate-100 pt-3 mt-1.5 dark:border-slate-800">
          {/* Duplicate Intelligence */}
          <View className="mb-3.5">
            <Text className="text-[11px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500 mb-2">
              Duplicate Intelligence
            </Text>
            {duplicate?.hasDuplicateSignals ? (
              <View className="rounded-xl bg-red-50/40 p-3 border border-red-100/30 dark:bg-red-950/10 dark:border-red-900/10">
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <Text className="text-[12px] font-black text-red-600 dark:text-red-400">
                      Duplicate Match Level: {duplicate.duplicateLevel}
                    </Text>
                  </View>
                  <Text className="text-[12.5px] font-extrabold text-red-600 dark:text-red-400">
                    {duplicate.bestDuplicateScore}% Score
                  </Text>
                </View>
                <Text className="text-[11.5px] leading-[16px] text-slate-600 dark:text-slate-400">
                  Found {duplicate.duplicateIssueCount} matching reports in {duplicate.duplicateGroupCount} duplicate group(s).
                </Text>
                {duplicate.matchedIssues.slice(0, 1).map((m: any, i: number) => (
                  <View key={i} className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/40 flex-row justify-between">
                    <Text className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Nearby: {m.issueCode} ({m.distanceMeters}m away)
                    </Text>
                    <Text className="text-[10px] font-black text-slate-400 capitalize">
                      Status: {m.status}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-[12px] italic text-slate-450 dark:text-slate-500">
                No matching duplicate complaint records found nearby.
              </Text>
            )}
          </View>

          {/* Time & Frequency Trend */}
          <View className="mb-3.5">
            <Text className="text-[11px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500 mb-2">
              Time & Frequency Pattern
            </Text>

            <View className="gap-2.5">
              {/* Time Spikes */}
              <View className="rounded-xl bg-slate-50 p-3 dark:bg-slate-850 border border-slate-100 dark:border-slate-800/50">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[10px] font-black uppercase tracking-[1.2px] text-slate-400 dark:text-slate-500">
                    Time Spikes
                  </Text>

                  {time?.recentSpikeDetected && (
                    <View className="rounded-md bg-orange-100 dark:bg-orange-950/40 px-2 py-0.5">
                      <Text className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase">
                        Spike
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row gap-2">
                  <View className="flex-1 rounded-lg bg-white/70 p-2 dark:bg-slate-900/40">
                    <Text className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Last 7 Days
                    </Text>
                    <Text className="mt-0.5 text-[14px] font-black text-slate-800 dark:text-slate-100">
                      {time?.sameCategoryLast7Days ?? 0}
                    </Text>
                  </View>

                  <View className="flex-1 rounded-lg bg-white/70 p-2 dark:bg-slate-900/40">
                    <Text className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Last 30 Days
                    </Text>
                    <Text className="mt-0.5 text-[14px] font-black text-slate-800 dark:text-slate-100">
                      {time?.sameCategoryLast30Days ?? 0}
                    </Text>
                  </View>

                  <View className="flex-1 rounded-lg bg-white/70 p-2 dark:bg-slate-900/40">
                    <Text className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Last 90 Days
                    </Text>
                    <Text className="mt-0.5 text-[14px] font-black text-slate-800 dark:text-slate-100">
                      {time?.sameCategoryLast90Days ?? 0}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Seasonality */}
              <View className="rounded-xl bg-slate-50 p-3 dark:bg-slate-850 border border-slate-100 dark:border-slate-800/50">
                <Text className="text-[10px] font-black uppercase tracking-[1.2px] text-slate-400 dark:text-slate-500 mb-1.5">
                  Seasonality
                </Text>

                <Text
                  className="text-[11px] leading-[16px] text-slate-500 dark:text-slate-400 italic"
                  numberOfLines={3}
                >
                  {time?.seasonalHint || 'Not enough historical data for seasonal pattern.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Operational Risk Indicators */}
          <View className="mb-1">
            <Text className="text-[11px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500 mb-2">
              Operational Risk Levels
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {[
                { label: 'SLA Status', value: risk?.slaStatus, level: risk?.slaStatus },
                { label: 'Duplicate Risk', value: risk?.duplicateRisk, level: risk?.duplicateRisk },
                { label: 'Recurrence Risk', value: risk?.recurrenceRisk, level: risk?.recurrenceRisk },
                { label: 'Workload Risk', value: risk?.workloadRisk, level: risk?.workloadRisk },
              ].map((item, idx) => {
                const color = getRiskColor(item.level);
                return (
                  <View
                    key={idx}
                    className={`rounded-xl border px-3 py-2 flex-1 min-w-[45%] ${color.split(' ').slice(1).join(' ')}`}
                  >
                    <Text className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      {item.label}
                    </Text>
                    <Text className={`text-[12px] font-black uppercase tracking-wider mt-0.5 ${color.split(' ')[0]}`}>
                      {item.value || 'Low'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Collapse/Expand toggle */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
        className="mt-3 flex-row items-center justify-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-800"
      >
        <Text className="mr-1.5 text-[12px] font-black text-slate-600 dark:text-slate-350">
          {isExpanded ? 'Collapse Analysis' : 'View Full Pattern Data'}
        </Text>
        {isExpanded ? (
          <ChevronUp size={14} color={isDark ? '#CBD5E1' : '#475569'} />
        ) : (
          <ChevronDown size={14} color={isDark ? '#CBD5E1' : '#475569'} />
        )}
      </TouchableOpacity>
    </View>
  );
}
