import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';

interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

interface VerificationChecklistProps {
  checklist: {
    location_valid: boolean;
    evidence_sufficient: boolean;
    not_duplicate: boolean;
    within_jurisdiction: boolean;
  };
  onToggle: (key: string) => void;
  disabled?: boolean;
}

export default function VerificationChecklist({
  checklist,
  onToggle,
  disabled = false,
}: VerificationChecklistProps) {
  const items: ChecklistItem[] = [
    {
      key: 'location_valid',
      label: 'Location valid & verifiable',
      checked: checklist.location_valid,
    },
    {
      key: 'evidence_sufficient',
      label: 'Evidence sufficient',
      checked: checklist.evidence_sufficient,
    },
    {
      key: 'not_duplicate',
      label: 'Not duplicate',
      checked: checklist.not_duplicate,
    },
    {
      key: 'within_jurisdiction',
      label: 'Within jurisdiction',
      checked: checklist.within_jurisdiction,
    },
  ];

  const allChecked = items.every((item) => item.checked);

  return (
    <View style={[styles.container, allChecked && styles.containerValid]}>
      <View style={styles.header}>
        <Text style={styles.title}>Verification Checklist</Text>
        {allChecked && (
          <View style={styles.validBadge}>
            <CheckCircle2 color="#16A34A" size={16} strokeWidth={2.5} />
            <Text style={styles.validText}>All Valid</Text>
          </View>
        )}
      </View>

      <View style={styles.itemsContainer}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.item, item.checked && styles.itemChecked]}
            onPress={() => !disabled && onToggle(item.key)}
            disabled={disabled}
            activeOpacity={0.7}>
            <View style={styles.checkbox}>
              {item.checked ? (
                <CheckCircle2 color="#16A34A" size={24} strokeWidth={2.5} />
              ) : (
                <Circle color="#9CA3AF" size={24} strokeWidth={2} />
              )}
            </View>
            <Text style={[styles.itemText, item.checked && styles.itemTextChecked]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!allChecked && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>Complete all checklist items before approving</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  containerValid: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  validText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  itemsContainer: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 56,
  },
  itemChecked: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  checkbox: {
    width: 24,
    height: 24,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  itemTextChecked: {
    color: '#166534',
  },
  warningBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
});
