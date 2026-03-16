import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
} from 'lucide-react-native';
import {
  Issue,
  IssueUpdate,
  SLAOverdueRejectionReason,
  SLAExtensionReason,
  EscalationReason,
  ReassignmentReason,
  FieldOfficer,
} from '../lib/types';

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
  issue: Issue;
  fieldOfficers: FieldOfficer[];
  onReassign: (
    newOfficer: FieldOfficer,
    reason: ReassignmentReason,
    note: string,
    newSlaDate: Date,
    updatedIssue: Issue
  ) => void;
  onReject: (reason: SLAOverdueRejectionReason, note: string, updatedIssue: Issue) => void;
  onExtend: (
    reason: SLAExtensionReason,
    note: string,
    newSlaDate: Date,
    updatedIssue: Issue
  ) => void;
  onEscalate: (note: string, updatedIssue: Issue) => void;
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
  return (
    <View className="gap-2">
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            activeOpacity={0.75}
            className={`flex-row items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 py-3 ${
              isSelected
                ? 'bg-slate-50 dark:bg-slate-800/60'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
            }`}
            style={isSelected ? { borderColor: accentColor } : undefined}>
            <View
              className="h-5 w-5 items-center justify-center rounded-full border-2"
              style={{
                borderColor: isSelected ? accentColor : undefined,
                backgroundColor: isSelected ? accentColor : 'transparent',
              }}>
              {isSelected && <View className="h-2 w-2 rounded-full bg-white" />}
            </View>
            <Text
              className={`flex-1 text-[13px] font-semibold ${
                isSelected
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
              {opt}
            </Text>
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

  return (
    <View className="gap-1.5">
      <Text className="text-[10px] font-extrabold tracking-[1.1px] text-slate-500 dark:text-slate-400">
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.8}
        className={`flex-row items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 py-3.5 ${
          value
            ? 'bg-slate-50 dark:bg-slate-800'
            : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
        }`}
        style={value ? { borderColor: accentColor } : undefined}>
        <Calendar color={value ? accentColor : '#94A3B8'} size={18} strokeWidth={2.5} />
        <Text
          className={`flex-1 text-[14px] font-semibold ${
            value ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
          }`}>
          {value ? formatDateDisplay(value) : 'Select new deadline date'}
        </Text>
        <ChevronDown color="#94A3B8" size={16} strokeWidth={2.5} />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(_, date) => {
            if (Platform.OS === 'android') setShow(false);
            if (date) onChange(date);
          }}
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
}: {
  officers: FieldOfficer[];
  selected: FieldOfficer | null;
  onSelect: (o: FieldOfficer) => void;
  currentOfficerId?: string;
}) {
  const available = officers.filter((o) => o.id !== currentOfficerId);
  return (
    <View className="gap-2">
      {available.map((officer) => {
        const isSelected = selected?.id === officer.id;
        return (
          <TouchableOpacity
            key={officer.id}
            onPress={() => onSelect(officer)}
            activeOpacity={0.8}
            className={`flex-row items-center gap-3 rounded-2xl border-[1.5px] p-3 ${
              isSelected
                ? 'bg-red-50 dark:bg-red-950/30'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
            }`}
            style={isSelected ? { borderColor: '#DC2626' } : undefined}>
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
              <User color="#64748B" size={18} strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <Text className="mb-0.5 text-[14px] font-bold text-slate-900 dark:text-slate-100">
                {officer.name}
              </Text>
              <View className="mb-1 flex-row items-center gap-1.5">
                <Star color="#F59E0B" size={11} strokeWidth={2.5} fill="#F59E0B" />
                <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {officer.rating.toFixed(1)}
                </Text>
                <Briefcase color="#94A3B8" size={11} strokeWidth={2} />
                <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {officer.activeIssues} active
                </Text>
                <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {officer.successRate}% success
                </Text>
              </View>
              <View className="flex-row gap-1.5">
                {officer.specializations.slice(0, 2).map((s) => (
                  <View key={s} className="rounded-md bg-slate-200 px-1.5 py-0.5 dark:bg-slate-700">
                    <Text className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {s}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View
              className="h-5 w-5 items-center justify-center rounded-full border-2"
              style={{
                borderColor: isSelected ? '#DC2626' : '#CBD5E1',
                backgroundColor: isSelected ? '#DC2626' : 'transparent',
              }}>
              {isSelected && <View className="h-2 w-2 rounded-full bg-white" />}
            </View>
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
  return (
    <View
      className="rounded-2xl border-[1.5px] bg-slate-50 px-3.5 py-3 dark:bg-slate-800"
      style={{ borderColor: value.length > 0 ? accentColor : undefined }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline
        className="text-slate-900 dark:text-slate-100"
        style={{
          fontSize: 14,
          lineHeight: 22,
          minHeight: 90,
          textAlignVertical: 'top',
          color: undefined,
        }}
      />
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
  const [activeTab, setActiveTab] = useState<Tab>('reassign');

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
      `Reassign to ${reassignOfficer.name} with extended SLA: ${formatDateDisplay(reassignNewSla)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => {
            const citizenUpdate: IssueUpdate = {
              id: `upd-${Date.now()}`,
              issueId: issue.id,
              status: 'Assigned',
              comment: `SLA overdue action: Issue reassigned to ${reassignOfficer.name}. Reason: ${reassignReason}. New SLA deadline: ${formatDateDisplay(reassignNewSla)}. Note: ${reassignNote.trim()}`,
              role: 'UnitOfficer',
              attachments: [],
              updatedBy: 'uo-1',
              scope: 'field_and_citizen',
              createdAt: new Date().toISOString(),
            };
            const updated: Issue = {
              ...issue,
              status: 'Assigned',
              assignedOfficer: reassignOfficer.name,
              assignedOfficerId: reassignOfficer.id,
              slaDeadline: reassignNewSla.toISOString(),
              reassignmentReason: reassignReason,
              reassignmentComment: reassignNote.trim(),
              issueUpdates: [...issue.issueUpdates, citizenUpdate],
            };
            onReassign(
              reassignOfficer,
              reassignReason,
              reassignNote.trim(),
              reassignNewSla,
              updated
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
            const citizenUpdate: IssueUpdate = {
              id: `upd-${Date.now()}`,
              issueId: issue.id,
              status: 'Rejected',
              comment: `Issue rejected due to SLA breach non-feasibility. Reason: ${rejectReason}. Details: ${rejectNote.trim()}`,
              role: 'UnitOfficer',
              attachments: [],
              updatedBy: 'uo-1',
              scope: 'citizen',
              createdAt: new Date().toISOString(),
            };
            const updated: Issue = {
              ...issue,
              status: 'Rejected',
              slaOverdueRejectionReason: rejectReason,
              slaOverdueRejectionComment: rejectNote.trim(),
              issueUpdates: [...issue.issueUpdates, citizenUpdate],
            };
            onReject(rejectReason, rejectNote.trim(), updated);
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

    Alert.alert(
      'Confirm SLA Extension',
      `Extend SLA deadline to ${formatDateDisplay(extendNewSla)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Extend',
          onPress: () => {
            const citizenUpdate: IssueUpdate = {
              id: `upd-${Date.now()}`,
              issueId: issue.id,
              status: issue.status,
              comment: `SLA deadline extended to ${formatDateDisplay(extendNewSla)}. Reason: ${extendReason}. Note: ${extendNote.trim()}`,
              role: 'UnitOfficer',
              attachments: [],
              updatedBy: 'uo-1',
              scope: 'field_and_citizen',
              createdAt: new Date().toISOString(),
            };
            const updated: Issue = {
              ...issue,
              slaDeadline: extendNewSla.toISOString(),
              slaExtensionReason: extendReason,
              slaExtensionComment: extendNote.trim(),
              issueUpdates: [...issue.issueUpdates, citizenUpdate],
            };
            onExtend(extendReason, extendNote.trim(), extendNewSla, updated);
          },
        },
      ]
    );
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
            const citizenUpdate: IssueUpdate = {
              id: `upd-${Date.now()}`,
              issueId: issue.id,
              status: 'Escalated',
              comment: `Issue escalated to Admin due to SLA breach. Unit Officer note: ${escalateNote.trim()}`,
              role: 'UnitOfficer',
              attachments: [],
              updatedBy: 'uo-1',
              scope: 'field_and_citizen',
              createdAt: new Date().toISOString(),
            };
            const updated: Issue = {
              ...issue,
              status: 'Escalated',
              escalationReason: 'SLA breach',
              slaAdminEscalationComment: escalateNote.trim(),
              issueUpdates: [...issue.issueUpdates, citizenUpdate],
            };
            onEscalate(escalateNote.trim(), updated);
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
        <UserCheck size={15} strokeWidth={2.5} color={active ? '#DC2626' : '#9CA3AF'} />
      ),
      color: '#DC2626',
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

  return (
    <View>
      {/* Overdue Banner */}
      <LinearGradient
        colors={['#FFF1F2', '#FEE2E2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(239,68,68,0.2)',
        }}
        className="dark:bg-red-950">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/60">
          <Clock color="#EF4444" size={20} strokeWidth={2.5} />
        </View>
        <View className="flex-1">
          <Text className="mb-0.5 text-[14px] font-extrabold text-red-600 dark:text-red-400">
            SLA Deadline Overdue
          </Text>
          <Text className="text-[12px] font-medium text-red-800 dark:text-red-300">
            {overdueDays > 0
              ? `${overdueDays} day${overdueDays !== 1 ? 's' : ''} past due date`
              : 'Deadline has passed'}
            {issue.assignedOfficer ? ` · Assigned to ${issue.assignedOfficer}` : ''}
          </Text>
        </View>
        <View className="rounded-xl bg-red-100 px-2.5 py-1 dark:bg-red-900/60">
          <Text className="text-[13px] font-black text-red-600 dark:text-red-400">
            +{overdueDays}d
          </Text>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <View className="flex-row border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
              className={`flex-1 flex-row items-center justify-center gap-1 border-b-[3px] py-3 ${
                isActive ? '' : 'border-transparent'
              }`}
              style={isActive ? { borderBottomColor: tab.color } : undefined}>
              {tab.icon(isActive)}
              <Text
                className={`text-[11px] font-bold ${
                  isActive ? '' : 'text-slate-400 dark:text-slate-500'
                }`}
                style={isActive ? { color: tab.color } : undefined}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── REASSIGN TAB ─── */}
      {activeTab === 'reassign' && (
        <View className="p-4">
          <View className="gap-[18px] pb-6">
            <View className="flex-row items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
              <AlertTriangle color="#DC2626" size={16} strokeWidth={2.5} />
              <Text className="flex-1 text-[12px] font-semibold leading-[18px] text-red-800 dark:text-red-300">
                Reassigning will notify both the current and new officer. A new SLA deadline is
                mandatory.
              </Text>
            </View>

            <View className="gap-2.5">
              <Text className="text-[10px] font-extrabold tracking-[1.1px] text-slate-500 dark:text-slate-400">
                REASON FOR REASSIGNMENT
              </Text>
              <RadioGroup
                options={REASSIGNMENT_REASONS}
                selected={reassignReason}
                onSelect={setReassignReason}
                accentColor="#DC2626"
              />
            </View>

            <View className="gap-2.5">
              <Text className="text-[10px] font-extrabold tracking-[1.1px] text-slate-500 dark:text-slate-400">
                DELAY / REASSIGNMENT NOTE
              </Text>
              <NoteInput
                value={reassignNote}
                onChange={setReassignNote}
                placeholder="Explain reason for delay and what the new officer should prioritise..."
                accentColor="#DC2626"
              />
            </View>

            <View className="gap-2.5">
              <Text className="text-[10px] font-extrabold tracking-[1.1px] text-slate-500 dark:text-slate-400">
                SELECT NEW FIELD OFFICER
              </Text>
              <OfficerPickerCard
                officers={fieldOfficers}
                selected={reassignOfficer}
                onSelect={setReassignOfficer}
                currentOfficerId={issue.assignedOfficerId}
              />
            </View>

            <DatePickerField
              label="NEW SLA DEADLINE"
              value={reassignNewSla}
              onChange={setReassignNewSla}
              accentColor="#DC2626"
            />

            <TouchableOpacity
              onPress={handleReassign}
              activeOpacity={0.85}
              className="mt-1 overflow-hidden rounded-2xl">
              <LinearGradient
                colors={['#DC2626', '#B91C1C']}
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
                <UserCheck color="#FFFFFF" size={19} strokeWidth={2.5} />
                <Text className="text-[15px] font-extrabold text-white">Reassign & Extend SLA</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── REJECT TAB ─── */}
      {activeTab === 'reject' && (
        <View className="p-4">
          <View className="gap-[18px] pb-6">
            <View className="flex-row items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
              <AlertTriangle color="#B91C1C" size={16} strokeWidth={2.5} />
              <Text className="flex-1 text-[12px] font-semibold leading-[18px] text-red-800 dark:text-red-300">
                Rejection due to non-feasibility is irreversible. Citizen will be informed with the
                reason provided. Only available for SLA-breached issues.
              </Text>
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
            <View className="flex-row items-start gap-2.5 rounded-xl border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/40">
              <CalendarClock color="#D97706" size={16} strokeWidth={2.5} />
              <Text className="flex-1 text-[12px] font-semibold leading-[18px] text-yellow-800 dark:text-yellow-300">
                Extends the SLA with the currently assigned officer (
                {issue.assignedOfficer ?? 'N/A'}). Citizen will be notified of the new deadline.
              </Text>
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
            <View className="flex-row items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-950/40">
              <ShieldAlert color="#7C3AED" size={16} strokeWidth={2.5} />
              <Text className="flex-1 text-[12px] font-semibold leading-[18px] text-violet-800 dark:text-violet-300">
                Use this only when none of the above options are viable. The Admin will take over
                this issue and the citizen will be updated on the timeline.
              </Text>
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
                ESCALATION NOTE TO ADMIN (min. 20 characters)
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
