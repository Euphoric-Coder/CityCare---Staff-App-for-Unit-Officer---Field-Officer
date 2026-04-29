import React, { useState } from 'react';
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
import Animated, { ZoomIn, LinearTransition } from 'react-native-reanimated';
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
  description: string;
}[] = [
  {
    value: 'Duplicate',
    Icon: Copy,
    color: '#F59E0B',
    bgLight: '#FEF3C7',
    bgDark: '#451A03',
    description: 'Already reported',
  },
  {
    value: 'Spam / Fake',
    Icon: Ban,
    color: '#EF4444',
    bgLight: '#FEE2E2',
    bgDark: '#450A0A',
    description: 'Fraudulent report',
  },
  {
    value: 'Outside Jurisdiction',
    Icon: MapPin,
    color: '#0EA5E9',
    bgLight: '#E0F2FE',
    bgDark: '#0C4A6E',
    description: 'Not our area',
  },
  {
    value: 'Insufficient Evidence',
    Icon: FileX,
    color: '#8B5CF6',
    bgLight: '#EDE9FE',
    bgDark: '#2E1065',
    description: 'Lacks documentation',
  },
  {
    value: 'Invalid Location',
    Icon: ShieldX,
    color: '#F97316',
    bgLight: '#FFEDD5',
    bgDark: '#431407',
    description: 'Unverifiable location',
  },
  {
    value: 'Other',
    Icon: HelpCircle,
    color: '#64748B',
    bgLight: '#F1F5F9',
    bgDark: '#1E293B',
    description: 'See comment below',
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RejectionModal({ visible, issue, onClose, onReject }: RejectionModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedReason, setSelectedReason] = useState<RejectionReason | ''>('');
  const [comment, setComment] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationError, setValidationError] = useState('');

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

  const handleConfirmReject = () => {
    if (selectedReason) {
      setShowConfirmation(false);

      // Let modal close first, then triggers the parent
      setTimeout(() => {
        onReject(selectedReason, comment);
      }, 200);

      setSelectedReason('');
      setComment('');
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setSelectedReason('');
    setComment('');
    setValidationError('');
    onClose();
  };

  const selectedMeta = REJECTION_REASONS.find((r) => r.value === selectedReason);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
          {/* Drag handle */}
          <View
            className="mb-1 mt-3 h-1 w-10 self-center rounded-full"
            style={{ backgroundColor: isDark ? '#334155' : '#E2E8F0' }}
          />

          {/* Header */}
          <View
            className="flex-row items-center px-5 py-4"
            style={[styles.headerBorder, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <View
              className="h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }}>
              <XCircle color="#EF4444" size={20} strokeWidth={2.5} />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[18px] font-extrabold text-slate-800 dark:text-slate-100">
                Reject Issue
              </Text>
              <Text className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">
                Citizen will be notified with your reason
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCancel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}>
              <X color={isDark ? '#94A3B8' : '#64748B'} size={17} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled">
            {/* Warning banner */}
            <View
              style={{
                marginBottom: 20,
                shadowColor: '#EF4444',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.15,
                shadowRadius: 12,
                elevation: 4,
              }}>
              <LinearGradient
                colors={isDark ? ['#450A0A', '#2B0606'] : ['#FEF2F2', '#FEE2E2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: isDark ? '#7F1D1D88' : '#FECACA',
                  overflow: 'hidden',
                }}>
                <View className="flex-row items-center p-4">
                  <View
                    className="mr-3.5 h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
                    style={{ backgroundColor: isDark ? '#7F1D1D66' : '#FECACA66' }}>
                    <AlertTriangle color="#EF4444" size={20} strokeWidth={2.5} />
                  </View>
                  <View className="flex-1 justify-center" style={{ flexShrink: 1 }}>
                    <Text
                      className="text-[14px] font-extrabold tracking-tight"
                      style={{ color: isDark ? '#FCA5A5' : '#991B1B', marginBottom: 2 }}
                      numberOfLines={1}>
                      Irreversible Action
                    </Text>
                    <Text
                      className="text-[12.5px] font-medium leading-5"
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
            </View>

            {/* Issue Preview Card */}
            <View
              style={[
                { marginBottom: 20, borderRadius: 32, borderWidth: 1, overflow: 'hidden' },
                { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
              ]}>
              <BlurView
                intensity={isDark ? 40 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
                    : ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)']
                }
                style={StyleSheet.absoluteFill}
              />

              <View className="p-5">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    ISSUE {issue.issueCode ? `• ${issue.issueCode}` : ''}
                  </Text>
                  {issue.category && (
                    <View className="overflow-hidden rounded-lg">
                      <LinearGradient
                        colors={
                          isDark
                            ? ['rgba(51,65,85,0.8)', 'rgba(30,41,59,0.8)']
                            : ['#F1F5F9', '#E2E8F0']
                        }
                        style={StyleSheet.absoluteFill}
                      />
                      <View className="px-2.5 py-1">
                        <Text
                          className="text-[10px] font-bold uppercase tracking-wider"
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
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      }}>
                      <MapPin size={11} color={isDark ? '#CBD5E1' : '#64748B'} strokeWidth={2.5} />
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
                        <Clock size={12} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.5} />
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
            </View>

            {/* Reason selection */}
            <View className="mb-5">
              <View className="mb-3 flex-row items-center justify-between">
                <Text
                  className="text-[14px] font-bold"
                  style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                  Rejection Reason <Text className="text-red-500">*</Text>
                </Text>
                {selectedReason && (
                  <Animated.View
                    entering={ZoomIn.duration(200)}
                    className="flex-row items-center gap-1 rounded-full px-2 py-1"
                    style={{ backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }}>
                    <CheckCircle2 color="#EF4444" size={11} strokeWidth={2.5} />
                    <Text className="text-[11px] font-bold text-red-500">Selected</Text>
                  </Animated.View>
                )}
              </View>

              <View className="flex-row flex-wrap justify-between gap-y-3">
                {REJECTION_REASONS.map((item) => {
                  const active = selectedReason === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => {
                        setSelectedReason(item.value);
                        setValidationError('');
                      }}
                      style={{ width: '48%' }}>
                      {({ pressed }) => (
                        <Animated.View
                          layout={LinearTransition.springify().damping(18)}
                          style={[
                            styles.reasonCard,
                            {
                              width: '100%',
                              backgroundColor: active
                                ? isDark
                                  ? item.bgDark
                                  : item.bgLight
                                : isDark
                                  ? 'rgba(30,41,59,0.5)'
                                  : '#FFFFFF',
                              borderColor: active
                                ? item.color
                                : isDark
                                  ? 'rgba(255,255,255,0.1)'
                                  : '#E2E8F0',
                              transform: [{ scale: pressed ? 0.96 : 1 }],
                            },
                            active
                              ? {
                                  shadowColor: item.color,
                                  shadowOffset: { width: 0, height: 6 },
                                  shadowOpacity: 0.25,
                                  shadowRadius: 10,
                                  elevation: 6,
                                }
                              : {
                                  shadowColor: isDark ? '#000000' : '#64748B',
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: isDark ? 0.3 : 0.08,
                                  shadowRadius: 6,
                                  elevation: 2,
                                },
                          ]}>
                          {/* Inner Gradient Glow on Active */}
                          {active && (
                            <LinearGradient
                              colors={[`${item.color}22`, 'transparent']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFill}
                            />
                          )}

                          <View
                            className="mb-3 h-10 w-10 items-center justify-center rounded-[14px]"
                            style={{
                              backgroundColor: active
                                ? `${item.color}25`
                                : isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : '#F1F5F9',
                            }}>
                            <item.Icon
                              color={active ? item.color : isDark ? '#94A3B8' : '#64748B'}
                              size={18}
                              strokeWidth={2.5}
                            />
                          </View>
                          <Text
                            className="mb-1 text-[13.5px] font-extrabold tracking-tight"
                            style={{
                              color: active
                                ? isDark
                                  ? '#FFFFFF'
                                  : item.color
                                : isDark
                                  ? '#E2E8F0'
                                  : '#334155',
                            }}>
                            {item.value}
                          </Text>
                          <Text
                            className="text-[11.5px] font-medium leading-[16px]"
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
                              entering={ZoomIn.duration(200)}
                              style={[styles.activeDot, { backgroundColor: item.color }]}
                            />
                          )}
                        </Animated.View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Comment Section */}
            <View
              className={`mb-2 overflow-hidden rounded-[24px] border bg-white shadow-sm dark:bg-slate-900 ${
                comment && wordCount < 10
                  ? 'border-red-300 dark:border-red-900/60'
                  : 'border-slate-200 dark:border-slate-800'
              }`}>
              <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3.5 dark:border-slate-800/80 dark:bg-slate-800/40">
                <View className="flex-row items-center gap-2.5">
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
                    <Notebook color={isDark ? '#F87171' : '#EF4444'} size={15} strokeWidth={2.5} />
                  </View>
                  <Text className="text-[14px] font-black tracking-tight text-slate-800 dark:text-slate-100">
                    Comment <Text className="text-red-500">*</Text>
                  </Text>
                </View>

                <View
                  className={`rounded-lg px-2.5 py-1.5 ${
                    wordCount >= 10
                      ? 'bg-emerald-100 dark:bg-emerald-900/40'
                      : 'bg-red-100 dark:bg-red-900/40'
                  }`}>
                  <Text
                    className={`text-[10px] font-black ${
                      wordCount >= 10
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}>
                    {wordCount} WORDS {wordCount < 10 && '(MIN 10)'}
                  </Text>
                </View>
              </View>

              <View className="px-1 py-1">
                <TextInput
                  className="min-h-[110px] bg-transparent px-4 py-3"
                  placeholder="Explain the reason so the citizen understands..."
                  value={comment}
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
                    color: isDark ? '#F1F5F9' : '#1F2937',
                    fontWeight: '500',
                  }}
                />
              </View>
            </View>

            {/* Inline validation error */}
            {!!validationError && (
              <View
                className="mt-2 flex-row items-center gap-2 rounded-xl p-3"
                style={{ backgroundColor: isDark ? '#1C0A0A' : '#FEF2F2' }}>
                <AlertTriangle color="#EF4444" size={14} strokeWidth={2.5} />
                <Text className="flex-1 text-[13px] font-semibold text-red-500">
                  {validationError}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View
            className="flex-row gap-3 px-5 pb-8 pt-3.5"
            style={[styles.footerBorder, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.8}
              className="flex-1 items-center justify-center rounded-2xl py-4"
              style={[
                styles.outlineBorder,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}>
              <Text
                className="text-[15px] font-bold"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleReject}
              disabled={!canSubmit}
              activeOpacity={canSubmit ? 0.85 : 1}
              className="flex-row items-center justify-center gap-2 rounded-2xl py-4"
              style={[
                styles.rejectBtnFlex,
                styles.outlineBorder,
                {
                  backgroundColor: canSubmit ? '#DC2626' : isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: canSubmit ? '#DC2626' : isDark ? '#334155' : '#E2E8F0',
                },
              ]}>
              <XCircle
                color={canSubmit ? '#FFFFFF' : isDark ? '#475569' : '#CBD5E1'}
                size={16}
                strokeWidth={2.5}
              />
              <Text
                className="text-[15px] font-extrabold"
                style={{ color: canSubmit ? '#FFFFFF' : isDark ? '#475569' : '#CBD5E1' }}>
                Reject Issue
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirmation dialog - rendered outside KeyboardAvoidingView so it's not affected */}
        <Modal
          visible={showConfirmation}
          animationType="fade"
          transparent
          onRequestClose={() => setShowConfirmation(false)}>
          <View style={styles.confirmOverlay}>
            <View
              className="w-full items-center rounded-3xl p-7"
              style={[styles.confirmCard, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
              <View
                className="mb-5 h-[72px] w-[72px] items-center justify-center rounded-3xl"
                style={{ backgroundColor: isDark ? '#1C0A0A' : '#FEE2E2' }}>
                <AlertTriangle color="#EF4444" size={36} strokeWidth={2} />
              </View>

              <Text
                className="mb-2.5 text-center text-[20px] font-extrabold"
                style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                Confirm Rejection
              </Text>
              <Text
                className="mb-4 text-center text-[14px] leading-5"
                style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                This will permanently reject the issue. The citizen will be notified with your
                reason.
              </Text>

              {selectedMeta && (
                <View
                  className="mb-6 flex-row items-center gap-1.5 rounded-full px-3.5 py-2"
                  style={[
                    styles.outlineBorder,
                    {
                      backgroundColor: isDark ? selectedMeta.bgDark : selectedMeta.bgLight,
                      borderColor: selectedMeta.color + '55',
                    },
                  ]}>
                  <selectedMeta.Icon color={selectedMeta.color} size={14} strokeWidth={2} />
                  <Text className="text-[13px] font-bold" style={{ color: selectedMeta.color }}>
                    {selectedMeta.value}
                  </Text>
                </View>
              )}

              <View className="w-full flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowConfirmation(false)}
                  activeOpacity={0.8}
                  className="flex-1 items-center justify-center rounded-2xl py-3.5"
                  style={[
                    styles.outlineBorder,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}>
                  <Text
                    className="text-[15px] font-bold"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Go Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirmReject}
                  activeOpacity={0.85}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5">
                  <XCircle color="#FFFFFF" size={16} strokeWidth={2.5} />
                  <Text className="text-[15px] font-extrabold text-white">Yes, Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  headerBorder: {
    borderBottomWidth: 1,
  },
  warningBorder: {
    borderLeftWidth: 4,
  },
  chipBorder: {
    borderWidth: 1.5,
  },
  outlineBorder: {
    borderWidth: 1.5,
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
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    minHeight: 110,
    fontWeight: '500',
    lineHeight: 20,
  },
  rejectBtnFlex: {
    flex: 1.6,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    maxWidth: 380,
  },
});
