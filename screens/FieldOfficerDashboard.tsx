import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Bell,
  MapPin,
  CircleCheck as CheckCircle2,
  TriangleAlert as AlertTriangle,
  Clock,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react-native';
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
}

const STAT_CARDS = (stats: DashboardStats) => [
  {
    label: 'Assigned',
    value: stats.assigned,
    icon: <CheckCircle2 color="#5EEAD4" size={20} strokeWidth={2.5} />,
    iconBg: 'rgba(94,234,212,0.18)',
    accentColor: '#5EEAD4',
  },
  {
    label: 'In Progress',
    value: stats.in_progress,
    icon: <TrendingUp color="#FDE68A" size={20} strokeWidth={2.5} />,
    iconBg: 'rgba(253,230,138,0.18)',
    accentColor: '#FDE68A',
  },
  {
    label: 'Pending Upload',
    value: stats.pending_upload,
    icon: <Clock color="#BAE6FD" size={20} strokeWidth={2.5} />,
    iconBg: 'rgba(186,230,253,0.18)',
    accentColor: '#BAE6FD',
  },
  {
    label: 'Rework',
    value: stats.rework_required,
    icon: <AlertTriangle color="#FCA5A5" size={20} strokeWidth={2.5} />,
    iconBg: 'rgba(252,165,165,0.18)',
    accentColor: '#FCA5A5',
  },
  {
    label: 'Done Today',
    value: stats.resolved_today,
    icon: <Zap color="#86EFAC" size={20} strokeWidth={2.5} />,
    iconBg: 'rgba(134,239,172,0.18)',
    accentColor: '#86EFAC',
  },
  {
    label: 'SLA Alerts',
    value: stats.sla_alerts,
    icon: <AlertTriangle color="#FB923C" size={20} strokeWidth={2.5} />,
    iconBg: 'rgba(251,146,60,0.18)',
    accentColor: '#FB923C',
  },
];

export default function FieldOfficerDashboard({
  officerName,
  ward,
  isOnline,
  stats,
  onNotificationPress,
}: FieldOfficerDashboardProps) {
  const initials = officerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <LinearGradient
      colors={['#0D9488', '#0891B2', '#075985']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}>
      {/* top row */}
      <View className="mb-5 flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          <View style={styles.avatar}>
            <LinearGradient
              colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.1)']}
              style={styles.avatarGrad}>
              <Text className="text-xl font-extrabold text-white">{initials}</Text>
            </LinearGradient>
          </View>
          <View className="flex-1">
            <Text className="mb-0.5 text-[12px] font-medium text-white/70">{today}</Text>
            <Text
              className="text-[22px] font-extrabold tracking-tight text-white"
              numberOfLines={1}>
              {officerName}
            </Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <MapPin color="rgba(255,255,255,0.75)" size={11} strokeWidth={2.5} />
              <Text className="text-[11px] font-semibold text-white/75">{ward}</Text>
            </View>
          </View>
        </View>

        <View className="items-end gap-2">
          <TouchableOpacity
            onPress={onNotificationPress}
            activeOpacity={0.75}
            style={styles.notifBtn}>
            <Bell color="#FFFFFF" size={20} strokeWidth={2} />
            {stats.sla_alerts > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
          <View className="self-end rounded-full bg-white/[0.15] px-2.5 py-1">
            <Text className="text-[10px] font-extrabold tracking-wider text-teal-200">
              FIELD OFFICER
            </Text>
          </View>
        </View>
      </View>

      {/* stat cards — 3-column grid */}
      <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-white/60">
        Today's Overview
      </Text>
      <View style={styles.statsGrid}>
        {STAT_CARDS(stats).map((card, i) => (
          <View key={i} style={[styles.statCard, { borderColor: card.accentColor + '33' }]}>
            <View style={[styles.statIcon, { backgroundColor: card.iconBg }]}>{card.icon}</View>
            <Text className="mt-1 text-[24px] font-extrabold tracking-tight text-white">
              {card.value}
            </Text>
            <Text className="mt-0.5 text-center text-[10px] font-semibold text-white/70">
              {card.label}
            </Text>
            <View
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl opacity-60"
              style={{ backgroundColor: card.accentColor }}
            />
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 18,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  avatarGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F87171',
    borderWidth: 2,
    borderColor: '#0D9488',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '30.5%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
