import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  useColorScheme,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import {
  Calendar,
  CircleCheck as CheckCircle2,
  MapPin,
  Camera,
  Copy,
  Building2,
  Clock,
  ChevronRight,
  CheckCheck,
  TriangleAlert as AlertTriangle,
  XCircle,
  Notebook,
  Sparkles,
} from 'lucide-react-native';
import { VerificationChecklist } from 'lib/types';

interface VerificationFlowProps {
  onVerify: (checklist: VerificationChecklist, slaDate: string, notes: string) => void;
  onReject: () => void;
  duplicateFlags?: any;
  onRequestScrollToDuplicates?: () => void;
}

const CHECKLIST_ITEMS = [
  {
    key: 'locationValid' as keyof VerificationChecklist,
    label: 'Location is valid and verifiable',
    description: 'Confirm the reported location exists and is identifiable',
    Icon: MapPin,
    colorLight: '#0EA5E9',
    colorDark: '#38BDF8',
    gradLight: ['#E0F2FE', '#F0F9FF'] as const,
    gradDark: ['rgba(12, 74, 110, 0.8)', 'rgba(8, 47, 73, 0.4)'] as const,
  },
  {
    key: 'hasSufficientEvidence' as keyof VerificationChecklist,
    label: 'Evidence is sufficient',
    description: 'Photos and description clearly document the issue',
    Icon: Camera,
    colorLight: '#6366F1',
    colorDark: '#818CF8',
    gradLight: ['#EEF2FF', '#F5F3FF'] as const,
    gradDark: ['rgba(30, 27, 75, 0.8)', 'rgba(17, 24, 39, 0.4)'] as const,
  },
  {
    key: 'notDuplicate' as keyof VerificationChecklist,
    label: 'Not a duplicate issue',
    description: 'No existing open issue at this location',
    Icon: Copy,
    colorLight: '#F59E0B',
    colorDark: '#FCD34D',
    gradLight: ['#FEF3C7', '#FFFBEB'] as const,
    gradDark: ['rgba(69, 26, 3, 0.8)', 'rgba(30, 41, 59, 0.4)'] as const,
    hint: 'Search for similar issues before proceeding',
  },
  {
    key: 'isWithinJurisdiction' as keyof VerificationChecklist,
    label: 'Within municipal jurisdiction',
    description: "Location falls under this unit's area of responsibility",
    Icon: Building2,
    colorLight: '#10B981',
    colorDark: '#34D399',
    gradLight: ['#D1FAE5', '#ECFDF5'] as const,
    gradDark: ['rgba(6, 78, 59, 0.8)', 'rgba(15, 23, 42, 0.4)'] as const,
  },
];

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function AnimatedProgressBar({
  progressPct,
  canVerify,
}: {
  progressPct: number;
  canVerify: boolean;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    // Used withTiming instead of withSpring to prevent the width percentage from springing below 0% or above 100%, which causes rendering glitches
    width.value = withTiming(progressPct, { duration: 400 });
  }, [progressPct]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${Math.max(0, Math.min(100, width.value))}%`,
    };
  });

  return (
    <View className="shadow-inner h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
      <Animated.View style={[{ height: '100%', borderRadius: 99 }, animatedStyle]}>
        <LinearGradient
          colors={canVerify ? ['#10B981', '#059669'] : ['#38BDF8', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

export default function VerificationFlow({
  onVerify,
  onReject,
  duplicateFlags,
  onRequestScrollToDuplicates,
}: VerificationFlowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [showGeneralVerifyConfirm, setShowGeneralVerifyConfirm] = useState(false);
  const [pendingChecklistKey, setPendingChecklistKey] = useState<
    keyof VerificationChecklist | null
  >(null);

  const [checklist, setChecklist] = useState<VerificationChecklist>({
    locationValid: false,
    hasSufficientEvidence: false,
    notDuplicate: false,
    isWithinJurisdiction: false,
  });

  const [notes, setNotes] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  const defaultSla = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [slaDate, setSlaDate] = useState<Date>(defaultSla);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showAndroidDate, setShowAndroidDate] = useState(false);
  const [showAndroidTime, setShowAndroidTime] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(defaultSla);

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const canVerify = checkedCount === totalCount && wordCount >= 10;
  const progressPct = (checkedCount / totalCount) * 100;

  const handleVerify = () => {
    if (!canVerify) return;

    if (duplicateFlags?.groups?.length > 0) {
      setShowVerifyConfirm(true);
    } else {
      setShowGeneralVerifyConfirm(true);
    }
  };

  const openDatePicker = () => {
    Keyboard.dismiss();
    if (Platform.OS === 'ios') {
      setTempDate(slaDate);
      setShowDateModal(true);
    } else {
      setShowAndroidDate(true);
    }
  };

  return (
    <Animated.View entering={FadeInDown.springify().damping(24)} className="px-5 pb-8 pt-3">
      {/* Header */}
      <View className="mb-6 mt-2">
        <View className="flex-row items-center gap-3.5">
          <Animated.View
            entering={ZoomIn.delay(100).springify().damping(15)}
            className="h-12 w-12 items-center justify-center rounded-[18px] shadow-sm"
            style={{
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            }}>
            <CheckCheck color={isDark ? '#34D399' : '#059669'} size={24} strokeWidth={2.5} />
          </Animated.View>
          <View className="flex-1">
            <Text className="text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">
              Issue Verification
            </Text>
            <Text className="mt-0.5 text-[13.5px] font-medium text-slate-500 dark:text-slate-400">
              Confirm all criteria before final approval
            </Text>
          </View>
        </View>
      </View>

      {/* Progress */}
      <Animated.View
        entering={FadeInUp.delay(150).springify().damping(22)}
        className="mb-6 rounded-[22px] border bg-white px-5 py-4 shadow-sm dark:bg-slate-900"
        style={{
          borderColor: canVerify
            ? isDark
              ? 'rgba(52, 211, 153, 0.4)'
              : 'rgba(16, 185, 129, 0.3)'
            : isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.04)',
          shadowColor: canVerify ? '#10B981' : '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: canVerify ? 0.1 : 0.03,
          shadowRadius: 10,
          elevation: 2,
        }}>
        {canVerify && (
          <LinearGradient
            colors={
              isDark
                ? ['rgba(16, 185, 129, 0.08)', 'transparent']
                : ['rgba(209, 250, 229, 0.5)', 'transparent']
            }
            style={StyleSheet.absoluteFillObject}
          />
        )}

        <View className="mb-3.5 flex-row items-center justify-between">
          <Text className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
            Approval Checklist
          </Text>
          <View
            className={`rounded-full px-3 py-1.5 ${
              canVerify ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-100 dark:bg-slate-800'
            }`}>
            <Text
              className={`text-[12px] font-black ${
                canVerify
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
              {checkedCount}/{totalCount}
            </Text>
          </View>
        </View>

        <AnimatedProgressBar progressPct={progressPct} canVerify={canVerify} />

        {canVerify && (
          <Animated.Text
            entering={FadeIn.duration(400)}
            className="mt-3.5 text-[12px] font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            ✨ All criteria verified — ready for final approval
          </Animated.Text>
        )}
      </Animated.View>

      {/* Checklist items */}
      <View className="mb-6 gap-3">
        {CHECKLIST_ITEMS.map((item, index) => {
          const checked = checklist[item.key];
          const iconColor = checked
            ? isDark
              ? '#34D399'
              : '#10B981'
            : isDark
              ? item.colorDark
              : item.colorLight;

          return (
            <AnimatedTouchableOpacity
              entering={FadeInUp.delay(200 + index * 50)
                .springify()
                .damping(22)}
              key={item.key}
              onPress={() => {
                if (item.key === 'notDuplicate' && duplicateFlags?.groups?.length > 0 && !checked) {
                  setPendingChecklistKey(item.key);
                  setShowDuplicateWarning(true);
                } else {
                  setChecklist({ ...checklist, [item.key]: !checked });
                }
              }}
              activeOpacity={0.7}
              className={`flex-row items-center gap-3.5 rounded-[22px] border-[1.5px] p-4 shadow-sm ${
                checked
                  ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-900/20'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60'
              }`}
              style={{
                shadowColor: checked ? '#10B981' : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: checked ? 0.05 : 0.02,
                shadowRadius: 6,
                elevation: 1,
              }}>
              <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-[14px]">
                <LinearGradient
                  colors={
                    checked
                      ? isDark
                        ? ['rgba(6, 78, 59, 0.8)', 'rgba(6, 78, 59, 0.3)']
                        : ['#D1FAE5', '#ECFDF5']
                      : isDark
                        ? item.gradDark
                        : item.gradLight
                  }
                  style={StyleSheet.absoluteFillObject}
                />
                <item.Icon color={iconColor} size={20} strokeWidth={2.2} />
              </View>

              <View className="flex-1">
                <Text
                  className={`mb-1 text-[15px] font-extrabold tracking-tight ${
                    checked
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}>
                  {item.label}
                </Text>
                {!checked && item.hint ? (
                  <Text className="text-[12px] font-bold text-amber-600 dark:text-amber-400">
                    {item.hint}
                  </Text>
                ) : (
                  <Text className="text-[12.5px] font-medium leading-4 text-slate-500 dark:text-slate-400">
                    {item.description}
                  </Text>
                )}
              </View>

              <View
                className={`h-[28px] w-[28px] items-center justify-center rounded-[10px] border-[2px] ${
                  checked
                    ? 'border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400'
                    : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800'
                }`}>
                {checked && (
                  <Animated.View entering={ZoomIn.springify().damping(15)}>
                    <CheckCircle2
                      color={isDark ? '#064E3B' : '#FFFFFF'}
                      size={18}
                      strokeWidth={3}
                    />
                  </Animated.View>
                )}
              </View>
            </AnimatedTouchableOpacity>
          );
        })}
      </View>

      {/* Notes Section */}
      <Animated.View
        entering={FadeInUp.delay(400).springify().damping(22)}
        className={`mb-6 overflow-hidden rounded-[24px] border-[1.5px] bg-white shadow-sm dark:bg-slate-900 ${
          isFocused
            ? 'border-amber-400 dark:border-amber-500'
            : notes && wordCount < 10
              ? 'border-amber-300 dark:border-amber-700'
              : 'border-slate-200 dark:border-slate-800'
        }`}
        style={{
          shadowColor: isFocused ? '#F59E0B' : '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isFocused ? 0.1 : 0.03,
          shadowRadius: 10,
          elevation: isFocused ? 4 : 1,
        }}>
        <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3.5 dark:border-slate-800/80 dark:bg-slate-800/40">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-amber-100 dark:bg-amber-900/50">
              <Notebook color={isDark ? '#FCD34D' : '#D97706'} size={16} strokeWidth={2.5} />
            </View>
            <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              Field Notes
            </Text>
          </View>

          <View
            className={`rounded-[10px] px-3 py-1.5 ${
              wordCount >= 10
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : 'bg-amber-100 dark:bg-amber-900/40'
            }`}>
            <Text
              className={`text-[11px] font-black tracking-wider ${
                wordCount >= 10
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
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
                  ? ['rgba(245, 158, 11, 0.03)', 'transparent']
                  : ['rgba(253, 230, 138, 0.2)', 'transparent']
              }
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
          )}
          <TextInput
            className="min-h-[120px] bg-transparent px-4 py-4"
            placeholder="Document verification details here. Be specific about observations, environmental conditions, and severity..."
            value={notes}
            onChangeText={setNotes}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
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

      {/* SLA Deadline */}
      <Animated.View
        entering={FadeInUp.delay(500).springify().damping(22)}
        className="mb-8 rounded-[24px] border-[1.5px] border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 1,
        }}>
        <View className="mb-3.5 flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-sky-100 dark:bg-sky-900/50">
            <Clock color={isDark ? '#38BDF8' : '#0284C7'} size={16} strokeWidth={2.5} />
          </View>
          <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            SLA Resolution Deadline
          </Text>
        </View>

        <TouchableOpacity
          onPress={openDatePicker}
          activeOpacity={0.75}
          className="mb-3 flex-row items-center rounded-[16px] border-[1.5px] border-sky-400 bg-sky-50 px-4 py-3.5 dark:border-sky-700/80 dark:bg-slate-800">
          <View className="flex-1 flex-row items-center gap-3">
            <Calendar color={isDark ? '#38BDF8' : '#0284C7'} size={18} strokeWidth={2.5} />
            <View>
              <Text className="mb-0.5 text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {formatDate(slaDate)}
              </Text>
              <Text className="text-[13px] font-bold text-sky-600 dark:text-sky-400">
                {formatTime(slaDate)}
              </Text>
            </View>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-sky-200/50 dark:bg-sky-900/50">
            <ChevronRight color={isDark ? '#38BDF8' : '#0284C7'} size={16} strokeWidth={3} />
          </View>
        </TouchableOpacity>

        <Text className="px-1 text-[12px] font-medium italic text-slate-500 dark:text-slate-400">
          Determines escalation timing and priority rank for the assigned officer.
        </Text>
      </Animated.View>

      {/* Android native pickers */}
      {showAndroidDate && (
        <DateTimePicker
          value={slaDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selected) => {
            setShowAndroidDate(false);
            if (event.type === 'set' && selected) {
              const merged = new Date(selected);
              merged.setHours(slaDate.getHours(), slaDate.getMinutes());
              setSlaDate(merged);
              setShowAndroidTime(true);
            }
          }}
        />
      )}
      {showAndroidTime && (
        <DateTimePicker
          value={slaDate}
          mode="time"
          display="default"
          is24Hour={false}
          onChange={(event, selected) => {
            setShowAndroidTime(false);
            if (event.type === 'set' && selected) {
              const merged = new Date(slaDate);
              merged.setHours(selected.getHours(), selected.getMinutes());
              setSlaDate(merged);
            }
          }}
        />
      )}

      {/* iOS modal date picker */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDateModal(false)}>
          <KeyboardAvoidingView behavior="padding" style={styles.iosModalOverlay}>
            <BlurView
              intensity={isDark ? 40 : 25}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
            />
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setShowDateModal(false)}
            />
            <Animated.View
              entering={FadeInDown.springify().damping(25).stiffness(200)}
              className="rounded-t-[32px] border-t border-slate-200 bg-white pb-10 pt-3 dark:border-slate-800 dark:bg-slate-900"
              style={styles.iosSheetShadow}>
              <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-300 dark:bg-slate-700" />
              <View className="flex-row items-center justify-between border-b border-slate-100 px-6 pb-4 pt-1 dark:border-slate-800/80">
                <Text className="text-[18px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  Set SLA Deadline
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSlaDate(tempDate);
                    setShowDateModal(false);
                  }}
                  className="rounded-[12px] border border-sky-200 bg-sky-100 px-4 py-2 dark:border-sky-800 dark:bg-sky-900/60">
                  <Text className="text-[14px] font-extrabold text-sky-700 dark:text-sky-300">
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="spinner"
                minimumDate={new Date()}
                minuteInterval={15}
                onChange={(_, selected) => {
                  if (selected) setTempDate(selected);
                }}
                style={{ height: 220, marginTop: 10 }}
                textColor={isDark ? '#F1F5F9' : '#0F172A'}
              />
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Action buttons */}
      <Animated.View
        entering={FadeInUp.delay(600).springify().damping(22)}
        className="mt-2 flex-row gap-3">
        <TouchableOpacity
          onPress={onReject}
          activeOpacity={0.8}
          className="flex-row items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-red-200 bg-red-50 px-6 py-4 shadow-sm dark:border-red-800/60 dark:bg-red-950/30"
          style={{
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 1,
          }}>
          <XCircle color="#EF4444" size={18} strokeWidth={2.5} />
          <Text className="text-[15px] font-extrabold text-red-600 dark:text-red-400">Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleVerify}
          disabled={!canVerify}
          activeOpacity={canVerify ? 0.85 : 1}
          className="flex-1 overflow-hidden rounded-[20px]"
          style={{
            shadowColor: canVerify ? '#059669' : '#000',
            shadowOffset: { width: 0, height: canVerify ? 6 : 2 },
            shadowOpacity: canVerify ? 0.3 : 0.05,
            shadowRadius: canVerify ? 12 : 4,
            elevation: canVerify ? 8 : 1,
          }}>
          {canVerify ? (
            <LinearGradient
              colors={['#10B981', '#047857']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verifyBtnGradient}>
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Sparkles color="#fff" size={18} strokeWidth={2.5} />
              <Text className="text-[16px] font-extrabold tracking-tight text-white shadow-sm">
                Verify & Approve
              </Text>
            </LinearGradient>
          ) : (
            <View
              className="flex-row items-center justify-center gap-2 border-[1.5px] border-slate-200 bg-slate-100 px-5 py-4 dark:border-slate-700/50 dark:bg-slate-800"
              style={styles.verifyBtnGradient}>
              <AlertTriangle color={isDark ? '#64748B' : '#94A3B8'} size={18} strokeWidth={2.5} />
              <Text className="text-[14px] font-extrabold tracking-tight text-slate-400 dark:text-slate-500">
                Complete Checklist
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
      {/* Duplicate Warning Modal (for checkbox) */}
      <Modal
        visible={showDuplicateWarning}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowDuplicateWarning(false)}>
        <View className="flex-1 items-center justify-center bg-slate-950/60 px-5">
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setShowDuplicateWarning(false)}
          />

          <View
            style={{
              borderColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.15)',
              borderWidth: 1.5,
              shadowColor: '#F59E0B',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: isDark ? 0.4 : 0.15,
              shadowRadius: 40,
              elevation: 25,
              width: '100%',
              maxWidth: 360,
              borderRadius: 36,
              overflow: 'hidden',
              backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
            }}>
            <LinearGradient
              colors={isDark ? ['#451a03', '#0f172a'] : ['#FFFBEB', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 36, paddingHorizontal: 28, alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 22,
                  backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}>
                <AlertTriangle color={isDark ? '#FCD34D' : '#D97706'} size={32} strokeWidth={2.5} />
              </View>

              <Text
                className="mb-2 text-center text-[18px] font-black tracking-tight"
                style={{ color: isDark ? '#FCD34D' : '#B45309' }}>
                Unresolved Duplicates
              </Text>
              <Text
                className="mb-7 text-center text-[14px] font-semibold leading-[20px]"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                There are unresolved duplicates for this issue. Are you sure you want to mark it as
                not a duplicate?
              </Text>

              <View className="w-full flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowDuplicateWarning(false);
                    setPendingChecklistKey(null);
                    onRequestScrollToDuplicates?.();
                  }}
                  className="flex-1 items-center rounded-[16px] border border-slate-200 bg-slate-100 py-3.5 dark:border-slate-700 dark:bg-slate-800">
                  <Text className="text-[14px] font-bold text-slate-600 dark:text-slate-300">
                    Review
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowDuplicateWarning(false);
                    if (pendingChecklistKey) {
                      setChecklist({ ...checklist, [pendingChecklistKey]: true });
                    }
                    setPendingChecklistKey(null);
                  }}
                  className="flex-1 items-center rounded-[16px] bg-amber-500 py-3.5 shadow-sm dark:bg-amber-600">
                  <Text className="text-[14px] font-bold text-white">Confirm</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Verification Confirmation Modal (for Verify button) */}
      <Modal
        visible={showVerifyConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowVerifyConfirm(false)}>
        <View className="flex-1 items-center justify-center bg-slate-950/60 px-5">
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setShowVerifyConfirm(false)}
          />

          <View
            style={{
              borderColor: isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)',
              borderWidth: 1.5,
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: isDark ? 0.4 : 0.15,
              shadowRadius: 40,
              elevation: 25,
              width: '100%',
              maxWidth: 360,
              borderRadius: 36,
              overflow: 'hidden',
              backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
            }}>
            <LinearGradient
              colors={isDark ? ['#450a0a', '#0f172a'] : ['#FEF2F2', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 36, paddingHorizontal: 28, alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 22,
                  backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}>
                <AlertTriangle color={isDark ? '#FCA5A5' : '#DC2626'} size={32} strokeWidth={2.5} />
              </View>

              <Text
                className="mb-2 text-center text-[18px] font-black tracking-tight"
                style={{ color: isDark ? '#FCA5A5' : '#991B1B' }}>
                Verify with Duplicates
              </Text>
              <Text
                className="mb-7 text-center text-[14px] font-semibold leading-[20px]"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                You have active duplicate groups. Do you want to verify this issue anyway without
                resolving them?
              </Text>

              <View className="w-full gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowVerifyConfirm(false);
                    onRequestScrollToDuplicates?.();
                  }}
                  className="w-full items-center rounded-[16px] border border-slate-200 bg-slate-100 py-3.5 dark:border-slate-700 dark:bg-slate-800">
                  <Text className="text-[14px] font-bold text-slate-600 dark:text-slate-300">
                    Go Back and Resolve
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowVerifyConfirm(false);
                    onVerify(checklist, slaDate.toISOString(), notes);
                  }}
                  className="w-full items-center rounded-[16px] bg-red-500 py-3.5 shadow-sm dark:bg-red-600">
                  <Text className="text-[14px] font-bold text-white">Verify Anyway</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* General Verification Confirmation Modal */}
      <Modal
        visible={showGeneralVerifyConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowGeneralVerifyConfirm(false)}>
        <View className="flex-1 items-center justify-center bg-slate-950/60 px-5">
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setShowGeneralVerifyConfirm(false)}
          />

          <View
            style={{
              borderColor: isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.15)',
              borderWidth: 1.5,
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: isDark ? 0.4 : 0.15,
              shadowRadius: 40,
              elevation: 25,
              width: '100%',
              maxWidth: 360,
              borderRadius: 36,
              overflow: 'hidden',
              backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
            }}>
            <LinearGradient
              colors={isDark ? ['#064e3b', '#0f172a'] : ['#ECFDF5', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 36, paddingHorizontal: 28, alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 22,
                  backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}>
                <CheckCheck color={isDark ? '#34D399' : '#059669'} size={32} strokeWidth={2.5} />
              </View>

              <Text
                className="mb-2 text-center text-[18px] font-black tracking-tight"
                style={{ color: isDark ? '#34D399' : '#065F46' }}>
                Confirm Verification
              </Text>
              <Text
                className="mb-7 text-center text-[14px] font-semibold leading-[20px]"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Are you sure you want to verify and approve this issue? It will be assigned to a
                field officer.
              </Text>

              <View className="w-full flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowGeneralVerifyConfirm(false)}
                  className="flex-1 items-center rounded-[16px] border border-slate-200 bg-slate-100 py-3.5 dark:border-slate-700 dark:bg-slate-800">
                  <Text className="text-[14px] font-bold text-slate-600 dark:text-slate-300">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowGeneralVerifyConfirm(false);
                    onVerify(checklist, slaDate.toISOString(), notes);
                  }}
                  className="flex-1 items-center rounded-[16px] bg-emerald-500 py-3.5 shadow-sm dark:bg-emerald-600">
                  <Text className="text-[14px] font-bold text-white">Approve</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iosModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  iosSheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  verifyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
});
