import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  SlideInDown,
  SlideInUp,
  SlideOutDown,
  SlideOutUp,
  ZoomIn,
} from 'react-native-reanimated';
import {
  X,
  UserCheck,
  Star,
  Briefcase,
  TrendingUp,
  CircleCheck as CheckCircle2,
  CircleAlert,
  ChartBar as BarChart2,
  RefreshCw,
} from 'lucide-react-native';
import { FieldOfficer } from '../lib/types';

interface AssignOfficerModalProps {
  visible: boolean;
  onClose: () => void;
  officers: FieldOfficer[];
  onAssign: (officerId: string) => void;
  mode?: 'assign' | 'reassign';
  currentOfficerName?: string;
  currentOfficerId?: string;
}

type SortOption = 'rating' | 'workload' | 'success';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function WorkloadBar({ active, max, isDark }: { active: number; max: number; isDark: boolean }) {
  const pct = (active / max) * 100;
  const color = pct >= 85 ? '#EF4444' : pct >= 55 ? '#F59E0B' : '#10B981';
  const trackColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  return (
    <View className="mt-3">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Workload
        </Text>
        <Text className="text-[12px] font-extrabold" style={{ color }}>
          {pct.toFixed(0)}%
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: trackColor }}>
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 99,
          }}
        />
      </View>
    </View>
  );
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function AssignOfficerModal({
  visible,
  onClose,
  officers,
  onAssign,
  mode = 'assign',
  currentOfficerName,
  currentOfficerId,
}: AssignOfficerModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [showConfirm, setShowConfirm] = useState(false);

  const sorted = [...officers].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'workload') return a.workloadPercentage - b.workloadPercentage;
    return b.efficiencyScore - a.efficiencyScore;
  });

  const selectedOfficer = officers.find((o) => o._id === selectedId);

  const handleConfirm = () => {
    if (!selectedId) return;
    if (currentOfficerId === selectedId) {
      Alert.alert('Already Assigned', `This issue is already assigned to ${currentOfficerName}`);
      setSelectedId(null);
      setShowConfirm(false);
      return;
    }
    onAssign(selectedId);
    setSelectedId(null);
    setShowConfirm(false);
  };

  const handleClose = () => {
    setSelectedId(null);
    setShowConfirm(false);
    onClose();
  };

  const SORT_TABS: { key: SortOption; label: string }[] = [
    { key: 'rating', label: 'Rating' },
    { key: 'workload', label: 'Workload' },
    { key: 'success', label: 'Success' },
  ];

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <BlurView
          intensity={isDark ? 30 : 15}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFillObject}
          experimentalBlurMethod="dimezisBlurView"
        />

        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          entering={SlideInDown.springify().damping(100).stiffness(200)}
          style={styles.sheetContainer}>
          <BlurView
            intensity={isDark ? 80 : 100}
            tint={isDark ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderWidth: 1,
              },
            ]}>
            {/* Inline confirm overlay */}
            {showConfirm && (
              <Animated.View entering={FadeInUp.springify()} style={styles.inlineConfirmOverlay}>
                <BlurView
                  intensity={60}
                  tint={isDark ? 'dark' : 'light'}
                  experimentalBlurMethod="dimezisBlurView"
                  style={StyleSheet.absoluteFillObject}
                />
                <TouchableOpacity
                  style={StyleSheet.absoluteFillObject}
                  activeOpacity={1}
                  onPress={() => setShowConfirm(false)}
                />
                <Animated.View
                  entering={ZoomIn.springify().damping(80)}
                  style={[
                    styles.confirmCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(30, 41, 59, 0.95)'
                        : 'rgba(255, 255, 255, 0.95)',
                      borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                      borderWidth: 1,
                    },
                  ]}>
                  <LinearGradient
                    colors={
                      mode === 'reassign'
                        ? isDark
                          ? ['rgba(217, 119, 6, 0.2)', 'rgba(0,0,0,0)']
                          : ['rgba(253, 230, 138, 0.5)', 'rgba(255,255,255,0)']
                        : isDark
                          ? ['rgba(15, 118, 110, 0.2)', 'rgba(0,0,0,0)']
                          : ['rgba(153, 246, 228, 0.5)', 'rgba(255,255,255,0)']
                    }
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />

                  <View className="items-center p-6">
                    <View
                      className="mb-4 h-16 w-16 items-center justify-center rounded-3xl"
                      style={{
                        backgroundColor:
                          mode === 'reassign'
                            ? isDark
                              ? 'rgba(69, 26, 3, 0.8)'
                              : '#FEF3C7'
                            : isDark
                              ? 'rgba(15, 61, 61, 0.8)'
                              : '#CCFBF1',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      }}>
                      {mode === 'reassign' ? (
                        <RefreshCw color="#D97706" size={30} strokeWidth={2.5} />
                      ) : (
                        <UserCheck color="#0F766E" size={30} strokeWidth={2.5} />
                      )}
                    </View>

                    <Text className="mb-2 text-center text-[22px] font-extrabold text-slate-800 dark:text-slate-100">
                      {mode === 'reassign' ? 'Confirm Reassignment' : 'Confirm Assignment'}
                    </Text>

                    {selectedOfficer && (
                      <>
                        <View className="mb-3 mt-2 flex-row items-center gap-3 rounded-2xl border border-slate-200/50 bg-slate-50/50 p-2.5 dark:border-slate-700/50 dark:bg-slate-800/50">
                          {selectedOfficer.avatar ? (
                            <Image
                              source={{ uri: selectedOfficer.avatar }}
                              style={styles.confirmAvatar}
                            />
                          ) : (
                            <View
                              className="h-10 w-10 items-center justify-center rounded-full"
                              style={{ backgroundColor: isDark ? '#134E4A' : '#CCFBF1' }}>
                              <Text className="text-[14px] font-extrabold text-teal-600 dark:text-teal-300">
                                {getInitials(selectedOfficer.fullName)}
                              </Text>
                            </View>
                          )}
                          <Text className="pr-2 text-[17px] font-extrabold text-slate-800 dark:text-slate-100">
                            {selectedOfficer.fullName}
                          </Text>
                        </View>

                        <View className="mb-4 flex-row items-center gap-4">
                          <View className="flex-row items-center gap-1.5">
                            <Star color="#F59E0B" size={14} fill="#F59E0B" strokeWidth={2} />
                            <Text className="text-[14px] font-bold text-amber-500">
                              {selectedOfficer.rating.toFixed(1)}
                            </Text>
                          </View>
                          <View className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600" />
                          <View className="flex-row items-center gap-1.5">
                            <TrendingUp color="#10B981" size={14} strokeWidth={2.5} />
                            <Text className="text-[14px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {selectedOfficer.efficiencyScore}%
                            </Text>
                          </View>
                          <View className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600" />
                          <View className="flex-row items-center gap-1.5">
                            <Briefcase
                              color={isDark ? '#94A3B8' : '#64748B'}
                              size={13}
                              strokeWidth={2}
                            />
                            <Text className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                              {selectedOfficer.currentActiveIssues} active
                            </Text>
                          </View>
                        </View>
                      </>
                    )}

                    <Text className="mb-6 text-center text-[14px] leading-5 text-slate-500 dark:text-slate-400">
                      {mode === 'reassign'
                        ? 'The issue will be reassigned to this officer and the timeline will be updated.'
                        : 'The issue will be assigned to this officer and they will be notified.'}
                    </Text>

                    <View className="w-full flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => setShowConfirm(false)}
                        activeOpacity={0.8}
                        className="flex-1 items-center justify-center rounded-2xl py-4"
                        style={{
                          backgroundColor: isDark
                            ? 'rgba(30, 41, 59, 0.8)'
                            : 'rgba(241, 245, 249, 0.8)',
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        }}>
                        <Text className="text-[16px] font-bold text-slate-600 dark:text-slate-300">
                          Go Back
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleConfirm}
                        activeOpacity={0.85}
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-4"
                        style={{ backgroundColor: mode === 'reassign' ? '#D97706' : '#0F766E' }}>
                        {mode === 'reassign' ? (
                          <RefreshCw color="#FFFFFF" size={16} strokeWidth={2.5} />
                        ) : (
                          <UserCheck color="#FFFFFF" size={16} strokeWidth={2.5} />
                        )}
                        <Text className="text-[16px] font-extrabold text-white">
                          {mode === 'reassign' ? 'Reassign' : 'Assign'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              </Animated.View>
            )}

            {/* Drag handle */}
            <View
              className="mb-2 mt-3 h-1.5 w-12 self-center rounded-full opacity-50"
              style={{ backgroundColor: isDark ? '#475569' : '#CBD5E1' }}
            />

            {/* Header */}
            <View
              className="flex-row items-center px-6 py-4"
              style={[
                styles.borderBottom,
                { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
              ]}>
              <View
                className="mr-4 h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor:
                    mode === 'reassign'
                      ? isDark
                        ? 'rgba(69, 26, 3, 0.5)'
                        : '#FEF3C7'
                      : isDark
                        ? 'rgba(15, 61, 61, 0.5)'
                        : '#CCFBF1',
                  borderWidth: 1,
                  borderColor:
                    mode === 'reassign'
                      ? isDark
                        ? 'rgba(217, 119, 6, 0.2)'
                        : '#FDE68A'
                      : isDark
                        ? 'rgba(45, 212, 191, 0.2)'
                        : '#99F6E4',
                }}>
                {mode === 'reassign' ? (
                  <RefreshCw color={isDark ? '#F59E0B' : '#D97706'} size={22} strokeWidth={2.5} />
                ) : (
                  <UserCheck color={isDark ? '#2DD4BF' : '#0F766E'} size={22} strokeWidth={2.5} />
                )}
              </View>

              <View className="flex-1">
                <Text className="text-[20px] font-extrabold text-slate-800 dark:text-slate-100">
                  {mode === 'reassign' ? 'Reassign Officer' : 'Assign Officer'}
                </Text>
                {mode === 'reassign' && currentOfficerName ? (
                  <Text className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    Currently:{' '}
                    <Text className="font-bold text-slate-700 dark:text-slate-300">
                      {currentOfficerName}
                    </Text>
                  </Text>
                ) : (
                  <Text className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    {officers.length} highly qualified officers found
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)',
                }}>
                <X color={isDark ? '#94A3B8' : '#64748B'} size={18} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Sort bar */}
            <View
              className="flex-row items-center px-6 py-3"
              style={[
                styles.borderBottom,
                { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
              ]}>
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <BarChart2 color={isDark ? '#94A3B8' : '#64748B'} size={14} strokeWidth={2.5} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}>
                {SORT_TABS.map((tab) => {
                  const active = sortBy === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => setSortBy(tab.key)}
                      activeOpacity={0.75}
                      className="rounded-full px-4 py-2"
                      style={{
                        backgroundColor: active
                          ? isDark
                            ? 'rgba(15, 118, 110, 0.2)'
                            : '#CCFBF1'
                          : isDark
                            ? 'rgba(30, 41, 59, 0.5)'
                            : '#F8FAFC',
                        borderWidth: 1,
                        borderColor: active
                          ? isDark
                            ? '#0F766E'
                            : '#5EEAD4'
                          : isDark
                            ? 'rgba(255,255,255,0.05)'
                            : '#E2E8F0',
                      }}>
                      <Text
                        className="text-[13px] font-bold"
                        style={{
                          color: active
                            ? isDark
                              ? '#2DD4BF'
                              : '#0F766E'
                            : isDark
                              ? '#94A3B8'
                              : '#64748B',
                        }}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Officer list */}
            <Animated.ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 14 }}
              keyboardShouldPersistTaps="handled">
              {sorted.map((officer, index) => {
                const isSelected = selectedId === officer._id;
                const isAssigned = officer._id === currentOfficerId;
                const isOverloaded = officer.workloadPercentage >= 100;

                return (
                  <AnimatedTouchableOpacity
                    entering={FadeInUp.delay(index * 60)
                      .springify()
                      .damping(80)}
                    layout={Layout.springify()}
                    key={officer._id}
                    onPress={() => !isOverloaded && !isAssigned && setSelectedId(officer._id)}
                    activeOpacity={isOverloaded || isAssigned ? 1 : 0.75}
                    style={[
                      styles.card,
                      {
                        opacity: isOverloaded ? 0.5 : 1,
                      },
                    ]}>
                    {/* Background Gradient for states */}
                    {isSelected ? (
                      <LinearGradient
                        colors={
                          isDark
                            ? ['rgba(15, 118, 110, 0.3)', 'rgba(13, 51, 48, 0.1)']
                            : ['#F0FDFA', '#FFFFFF']
                        }
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        borderRadius={22}
                      />
                    ) : isAssigned ? (
                      <LinearGradient
                        colors={
                          isDark
                            ? ['rgba(30, 58, 138, 0.2)', 'rgba(15, 23, 42, 0)']
                            : ['#EFF6FF', '#FFFFFF']
                        }
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        borderRadius={22}
                      />
                    ) : (
                      <View
                        style={[
                          StyleSheet.absoluteFillObject,
                          {
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF',
                            borderRadius: 22,
                          },
                        ]}
                      />
                    )}

                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        {
                          borderRadius: 22,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isAssigned
                            ? isDark
                              ? '#3B82F6'
                              : '#60A5FA'
                            : isSelected
                              ? isDark
                                ? '#14B8A6'
                                : '#0D9488'
                              : isDark
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(0,0,0,0.05)',
                        },
                      ]}
                    />

                    <View className="p-4">
                      {/* Top row: avatar + name + select indicator */}
                      <View className="flex-row items-start gap-3.5">
                        {/* Avatar */}
                        <View style={styles.avatarWrap}>
                          {officer.avatar ? (
                            <Image source={{ uri: officer.avatar }} style={styles.avatarImg} />
                          ) : (
                            <View
                              className="h-full w-full items-center justify-center"
                              style={{ backgroundColor: isDark ? '#134E4A' : '#CCFBF1' }}>
                              <Text className="text-[17px] font-extrabold text-teal-600 dark:text-teal-300">
                                {getInitials(officer.fullName)}
                              </Text>
                            </View>
                          )}
                          {/* Recommended dot */}
                          {officer.recommended && (
                            <View style={styles.recommendedBadge}>
                              <Star color="#FFFFFF" size={8} fill="#FFFFFF" />
                            </View>
                          )}
                        </View>

                        {/* Name + rating + overloaded */}
                        <View className="mt-0.5 flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text
                              className="mr-2 flex-1 text-[16px] font-extrabold text-slate-800 dark:text-slate-100"
                              numberOfLines={1}>
                              {officer.fullName}
                            </Text>
                            {isAssigned ? (
                              <View
                                className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
                                style={{
                                  backgroundColor: isDark ? 'rgba(8, 51, 68, 0.8)' : '#CFFAFE',
                                }}>
                                <UserCheck color="#06B6D4" size={11} strokeWidth={2.5} />
                                <Text className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                                  Assigned
                                </Text>
                              </View>
                            ) : isOverloaded ? (
                              <View
                                className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
                                style={{
                                  backgroundColor: isDark ? 'rgba(69, 10, 10, 0.8)' : '#FEE2E2',
                                }}>
                                <CircleAlert color="#EF4444" size={11} strokeWidth={2.5} />
                                <Text className="text-[11px] font-bold text-red-600 dark:text-red-400">
                                  Full Capacity
                                </Text>
                              </View>
                            ) : isSelected ? (
                              <Animated.View entering={ZoomIn.springify()}>
                                <CheckCircle2
                                  color={isDark ? '#2DD4BF' : '#0F766E'}
                                  size={24}
                                  strokeWidth={2.5}
                                  fill={
                                    isDark ? 'rgba(45, 212, 191, 0.2)' : 'rgba(15, 118, 110, 0.1)'
                                  }
                                />
                              </Animated.View>
                            ) : (
                              <View className="h-6 w-6 rounded-full border-[1.5px] border-slate-300 dark:border-slate-600" />
                            )}
                          </View>

                          {/* Rating row */}
                          <View className="mt-2 flex-row items-center gap-3">
                            <View className="flex-row items-center gap-1">
                              <Star color="#F59E0B" size={13} fill="#F59E0B" strokeWidth={2} />
                              <Text className="text-[13px] font-bold text-amber-500">
                                {officer.rating.toFixed(1)}
                              </Text>
                            </View>
                            <View className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700" />
                            <View className="flex-row items-center gap-1">
                              <TrendingUp
                                color={isDark ? '#10B981' : '#059669'}
                                size={13}
                                strokeWidth={2.5}
                              />
                              <Text className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                                {officer.efficiencyScore}%
                              </Text>
                            </View>
                            <View className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700" />
                            <View className="flex-row items-center gap-1.5">
                              <Briefcase
                                color={isDark ? '#94A3B8' : '#64748B'}
                                size={12}
                                strokeWidth={2}
                              />
                              <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                                {officer.currentActiveIssues} active
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Specialisations */}
                      {officer.specialisations && officer.specialisations.length > 0 && (
                        <View className="mt-3.5 flex-row flex-wrap gap-2">
                          {officer.specialisations.map((spec, i) => (
                            <View
                              key={i}
                              className="rounded-lg px-2.5 py-1.5"
                              style={{
                                backgroundColor: isDark ? 'rgba(12, 42, 63, 0.5)' : '#EFF6FF',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(30, 58, 95, 0.5)' : '#DBEAFE',
                              }}>
                              <Text className="text-[11px] font-bold tracking-wide text-blue-600 dark:text-blue-400">
                                {spec}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Workload bar */}
                      <WorkloadBar
                        active={officer.currentActiveIssues}
                        max={officer.maxIssueCapacity}
                        isDark={isDark}
                      />
                    </View>
                  </AnimatedTouchableOpacity>
                );
              })}
            </Animated.ScrollView>

            {/* Footer */}
            <View
              className="flex-row gap-4 px-6 pb-10 pt-4"
              style={[
                styles.borderTop,
                { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
              ]}>
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.8}
                className="flex-1 items-center justify-center rounded-2xl py-4"
                style={{
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                }}>
                <Text
                  className="text-[16px] font-bold"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => selectedId && setShowConfirm(true)}
                disabled={!selectedId}
                activeOpacity={selectedId ? 0.85 : 1}
                className="flex-row items-center justify-center gap-2 overflow-hidden rounded-2xl py-4"
                style={[
                  styles.assignFlex,
                  {
                    backgroundColor: selectedId
                      ? mode === 'reassign'
                        ? '#D97706'
                        : '#0F766E'
                      : isDark
                        ? 'rgba(30, 41, 59, 0.4)'
                        : '#F1F5F9',
                    borderWidth: selectedId ? 0 : 1.5,
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0',
                    elevation: selectedId ? 8 : 0,
                    shadowColor: mode === 'reassign' ? '#D97706' : '#0F766E',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: selectedId ? 0.3 : 0,
                    shadowRadius: 8,
                  },
                ]}>
                {selectedId && (
                  <LinearGradient
                    colors={
                      mode === 'reassign'
                        ? ['rgba(255,255,255,0.15)', 'rgba(0,0,0,0)']
                        : ['rgba(255,255,255,0.15)', 'rgba(0,0,0,0)']
                    }
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                )}

                {mode === 'reassign' ? (
                  <RefreshCw
                    color={selectedId ? '#FFFFFF' : isDark ? '#475569' : '#CBD5E1'}
                    size={18}
                    strokeWidth={2.5}
                  />
                ) : (
                  <UserCheck
                    color={selectedId ? '#FFFFFF' : isDark ? '#475569' : '#CBD5E1'}
                    size={18}
                    strokeWidth={2.5}
                  />
                )}
                <Text
                  className="text-[16px] font-extrabold"
                  style={{ color: selectedId ? '#FFFFFF' : isDark ? '#475569' : '#CBD5E1' }}>
                  {mode === 'reassign' ? 'Reassign' : 'Assign Officer'}
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '92%',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  sheet: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: 'hidden',
    height: '100%',
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  borderTop: {
    borderTopWidth: 1,
  },
  card: {
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignFlex: {
    flex: 1.5,
  },
  inlineConfirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  confirmCard: {
    maxWidth: 380,
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  confirmAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
