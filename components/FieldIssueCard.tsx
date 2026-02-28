import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Clock, AlertTriangle, User, Navigation } from 'lucide-react-native';
import { Issue } from '../lib/types';

interface FieldIssueCardProps {
  issue: Issue;
  onPress: (issue: Issue) => void;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function FieldIssueCard({ issue, onPress }: FieldIssueCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const officerLocation = { latitude: 25.3176, longitude: 82.9739 };
  const distance = issue.coordinates
    ? calculateDistance(
        officerLocation.latitude,
        officerLocation.longitude,
        issue.coordinates.latitude,
        issue.coordinates.longitude
      )
    : 0;

  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (!issue.slaDeadline) {
        setTimeRemaining('No deadline');
        return;
      }

      const now = new Date().getTime();
      const deadline = new Date(issue.slaDeadline).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining('OVERDUE');
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours < 3) {
        setIsUrgent(true);
      }

      if (hours < 24) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`${days}d ${hours % 24}h`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [issue.slaDeadline]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return '#DC2626';
      case 'Medium':
        return '#F59E0B';
      case 'Low':
        return '#16A34A';
      default:
        return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Assigned':
        return '#0EA5A4';
      case 'In Progress':
        return '#F59E0B';
      case 'Rework':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isUrgent && styles.cardUrgent]}
      onPress={() => onPress(issue)}
      activeOpacity={0.7}>
      {isUrgent && (
        <View style={styles.urgentBanner}>
          <AlertTriangle color="#FFFFFF" size={14} strokeWidth={2.5} />
          <Text style={styles.urgentText}>SLA ALERT</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title} numberOfLines={2}>
            {issue.title}
          </Text>
          <View style={styles.badges}>
            <View
              style={[styles.badge, { backgroundColor: `${getPriorityColor(issue.priority)}15` }]}>
              <Text style={[styles.badgeText, { color: getPriorityColor(issue.priority) }]}>
                {issue.priority}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${getStatusColor(issue.status)}15` }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(issue.status) }]}>
                {issue.status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.category}>
        <View style={styles.categoryDot} />
        <Text style={styles.categoryText}>{issue.category}</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <MapPin color="#6B7280" size={16} strokeWidth={2} />
          <Text style={styles.infoText} numberOfLines={1}>
            {issue.location}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Navigation color="#0EA5A4" size={16} strokeWidth={2} />
          <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <User color="#6B7280" size={14} strokeWidth={2} />
          <Text style={styles.citizenName}>{issue.citizenName}</Text>
        </View>
        <View style={[styles.timer, isUrgent && styles.timerUrgent]}>
          <Clock color={isUrgent ? '#DC2626' : '#6B7280'} size={14} strokeWidth={2.5} />
          <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
            {timeRemaining}
          </Text>
        </View>
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
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardUrgent: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  urgentBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 22,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0EA5A4',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0EA5A4',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  citizenName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerUrgent: {
    backgroundColor: '#FEE2E2',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  timerTextUrgent: {
    color: '#DC2626',
  },
});
