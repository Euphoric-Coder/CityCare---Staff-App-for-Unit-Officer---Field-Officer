import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TriangleAlert as AlertTriangle,
  ChevronRight,
  ChevronDown,
  User,
  Copy,
  Zap,
  MapPin,
  ChevronUp,
  Droplets,
  Trash2,
  Recycle,
  Package,
  HeartPulse,
  MoreHorizontal,
  Tag,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { DuplicateGroup, Issue } from 'lib/types';
import DuplicateMergeModal from './DuplicateMergeModal';

const CATEGORIES = [
  { value: "road", label: "Road & Infrastructure", icon: MapPin, color: "text-blue-600 dark:text-blue-400" },
  { value: "electricity", label: "Electricity & Lighting", icon: Zap, color: "text-yellow-600 dark:text-yellow-400" },
  { value: "water", label: "Water Supply", icon: Droplets, color: "text-cyan-600 dark:text-cyan-400" },
  { value: "sanitation", label: "Sanitation & Waste", icon: Trash2, color: "text-green-600 dark:text-green-400" },
  { value: "drainage", label: "Drainage & Sewer", icon: Recycle, color: "text-purple-600 dark:text-purple-400" },
  { value: "solid_waste", label: "Solid Waste Management", icon: Package, color: "text-orange-600 dark:text-orange-400" },
  { value: "public_health", label: "Public Health", icon: HeartPulse, color: "text-red-600 dark:text-red-400" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "text-gray-600 dark:text-gray-400" },
];

interface DuplicateDetectionBannerProps {
  groups: DuplicateGroup[];
  onGroupResolved: (groupId: string) => void;
  onReject: (issueIds: string[], groupId: string) => Promise<void>;
}

export default function DuplicateDetectionBanner({
  groups,
  onGroupResolved,
  onReject,
}: DuplicateDetectionBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    visible: boolean;
    success: boolean;
    title: string;
    message: string;
  }>({ visible: false, success: true, title: '', message: '' });

  const isDark = useColorScheme() === 'dark';

  const activeGroups = groups.filter((g) => !g.resolved);

  const premiumStatusDialog = (
    <Modal
      visible={rejectDialog.visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setRejectDialog((prev) => ({ ...prev, visible: false }))}
    >
      <View className="flex-1 items-center justify-center bg-slate-950/60 p-8">
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={() => setRejectDialog((prev) => ({ ...prev, visible: false }))}
        />

        <View
          style={{
            borderColor: isDark
              ? rejectDialog.success
                ? 'rgba(16,185,129,0.25)'
                : 'rgba(239,68,68,0.25)'
              : rejectDialog.success
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(239,68,68,0.15)',
            borderWidth: 1.5,
            shadowColor: rejectDialog.success ? '#10B981' : '#EF4444',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: isDark ? 0.4 : 0.15,
            shadowRadius: 40,
            elevation: 25,
            width: '100%',
            maxWidth: 360,
            borderRadius: 36,
            overflow: 'hidden',
            backgroundColor: isDark ? '#0f172a' : '#FFFFFF',
          }}
        >
          <LinearGradient
            colors={
              isDark
                ? rejectDialog.success
                  ? ['#064E3B', '#0f172a']
                  : ['#7F1D1D', '#0f172a']
                : rejectDialog.success
                  ? ['#ECFDF5', '#FFFFFF']
                  : ['#FEF2F2', '#FFFFFF']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 36, paddingHorizontal: 28, alignItems: 'center' }}
          >
            {/* Icon */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 22,
                backgroundColor: rejectDialog.success
                  ? isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5'
                  : isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              {rejectDialog.success ? (
                <CheckCircle
                  size={32}
                  color={isDark ? '#34D399' : '#059669'}
                  strokeWidth={2.5}
                />
              ) : (
                <XCircle
                  size={32}
                  color={isDark ? '#F87171' : '#DC2626'}
                  strokeWidth={2.5}
                />
              )}
            </View>

            {/* Title */}
            <Text
              className="text-center text-[18px] font-black tracking-tight mb-2"
              style={{
                color: rejectDialog.success
                  ? isDark ? '#34D399' : '#065F46'
                  : isDark ? '#F87171' : '#991B1B',
              }}
            >
              {rejectDialog.title}
            </Text>

            {/* Message */}
            <Text
              className="text-center text-[14px] font-semibold leading-[20px] mb-7"
              style={{
                color: isDark ? '#94A3B8' : '#64748B',
              }}
            >
              {rejectDialog.message}
            </Text>

            {/* Dismiss Button */}
            <TouchableOpacity
              onPress={() => setRejectDialog((prev) => ({ ...prev, visible: false }))}
              activeOpacity={0.85}
              style={{
                width: '100%',
                borderRadius: 16,
                overflow: 'hidden',
                shadowColor: rejectDialog.success ? '#10B981' : '#EF4444',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isDark ? 0.4 : 0.2,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <LinearGradient
                colors={
                  rejectDialog.success
                    ? ['#10B981', '#059669']
                    : ['#EF4444', '#DC2626']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text className="text-[15px] font-black tracking-wide text-white">
                  {rejectDialog.success ? 'Done' : 'Dismiss'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );

  // If there are no groups and the dialog is not visible, we can safely render nothing.
  if (activeGroups.length === 0 && !rejectDialog.visible) return null;

  const handleMerge = (keepIssue: string, deleteIssueIds: string[], groupId: string) => {
    console.log("Selected Merge: ", keepIssue);
    console.log("Delete IDs: ", deleteIssueIds);
    console.log("Group ID: ", groupId);
    // onGroupResolved(groupId);
    // setSelectedGroup(null);
  };

  const handleReject = async (issueIds: string[], groupId: string) => {
    try {
      await onReject(issueIds, groupId);
      setRejectDialog({
        visible: true,
        success: true,
        title: 'Duplicate Issues Rejected',
        message: `${issueIds.length} duplicate issue${issueIds.length > 1 ? 's have' : ' has'} been rejected successfully.`,
      });
      onGroupResolved(groupId);
      setSelectedGroup(null);
    } catch (error) {
      console.error('Duplicate rejection failed:', error);
      setRejectDialog({
        visible: true,
        success: false,
        title: 'Rejection Failed',
        message: 'Failed to reject duplicate issues. Please try again.',
      });
    }
  };

  return (
    <View className={activeGroups.length > 0 ? "mb-6" : ""}>
      {activeGroups.length > 0 && (
        <View
          style={{
            shadowColor: isDark ? '#000000' : '#D97706',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.4 : 0.2,
            shadowRadius: 12,
            elevation: 8,
            borderRadius: 24,
            backgroundColor: Platform.OS === 'android' ? (isDark ? '#250E02' : '#FFFBEB') : undefined,
          }}>
          <View className="relative overflow-hidden rounded-[24px] border-[1.5px] border-amber-300/60 dark:border-amber-600/50 bg-transparent">
            {/* Dynamic Rich Background Gradient */}
            <LinearGradient
              colors={isDark ? ['#451A03', '#250E02'] : ['#FFFBEB', '#FEF3C7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

          {/* Premium Specular Glass Highlight */}
          <LinearGradient
            colors={
              isDark
                ? ['rgba(255,255,255,0.15)', 'transparent']
                : ['rgba(251, 251, 227, 0.4)', 'transparent']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60 }}
          />

          <View className="flex-1 p-5">
            {/* Intelligence Header */}
            <TouchableOpacity
              onPress={() => setExpanded((v) => !v)}
              activeOpacity={0.85}
              className="flex-row items-center gap-4">
              {/* Deep Glass Icon Well */}
              <View className="h-12 w-12 items-center justify-center rounded-[16px] bg-amber-500/20">
                <View className="absolute inset-0 rounded-[16px] border-[1.5px] border-white/40 dark:border-white/10" />
                <AlertTriangle color={isDark ? '#FCD34D' : '#D97706'} size={24} strokeWidth={2.5} />
              </View>

              <View className="flex-1 justify-center pr-2">
                <View className="mb-0.5 flex-row items-center gap-2">
                  <Text className="flex-1 text-[15px] font-black tracking-tight text-amber-900 dark:text-amber-100">
                    Potential Duplicates
                  </Text>

                  {/* Glowing Micro-Badge */}
                  <View
                    className="items-center justify-center rounded-full bg-amber-500 px-2 py-0.5"
                    style={{
                      shadowColor: isDark ? '#000000' : '#D97706',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDark ? 0.5 : 0.35,
                      shadowRadius: 4,
                      elevation: 3,
                    }}>
                    <Text className="text-[11px] font-black text-white">{activeGroups.length}</Text>
                  </View>
                </View>

                <Text className="text-[13px] font-bold tracking-tight text-amber-700/80 dark:text-amber-400/80">
                  {activeGroups.length === 1
                    ? '1 group detected · Same citizen'
                    : `${activeGroups.length} groups detected · Similar reports`}
                </Text>
              </View>

              {/* Rotatable Toggle */}
              <View className="h-8 w-8 items-center justify-center rounded-full bg-amber-200/50 dark:bg-amber-900/50">
                {expanded ? (
                  <ChevronUp size={18} color={isDark ? '#FCD34D' : '#D97706'} strokeWidth={4} />
                ) : (
                  <ChevronDown size={18} color={isDark ? '#FCD34D' : '#D97706'} strokeWidth={4} />
                )}
              </View>
            </TouchableOpacity>

            {/* Expanded Nested Glass Cards */}
            {expanded && (
              <View className="mt-5 gap-3">
                {activeGroups.map((group, idx) => (
                  <View key={group.id}>
                    {idx > 0 && (
                      <View className="mb-3 h-[1.5px] w-full bg-amber-200/50 dark:bg-amber-900/40" />
                    )}

                    {/* Nested Glass Card */}
                    <View className="rounded-[20px] border-[2px] border-amber-400/60 bg-amber-50/80 p-3.5 dark:border-amber-500/50 dark:bg-amber-950/40">
                      <View className="flex-row items-start">
                        <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-amber-100/80 dark:bg-amber-900/60">
                          <User
                            color={isDark ? '#FCD34D' : '#D97706'}
                            size={20}
                            strokeWidth={2.5}
                          />
                        </View>

                        <View className="ml-3 flex-1 pr-1">
                          <View className="mb-1 flex-row flex-wrap items-center">
                            <Text className="text-[15px] font-black tracking-tight text-amber-900 dark:text-amber-100">
                              {group.citizenName}
                            </Text>

                            <View className="ml-2 flex-row items-center rounded-md bg-amber-200/70 px-1.5 py-0.5 dark:bg-amber-900/80">
                              <Copy
                                color={isDark ? '#FCD34D' : '#D97706'}
                                size={10}
                                strokeWidth={2.5}
                              />
                              <Text className="ml-1 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                {group.issues.length} issues
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row items-center gap-1.5 mt-0.5">
                            {(() => {
                              const catValue = group.issues[0].category;
                              const cat = CATEGORIES.find((c) => c.value === catValue);
                              const label = cat ? cat.label : catValue;
                              const IconCmp = cat ? cat.icon : Tag;
                              return (
                                <>
                                  <IconCmp size={12} color={isDark ? '#FBBF24' : '#92400E'} strokeWidth={2.5} />
                                  <Text className="text-[12px] font-bold tracking-tight text-amber-800/90 dark:text-amber-400">
                                    {label}
                                  </Text>
                                </>
                              );
                            })()}
                          </View>
                        </View>
                      </View>

                      {/* Full Location Details Container */}
                      <View className="mt-3 flex-row items-start rounded-[12px] bg-amber-100/50 p-2.5 dark:bg-amber-950/40">
                        <MapPin
                          color={isDark ? '#FCD34D' : '#D97706'}
                          size={14}
                          style={{ marginTop: 1 }}
                        />
                        <Text className="ml-2 flex-1 text-[12px] font-bold leading-[18px] text-amber-800/80 dark:text-amber-500/90">
                          {group.issues[0].location}
                        </Text>
                      </View>

                      {/* Glowing Full-Width Resolve Button */}
                      <View
                        className="mt-3"
                        style={{
                          shadowColor: isDark ? '#000000' : '#D97706',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isDark ? 0.4 : 0.2,
                          shadowRadius: 8,
                          elevation: 4,
                          borderRadius: 14,
                          backgroundColor: Platform.OS === 'android' ? (isDark ? '#D97706' : '#F59E0B') : undefined,
                        }}>
                        <TouchableOpacity
                          onPress={() => setSelectedGroup(group)}
                          activeOpacity={0.85}
                          className="overflow-hidden rounded-[14px]">
                          <LinearGradient
                            colors={['#F59E0B', '#D97706']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                            <Zap color="#FFFFFF" size={14} fill="#FFFFFF" />
                            <Text className="ml-1.5 text-[14px] font-black tracking-tight text-white">
                              Resolve Duplicates
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
      )}

      {selectedGroup && activeGroups.length > 0 && (
        <DuplicateMergeModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onMerge={(keepIssue: string, deleteIds: string[], groupId: string) => handleMerge(keepIssue as string, deleteIds as string[], groupId as string)}
          onReject={(issueIds: string[], groupId: string) => handleReject(issueIds as string[], groupId as string)}
        />
      )}

      {premiumStatusDialog}
    </View>
  );
}
