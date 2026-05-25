import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Platform } from 'react-native';
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
}

export default function DuplicateDetectionBanner({
  groups,
  onGroupResolved,
}: DuplicateDetectionBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);

  const isDark = useColorScheme() === 'dark';

  const activeGroups = groups.filter((g) => !g.resolved);
  if (activeGroups.length === 0) return null;

  const handleMerge = (keepIssue: Issue, deleteIssueId: string, groupId: string) => {
    onGroupResolved(groupId);
    setSelectedGroup(null);
  };

  const handleReject = (issueIds: string[] | string, groupId: string) => {
    onGroupResolved(groupId);
    setSelectedGroup(null);
  };

  return (
    <View className="mb-6">
      {/* Outer shadow wrapper for radiant ambient glow */}
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

      {selectedGroup && (
        <DuplicateMergeModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onMerge={(keepIssue, deleteId) => handleMerge(keepIssue, deleteId, selectedGroup.id)}
          onReject={(issueIds) => handleReject(issueIds, selectedGroup.id)}
        />
      )}
    </View>
  );
}
