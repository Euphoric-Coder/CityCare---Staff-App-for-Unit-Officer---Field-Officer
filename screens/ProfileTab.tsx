import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
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
} from 'lucide-react-native';

import { User } from '../lib/auth';

interface ProfileTabProps {
  user: User;
  onSignOut: () => void;
}

export default function ProfileTab({ user, onSignOut }: ProfileTabProps) {
  // @ts-ignore
  const { name: userName, email: userEmail, ward = 'Varanasi Zone', role = 'UnitOfficer' } = user;
  const [notifications, setNotifications] = useState(true);

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
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <StatusBar style="auto" />

      <LinearGradient
        colors={['#1E40AF', '#1D4ED8', '#2563EB']}
        className="px-5 pb-8 pt-4"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <View className="mt-4 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full border-[3px] border-white bg-white/20">
            <Text className="text-[28px] font-bold text-white">
              {userName
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </Text>
          </View>
          <Text className="mb-2 text-2xl font-bold text-white">{userName}</Text>
          <View className="flex-row items-center gap-1.5 rounded-2xl bg-white/20 mb-4 px-5 py-2">
            <Shield color="#FFFFFF" size={14} />
            <Text className="text-[13px] font-bold text-white capitalize">{role.split("_").join(" ")}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5 pb-8"
        showsVerticalScrollIndicator={false}>
        {/* Account Information Section */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">
            Account Information
          </Text>

          <View className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            {/* Full Name */}
            <View className="flex-row items-center gap-4">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <UserIcon color="#1D4ED8" size={20} className="dark:text-blue-400" />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Full Name
                </Text>
                <Text className="text-[15px] font-semibold text-gray-900 dark:text-white">
                  {userName}
                </Text>
              </View>
            </View>

            <View className="my-4 h-px bg-gray-100 dark:bg-gray-700" />

            {/* Email Address */}
            <View className="flex-row items-center gap-4">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <Mail color="#1D4ED8" size={20} />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Email Address
                </Text>
                <Text className="text-[15px] font-semibold text-gray-900 dark:text-white">
                  {userEmail}
                </Text>
              </View>
            </View>

            <View className="my-4 h-px bg-gray-100 dark:bg-gray-700" />

            {/* Role */}
            <View className="flex-row items-center gap-4">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <Shield color="#1D4ED8" size={20} />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Role
                </Text>
                <Text className="text-[15px] font-semibold text-gray-900 dark:text-white capitalize">
                  {role.split("_").join(" ")}
                </Text>
              </View>
            </View>

            <View className="my-4 h-px bg-gray-100 dark:bg-gray-700" />

            {/* Assigned Ward */}
            <View className="flex-row items-center gap-4">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <MapPin color="#1D4ED8" size={20} />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Assigned Ward
                </Text>
                <Text className="text-[15px] font-semibold text-gray-900 dark:text-white">
                  {ward}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">
            Preferences
          </Text>

          <View className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            {/* Push Notifications */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-4">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700">
                  <Bell color="#6B7280" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="mb-0.5 text-[15px] font-semibold text-gray-900 dark:text-white">
                    Push Notifications
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    Receive alerts for new issues
                  </Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={notifications ? '#1D4ED8' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>

        {/* About Section */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">About</Text>

          <TouchableOpacity
            className="flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 active:opacity-70 dark:border-gray-700 dark:bg-gray-800"
            activeOpacity={0.7}
            onPress={() => Alert.alert('App Version', 'CityCare v1.0.0\n\nBuild: 2026.02.28')}>
            <View className="flex-row items-center gap-4">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700">
                <Info color="#6B7280" size={20} />
              </View>
              <Text className="text-[15px] font-semibold text-gray-900 dark:text-white">
                App Version
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">v1.0.0</Text>
              <ChevronRight color="#9CA3AF" size={20} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSignOut}
          className="mb-6 mt-3 flex-row items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-4 dark:border-red-800 dark:bg-red-900/20">
          <View className="mr-3 rounded-xl bg-red-100 p-2 dark:bg-red-900/50">
            <LogOut size={18} color="#EF4444" />
          </View>

          <Text className="text-base font-semibold text-red-600 dark:text-red-400">Sign Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text className="text-center text-xs leading-[18px] text-gray-400 dark:text-gray-500">
          CityCare Civic Issue Management System {'\n'}© 2026 All rights reserved
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
