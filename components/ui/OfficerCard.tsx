import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { FieldOfficer, IssueCategory } from '../../lib/types';
import { Star, CheckCircle2 } from 'lucide-react-native';

interface OfficerCardProps {
  officer: FieldOfficer;
  onSelect?: () => void;
  selected?: boolean;
  showRecommended?: boolean;
}

export default function OfficerCard({
  officer,
  onSelect,
  selected = false,
  showRecommended = false,
}: OfficerCardProps) {
  const workloadColor =
    officer.workloadPercentage > 80
      ? '#DC2626'
      : officer.workloadPercentage > 60
        ? '#F59E0B'
        : '#16A34A';
  const isOverloaded = officer.workloadPercentage > 80;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.selectedCard, isOverloaded && styles.overloadedCard]}
      onPress={onSelect}
      disabled={isOverloaded || !onSelect}
      activeOpacity={0.7}>
      {showRecommended && officer.recommended && (
        <View style={styles.recommendedBadge}>
          <CheckCircle2 size={14} color="#16A34A" strokeWidth={2.5} />
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      )}

      <View style={styles.header}>
        <Image
          source={{ uri: officer.avatar || `https://i.pravatar.cc/150?u=${officer.id}` }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{officer.name}</Text>
          <View style={styles.ratingRow}>
            <Star size={14} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.rating}>{officer.rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({officer.successRate}% success)</Text>
          </View>
        </View>
      </View>

      <View style={styles.specializationsRow}>
        {officer.specializations.slice(0, 3).map((spec, index) => (
          <View key={index} style={styles.specializationChip}>
            <Text style={styles.specializationText}>{spec}</Text>
          </View>
        ))}
        {officer.specializations.length > 3 && (
          <View style={styles.specializationChip}>
            <Text style={styles.specializationText}>+{officer.specializations.length - 3}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Active Issues</Text>
          <Text style={styles.statValue}>{officer.activeIssues}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Workload</Text>
          <View style={styles.workloadContainer}>
            <View style={styles.workloadBar}>
              <View
                style={[
                  styles.workloadFill,
                  { width: `${officer.workloadPercentage}%`, backgroundColor: workloadColor },
                ]}
              />
            </View>
            <Text style={[styles.workloadText, { color: workloadColor }]}>
              {officer.workloadPercentage}%
            </Text>
          </View>
        </View>
      </View>

      {isOverloaded && (
        <View style={styles.overloadedWarning}>
          <Text style={styles.overloadedText}>Officer overloaded - Cannot assign</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.lastActive}>Last active: {formatLastActive(officer.lastActive)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatLastActive(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0F2F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#0EA5A4',
    backgroundColor: '#F0FDFA',
  },
  overloadedCard: {
    opacity: 0.6,
    borderColor: '#FEE2E2',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#CCFBF1',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  ratingCount: {
    fontSize: 12,
    color: '#64748B',
  },
  specializationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  specializationChip: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  specializationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F766E',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  workloadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workloadBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  workloadFill: {
    height: '100%',
    borderRadius: 4,
  },
  workloadText: {
    fontSize: 13,
    fontWeight: '700',
  },
  overloadedWarning: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  overloadedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  lastActive: {
    fontSize: 11,
    color: '#64748B',
  },
});
