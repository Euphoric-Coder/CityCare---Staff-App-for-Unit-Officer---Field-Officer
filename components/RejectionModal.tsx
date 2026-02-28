import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { XCircle, AlertTriangle, X } from 'lucide-react-native';
import { RejectionReason } from '../lib/types';

interface RejectionModalProps {
  visible: boolean;
  onClose: () => void;
  onReject: (reason: RejectionReason, comment: string) => void;
  issueTitle?: string;
}

const REJECTION_REASONS: RejectionReason[] = [
  'Duplicate',
  'Spam / Fake',
  'Outside Jurisdiction',
  'Insufficient Evidence',
  'Invalid Location',
  'Other',
];

export default function RejectionModal({
  visible,
  onClose,
  onReject,
  issueTitle = 'this issue',
}: RejectionModalProps) {
  const [selectedReason, setSelectedReason] = useState<RejectionReason | ''>('');
  const [comment, setComment] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleReject = () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a rejection reason');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Required', 'Please provide a rejection comment');
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmReject = () => {
    if (selectedReason) {
      onReject(selectedReason, comment);
      setShowConfirmation(false);
      setSelectedReason('');
      setComment('');
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setSelectedReason('');
    setComment('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <XCircle color="#DC2626" size={28} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Reject Issue</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color="#6B7280" size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.warningCard}>
              <AlertTriangle color="#DC2626" size={20} strokeWidth={2.5} />
              <Text style={styles.warningText}>
                This action will permanently reject the issue and notify the citizen.
              </Text>
            </View>

            <View style={styles.issueInfo}>
              <Text style={styles.issueLabel}>Issue:</Text>
              <Text style={styles.issueTitle}>{issueTitle}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Rejection Reason <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.reasonsList}>
                {REJECTION_REASONS.map((reason) => (
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
                Rejection Comment <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Provide detailed reason for rejection..."
                placeholderTextColor="#9CA3AF"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rejectButton,
                (!selectedReason || !comment.trim()) && styles.rejectButtonDisabled,
              ]}
              onPress={handleReject}
              disabled={!selectedReason || !comment.trim()}
              activeOpacity={0.7}>
              <Text style={styles.rejectButtonText}>Reject Issue</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={showConfirmation}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowConfirmation(false)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <AlertTriangle color="#DC2626" size={48} strokeWidth={2} />
              </View>
              <Text style={styles.confirmTitle}>Confirm Rejection</Text>
              <Text style={styles.confirmMessage}>
                Are you sure you want to reject this issue? This action cannot be undone.
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  onPress={() => setShowConfirmation(false)}
                  activeOpacity={0.7}>
                  <Text style={styles.confirmCancelText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmRejectButton}
                  onPress={handleConfirmReject}
                  activeOpacity={0.7}>
                  <Text style={styles.confirmRejectText}>Yes, Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
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
  warningCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    lineHeight: 20,
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
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  reasonTextSelected: {
    color: '#991B1B',
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
  rejectButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  rejectButtonDisabled: {
    opacity: 0.5,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
  },
  confirmRejectButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  confirmRejectText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
