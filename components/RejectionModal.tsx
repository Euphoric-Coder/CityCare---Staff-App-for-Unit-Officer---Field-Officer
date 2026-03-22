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
} from 'react-native';
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
} from 'lucide-react-native';
import { RejectionReason } from '../lib/types';

interface RejectionModalProps {
  visible: boolean;
  onClose: () => void;
  onReject: (reason: RejectionReason, comment: string) => void;
  issueTitle?: string;
}

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

export default function RejectionModal({
  visible,
  onClose,
  onReject,
  issueTitle = 'this issue',
}: RejectionModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedReason, setSelectedReason] = useState<RejectionReason | ''>('');
  const [comment, setComment] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationError, setValidationError] = useState('');

  const canSubmit = !!selectedReason && !!comment.trim();

  const handleReject = () => {
    if (!selectedReason) {
      setValidationError('Please select a rejection reason.');
      return;
    }
    if (!comment.trim()) {
      setValidationError('Please add a comment before rejecting.');
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
              className="mb-4 flex-row items-start gap-2.5 rounded-2xl p-3.5"
              style={[
                styles.warningBorder,
                { backgroundColor: isDark ? '#1C0A0A' : '#FEF2F2', borderLeftColor: '#EF4444' },
              ]}>
              <AlertTriangle color="#EF4444" size={16} strokeWidth={2.5} />
              <Text
                className="flex-1 text-[13px] font-semibold leading-5"
                style={{ color: isDark ? '#FCA5A5' : '#991B1B' }}>
                This action is irreversible. The issue will be permanently rejected.
              </Text>
            </View>

            {/* Issue chip */}
            <View
              className="mb-5 rounded-2xl p-3.5"
              style={[
                styles.chipBorder,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}>
              <Text
                className="mb-1 text-[10px] font-extrabold uppercase tracking-widest"
                style={{ color: isDark ? '#475569' : '#94A3B8' }}>
                ISSUE
              </Text>
              <Text
                className="text-[15px] font-bold leading-5"
                style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}
                numberOfLines={2}>
                {issueTitle}
              </Text>
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
                  <View
                    className="flex-row items-center gap-1 rounded-full px-2 py-1"
                    style={{ backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }}>
                    <CheckCircle2 color="#EF4444" size={11} strokeWidth={2.5} />
                    <Text className="text-[11px] font-bold text-red-500">Selected</Text>
                  </View>
                )}
              </View>

              <View className="flex-row flex-wrap gap-2.5">
                {REJECTION_REASONS.map((item) => {
                  const active = selectedReason === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => {
                        setSelectedReason(item.value);
                        setValidationError('');
                      }}
                      activeOpacity={0.75}
                      style={[
                        styles.reasonCard,
                        {
                          backgroundColor: active
                            ? isDark
                              ? item.bgDark
                              : item.bgLight
                            : isDark
                              ? '#1E293B'
                              : '#F8FAFC',
                          borderColor: active ? item.color : isDark ? '#334155' : '#E2E8F0',
                        },
                      ]}>
                      <View
                        className="mb-2 h-9 w-9 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: active
                            ? isDark
                              ? '#00000033'
                              : '#FFFFFF66'
                            : isDark
                              ? item.bgDark
                              : item.bgLight,
                        }}>
                        <item.Icon
                          color={active ? item.color : isDark ? '#475569' : '#94A3B8'}
                          size={16}
                          strokeWidth={2}
                        />
                      </View>
                      <Text
                        className="mb-0.5 text-[13px] font-bold"
                        style={{ color: active ? item.color : isDark ? '#94A3B8' : '#475569' }}>
                        {item.value}
                      </Text>
                      <Text
                        className="text-[11px] font-medium"
                        style={{
                          color: active
                            ? isDark
                              ? item.color + 'BB'
                              : item.color + '99'
                            : isDark
                              ? '#334155'
                              : '#CBD5E1',
                        }}>
                        {item.description}
                      </Text>
                      {active && (
                        <View style={[styles.activeDot, { backgroundColor: item.color }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Comment */}
            <View className="mb-2">
              <Text
                className="mb-2.5 text-[14px] font-bold"
                style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                Comment <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: comment.trim()
                      ? isDark
                        ? '#EF444455'
                        : '#FECACA'
                      : isDark
                        ? '#334155'
                        : '#E2E8F0',
                    color: isDark ? '#F1F5F9' : '#0F172A',
                  },
                ]}
                placeholder="Explain the reason so the citizen understands..."
                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                value={comment}
                onChangeText={(t) => {
                  setComment(t);
                  setValidationError('');
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text
                className="mt-1.5 text-right text-[11px] font-semibold"
                style={{ color: isDark ? '#334155' : '#CBD5E1' }}>
                {comment.trim().length} characters
              </Text>
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
    width: '47%',
    padding: 14,
    borderRadius: 16,
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
