import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TriangleAlert as AlertTriangle,
  ChevronRight,
  ChevronDown,
  User,
  Copy,
  Zap,
} from 'lucide-react-native';
import { DuplicateGroup, Issue } from '../lib/types';
import DuplicateMergeModal from './DuplicateMergeModal';

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

  const handleReject = (issueId: string, groupId: string) => {
    onGroupResolved(groupId);
    setSelectedGroup(null);
  };

  return (
    <>
      <View className="mb-1 overflow-hidden rounded-2xl" style={styles.shadow}>
        <LinearGradient
          colors={isDark ? ['#1C1500', '#181000'] : ['#FFFBEB', '#FEF9ED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBase}
        />

        <View
          className="overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-900/60"
          style={styles.innerWrap}>
          {/* Accent */}
          <View className="w-1 bg-amber-400 dark:bg-amber-500" />

          <View className="flex-1 p-3.5">
            {/* Header */}
            <TouchableOpacity
              onPress={() => setExpanded((v) => !v)}
              activeOpacity={0.85}
              className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/80">
                <AlertTriangle color="#F59E0B" size={17} strokeWidth={2.5} />
              </View>

              <View className="flex-1">
                <View className="mb-0.5 flex-row items-center gap-2">
                  <Text className="flex-1 text-[13px] font-extrabold text-amber-900 dark:text-amber-200">
                    Potential Duplicate Issues Detected
                  </Text>

                  <View className="h-[22px] min-w-[22px] items-center justify-center rounded-full bg-amber-400 px-1.5">
                    <Text className="text-[10px] font-extrabold text-white">
                      {activeGroups.length}
                    </Text>
                  </View>
                </View>

                <Text className="text-[11px] font-medium text-amber-700 dark:text-amber-600">
                  {activeGroups.length === 1
                    ? '1 group · same citizen'
                    : `${activeGroups.length} groups · similar reports`}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Text className="text-[12px] font-bold text-amber-600 dark:text-amber-400">
                  {expanded ? 'Hide' : 'Review'}
                </Text>
                {expanded ? (
                  <ChevronDown size={14} color="#D97706" />
                ) : (
                  <ChevronRight size={14} color="#D97706" />
                )}
              </View>
            </TouchableOpacity>

            {/* Expanded */}
            {expanded && (
              <View className="mt-3 gap-2">
                {activeGroups.map((group, idx) => (
                  <View key={group.id}>
                    {idx > 0 && <View className="mb-2 h-px bg-amber-100 dark:bg-amber-900/40" />}

                    {/* ROW */}
                    <View className="flex-row items-center rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/50">
                      {/* ICON */}
                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/60">
                        <User color="#F59E0B" size={13} />
                      </View>

                      {/* TEXT */}
                      <View className="ml-2.5 flex-1 pr-3">
                        <View className="flex-row flex-wrap items-center">
                          <Text className="text-[13px] font-bold text-amber-900 dark:text-amber-200">
                            {group.citizenName}
                          </Text>

                          <View className="ml-1.5 flex-row items-center rounded-md bg-amber-100 px-1.5 py-0.5 dark:bg-amber-900/50">
                            <Copy color="#F59E0B" size={8} />
                            <Text className="ml-1 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                              {group.issues.length} issues
                            </Text>
                          </View>
                        </View>

                        <Text
                          className="mt-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-700"
                          numberOfLines={1}>
                          {group.issues[0].category} · {group.issues[0].location.split(',')[0]}
                        </Text>
                      </View>

                      {/* ✅ FIXED RESOLVE BUTTON */}
                      <TouchableOpacity
                        onPress={() => setSelectedGroup(group)}
                        activeOpacity={0.85}
                        className="self-center overflow-hidden rounded-xl">
                        <LinearGradient
                          colors={['#F59E0B', '#D97706']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            minHeight: 38,
                            paddingHorizontal: 14,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <View style={{ marginRight: 6 }}>
                            <Zap color="#FFFFFF" size={12} />
                          </View>

                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 12,
                              fontWeight: '700',
                              lineHeight: 16,
                              includeFontPadding: false,
                            }}>
                            Resolve
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
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
          onReject={(issueId) => handleReject(issueId, selectedGroup.id)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  gradientBase: {
    ...StyleSheet.absoluteFillObject,
  },
  innerWrap: {
    flexDirection: 'row',
  },
});
