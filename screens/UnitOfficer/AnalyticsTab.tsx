import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Award,
  ChartBar as BarChart3,
  Activity,
  Users,
  TriangleAlert as AlertTriangle,
  CircleCheck as CheckCircle2,
  RotateCcw,
  Zap,
  Target,
  Star,
} from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { User } from 'lib/auth';

interface AnalyticsTabProps {
  ward?: string;
  user: User;
}

const BAR_COLORS = [
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

function SectionHeader({
  icon,
  title,
  isDark,
}: {
  icon: React.ReactNode;
  title: string;
  isDark: boolean;
}) {
  return (
    <View className="mb-4 flex-row items-center gap-2.5">
      <View className="h-8 w-8 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
        {icon}
      </View>
      <Text className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </Text>
    </View>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
  icon,
  trend,
  trendUp,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <View
      className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
      style={styles.kpiCard}>
      <View className="mb-3 flex-row items-center justify-between">
        <View style={[styles.kpiIcon, { backgroundColor: `${color}18` }]}>{icon}</View>
        {trend && (
          <View
            className="flex-row items-center gap-0.5 rounded-full px-2 py-0.5"
            style={{ backgroundColor: trendUp ? '#D1FAE5' : '#FEE2E2' }}>
            {trendUp ? (
              <TrendingUp color="#10B981" size={10} strokeWidth={2.5} />
            ) : (
              <TrendingDown color="#EF4444" size={10} strokeWidth={2.5} />
            )}
            <Text
              style={{ fontSize: 10, fontWeight: '700', color: trendUp ? '#059669' : '#DC2626' }}>
              {trend}
            </Text>
          </View>
        )}
      </View>
      <Text className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
        {sub}
      </Text>
    </View>
  );
}

function DonutRing({
  percent,
  color,
  size = 64,
}: {
  percent: number;
  color: string;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circum = 2 * Math.PI * radius;
  const filled = (percent / 100) * circum;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 6,
          borderColor: `${color}22`,
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 6,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: percent > 25 ? color : 'transparent',
          borderBottomColor: percent > 50 ? color : 'transparent',
          borderLeftColor: percent > 75 ? color : 'transparent',
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      <Text style={{ fontSize: 12, fontWeight: '800', color }}>{percent}%</Text>
    </View>
  );
}

export default function AnalyticsTab({ ward = 'Varanasi Zone', user }: AnalyticsTabProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<'overview' | 'officers'>('overview');
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const analytics = useQuery(api.officerPerformance.getUnitOfficerTeamAnalytics, {
    userId: user.id as Id<'users'>,
    range: selectedRange,
  });

  if (!analytics) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-900" edges={['top']}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </SafeAreaView>
    );
  }

  const totalIssues = analytics.summary.totalIssues;
  const closedIssues = analytics.summary.resolvedIssues;
  const resolutionRate = totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 0;
  const escalationRate = totalIssues > 0 ? Math.round((analytics.summary.escalatedIssues / totalIssues) * 100) : 0;
  const reworkRate = totalIssues > 0 ? Math.round((analytics.summary.reworkIssues / totalIssues) * 100) : 0;

  const maxCount = Math.max(...analytics.charts.categoryDistribution.map((c: any) => c.count), 1);

  const statusBreakdown = [
    { label: 'Pending', value: analytics.charts.statusBreakdown.pending, color: '#F59E0B' },
    { label: 'Verified', value: analytics.charts.statusBreakdown.verified, color: '#10B981' },
    { label: 'Assigned', value: analytics.charts.statusBreakdown.assigned, color: '#3B82F6' },
    { label: 'In Progress', value: analytics.charts.statusBreakdown.in_progress, color: '#8B5CF6' },
    { label: 'Rework', value: analytics.charts.statusBreakdown.rework_required, color: '#EF4444' },
    { label: 'Escalated', value: analytics.charts.statusBreakdown.escalated, color: '#DC2626' },
    { label: 'Closed', value: analytics.charts.statusBreakdown.closed, color: '#10B981' },
    { label: 'Reopened', value: analytics.charts.statusBreakdown.reopened, color: '#F97316' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'light'} />

      <LinearGradient
        colors={['#0C4A6E', '#0369A1', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}>
        <View className="mb-5 flex-row items-start justify-between">
          <View>
            <Text className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-white/60">
              Analytics Dashboard
            </Text>
            <Text className="text-[26px] font-extrabold tracking-tight text-white">
              Performance
            </Text>
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <Text className="text-[12px] font-semibold text-white/75">{ward}</Text>
            </View>
          </View>
          <View className="items-end gap-2">
            <View style={styles.slaRingWrap}>
              <DonutRing percent={analytics.summary.slaComplianceRate} color="#34D399" size={72} />
              <Text className="mt-1 text-center text-[9px] font-bold text-white/70">SLA</Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-2.5">
          {[
            { label: 'Total', value: totalIssues, color: '#7DD3FC' },
            { label: 'Closed', value: closedIssues, color: '#6EE7B7' },
            { label: 'Escalated', value: analytics.summary.escalatedIssues, color: '#FCA5A5' },
            { label: 'Rework', value: analytics.summary.reworkIssues, color: '#FDE68A' },
          ].map((s, i) => (
            <View key={i} style={styles.headerStat}>
              <Text style={[styles.headerStatValue, { color: s.color }]}>{s.value}</Text>
              <Text className="text-center text-[9px] font-semibold text-white/60">{s.label}</Text>
            </View>
          ))}
        </View>

        <View className="mt-4 flex-row gap-1 rounded-2xl bg-white/10 p-1">
          {(['overview', 'officers'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
              className="flex-1 items-center rounded-xl py-2"
              style={activeTab === tab ? styles.activeTab : undefined}>
              <Text
                className="text-[13px] font-bold capitalize"
                style={{ color: activeTab === tab ? '#0C4A6E' : 'rgba(255,255,255,0.65)' }}>
                {tab === 'overview' ? 'Overview' : 'Officers'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1 bg-slate-50 dark:bg-slate-900"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Range Selector */}
        <View className="mb-4 flex-row justify-end gap-1.5 px-1 mt-2">
          {(['7d', '30d', '90d', 'all'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setSelectedRange(r)}
              activeOpacity={0.8}
              className={`rounded-lg px-3 py-1.5 border ${
                selectedRange === r
                  ? 'bg-blue-600 border-blue-600 dark:bg-blue-500'
                  : 'bg-white border-slate-255 dark:bg-slate-800 dark:border-slate-700'
              }`}>
              <Text
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  selectedRange === r ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                }`}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'overview' ? (
          <>
            <View className="mb-3 flex-row gap-3">
              <KpiCard
                label="Avg Resolution"
                value={`${analytics.summary.avgResolutionTime}h`}
                sub="Target: 72h"
                color="#F59E0B"
                icon={<Clock color="#F59E0B" size={20} strokeWidth={2} />}
              />
              <KpiCard
                label="SLA Compliance"
                value={`${analytics.summary.slaComplianceRate}%`}
                sub="Target: 90%"
                color="#8B5CF6"
                icon={<Zap color="#8B5CF6" size={20} strokeWidth={2} />}
              />
            </View>

            <View className="mb-4 flex-row gap-3">
              <KpiCard
                label="Resolution Rate"
                value={`${resolutionRate}%`}
                sub="Of total issues"
                color="#3B82F6"
                icon={<Target color="#3B82F6" size={20} strokeWidth={2} />}
              />
              <KpiCard
                label="Citizen Satisfaction"
                value={`${analytics.summary.citizenSatisfaction} / 5`}
                sub="From reviews"
                color="#10B981"
                icon={<Star color="#10B981" size={20} fill="#10B981" strokeWidth={0} />}
              />
            </View>

            <View
              className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              style={styles.section}>
              <SectionHeader
                icon={<Activity color="#0EA5E9" size={16} strokeWidth={2.5} />}
                title="Status Breakdown"
                isDark={isDark}
              />
              {statusBreakdown.map((item: any, i: number) => {
                const pct = Math.round((item.value / totalIssues) * 100);
                return (
                  <View key={i} className="mb-3">
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                        <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                          {item.label}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
                          {item.value}
                        </Text>
                        <Text
                          style={[
                            styles.pctBadge,
                            { color: item.color, backgroundColor: `${item.color}18` },
                          ]}>
                          {pct}%
                        </Text>
                      </View>
                    </View>
                    <View className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <View
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          borderRadius: 8,
                          backgroundColor: item.color,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            <View
              className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              style={styles.section}>
              <SectionHeader
                icon={<BarChart3 color="#0EA5E9" size={16} strokeWidth={2.5} />}
                title="Category Distribution"
                isDark={isDark}
              />
              {analytics.charts.categoryDistribution.map((item: any, i: number) => {
                const pct = Math.round((item.count / maxCount) * 100);
                return (
                  <View key={i} className="mb-3 flex-row items-center gap-3">
                    <Text
                      className="text-[12px] font-semibold text-slate-500 dark:text-slate-400"
                      style={{ width: 100 }}
                      numberOfLines={1}>
                      {item.category}
                    </Text>
                    <View className="h-7 flex-1 justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-700">
                      <View
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          borderRadius: 12,
                          backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                          minWidth: 28,
                        }}
                      />
                    </View>
                    <Text
                      className="text-[13px] font-extrabold text-slate-700 dark:text-slate-200"
                      style={{ width: 22, textAlign: 'right' }}>
                      {item.count}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View
              className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              style={styles.section}>
              <SectionHeader
                icon={<Zap color="#F59E0B" size={16} strokeWidth={2.5} />}
                title="Quality Metrics"
                isDark={isDark}
              />
              <View className="flex-row gap-3">
                {[
                  { label: 'Rework Rate', value: analytics.charts.qualityMetrics.reworkRate, color: '#EF4444', bg: '#FEE2E2' },
                  { label: 'Citizen Satisfaction', value: analytics.charts.qualityMetrics.citizenSatisfaction, color: '#10B981', bg: '#D1FAE5' },
                  {
                    label: 'First-time Fix',
                    value: analytics.charts.qualityMetrics.firstTimeFixRate,
                    color: '#3B82F6',
                    bg: '#DBEAFE',
                  },
                ].map((m: any, i: number) => (
                  <View
                    key={i}
                    className="flex-1 items-center rounded-2xl p-3"
                    style={{ backgroundColor: m.bg }}>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: m.color }}>
                      {m.value}%
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: m.color,
                        textAlign: 'center',
                        marginTop: 2,
                      }}>
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View
              className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              style={styles.section}>
              <SectionHeader
                icon={<Activity color="#0EA5E9" size={16} strokeWidth={2.5} />}
                title="Performance Insights"
                isDark={isDark}
              />
              {analytics.insights.length > 0 ? (
                analytics.insights.map((item: any, i: number) => (
                  <View key={i} className="mb-3 flex-row gap-3 last:mb-0">
                    <View
                      style={[
                        styles.insightIcon,
                        {
                          backgroundColor:
                            item.type === 'positive'
                              ? '#D1FAE5'
                              : item.type === 'attention' || item.type === 'warning'
                                ? '#FEE2E2'
                                : '#FEF3C7',
                        },
                      ]}>
                      {item.type === 'positive' ? (
                        <TrendingUp color="#10B981" size={18} strokeWidth={2.5} />
                      ) : item.type === 'attention' || item.type === 'warning' ? (
                        <AlertTriangle color="#EF4444" size={18} strokeWidth={2.5} />
                      ) : (
                        <Clock color="#F59E0B" size={18} strokeWidth={2.5} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="mb-0.5 text-[13px] font-bold text-slate-800 dark:text-slate-200">
                        {item.title}
                      </Text>
                      <Text className="text-[12px] leading-[18px] text-slate-500 dark:text-slate-400">
                        {item.text}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-[13px] font-semibold italic text-slate-500 dark:text-slate-400">
                  No performance insights available yet.
                </Text>
              )}
            </View>
          </>
        ) : (
          <>
            <View
              className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              style={styles.section}>
              <SectionHeader
                icon={<Award color="#F59E0B" size={16} strokeWidth={2.5} />}
                title="Top Performers"
                isDark={isDark}
              />
              {analytics.officers.topPerformers.length > 0 ? (
                analytics.officers.topPerformers.map((officer: any, i: number) => (
                  <View
                    key={i}
                    className="mb-3 flex-row items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50">
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: i === 0 ? '#FEF3C7' : i === 1 ? '#F1F5F9' : '#FEF3C7' },
                      ]}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '900',
                          color: i === 0 ? '#D97706' : i === 1 ? '#64748B' : '#B45309',
                        }}>
                        #{i + 1}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
                        {officer.name}
                      </Text>
                      <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {officer.issuesResolved} issues resolved
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      <View className="flex-row items-center gap-1">
                        <Star color="#F59E0B" size={11} strokeWidth={0} fill="#F59E0B" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#F59E0B' }}>
                          {officer.successRate}%
                        </Text>
                      </View>
                      <Text className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                        EFFICIENCY
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-[13px] font-semibold italic text-slate-500 dark:text-slate-400 text-center py-4">
                  No completed issues recorded yet
                </Text>
              )}
            </View>

            <View
              className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              style={styles.section}>
              <SectionHeader
                icon={<Users color="#0EA5E9" size={16} strokeWidth={2.5} />}
                title="Officer Workload"
                isDark={isDark}
              />
              {analytics.officers.workload.length > 0 ? (
                analytics.officers.workload.map((officer: any, i: number) => (
                  <View key={i} className="mb-3">
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                        {officer.name}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-[11px] text-slate-400 dark:text-slate-500">
                          {officer.activeIssues} active
                        </Text>
                        <Text
                          style={[
                            styles.pctBadge,
                            {
                              color:
                                officer.workloadPercentage > 90
                                  ? '#EF4444'
                                  : officer.workloadPercentage > 75
                                    ? '#F59E0B'
                                    : '#10B981',
                              backgroundColor:
                                officer.workloadPercentage > 90
                                  ? '#FEE2E2'
                                  : officer.workloadPercentage > 75
                                    ? '#FEF3C7'
                                    : '#D1FAE5',
                            },
                          ]}>
                          {officer.workloadPercentage}%
                        </Text>
                      </View>
                    </View>
                    <View className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <View
                        style={{
                          width: `${Math.min(100, officer.workloadPercentage)}%`,
                          height: '100%',
                          borderRadius: 8,
                          backgroundColor:
                            officer.workloadPercentage > 90
                              ? '#EF4444'
                              : officer.workloadPercentage > 75
                                ? '#F59E0B'
                                : '#10B981',
                        }}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-[13px] font-semibold italic text-slate-500 dark:text-slate-400 text-center py-4">
                  No assigned field officers found
                </Text>
              )}
            </View>

            <View
              className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              style={styles.section}>
              <SectionHeader
                icon={<Target color="#10B981" size={16} strokeWidth={2.5} />}
                title="Officer Success Rates"
                isDark={isDark}
              />
              <View className="flex-row flex-wrap gap-3">
                {analytics.officers.leaderboard.length > 0 ? (
                  analytics.officers.leaderboard.map((officer: any, i: number) => (
                    <View
                      key={i}
                      className="items-center rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/50"
                      style={{ width: '30%' }}>
                      <View
                        style={[
                          styles.officerRing,
                          {
                            borderColor:
                              officer.efficiencyScore >= 90
                                ? '#10B981'
                                : officer.efficiencyScore >= 75
                                  ? '#F59E0B'
                                  : '#EF4444',
                          },
                        ]}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color:
                              officer.efficiencyScore >= 90
                                ? '#10B981'
                                : officer.efficiencyScore >= 75
                                  ? '#D97706'
                                  : '#EF4444',
                          }}>
                          {officer.efficiencyScore}%
                        </Text>
                      </View>
                      <Text
                        className="mt-1.5 text-center text-[10px] font-bold text-slate-600 dark:text-slate-300"
                        numberOfLines={1}>
                        {officer.fullName.split(' ')[0]}
                      </Text>
                      <View className="mt-0.5 flex-row items-center gap-0.5">
                        <Star color="#F59E0B" size={9} fill="#F59E0B" strokeWidth={0} />
                        <Text className="text-[9px] font-bold text-amber-500">{officer.rating.toFixed(1)}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text className="text-[13px] font-semibold italic text-slate-500 dark:text-slate-400 text-center py-4 w-full">
                    No assigned field officers found
                  </Text>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  slaRingWrap: {
    alignItems: 'center',
  },
  headerStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiCard: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  section: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pctBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  officerRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
