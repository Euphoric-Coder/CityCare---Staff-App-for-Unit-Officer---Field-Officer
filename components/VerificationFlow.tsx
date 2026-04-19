import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  useColorScheme,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
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
} from 'lucide-react-native';
import { VerificationChecklist } from '../lib/types';

interface VerificationFlowProps {
  onVerify: (checklist: VerificationChecklist, slaDate: string, notes: string) => void;
  onReject: () => void;
}

const CHECKLIST_ITEMS = [
  {
    key: 'locationValid' as keyof VerificationChecklist,
    label: 'Location is valid and verifiable',
    description: 'Confirm the reported location exists and is identifiable',
    Icon: MapPin,
    colorLight: '#0EA5E9',
    colorDark: '#38BDF8',
    bgLight: '#E0F2FE',
    bgDark: '#0C4A6E',
  },
  {
    key: 'hasSufficientEvidence' as keyof VerificationChecklist,
    label: 'Evidence is sufficient',
    description: 'Photos and description clearly document the issue',
    Icon: Camera,
    colorLight: '#6366F1',
    colorDark: '#818CF8',
    bgLight: '#EEF2FF',
    bgDark: '#1E1B4B',
  },
  {
    key: 'notDuplicate' as keyof VerificationChecklist,
    label: 'Not a duplicate issue',
    description: 'No existing open issue at this location',
    Icon: Copy,
    colorLight: '#F59E0B',
    colorDark: '#FCD34D',
    bgLight: '#FEF3C7',
    bgDark: '#451A03',
    hint: 'Search for similar issues before proceeding',
  },
  {
    key: 'isWithinJurisdiction' as keyof VerificationChecklist,
    label: 'Within municipal jurisdiction',
    description: "Location falls under this unit's area of responsibility",
    Icon: Building2,
    colorLight: '#10B981',
    colorDark: '#34D399',
    bgLight: '#D1FAE5',
    bgDark: '#064E3B',
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

export default function VerificationFlow({ onVerify, onReject }: VerificationFlowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [checklist, setChecklist] = useState<VerificationChecklist>({
    locationValid: false,
    hasSufficientEvidence: false,
    notDuplicate: false,
    isWithinJurisdiction: false,
  });

  const [notes, setNotes] = useState<string>('');

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
    if (canVerify) onVerify(checklist, slaDate.toISOString(), notes);
  };

  const openDatePicker = () => {
    if (Platform.OS === 'ios') {
      setTempDate(slaDate);
      setShowDateModal(true);
    } else {
      setShowAndroidDate(true);
    }
  };

  return (
    <View className="p-5">
      {/* Header */}
      <View className="mb-5">
        <View className="mb-1 flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/60">
            <CheckCheck color={isDark ? '#34D399' : '#10B981'} size={18} strokeWidth={2.5} />
          </View>
          <View>
            <Text className="text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Issue Verification
            </Text>
            <Text className="mt-0.5 text-[12px] font-medium text-slate-400 dark:text-slate-500">
              Confirm all criteria before approving
            </Text>
          </View>
        </View>
      </View>

      {/* Progress */}
      <View className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 dark:border-slate-700 dark:bg-slate-800/70">
        <View className="mb-2.5 flex-row items-center justify-between">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Checklist Progress
          </Text>
          <View
            className={`rounded-full px-2.5 py-1 ${
              canVerify ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
            <Text
              className={`text-[12px] font-bold ${
                canVerify
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
              {checkedCount}/{totalCount}
            </Text>
          </View>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <View
            className={`h-full rounded-full ${canVerify ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-sky-500 dark:bg-sky-400'}`}
            style={{ width: `${progressPct}%` }}
          />
        </View>
        {canVerify && (
          <Text className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            All criteria verified — ready to approve
          </Text>
        )}
      </View>

      {/* Checklist items */}
      <View className="mb-5 gap-2.5">
        {CHECKLIST_ITEMS.map((item) => {
          const checked = checklist[item.key];
          const iconColor = checked
            ? isDark
              ? '#34D399'
              : '#10B981'
            : isDark
              ? item.colorDark
              : item.colorLight;
          const iconBg = checked
            ? isDark
              ? '#064E3B'
              : '#D1FAE5'
            : isDark
              ? item.bgDark
              : item.bgLight;

          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setChecklist({ ...checklist, [item.key]: !checked })}
              activeOpacity={0.75}
              className={`flex-row items-center gap-3 rounded-2xl border-[1.5px] p-3.5 ${
                checked
                  ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700/70 dark:bg-emerald-950/30'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
              }`}>
              <View
                className="h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: iconBg }}>
                <item.Icon color={iconColor} size={18} strokeWidth={2} />
              </View>

              <View className="flex-1">
                <Text
                  className={`mb-0.5 text-[14px] font-bold ${
                    checked
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}>
                  {item.label}
                </Text>
                {!checked && item.hint ? (
                  <Text className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    {item.hint}
                  </Text>
                ) : (
                  <Text className="text-[11px] leading-4 text-slate-400 dark:text-slate-500">
                    {item.description}
                  </Text>
                )}
              </View>

              <View
                className={`h-6 w-6 items-center justify-center rounded-lg border-2 ${
                  checked
                    ? 'border-emerald-500 bg-emerald-500 dark:border-emerald-500 dark:bg-emerald-500'
                    : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900'
                }`}>
                {checked && <CheckCircle2 color="#fff" size={14} strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notes Section */}
      <View
        className={`mb-5 overflow-hidden rounded-[24px] border bg-white shadow-sm dark:bg-slate-900 ${
          notes && wordCount < 10
            ? 'border-amber-300 dark:border-amber-900/60'
            : 'border-slate-200 dark:border-slate-800'
        }`}>
        <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3.5 dark:border-slate-800/80 dark:bg-slate-800/40">
          <View className="flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
              <Notebook color={isDark ? '#FBBF24' : '#F59E0B'} size={15} strokeWidth={2.5} />
            </View>
            <Text className="text-[14px] font-black tracking-tight text-slate-800 dark:text-slate-100">
              Field Notes
            </Text>
          </View>
          
          <View
            className={`rounded-lg px-2.5 py-1.5 ${
              wordCount >= 10
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : 'bg-amber-100 dark:bg-amber-900/40'
            }`}>
            <Text
              className={`text-[10px] font-black ${
                wordCount >= 10
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}>
              {wordCount} WORDS {wordCount < 10 && '(MIN 10)'}
            </Text>
          </View>
        </View>

        <View className="px-1 py-1">
          <TextInput
            className="min-h-[110px] bg-transparent px-4 py-3"
            placeholder="Document verification details here. Be specific about observations..."
            value={notes}
            onChangeText={setNotes}
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

      {/* SLA Deadline */}
      <View className="mb-1 rounded-2xl border-[1.5px] border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
        <View className="mb-3 flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/50">
            <Clock color={isDark ? '#38BDF8' : '#0EA5E9'} size={14} strokeWidth={2.5} />
          </View>
          <Text className="text-[14px] font-bold text-slate-800 dark:text-slate-200">
            SLA Deadline
          </Text>
        </View>

        <TouchableOpacity
          onPress={openDatePicker}
          activeOpacity={0.75}
          className="mb-2.5 flex-row items-center rounded-xl border-[1.5px] border-sky-400 bg-white px-3.5 py-3 dark:border-sky-600 dark:bg-slate-900">
          <View className="flex-1 flex-row items-center gap-2">
            <Calendar color={isDark ? '#38BDF8' : '#0EA5E9'} size={15} strokeWidth={2} />
            <View>
              <Text className="mb-0.5 text-[14px] font-bold text-slate-900 dark:text-slate-100">
                {formatDate(slaDate)}
              </Text>
              <Text className="text-[12px] font-semibold text-sky-500 dark:text-sky-400">
                {formatTime(slaDate)}
              </Text>
            </View>
          </View>
          <ChevronRight color={isDark ? '#38BDF8' : '#0EA5E9'} size={16} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text className="text-[11px] italic text-slate-400 dark:text-slate-500">
          Determines escalation timing and priority rank
        </Text>
      </View>

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
          animationType="slide"
          onRequestClose={() => setShowDateModal(false)}>
          <TouchableOpacity
            style={styles.iosModalOverlay}
            activeOpacity={1}
            onPress={() => setShowDateModal(false)}>
            <View
              className="rounded-t-3xl bg-white pb-9 pt-3 dark:bg-slate-900"
              style={styles.iosSheetShadow}>
              <View className="mb-3 h-1 w-10 self-center rounded-full bg-slate-300 dark:bg-slate-600" />
              <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
                <Text className="text-[17px] font-extrabold text-slate-900 dark:text-slate-100">
                  Set SLA Deadline
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSlaDate(tempDate);
                    setShowDateModal(false);
                  }}
                  className="rounded-xl bg-sky-100 px-4 py-1.5 dark:bg-sky-900/60">
                  <Text className="text-[14px] font-bold text-sky-600 dark:text-sky-400">Done</Text>
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
                style={{ height: 200 }}
                textColor={isDark ? '#F1F5F9' : '#0F172A'}
              />

              <TouchableOpacity
                onPress={() => setShowDateModal(false)}
                className="mx-5 mt-2 items-center border-t border-slate-100 pt-4 dark:border-slate-800">
                <Text className="text-[14px] font-semibold text-slate-400 dark:text-slate-500">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Action buttons */}
      <View className="mt-5 flex-row gap-3">
        <TouchableOpacity
          onPress={onReject}
          activeOpacity={0.8}
          className="flex-row items-center justify-center gap-2 rounded-2xl border-[1.5px] border-red-200 bg-red-50 px-5 py-3.5 dark:border-red-800/60 dark:bg-red-950/30">
          <XCircle color="#EF4444" size={17} strokeWidth={2.5} />
          <Text className="text-[14px] font-bold text-red-500 dark:text-red-400">Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleVerify}
          disabled={!canVerify}
          activeOpacity={canVerify ? 0.85 : 1}
          className="flex-1 overflow-hidden rounded-2xl">
          {canVerify ? (
            <LinearGradient
              colors={['#059669', '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.verifyBtnGradient}>
              <CheckCircle2 color="#fff" size={17} strokeWidth={2.5} />
              <Text className="text-[14px] font-extrabold text-white">Verify & Approve</Text>
            </LinearGradient>
          ) : (
            <View
              className="flex-row items-center justify-center gap-2 bg-slate-100 px-5 py-3.5 dark:bg-slate-800"
              style={styles.verifyBtnGradient}>
              <AlertTriangle color={isDark ? '#475569' : '#CBD5E1'} size={17} strokeWidth={2} />
              <Text className="text-[14px] font-extrabold text-slate-300 dark:text-slate-600">
                Complete Checklist
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  iosSheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  verifyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
});
