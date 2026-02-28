import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface SimpleFilterBarProps {
  filters: string[];
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function SimpleFilterBar({
  filters,
  selectedFilter,
  onFilterChange,
}: SimpleFilterBarProps) {
  const getFilterColor = (filter: string): string => {
    switch (filter) {
      case 'All':
        return '#1D4ED8';
      case 'Assigned':
        return '#3B82F6';
      case 'In Progress':
        return '#8B5CF6';
      case 'Pending UO Verification':
        return '#F59E0B';
      case 'Rework Required':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter;
          const color = getFilterColor(filter);

          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                isSelected && { backgroundColor: color + '20', borderColor: color },
              ]}
              onPress={() => onFilterChange(filter)}
              activeOpacity={0.7}>
              <Text style={[styles.filterText, isSelected && { color: color, fontWeight: '700' }]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: '#F0FDFA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
