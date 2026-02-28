import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { RefreshCw, X } from 'lucide-react-native';

interface ReassignmentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, comment: string) => void;
  issueTitle: string;
  currentOfficer: string;
}

const REASSIGNMENT_REASONS = ['Overloaded', 'Delay', 'Quality Issue', 'Officer Request', 'Other'];

export default function ReassignmentModal({
  visible,
  onClose,
  onConfirm,
  issueTitle,
  currentOfficer,
}: ReassignmentModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [comment, setComment] = useState('');

  const handleReassign = () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a reassignment reason');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Required', 'Please provide a comment for reassignment');
      return;
    }
    onConfirm(selectedReason, comment);
    setSelectedReason('');
    setComment('');
  };

  const handleCancel = () => {
    setSelectedReason('');
    setComment('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <RefreshCw color="#F59E0B" size={24} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Reassign Issue</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color="#6B7280" size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.scrollContainer}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.issueInfo}>
                <Text style={styles.issueLabel}>Issue:</Text>
                <Text style={styles.issueTitle}>{issueTitle}</Text>
                <Text style={styles.currentOfficer}>
                  Currently assigned to: <Text style={styles.officerName}>{currentOfficer}</Text>
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Reassignment Reason <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.reasonsList}>
                  {REASSIGNMENT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonButton,
                        selectedReason === reason && styles.reasonButtonSelected,
                      ]}
                      onPress={() => setSelectedReason(reason)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.reasonText,
                          selectedReason === reason && styles.reasonTextSelected,
                        ]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Comment <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Provide reason for reassignment..."
                  placeholderTextColor="#9CA3AF"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.reassignButton,
                (!selectedReason || !comment.trim()) && styles.reassignButtonDisabled,
              ]}
              onPress={handleReassign}
              disabled={!selectedReason || !comment.trim()}
              activeOpacity={0.7}>
              <Text style={styles.reassignButtonText}>Reassign</Text>
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
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#F59E0B',
    marginLeft: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    maxHeight: 450,
  },
  content: {
    padding: 20,
  },
  issueInfo: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  issueLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  currentOfficer: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  officerName: {
    fontWeight: '700',
    color: '#0EA5A4',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  required: {
    color: '#DC2626',
  },
  reasonsList: {
    gap: 10,
  },
  reasonButton: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  reasonButtonSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  reasonTextSelected: {
    color: '#92400E',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 120,
    fontWeight: '500',
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
  reassignButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  reassignButtonDisabled: {
    opacity: 0.5,
  },
  reassignButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
