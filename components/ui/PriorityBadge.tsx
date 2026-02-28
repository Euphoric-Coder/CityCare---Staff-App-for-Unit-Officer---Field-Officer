import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IssuePriority } from '../../lib/types';
import { AlertCircle } from 'lucide-react-native';

interface PriorityBadgeProps {
  priority: IssuePriority;
  size?: 'small' | 'medium';
  showIcon?: boolean;
}

export default function PriorityBadge({
  priority,
  size = 'medium',
  showIcon = true,
}: PriorityBadgeProps) {
  const getPriorityConfig = (priority: IssuePriority) => {
    switch (priority) {
      case 'Critical':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', icon: '#DC2626' };
      case 'High':
        return { bg: '#FED7AA', text: '#9A3412', border: '#FDBA74', icon: '#EA580C' };
      case 'Medium':
        return { bg: '#FEF3C7', text: '#78350F', border: '#FCD34D', icon: '#F59E0B' };
      case 'Low':
        return { bg: '#E0F2FE', text: '#075985', border: '#BAE6FD', icon: '#0284C7' };
      default:
        return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB', icon: '#6B7280' };
    }
  };

  const config = getPriorityConfig(priority);
  const iconSize = size === 'small' ? 12 : 14;
  const sizeStyles = size === 'small' ? styles.small : styles.medium;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
        sizeStyles,
      ]}>
      {showIcon && <AlertCircle size={iconSize} color={config.icon} strokeWidth={2.5} />}
      <Text style={[styles.text, { color: config.text }, sizeStyles]}>{priority}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
  },
  medium: {
    fontSize: 12,
  },
});
