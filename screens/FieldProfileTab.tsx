import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Switch,
  Alert,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Star,
  LogOut,
  Moon,
  Info,
  Shield,
  TrendingUp,
  Clock,
  CircleCheck as CheckCircle,
  Award,
  Zap,
  ChevronRight,
  Activity,
  Target,
  Calendar,
} from 'lucide-react-native';
import { removeToken } from '../lib/auth';

interface FieldProfileTabProps {
  profile: OfficerProfile;
  onLogout: () => void;
}

interface OfficerProfile {
  name: string;
  ward: string;
  phone: string;
  email: string;
  rating: number;
  total_resolved: number;
}

function StatCard({
  icon,
  value,
  label,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <View className="flex-1 rounded-2xl bg-white p-4 dark:bg-slate-800" style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: bgColor }]}>{icon}</View>
      <Text
        className="mb-0.5 mt-3 text-[22px] font-black text-slate-900 dark:text-white"
        style={{ color }}>
        {value}
      </Text>
      <Text className="text-[11px] font-semibold leading-4 text-slate-400 dark:text-slate-500">
        {label}
      </Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-slate-100 py-3.5 last:border-0 dark:border-slate-700/50">
      <View className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-900/30">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {label}
        </Text>
        <Text className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">
          {value}
        </Text>
      </View>
      <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
    </View>
  );
}

function SettingRow({
  icon,
  iconBg,
  label,
  description,
  right,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  description?: string;
  right: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-slate-100 py-3.5 last:border-0 dark:border-slate-700/50">
      <View className="flex-1 flex-row items-center gap-3">
        <View style={[styles.settingIconBox, { backgroundColor: iconBg }]}>{icon}</View>
        <View className="flex-1">
          <Text className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">
            {label}
          </Text>
          {description && (
            <Text className="mt-0.5 text-[12px] font-medium text-slate-400 dark:text-slate-500">
              {description}
            </Text>
          )}
        </View>
      </View>
      {right}
    </View>
  );
}

const PERFORMANCE_BADGES = [
  {
    label: 'Top Resolver',
    icon: <Award size={12} color="#F59E0B" strokeWidth={2.5} />,
    bg: '#FEF3C7',
    text: '#92400E',
  },
  {
    label: 'Fast Response',
    icon: <Zap size={12} color="#8B5CF6" strokeWidth={2.5} />,
    bg: '#EDE9FE',
    text: '#5B21B6',
  },
  {
    label: 'SLA Champion',
    icon: <Target size={12} color="#10B981" strokeWidth={2.5} />,
    bg: '#D1FAE5',
    text: '#065F46',
  },
];

export default function FieldProfileTab({ profile, onLogout }: FieldProfileTabProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  const successRate = Math.round((profile.total_resolved / (profile.total_resolved + 12)) * 100);
  const activeIssues = 3;
  const avgResolutionHrs = 18;
  const slaCompliance = 92;
  const thisMonthResolved = 24;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);

              // Remove token from SecureStore
              await removeToken();

              // Call parent redirect
              onLogout();
            } catch (error) {
              Alert.alert('Error', 'Logout failed. Please try again.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
  return (
    // @ts-ignore
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* ── Hero Banner ── */}
        <LinearGradient
          colors={
            isDark
              ? ['#022C22', '#083344', '#020617'] // dark mode (deep teal → navy → black)
              : ['#0D9488', '#0891B2', '#075985'] // light mode
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}>
          {/* Background decoration */}
          <View
            style={[
              styles.heroDeco1,
              {
                backgroundColor: isDark ? 'rgba(45, 212, 191, 0.08)' : 'rgba(255,255,255,0.06)',
              },
            ]}
          />
          <View
            style={[
              styles.heroDeco2,
              {
                backgroundColor: isDark ? 'rgba(45, 212, 191, 0.06)' : 'rgba(255,255,255,0.05)',
              },
            ]}
          />

          {/* Avatar */}
          <View style={styles.avatarRing}>
            <LinearGradient
              colors={
                isDark
                  ? ['#1E293B', '#020617'] // dark glass effect
                  : ['#FFFFFF', '#E0F2FE']
              }
              style={styles.avatarInner}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </LinearGradient>
          </View>

          {/* Name */}
          <Text className="mb-1 mt-4 text-[26px] font-black tracking-tight text-white">
            {profile.name}
          </Text>

          {/* Role badge */}
          <View
            className={`mb-4 flex-row items-center gap-1.5 rounded-full px-4 py-1.5 ${
              isDark ? 'bg-white/10' : 'bg-white/20'
            }`}>
            <Shield size={13} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
            <Text className="text-[12px] font-bold tracking-wide text-white/90">Field Officer</Text>
          </View>

          {/* Star rating */}
          <View
            className={`mb-5 flex-row items-center gap-1.5 rounded-2xl px-4 py-2 ${
              isDark ? 'bg-amber-400/10' : 'bg-amber-400/25'
            }`}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                color="#FCD34D"
                fill={s <= Math.round(profile.rating) ? '#FCD34D' : 'transparent'}
                strokeWidth={2}
              />
            ))}
            <Text className="ml-1 text-[14px] font-extrabold text-amber-200">
              {profile.rating.toFixed(1)}
            </Text>
          </View>

          {/* Performance badges */}
          <View className="flex-row flex-wrap justify-center gap-2">
            {PERFORMANCE_BADGES.map((badge, i) => (
              <View
                key={i}
                className="flex-row items-center gap-1.5 rounded-xl px-3 py-1.5"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)',
                }}>
                {badge.icon}
                <Text className="text-[11px] font-bold text-white/90">{badge.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Quick Stats Row ── */}
        <View className="mb-4 flex-row gap-3">
          <StatCard
            icon={
              <CheckCircle size={18} color={isDark ? '#2DD4BF' : '#0EA5A4'} strokeWidth={2.5} />
            }
            value={String(profile.total_resolved)}
            label="Total Resolved"
            color={isDark ? '#2DD4BF' : '#0EA5A4'}
            bgColor={isDark ? '#042F2E' : '#F0FDFA'}
          />

          <StatCard
            icon={<Activity size={18} color={isDark ? '#FBBF24' : '#F59E0B'} strokeWidth={2.5} />}
            value={String(activeIssues)}
            label="Active Issues"
            color={isDark ? '#FBBF24' : '#F59E0B'}
            bgColor={isDark ? '#451A03' : '#FEF3C7'}
          />

          <StatCard
            icon={<TrendingUp size={18} color={isDark ? '#34D399' : '#10B981'} strokeWidth={2.5} />}
            value={`${successRate}%`}
            label="Success Rate"
            color={isDark ? '#34D399' : '#10B981'}
            bgColor={isDark ? '#022C22' : '#D1FAE5'}
          />
        </View>

        {/* ── Performance Overview ── */}
        <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <View className="mb-5 flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
              <TrendingUp size={16} color="#0EA5A4" strokeWidth={2.5} />
            </View>
            <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Performance Overview
            </Text>
          </View>

          {/* Metrics grid */}
          <View className="mb-5 flex-row gap-3">
            {/* SLA Compliance */}
            <View
              className="flex-1 items-center rounded-2xl bg-teal-50 p-4 dark:bg-teal-900/20"
              style={styles.metricBox}>
              <View style={styles.ringWrap}>
                <View style={[styles.ringOuter, { borderColor: '#0EA5A4' + '30' }]} />
                <View style={[styles.ringFilled, { borderColor: '#0EA5A4' }]} />
                <Text className="absolute text-[16px] font-black text-teal-600 dark:text-teal-400">
                  {slaCompliance}%
                </Text>
              </View>
              <Text className="mt-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                SLA{'\n'}Compliance
              </Text>
            </View>

            {/* Avg Resolution */}
            <View
              className="flex-1 items-center rounded-2xl bg-blue-50 p-4 dark:bg-blue-900/20"
              style={styles.metricBox}>
              <View style={styles.ringWrap}>
                <View style={[styles.ringOuter, { borderColor: '#3B82F6' + '30' }]} />
                <View style={[styles.ringFilled, { borderColor: '#3B82F6' }]} />
                <Text className="absolute text-[16px] font-black text-blue-600 dark:text-blue-400">
                  {avgResolutionHrs}h
                </Text>
              </View>
              <Text className="mt-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Avg{'\n'}Resolution
              </Text>
            </View>

            {/* This Month */}
            <View
              className="flex-1 items-center rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-900/20"
              style={styles.metricBox}>
              <View style={styles.ringWrap}>
                <View style={[styles.ringOuter, { borderColor: '#10B981' + '30' }]} />
                <View style={[styles.ringFilled, { borderColor: '#10B981' }]} />
                <Text className="absolute text-[16px] font-black text-emerald-600 dark:text-emerald-400">
                  {thisMonthResolved}
                </Text>
              </View>
              <Text className="mt-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                This{'\n'}Month
              </Text>
            </View>
          </View>

          {/* Progress bars */}
          <View className="gap-3">
            <View>
              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  Response Rate
                </Text>
                <Text className="text-[12px] font-extrabold text-teal-600 dark:text-teal-400">
                  96%
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <View
                  className="h-full rounded-full"
                  style={[styles.progressBar, { width: '96%', backgroundColor: '#0EA5A4' }]}
                />
              </View>
            </View>
            <View>
              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  Quality Score
                </Text>
                <Text className="text-[12px] font-extrabold text-amber-500">88%</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <View
                  className="h-full rounded-full"
                  style={[styles.progressBar, { width: '88%', backgroundColor: '#F59E0B' }]}
                />
              </View>
            </View>
            <View>
              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  Citizen Satisfaction
                </Text>
                <Text className="text-[12px] font-extrabold text-emerald-600">94%</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <View
                  className="h-full rounded-full"
                  style={[styles.progressBar, { width: '94%', backgroundColor: '#10B981' }]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* ── Activity Streak ── */}
        <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <View className="mb-4 flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30">
              <Calendar size={16} color="#F59E0B" strokeWidth={2.5} />
            </View>
            <Text className="flex-1 text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Weekly Activity
            </Text>
            <View className="rounded-lg bg-amber-50 px-2.5 py-1 dark:bg-amber-900/30">
              <Text className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                This Week
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
              const heights = [70, 90, 55, 100, 80, 40, 60];
              const isToday = i === 4;
              const h = heights[i];

              return (
                <View key={i} className="items-center gap-1.5" style={{ flex: 1 }}>
                  <View
                    style={[
                      styles.barTrack,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9', // track bg
                      },
                    ]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${h}%`,
                          backgroundColor: isToday
                            ? isDark
                              ? '#2DD4BF'
                              : '#0EA5A4' // active bar
                            : isDark
                              ? '#334155'
                              : '#E2E8F0', // inactive bar
                        },
                      ]}
                    />
                  </View>

                  <Text
                    className="text-[10px] font-bold"
                    style={{
                      color: isToday
                        ? isDark
                          ? '#2DD4BF'
                          : '#0EA5A4'
                        : isDark
                          ? '#64748B'
                          : '#94A3B8',
                    }}>
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Contact Information ── */}
        <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <View className="mb-3 flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
              <User size={16} color="#0EA5A4" strokeWidth={2.5} />
            </View>
            <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Contact Information
            </Text>
          </View>

          <InfoRow
            icon={<MapPin size={17} color="#0EA5A4" strokeWidth={2.5} />}
            label="Ward / Zone"
            value={profile.ward}
          />
          <InfoRow
            icon={<Phone size={17} color="#0EA5A4" strokeWidth={2.5} />}
            label="Phone"
            value={profile.phone}
          />
          <InfoRow
            icon={<Mail size={17} color="#0EA5A4" strokeWidth={2.5} />}
            label="Email"
            value={profile.email}
          />
        </View>

        {/* ── Settings ── */}
        <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <View className="mb-3 flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
              <Activity size={16} color={isDark ? '#64748B' : '#475569'} strokeWidth={2.5} />
            </View>
            <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Settings
            </Text>
          </View>
          <SettingRow
            icon={<Info size={17} color={isDark ? '#2DD4BF' : '#0EA5A4'} strokeWidth={2.5} />}
            iconBg={isDark ? '#042F2E' : '#F0FDFA'}
            label="App Version"
            description="CityCare Field Officer v1.0.0"
            right={
              <View className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-700">
                <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  1.0.0
                </Text>
              </View>
            }
          />
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.85} style={styles.logoutBtn}>
          <LinearGradient
            colors={
              isDark
                ? ['#3F0D0D', '#1F0505'] // dark gradient
                : ['#FEF2F2', '#FEE2E2'] // light gradient
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.logoutGrad,
              {
                borderColor: isDark ? '#7F1D1D' : '#FECACA',
              },
            ]}>
            {/* Icon Box */}
            <View
              style={{
                backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
              }}
              className="h-10 w-10 items-center justify-center rounded-2xl">
              <LogOut size={18} color={isDark ? '#F87171' : '#DC2626'} strokeWidth={2.5} />
            </View>

            {/* Text */}
            <Text
              className="ml-3 flex-1 text-[15px] font-extrabold"
              style={{
                color: isDark ? '#FCA5A5' : '#DC2626',
              }}>
              Sign Out
            </Text>

            {/* Arrow */}
            <ChevronRight size={18} color={isDark ? '#7F1D1D' : '#FCA5A5'} strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Footer ── */}
        <View className="items-center gap-1 pb-8 pt-2">
          <Text className="text-[13px] font-bold text-slate-400 dark:text-slate-600">
            CityCare Field Officer
          </Text>
          <Text className="text-[11px] font-medium text-slate-300 dark:text-slate-700">
            Version 1.0.0 · Build 2024
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  heroBanner: {
    borderRadius: 28,
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDeco1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -60,
  },
  heroDeco2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -50,
    left: -40,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0D9488',
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 12,
  },
  statCard: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricBox: {
    shadowColor: 'transparent',
  },
  ringWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 6,
  },
  ringFilled: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 6,
    borderTopColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  progressBar: {
    borderRadius: 999,
  },
  barTrack: {
    width: 28,
    height: 60,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  settingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
});
