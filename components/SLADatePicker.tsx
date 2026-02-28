import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface SLADatePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  minDate?: Date;
  disabled?: boolean;
}

export default function SLADatePicker({
  selectedDate,
  onDateChange,
  minDate,
  disabled = false,
}: SLADatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select SLA Date';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (date) {
      onDateChange(date);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>SLA Deadline</Text>
        <Text style={styles.required}>Required</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.dateButton,
          selectedDate && styles.dateButtonSelected,
          disabled && styles.dateButtonDisabled,
        ]}
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
        activeOpacity={0.7}>
        <Calendar color={selectedDate ? '#0EA5A4' : '#9CA3AF'} size={20} strokeWidth={2} />
        <Text style={[styles.dateText, selectedDate && styles.dateTextSelected]}>
          {formatDate(selectedDate)}
        </Text>
      </TouchableOpacity>

      {!selectedDate && (
        <Text style={styles.helperText}>Select a deadline date for issue resolution</Text>
      )}

      {showPicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minDate || new Date()}
          textColor="#111827"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  required: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateButton: {
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
  dateButtonSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0EA5A4',
  },
  dateButtonDisabled: {
    opacity: 0.5,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  dateTextSelected: {
    color: '#0F766E',
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});
