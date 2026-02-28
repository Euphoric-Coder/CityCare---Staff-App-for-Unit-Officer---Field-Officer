import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { TrendingUp, Clock, CheckCircle2, Award } from 'lucide-react-native';

interface AnalyticsData {
  resolved_this_week: number;
  avg_resolution_time: number;
  sla_compliance_rate: number;
  performance_badge: string;
}

interface FieldAnalyticsTabProps {
  data: AnalyticsData;
}

export default function FieldAnalyticsTab({ data }: FieldAnalyticsTabProps) {
  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Excellent':
        return { bg: '#D1FAE5', text: '#166534', border: '#86EFAC' };
      case 'Good':
        return { bg: '#E0F2FE', text: '#075985', border: '#7DD3FC' };
      case 'Average':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' };
    }
  };

  const badgeColors = getBadgeColor(data.performance_badge);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Performance Analytics</Text>
        <Text style={styles.headerSubtitle}>Your weekly summary</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.badgeCard,
            { backgroundColor: badgeColors.bg, borderColor: badgeColors.border },
          ]}>
          <View style={styles.badgeIcon}>
            <Award color={badgeColors.text} size={32} strokeWidth={2.5} />
          </View>
          <Text style={[styles.badgeTitle, { color: badgeColors.text }]}>Performance Badge</Text>
          <Text style={[styles.badgeValue, { color: badgeColors.text }]}>
            {data.performance_badge}
          </Text>
          <Text style={[styles.badgeDescription, { color: badgeColors.text }]}>
            Keep up the great work!
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <CheckCircle2 color="#16A34A" size={24} strokeWidth={2.5} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Resolved This Week</Text>
              <Text style={[styles.statValue, { color: '#16A34A' }]}>
                {data.resolved_this_week}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((data.resolved_this_week / 20) * 100, 100)}%`,
                      backgroundColor: '#16A34A',
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Clock color="#F59E0B" size={24} strokeWidth={2.5} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Avg Resolution Time</Text>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                {data.avg_resolution_time}h
              </Text>
              <Text style={styles.statDescription}>
                {data.avg_resolution_time < 24 ? 'Excellent' : 'Good'}
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingUp color="#0EA5A4" size={24} strokeWidth={2.5} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>SLA Compliance</Text>
              <Text style={[styles.statValue, { color: '#0EA5A4' }]}>
                {data.sla_compliance_rate}%
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${data.sla_compliance_rate}%`,
                      backgroundColor:
                        data.sla_compliance_rate >= 90
                          ? '#16A34A'
                          : data.sla_compliance_rate >= 70
                            ? '#F59E0B'
                            : '#DC2626',
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Performance Tips</Text>
          <View style={styles.tipItem}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>Capture high-quality before and after images</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>Complete work notes for better tracking</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>Respond to rework requests promptly</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>Maintain good communication with citizens</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDFA',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  badgeCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 2,
  },
  badgeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  badgeValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  badgeDescription: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  statDescription: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#CCFBF1',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0EA5A4',
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    lineHeight: 20,
  },
});
