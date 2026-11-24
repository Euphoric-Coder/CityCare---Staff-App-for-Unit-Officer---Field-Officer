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
  ShieldCheck,
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
        return {
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
          border: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2',
          text: isDark ? '#FCA5A5' : '#DC2626',
        };
      case 'high':
      case 'due_soon':
        return {
          bg: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
          border: isDark ? 'rgba(249, 115, 22, 0.35)' : '#FFEDD5',
          text: isDark ? '#FDBA74' : '#EA580C',
        };
      case 'medium':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
          border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FEF3C7',
          text: isDark ? '#FCD34D' : '#D97706',
        };
      default:
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4',
          border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#DCFCE7',
          text: isDark ? '#6EE7B7' : '#059669',
        };
    }
  };

  const actionColors = () => {
    switch (action?.primaryAction) {
      case 'review_duplicates_before_verification':
        return {
          text: isDark ? '#FCA5A5' : '#DC2626',
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
          border: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FEE2E2',
          icon: <Layers size={16} color={isDark ? '#F87171' : '#EF4444'} />,
        };
      case 'prioritize_due_to_hotspot':
        return {
          text: isDark ? '#FDBA74' : '#EA580C',
          bg: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
          border: isDark ? 'rgba(249, 115, 22, 0.35)' : '#FFEDD5',
          icon: <MapPin size={16} color={isDark ? '#FB923C' : '#F97316'} />,
        };
      case 'assign_specialised_field_officer':
        return {
          text: isDark ? '#FCD34D' : '#D97706',
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
          border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FEF3C7',
          icon: <Zap size={16} color={isDark ? '#FBBF24' : '#D97706'} />,
        };
      default:
        return {
          text: isDark ? '#7DD3FC' : '#0284C7',
          bg: isDark ? 'rgba(56, 189, 248, 0.15)' : '#F0F9FF',
          border: isDark ? 'rgba(56, 189, 248, 0.35)' : '#E0F2FE',
          icon: <ShieldCheck size={16} color={isDark ? '#38BDF8' : '#0EA5E9'} />,
        };
    }
  };

  const actColors = actionColors();

  return (
    <View
      style={{
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        borderColor: isDark ? '#1E293B' : '#E2E8F0',
        shadowColor: isDark ? '#000000' : '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
      className="my-3.5 rounded-[24px] border p-4 shadow-sm">
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <View className="mb-0.5 flex-row items-center gap-1.5">
            <TrendingUp size={15} color={isDark ? '#38BDF8' : '#0284C7'} strokeWidth={2.5} />
            <Text className="text-[11px] font-black uppercase tracking-[2px] text-sky-600 dark:text-sky-400">
              Live Trend Analysis
            </Text>
          </View>
          <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">
            Current Issue Context
          </Text>
        </View>
        <View
          style={{
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            borderWidth: isDark ? 1 : 0,
          }}
          className="rounded-full px-2.5 py-0.5">
          <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-300">
            {currentIssueTrend.issueCode}
          </Text>
        </View>
      </View>

      {/* Suggested Action Banner */}
      <View
        style={{
          backgroundColor: actColors.bg,
          borderColor: actColors.border,
        }}
        className="mb-3 flex-row items-start gap-2.5 rounded-2xl border p-3">
        <View className="mt-0.5">{actColors.icon}</View>
        <View className="flex-1">
          <Text
            style={{ color: actColors.text }}
            className="text-[12px] font-black uppercase tracking-wider">
            {action?.title}
          </Text>
          <Text className="mt-0.5 text-[11.5px] font-medium leading-[17px] text-slate-700 dark:text-slate-300">
            {action?.message}
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {(action?.actionHints || []).map((hint: string, i: number) => (
              <View
                key={i}
                style={{
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  borderWidth: 1,
                }}
                className="rounded-md px-2 py-0.5">
                <Text className="text-[9.5px] font-bold text-slate-600 dark:text-slate-300">
                  • {hint}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Local Area Hotspot & SLA Info summary */}
      <View className="mb-2.5 flex-row gap-2.5">
        <View
          style={{
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9',
          }}
          className="flex-1 rounded-xl border p-2.5">
          <Text className="mb-1 text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Local Area (500m)
          </Text>
          <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">
            {local?.nearbyIssueCount500m ?? 0} Issues
          </Text>
          <Text className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-400">
            {local?.unresolvedNearbyCount ?? 0} unresolved nearby
          </Text>
        </View>

        <View
          style={{
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9',
          }}
          className="flex-1 rounded-xl border p-2.5">
          <Text className="mb-1 text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Same Type Nearby
          </Text>
          <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">
            {local?.sameCategoryNearbyCount ?? 0} Issues
          </Text>
          <Text className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-400">
            {local?.sameSubcategoryNearbyCount ?? 0} same subcategory
          </Text>
        </View>
      </View>

      {/* Expandable detailed analysis */}
      {isExpanded && (
        <View
          style={{
            borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
          }}
          className="mt-1.5 border-t pt-3">
          {/* Duplicate Intelligence */}
          <View className="mb-3.5">
            <Text className="mb-2 text-[11px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-400">
              Duplicate Intelligence
            </Text>
            {duplicate?.hasDuplicateSignals ? (
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2',
                }}
                className="rounded-xl border p-3">
                <View className="mb-2 flex-row items-center justify-between">
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
                <Text className="text-[11.5px] leading-[16px] text-slate-600 dark:text-slate-300">
                  Found {duplicate.duplicateIssueCount} matching reports in{' '}
                  {duplicate.duplicateGroupCount} duplicate group(s).
                </Text>
                {duplicate.matchedIssues.slice(0, 1).map((m: any, i: number) => (
                  <View
                    key={i}
                    style={{
                      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    }}
                    className="mt-2 flex-row items-center justify-between border-t pt-2">
                    <Text className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      Nearby: {m.issueCode} ({m.distanceMeters}m away)
                    </Text>
                    <Text className="text-[10px] font-black capitalize text-slate-400 dark:text-slate-400">
                      Status: {m.status}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-[12px] italic text-slate-500 dark:text-slate-400">
                No matching duplicate complaint records found nearby.
              </Text>
            )}
          </View>

          {/* Time & Frequency Trend */}
          <View className="mb-3.5">
            <Text className="mb-2 text-[11px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-400">
              Time & Frequency Pattern
            </Text>

            <View className="gap-2.5">
              {/* Time Spikes */}
              <View
                style={{
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9',
                }}
                className="rounded-xl border p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[10px] font-black uppercase tracking-[1.2px] text-slate-400 dark:text-slate-400">
                    Time Spikes
                  </Text>

                  {time?.recentSpikeDetected && (
                    <View
                      style={{
                        backgroundColor: isDark ? 'rgba(249, 115, 22, 0.2)' : '#FFEDD5',
                        borderColor: isDark ? 'rgba(249, 115, 22, 0.4)' : 'transparent',
                        borderWidth: isDark ? 1 : 0,
                      }}
                      className="rounded-md px-2 py-0.5">
                      <Text className="text-[9px] font-black uppercase text-orange-600 dark:text-orange-400">
                        Spike
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row gap-2">
                  <View
                    style={{
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                      borderWidth: 1,
                    }}
                    className="flex-1 rounded-lg p-2">
                    <Text className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-400">
                      Last 7 Days
                    </Text>
                    <Text className="mt-0.5 text-[14px] font-black text-slate-800 dark:text-slate-100">
                      {time?.sameCategoryLast7Days ?? 0}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                      borderWidth: 1,
                    }}
                    className="flex-1 rounded-lg p-2">
                    <Text className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-400">
                      Last 30 Days
                    </Text>
                    <Text className="mt-0.5 text-[14px] font-black text-slate-800 dark:text-slate-100">
                      {time?.sameCategoryLast30Days ?? 0}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                      borderWidth: 1,
                    }}
                    className="flex-1 rounded-lg p-2">
                    <Text className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-400">
                      Last 90 Days
                    </Text>
                    <Text className="mt-0.5 text-[14px] font-black text-slate-800 dark:text-slate-100">
                      {time?.sameCategoryLast90Days ?? 0}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Seasonality */}
              <View
                style={{
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#F1F5F9',
                }}
                className="rounded-xl border p-3">
                <Text className="mb-1.5 text-[10px] font-black uppercase tracking-[1.2px] text-slate-400 dark:text-slate-400">
                  Seasonality
                </Text>

                <Text
                  className="text-[11px] italic leading-[16px] text-slate-500 dark:text-slate-300"
                  numberOfLines={3}>
                  {time?.seasonalHint || 'Not enough historical data for seasonal pattern.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Operational Risk Indicators */}
          <View className="mb-1">
            <Text className="mb-2 text-[11px] font-black uppercase tracking-[1.5px] text-slate-400 dark:text-slate-400">
              Operational Risk Levels
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {[
                { label: 'SLA Status', value: risk?.slaStatus, level: risk?.slaStatus },
                { label: 'Duplicate Risk', value: risk?.duplicateRisk, level: risk?.duplicateRisk },
                {
                  label: 'Recurrence Risk',
                  value: risk?.recurrenceRisk,
                  level: risk?.recurrenceRisk,
                },
                { label: 'Workload Risk', value: risk?.workloadRisk, level: risk?.workloadRisk },
              ].map((item, idx) => {
                const rc = getRiskColor(item.level);
                return (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: rc.bg,
                      borderColor: rc.border,
                    }}
                    className="min-w-[45%] flex-1 rounded-xl border px-3 py-2">
                    <Text className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-400">
                      {item.label}
                    </Text>
                    <Text
                      style={{ color: rc.text }}
                      className="mt-0.5 text-[12px] font-black uppercase tracking-wider">
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
        style={{
          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        }}
        className="mt-3 flex-row items-center justify-center rounded-xl border py-2.5">
        <Text className="mr-1.5 text-[12px] font-black text-slate-600 dark:text-slate-200">
          {isExpanded ? 'Collapse Analysis' : 'View Full Pattern Data'}
        </Text>
        {isExpanded ? (
          <ChevronUp size={14} color={isDark ? '#38BDF8' : '#0284C7'} />
        ) : (
          <ChevronDown size={14} color={isDark ? '#38BDF8' : '#0284C7'} />
        )}
      </TouchableOpacity>
    </View>
  );
}
