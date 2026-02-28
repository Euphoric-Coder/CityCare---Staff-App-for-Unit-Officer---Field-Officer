import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { Star, TrendingUp, Briefcase, User, X } from 'lucide-react-native';

interface FieldOfficer {
  id: string;
  name: string;
  rating: number;
  specialisation: string[];
  workload_percentage: number;
  success_rate: number;
  active_issues: number;
  profile_photo?: string;
}

interface FieldOfficerAssignmentProps {
  visible: boolean;
  onClose: () => void;
  officers: FieldOfficer[];
  onAssign: (officerId: string) => void;
  issueTitle: string;
}

type SortOption = 'rating' | 'workload' | 'success_rate';

export default function FieldOfficerAssignment({
  visible,
  onClose,
  officers,
  onAssign,
  issueTitle,
}: FieldOfficerAssignmentProps) {
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);

  const sortedOfficers = [...officers].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'workload':
        return a.workload_percentage - b.workload_percentage;
      case 'success_rate':
        return b.success_rate - a.success_rate;
      default:
        return 0;
    }
  });

  const handleAssign = () => {
    if (!selectedOfficer) {
      Alert.alert('Required', 'Please select a field officer');
      return;
    }

    const officer = officers.find((o) => o.id === selectedOfficer);
    if (officer && officer.workload_percentage >= 100) {
      Alert.alert(
        'Cannot Assign',
        'This officer is at maximum capacity. Please select another officer.'
      );
      return;
    }

    Alert.alert('Confirm Assignment', `Assign this issue to ${officer?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Assign',
        onPress: () => {
          onAssign(selectedOfficer);
          setSelectedOfficer(null);
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Assign Field Officer</Text>
              <Text style={styles.subtitle}>{issueTitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color="#6B7280" size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <View style={styles.sortButtons}>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'rating' && styles.sortButtonActive]}
                onPress={() => setSortBy('rating')}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === 'rating' && styles.sortButtonTextActive,
                  ]}>
                  Rating
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'workload' && styles.sortButtonActive]}
                onPress={() => setSortBy('workload')}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === 'workload' && styles.sortButtonTextActive,
                  ]}>
                  Workload
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'success_rate' && styles.sortButtonActive]}
                onPress={() => setSortBy('success_rate')}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === 'success_rate' && styles.sortButtonTextActive,
                  ]}>
                  Success
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {sortedOfficers.map((officer) => {
              const isOverloaded = officer.workload_percentage >= 100;
              const isSelected = selectedOfficer === officer.id;

              return (
                <TouchableOpacity
                  key={officer.id}
                  style={[
                    styles.officerCard,
                    isSelected && styles.officerCardSelected,
                    isOverloaded && styles.officerCardDisabled,
                  ]}
                  onPress={() => !isOverloaded && setSelectedOfficer(officer.id)}
                  disabled={isOverloaded}
                  activeOpacity={0.7}>
                  <View style={styles.officerHeader}>
                    <View style={styles.profileSection}>
                      {officer.profile_photo ? (
                        <Image
                          source={{ uri: officer.profile_photo }}
                          style={styles.profilePhoto}
                        />
                      ) : (
                        <View style={styles.profilePhotoPlaceholder}>
                          <User color="#0EA5A4" size={28} strokeWidth={2} />
                        </View>
                      )}
                      <View style={styles.officerInfo}>
                        <Text style={styles.officerName}>{officer.name}</Text>
                        <View style={styles.ratingRow}>
                          <Star color="#F59E0B" size={16} fill="#F59E0B" strokeWidth={2} />
                          <Text style={styles.ratingText}>{officer.rating.toFixed(1)}</Text>
                        </View>
                      </View>
                    </View>
                    {isOverloaded && (
                      <View style={styles.overloadedBadge}>
                        <Text style={styles.overloadedText}>Full</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.specialisationContainer}>
                    {officer.specialisation.map((spec, index) => (
                      <View key={index} style={styles.specialisationBadge}>
                        <Text style={styles.specialisationText}>{spec}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <View style={styles.statIconContainer}>
                        <TrendingUp color="#16A34A" size={16} strokeWidth={2.5} />
                      </View>
                      <View style={styles.statTextContainer}>
                        <Text style={styles.statLabel}>Success Rate</Text>
                        <Text style={styles.statValue}>{officer.success_rate.toFixed(1)}%</Text>
                      </View>
                    </View>
                    <View style={styles.statItem}>
                      <View style={styles.statIconContainer}>
                        <Briefcase color="#0EA5A4" size={16} strokeWidth={2.5} />
                      </View>
                      <View style={styles.statTextContainer}>
                        <Text style={styles.statLabel}>Active Issues</Text>
                        <Text style={styles.statValue}>{officer.active_issues}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.workloadContainer}>
                    <View style={styles.workloadHeader}>
                      <Text style={styles.workloadLabel}>Workload</Text>
                      <Text
                        style={[
                          styles.workloadPercentage,
                          officer.workload_percentage >= 80 && styles.workloadPercentageHigh,
                        ]}>
                        {officer.workload_percentage}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${officer.workload_percentage}%`,
                            backgroundColor:
                              officer.workload_percentage >= 80
                                ? '#DC2626'
                                : officer.workload_percentage >= 50
                                  ? '#F59E0B'
                                  : '#16A34A',
                          },
                        ]}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.assignButton, !selectedOfficer && styles.assignButtonDisabled]}
              onPress={handleAssign}
              disabled={!selectedOfficer}
              activeOpacity={0.7}>
              <Text style={styles.assignButtonText}>Assign Officer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0EA5A4',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0EA5A4',
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  sortButtonTextActive: {
    color: '#0F766E',
  },
  content: {
    padding: 20,
  },
  officerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  officerCardSelected: {
    borderColor: '#0EA5A4',
    backgroundColor: '#F0FDFA',
  },
  officerCardDisabled: {
    opacity: 0.5,
  },
  officerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profilePhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
  },
  profilePhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officerInfo: {
    flex: 1,
  },
  officerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F59E0B',
  },
  overloadedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  overloadedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  specialisationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  specialisationBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  specialisationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#075985',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  workloadContainer: {
    marginTop: 8,
  },
  workloadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workloadLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  workloadPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
  },
  workloadPercentageHigh: {
    color: '#DC2626',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
  },
  assignButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0EA5A4',
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  assignButtonDisabled: {
    opacity: 0.5,
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
