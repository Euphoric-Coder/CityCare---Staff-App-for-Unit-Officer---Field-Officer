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
import { RefreshCw, X, UserRoundCog } from 'lucide-react-native';

interface ReassignmentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, comment: string) => void;
  issueTitle: string;
  currentOfficer: string;
}

const REASSIGNMENT_REASONS = ['Overloaded', 'Delay', 'Quality Issue', 'Officer Request', 'Other'];

export default function ReassignmentModal({
  visible,
  onClose,
  onConfirm,
  issueTitle,
  currentOfficer,
}: ReassignmentModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedReason, setSelectedReason] = useState('');
  const [comment, setComment] = useState('');

  const isValid = !!selectedReason && comment.trim().length > 0;

  const handleReassign = () => {
    if (!isValid) return;
    onConfirm(selectedReason, comment);
    setSelectedReason('');
    setComment('');
  };

  const handleCancel = () => {
    setSelectedReason('');
    setComment('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/55"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleCancel}
        />

        <View className="rounded-t-3xl bg-white dark:bg-slate-900" style={styles.sheet}>
          <View className="items-center pb-1 pt-3">
            <View className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
          </View>

          <View className="flex-row items-center border-b border-slate-100 px-5 pb-4 pt-3 dark:border-slate-800">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/40">
              <RefreshCw color="#F59E0B" size={20} strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <Text className="text-[18px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Reassign Issue
              </Text>
              <Text className="mt-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Select a reason and add a comment
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color={isDark ? '#9CA3AF' : '#6B7280'} size={16} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}>
            <View className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Issue
              </Text>
              <Text className="mb-2.5 text-[15px] font-bold leading-[22px] text-slate-800 dark:text-slate-100">
                {issueTitle}
              </Text>
              <View className="flex-row items-center gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-700">
                <View className="h-6 w-6 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
                  <UserRoundCog color="#0D9488" size={12} strokeWidth={2.5} />
                </View>
                <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  Currently:{' '}
                  <Text className="font-bold text-teal-600 dark:text-teal-400">
                    {currentOfficer}
                  </Text>
                </Text>
              </View>
            </View>

            <Text className="mb-3 text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Reassignment Reason <Text className="text-red-500">*</Text>
            </Text>
            <View className="mb-5 gap-2.5">
              {REASSIGNMENT_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    activeOpacity={0.72}
                    className={`flex-row items-center rounded-xl border-2 px-4 py-3.5 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                    }`}>
                    <View
                      className={`mr-3 h-4 w-4 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? 'border-amber-400 dark:border-amber-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                      {isSelected && (
                        <View className="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-500" />
                      )}
                    </View>
                    <Text
                      className={`flex-1 text-[14px] font-semibold ${
                        isSelected
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="mb-3 text-[13px] font-bold text-slate-700 dark:text-slate-300">
              Comment <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 pt-3.5 text-[14px] font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Provide reason for reassignment..."
              placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              scrollEnabled={false}
              style={styles.textInput}
            />
          </ScrollView>

          <View className="flex-row gap-3 border-t border-slate-100 px-5 pb-8 pt-4 dark:border-slate-800">
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.75}
              className="flex-1 items-center justify-center rounded-2xl bg-slate-100 py-4 dark:bg-slate-800">
              <Text className="text-[15px] font-bold text-slate-600 dark:text-slate-300">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleReassign}
              disabled={!isValid}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-4"
              style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}>
              <RefreshCw color="#FFFFFF" size={16} strokeWidth={2.5} />
              <Text className="text-[15px] font-bold text-white">Reassign</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  textInput: {
    minHeight: 120,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
});
