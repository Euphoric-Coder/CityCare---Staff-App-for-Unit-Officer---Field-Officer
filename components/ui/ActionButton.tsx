import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LucideIcon } from 'lucide-react-native';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'purple' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon: Icon,
  fullWidth = false,
  size = 'medium',
}: ActionButtonProps) {
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: '#0EA5A4',
          text: '#FFFFFF',
          border: '#0EA5A4',
          disabledBg: '#CCFBF1',
          disabledText: '#5EEAD4',
        };
      case 'success':
        return {
          bg: '#16A34A',
          text: '#FFFFFF',
          border: '#16A34A',
          disabledBg: '#D1FAE5',
          disabledText: '#86EFAC',
        };
      case 'danger':
        return {
          bg: '#DC2626',
          text: '#FFFFFF',
          border: '#DC2626',
          disabledBg: '#FEE2E2',
          disabledText: '#FCA5A5',
        };
      case 'warning':
        return {
          bg: '#F59E0B',
          text: '#FFFFFF',
          border: '#F59E0B',
          disabledBg: '#FEF3C7',
          disabledText: '#FCD34D',
        };
      case 'purple':
        return {
          bg: '#7C3AED',
          text: '#FFFFFF',
          border: '#7C3AED',
          disabledBg: '#EDE9FE',
          disabledText: '#C4B5FD',
        };
      case 'outline':
        return {
          bg: 'transparent',
          text: '#0EA5A4',
          border: '#0EA5A4',
          disabledBg: 'transparent',
          disabledText: '#CCFBF1',
        };
      default:
        return {
          bg: '#0EA5A4',
          text: '#FFFFFF',
          border: '#0EA5A4',
          disabledBg: '#CCFBF1',
          disabledText: '#5EEAD4',
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles =
    size === 'small' ? styles.small : size === 'large' ? styles.large : styles.medium;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isDisabled ? variantStyles.disabledBg : variantStyles.bg,
          borderColor: isDisabled ? variantStyles.disabledBg : variantStyles.border,
        },
        sizeStyles,
        fullWidth && styles.fullWidth,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variantStyles.text} size="small" />
        ) : (
          <>
            {Icon && (
              <Icon
                size={size === 'small' ? 16 : size === 'large' ? 22 : 18}
                color={isDisabled ? variantStyles.disabledText : variantStyles.text}
                strokeWidth={2.5}
              />
            )}
            <Text
              style={[
                styles.text,
                { color: isDisabled ? variantStyles.disabledText : variantStyles.text },
                sizeStyles,
              ]}>
              {label}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  fullWidth: {
    width: '100%',
  },
  small: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 36,
    fontSize: 14,
  },
  medium: {
    fontSize: 16,
  },
  large: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 52,
    fontSize: 18,
  },
});
