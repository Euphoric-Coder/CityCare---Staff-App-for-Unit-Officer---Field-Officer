import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, PieChart, Clock, Award, BarChart3, Activity } from 'lucide-react-native';
import { mockAnalyticsData } from '../lib/mockData';
import AnalyticsCard from '../components/AnalyticsCard';

interface AnalyticsTabProps {
  ward?: string;
}

export default function AnalyticsTab({ ward = 'Varanasi Zone' }: AnalyticsTabProps) {
  const maxCount = Math.max(...mockAnalyticsData.categoryDistribution.map((c) => c.count));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#1E40AF', '#1D4ED8', '#2563EB']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>{ward} Performance Metrics</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.metricsGrid}>
          <AnalyticsCard
            title="SLA Compliance"
            value={`${mockAnalyticsData.slaCompliance}%`}
            icon={<TrendingUp color="#10B981" size={24} />}
            subtitle="On-time resolution rate"
            color="#10B981"
          />

          <AnalyticsCard
            title="Avg Resolution Time"
            value={`${mockAnalyticsData.avgResolutionTime}h`}
            icon={<Clock color="#F59E0B" size={24} />}
            subtitle="Average across all issues"
            color="#F59E0B"
          />

          <AnalyticsCard
            title="Avg Verification Time"
            value={`${mockAnalyticsData.avgVerificationTime}h`}
            icon={<Award color="#6366F1" size={24} />}
            subtitle="Time to verify issues"
            color="#6366F1"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 color="#1D4ED8" size={22} />
            <Text style={styles.sectionTitle}>Issue Category Distribution</Text>
          </View>

          <View style={styles.chartContainer}>
            {mockAnalyticsData.categoryDistribution.map((item, index) => {
              const percentage = (item.count / maxCount) * 100;
              return (
                <View key={index} style={styles.barRow}>
                  <Text style={styles.categoryLabel}>{item.category}</Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: getBarColor(index),
                        },
                      ]}
                    />
                    <Text style={styles.barValue}>{item.count}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity color="#1D4ED8" size={22} />
            <Text style={styles.sectionTitle}>Performance Insights</Text>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <TrendingUp color="#10B981" size={20} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Great Progress!</Text>
              <Text style={styles.insightText}>
                Your ward has resolved 75% of issues this week, which is above the city average of
                68%.
              </Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <View style={[styles.insightIcon, { backgroundColor: '#FEF3C7' }]}>
              <Clock color="#F59E0B" size={20} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Room for Improvement</Text>
              <Text style={styles.insightText}>
                Resolution time can be reduced by 0.5 days with faster field officer assignment.
              </Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <View style={[styles.insightIcon, { backgroundColor: '#E0E7FF' }]}>
              <PieChart color="#6366F1" size={20} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Most Common Issue</Text>
              <Text style={styles.insightText}>
                Potholes and road repairs are the most reported issues in your ward.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Total Issues</Text>
              <Text style={styles.statChange}>+3 this week</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>18</Text>
              <Text style={styles.statLabel}>Resolved</Text>
              <Text style={styles.statChange}>+5 this week</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>6</Text>
              <Text style={styles.statLabel}>Active</Text>
              <Text style={styles.statChange}>-2 this week</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>4.5</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
              <Text style={styles.statChange}>Out of 5</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getBarColor = (index: number) => {
  const colors = ['#1D4ED8', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  chartContainer: {
    gap: 16,
  },
  barRow: {
    gap: 8,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bar: {
    height: 32,
    borderRadius: 8,
    minWidth: 40,
    justifyContent: 'center',
  },
  barValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    minWidth: 20,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  statsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
