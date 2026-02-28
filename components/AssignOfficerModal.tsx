import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { X, Check, UserCheck } from 'lucide-react-native';
import { FieldOfficer } from '../lib/types';

interface AssignOfficerModalProps {
  visible: boolean;
  onClose: () => void;
  officers: FieldOfficer[];
  onAssign: (officerId: string) => void;
}

export default function AssignOfficerModal({
  visible,
  onClose,
  officers,
  onAssign,
}: AssignOfficerModalProps) {
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);

  const handleAssign = () => {
    if (selectedOfficer) {
      onAssign(selectedOfficer);
      setSelectedOfficer(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <UserCheck color="#1D4ED8" size={24} />
              </View>
              <Text style={styles.title}>Assign Field Officer</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>Select a field officer to assign this issue</Text>

            {officers.map((officer) => (
              <TouchableOpacity
                key={officer.id}
                activeOpacity={0.7}
                onPress={() => setSelectedOfficer(officer.id)}
                style={[
                  styles.officerCard,
                  selectedOfficer === officer.id && styles.officerCardSelected,
                ]}>
                <View style={styles.officerInfo}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {officer.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </Text>
                  </View>
                  <View style={styles.officerDetails}>
                    <Text style={styles.officerName}>{officer.name}</Text>
                    <Text style={styles.officerEmail}>{officer.email}</Text>
                    <Text style={styles.officerStats}>Active Issues: {officer.activeIssues}</Text>
                  </View>
                </View>
                {selectedOfficer === officer.id && (
                  <View style={styles.checkIcon}>
                    <Check color="#1D4ED8" size={20} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, styles.cancelButton]}
              activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAssign}
              style={[
                styles.button,
                styles.assignButton,
                !selectedOfficer && styles.assignButtonDisabled,
              ]}
              activeOpacity={0.7}
              disabled={!selectedOfficer}>
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
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  officerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  officerCardSelected: {
    borderColor: '#1D4ED8',
    backgroundColor: '#EFF6FF',
  },
  officerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
  officerDetails: {
    flex: 1,
  },
  officerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  officerEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  officerStats: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  assignButton: {
    backgroundColor: '#1D4ED8',
  },
  assignButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  assignButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
