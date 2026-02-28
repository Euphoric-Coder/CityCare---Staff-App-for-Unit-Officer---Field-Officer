import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { X, RotateCcw } from 'lucide-react-native';
import { ReworkReason } from '../lib/types';
import ReasonDropdown from './ui/ReasonDropdown';
import ActionButton from './ui/ActionButton';

interface ReworkModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestRework: (reason: ReworkReason, comment: string) => void;
}

const REWORK_REASONS: readonly ReworkReason[] = [
  'Incomplete fix',
  'Quality issue',
  'Wrong approach',
  'Additional work needed',
  'Citizen complaint',
  'Other',
];

export default function ReworkModal({ visible, onClose, onRequestRework }: ReworkModalProps) {
  const [reason, setReason] = useState<ReworkReason>('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<{ reason?: string; comment?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!reason) {
      newErrors.reason = 'Please select a rework reason';
    }

    if (!comment.trim()) {
      newErrors.comment = 'Comment is required';
    } else if (comment.trim().length < 10) {
      newErrors.comment = 'Comment must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestRework = () => {
    if (!validate()) {
      return;
    }

    Alert.alert(
      'Request Rework',
      'The field officer will be notified to redo the work. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Rework',
          onPress: () => {
            onRequestRework(reason, comment);
            resetForm();
            onClose();
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setReason('');
    setComment('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity
          style={styles.modal}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <RotateCcw size={24} color="#F59E0B" />
            </View>
            <Text style={styles.title}>Request Rework</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.warning}>
              The submitted work does not meet quality standards. Provide clear guidance for
              improvement.
            </Text>

            <ReasonDropdown
              label="Rework Reason"
              options={REWORK_REASONS}
              value={reason}
              onChange={(value) => {
                setReason(value as ReworkReason);
                setErrors({ ...errors, reason: undefined });
              }}
              placeholder="Select rework reason"
              error={errors.reason}
            />

            <View style={styles.field}>
              <Text style={styles.label}>Detailed Feedback</Text>
              <TextInput
                style={[styles.textArea, errors.comment && styles.textAreaError]}
                placeholder="Explain what needs to be fixed..."
                placeholderTextColor="#94A3B8"
                value={comment}
                onChangeText={(text) => {
                  setComment(text);
                  setErrors({ ...errors, comment: undefined });
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {errors.comment && <Text style={styles.errorText}>{errors.comment}</Text>}
              <Text style={styles.hint}>
                Be specific about what's wrong and how to fix it. Minimum 10 characters.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <ActionButton
              label="Cancel"
              onPress={handleClose}
              variant="outline"
              size="large"
              fullWidth={false}
            />
            <ActionButton
              label="Request Rework"
              onPress={handleRequestRework}
              variant="warning"
              size="large"
              fullWidth={false}
              disabled={!reason || !comment.trim()}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  warning: {
    fontSize: 14,
    color: '#D97706',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 100,
  },
  textAreaError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});
