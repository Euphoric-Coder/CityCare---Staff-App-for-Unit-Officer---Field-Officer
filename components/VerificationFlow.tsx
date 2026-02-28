import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, CheckCircle2, XCircle } from 'lucide-react-native';
import ActionButton from './ui/ActionButton';
import { VerificationChecklist } from '../lib/types';
import ChecklistItem from './ui/ChecklistItem';

interface VerificationFlowProps {
  onVerify: (checklist: VerificationChecklist, slaDate: string) => void;
  onReject: () => void;
}

export default function VerificationFlow({ onVerify, onReject }: VerificationFlowProps) {
  const [checklist, setChecklist] = useState<VerificationChecklist>({
    locationValid: false,
    evidenceSufficient: false,
    notDuplicate: false,
    withinJurisdiction: false,
  });

  const [slaDate, setSlaDate] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const canVerify = () => {
    return (
      checklist.locationValid &&
      checklist.evidenceSufficient &&
      checklist.notDuplicate &&
      checklist.withinJurisdiction
    );
  };

  const handleVerify = () => {
    if (canVerify()) {
      onVerify(checklist, slaDate.toISOString());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Issue Verification</Text>
      <Text style={styles.subtitle}>Review the issue and confirm all criteria are met</Text>

      <View style={styles.checklistSection}>
        <ChecklistItem
          label="Location is valid and verifiable"
          checked={checklist.locationValid}
          onToggle={() => setChecklist({ ...checklist, locationValid: !checklist.locationValid })}
        />
        <ChecklistItem
          label="Evidence (photos/description) is sufficient"
          checked={checklist.evidenceSufficient}
          onToggle={() =>
            setChecklist({ ...checklist, evidenceSufficient: !checklist.evidenceSufficient })
          }
        />
        <ChecklistItem
          label="Not a duplicate of existing issue"
          checked={checklist.notDuplicate}
          onToggle={() => setChecklist({ ...checklist, notDuplicate: !checklist.notDuplicate })}
          hint={!checklist.notDuplicate ? 'Search for similar issues first' : undefined}
        />
        <ChecklistItem
          label="Issue is within municipal jurisdiction"
          checked={checklist.withinJurisdiction}
          onToggle={() =>
            setChecklist({ ...checklist, withinJurisdiction: !checklist.withinJurisdiction })
          }
        />
      </View>

      <View style={styles.slaSection}>
        <Text style={styles.slaLabel}>SLA Deadline</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}>
          <Calendar size={20} color="#0EA5A4" />
          <Text style={styles.dateText}>{slaDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>SLA deadline determines priority and escalation timing</Text>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={slaDate}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) setSlaDate(selectedDate);
          }}
        />
      )}

      <View style={styles.buttonRow}>
        <ActionButton
          label="Reject"
          onPress={onReject}
          variant="danger"
          size="medium"
          fullWidth={false}
          icon={XCircle}
        />
        <ActionButton
          label="Verify & Continue"
          onPress={handleVerify}
          variant="success"
          size="medium"
          fullWidth={false}
          disabled={!canVerify()}
          icon={CheckCircle2}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#86EFAC',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  checklistSection: {
    marginBottom: 20,
  },
  slaSection: {
    marginBottom: 20,
  },
  slaLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0EA5A4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
