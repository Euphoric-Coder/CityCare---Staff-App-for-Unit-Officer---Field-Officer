import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IssueStatus } from '../../lib/types';

interface StatusBadgeProps {
  status: IssueStatus;
  size?: 'small' | 'medium' | 'large';
}

export default function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const getStatusConfig = (status: IssueStatus) => {
    switch (status) {
      case 'Pending':
        return { label: 'Pending', bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
      case 'Verified':
        return { label: 'Verified', bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' };
      case 'Assigned':
        return { label: 'Assigned', bg: '#E0E7FF', text: '#4338CA', border: '#A5B4FC' };
      case 'In Progress':
        return { label: 'In Progress', bg: '#CCFBF1', text: '#0F766E', border: '#5EEAD4' };
      case 'Pending UO Verification':
        return {
          label: 'Pending UO Verification',
          bg: '#DDD6FE',
          text: '#6B21A8',
          border: '#C4B5FD',
        };
      case 'Rework Required':
        return { label: 'Rework Required', bg: '#FED7AA', text: '#C2410C', border: '#FDBA74' };
      case 'Reopened':
        return { label: 'Reopened', bg: '#FECACA', text: '#991B1B', border: '#FCA5A5' };
      case 'Escalated':
        return { label: 'Escalated', bg: '#FAE8FF', text: '#86198F', border: '#F0ABFC' };
      case 'Closed':
        return { label: 'Closed', bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' };
      case 'Rejected':
        return { label: 'Rejected', bg: '#FEE2E2', text: '#7F1D1D', border: '#FCA5A5' };
      default:
        return { label: status, bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
    }
  };

  const config = getStatusConfig(status);
  const badgeSizeStyles =
    size === 'small' ? styles.badgeSmall : size === 'large' ? styles.badgeLarge : styles.badgeMedium;
  const textSizeStyles =
    size === 'small' ? styles.textSmall : size === 'large' ? styles.textLarge : styles.textMedium;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
        badgeSizeStyles,
      ]}>
      <Text style={[styles.text, { color: config.text }, textSizeStyles]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeMedium: {},
  badgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },
});
