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
  Platform,
  ActivityIndicator,
  Image,
  Modal,
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
  Camera,
  Image as ImageIcon,
  X,
  Trash2,
} from 'lucide-react-native';
import { removeToken } from 'lib/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import * as ImagePicker from 'expo-image-picker';

interface FieldProfileTabProps {
  profile: OfficerProfile;
  onLogout: () => void;
}

interface OfficerProfile {
  name: string;
  ward: string;
  phone: string;
  rating: number;
  email: string;
  total_resolved: number;
  profilePictureUrl?: string | null;
  userId: string;
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

const DEPARTMENT_LABELS: Record<string, string> = {
  road: "Road & Infrastructure",
  electricity: "Electricity & Lighting",
  water: "Water Supply",
  sanitation: "Sanitation & Waste",
  drainage: "Drainage & Sewer",
  solid_waste: "Solid Waste Management",
  public_health: "Public Health",
  other: "Other",
};

export default function FieldProfileTab({ profile, onLogout }: FieldProfileTabProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  
  const fieldOfficer = useQuery(api.fieldOfficers.getFieldOfficerByUserId, { 
    userId: profile.userId as Id<'users'> 
  });
  
  const generateUploadUrl = useMutation(api.issuesMedia.generateUploadUrl);
  const updateProfilePicture = useMutation(api.fieldOfficers.updateFieldOfficerProfilePicture);

  const officerName = fieldOfficer?.fullName || profile.name;
  const officerEmail = fieldOfficer?.email || profile.email;
  const officerPhone = fieldOfficer?.phone || profile.phone;
  const rawDepartment = fieldOfficer?.department || '';
  const departmentLabel = rawDepartment ? (DEPARTMENT_LABELS[rawDepartment] || rawDepartment) : 'N/A';
  const city = fieldOfficer?.city || 'N/A';
  const district = fieldOfficer?.district || 'N/A';
  const state = fieldOfficer?.state || 'N/A';
  const specialisations = fieldOfficer?.specialisations || [];
  
  const rating = fieldOfficer?.rating ?? profile.rating;
  const efficiencyScore = fieldOfficer?.efficiencyScore ?? 92;
  const activeIssues = fieldOfficer?.currentActiveIssues ?? 3;
  const maxCapacity = fieldOfficer?.maxIssueCapacity ?? 15;
  const totalResolved = fieldOfficer?.totalResolvedIssues ?? profile.total_resolved;
  const avgResolutionHrs = fieldOfficer?.avgResolutionTime ?? 18;
  const onTimeRate = fieldOfficer?.onTimeCompletionRate ?? 96;
  const lastLogin = fieldOfficer?.lastLogin;

  const initials = officerName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
        userId: profile.userId as Id<'users'>,
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
        userId: profile.userId as Id<'users'>,
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
    // @ts-ignore
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar translucent backgroundColor="transparent" style="light" />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Platform.OS === 'android' ? insets.top : 0,
          },
        ]}>
        {/* ── Hero Banner ── */}
        <LinearGradient
          colors={
            isDark
              ? ['#022C22', '#083344', '#020617'] // dark mode (deep teal → navy → black)
              : ['#0D9488', '#0891B2', '#075985'] // light mode
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.heroBanner,
            {
              paddingTop: 36,
            },
          ]}>
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
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => setShowImagePicker(true)}
              disabled={isUploading}
              style={{ flex: 1, width: '100%', height: '100%' }}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ['#1E293B', '#020617'] // dark glass effect
                    : ['#FFFFFF', '#E0F2FE']
                }
                style={[styles.avatarInner, { overflow: 'hidden' }]}>
                {isUploading ? (
                  <ActivityIndicator color={isDark ? '#38BDF8' : '#0EA5A4'} />
                ) : fieldOfficer?.profilePictureUrl ? (
                  <Image 
                    source={{ uri: fieldOfficer.profilePictureUrl }} 
                    style={{ width: '100%', height: '100%' }} 
                    resizeMode="cover" 
                  />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
                
                {/* Camera Icon Overlay */}
                {!isUploading && (
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    paddingVertical: 4,
                    alignItems: 'center'
                  }}>
                    <Camera size={12} color="#FFF" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text className="mb-1 mt-4 text-[26px] font-black tracking-tight text-white text-center px-4">
            {officerName}
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
                fill={s <= Math.round(rating) ? '#FCD34D' : 'transparent'}
                strokeWidth={2}
              />
            ))}
            <Text className="ml-1 text-[14px] font-extrabold text-amber-200">
              {rating.toFixed(1)}
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
            value={String(totalResolved)}
            label="Total Resolved"
            color={isDark ? '#2DD4BF' : '#0EA5A4'}
            bgColor={isDark ? '#042F2E' : '#F0FDFA'}
          />

          <StatCard
            icon={<Activity size={18} color={isDark ? '#FBBF24' : '#F59E0B'} strokeWidth={2.5} />}
            value={`${activeIssues}/${maxCapacity}`}
            label="Active Issues"
            color={isDark ? '#FBBF24' : '#F59E0B'}
            bgColor={isDark ? '#451A03' : '#FEF3C7'}
          />

          <StatCard
            icon={<TrendingUp size={18} color={isDark ? '#34D399' : '#10B981'} strokeWidth={2.5} />}
            value={`${efficiencyScore}%`}
            label="Efficiency"
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
                  {onTimeRate}%
                </Text>
              </View>
              <Text className="mt-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                On-Time{'\n'}Rate
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

            {/* Capacity */}
            <View
              className="flex-1 items-center rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-900/20"
              style={styles.metricBox}>
              <View style={styles.ringWrap}>
                <View style={[styles.ringOuter, { borderColor: '#10B981' + '30' }]} />
                <View style={[styles.ringFilled, { borderColor: '#10B981' }]} />
                <Text className="absolute text-[16px] font-black text-emerald-600 dark:text-emerald-400">
                  {maxCapacity}
                </Text>
              </View>
              <Text className="mt-3 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Max{'\n'}Capacity
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

        {/* ── Officer Details ── */}
        <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <View className="mb-4 flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
              <User size={16} color="#0EA5A4" strokeWidth={2.5} />
            </View>
            <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Officer Details
            </Text>
          </View>

          <InfoRow
            icon={<Activity size={17} color="#0EA5A4" strokeWidth={2.5} />}
            label="Department"
            value={departmentLabel}
          />
          <InfoRow
            icon={<MapPin size={17} color="#0EA5A4" strokeWidth={2.5} />}
            label="City"
            value={city}
          />
          <InfoRow
            icon={<MapPin size={17} color="#0EA5A4" strokeWidth={2.5} />}
            label="District & State"
            value={`${district}, ${state}`}
          />
          <InfoRow
            icon={<Phone size={17} color="#0EA5A4" strokeWidth={2.5} />}
            label="Phone"
            value={officerPhone}
          />
          <InfoRow
            icon={<Mail size={17} color="#0EA5A4" strokeWidth={2.5} />}
            label="Email"
            value={officerEmail}
          />
          {lastLogin && (
            <InfoRow
              icon={<Clock size={17} color="#0EA5A4" strokeWidth={2.5} />}
              label="Last Login"
              value={new Date(lastLogin).toLocaleDateString()}
            />
          )}
        </View>

        {/* ── Specialisations ── */}
        <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <View className="mb-4 flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/30">
              <Star size={16} color="#A855F7" strokeWidth={2.5} />
            </View>
            <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Specialisations
            </Text>
          </View>
          
          <View className="flex-row flex-wrap gap-2.5">
            {specialisations.length > 0 ? (
              specialisations.map((spec, index) => (
                <View 
                  key={index} 
                  className="rounded-full bg-purple-50 px-4 py-2 border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800/50">
                  <Text className="text-[13px] font-bold text-purple-700 dark:text-purple-300">
                    {spec}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-[13px] font-medium italic text-slate-500 dark:text-slate-400">
                No specialisations assigned
              </Text>
            )}
          </View>
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

            {fieldOfficer?.profilePictureUrl && (
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  heroBanner: {
    borderRadius: 28,
    paddingTop: 36, // keep this
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
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
