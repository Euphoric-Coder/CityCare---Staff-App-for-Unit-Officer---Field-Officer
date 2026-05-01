import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Modal, TouchableWithoutFeedback } from 'react-native';
import {
  Layers,
  ClipboardList,
  Activity,
  ShieldCheck,
  Wrench,
  ChevronDown,
  X
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
    activeBg: string;
    activeDark: string;
    activeText: string;
    activeDarkText: string;
    shadowColor: string;
  }
> = {
  all: {
    icon: Layers,
    label: 'All Tasks',
    dot: '#3B82F6',
    activeBg: 'bg-blue-50 border-blue-200/60',
    activeDark: 'dark:bg-blue-900/40 dark:border-blue-800/60',
    activeText: 'text-blue-700',
    activeDarkText: 'dark:text-blue-300',
    shadowColor: '#3B82F6',
  },
  assigned: {
    icon: ClipboardList,
    label: 'Assigned',
    dot: '#0D9488',
    activeBg: 'bg-teal-50 border-teal-200/60',
    activeDark: 'dark:bg-teal-900/40 dark:border-teal-800/60',
    activeText: 'text-teal-700',
    activeDarkText: 'dark:text-teal-300',
    shadowColor: '#0D9488',
  },
  in_progress: {
    icon: Activity,
    label: 'In Progress',
    dot: '#F59E0B',
    activeBg: 'bg-amber-50 border-amber-200/60',
    activeDark: 'dark:bg-amber-900/40 dark:border-amber-800/60',
    activeText: 'text-amber-700',
    activeDarkText: 'dark:text-amber-300',
    shadowColor: '#F59E0B',
  },
  pending_uo_verification: {
    icon: ShieldCheck,
    label: 'Verification',
    dot: '#6366F1',
    activeBg: 'bg-indigo-50 border-indigo-200/60',
    activeDark: 'dark:bg-indigo-900/40 dark:border-indigo-800/60',
    activeText: 'text-indigo-700',
    activeDarkText: 'dark:text-indigo-300',
    shadowColor: '#6366F1',
  },
  rework_required: {
    icon: Wrench,
    label: 'Rework',
    dot: '#DC2626',
    activeBg: 'bg-red-50 border-red-200/60',
    activeDark: 'dark:bg-red-900/40 dark:border-red-800/60',
    activeText: 'text-red-700',
    activeDarkText: 'dark:text-red-300',
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
    <View className="z-50 border-b border-slate-100 bg-white/95 px-4 py-4 dark:border-slate-800/50 dark:bg-[#0B1120]">
      <View className="mb-2.5 px-1">
        <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
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
              shadowOpacity: isDark ? 0.3 : 0.15,
              shadowRadius: 8,
              elevation: 4,
            }
          ]}
          className={`flex-1 flex-row items-center justify-between rounded-2xl border px-4 py-3.5 transition-all ${activeMeta.activeBg} ${activeMeta.activeDark}`}
        >
          <View className="flex-row items-center gap-3">
            <ActiveIcon 
              size={18} 
              strokeWidth={3} 
              color={activeMeta.dot} 
            />
            <Text
              className={`text-[15px] font-black tracking-wide ${activeMeta.activeText} ${activeMeta.activeDarkText}`}>
              {activeMeta.label}
            </Text>
            {activeCount !== undefined && activeCount > 0 && (
              <View
                className="ml-1 items-center justify-center rounded-full h-[22px] min-w-[22px] px-1.5"
                style={{ backgroundColor: activeMeta.dot + (isDark ? '40' : '25') }}>
                <Text
                  className={`text-[11px] font-black ${activeMeta.activeText} ${activeMeta.activeDarkText}`}>
                  {activeCount}
                </Text>
              </View>
            )}
          </View>
          <ChevronDown size={20} strokeWidth={2.5} color={activeMeta.dot} />
        </TouchableOpacity>

        {selectedFilter !== 'all' && (
          <TouchableOpacity
            onPress={handleReset}
            activeOpacity={0.7}
            className="ml-3 h-[52px] w-[52px] items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/50"
          >
            <X size={20} strokeWidth={2.5} color={isDark ? '#9CA3AF' : '#64748B'} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <TouchableWithoutFeedback>
            <View className="w-full rounded-[28px] border border-slate-100 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <View className="px-4 py-3 mb-1 border-b border-slate-100/60 dark:border-slate-800/60">
                 <Text className="text-[12px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                   Filter by Status
                 </Text>
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
                    className={`mb-1 flex-row items-center justify-between rounded-[20px] px-4 py-4 ${
                      isSelected ? `${meta.activeBg} ${meta.activeDark}` : 'bg-transparent'
                    }`}
                  >
                    <View className="flex-row items-center gap-3.5">
                      <Icon 
                        size={18} 
                        strokeWidth={isSelected ? 3 : 2.5} 
                        color={isSelected ? meta.dot : (isDark ? '#94A3B8' : '#64748B')} 
                      />
                      <Text
                        className={`text-[16px] tracking-wide ${
                          isSelected
                            ? `font-black ${meta.activeText} ${meta.activeDarkText}`
                            : 'font-bold text-slate-600 dark:text-slate-300'
                        }`}>
                        {meta.label}
                      </Text>
                    </View>
                    {count !== undefined && count > 0 && (
                      <View
                        className={`h-[24px] min-w-[24px] items-center justify-center rounded-full px-2 ${
                          isSelected ? '' : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                        style={isSelected ? { backgroundColor: meta.dot + (isDark ? '40' : '25') } : undefined}>
                        <Text
                          className={`text-[12px] font-black ${
                            isSelected
                              ? `${meta.activeText} ${meta.activeDarkText}`
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                          {count}
                        </Text>
                      </View>
                    )}
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
