import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  Layers,
  ClipboardList,
  Activity,
  ShieldCheck,
  Wrench,
  ChevronDown,
  X,
} from 'lucide-react-native';

interface SimpleFilterBarProps {
  filters: string[];
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  counts?: Record<string, number>;
}

const FILTER_META: Record<
  string,
  {
    icon: any;
    label: string;
    dot: string;
    shadowColor: string;
  }
> = {
  all: {
    icon: Layers,
    label: 'All Tasks',
    dot: '#3B82F6',
    shadowColor: '#3B82F6',
  },
  assigned: {
    icon: ClipboardList,
    label: 'Assigned',
    dot: '#0D9488',
    shadowColor: '#0D9488',
  },
  in_progress: {
    icon: Activity,
    label: 'In Progress',
    dot: '#F59E0B',
    shadowColor: '#F59E0B',
  },
  pending_uo_verification: {
    icon: ShieldCheck,
    label: 'Verification',
    dot: '#6366F1',
    shadowColor: '#6366F1',
  },
  rework_required: {
    icon: Wrench,
    label: 'Rework',
    dot: '#DC2626',
    shadowColor: '#DC2626',
  },
};

export default function SimpleFilterBar({
  filters,
  selectedFilter,
  onFilterChange,
  counts,
}: SimpleFilterBarProps) {
  const isDark = useColorScheme() === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  const activeMeta = FILTER_META[selectedFilter] ?? FILTER_META.all;
  const ActiveIcon = activeMeta.icon;
  const activeCount = counts?.[selectedFilter];

  const handleSelect = (filter: string) => {
    onFilterChange(filter);
    setIsOpen(false);
  };

  const handleReset = () => {
    onFilterChange('all');
  };

  return (
    <View className="z-50 px-4 pt-3 pb-2 bg-transparent">
      <View className="mb-2 px-1">
        <Text className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
          Filter Tasks By Status
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsOpen(true)}
          style={[
            {
              shadowColor: activeMeta.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.2 : 0.08,
              shadowRadius: 8,
              elevation: 3,
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark
                ? selectedFilter === 'all'
                  ? '#334155'
                  : activeMeta.dot + '60'
                : selectedFilter === 'all'
                  ? '#E2E8F0'
                  : activeMeta.dot + '50',
            },
          ]}
          className="flex-1 flex-row items-center justify-between rounded-2xl border px-3.5 py-3 transition-all">
          <View className="flex-row items-center gap-3">
            <View
              style={{
                backgroundColor: activeMeta.dot + (isDark ? '25' : '15'),
                borderColor: activeMeta.dot + (isDark ? '45' : '30'),
                borderWidth: 1,
              }}
              className="h-8 w-8 items-center justify-center rounded-xl">
              <ActiveIcon size={16} strokeWidth={2.5} color={activeMeta.dot} />
            </View>
            <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
              {activeMeta.label}
            </Text>
            {activeCount !== undefined && activeCount > 0 && (
              <View
                className="ml-1.5 h-[22px] min-w-[22px] items-center justify-center rounded-full px-2"
                style={{
                  backgroundColor: activeMeta.dot + (isDark ? '25' : '15'),
                  borderWidth: 1,
                  borderColor: activeMeta.dot + (isDark ? '45' : '30'),
                }}>
                <Text
                  style={{ color: activeMeta.dot }}
                  className="text-[11px] font-black">
                  {activeCount}
                </Text>
              </View>
            )}
          </View>
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700/60">
            <ChevronDown size={16} strokeWidth={2.5} color={isDark ? '#94A3B8' : '#64748B'} />
          </View>
        </TouchableOpacity>

        {selectedFilter !== 'all' && (
          <TouchableOpacity
            onPress={handleReset}
            activeOpacity={0.7}
            className="ml-2.5 h-[50px] w-[50px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800/90">
            <X size={18} strokeWidth={2.5} color={isDark ? '#CBD5E1' : '#64748B'} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}>
          <TouchableWithoutFeedback>
            <View className="w-full rounded-[28px] border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <View className="mb-2 flex-row items-center justify-between border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                <Text className="text-[12px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  Filter Tasks by Status
                </Text>
                <TouchableOpacity
                  onPress={() => setIsOpen(false)}
                  className="h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <X size={14} strokeWidth={2.5} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {filters.map((filter) => {
                const isSelected = selectedFilter === filter;
                const meta = FILTER_META[filter] ?? FILTER_META.all;
                const count = counts?.[filter];
                const Icon = meta.icon;

                return (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => handleSelect(filter)}
                    activeOpacity={0.7}
                    style={
                      isSelected
                        ? {
                            backgroundColor: isDark
                              ? 'rgba(30, 41, 59, 0.95)'
                              : 'rgba(241, 245, 249, 0.95)',
                            borderColor: isDark ? meta.dot + '60' : meta.dot + '50',
                            borderWidth: 1.5,
                          }
                        : {
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            borderWidth: 1.5,
                          }
                    }
                    className="mb-1.5 flex-row items-center justify-between rounded-2xl px-3.5 py-3.5">
                    <View className="flex-row items-center gap-3">
                      <View
                        style={{
                          backgroundColor: meta.dot + (isDark ? '25' : '15'),
                          borderColor: isSelected ? meta.dot : meta.dot + '30',
                          borderWidth: 1,
                        }}
                        className="h-8 w-8 items-center justify-center rounded-xl">
                        <Icon
                          size={16}
                          strokeWidth={isSelected ? 2.8 : 2.2}
                          color={meta.dot}
                        />
                      </View>
                      <Text
                        className={`text-[15px] tracking-tight ${
                          isSelected
                            ? 'font-extrabold text-slate-900 dark:text-white'
                            : 'font-semibold text-slate-600 dark:text-slate-300'
                        }`}>
                        {meta.label}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      {count !== undefined && count > 0 && (
                        <View
                          className="h-[22px] min-w-[22px] items-center justify-center rounded-full px-2"
                          style={{
                            backgroundColor: isSelected
                              ? meta.dot + (isDark ? '30' : '20')
                              : isDark
                                ? 'rgba(51, 65, 85, 0.6)'
                                : 'rgba(241, 245, 249, 1)',
                            borderWidth: isSelected ? 1 : 0,
                            borderColor: meta.dot + (isDark ? '50' : '30'),
                          }}>
                          <Text
                            style={{
                              color: isSelected
                                ? meta.dot
                                : isDark
                                  ? '#94A3B8'
                                  : '#64748B',
                            }}
                            className="text-[11px] font-black">
                            {count}
                          </Text>
                        </View>
                      )}
                      {isSelected && (
                        <View
                          style={{ backgroundColor: meta.dot }}
                          className="ml-1 h-2 w-2 rounded-full"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
