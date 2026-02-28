import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { CheckCircle2, AlertCircle, ArrowUpCircle, MapPin, Clock, X } from 'lucide-react-native';

interface ResolutionData {
  before_image: string;
  after_image: string;
  location: { latitude: number; longitude: number };
  timestamp: string;
  comment: string;
}

interface ResolutionVerificationProps {
  visible: boolean;
  onClose: () => void;
  resolution: ResolutionData;
  issueTitle: string;
  onApprove: () => void;
  onRework: (reason: string, comment: string) => void;
  onEscalate: (reason: string) => void;
}

const REWORK_REASONS = [
  'Incomplete Work',
  'Poor Quality',
  'Does Not Match Description',
  'Additional Issues Found',
  'Evidence Insufficient',
];

const ESCALATION_REASONS = [
  'Requires Higher Authority Approval',
  'Budget Constraint',
  'Technical Complexity',
  'Citizen Dispute',
  'Safety Concerns',
];

export default function ResolutionVerification({
  visible,
  onClose,
  resolution,
  issueTitle,
  onApprove,
  onRework,
  onEscalate,
}: ResolutionVerificationProps) {
  const [action, setAction] = useState<'approve' | 'rework' | 'escalate' | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [comment, setComment] = useState('');

  const handleApprove = () => {
    Alert.alert('Approve Resolution', 'Are you sure the issue has been resolved satisfactorily?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve & Close',
        style: 'default',
        onPress: () => {
          onApprove();
          resetForm();
        },
      },
    ]);
  };

  const handleRework = () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a reason for rework');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Required', 'Please provide rework instructions');
      return;
    }
    onRework(selectedReason, comment);
    resetForm();
  };

  const handleEscalate = () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select an escalation reason');
      return;
    }
    onEscalate(selectedReason);
    resetForm();
  };

  const resetForm = () => {
    setAction(null);
    setSelectedReason('');
    setComment('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Resolution Verification</Text>
              <Text style={styles.subtitle}>{issueTitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color="#6B7280" size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.imagesSection}>
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>Before</Text>
                <Image source={{ uri: resolution.before_image }} style={styles.image} />
              </View>
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>After</Text>
                <Image source={{ uri: resolution.after_image }} style={styles.image} />
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <MapPin color="#0EA5A4" size={18} strokeWidth={2.5} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>
                    {resolution.location.latitude.toFixed(4)},{' '}
                    {resolution.location.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Clock color="#0EA5A4" size={18} strokeWidth={2.5} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Completed At</Text>
                  <Text style={styles.infoValue}>
                    {new Date(resolution.timestamp).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>Field Officer Comment</Text>
              <View style={styles.commentBox}>
                <Text style={styles.commentText}>{resolution.comment}</Text>
              </View>
            </View>

            {!action && (
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={handleApprove}
                  activeOpacity={0.7}>
                  <CheckCircle2 color="#FFFFFF" size={24} strokeWidth={2.5} />
                  <Text style={styles.actionButtonText}>Approve & Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.reworkButton]}
                  onPress={() => setAction('rework')}
                  activeOpacity={0.7}>
                  <AlertCircle color="#FFFFFF" size={24} strokeWidth={2.5} />
                  <Text style={styles.actionButtonText}>Send for Rework</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.escalateButton]}
                  onPress={() => setAction('escalate')}
                  activeOpacity={0.7}>
                  <ArrowUpCircle color="#FFFFFF" size={24} strokeWidth={2.5} />
                  <Text style={styles.actionButtonText}>Escalate to Admin</Text>
                </TouchableOpacity>
              </View>
            )}

            {action === 'rework' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Send for Rework</Text>
                <View style={styles.reasonsList}>
                  {REWORK_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonButton,
                        selectedReason === reason && styles.reasonButtonSelectedRework,
                      ]}
                      onPress={() => setSelectedReason(reason)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.reasonText,
                          selectedReason === reason && styles.reasonTextSelectedRework,
                        ]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Provide detailed rework instructions..."
                  placeholderTextColor="#9CA3AF"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={styles.formCancelButton}
                    onPress={resetForm}
                    activeOpacity={0.7}>
                    <Text style={styles.formCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.formSubmitButton,
                      styles.reworkSubmitButton,
                      (!selectedReason || !comment.trim()) && styles.formSubmitButtonDisabled,
                    ]}
                    onPress={handleRework}
                    disabled={!selectedReason || !comment.trim()}
                    activeOpacity={0.7}>
                    <Text style={styles.formSubmitText}>Send for Rework</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {action === 'escalate' && (
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Escalate to Admin</Text>
                <View style={styles.reasonsList}>
                  {ESCALATION_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonButton,
                        selectedReason === reason && styles.reasonButtonSelectedEscalate,
                      ]}
                      onPress={() => setSelectedReason(reason)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.reasonText,
                          selectedReason === reason && styles.reasonTextSelectedEscalate,
                        ]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={styles.formCancelButton}
                    onPress={resetForm}
                    activeOpacity={0.7}>
                    <Text style={styles.formCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.formSubmitButton,
                      styles.escalateSubmitButton,
                      !selectedReason && styles.formSubmitButtonDisabled,
                    ]}
                    onPress={handleEscalate}
                    disabled={!selectedReason}
                    activeOpacity={0.7}>
                    <Text style={styles.formSubmitText}>Escalate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
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
    maxHeight: '95%',
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
    color: '#111827',
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
  content: {
    padding: 20,
  },
  imagesSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  imageContainer: {
    flex: 1,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  infoSection: {
    gap: 12,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  commentBox: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 14,
    minHeight: 60,
  },
  approveButton: {
    backgroundColor: '#16A34A',
  },
  reworkButton: {
    backgroundColor: '#F59E0B',
  },
  escalateButton: {
    backgroundColor: '#7C3AED',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formSection: {
    marginTop: 16,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  reasonsList: {
    gap: 10,
    marginBottom: 16,
  },
  reasonButton: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  reasonButtonSelectedRework: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  reasonButtonSelectedEscalate: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  reasonTextSelectedRework: {
    color: '#92400E',
  },
  reasonTextSelectedEscalate: {
    color: '#5B21B6',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    fontWeight: '500',
    marginBottom: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  formCancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  formCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
  },
  formSubmitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  reworkSubmitButton: {
    backgroundColor: '#F59E0B',
  },
  escalateSubmitButton: {
    backgroundColor: '#7C3AED',
  },
  formSubmitButtonDisabled: {
    opacity: 0.5,
  },
  formSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
