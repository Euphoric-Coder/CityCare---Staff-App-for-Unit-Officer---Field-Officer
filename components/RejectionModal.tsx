import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  LinearTransition,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import {
  XCircle,
  TriangleAlert as AlertTriangle,
  X,
  Copy,
  MapPin,
  ShieldX,
  FileX,
  Ban,
  Circle as HelpCircle,
  CircleCheck as CheckCircle2,
  Clock,
  Flag,
  Notebook,
} from 'lucide-react-native';
import { Issue, RejectionReason } from '../lib/types';

interface RejectionModalProps {
  visible: boolean;
  issue: Issue;
  onClose: () => void;
  onReject: (reason: RejectionReason, comment: string) => void;
  issueTitle?: string;
}

export const CATEGORY_LABEL_MAP: Record<string, string> = {
  road: 'Road & Infrastructure',
  electricity: 'Electricity & Lighting',
  water: 'Water Supply',
  sanitation: 'Sanitation & Waste',
  drainage: 'Drainage & Sewer',
  solid_waste: 'Solid Waste Management',
  public_health: 'Public Health',
  other: 'Other',
};

const REJECTION_REASONS: {
  value: RejectionReason;
  Icon: any;
  color: string;
  bgLight: string;
  bgDark: string;
  gradLight: readonly [string, string];
  gradDark: readonly [string, string];
  description: string;
}[] = [
  {
    value: 'Duplicate',
    Icon: Copy,
    color: '#F59E0B',
    bgLight: '#FEF3C7',
    bgDark: '#451A03',
    gradLight: ['#FEF3C7', '#FFFBEB'],
    gradDark: ['rgba(69, 26, 3, 0.8)', 'rgba(30, 41, 59, 0.4)'],
    description: 'Already reported',
  },
  {
    value: 'Spam / Fake',
    Icon: Ban,
    color: '#EF4444',
    bgLight: '#FEE2E2',
    bgDark: '#450A0A',
    gradLight: ['#FEE2E2', '#FEF2F2'],
    gradDark: ['rgba(69, 10, 10, 0.8)', 'rgba(30, 41, 59, 0.4)'],
    description: 'Fraudulent report',
  },
  {
    value: 'Outside Jurisdiction',
    Icon: MapPin,
    color: '#0EA5E9',
    bgLight: '#E0F2FE',
    bgDark: '#0C4A6E',
    gradLight: ['#E0F2FE', '#F0F9FF'],
    gradDark: ['rgba(12, 74, 110, 0.8)', 'rgba(8, 47, 73, 0.4)'],
    description: 'Not our area',
  },
  {
    value: 'Insufficient Evidence',
    Icon: FileX,
    color: '#8B5CF6',
    bgLight: '#EDE9FE',
    bgDark: '#2E1065',
    gradLight: ['#EDE9FE', '#F5F3FF'],
    gradDark: ['rgba(46, 16, 101, 0.8)', 'rgba(30, 41, 59, 0.4)'],
    description: 'Lacks documentation',
  },
  {
    value: 'Invalid Location',
    Icon: ShieldX,
    color: '#F97316',
    bgLight: '#FFEDD5',
    bgDark: '#431407',
    gradLight: ['#FFEDD5', '#FFF7ED'],
    gradDark: ['rgba(67, 20, 7, 0.8)', 'rgba(30, 41, 59, 0.4)'],
    description: 'Unverifiable location',
  },
  {
    value: 'Other',
    Icon: HelpCircle,
    color: '#64748B',
    bgLight: '#F1F5F9',
    bgDark: '#1E293B',
    gradLight: ['#F1F5F9', '#F8FAFC'],
    gradDark: ['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.4)'],
    description: 'See comment below',
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RejectionModal({ visible, issue, onClose, onReject }: RejectionModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedReason, setSelectedReason] = useState<RejectionReason | ''>('');
  const [comment, setComment] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsClosing(false);
    }
  }, [visible]);

  const wordCount = comment.trim() ? comment.trim().split(/\s+/).length : 0;
  const canSubmit = !!selectedReason && wordCount >= 10;

  const handleReject = () => {
    if (!selectedReason) {
      setValidationError('Please select a rejection reason.');
      return;
    }
    if (wordCount < 10) {
      setValidationError('Please provide at least 10 words in your comment.');
      return;
    }
    setValidationError('');
    setShowConfirmation(true);
  };

  const handleCloseAnim = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleConfirmReject = () => {
    if (selectedReason) {
      setShowConfirmation(false);

      setIsClosing(true);
      // Let modal close first, then triggers the parent
      setTimeout(() => {
        onReject(selectedReason, comment);
        setSelectedReason('');
        setComment('');
      }, 300);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setSelectedReason('');
    setComment('');
    setValidationError('');
    handleCloseAnim();
  };

  const selectedMeta = REJECTION_REASONS.find((r) => r.value === selectedReason);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleCloseAnim}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!isClosing && (
          <>
            {/* Animated backdrop to avoid jarring jumps */}
            <Animated.View entering={FadeIn.duration(400)} style={StyleSheet.absoluteFillObject}>
              <BlurView
                intensity={isDark ? 40 : 25}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFillObject}
                experimentalBlurMethod="dimezisBlurView"
              />
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={handleCancel}
              />
            </Animated.View>

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
                    backgroundColor: isDark
                      ? 'rgba(15, 23, 42, 0.75)'
                      : 'rgba(255, 255, 255, 0.85)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderWidth: 1,
                  },
                ]}>
                {/* Extremely luxurious subtle gradient sheen on the sheet itself */}
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(239, 68, 68, 0.05)', 'transparent']
                      : ['rgba(254, 226, 226, 0.5)', 'transparent']
                  }
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 0.2 }}
                  pointerEvents="none"
                  borderTopLeftRadius={36}
                  borderTopRightRadius={36}
                />

                {/* Drag handle */}
                <View
                  className="mb-2 mt-4 h-1.5 w-12 self-center rounded-full opacity-50"
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
                      backgroundColor: isDark ? 'rgba(69, 10, 10, 0.5)' : '#FEE2E2',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FECACA',
                    }}>
                    <XCircle color={isDark ? '#F87171' : '#EF4444'} size={22} strokeWidth={2.5} />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[20px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                      Reject Issue
                    </Text>
                    <Text className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                      Citizen will be notified with your reason
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleCancel}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(30, 41, 59, 0.8)'
                        : 'rgba(241, 245, 249, 0.8)',
                    }}>
                    <X color={isDark ? '#94A3B8' : '#64748B'} size={18} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
                  keyboardShouldPersistTaps="handled">
                  {/* Warning banner */}
                  <Animated.View
                    entering={FadeInDown.delay(100).springify().damping(80)}
                    style={{
                      marginBottom: 20,
                      shadowColor: '#EF4444',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.3 : 0.15,
                      shadowRadius: 12,
                      elevation: 4,
                    }}>
                    <LinearGradient
                      colors={
                        isDark
                          ? ['rgba(69, 10, 10, 0.9)', 'rgba(43, 6, 6, 0.95)']
                          : ['#FEF2F2', '#FEE2E2']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                        overflow: 'hidden',
                      }}>
                      <View className="flex-row items-center p-4">
                        <View
                          className="mr-3.5 h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
                          style={{
                            backgroundColor: isDark
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(239, 68, 68, 0.15)',
                          }}>
                          <AlertTriangle color="#EF4444" size={20} strokeWidth={2.5} />
                        </View>
                        <View className="flex-1 justify-center" style={{ flexShrink: 1 }}>
                          <Text
                            className="text-[14.5px] font-extrabold tracking-tight"
                            style={{ color: isDark ? '#FCA5A5' : '#991B1B', marginBottom: 2 }}
                            numberOfLines={1}>
                            Irreversible Action
                          </Text>
                          <Text
                            className="text-[13px] font-semibold leading-5"
                            style={{
                              color: isDark ? '#F87171' : '#B91C1C',
                              flexShrink: 1,
                              flexWrap: 'wrap',
                            }}>
                            This issue will be permanently rejected.
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </Animated.View>

                  {/* Issue Preview Card */}
                  <Animated.View
                    entering={FadeInDown.delay(150).springify().damping(80)}
                    style={[
                      { marginBottom: 24, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
                      { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                    ]}>
                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF' },
                      ]}
                    />

                    <View className="p-5">
                      <View className="mb-3 flex-row items-center justify-between">
                        <Text
                          className="text-[11px] font-black uppercase tracking-widest"
                          style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                          ISSUE {issue.issueCode ? `• ${issue.issueCode}` : ''}
                        </Text>
                        {issue.category && (
                          <View className="overflow-hidden rounded-lg">
                            <LinearGradient
                              colors={
                                isDark
                                  ? ['rgba(51,65,85,0.6)', 'rgba(30,41,59,0.6)']
                                  : ['#F1F5F9', '#E2E8F0']
                              }
                              style={StyleSheet.absoluteFill}
                            />
                            <View className="px-2.5 py-1">
                              <Text
                                className="text-[10.5px] font-extrabold uppercase tracking-wider"
                                style={{ color: isDark ? '#E2E8F0' : '#475569' }}>
                                {CATEGORY_LABEL_MAP[issue.category] || issue.category}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      <Text
                        className="text-[17px] font-black leading-6 tracking-tight"
                        style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                        numberOfLines={2}>
                        {issue.title}
                      </Text>

                      <View className="mt-4 gap-3">
                        <View className="flex-row items-center gap-2.5">
                          <View
                            className="h-6 w-6 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: isDark
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(0,0,0,0.05)',
                            }}>
                            <MapPin
                              size={11}
                              color={isDark ? '#CBD5E1' : '#64748B'}
                              strokeWidth={2.5}
                            />
                          </View>
                          <Text
                            className="flex-1 text-[13px] font-semibold"
                            style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                            {issue.address
                              ? `${issue.address}${issue.city ? `, ${issue.city}` : ''}`
                              : 'Location not specified'}
                          </Text>
                        </View>

                        <View className="flex-row items-center justify-between">
                          {issue.createdAt && (
                            <View className="flex-row items-center gap-2">
                              <Clock
                                size={12}
                                color={isDark ? '#94A3B8' : '#64748B'}
                                strokeWidth={2.5}
                              />
                              <Text
                                className="text-[12.5px] font-bold tracking-tight"
                                style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                                {new Date(issue.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </Text>
                            </View>
                          )}
                          {issue.priority && (
                            <View className="flex-row items-center gap-1.5">
                              <Flag
                                size={12}
                                color={
                                  issue.priority.toLowerCase() === 'high' ||
                                  issue.priority.toLowerCase() === 'critical'
                                    ? '#EF4444'
                                    : issue.priority.toLowerCase() === 'medium'
                                      ? '#F59E0B'
                                      : isDark
                                        ? '#94A3B8'
                                        : '#64748B'
                                }
                                strokeWidth={3}
                              />
                              <Text
                                className="text-[11.5px] font-black uppercase tracking-widest"
                                style={{
                                  color:
                                    issue.priority.toLowerCase() === 'high' ||
                                    issue.priority.toLowerCase() === 'critical'
                                      ? '#EF4444'
                                      : issue.priority.toLowerCase() === 'medium'
                                        ? '#F59E0B'
                                        : isDark
                                          ? '#94A3B8'
                                          : '#64748B',
                                }}>
                                {issue.priority}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </Animated.View>

                  {/* Reason selection */}
                  <View className="mb-6">
                    <View className="mb-3.5 flex-row items-center justify-between">
                      <Text
                        className="text-[14.5px] font-extrabold tracking-tight"
                        style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                        Rejection Reason <Text className="text-red-500">*</Text>
                      </Text>
                      {selectedReason && (
                        <Animated.View
                          entering={ZoomIn.duration(200)}
                          className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
                          style={{ backgroundColor: isDark ? 'rgba(69, 10, 10, 0.5)' : '#FEE2E2' }}>
                          <CheckCircle2 color="#EF4444" size={12} strokeWidth={2.5} />
                          <Text className="text-[11px] font-bold uppercase tracking-widest text-red-500">
                            Selected
                          </Text>
                        </Animated.View>
                      )}
                    </View>

                    <View className="flex-row flex-wrap justify-between gap-y-3">
                      {REJECTION_REASONS.map((item, index) => {
                        const active = selectedReason === item.value;
                        return (
                          <AnimatedPressable
                            entering={FadeInUp.delay(200 + index * 50)
                              .springify()
                              .damping(22)}
                            key={item.value}
                            onPress={() => {
                              setSelectedReason(item.value);
                              setValidationError('');
                            }}
                            style={{ width: '48%' }}>
                            <Animated.View
                              layout={LinearTransition.springify().damping(80)}
                              style={[
                                styles.reasonCard,
                                {
                                  width: '100%',
                                  backgroundColor: active
                                    ? isDark
                                      ? 'rgba(30, 41, 59, 0.8)'
                                      : '#FFFFFF'
                                    : isDark
                                      ? 'rgba(30, 41, 59, 0.4)'
                                      : '#FFFFFF',
                                  borderColor: active
                                    ? item.color
                                    : isDark
                                      ? 'rgba(255,255,255,0.08)'
                                      : 'rgba(0,0,0,0.05)',
                                },
                                active
                                  ? {
                                      shadowColor: item.color,
                                      shadowOffset: { width: 0, height: 4 },
                                      shadowOpacity: 0.2,
                                      shadowRadius: 8,
                                      elevation: 4,
                                    }
                                  : {
                                      shadowColor: isDark ? '#000000' : '#64748B',
                                      shadowOffset: { width: 0, height: 2 },
                                      shadowOpacity: isDark ? 0.3 : 0.05,
                                      shadowRadius: 6,
                                      elevation: 1,
                                    },
                              ]}>
                              {/* Inner Gradient Glow on Active */}
                              {active && (
                                <LinearGradient
                                  colors={isDark ? item.gradDark : item.gradLight}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={StyleSheet.absoluteFill}
                                  borderRadius={22}
                                />
                              )}

                              <View
                                className="mb-3 h-11 w-11 items-center justify-center rounded-[14px]"
                                style={{
                                  backgroundColor: active
                                    ? `${item.color}25`
                                    : isDark
                                      ? 'rgba(255,255,255,0.06)'
                                      : '#F1F5F9',
                                }}>
                                <item.Icon
                                  color={active ? item.color : isDark ? '#94A3B8' : '#64748B'}
                                  size={20}
                                  strokeWidth={2.2}
                                />
                              </View>
                              <Text
                                className="mb-1 text-[14px] font-extrabold tracking-tight"
                                style={{
                                  color: active
                                    ? isDark
                                      ? item.color
                                      : item.color
                                    : isDark
                                      ? '#E2E8F0'
                                      : '#334155',
                                }}>
                                {item.value}
                              </Text>
                              <Text
                                className="text-[12px] font-semibold leading-[16px]"
                                style={{
                                  color: active
                                    ? isDark
                                      ? 'rgba(255,255,255,0.85)'
                                      : `${item.color}AA`
                                    : isDark
                                      ? '#94A3B8'
                                      : '#64748B',
                                }}>
                                {item.description}
                              </Text>
                              {active && (
                                <Animated.View
                                  entering={ZoomIn.springify().damping(80)}
                                  style={[styles.activeDot, { backgroundColor: item.color }]}
                                />
                              )}
                            </Animated.View>
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Comment Section */}
                  <Animated.View
                    entering={FadeInUp.delay(500).springify().damping(80)}
                    className={`mb-2 overflow-hidden rounded-[24px] border-[1.5px] bg-white shadow-sm dark:bg-slate-900 ${
                      isFocused
                        ? 'border-red-400 dark:border-red-500'
                        : comment && wordCount < 10
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-slate-200 dark:border-slate-800'
                    }`}
                    style={{
                      shadowColor: isFocused ? '#EF4444' : '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isFocused ? 0.15 : 0.03,
                      shadowRadius: 10,
                      elevation: isFocused ? 4 : 1,
                    }}>
                    <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3.5 dark:border-slate-800/80 dark:bg-slate-800/40">
                      <View className="flex-row items-center gap-3">
                        <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-red-100 dark:bg-red-900/50">
                          <Notebook
                            color={isDark ? '#FCA5A5' : '#EF4444'}
                            size={16}
                            strokeWidth={2.5}
                          />
                        </View>
                        <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                          Comment <Text className="text-red-500">*</Text>
                        </Text>
                      </View>

                      <View
                        className={`rounded-[10px] px-3 py-1.5 ${
                          wordCount >= 10
                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                            : 'bg-red-100 dark:bg-red-900/40'
                        }`}>
                        <Text
                          className={`text-[11px] font-black tracking-wider ${
                            wordCount >= 10
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}>
                          {wordCount} WORDS {wordCount < 10 && '(MIN 10)'}
                        </Text>
                      </View>
                    </View>

                    <View className="relative px-1 py-1">
                      {isFocused && (
                        <LinearGradient
                          colors={
                            isDark
                              ? ['rgba(239, 68, 68, 0.04)', 'transparent']
                              : ['rgba(254, 226, 226, 0.3)', 'transparent']
                          }
                          style={StyleSheet.absoluteFillObject}
                          pointerEvents="none"
                        />
                      )}
                      <TextInput
                        className="min-h-[120px] bg-transparent px-4 py-4"
                        placeholder="Explain the reason so the citizen understands..."
                        value={comment}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onChangeText={(t) => {
                          setComment(t);
                          setValidationError('');
                        }}
                        multiline
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        style={{
                          fontSize: 15,
                          lineHeight: 24,
                          textAlignVertical: 'top',
                          color: isDark ? '#F8FAFC' : '#0F172A',
                          fontWeight: '500',
                        }}
                      />
                    </View>
                  </Animated.View>

                  {/* Inline validation error */}
                  {!!validationError && (
                    <Animated.View
                      entering={ZoomIn.springify().damping(80)}
                      className="mt-3 flex-row items-center gap-2 rounded-[16px] border border-red-200 p-3.5 dark:border-red-900/50"
                      style={{ backgroundColor: isDark ? 'rgba(69, 10, 10, 0.5)' : '#FEF2F2' }}>
                      <AlertTriangle color="#EF4444" size={16} strokeWidth={2.5} />
                      <Text className="flex-1 text-[13px] font-bold text-red-500">
                        {validationError}
                      </Text>
                    </Animated.View>
                  )}
                </ScrollView>

                {/* Footer */}
                <View
                  className="flex-row gap-3 px-6 pb-10 pt-4"
                  style={[
                    styles.footerBorder,
                    { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                  ]}>
                  <TouchableOpacity
                    onPress={handleCancel}
                    activeOpacity={0.8}
                    className="flex-1 items-center justify-center rounded-2xl border-[1.5px] border-slate-200 bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/60"
                    style={{ height: 56 }}>
                    <Text
                      className="text-[16px] font-extrabold"
                      style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleReject}
                    disabled={!canSubmit}
                    activeOpacity={canSubmit ? 0.85 : 1}
                    className="overflow-hidden rounded-2xl"
                    style={[
                      styles.rejectBtnFlex,
                      {
                        height: 56,
                        shadowColor: canSubmit ? '#EF4444' : '#000',
                        shadowOffset: { width: 0, height: canSubmit ? 6 : 2 },
                        shadowOpacity: canSubmit ? 0.3 : 0.05,
                        shadowRadius: canSubmit ? 12 : 4,
                        elevation: canSubmit ? 8 : 1,
                      },
                    ]}>
                    {canSubmit ? (
                      <LinearGradient
                        colors={['#EF4444', '#B91C1C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}>
                        <LinearGradient
                          colors={['rgba(255,255,255,0.25)', 'transparent']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <View className="flex-1 flex-row items-center justify-center gap-2">
                          <XCircle color="#FFFFFF" size={18} strokeWidth={2.5} />
                          <Text className="text-[16px] font-extrabold tracking-tight text-white shadow-sm">
                            Reject Issue
                          </Text>
                        </View>
                      </LinearGradient>
                    ) : (
                      <View className="flex-1 flex-row items-center justify-center gap-2 border-[1.5px] border-slate-200 bg-slate-100 px-5 dark:border-slate-700/50 dark:bg-slate-800">
                        <XCircle
                          color={isDark ? '#64748B' : '#94A3B8'}
                          size={18}
                          strokeWidth={2.5}
                        />
                        <Text className="text-[16px] font-extrabold tracking-tight text-slate-400 dark:text-slate-500">
                          Reject Issue
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </BlurView>
            </Animated.View>
          </>
        )}

        {/* Confirmation dialog */}
        <Modal
          visible={showConfirmation}
          animationType="fade"
          transparent
          onRequestClose={() => setShowConfirmation(false)}>
          <KeyboardAvoidingView behavior="padding" style={styles.confirmOverlay}>
            <BlurView
              intensity={isDark ? 60 : 30}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
            />
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              onPress={() => setShowConfirmation(false)}
              activeOpacity={1}
            />

            <Animated.View
              entering={ZoomIn.springify().damping(80)}
              className="w-full max-w-[380px] items-center rounded-[32px] border p-8"
              style={[
                styles.confirmCard,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                },
              ]}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(239, 68, 68, 0.1)', 'transparent']
                    : ['rgba(254, 226, 226, 0.6)', 'transparent']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                borderRadius={32}
              />

              <View
                className="mb-5 h-[76px] w-[76px] items-center justify-center rounded-[24px]"
                style={{
                  backgroundColor: isDark ? 'rgba(69, 10, 10, 0.8)' : '#FEE2E2',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                }}>
                <AlertTriangle color="#EF4444" size={36} strokeWidth={2.5} />
              </View>

              <Text
                className="mb-2 text-center text-[22px] font-extrabold tracking-tight"
                style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                Confirm Rejection
              </Text>
              <Text
                className="mb-5 text-center text-[14.5px] font-medium leading-5"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                This will permanently reject the issue. The citizen will be notified with your
                reason immediately.
              </Text>

              {selectedMeta && (
                <View
                  className="mb-8 flex-row items-center gap-2 rounded-full border-[1.5px] px-4 py-2.5"
                  style={[
                    {
                      backgroundColor: isDark ? selectedMeta.bgDark : selectedMeta.bgLight,
                      borderColor: selectedMeta.color + '55',
                    },
                  ]}>
                  <selectedMeta.Icon color={selectedMeta.color} size={15} strokeWidth={2.5} />
                  <Text
                    className="text-[13.5px] font-extrabold"
                    style={{ color: selectedMeta.color }}>
                    {selectedMeta.value}
                  </Text>
                </View>
              )}

              <View className="w-full flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowConfirmation(false)}
                  activeOpacity={0.8}
                  className="flex-1 items-center justify-center rounded-2xl border-[1.5px] border-slate-200 bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/60"
                  style={{ height: 52 }}>
                  <Text
                    className="text-[16px] font-extrabold"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Go Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirmReject}
                  activeOpacity={0.85}
                  className="flex-1 overflow-hidden rounded-2xl"
                  style={{
                    height: 52,
                    shadowColor: '#EF4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}>
                  <LinearGradient
                    colors={['#EF4444', '#B91C1C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.25)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View className="flex-1 flex-row items-center justify-center gap-2">
                      <XCircle color="#FFFFFF" size={16} strokeWidth={2.5} />
                      <Text className="text-[15px] font-extrabold tracking-tight text-white shadow-sm">
                        Yes, Reject
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>
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
    flexShrink: 1,
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
    flexShrink: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: 'hidden',
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  footerBorder: {
    borderTopWidth: 1,
  },
  reasonCard: {
    width: '48%',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
  },
  activeDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rejectBtnFlex: {
    flex: 1.6,
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
});
