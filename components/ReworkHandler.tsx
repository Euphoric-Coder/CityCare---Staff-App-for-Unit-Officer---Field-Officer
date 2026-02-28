import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AlertTriangle, MessageSquare, Calendar, Image as ImageIcon } from 'lucide-react-native';

interface ReworkData {
  reason: string;
  comment: string;
  sent_by: string;
  sent_at: string;
  previous_submission: {
    after_image: string;
    notes: string;
    submitted_at: string;
  };
}

interface ReworkHandlerProps {
  reworkData: ReworkData;
}

export default function ReworkHandler({ reworkData }: ReworkHandlerProps) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.alertBanner}>
        <AlertTriangle color="#FFFFFF" size={24} strokeWidth={2.5} />
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Rework Required</Text>
          <Text style={styles.alertSubtitle}>Please address the issues and resubmit</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rework Reason</Text>
        <View style={styles.reasonCard}>
          <View style={styles.reasonHeader}>
            <View style={styles.reasonIcon}>
              <AlertTriangle color="#F59E0B" size={20} strokeWidth={2.5} />
            </View>
            <Text style={styles.reasonText}>{reworkData.reason}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unit Officer Comment</Text>
        <View style={styles.commentCard}>
          <MessageSquare color="#6B7280" size={18} strokeWidth={2} />
          <Text style={styles.commentText}>{reworkData.comment}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Previous Submission</Text>
        <View style={styles.submissionCard}>
          <View style={styles.submissionRow}>
            <Calendar color="#6B7280" size={16} strokeWidth={2} />
            <Text style={styles.submissionDate}>
              {new Date(reworkData.previous_submission.submitted_at).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.submissionRow}>
            <ImageIcon color="#6B7280" size={16} strokeWidth={2} />
            <Text style={styles.submissionLabel}>After Image on File</Text>
          </View>
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Previous Notes:</Text>
            <Text style={styles.notesText}>{reworkData.previous_submission.notes}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sent By</Text>
        <View style={styles.sentByCard}>
          <Text style={styles.sentByName}>{reworkData.sent_by}</Text>
          <Text style={styles.sentByDate}>
            {new Date(reworkData.sent_at).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={styles.instructionCard}>
        <Text style={styles.instructionTitle}>Next Steps</Text>
        <Text style={styles.instructionText}>
          1. Review the Unit Officer's feedback{'\n'}
          2. Capture a new after image if needed{'\n'}
          3. Update your work notes{'\n'}
          4. Resubmit for verification
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alertSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  reasonCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  commentCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentText: {
    flex: 1,
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  submissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  submissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submissionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  submissionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  notesBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  sentByCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sentByName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sentByDate: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  instructionCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#CCFBF1',
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#0F766E',
    lineHeight: 22,
  },
});
