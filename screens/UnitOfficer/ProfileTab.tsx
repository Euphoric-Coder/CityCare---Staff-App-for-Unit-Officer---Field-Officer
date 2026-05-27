import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  useColorScheme,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
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
  Star,
  Award,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Briefcase,
  Map,
  Camera,
  Image as ImageIcon,
  X,
  Trash2,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { User } from '../lib/auth';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

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
  const normalizedRole = role.toLowerCase();
  if (
    normalizedRole === 'unit_officer' ||
    normalizedRole === 'unitofficer' ||
    normalizedRole === 'admin'
  ) {
    return {
      bg: isDark ? '#164E6380' : '#CFFAFE',
      text: isDark ? '#22D3EE' : '#0891B2',
      border: isDark ? '#0891B240' : '#A5F3FC',
    };
  }
  return {
    bg: isDark ? '#08334480' : '#E0F2FE',
    text: isDark ? '#38BDF8' : '#0284C7',
    border: isDark ? '#0284C740' : '#BAE6FD',
  };
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
  iconBg?: string;
}

function InfoRow({ icon, label, value, last, iconBg }: InfoRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <>
      <View className="flex-row items-center gap-3.5 py-4">
        <View
          style={{ backgroundColor: iconBg || (isDark ? '#1E293B' : '#F1F5F9') }}
          className="h-10 w-10 items-center justify-center rounded-xl shadow-sm">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="mb-0.5 text-[10px] font-bold uppercase tracking-[1px] text-slate-400 dark:text-slate-500">
            {label}
          </Text>
          <Text
            className="text-[15px] font-bold text-slate-900 dark:text-slate-100"
            numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
      {!last && <View className="ml-[52px] h-[0.5px] bg-slate-100 dark:bg-slate-700/50" />}
    </>
  );
}

export default function ProfileTab({
  user,
  onSignOut,
  // unitOfficer,
}: ProfileTabProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  
  const generateUploadUrl = useMutation(api.issuesMedia.generateUploadUrl);
  const updateProfilePicture = useMutation(api.unitOfficers.updateUnitOfficerProfilePicture);

  const unitOfficer = useQuery(
    api.unitOfficers.getUnitOfficerByUserId,
    // @ts-ignore
    user.role === 'unit_officer' ? { userId: user.id } : 'skip'
  );

  // @ts-ignore
  const userName = unitOfficer?.fullName || user.name || 'Officer';
  const userEmail = unitOfficer?.email || user.email;
  const role = user.role;

  const department = unitOfficer?.department || 'Road & Infrastructure';
  const city = unitOfficer?.city || 'Varanasi';
  const district = unitOfficer?.district || 'Varanasi District';
  const state = unitOfficer?.state || 'Uttar Pradesh';

  const rating = unitOfficer?.rating || 4.8;
  const efficiency = unitOfficer?.efficiencyScore || 94;

  const totalVerified = unitOfficer?.totalVerifiedIssues || 128;
  const totalRejected = unitOfficer?.totalRejectedIssues || 12;
  const totalIssues = totalVerified + totalRejected + 15; // Mocking some pending

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
  
  const handleImageCaptured = async (uri: string) => {
    try {
      setShowImagePicker(false);
      setIsUploading(true);
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const postUrl = await generateUploadUrl();
      const resultUpload = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
      
      if (!resultUpload.ok) {
        throw new Error('Failed to upload image');
      }
      
      const { storageId } = await resultUpload.json();
      
      await updateProfilePicture({
        userId: user.id as Id<'users'>,
        profilePicture: storageId,
      });
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setShowImagePicker(false);
      setIsUploading(true);
      await updateProfilePicture({
        userId: user.id as Id<'users'>,
      });
      Alert.alert('Success', 'Profile picture removed successfully!');
    } catch (error) {
      console.error('Error removing profile picture:', error);
      Alert.alert('Error', 'Failed to remove profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select photos');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        await handleImageCaptured(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const handleOpenCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await handleImageCaptured(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
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
          colors={isDark ? ['#164E63', '#083344', '#0E7490'] : ['#0891B2', '#06B6D4', '#22D3EE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}>
          {/* Decorative elements */}
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />

          {/* Avatar Area */}
          <View className="items-center px-5 pb-8 pt-10">
            <View style={styles.avatarRing}>
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => setShowImagePicker(true)}
                disabled={isUploading}
                style={{ flex: 1, width: '100%', height: '100%' }}
              >
                <LinearGradient
                  colors={['#22D3EE', '#06B6D4', '#0891B2']}
                  style={[styles.avatarGradient, { overflow: 'hidden' }]}>
                  {isUploading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : unitOfficer?.profilePictureUrl ? (
                    <Image 
                      source={{ uri: unitOfficer.profilePictureUrl }} 
                      style={{ width: '100%', height: '100%' }} 
                      resizeMode="cover" 
                    />
                  ) : (
                    <Text style={styles.avatarText}>{getInitials(userName)}</Text>
                  )}
                  
                  {/* Camera Icon Overlay */}
                  {!isUploading && (
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      width: '100%',
                      backgroundColor: 'rgba(0,0,0,0.4)',
                      paddingVertical: 4,
                      alignItems: 'center'
                    }}>
                      <Camera size={12} color="#FFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <View
                className="absolute bottom-0 right-0 h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-cyan-400 shadow-sm"
                style={{ borderColor: isDark ? '#083344' : '#FFFFFF' }}>
                <View className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />
              </View>
            </View>

            <View className="mt-5 items-center">
              <Text className="text-[26px] font-black tracking-tight text-white">{userName}</Text>
              <View className="mt-1.5 flex-row items-center gap-2 opacity-90">
                <Mail color="#A5F3FC" size={12} />
                <Text className="text-[14px] font-bold text-cyan-50 dark:text-cyan-100/80">
                  {userEmail}
                </Text>
              </View>
            </View>

            {/* Role badge */}
            <View
              className="mt-6 flex-row items-center gap-1.5 rounded-full border px-4 py-2 shadow-lg"
              style={{
                backgroundColor: roleBadge.bg,
                borderColor: roleBadge.border,
              }}>
              <BadgeCheck color={roleBadge.text} size={14} strokeWidth={2.5} />
              <Text className="text-[11px] font-black uppercase tracking-wider" style={{ color: roleBadge.text }}>
                {role.replace('_', ' ')}
              </Text>
            </View>

            {/* Top Stats Cards */}
            <View className="mt-8 w-full flex-row gap-3">
              {[
                {
                  label: 'Issues',
                  value: totalIssues,
                  icon: <TrendingUp size={12} color="#fff" />,
                },
                {
                  label: 'Rating',
                  value: rating,
                  icon: <Star size={12} color="#fff" fill="#fff" />,
                },
                {
                  label: 'Efficiency',
                  value: `${efficiency}%`,
                  icon: <Award size={12} color="#fff" />,
                },
              ].map((stat, idx) => (
                <View
                  key={idx}
                  className="flex-1 items-center rounded-[24px] border py-4 shadow-sm"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.2)',
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.3)',
                  }}>
                  <View className="mb-2 flex-row items-center gap-1.5">
                    {stat.icon}
                    <Text className="text-[19px] font-black text-white">{stat.value}</Text>
                  </View>
                  <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-cyan-50/80 dark:text-cyan-200/60">
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        <View className="mt-8 flex-1 px-5 pt-2">
          {/* Professional Details Card */}
          <View className="mb-7">
            <View className="mb-3 ml-1 flex-row items-center gap-2">
              <Briefcase color={isDark ? '#22D3EE' : '#0891B2'} size={14} />
              <Text className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 dark:text-cyan-500/50">
                Work Identity
              </Text>
            </View>
            <View className="overflow-hidden rounded-[32px] border border-slate-200 bg-white px-5 shadow-sm dark:border-cyan-900/30 dark:bg-slate-900/80">
              <InfoRow
                icon={<Building2 color={isDark ? '#22D3EE' : '#0891B2'} size={18} />}
                label="Department"
                value={department}
                iconBg={isDark ? '#164E6340' : '#CFFAFE'}
              />
              <InfoRow
                icon={<Map color={isDark ? '#22D3EE' : '#0891B2'} size={18} />}
                label="District & State"
                value={`${district}, ${state}`}
                iconBg={isDark ? '#164E6340' : '#CFFAFE'}
              />
              <InfoRow
                icon={<MapPin color={isDark ? '#22D3EE' : '#0891B2'} size={18} />}
                label="Assigned City"
                value={city}
                last
                iconBg={isDark ? '#164E6340' : '#CFFAFE'}
              />
            </View>
          </View>

          {/* Performance Metrics Card */}
          <View className="mb-7">
            <View className="mb-3 ml-1 flex-row items-center gap-2">
              <TrendingUp color={isDark ? '#22D3EE' : '#0891B2'} size={14} />
              <Text className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 dark:text-cyan-500/50">
                Performance Analytics
              </Text>
            </View>
            <View className="overflow-hidden rounded-[32px] border border-slate-200 bg-white px-5 shadow-sm dark:border-cyan-900/30 dark:bg-slate-900/80">
              <InfoRow
                icon={<CheckCircle2 color={isDark ? '#22D3EE' : '#0891B2'} size={18} />}
                label="Verified Issues"
                value={`${totalVerified} Resolved`}
                iconBg={isDark ? '#164E6340' : '#CFFAFE'}
              />
              <InfoRow
                icon={<XCircle color={isDark ? '#F87171' : '#DC2626'} size={18} />}
                label="Rejected Issues"
                value={`${totalRejected} Cases`}
                iconBg={isDark ? '#450A0A40' : '#FEF2F2'}
              />
              <InfoRow
                icon={<TrendingUp color={isDark ? '#22D3EE' : '#0891B2'} size={18} />}
                label="Success Rate"
                value={`${efficiency}% Efficiency`}
                last
                iconBg={isDark ? '#164E6340' : '#CFFAFE'}
              />
            </View>
          </View>

          {/* Account Settings Card */}
          <View className="mb-7">
            <View className="mb-3 ml-1 flex-row items-center gap-2">
              <Settings2 color={isDark ? '#22D3EE' : '#0891B2'} size={14} />
              <Text className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 dark:text-cyan-500/50">
                Account Settings
              </Text>
            </View>
            <View className="overflow-hidden rounded-[32px] border border-slate-200 bg-white px-5 shadow-sm dark:border-cyan-900/30 dark:bg-slate-900/80">
              <InfoRow
                icon={<UserIcon color={isDark ? '#22D3EE' : '#0891B2'} size={18} />}
                label="Full Name"
                value={userName}
                iconBg={isDark ? '#164E6340' : '#CFFAFE'}
              />
              <InfoRow
                icon={<Shield color={isDark ? '#22D3EE' : '#0891B2'} size={18} />}
                label="System Role"
                value={role.replace('_', ' ').toUpperCase()}
                last
                iconBg={isDark ? '#164E6340' : '#CFFAFE'}
              />
            </View>
          </View>

          {/* Preferences card */}
          {/* <View className="mb-4">
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
          </View> */}

          {/* More section */}
          <View className="mb-7">
            <View className="mb-3 ml-1 flex-row items-center gap-2">
              <Info color={isDark ? '#22D3EE' : '#0891B2'} size={14} />
              <Text className="text-[11px] font-black uppercase tracking-[2px] text-slate-400 dark:text-cyan-500/50">
                Support & Info
              </Text>
            </View>
            <View className="overflow-hidden rounded-[32px] border border-slate-200 bg-white dark:border-cyan-900/30 dark:bg-slate-900/80">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => Alert.alert('App Version', 'CityCare v1.3.0\n\nBuild: 2026.04.18')}
                className="flex-row items-center gap-3.5 px-5 py-5">
                <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-slate-100 dark:bg-cyan-900/20">
                  <Info color={isDark ? '#22D3EE' : '#0891B2'} size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-black text-slate-900 dark:text-slate-100">
                    App Information
                  </Text>
                  <Text className="mt-0.5 text-[12px] font-medium text-slate-400 dark:text-cyan-500/40">
                    Version 1.3.0 (Stable)
                  </Text>
                </View>
                <ChevronRight color={isDark ? '#22D3EE' : '#CBD5E1'} size={20} strokeWidth={2.5} />
              </TouchableOpacity>

              <View className="ml-[68px] h-[0.5px] bg-slate-100 dark:bg-cyan-800/20" />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => Alert.alert('Privacy', 'Privacy Policy coming soon.')}
                className="flex-row items-center gap-3.5 px-5 py-5">
                <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-slate-100 dark:bg-cyan-900/20">
                  <Lock color={isDark ? '#22D3EE' : '#0891B2'} size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-black text-slate-900 dark:text-slate-100">
                    Privacy Policy
                  </Text>
                  <Text className="mt-0.5 text-[12px] font-medium text-slate-400 dark:text-cyan-500/40">
                    Data handling and security
                  </Text>
                </View>
                <ChevronRight color={isDark ? '#22D3EE' : '#CBD5E1'} size={20} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out Account */}
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.7}
            className="mb-12 mt-4 overflow-hidden rounded-[32px] shadow-sm">
            <View
              style={{
                height: 68,
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderWidth: 1.5,
                borderColor: isDark ? '#ef444430' : '#fee2e2',
              }}
              className="rounded-[32px]">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-[14px] bg-red-50 dark:bg-red-900/10">
                <LogOut color="#EF4444" size={22} strokeWidth={2.5} />
              </View>
              <Text className="text-[18px] font-black text-red-600 dark:text-red-400">
                Sign Out Account
              </Text>
            </View>
          </TouchableOpacity>

          {/* Footer */}
          <View className="mb-6 items-center gap-1.5 opacity-30">
            <View className="flex-row items-center gap-2">
              <View className="h-1 w-1 rounded-full bg-cyan-400" />
              <Text className="text-[10px] font-black uppercase tracking-[4px] text-slate-500 dark:text-cyan-400">
                CityCare Mobile
              </Text>
              <View className="h-1 w-1 rounded-full bg-cyan-400" />
            </View>
            <Text className="text-center text-[10px] font-bold text-slate-400 dark:text-cyan-800">
              SECURE ACCESS · UNIT OFFICER PORTAL · © 2026
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Image Picker Modal ── */}
      <Modal
        visible={showImagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="gap-3 rounded-t-3xl bg-white px-5 pb-10 pt-6 dark:bg-slate-900">
            <View className="mb-2 flex-row items-center justify-between">
              <View>
                <Text className="text-[20px] font-extrabold text-slate-900 dark:text-slate-100">
                  Update Profile Photo
                </Text>
                <Text className="mt-0.5 text-[13px] font-medium text-slate-400 dark:text-slate-500">
                  Choose how to add your photo
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowImagePicker(false)}
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                className="items-center justify-center rounded-full p-2"
                activeOpacity={0.7}>
                <X color={isDark ? '#94A3B8' : '#64748B'} size={20} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleOpenCamera}
              activeOpacity={0.82}
              className="flex-row items-center gap-4 rounded-2xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-800/50 dark:bg-teal-900/20">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                <Camera color="#0EA5A4" size={26} strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-extrabold text-teal-900 dark:text-teal-100">
                  Take Photo
                </Text>
                <Text className="text-[12px] font-semibold text-teal-600/80 dark:text-teal-500/80">
                  Use your camera
                </Text>
              </View>
              <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenGallery}
              activeOpacity={0.82}
              className="flex-row items-center gap-4 rounded-2xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-800/50 dark:bg-teal-900/20">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                <ImageIcon color="#0EA5A4" size={26} strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-extrabold text-teal-900 dark:text-teal-100">
                  Choose from Gallery
                </Text>
                <Text className="text-[12px] font-semibold text-teal-600/80 dark:text-teal-500/80">
                  Select an existing photo
                </Text>
              </View>
              <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
            </TouchableOpacity>

            {unitOfficer?.profilePictureUrl && (
              <TouchableOpacity
                onPress={handleRemovePhoto}
                activeOpacity={0.82}
                className="flex-row items-center gap-4 rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                  <Trash2 color="#EF4444" size={26} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-extrabold text-red-600 dark:text-red-400">
                    Remove Photo
                  </Text>
                  <Text className="text-[12px] font-semibold text-red-500/80 dark:text-red-400/80">
                    Delete current profile picture
                  </Text>
                </View>
                <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroGradient: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  decoCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -100,
    right: -80,
  },
  decoCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -50,
    left: -60,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  avatarGradient: {
    flex: 1,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
