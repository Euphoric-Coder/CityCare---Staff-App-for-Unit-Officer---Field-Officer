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
import { ShieldAlert, X, FileText, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface EscalationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (category: string, priority: string, reason: string) => void;
  issueTitle: string;
  isReescalate: boolean;
}

const ESCALATION_CATEGORIES = [
  { label: 'SLA Breach', value: 'sla_breach' },
  { label: 'Resource Shortage', value: 'resource_shortage' },
  { label: 'Technical Dependency', value: 'technical_dependency' },
  { label: 'Third-Party Dependency', value: 'third_party_dependency' },
  { label: 'Public Safety Risk', value: 'public_safety_risk' },
  { label: 'Environmental Risk', value: 'environmental_risk' },
  { label: 'Citizen Escalation', value: 'citizen_escalation' },
  { label: 'Other', value: 'other' },
];

const ESCALATION_PRIORITIES = [
  { label: 'Medium', value: 'medium', color: '#F59E0B' },
  { label: 'High', value: 'high', color: '#EF4444' },
  { label: 'Critical', value: 'critical', color: '#991B1B' },
];

export default function EscalationModal({
  visible,
  onClose,
  onConfirm,
  issueTitle,
  isReescalate,
}: EscalationModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedCategory, setSelectedCategory] = useState('sla_breach');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [reason, setReason] = useState('');

  // Enforce a minimum 5 word count for the reason
  const wordCount = reason.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const isWordCountValid = wordCount >= 5;
  const isValid = !!selectedCategory && !!selectedPriority && isWordCountValid;

  const handleEscalate = () => {
    if (!isValid) return;
    onConfirm(selectedCategory, selectedPriority, reason);
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
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
          <LinearGradient
            colors={isDark ? ['rgba(124, 58, 237, 0.1)', 'transparent'] : ['rgba(124, 58, 237, 0.05)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          <View className="items-center pb-2 pt-3">
            <View className="h-1.5 w-12 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
          </View>

          <View className="flex-row items-center justify-between border-b border-slate-100/50 px-6 pb-6 pt-5 dark:border-slate-800/50">
            <View className="flex-1 flex-row items-center gap-4">
              <LinearGradient
                colors={['#7C3AED', '#6D28D9']}
                style={{
                  height: 50,
                  width: 50,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <ShieldAlert color="#FFFFFF" size={24} strokeWidth={2.5} />
              </LinearGradient>

              <View className="flex-1">
                <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                  {isReescalate ? 'Re-escalate Issue' : 'Escalate Protocol'}
                </Text>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500">
                    {isReescalate ? 'RE-ESCALATION STATUS' : 'ADMIN INTERVENTION'}
                  </Text>
                  <View className="rounded-full bg-purple-100 px-2.5 py-0.5 dark:bg-purple-900/40">
                    <Text className="text-[9px] font-black tracking-widest text-purple-600 dark:text-purple-400">
                      CRITICAL
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
                colors={isDark ? ['rgba(124, 58, 237, 0.08)', 'transparent'] : ['rgba(124, 58, 237, 0.03)', 'transparent']}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              
              <View className="px-5 py-4">
                <View className="mb-1.5 flex-row items-center gap-2">
                  <View className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                  <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500/80">
                    TARGET ISSUE
                  </Text>
                </View>
                <Text className="text-[16px] font-black leading-[22px] tracking-tight text-slate-800 dark:text-slate-100">
                  {issueTitle}
                </Text>
              </View>
            </View>

            {/* Escalation Priority selector */}
            <Text className="mb-3 ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Escalation Priority <Text className="text-red-500">*</Text>
            </Text>
            
            <View className="mb-6 flex-row gap-3">
              {ESCALATION_PRIORITIES.map((p) => {
                const isSelected = selectedPriority === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setSelectedPriority(p.value)}
                    activeOpacity={0.8}
                    className="flex-1">
                    {isSelected ? (
                      <LinearGradient
                        colors={[p.color, p.color]}
                        style={{
                          borderRadius: 18,
                          paddingVertical: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: p.color,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 4,
                        }}>
                        <Text className="text-[13px] font-black tracking-wide text-white">
                          {p.label}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={{
                          borderRadius: 18,
                          borderWidth: 1.5,
                          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#F8FAFC',
                          paddingVertical: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Text className="text-[13px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
                          {p.label}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Escalation Category Matrix */}
            <Text className="mb-3 ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Escalation Category <Text className="text-purple-500">*</Text>
            </Text>
            
            <View className="mb-6 flex-row flex-wrap gap-2.5">
              {ESCALATION_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setSelectedCategory(cat.value)}
                    activeOpacity={0.8}
                    style={{ minWidth: '47%', flexGrow: 1 }}>
                    {isSelected ? (
                      <LinearGradient
                        colors={['#7C3AED', '#6D28D9']}
                        style={{
                          borderRadius: 18,
                          padding: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'between',
                          shadowColor: '#7C3AED',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 4,
                        }}>
                        <Text className="flex-1 text-[13px] font-black tracking-wide text-white" numberOfLines={1}>
                          {cat.label}
                        </Text>
                        <CheckCircle2 color="#FFFFFF" size={14} strokeWidth={3} />
                      </LinearGradient>
                    ) : (
                      <View
                        style={{
                          borderRadius: 18,
                          borderWidth: 1.5,
                          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#F8FAFC',
                          padding: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'between',
                        }}>
                        <Text className="flex-1 text-[13px] font-bold tracking-wide text-slate-500 dark:text-slate-400" numberOfLines={1}>
                          {cat.label}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Justification Log */}
            <Text className="mb-3 ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Escalation Details <Text className="text-purple-500">*</Text>
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
                    {isWordCountValid ? 'Verified Justification' : 'Draft justification'}
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
                className="min-h-[110px] px-5 py-4 text-[15px] font-medium leading-[24px] text-slate-800 dark:text-slate-100"
                placeholder="Detail the exact administrative justification for escalating this issue..."
                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                value={reason}
                onChangeText={setReason}
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
              onPress={handleEscalate}
              disabled={!isValid}
              activeOpacity={0.8}
              style={{ flex: 1.5 }}>
              <LinearGradient
                colors={isValid ? ['#7C3AED', '#6D28D9'] : [isDark ? '#334155' : '#E2E8F0', isDark ? '#1E293B' : '#CBD5E1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.confirmBtn,
                  isValid && {
                    shadowColor: '#7C3AED',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                  }
                ]}>
                <ShieldAlert color={isValid ? '#FFFFFF' : (isDark ? '#64748B' : '#94A3B8')} size={18} strokeWidth={2.5} />
                <Text className={`text-[16px] font-black tracking-wide ${isValid ? 'text-white' : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                  {isReescalate ? 'Re-escalate' : 'Escalate'}
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
