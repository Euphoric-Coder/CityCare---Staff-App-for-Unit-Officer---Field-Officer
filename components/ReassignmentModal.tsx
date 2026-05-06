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
import { RefreshCw, X, UserRoundCog, FileText, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

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

  // Enforce a minimum 5 word count for the comment, matching rejection logic
  const wordCount = comment.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const isWordCountValid = wordCount >= 5;
  const isValid = !!selectedReason && isWordCountValid;

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
        className="flex-1 justify-end bg-black/60"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleCancel}
        />

        <View
          className="overflow-hidden rounded-t-[32px] bg-white dark:bg-slate-900"
          style={styles.sheet}>
          {/* Header */}
          <LinearGradient
            colors={isDark ? ['rgba(245, 158, 11, 0.1)', 'transparent'] : ['rgba(245, 158, 11, 0.05)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          <View className="items-center pb-2 pt-3">
            <View className="h-1.5 w-12 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
          </View>

          <View className="flex-row items-center justify-between border-b border-slate-100/50 px-6 pb-6 pt-5 dark:border-slate-800/50">
            <View className="flex-1 flex-row items-center gap-4">
              <LinearGradient
                colors={['#F59E0B', '#F59E0B']}
                style={{
                  height: 50,
                  width: 50,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <RefreshCw color="#FFFFFF" size={24} strokeWidth={2.5} />
              </LinearGradient>

              <View className="flex-1">
                <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                  Reassign Protocol
                </Text>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                    ACTION REQUIRED
                  </Text>
                  <View className="rounded-full bg-amber-100 px-2.5 py-0.5 dark:bg-amber-900/40">
                    <Text className="text-[9px] font-black tracking-widest text-amber-600 dark:text-amber-400">
                      SECURE
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              className="h-9 w-9 items-center justify-center rounded-full border border-slate-200/50 bg-slate-100/50 dark:border-white/5 dark:bg-slate-800/50"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color={isDark ? '#94A3B8' : '#64748B'} size={18} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}>
            
            {/* Target Issue Context */}
            <View className="mb-6 overflow-hidden rounded-[24px] border border-slate-200/60 bg-white shadow-sm dark:border-white/5 dark:bg-slate-900/60">
              <LinearGradient
                colors={isDark ? ['rgba(245, 158, 11, 0.08)', 'transparent'] : ['rgba(245, 158, 11, 0.03)', 'transparent']}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              
              <View className="border-b border-slate-100/60 px-5 py-4 dark:border-white/5">
                <View className="mb-1.5 flex-row items-center gap-2">
                  <View className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                  <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80">
                    TARGET ISSUE
                  </Text>
                </View>
                <Text className="text-[16px] font-black leading-[22px] tracking-tight text-slate-800 dark:text-slate-100">
                  {issueTitle}
                </Text>
              </View>
              
              <View className="flex-row items-center justify-between bg-slate-50/80 px-5 py-3.5 dark:bg-slate-800/40">
                <View className="flex-row items-center gap-3">
                  <LinearGradient
                    colors={isDark ? ['#134E4A', '#0F766E'] : ['#CCFBF1', '#99F6E4']}
                    className="h-10 w-10 items-center justify-center rounded-[14px]">
                    <UserRoundCog color={isDark ? '#5EEAD4' : '#0F766E'} size={18} strokeWidth={2.5} />
                  </LinearGradient>
                  <View>
                    <Text className="mb-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Assigned Officer
                    </Text>
                    <Text className="text-[14px] font-black tracking-wide text-teal-700 dark:text-teal-400">
                      {currentOfficer}
                    </Text>
                  </View>
                </View>
                
                <View className="rounded-lg bg-white/60 px-2.5 py-1 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-700/50">
                  <Text className="text-[9px] font-bold tracking-widest text-slate-400 dark:text-slate-500">
                    CURRENT
                  </Text>
                </View>
              </View>
            </View>

            {/* Reassignment Reason Matrix */}
            <Text className="mb-3 ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Reassignment Reason <Text className="text-amber-500">*</Text>
            </Text>
            
            <View className="mb-6 flex-row flex-wrap gap-3">
              {REASSIGNMENT_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    activeOpacity={0.8}
                    className="w-[47%]"
                    style={{ flexGrow: 1 }}>
                    {isSelected ? (
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={{
                          borderRadius: 18,
                          padding: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          shadowColor: '#F59E0B',
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.35,
                          shadowRadius: 10,
                          elevation: 6,
                        }}>
                        <Text className="text-[14px] font-black tracking-wide text-white">
                          {reason}
                        </Text>
                        <View className="h-5 w-5 items-center justify-center rounded-full bg-white/25">
                          <CheckCircle2 color="#FFFFFF" size={14} strokeWidth={3} />
                        </View>
                      </LinearGradient>
                    ) : (
                      <View
                        style={{
                          borderRadius: 18,
                          borderWidth: 1.5,
                          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#F8FAFC',
                          padding: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                        <Text className="text-[14px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
                          {reason}
                        </Text>
                        <View className="h-5 w-5 rounded-full border-2 border-slate-300 bg-white/50 dark:border-slate-600 dark:bg-slate-800/50" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Justification Canvas */}
            <Text className="mb-3 ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Justification Log <Text className="text-amber-500">*</Text>
            </Text>
            
            <View
              className={`mb-6 overflow-hidden rounded-[24px] border ${
                isWordCountValid
                  ? 'border-emerald-500/50 bg-emerald-50/30 dark:border-emerald-500/30 dark:bg-emerald-900/10'
                  : 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/40'
              }`}>
              
              <View className={`flex-row items-center justify-between border-b px-5 py-3 ${
                isWordCountValid
                  ? 'border-emerald-200 bg-emerald-100/50 dark:border-emerald-800/50 dark:bg-emerald-900/30'
                  : 'border-slate-100 bg-slate-100/50 dark:border-slate-800 dark:bg-slate-800/60'
              }`}>
                <View className="flex-row items-center gap-2">
                  <FileText 
                    color={isWordCountValid ? '#10B981' : (isDark ? '#94A3B8' : '#64748B')} 
                    size={14} 
                    strokeWidth={2.5} 
                  />
                  <Text className={`text-[12px] font-black uppercase tracking-widest ${
                    isWordCountValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {isWordCountValid ? 'Verified Input' : 'Draft Mode'}
                  </Text>
                </View>

                <View className={`rounded-lg px-2.5 py-1 ${
                  isWordCountValid
                    ? 'bg-emerald-200/50 dark:bg-emerald-900/50'
                    : 'bg-slate-200/50 dark:bg-slate-700/50'
                }`}>
                  <Text className={`text-[10px] font-black ${
                    isWordCountValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'
                  }`}>
                    {wordCount} WORDS {!isWordCountValid && '(MIN 5)'}
                  </Text>
                </View>
              </View>

              <TextInput
                className="min-h-[120px] px-5 py-4 text-[15px] font-medium leading-[24px] text-slate-800 dark:text-slate-100"
                placeholder="Detail the exact reason for this reassignment protocol..."
                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                value={comment}
                onChangeText={setComment}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View className="flex-row gap-4 border-t border-slate-100/50 px-6 pb-10 pt-5 dark:border-slate-800/50">
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.75}
              className="flex-1 items-center justify-center rounded-2xl bg-slate-100 py-4 dark:bg-slate-800">
              <Text className="text-[15px] font-black tracking-wide text-slate-600 dark:text-slate-300">
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleReassign}
              disabled={!isValid}
              activeOpacity={0.8}
              style={{ flex: 1.5 }}>
              <LinearGradient
                colors={isValid ? ['#F59E0B', '#D97706'] : [isDark ? '#334155' : '#E2E8F0', isDark ? '#1E293B' : '#CBD5E1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.confirmBtn,
                  isValid && {
                    shadowColor: '#F59E0B',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                  }
                ]}>
                <RefreshCw color={isValid ? '#FFFFFF' : (isDark ? '#64748B' : '#94A3B8')} size={18} strokeWidth={2.5} />
                <Text className={`text-[16px] font-black tracking-wide ${isValid ? 'text-white' : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                  Reassign
                </Text>
              </LinearGradient>
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
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 30,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  confirmBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
