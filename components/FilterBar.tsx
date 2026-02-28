import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { ChevronDown, Filter, Check } from 'lucide-react-native';
import { IssueStatus } from '../lib/types';

interface FilterBarProps {
  selectedStatus: IssueStatus | 'All';
  onStatusChange: (status: IssueStatus | 'All') => void;
}

const statusOptions: (IssueStatus | 'All')[] = [
  'All',
  'Pending',
  'Verified',
  'Assigned',
  'In Progress',
  'Pending UO Verification',
  'Rework Required',
  'Reopened',
  'Escalated',
  'Closed',
  'Rejected',
];

const getStatusColor = (status: IssueStatus | 'All'): string => {
  switch (status) {
    case 'All':
      return '#1D4ED8';
    case 'Pending':
      return '#F59E0B';
    case 'Verified':
      return '#10B981';
    case 'Assigned':
      return '#3B82F6';
    case 'In Progress':
      return '#8B5CF6';
    case 'Pending UO Verification':
      return '#F59E0B';
    case 'Rework Required':
      return '#EF4444';
    case 'Reopened':
      return '#F97316';
    case 'Escalated':
      return '#DC2626';
    case 'Closed':
      return '#6B7280';
    case 'Rejected':
      return '#991B1B';
    default:
      return '#6B7280';
  }
};

const getStatusCount = (status: IssueStatus | 'All'): number => {
  return 0;
};

export default function FilterBar({ selectedStatus, onStatusChange }: FilterBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSelectStatus = (status: IssueStatus | 'All') => {
    onStatusChange(status);
    setShowDropdown(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowDropdown(true)}
        activeOpacity={0.8}>
        <View style={styles.filterButtonContent}>
          <Filter size={18} color="#1D4ED8" strokeWidth={2.5} />
          <Text style={styles.filterButtonText}>Filter:</Text>
          <View
            style={[styles.statusChip, { backgroundColor: getStatusColor(selectedStatus) + '20' }]}>
            <Text style={[styles.statusChipText, { color: getStatusColor(selectedStatus) }]}>
              {selectedStatus}
            </Text>
          </View>
          <ChevronDown size={18} color="#6B7280" strokeWidth={2} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}>
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Filter size={20} color="#1D4ED8" strokeWidth={2.5} />
              <Text style={styles.dropdownTitle}>Filter by Status</Text>
            </View>
            <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.dropdownItem,
                    selectedStatus === status && styles.dropdownItemActive,
                  ]}
                  onPress={() => handleSelectStatus(status)}
                  activeOpacity={0.7}>
                  <View style={styles.dropdownItemLeft}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedStatus === status && styles.dropdownItemTextActive,
                      ]}>
                      {status}
                    </Text>
                  </View>
                  {selectedStatus === status && (
                    <Check size={20} color="#1D4ED8" strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 'auto',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  dropdownScroll: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  dropdownItemTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
});
