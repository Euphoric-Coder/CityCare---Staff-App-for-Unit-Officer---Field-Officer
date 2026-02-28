import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, User, Calendar, UserCheck } from 'lucide-react-native';
import { Issue } from '../lib/types';
import StatusBadge, { PriorityBadge } from './StatusBadge';

interface IssueCardProps {
  issue: Issue;
  onPress: () => void;
}

export default function IssueCard({ issue, onPress }: IssueCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{issue.category}</Text>
        </View>
        <PriorityBadge priority={issue.priority} size="small" />
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {issue.title}
      </Text>

      <View style={styles.infoRow}>
        <MapPin color="#6B7280" size={14} />
        <Text style={styles.infoText} numberOfLines={1}>
          {issue.location}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <User color="#6B7280" size={14} />
        <Text style={styles.infoText}>{issue.citizenName}</Text>
      </View>

      {issue.assignedOfficer && (
        <View style={styles.assignedOfficerRow}>
          <UserCheck color="#0EA5A4" size={14} strokeWidth={2.5} />
          <Text style={styles.assignedOfficerText}>{issue.assignedOfficer}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.dateRow}>
          <Calendar color="#9CA3AF" size={14} />
          <Text style={styles.dateText}>{formatDate(issue.dateReported)}</Text>
        </View>
        <StatusBadge status={issue.status} size="small" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  assignedOfficerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5EEAD4',
  },
  assignedOfficerText: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '700',
    flex: 1,
  },
});
