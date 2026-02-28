import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { AlertTriangle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react-native';
import ActionButton from './ActionButton';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  doubleConfirm?: boolean;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  doubleConfirm = false,
}: ConfirmModalProps) {
  const [firstConfirm, setFirstConfirm] = React.useState(false);

  const handleConfirm = () => {
    if (doubleConfirm && !firstConfirm) {
      setFirstConfirm(true);
      return;
    }
    setFirstConfirm(false);
    onConfirm();
  };

  const handleCancel = () => {
    setFirstConfirm(false);
    onCancel();
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <XCircle size={48} color="#DC2626" strokeWidth={2} />;
      case 'success':
        return <CheckCircle2 size={48} color="#16A34A" strokeWidth={2} />;
      case 'warning':
        return <AlertTriangle size={48} color="#F59E0B" strokeWidth={2} />;
      default:
        return <AlertCircle size={48} color="#0EA5A4" strokeWidth={2} />;
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'danger';
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      default:
        return 'primary';
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.androidOverlay} />
        )}

        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>{getIcon()}</View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {doubleConfirm && firstConfirm && (
            <View style={styles.warningBox}>
              <AlertTriangle size={16} color="#DC2626" strokeWidth={2.5} />
              <Text style={styles.warningText}>
                This action cannot be undone. Are you absolutely sure?
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <ActionButton
              label={cancelText}
              onPress={handleCancel}
              variant="outline"
              size="medium"
              fullWidth={false}
            />
            <ActionButton
              label={firstConfirm ? "Yes, I'm sure" : confirmText}
              onPress={handleConfirm}
              variant={getButtonVariant()}
              size="medium"
              fullWidth={false}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  androidOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
});
