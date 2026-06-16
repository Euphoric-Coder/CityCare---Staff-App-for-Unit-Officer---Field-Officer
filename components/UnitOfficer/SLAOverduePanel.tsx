import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
  Modal,
  InteractionManager,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  TriangleAlert as AlertTriangle,
  UserCheck,
  CircleX,
  CalendarClock,
  ShieldAlert,
  ChevronDown,
  Calendar,
  Clock,
  CircleCheck as CheckCircle,
  User,
  Star,
  Briefcase,
  Check,
} from 'lucide-react-native';
import {
  Issue,
  IssueUpdate,
  SLAOverdueRejectionReason,
  SLAExtensionReason,
  EscalationReason,
  ReassignmentReason,
  FieldOfficer,
  MappedIssue,
} from 'lib/types';
import { useUser } from 'context/UserContext';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

const SLA_REJECTION_REASONS: SLAOverdueRejectionReason[] = [
  'Non-feasible due to structural constraints',
  'Outside municipal jurisdiction',
  'Budget unavailable',
  'Safety risk prevents work',
  'Duplicate or merged with another issue',
  'Other',
];

const SLA_EXTENSION_REASONS: SLAExtensionReason[] = [
  'Material procurement delay',
  'Weather / natural conditions',
  'Additional survey required',
  'Pending third-party approval',
  'Resource unavailability',
  'Scope of work increased',
  'Other',
];

const REASSIGNMENT_REASONS: ReassignmentReason[] = [
  'Officer overloaded',
  'Delay observed',
  'Quality concerns',
  'Officer request',
  'Citizen complaint',
  'Other',
];

type Tab = 'reassign' | 'reject' | 'extend' | 'escalate';

interface SLAOverduePanelProps {
  issue: MappedIssue;
  fieldOfficers: any;
  onReassign: (
    issueId: Id<'issues'>,
    fieldOfficerId: Id<'fieldOfficers'>,
    assignedBy: Id<'users'>,
    issueTitle: string,
    issueCode: string,
    isReassign: boolean,
    previousFieldOfficerName: string,
    reassignmentReason: string,
    reassignmentComment: string,
    newSLADeadline: number
  ) => void;
  onReject: (
    issueId: Id<'issues'>,
    issueCode: string,
    reason: string,
    comment: string,
    UOName: string,
    status: string,
    rejectedBy: Id<'users'>,
    issueName: string,
    reporterId: Id<'users'>
  ) => void;
  onExtend: (
    issueId: string,
    issueCode: string,
    issueName: string,

    extendedBy: Id<'users'>,
    extendedByName: string,

    reporterId: Id<'users'>,

    assignedFieldOfficerUserId: Id<'users'>,

    assignedFieldOfficerName: string,

    reason: string,
    comment: string,
    newSlaDeadline: number
  ) => void;
  onEscalate?: (reason: string) => void;
}

function daysSinceOverdue(slaDeadline: string): number {
  const now = new Date();
  const deadline = new Date(slaDeadline);
  return Math.max(0, Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTimeDisplay(date: Date): string {
  return date.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface RadioGroupProps<T extends string> {
  options: T[];
  selected: T | null;
  onSelect: (v: T) => void;
  accentColor: string;
}

function RadioGroup<T extends string>({
  options,
  selected,
  onSelect,
  accentColor,
}: RadioGroupProps<T>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="gap-3.5">
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            activeOpacity={0.85}
            className={`relative flex-row items-center justify-between overflow-hidden rounded-[20px] border-[2px] px-5 py-[18px] ${
              isSelected ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/60 dark:bg-slate-800/30'
            }`}
            style={{
              borderColor: isSelected ? accentColor : isDark ? '#334155' : '#E2E8F0',
            }}>
            {/* Soft background gradient wash when selected */}
            {isSelected && (
              <LinearGradient
                colors={[`${accentColor}15`, `${accentColor}02`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}

            <Text
              className="flex-1 pr-4 text-[16px] font-black tracking-tight"
              style={{ color: isSelected ? accentColor : isDark ? '#94A3B8' : '#64748B' }}>
              {opt}
            </Text>

            {isSelected ? (
              <View
                style={{
                  shadowColor: accentColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.45,
                  shadowRadius: 8,
                  elevation: 5,
                  borderRadius: 9999,
                }}>
                <CheckCircle color="#FFFFFF" fill={accentColor} size={26} strokeWidth={2} />
              </View>
            ) : (
              <View className="h-[26px] w-[26px] rounded-full border-[2.5px] border-slate-300/80 bg-white/50 dark:border-slate-600/80 dark:bg-slate-800/50" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function DatePickerField({
  label,
  value,
  onChange,
  accentColor,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  accentColor: string;
}) {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<'date' | 'time' | 'datetime'>(
    Platform.OS === 'ios' ? 'datetime' : 'date'
  );
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const onChangePicker = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selectedDate) {
        onChange(selectedDate);
        if (mode === 'date') {
          // Chain into time picker for Android
          setTimeout(() => {
            setMode('time');
            setShow(true);
          }, 50);
        } else {
          setMode('date'); // Reset
        }
      } else {
        setMode('date');
      }
    } else {
      if (selectedDate) onChange(selectedDate);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          setMode(Platform.OS === 'ios' ? 'datetime' : 'date');
          setShow(true);
        }}
        activeOpacity={0.85}
        className={`relative flex-row items-center gap-4 overflow-hidden rounded-[20px] border-[2px] px-5 py-[18px] ${
          value ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/60 dark:bg-slate-800/30'
        }`}
        style={{ borderColor: value ? accentColor : isDark ? '#334155' : '#E2E8F0' }}>
        {/* Soft background gradient wash when selected */}
        {value && (
          <LinearGradient
            colors={[`${accentColor}15`, `${accentColor}02`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {value ? (
          <View
            className="h-12 w-12"
            style={{
              shadowColor: accentColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.45,
              shadowRadius: 8,
              elevation: 5,
            }}>
            <View className="flex-1 items-center justify-center overflow-hidden rounded-full">
              <LinearGradient
                colors={[accentColor, `${accentColor}B3`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <CalendarClock color="#FFFFFF" size={22} strokeWidth={2} />
            </View>
          </View>
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full border-[2.5px] border-slate-300/80 bg-white/50 dark:border-slate-600/80 dark:bg-slate-800/50">
            <CalendarClock color={isDark ? '#94A3B8' : '#64748B'} size={22} strokeWidth={2} />
          </View>
        )}

        <View className="flex-1 justify-center pr-1">
          <Text
            className={`mb-0.5 text-[11px] font-black uppercase tracking-widest ${
              value ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
            }`}>
            {label}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            className="text-[15px] font-black tracking-tight"
            style={{ color: value ? accentColor : isDark ? '#64748B' : '#94A3B8' }}>
            {value ? formatDateTimeDisplay(value) : 'Select date & time'}
          </Text>
        </View>
        <ChevronDown
          color={value ? accentColor : isDark ? '#475569' : '#94A3B8'}
          size={20}
          strokeWidth={2.5}
        />
      </TouchableOpacity>
      {show && Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="slide"
          visible={show}
          onRequestClose={() => setShow(false)}>
          <View className="flex-1 justify-end bg-black/40">
            <TouchableOpacity
              activeOpacity={1}
              className="absolute inset-0"
              onPress={() => setShow(false)}
            />
            <View className="rounded-t-[32px] bg-white pb-8 shadow-2xl dark:bg-slate-900">
              <View className="flex-row items-center justify-between border-b-[1.5px] border-slate-100 px-6 py-3.5 dark:border-slate-800/80">
                <Text className="text-[17px] font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Select Date & Time
                </Text>
                <TouchableOpacity
                  onPress={() => setShow(false)}
                  activeOpacity={0.8}
                  style={{
                    shadowColor: accentColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 4,
                  }}>
                  <View className="flex-row items-center justify-center overflow-hidden rounded-full px-5 py-2.5">
                    <LinearGradient
                      colors={[accentColor, `${accentColor}CC`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Clock color="#FFFFFF" size={16} strokeWidth={2.5} />
                    <View className="w-1.5" />
                    <Text className="mb-0.5 text-[14px] font-black tracking-tight text-white">
                      Confirm
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View className="px-4 py-4">
                <DateTimePicker
                  value={value ?? new Date()}
                  mode={mode}
                  display="spinner"
                  minimumDate={new Date()}
                  minuteInterval={15}
                  onChange={onChangePicker}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={value ?? new Date()}
          mode={mode}
          display="default"
          minimumDate={new Date()}
          onChange={onChangePicker}
        />
      )}
    </View>
  );
}

function OfficerPickerCard({
  officers,
  selected,
  onSelect,
  currentOfficerId,
  accentColor = '#2563EB',
}: {
  officers: FieldOfficer[];
  selected: FieldOfficer | null;
  onSelect: (o: FieldOfficer) => void;
  currentOfficerId?: string;
  accentColor?: string;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const available = officers.filter((o) => o._id !== currentOfficerId);

  return (
    <View className="gap-3.5">
      {available.map((officer) => {
        const isSelected = selected?._id === officer._id;
        return (
          <TouchableOpacity
            key={officer._id}
            onPress={() => onSelect(officer)}
            activeOpacity={0.85}
            className={`relative flex-row items-center gap-4 overflow-hidden rounded-[20px] border-[2px] p-[14px] ${
              isSelected ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/60 dark:bg-slate-800/30'
            }`}
            style={{ borderColor: isSelected ? accentColor : isDark ? '#334155' : '#E2E8F0' }}>
            {isSelected && (
              <LinearGradient
                colors={[`${accentColor}15`, `${accentColor}02`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}

            <View
              className="h-[50px] w-[50px] items-center justify-center rounded-full"
              style={{
                backgroundColor: isSelected ? `${accentColor}1A` : isDark ? '#334155' : '#E2E8F0',
              }}>
              <User
                color={isSelected ? accentColor : isDark ? '#94A3B8' : '#64748B'}
                size={24}
                strokeWidth={2}
              />
            </View>

            <View className="flex-1 pr-2">
              <Text
                className="mb-1 text-[16px] font-black tracking-tight"
                style={{ color: isSelected ? accentColor : isDark ? '#F8FAFC' : '#0F172A' }}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {officer.fullName}
              </Text>

              <View className="mb-2.5 flex-row flex-wrap items-center gap-1.5">
                <View className="flex-row items-center gap-1 rounded border border-amber-200/50 bg-amber-50 px-1 py-0.5 pl-1 dark:border-amber-700/30 dark:bg-amber-900/20">
                  <Star color="#F59E0B" size={9} strokeWidth={2.5} fill="#F59E0B" />
                  <Text className="text-[9px] font-bold text-amber-600 dark:text-amber-500">
                    {officer.rating.toFixed(1)}
                  </Text>
                </View>
                <View className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <Text className="text-[10px] font-bold tracking-tight text-slate-500 dark:text-slate-400">
                  {officer.currentActiveIssues} tasks
                </Text>
                <View className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <View className="flex-row items-center gap-1 rounded border border-emerald-200/50 bg-emerald-50 px-1 py-0.5 pl-1 dark:border-emerald-700/30 dark:bg-emerald-900/20">
                  <CheckCircle color="#10B981" size={9} strokeWidth={2.5} />
                  <Text className="text-[9px] font-bold text-emerald-700 dark:text-emerald-500">
                    {officer.onTimeCompletionRate}% on-time
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-1.5">
                {officer.specialisations?.map((s) => (
                  <View
                    key={s}
                    className="rounded-md border px-2 py-0.5"
                    style={{
                      borderColor: isSelected ? `${accentColor}30` : isDark ? '#334155' : '#E2E8F0',
                      backgroundColor: isSelected
                        ? `${accentColor}0A`
                        : isDark
                          ? '#1E293B'
                          : '#F8FAFC',
                    }}>
                    <Text
                      className="text-[10px] font-bold tracking-tight"
                      style={{ color: isSelected ? accentColor : isDark ? '#94A3B8' : '#64748B' }}>
                      {s}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {isSelected ? (
              <View
                style={{
                  shadowColor: accentColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.45,
                  shadowRadius: 8,
                  elevation: 5,
                  borderRadius: 9999,
                }}>
                <CheckCircle color="#FFFFFF" fill={accentColor} size={26} strokeWidth={2} />
              </View>
            ) : (
              <View className="h-[26px] w-[26px] rounded-full border-[2.5px] border-slate-300/80 bg-white/50 dark:border-slate-600/80 dark:bg-slate-800/50" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function NoteInput({
  value,
  onChange,
  placeholder,
  accentColor,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
  accentColor: string;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const isEnoughWords = wordCount >= 10;
  const showWarning = value.length > 0 && !isEnoughWords;

  const currentStatusColor = isFocused
    ? accentColor
    : value.length > 0
      ? isEnoughWords
        ? '#10B981'
        : '#F59E0B'
      : 'transparent';

  return (
    <View className="gap-3">
      {/* Outer wrapper to protect the glowing drop shadow from overflow-hidden */}
      <View
        style={{
          shadowColor:
            currentStatusColor !== 'transparent' ? currentStatusColor : isDark ? '#000' : '#fff',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isFocused ? 0.25 : 0,
          shadowRadius: 16,
          elevation: isFocused ? 8 : 0,
          borderRadius: 20,
        }}>
        <View
          className={`relative overflow-hidden rounded-[20px] border-[2px] px-5 py-4 ${
            isFocused || value.length > 0
              ? 'bg-white dark:bg-slate-800'
              : 'border-slate-300 bg-slate-50/60 dark:border-slate-200 dark:bg-slate-800/30'
          }`}
          style={{
            borderColor:
              currentStatusColor === 'transparent'
                ? isDark
                  ? '#334155'
                  : '#E2E8F0'
                : currentStatusColor,
          }}>
          {/* Semantic Status Gradient Wash */}
          {(isFocused || value.length > 0) && (
            <LinearGradient
              colors={[
                isFocused ? `${accentColor}12` : isEnoughWords ? '#10B98115' : '#F59E0B15',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          <TextInput
            value={value}
            onChangeText={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            multiline
            className="font-semibold tracking-tight"
            style={{
              fontSize: 16,
              lineHeight: 26,
              minHeight: 110,
              textAlignVertical: 'top',
              color: `${isDark ? '#fff' : '#000'}`,
            }}
          />
        </View>
      </View>

      {/* Validation Intelligence Row */}
      <View className="flex-row items-center justify-between px-2 pt-1">
        <View className="flex-1 flex-row items-center gap-1.5">
          {showWarning ? (
            <>
              <AlertTriangle color="#F59E0B" size={14} strokeWidth={2.5} />
              <Text className="text-[13px] font-bold text-amber-600 dark:text-amber-500">
                Minimum 10 words required
              </Text>
            </>
          ) : isEnoughWords ? (
            <>
              <CheckCircle color="#10B981" size={14} strokeWidth={2.5} />
              <Text className="text-[13px] font-bold text-emerald-600 dark:text-emerald-500">
                Context requirement met
              </Text>
            </>
          ) : (
            <Text className="text-[13px] font-semibold tracking-tight text-slate-400 dark:text-slate-500">
              Provide detailed context for the new officer.
            </Text>
          )}
        </View>

        <View
          className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
          style={{
            backgroundColor: value.length === 0 ? '#F1F5F9' : isEnoughWords ? '#D1FAE5' : '#FEF3C7',
            borderColor: value.length === 0 ? '#E2E8F0' : isEnoughWords ? '#A7F3D0' : '#FDE68A',
            shadowColor: isEnoughWords ? '#10B981' : showWarning ? '#F59E0B' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
          }}>
          <Text
            className={`text-[11px] font-black uppercase tracking-wider ${
              value.length === 0
                ? 'text-slate-500'
                : isEnoughWords
                  ? 'text-emerald-700'
                  : 'text-amber-700'
            }`}>
            {wordCount} / 10
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function SLAOverduePanel({
  issue,
  fieldOfficers,
  onReassign,
  onReject,
  onExtend,
  onEscalate,
}: SLAOverduePanelProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const user = useUser();

  const [activeTab, setActiveTab] = useState<Tab>(issue.assignedOfficer ? 'reassign' : 'reject');

  const overdueDays = issue.slaDeadline ? daysSinceOverdue(issue.slaDeadline) : 0;

  const [reassignReason, setReassignReason] = useState<ReassignmentReason | null>(null);
  const [reassignNote, setReassignNote] = useState('');
  const [reassignOfficer, setReassignOfficer] = useState<FieldOfficer | null>(null);
  const [reassignNewSla, setReassignNewSla] = useState<Date | null>(null);

  const [rejectReason, setRejectReason] = useState<SLAOverdueRejectionReason | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const [extendReason, setExtendReason] = useState<SLAExtensionReason | null>(null);
  const [extendNote, setExtendNote] = useState('');
  const [extendNewSla, setExtendNewSla] = useState<Date | null>(null);

  const [escalateNote, setEscalateNote] = useState('');

  const handleReassign = () => {
    if (!reassignReason) return Alert.alert('Required', 'Please select a reassignment reason.');
    if (!reassignNote.trim())
      return Alert.alert('Required', 'Please add a note explaining the reassignment.');
    if (!reassignOfficer) return Alert.alert('Required', 'Please select a new field officer.');
    if (!reassignNewSla)
      return Alert.alert('Required', 'Please set a new SLA deadline for the reassigned officer.');

    Alert.alert(
      'Confirm Reassignment',
      `Reassign to ${reassignOfficer.fullName} with extended SLA: ${formatDateTimeDisplay(reassignNewSla)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => {
            onReassign(
              issue?.id as Id<'issues'>,
              reassignOfficer._id as Id<'fieldOfficers'>,
              user?.id as Id<'users'>,
              issue?.title as string,
              issue?.issueCode as string,
              true as boolean,
              issue?.assignedOfficer?.fullName as string,
              reassignReason as ReassignmentReason,
              reassignNote.trim() as string,
              reassignNewSla.getTime() as number
            );
          },
        },
      ]
    );
  };

  const handleReject = () => {
    if (!rejectReason) return Alert.alert('Required', 'Please select a rejection reason.');
    if (!rejectNote.trim() || rejectNote.trim().length < 20)
      return Alert.alert('Required', 'Please provide a detailed note (minimum 20 characters).');

    Alert.alert(
      'Confirm Rejection',
      'This issue will be permanently rejected. The citizen will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject Issue',
          style: 'destructive',
          onPress: () => {
            // console.log({
            //   issueId: issue.id,
            //   issueCode: issue.issueCode,
            //   reason: rejectReason,
            //   comment: rejectNote.trim(),
            //   UOName: user?.name,
            //   status: issue?.status,
            //   rejectedBy: user?.id,
            //   issueName: issue.title,
            //   reporterId: issue.reportedBy,
            // });
            onReject(
              issue.id as Id<'issues'>,
              issue.issueCode,
              rejectReason,
              rejectNote.trim(),
              user?.name ?? 'Unit Officer',
              issue?.status,
              user?.id as Id<'users'>,
              issue?.title,
              issue.reportedBy as Id<'users'>
            );
            // onReject(rejectReason, rejectNote.trim(), updated);
            // setRejectNote('');
            // setRejectReason(null);
            // setActiveTab('reassign');
          },
        },
      ]
    );
  };

  const handleExtend = () => {
    if (!extendReason) return Alert.alert('Required', 'Please select an extension reason.');
    if (!extendNote.trim())
      return Alert.alert('Required', 'Please add a note explaining the extension.');
    if (!extendNewSla) return Alert.alert('Required', 'Please select a new SLA deadline date.');

    onExtend(
      issue.id as Id<'issues'>,
      issue.issueCode,
      issue.title,

      user?.id as Id<'users'>,
      user?.name ?? 'Unit Officer',

      issue.reportedBy as Id<'users'>,

      issue.assignedOfficer?.userId as Id<'users'>,

      issue.assignedOfficer?.fullName as string,

      extendReason,
      extendNote.trim(),
      extendNewSla.getTime()
    );
    setExtendReason(null);
    setExtendNote('');
    setExtendNewSla(null);
    setActiveTab('reassign');
  };

  const handleEscalate = () => {
    if (!escalateNote.trim() || escalateNote.trim().length < 20)
      return Alert.alert(
        'Required',
        'Please provide a detailed escalation note (minimum 20 characters).'
      );

    Alert.alert(
      'Escalate to Admin',
      'This issue will be escalated to the Admin with your note. The citizen will be informed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate',
          style: 'destructive',
          onPress: () => {
            console.log(escalateNote.trim());
            if (onEscalate) {
              onEscalate(escalateNote.trim());
            }
          },
        },
      ]
    );
  };

  const TABS: {
    key: Tab;
    label: string;
    icon: (active: boolean) => React.ReactNode;
    color: string;
  }[] = [
    {
      key: 'reassign',
      label: 'Reassign',
      icon: (active) => (
        <UserCheck size={18} strokeWidth={2.5} color={active ? '#2563EB' : '#94A3B8'} />
      ),
      color: '#2563EB',
    },
    {
      key: 'reject',
      label: 'Reject',
      icon: (active) => (
        <CircleX size={15} strokeWidth={2.5} color={active ? '#B91C1C' : '#9CA3AF'} />
      ),
      color: '#B91C1C',
    },
    {
      key: 'extend',
      label: 'Extend SLA',
      icon: (active) => (
        <CalendarClock size={15} strokeWidth={2.5} color={active ? '#D97706' : '#9CA3AF'} />
      ),
      color: '#D97706',
    },
    {
      key: 'escalate',
      label: 'Escalate',
      icon: (active) => (
        <ShieldAlert size={15} strokeWidth={2.5} color={active ? '#7C3AED' : '#9CA3AF'} />
      ),
      color: '#7C3AED',
    },
  ];

  const filteredTabs = TABS.filter((tab) => {
    if (tab.key === 'reassign') {
      return !!issue?.assignedOfficer;
    }
    return true;
  });

  return (
    <View>
      {/* Cohesive SLA Alert Banner */}
      <View className="rounded-t-[24px] bg-white px-5 pb-3 pt-5 dark:bg-slate-900">
        <View
          className="overflow-hidden rounded-2xl border"
          style={{
            borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.3)',
          }}>
          <View
            className="flex-row items-center gap-4 px-4 py-3.5"
            style={{
              backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(254,226,226,0.6)',
            }}>
            <View
              className="h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)' }}>
              <AlertTriangle color={isDark ? '#F87171' : '#DC2626'} size={20} strokeWidth={2.5} />
            </View>

            <View className="flex-1">
              <Text className="text-[14px] font-black tracking-tight text-red-600 dark:text-red-400">
                SLA Deadline Overdue
              </Text>
              <Text className="mt-0.5 text-[12px] font-medium text-red-700/80 dark:text-red-300/90">
                {overdueDays > 0
                  ? `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`
                  : 'Deadline has just passed'}
              </Text>
            </View>

            <View className="items-center justify-center rounded-xl bg-red-600 px-3 py-1.5 shadow-sm dark:bg-red-500">
              <Text className="text-[12px] font-black text-white">+{overdueDays}d</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Classic Clean Tab Bar */}
      <View className="flex-row border-b border-slate-100 bg-white px-2 dark:border-slate-800 dark:bg-slate-900">
        {filteredTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
              className="relative flex-1 items-center justify-center pb-3 pt-3">
              <View className="flex-col items-center gap-1.5 pb-1">
                {tab.icon(isActive)}
                <Text
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? '' : 'text-slate-400 dark:text-slate-500'
                  }`}
                  style={isActive ? { color: tab.color } : {}}>
                  {tab.label}
                </Text>
              </View>
              {isActive && (
                <View
                  className="absolute bottom-0 h-[3px] w-3/4 rounded-t-full"
                  style={{ backgroundColor: tab.color }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── REASSIGN TAB ─── */}
      {activeTab === 'reassign' && (
        <View className="px-5 py-6">
          <View className="gap-8 pb-6">
            {/* Premium Information Banner */}
            <View className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-900/20">
              <View className="flex-row items-start gap-4 p-4">
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800/50">
                  <UserCheck color="#2563EB" size={18} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-[14px] font-black tracking-tight text-blue-900 dark:text-blue-100">
                    Reassignment Action
                  </Text>
                  <Text className="text-[13px] font-medium leading-[20px] text-blue-700/90 dark:text-blue-300/90">
                    Reassigning will notify both officers. A new SLA deadline is mandatory for the
                    new assignee.
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-3">
              <Text className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Reason for Reassignment
              </Text>
              <RadioGroup
                options={REASSIGNMENT_REASONS}
                selected={reassignReason}
                onSelect={setReassignReason}
                accentColor="#2563EB"
              />
            </View>

            <View className="gap-3">
              <Text className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Instructions / Note
              </Text>
              <NoteInput
                value={reassignNote}
                onChange={setReassignNote}
                placeholder="Explain the reason for delay and what the new officer should prioritise..."
                accentColor="#2563EB"
              />
            </View>

            <View className="gap-3">
              <Text className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Select New Officer
              </Text>
              <OfficerPickerCard
                officers={fieldOfficers}
                selected={reassignOfficer}
                onSelect={setReassignOfficer}
                currentOfficerId={issue.assignedOfficer?.userId}
                accentColor="#2563EB"
              />
            </View>

            <View className="gap-3">
              <Text className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                New SLA Deadline
              </Text>
              <DatePickerField
                label="NEW SLA DEADLINE"
                value={reassignNewSla}
                onChange={setReassignNewSla}
                accentColor="#2563EB"
              />
            </View>

            <TouchableOpacity
              onPress={handleReassign}
              activeOpacity={0.8}
              className="mt-2 overflow-hidden rounded-[20px] shadow-xl shadow-blue-500/30">
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  paddingVertical: 18,
                }}>
                <UserCheck color="#FFFFFF" size={20} strokeWidth={2.5} />
                <Text className="text-[16px] font-black tracking-wide text-white drop-shadow-sm">
                  Confirm Reassignment
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── REJECT TAB ─── */}
      {activeTab === 'reject' && (
        <View className="p-4">
          <View className="gap-[18px] pb-6">
            {/* Information Banner */}
            <View className="overflow-hidden rounded-2xl border border-red-100 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20">
              <View className="flex-row items-start gap-4 p-4">
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-800/50">
                  <AlertTriangle color="#B91C1C" size={18} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-[14px] font-black tracking-tight text-red-900 dark:text-blue-100">
                    Rejection Action
                  </Text>
                  <Text className="text-[13px] font-medium leading-[20px] text-red-700/90 dark:text-red-300/90">
                    Rejection due to non-feasibility is irreversible. Citizen will be informed with
                    the reason provided.
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-2.5">
              <Text className="text-[10px] font-extrabold tracking-[1.1px] text-slate-500 dark:text-slate-400">
                REJECTION REASON
              </Text>
              <RadioGroup
                options={SLA_REJECTION_REASONS}
                selected={rejectReason}
                onSelect={setRejectReason}
                accentColor="#B91C1C"
              />
            </View>

            <View className="gap-2.5">
              <Text className="text-[10px] font-extrabold tracking-[1.1px] text-slate-500 dark:text-slate-400">
                DETAILED NOTE (min. 20 characters)
              </Text>
              <NoteInput
                value={rejectNote}
                onChange={setRejectNote}
                placeholder="Provide a detailed explanation for rejection. This will be sent to the citizen..."
                accentColor="#B91C1C"
              />
              {rejectNote.length > 0 && rejectNote.length < 20 && (
                <Text className="mt-1 text-[11px] font-semibold text-red-500">
                  {20 - rejectNote.length} more characters required
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleReject}
              activeOpacity={0.85}
              className="mt-1 overflow-hidden rounded-2xl">
              <LinearGradient
                colors={['#B91C1C', '#7F1D1D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                }}>
                <CircleX color="#FFFFFF" size={19} strokeWidth={2.5} />
                <Text className="text-[15px] font-extrabold text-white">Reject Issue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── EXTEND SLA TAB ─── */}
      {activeTab === 'extend' && (
        <View className="p-4">
          <View className="gap-[18px] pb-6">
            {/* Information Banner */}
            <View className="overflow-hidden rounded-2xl border border-yellow-100 bg-yellow-50 dark:border-yellow-800/50 dark:bg-yellow-900/20">
              <View className="flex-row items-start gap-4 p-4">
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-800/50">
                  <CalendarClock color="#D97706" size={18} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-[14px] font-black tracking-tight text-yellow-900 dark:text-blue-100">
                    SLA Extension Action
                  </Text>
                  <Text className="text-[13px] font-medium leading-[20px] text-yellow-700/90 dark:text-yellow-300/90">
                    Extends the SLA with the currently assigned officer (
                    {issue.assignedOfficer?.fullName ?? 'N/A'}). Citizen will be notified of the new
                    deadline.
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-2.5">
              <Text className="text-[10px] font-extrabold tracking-[1.1px] text-slate-500 dark:text-slate-400">
                EXTENSION REASON
              </Text>
              <RadioGroup
                options={SLA_EXTENSION_REASONS}
                selected={extendReason}
                onSelect={setExtendReason}
                accentColor="#D97706"
              />
            </View>

            <View className="gap-2.5">
              <Text className="text-[10px] font-extrabold tracking-[1.1px] text-slate-500 dark:text-slate-400">
                EXTENSION NOTE
              </Text>
              <NoteInput
                value={extendNote}
                onChange={setExtendNote}
                placeholder="Explain why extension is needed and expected plan of action..."
                accentColor="#D97706"
              />
            </View>

            <DatePickerField
              label="NEW SLA DEADLINE"
              value={extendNewSla}
              onChange={setExtendNewSla}
              accentColor="#D97706"
            />

            <TouchableOpacity
              onPress={handleExtend}
              activeOpacity={0.85}
              className="mt-1 overflow-hidden rounded-2xl">
              <LinearGradient
                colors={['#D97706', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                }}>
                <CalendarClock color="#FFFFFF" size={19} strokeWidth={2.5} />
                <Text className="text-[15px] font-extrabold text-white">Extend SLA Deadline</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── ESCALATE TAB ─── */}
      {activeTab === 'escalate' && (
        <View className="p-4">
          <View className="gap-[18px] pb-6">
            {/* Information Banner */}
            <View className="overflow-hidden rounded-2xl border border-purple-100 bg-purple-50 dark:border-purple-800/50 dark:bg-purple-900/20">
              <View className="flex-row items-start gap-4 p-4">
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-800/50">
                  <ShieldAlert color="#7C3AED" size={18} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-[14px] font-black tracking-tight text-purple-900 dark:text-blue-100">
                    Admin Escalation Action
                  </Text>
                  <Text className="text-[13px] font-medium leading-[20px] text-purple-700/90 dark:text-purple-300/90">
                    Use this only when none of the above options are viable. The Admin will take
                    over this issue and the citizen will be updated on the timeline.
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800">
              <Text className="text-[10px] font-extrabold tracking-[1.1px] text-slate-500 dark:text-slate-400">
                CURRENT ISSUE CONTEXT
              </Text>
              <View className="flex-row gap-2">
                <View className="flex-1 gap-0.5">
                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    Status
                  </Text>
                  <Text className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                    {issue.status}
                  </Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    Overdue
                  </Text>
                  <Text className="text-[13px] font-bold text-red-500">{overdueDays} days</Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    Priority
                  </Text>
                  <Text className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                    {issue.priority}
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-2.5">
              <Text className="text-[10px] font-extrabold tracking-[1.1px] text-slate-500 dark:text-slate-400">
                ESCALATION NOTE TO ADMIN
              </Text>
              <NoteInput
                value={escalateNote}
                onChange={setEscalateNote}
                placeholder="Describe what has been attempted, why it has not resolved, and what admin intervention is required..."
                accentColor="#7C3AED"
              />
              {escalateNote.length > 0 && escalateNote.length < 20 && (
                <Text className="mt-1 text-[11px] font-semibold text-red-500">
                  {20 - escalateNote.length} more characters required
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleEscalate}
              activeOpacity={0.85}
              className="mt-1 overflow-hidden rounded-2xl">
              <LinearGradient
                colors={['#7C3AED', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                }}>
                <ShieldAlert color="#FFFFFF" size={19} strokeWidth={2.5} />
                <Text className="text-[15px] font-extrabold text-white">Escalate to Admin</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
