import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell, MapPin, CheckCircle2, AlertTriangle, Clock, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface DashboardStats {
  assigned: number;
  in_progress: number;
  pending_upload: number;
  rework_required: number;
  resolved_today: number;
  sla_alerts: number;
}

interface FieldOfficerDashboardProps {
  officerName: string;
  ward: string;
  isOnline: boolean;
  stats: DashboardStats;
  onNotificationPress: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function FieldOfficerDashboard({
  officerName,
  ward,
  isOnline,
  stats,
  onNotificationPress,
  onRefresh,
  refreshing,
}: FieldOfficerDashboardProps) {
  const StatCard = ({
    icon,
    label,
    value,
    color,
    iconBg,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    iconBg: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0EA5A4', '#0F766E']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.profileSection}>
              <View style={styles.profileCircle}>
                <Text style={styles.profileInitial}>{officerName.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.headerName}>{officerName}</Text>
                <View style={styles.headerSubInfo}>
                  <MapPin color="#CCFBF1" size={14} strokeWidth={2.5} />
                  <Text style={styles.headerWard}>{ward}</Text>
                  <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
                  <Text style={styles.statusText}>{isOnline ? 'Active' : 'Offline'}</Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <Bell color="#FFFFFF" size={24} strokeWidth={2.5} />
            {stats.sla_alerts > 0 && <View style={styles.notificationBadge} />}
          </TouchableOpacity>
        </View>
        <View style={styles.roleContainer}>
          <Text style={styles.roleBadge}>Field Officer</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<CheckCircle2 color="#0EA5A4" size={20} strokeWidth={2.5} />}
            label="Assigned Issues"
            value={stats.assigned}
            color="#0EA5A4"
            iconBg="#F0FDFA"
          />
          <StatCard
            icon={<TrendingUp color="#F59E0B" size={20} strokeWidth={2.5} />}
            label="In Progress"
            value={stats.in_progress}
            color="#F59E0B"
            iconBg="#FEF3C7"
          />
          <StatCard
            icon={<Clock color="#6B7280" size={20} strokeWidth={2.5} />}
            label="Pending Upload"
            value={stats.pending_upload}
            color="#6B7280"
            iconBg="#F3F4F6"
          />
          <StatCard
            icon={<AlertTriangle color="#DC2626" size={20} strokeWidth={2.5} />}
            label="Rework Required"
            value={stats.rework_required}
            color="#DC2626"
            iconBg="#FEE2E2"
          />
          <StatCard
            icon={<CheckCircle2 color="#16A34A" size={20} strokeWidth={2.5} />}
            label="Resolved Today"
            value={stats.resolved_today}
            color="#16A34A"
            iconBg="#D1FAE5"
          />
          <StatCard
            icon={<AlertTriangle color="#DC2626" size={20} strokeWidth={2.5} />}
            label="SLA Alerts"
            value={stats.sla_alerts}
            color="#DC2626"
            iconBg="#FEE2E2"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0FDFA',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerWard: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCFBF1',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    marginLeft: 4,
  },
  statusDotOnline: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CCFBF1',
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  roleContainer: {
    alignSelf: 'flex-start',
  },
  roleBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
});
