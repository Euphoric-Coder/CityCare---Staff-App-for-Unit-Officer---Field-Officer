import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IssueStatus, IssuePriority } from '../lib/types';

interface StatusBadgeProps {
  status: IssueStatus;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const getStatusStyle = () => {
    switch (status) {
      case 'Pending':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'Verified':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'Assigned':
        return { bg: '#E0E7FF', text: '#3730A3' };
      case 'In Progress':
        return { bg: '#E0F2FE', text: '#075985' };
      case 'Pending UO Verification':
        return { bg: '#DDD6FE', text: '#6B21A8' };
      case 'Rework Required':
        return { bg: '#FED7AA', text: '#C2410C' };
      case 'Closed':
        return { bg: '#D1FAE5', text: '#047857' };
      case 'Rejected':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'Reopened':
        return { bg: '#FCE7F3', text: '#9F1239' };
      case 'Escalated':
        return { bg: '#FAE8FF', text: '#86198F' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563' };
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
  const getPriorityStyle = () => {
    switch (priority) {
      case 'Low':
        return { bg: '#F0FDF4', text: '#15803D' };
      case 'Medium':
        return { bg: '#FEF3C7', text: '#A16207' };
      case 'High':
        return { bg: '#FED7AA', text: '#C2410C' };
      case 'Critical':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563' };
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
  },
  textSmall: {
    fontSize: 10,
  },
});
