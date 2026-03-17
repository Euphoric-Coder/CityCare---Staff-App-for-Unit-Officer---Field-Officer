import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SimpleFilterBarProps {
  filters: string[];
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  counts?: Record<string, number>;
}

const FILTER_META: Record<
  string,
  { dot: string; activeBg: string; activeDark: string; activeText: string; activeDarkText: string }
> = {
  All: {
    dot: '#3B82F6',
    activeBg: 'bg-blue-100',
    activeDark: 'dark:bg-blue-900/50',
    activeText: 'text-blue-700',
    activeDarkText: 'dark:text-blue-300',
  },
  Assigned: {
    dot: '#0D9488',
    activeBg: 'bg-teal-100',
    activeDark: 'dark:bg-teal-900/50',
    activeText: 'text-teal-700',
    activeDarkText: 'dark:text-teal-300',
  },
  'In Progress': {
    dot: '#F59E0B',
    activeBg: 'bg-amber-100',
    activeDark: 'dark:bg-amber-900/50',
    activeText: 'text-amber-700',
    activeDarkText: 'dark:text-amber-300',
  },
  'Pending UO Verification': {
    dot: '#6366F1',
    activeBg: 'bg-violet-100',
    activeDark: 'dark:bg-violet-900/50',
    activeText: 'text-violet-700',
    activeDarkText: 'dark:text-violet-300',
  },
  'Rework Required': {
    dot: '#DC2626',
    activeBg: 'bg-red-100',
    activeDark: 'dark:bg-red-900/50',
    activeText: 'text-red-700',
    activeDarkText: 'dark:text-red-300',
  },
};

export default function SimpleFilterBar({
  filters,
  selectedFilter,
  onFilterChange,
  counts,
}: SimpleFilterBarProps) {
  return (
    <View
      className="border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"
      style={styles.container}>
      {filters.map((filter) => {
        const isSelected = selectedFilter === filter;
        const meta = FILTER_META[filter] ?? FILTER_META.All;
        const count = counts?.[filter];

        return (
          <TouchableOpacity
            key={filter}
            onPress={() => onFilterChange(filter)}
            activeOpacity={0.7}
            className={`flex-row items-center gap-1.5 rounded-2xl border px-3.5 py-2 ${
              isSelected
                ? `${meta.activeBg} ${meta.activeDark} border-transparent`
                : 'border-slate-200 bg-transparent dark:border-slate-700'
            }`}>
            {isSelected && (
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
            )}
            <Text
              className={`text-[12px] font-bold ${
                isSelected
                  ? `${meta.activeText} ${meta.activeDarkText}`
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
              {filter}
            </Text>
            {count !== undefined && count > 0 && (
              <View
                className={`h-[18px] w-[18px] items-center justify-center rounded-full ${
                  isSelected ? '' : 'bg-slate-200 dark:bg-slate-700'
                }`}
                style={isSelected ? { backgroundColor: meta.dot + '30' } : undefined}>
                <Text
                  className={`text-[9px] font-extrabold ${
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
});
