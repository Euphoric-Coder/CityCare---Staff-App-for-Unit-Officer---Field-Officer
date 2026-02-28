import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Alert } from 'react-native';
import { ArrowUpCircle, X } from 'lucide-react-native';

interface EscalationModalProps {
  visible: boolean;
  onClose: () => void;
  onEscalate: (reason: string, comment: string) => void;
  issueTitle: string;
}

const ESCALATION_REASONS = [
  'Requires Department Approval',
  'Equipment Issue',
  'Safety Risk',
  'Policy Constraint',
  'Budget Constraint',
  'Other',
];

export default function EscalationModal({
  visible,
  onClose,
  onEscalate,
  issueTitle,
}: EscalationModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [comment, setComment] = useState('');

  const handleEscalate = () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select an escalation reason');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Required', 'Please provide escalation details');
      return;
    }

    Alert.alert(
      'Confirm Escalation',
      'This issue will be escalated to admin for review. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate',
          style: 'default',
          onPress: () => {
            onEscalate(selectedReason, comment);
            setSelectedReason('');
            setComment('');
          },
        },
      ]
    );
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
              <ArrowUpCircle color="#7C3AED" size={24} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Escalate Issue</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color="#6B7280" size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.issueInfo}>
              <Text style={styles.issueLabel}>Issue:</Text>
              <Text style={styles.issueTitle}>{issueTitle}</Text>
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                Escalating this issue will notify the admin team for higher-level intervention.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Escalation Reason <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.reasonsList}>
                {ESCALATION_REASONS.map((reason) => (
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
                Escalation Details <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Provide detailed reason for escalation..."
                placeholderTextColor="#9CA3AF"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
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
                styles.escalateButton,
                (!selectedReason || !comment.trim()) && styles.escalateButtonDisabled,
              ]}
              onPress={handleEscalate}
              disabled={!selectedReason || !comment.trim()}
              activeOpacity={0.7}>
              <Text style={styles.escalateButtonText}>Escalate to Admin</Text>
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
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AED',
    marginLeft: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  issueInfo: {
    marginBottom: 16,
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
  },
  warningCard: {
    padding: 14,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
    marginBottom: 20,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B21B6',
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
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
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  reasonTextSelected: {
    color: '#5B21B6',
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
  escalateButton: {
    flex: 1.5,
    padding: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  escalateButtonDisabled: {
    opacity: 0.5,
  },
  escalateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
