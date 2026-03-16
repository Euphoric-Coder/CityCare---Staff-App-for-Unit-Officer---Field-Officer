import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
  Settings,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User as UserIcon,
  Mail,
  Shield,
  MapPin,
  LogOut,
  Bell,
  Info,
  ChevronRight,
  BadgeCheck,
  Building2,
  Settings2,
  Lock,
} from 'lucide-react-native';

import { User } from '../lib/auth';

interface ProfileTabProps {
  user: User;
  onSignOut: () => void;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeStyle(role: string, isDark: boolean) {
  if (role === 'UnitOfficer' || role === 'Admin') {
    return {
      bg: isDark ? '#1E3A5F' : '#DBEAFE',
      text: isDark ? '#60A5FA' : '#1D4ED8',
      border: isDark ? '#1D4ED8' : '#BFDBFE',
    };
  }
  return {
    bg: isDark ? '#064E3B' : '#D1FAE5',
    text: isDark ? '#34D399' : '#059669',
    border: isDark ? '#10B981' : '#A7F3D0',
  };
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}

function InfoRow({ icon, label, value, last }: InfoRowProps) {
  return (
    <>
      <View className="flex-row items-center gap-3.5 py-3.5">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/80">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {label}
          </Text>
          <Text className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            {value}
          </Text>
        </View>
      </View>
      {!last && <View className="ml-[52px] h-px bg-slate-100 dark:bg-slate-700/60" />}
    </>
  );
}

export default function ProfileTab({ user, onSignOut }: ProfileTabProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  // @ts-ignore
  const { name: userName, email: userEmail, ward = 'Varanasi Zone', role = 'UnitOfficer' } = user;
  const [notifications, setNotifications] = useState(true);
  const roleBadge = getRoleBadgeStyle(role, isDark);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: onSignOut,
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero header */}
        <LinearGradient
          colors={isDark ? ['#0F172A', '#1E293B', '#0F172A'] : ['#1E40AF', '#2563EB', '#0EA5E9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}>
          {/* Decorative circles */}
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />

          {/* Avatar */}
          <View className="items-center px-5 pb-6 pt-8">
            <View style={styles.avatarRing}>
              <LinearGradient
                colors={['#60A5FA', '#3B82F6', '#1D4ED8']}
                style={styles.avatarGradient}>
                <Text style={styles.avatarText}>{getInitials(userName)}</Text>
              </LinearGradient>
            </View>

            <Text className="mt-4 text-[22px] font-extrabold tracking-tight text-white">
              {userName}
            </Text>
            <Text className="mb-3 mt-0.5 text-[13px] text-blue-200 dark:text-slate-400">
              {userEmail}
            </Text>

            {/* Role badge */}
            <View
              className="flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5"
              style={{
                backgroundColor: roleBadge.bg,
                borderColor: roleBadge.border,
              }}>
              <BadgeCheck color={roleBadge.text} size={13} strokeWidth={2.5} />
              <Text className="text-[12px] font-bold" style={{ color: roleBadge.text }}>
                {role}
              </Text>
            </View>

            {/* Stats row */}
            <View className="mt-5 w-full flex-row gap-3">
              <View
                className="flex-1 items-center rounded-2xl border py-3"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)',
                }}>
                <Text className="text-[18px] font-extrabold text-white">24</Text>
                <Text className="mt-0.5 text-[11px] font-semibold text-blue-200 dark:text-slate-400">
                  Issues
                </Text>
              </View>
              <View
                className="flex-1 items-center rounded-2xl border py-3"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)',
                }}>
                <Text className="text-[18px] font-extrabold text-white">18</Text>
                <Text className="mt-0.5 text-[11px] font-semibold text-blue-200 dark:text-slate-400">
                  Resolved
                </Text>
              </View>
              <View
                className="flex-1 items-center rounded-2xl border py-3"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)',
                }}>
                <Text className="text-[18px] font-extrabold text-white">75%</Text>
                <Text className="mt-0.5 text-[11px] font-semibold text-blue-200 dark:text-slate-400">
                  Rate
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className="-mt-1 px-5">
          {/* Account info card */}
          <View className="mb-4">
            <Text className="mt-4 mb-2 ml-1 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Account
            </Text>
            <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white px-4 dark:border-slate-700/60 dark:bg-slate-800/90">
              <InfoRow
                icon={<UserIcon color={isDark ? '#60A5FA' : '#1D4ED8'} size={18} strokeWidth={2} />}
                label="Full Name"
                value={userName}
              />
              <InfoRow
                icon={<Mail color={isDark ? '#60A5FA' : '#1D4ED8'} size={18} strokeWidth={2} />}
                label="Email Address"
                value={userEmail}
              />
              <InfoRow
                icon={<Shield color={isDark ? '#60A5FA' : '#1D4ED8'} size={18} strokeWidth={2} />}
                label="Role"
                value={role}
              />
              <InfoRow
                icon={
                  <Building2 color={isDark ? '#60A5FA' : '#1D4ED8'} size={18} strokeWidth={2} />
                }
                label="Assigned Ward"
                value={ward}
                last
              />
            </View>
          </View>

          {/* Preferences card */}
          <View className="mb-4">
            <Text className="mb-2 ml-1 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Preferences
            </Text>
            <View className="rounded-3xl border border-slate-200 bg-white px-4 dark:border-slate-700/60 dark:bg-slate-800/90">
              <View className="flex-row items-center gap-3.5 py-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30">
                  <Bell color={isDark ? '#FCD34D' : '#F59E0B'} size={18} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                    Push Notifications
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">
                    Alerts for new issues and updates
                  </Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{
                    false: isDark ? '#334155' : '#E2E8F0',
                    true: isDark ? '#1D4ED8' : '#93C5FD',
                  }}
                  thumbColor={
                    notifications
                      ? isDark
                        ? '#60A5FA'
                        : '#1D4ED8'
                      : isDark
                        ? '#475569'
                        : '#F3F4F6'
                  }
                />
              </View>
            </View>
          </View>

          {/* More section */}
          <View className="mb-4">
            <Text className="mb-2 ml-1 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              More
            </Text>
            <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-800/90">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => Alert.alert('App Version', 'CityCare v1.0.0\n\nBuild: 2026.02.28')}
                className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/80">
                  <Info color={isDark ? '#94A3B8' : '#64748B'} size={18} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                    App Version
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">
                    CityCare v1.0.0
                  </Text>
                </View>
                <ChevronRight color={isDark ? '#475569' : '#CBD5E1'} size={18} strokeWidth={2.5} />
              </TouchableOpacity>

              <View className="ml-[60px] h-px bg-slate-100 dark:bg-slate-700/60" />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => Alert.alert('Settings', 'Settings coming soon.')}
                className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/80">
                  <Settings2 color={isDark ? '#94A3B8' : '#64748B'} size={18} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                    Settings
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">
                    App preferences and configuration
                  </Text>
                </View>
                <ChevronRight color={isDark ? '#475569' : '#CBD5E1'} size={18} strokeWidth={2.5} />
              </TouchableOpacity>

              <View className="ml-[60px] h-px bg-slate-100 dark:bg-slate-700/60" />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => Alert.alert('Security', 'Password change coming soon.')}
                className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/80">
                  <Lock color={isDark ? '#94A3B8' : '#64748B'} size={18} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                    Change Password
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">
                    Update your account password
                  </Text>
                </View>
                <ChevronRight color={isDark ? '#475569' : '#CBD5E1'} size={18} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.85}
            className="mb-6 mt-2 overflow-hidden rounded-3xl">
            <View className="flex-row items-center justify-center gap-2.5 rounded-3xl border border-red-200 bg-red-50 py-4 dark:border-red-800/50 dark:bg-red-950/40">
              <LogOut color={isDark ? '#F87171' : '#EF4444'} size={19} strokeWidth={2.5} />
              <Text className="text-[15px] font-bold text-red-500 dark:text-red-400">Sign Out</Text>
            </View>
          </TouchableOpacity>

          {/* Footer */}
          <View className="mb-2 items-center gap-1">
            <View className="mb-1 flex-row items-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-blue-400 dark:bg-blue-600" />
              <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                CityCare
              </Text>
              <View className="h-1.5 w-1.5 rounded-full bg-blue-400 dark:bg-blue-600" />
            </View>
            <Text className="text-center text-[11px] text-slate-300 dark:text-slate-700">
              Civic Issue Management System · © 2026
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroGradient: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  decoCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -60,
    right: -50,
  },
  decoCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 20,
    left: -30,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarGradient: {
    flex: 1,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
