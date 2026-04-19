import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { IssueStatus, IssuePriority } from '../lib/types';

interface StatusBadgeProps {
  status: IssueStatus;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const isDark = useColorScheme() === 'dark';

  const getStatusStyle = () => {
    switch (status) {
      case 'pending':
        return isDark ? { bg: '#451A03', text: '#FCD34D' } : { bg: '#FEF3C7', text: '#92400E' };

      case 'verified':
        return isDark ? { bg: '#1E3A8A', text: '#93C5FD' } : { bg: '#DBEAFE', text: '#1E40AF' };

      case 'assigned':
        return isDark ? { bg: '#312E81', text: '#A5B4FC' } : { bg: '#E0E7FF', text: '#3730A3' };

      case 'in_progress':
        return isDark ? { bg: '#0C4A6E', text: '#7DD3FC' } : { bg: '#E0F2FE', text: '#075985' };

      case 'pending_uo_verification':
        return isDark ? { bg: '#581C87', text: '#D8B4FE' } : { bg: '#DDD6FE', text: '#6B21A8' };

      case 'rework_required':
        return isDark ? { bg: '#7C2D12', text: '#FDBA74' } : { bg: '#FED7AA', text: '#C2410C' };

      case 'closed':
        return isDark ? { bg: '#064E3B', text: '#6EE7B7' } : { bg: '#D1FAE5', text: '#047857' };

      case 'rejected':
        return isDark ? { bg: '#7F1D1D', text: '#FCA5A5' } : { bg: '#FEE2E2', text: '#991B1B' };

      case 'reopened':
        return isDark ? { bg: '#831843', text: '#F9A8D4' } : { bg: '#FCE7F3', text: '#9F1239' };

      case 'escalated':
        return isDark ? { bg: '#6B21A8', text: '#E9D5FF' } : { bg: '#FAE8FF', text: '#86198F' };

      default:
        return isDark ? { bg: '#1E293B', text: '#CBD5F5' } : { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  const colors = getStatusStyle();

  return (
    <View
      style={[styles.badge, { backgroundColor: colors.bg }, size === 'small' && styles.badgeSmall]}>
      <Text style={[styles.text, { color: colors.text }, size === 'small' && styles.textSmall]}>
        {status}
      </Text>
    </View>
  );
}

interface PriorityBadgeProps {
  priority: IssuePriority;
  size?: 'small' | 'medium';
}

export function PriorityBadge({ priority, size = 'medium' }: PriorityBadgeProps) {
  const isDark = useColorScheme() === 'dark';

  const getPriorityStyle = () => {
    switch (priority) {
      case 'low':
        return isDark ? { bg: '#052E16', text: '#4ADE80' } : { bg: '#F0FDF4', text: '#15803D' };

      case 'medium':
        return isDark ? { bg: '#451A03', text: '#FACC15' } : { bg: '#FEF3C7', text: '#A16207' };

      case 'high':
        return isDark ? { bg: '#7C2D12', text: '#FB923C' } : { bg: '#FED7AA', text: '#C2410C' };

      case 'critical':
        return isDark ? { bg: '#7F1D1D', text: '#F87171' } : { bg: '#FEE2E2', text: '#DC2626' };

      default:
        return isDark ? { bg: '#1E293B', text: '#CBD5F5' } : { bg: '#F3F4F6', text: '#4B5563' };
    }
  };

  const colors = getPriorityStyle();

  return (
    <View
      style={[styles.badge, { backgroundColor: colors.bg }, size === 'small' && styles.badgeSmall]}>
      <Text style={[styles.text, { color: colors.text }, size === 'small' && styles.textSmall]}>
        {priority}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
  },
  textSmall: {
    fontSize: 10,
  },
});
