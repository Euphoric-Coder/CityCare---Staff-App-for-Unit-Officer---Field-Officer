import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  UserCheck,
  Star,
  Briefcase,
  TrendingUp,
  CircleCheck as CheckCircle2,
  CircleAlert,
  ChartBar as BarChart2,
  RefreshCw,
} from 'lucide-react-native';
import { FieldOfficer } from '../lib/types';

interface AssignOfficerModalProps {
  visible: boolean;
  onClose: () => void;
  officers: FieldOfficer[];
  onAssign: (officerId: string) => void;
  mode?: 'assign' | 'reassign';
  currentOfficerName?: string;
}

type SortOption = 'rating' | 'workload' | 'success';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function WorkloadBar({ pct, isDark }: { pct: number; isDark: boolean }) {
  const color = pct >= 85 ? '#EF4444' : pct >= 55 ? '#F59E0B' : '#10B981';
  return (
    <View className="mt-2.5">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Workload
        </Text>
        <Text className="text-[12px] font-extrabold" style={{ color }}>
          {pct}%
        </Text>
      </View>
      <View
        className="h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }}>
        <View
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 99,
          }}
        />
      </View>
    </View>
  );
}

export default function AssignOfficerModal({
  visible,
  onClose,
  officers,
  onAssign,
  mode = 'assign',
  currentOfficerName,
}: AssignOfficerModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [showConfirm, setShowConfirm] = useState(false);

  const sorted = [...officers].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'workload') return a.workloadPercentage - b.workloadPercentage;
    return b.successRate - a.successRate;
  });

  const selectedOfficer = officers.find((o) => o.id === selectedId);

  const handleConfirm = () => {
    if (!selectedId) return;
    onAssign(selectedId);
    setSelectedId(null);
    setShowConfirm(false);
  };

  const handleClose = () => {
    setSelectedId(null);
    setShowConfirm(false);
    onClose();
  };

  const SORT_TABS: { key: SortOption; label: string }[] = [
    { key: 'rating', label: 'Rating' },
    { key: 'workload', label: 'Workload' },
    { key: 'success', label: 'Success' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
          {/* Inline confirm overlay — avoids nested Modal which hangs on iOS */}
          {showConfirm && (
            <View style={styles.inlineConfirmOverlay}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowConfirm(false)}
              />
              <View
                className="w-full items-center rounded-3xl p-6"
                style={[styles.confirmCard, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
                <View
                  className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor:
                      mode === 'reassign'
                        ? isDark
                          ? '#451A03'
                          : '#FEF3C7'
                        : isDark
                          ? '#0F3D3D'
                          : '#CCFBF1',
                  }}>
                  {mode === 'reassign' ? (
                    <RefreshCw color="#D97706" size={30} strokeWidth={2} />
                  ) : (
                    <UserCheck color="#0F766E" size={30} strokeWidth={2} />
                  )}
                </View>

                <Text className="mb-2 text-center text-[19px] font-extrabold text-slate-800 dark:text-slate-100">
                  {mode === 'reassign' ? 'Confirm Reassignment' : 'Confirm Assignment'}
                </Text>

                {selectedOfficer && (
                  <>
                    <View className="mb-3 mt-1 flex-row items-center gap-2">
                      {selectedOfficer.avatar ? (
                        <Image
                          source={{ uri: selectedOfficer.avatar }}
                          style={styles.confirmAvatar}
                        />
                      ) : (
                        <View
                          className="h-9 w-9 items-center justify-center rounded-full"
                          style={{ backgroundColor: isDark ? '#134E4A' : '#CCFBF1' }}>
                          <Text className="text-[13px] font-extrabold text-teal-600 dark:text-teal-300">
                            {getInitials(selectedOfficer.name)}
                          </Text>
                        </View>
                      )}
                      <Text className="text-[16px] font-extrabold text-slate-700 dark:text-slate-200">
                        {selectedOfficer.name}
                      </Text>
                    </View>

                    <View className="mb-4 flex-row items-center gap-3">
                      <View className="flex-row items-center gap-1">
                        <Star color="#F59E0B" size={13} fill="#F59E0B" strokeWidth={2} />
                        <Text className="text-[13px] font-bold text-amber-500">
                          {selectedOfficer.rating.toFixed(1)}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <TrendingUp color="#059669" size={13} strokeWidth={2.5} />
                        <Text className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {selectedOfficer.successRate}%
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Briefcase
                          color={isDark ? '#64748B' : '#94A3B8'}
                          size={12}
                          strokeWidth={2}
                        />
                        <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                          {selectedOfficer.activeIssues} active
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                <Text className="mb-5 text-center text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                  {mode === 'reassign'
                    ? 'The issue will be reassigned to this officer and the timeline will be updated.'
                    : 'The issue will be assigned to this officer and they will be notified.'}
                </Text>

                <View className="w-full flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setShowConfirm(false)}
                    activeOpacity={0.8}
                    className="flex-1 items-center justify-center rounded-2xl py-3.5"
                    style={{
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderWidth: 1.5,
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    }}>
                    <Text className="text-[15px] font-bold text-slate-500 dark:text-slate-400">
                      Go Back
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3.5"
                    style={{ backgroundColor: mode === 'reassign' ? '#D97706' : '#0F766E' }}>
                    {mode === 'reassign' ? (
                      <RefreshCw color="#FFFFFF" size={15} strokeWidth={2.5} />
                    ) : (
                      <UserCheck color="#FFFFFF" size={15} strokeWidth={2.5} />
                    )}
                    <Text className="text-[15px] font-extrabold text-white">
                      {mode === 'reassign' ? 'Reassign' : 'Assign'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          {/* Drag handle */}
          <View
            className="mb-1 mt-3 h-1 w-10 self-center rounded-full"
            style={{ backgroundColor: isDark ? '#334155' : '#E2E8F0' }}
          />

          {/* Header */}
          <View
            className="flex-row items-center px-5 py-4"
            style={[styles.borderBottom, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <View
              className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: isDark ? '#0F3D3D' : '#CCFBF1' }}>
              {mode === 'reassign' ? (
                <RefreshCw color="#0F766E" size={19} strokeWidth={2.5} />
              ) : (
                <UserCheck color="#0F766E" size={19} strokeWidth={2.5} />
              )}
            </View>

            <View className="flex-1">
              <Text className="text-[17px] font-extrabold text-slate-800 dark:text-slate-100">
                {mode === 'reassign' ? 'Reassign Officer' : 'Assign Field Officer'}
              </Text>
              {mode === 'reassign' && currentOfficerName ? (
                <Text className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">
                  Currently: {currentOfficerName}
                </Text>
              ) : (
                <Text className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">
                  {officers.length} officers available
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}>
              <X color={isDark ? '#94A3B8' : '#64748B'} size={17} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Sort bar */}
          <View
            className="flex-row items-center gap-2 px-5 py-3"
            style={[styles.borderBottom, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <BarChart2 color={isDark ? '#64748B' : '#94A3B8'} size={14} strokeWidth={2.5} />
            <Text className="mr-1 text-[12px] font-bold text-slate-400 dark:text-slate-500">
              Sort by
            </Text>
            {SORT_TABS.map((tab) => {
              const active = sortBy === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setSortBy(tab.key)}
                  activeOpacity={0.75}
                  className="rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: active
                      ? isDark
                        ? '#134E4A'
                        : '#CCFBF1'
                      : isDark
                        ? '#1E293B'
                        : '#F1F5F9',
                    borderWidth: 1,
                    borderColor: active
                      ? isDark
                        ? '#0F766E'
                        : '#99F6E4'
                      : isDark
                        ? '#334155'
                        : '#E2E8F0',
                  }}>
                  <Text
                    className="text-[12px] font-bold"
                    style={{
                      color: active
                        ? isDark
                          ? '#2DD4BF'
                          : '#0F766E'
                        : isDark
                          ? '#64748B'
                          : '#94A3B8',
                    }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Officer list */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled">
            {sorted.map((officer) => {
              const isSelected = selectedId === officer.id;
              const isOverloaded = officer.workloadPercentage >= 100;

              return (
                <TouchableOpacity
                  key={officer.id}
                  onPress={() => !isOverloaded && setSelectedId(officer.id)}
                  activeOpacity={isOverloaded ? 1 : 0.75}
                  style={[
                    styles.card,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? '#0D3330'
                          : '#F0FDFA'
                        : isDark
                          ? '#1E293B'
                          : '#FFFFFF',
                      borderColor: isSelected
                        ? isDark
                          ? '#0F766E'
                          : '#5EEAD4'
                        : isDark
                          ? '#334155'
                          : '#E2E8F0',
                      opacity: isOverloaded ? 0.45 : 1,
                    },
                  ]}>
                  {/* Top row: avatar + name + select indicator */}
                  <View className="flex-row items-start gap-3">
                    {/* Avatar */}
                    <View style={styles.avatarWrap}>
                      {officer.avatar ? (
                        <Image source={{ uri: officer.avatar }} style={styles.avatarImg} />
                      ) : (
                        <View
                          className="h-full w-full items-center justify-center"
                          style={{ backgroundColor: isDark ? '#134E4A' : '#CCFBF1' }}>
                          <Text className="text-[16px] font-extrabold text-teal-600 dark:text-teal-300">
                            {getInitials(officer.name)}
                          </Text>
                        </View>
                      )}
                      {/* Recommended dot */}
                      {officer.recommended && <View style={styles.recommendedDot} />}
                    </View>

                    {/* Name + rating + overloaded */}
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text
                          className="mr-2 flex-1 text-[15px] font-extrabold text-slate-800 dark:text-slate-100"
                          numberOfLines={1}>
                          {officer.name}
                        </Text>
                        {isOverloaded ? (
                          <View
                            className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                            style={{ backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }}>
                            <CircleAlert color="#EF4444" size={10} strokeWidth={2.5} />
                            <Text className="text-[11px] font-bold text-red-500">Full</Text>
                          </View>
                        ) : isSelected ? (
                          <CheckCircle2
                            color={isDark ? '#2DD4BF' : '#0F766E'}
                            size={20}
                            strokeWidth={2.5}
                          />
                        ) : null}
                      </View>

                      {/* Rating row */}
                      <View className="mt-1 flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <Star color="#F59E0B" size={12} fill="#F59E0B" strokeWidth={2} />
                          <Text className="text-[13px] font-bold text-amber-500">
                            {officer.rating.toFixed(1)}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <TrendingUp
                            color={isDark ? '#10B981' : '#059669'}
                            size={12}
                            strokeWidth={2.5}
                          />
                          <Text className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {officer.successRate}%
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Briefcase
                            color={isDark ? '#64748B' : '#94A3B8'}
                            size={11}
                            strokeWidth={2}
                          />
                          <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                            {officer.activeIssues} active
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Specialisations */}
                  {officer.specializations && officer.specializations.length > 0 && (
                    <View className="mt-3 flex-row flex-wrap gap-1.5">
                      {officer.specializations.map((spec, i) => (
                        <View
                          key={i}
                          className="rounded-full px-2.5 py-1"
                          style={{
                            backgroundColor: isDark ? '#0C2A3F' : '#EFF6FF',
                            borderWidth: 1,
                            borderColor: isDark ? '#1E3A5F' : '#BFDBFE',
                          }}>
                          <Text className="text-[11px] font-bold text-blue-600 dark:text-blue-300">
                            {spec}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Workload bar */}
                  <WorkloadBar pct={officer.workloadPercentage} isDark={isDark} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View
            className="flex-row gap-3 px-5 pb-8 pt-3.5"
            style={[styles.borderTop, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.8}
              className="flex-1 items-center justify-center rounded-2xl py-4"
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderWidth: 1.5,
                borderColor: isDark ? '#334155' : '#E2E8F0',
              }}>
              <Text
                className="text-[15px] font-bold"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => selectedId && setShowConfirm(true)}
              disabled={!selectedId}
              activeOpacity={selectedId ? 0.85 : 1}
              className="flex-row items-center justify-center gap-2 rounded-2xl py-4"
              style={[
                styles.assignFlex,
                {
                  backgroundColor: selectedId
                    ? mode === 'reassign'
                      ? '#D97706'
                      : '#0F766E'
                    : isDark
                      ? '#1E293B'
                      : '#F1F5F9',
                  borderWidth: 1.5,
                  borderColor: selectedId
                    ? mode === 'reassign'
                      ? '#D97706'
                      : '#0F766E'
                    : isDark
                      ? '#334155'
                      : '#E2E8F0',
                },
              ]}>
              {mode === 'reassign' ? (
                <RefreshCw
                  color={selectedId ? '#FFFFFF' : isDark ? '#475569' : '#CBD5E1'}
                  size={16}
                  strokeWidth={2.5}
                />
              ) : (
                <UserCheck
                  color={selectedId ? '#FFFFFF' : isDark ? '#475569' : '#CBD5E1'}
                  size={16}
                  strokeWidth={2.5}
                />
              )}
              <Text
                className="text-[15px] font-extrabold"
                style={{ color: selectedId ? '#FFFFFF' : isDark ? '#475569' : '#CBD5E1' }}>
                {mode === 'reassign' ? 'Reassign' : 'Assign Officer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  borderBottom: {
    borderBottomWidth: 1,
  },
  borderTop: {
    borderTopWidth: 1,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  recommendedDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  assignFlex: {
    flex: 1.5,
  },
  inlineConfirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  confirmCard: {
    maxWidth: 380,
    width: '100%',
  },
  confirmAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
