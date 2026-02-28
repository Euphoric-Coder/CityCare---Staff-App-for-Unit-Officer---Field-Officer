import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckSquare, Square } from 'lucide-react-native';

interface ChecklistItemProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  hint?: string;
}

export default function ChecklistItem({ label, checked, onToggle, hint }: ChecklistItemProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.checkboxRow} onPress={onToggle} activeOpacity={0.7}>
        {checked ? (
          <CheckSquare size={24} color="#16A34A" strokeWidth={2.5} />
        ) : (
          <Square size={24} color="#94A3B8" strokeWidth={2} />
        )}
        <Text style={[styles.label, checked && styles.labelChecked]}>{label}</Text>
      </TouchableOpacity>
      {hint && !checked && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  label: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  labelChecked: {
    color: '#16A34A',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 36,
    marginTop: -4,
    fontStyle: 'italic',
  },
});
