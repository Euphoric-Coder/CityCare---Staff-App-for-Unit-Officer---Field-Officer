import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, useColorScheme } from 'react-native';
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
  Flame,
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

const STAT_CONFIG = (stats: DashboardStats) => [
  {
    key: 'assigned',
    label: 'Assigned',
    value: stats.assigned,
    icon: CheckCircle2,
    colors: ['#2DD4BF', '#0D9488'], // teal
    aura: 'rgba(45, 212, 191, 0.15)',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    value: stats.in_progress,
    icon: TrendingUp,
    colors: ['#FBBF24', '#D97706'], // amber
    aura: 'rgba(251, 191, 36, 0.15)',
  },
  {
    key: 'pending_upload',
    label: 'Pending',
    value: stats.pending_upload,
    icon: Clock,
    colors: ['#60A5FA', '#2563EB'], // blue
    aura: 'rgba(96, 165, 250, 0.15)',
  },
  {
    key: 'rework',
    label: 'Rework',
    value: stats.rework_required,
    icon: AlertTriangle,
    colors: ['#F87171', '#DC2626'], // red
    aura: 'rgba(248, 113, 113, 0.15)',
  },
  {
    key: 'done',
    label: 'Done Today',
    value: stats.resolved_today,
    icon: Zap,
    colors: ['#4ADE80', '#16A34A'], // green
    aura: 'rgba(74, 222, 128, 0.15)',
  },
  {
    key: 'alerts',
    label: 'SLA Alerts',
    value: stats.sla_alerts,
    icon: Flame,
    colors: ['#FB923C', '#EA580C'], // orange
    aura: 'rgba(251, 146, 60, 0.15)',
    pulse: true,
  },
];

export default function FieldOfficerDashboard({
  officerName,
  ward,
  isOnline,
  stats,
  onNotificationPress,
}: FieldOfficerDashboardProps) {
  const isDark = useColorScheme() === 'dark';
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (stats.sla_alerts > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [stats.sla_alerts]);

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
      colors={isDark ? ['#111827', '#0F172A', '#111827'] : ['#4F46E5', '#0EA5E9', '#0EA5E9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}>
      
      {/* Background Decorative Element */}
      <View style={styles.headerBlur} />

      {/* Unified Profile Header Section */}
      <View className="mb-8 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-4">
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={isDark ? ['#334155', '#1E293B'] : ['#FFFFFF', '#E2E8F0']}
              style={styles.avatarBorder}>
              <View style={styles.avatarInner}>
                <LinearGradient
                  colors={['#2DD4BF', '#0D9488']}
                  style={styles.avatarGrad}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </LinearGradient>
              </View>
            </LinearGradient>
            {isOnline && <View style={[styles.onlineBadge, { borderColor: isDark ? '#111827' : '#4F46E5' }]} />}
          </View>

          <View className="flex-1">
            <Text style={styles.dateText}>{today.toUpperCase()}</Text>
            <Text style={styles.nameText} numberOfLines={1}>
              {officerName}
            </Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <View 
                style={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                className="rounded-full px-2.5 py-1 border border-white/10 flex-row items-center gap-1.5 shadow-sm">
                <MapPin color="#2DD4BF" size={11} strokeWidth={3} />
                <Text style={[styles.wardText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{ward}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="items-end gap-3">
          <TouchableOpacity
            onPress={onNotificationPress}
            activeOpacity={0.7}
            style={[
              styles.notifButton,
              { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }
            ]}>
            <Bell color={isDark ? '#F1F5F9' : '#0F172A'} size={22} strokeWidth={2.5} />
            {stats.sla_alerts > 0 && (
               <View style={[styles.notifBadge, { borderColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
                 <Text style={styles.notifBadgeText}>{stats.sla_alerts}</Text>
               </View>
            )}
          </TouchableOpacity>
          <View 
            style={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
            className="rounded-full px-2.5 py-1 border border-white/10 shadow-sm">
            <Text className={`text-[9px] font-black tracking-widest ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
              FIELD OFFICER
            </Text>
          </View>
        </View>
      </View>

      {/* Compact Statistics Section with Tray */}
      <View style={styles.statsTray}>
        <View className="mb-3 flex-row items-center justify-between px-1">
          <Text style={styles.sectionHeader}>TASK OVERVIEW</Text>
          <View className="flex-row items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 border border-white/10">
            <TrendingUp color="#5EEAD4" size={10} strokeWidth={3} />
            <Text className="text-[9px] font-black text-white/80">LIVE</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {STAT_CONFIG(stats).map((card) => {
            const Icon = card.icon;
            const isAlert = card.pulse && card.value > 0;

            return (
              <Animated.View 
                key={card.key} 
                style={[
                  styles.statCardContainer,
                  isAlert && { transform: [{ scale: pulseAnim }] }
                ]}>
                <View style={[
                  styles.statCard, 
                  { 
                    borderColor: card.colors[0] + '88',
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF', // Solid colors for prominence
                  }
                ]}>
                  {/* Internal Aura - more subtle for solid cards */}
                  <View style={[styles.cardAura, { backgroundColor: card.aura, opacity: 0.5 }]} />
                  
                  <View style={[styles.iconContainer, { backgroundColor: card.colors[0] + '15' }]}>
                    <Icon color={card.colors[0]} size={16} strokeWidth={3} />
                  </View>
                  
                  <Text style={[styles.statValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {card.value}
                  </Text>
                  <Text style={styles.statLabel}>{card.label}</Text>
                  
                  {/* Bottom Accent Line */}
                  <LinearGradient
                    colors={card.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.statAccent}
                  />
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  headerBlur: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ scale: 1.5 }],
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBorder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: '#0F172A',
    padding: 2.5,
  },
  avatarGrad: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontFamily: 'System',
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    borderWidth: 4,
    borderColor: '#1E1B4B',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  nameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  wardText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#5EEAD4',
  },
  notifButton: {
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  notifBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F43F5E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    paddingHorizontal: 5,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2.5,
  },
  statsTray: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCardContainer: {
    width: '31.5%',
  },
  statCard: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cardAura: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(148, 163, 184, 0.8)', // Slate-400 equivalent for neutral label
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
});
