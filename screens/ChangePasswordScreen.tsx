import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Lock,
  Eye,
  EyeOff,
  Shield,
  CircleCheck as CheckCircle,
  Circle as XCircle,
  AlertTriangle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { User } from 'lib/auth';
import { Id } from 'convex/_generated/dataModel';

const { width } = Dimensions.get('window');

interface ChangePasswordScreenProps {
  user: User;
  onComplete: () => Promise<void> | void;
  onSignOut: () => Promise<void> | void;
}

export default function ChangePasswordScreen({
  user,
  onComplete,
  onSignOut,
}: ChangePasswordScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const changeOfficerPassword = useAction(api.officerAuth.changeOfficerPassword);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isCurrentFocused, setIsCurrentFocused] = useState(false);
  const [isNewFocused, setIsNewFocused] = useState(false);
  const [isConfirmFocused, setIsConfirmFocused] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
      isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
    };
  };

  const passwordStrength = validatePassword(newPassword);

  const cleanConvexError = (message: string): string => {
    const dataMatch = message.match(/ConvexError:\s*(.+?)(?:\n|$)/);
    if (dataMatch?.[1]) {
      return dataMatch[1].trim();
    }

    return message
      .replace(/^.*?Uncaught\s+(?:Error|ConvexError):\s*/i, '')
      .replace(/\s+at\s+handler[\s\S]*$/i, '')
      .replace(/\s+Called by client[\s\S]*$/i, '')
      .trim();
  };

  const handleUpdatePassword = async () => {
    if (submitting) return;

    let hasError = false;
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    setServerError('');

    const currentTrimmed = currentPassword.trim();
    if (!currentPassword || currentTrimmed === '') {
      newErrors.currentPassword = 'Current password is required';
      hasError = true;
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
      hasError = true;
    } else if (!passwordStrength.isValid) {
      newErrors.newPassword = 'Password does not meet security requirements';
      hasError = true;
    } else if (newPassword === currentPassword) {
      newErrors.newPassword = 'New password must be different from your current password';
      hasError = true;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) return;

    if (!user?.id) {
      setServerError('User context not found. Please log in again.');
      return;
    }

    setSubmitting(true);

    try {
      await changeOfficerPassword({
        userId: user.id as Id<'users'>,
        currentPassword: currentTrimmed,
        newPassword,
      });

      Alert.alert(
        'Password Updated',
        'Your account has been secured successfully. You can now continue to your officer dashboard.',
        [
          {
            text: 'Continue',
            onPress: () => {
              void onComplete();
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : 'Unable to update your password';

      const cleanMessage = cleanConvexError(rawMessage);

      if (cleanMessage.toLowerCase().includes('current password')) {
        setErrors((previous) => ({
          ...previous,
          currentPassword: cleanMessage,
        }));
      } else {
        setServerError(cleanMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  console.info('MANDATORY_PASSWORD_USER_CHECK', {
    hasUser: Boolean(user),
    id: user?.id ?? null,
    legacyId: (user as any)?._id ?? null,
    userId: (user as any)?.userId ?? null,
    officerProfileId: user?.officerProfileId ?? null,
    role: user?.role ?? null,
    mustChangePassword: user?.mustChangePassword ?? null,
    email: user?.email ?? null,
  });

  const hasValidMandatorySession =
    Boolean(user?.id) &&
    Boolean(user?.email) &&
    (user?.role === 'unit_officer' || user?.role === 'field_officer');

  if (!hasValidMandatorySession) {
    console.error('INVALID_MANDATORY_PASSWORD_SESSION', {
      hasUser: Boolean(user),
      hasId: Boolean(user?.id),
      hasEmail: Boolean(user?.email),
      role: user?.role ?? null,
    });

    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: isDark ? '#020617' : '#F0FDFA',
        }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#991B1B', textAlign: 'center' }}>
          Unable to validate the mandatory password-change account.
        </Text>
        {__DEV__ && (
          <Text
            style={{
              marginTop: 8,
              fontSize: 13,
              color: isDark ? '#94A3B8' : '#475569',
              textAlign: 'center',
            }}>
            {`ID: ${user?.id ? 'available' : 'missing'} | Role: ${user?.role ?? 'missing'} | Email: ${user?.email ? 'available' : 'missing'}`}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => {
            void onSignOut();
          }}
          style={{
            marginTop: 20,
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: '#0D9488',
            borderRadius: 12,
          }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Return to Sign In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const bgColors: [string, string, string] = isDark
    ? ['#020617', '#022c22', '#064e3b']
    : ['#f8fafc', '#ecfdf5', '#cffafe'];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      <LinearGradient colors={bgColors} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <Animated.View className="flex-1 pb-10" style={{ opacity: fadeAnim }}>
              {/* Concentric rings header */}
              <View className="items-center justify-center pb-6 pt-14">
                <View
                  style={{ width: 130, height: 130 }}
                  className="mb-4 items-center justify-center">
                  <View
                    style={{
                      position: 'absolute',
                      width: 130,
                      height: 130,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(34,211,238,0.06)' : 'rgba(13,148,136,0.06)',
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      width: 106,
                      height: 106,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(34,211,238,0.12)' : 'rgba(13,148,136,0.12)',
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      width: 82,
                      height: 82,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(34,211,238,0.2)' : 'rgba(13,148,136,0.2)',
                    }}
                  />
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 999,
                      backgroundColor: isDark ? '#0f766e' : '#0d9488',
                    }}
                    className="items-center justify-center shadow-lg shadow-teal-500/30">
                    <Shield size={30} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                </View>

                <Text className="px-4 text-center text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Mandatory Password Change
                </Text>
                <Text className="mt-1 px-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                  Security policy requires changing your temporary password on first sign in.
                </Text>
              </View>

              {/* Form Card */}
              <View className="mx-5 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
                {serverError ? (
                  <View className="mb-5 flex-row items-center space-x-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/40">
                    <AlertTriangle size={20} color="#E11D48" />
                    <Text className="flex-1 text-sm font-medium text-rose-700 dark:text-rose-300">
                      {serverError}
                    </Text>
                  </View>
                ) : null}

                {/* Current Password Field */}
                <View className="mb-5">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Current Password
                  </Text>
                  <View
                    style={{
                      borderWidth: 1.5,
                      borderColor: errors.currentPassword
                        ? '#EF4444'
                        : isCurrentFocused
                          ? isDark
                            ? '#22D3EE'
                            : '#0D9488'
                          : isDark
                            ? '#1E293B'
                            : '#E2E8F0',
                    }}
                    className="flex-row items-center rounded-2xl bg-slate-50 px-4 py-3.5 dark:bg-slate-950">
                    <Lock size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 0 }}
                      className="ml-3 text-base font-medium text-slate-900 dark:text-white"
                      placeholder="Enter current password"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      secureTextEntry={!showCurrentPassword}
                      value={currentPassword}
                      onChangeText={(text) => {
                        setCurrentPassword(text);
                        setErrors((prev) => ({ ...prev, currentPassword: '' }));
                      }}
                      onFocus={() => setIsCurrentFocused(true)}
                      onBlur={() => setIsCurrentFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="p-1">
                      {showCurrentPassword ? (
                        <EyeOff size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                      ) : (
                        <Eye size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {errors.currentPassword ? (
                    <Text className="ml-1 mt-1.5 text-xs font-medium text-rose-500">
                      {errors.currentPassword}
                    </Text>
                  ) : null}
                </View>

                {/* New Password Field */}
                <View className="mb-5">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    New Password
                  </Text>
                  <View
                    style={{
                      borderWidth: 1.5,
                      borderColor: errors.newPassword
                        ? '#EF4444'
                        : isNewFocused
                          ? isDark
                            ? '#22D3EE'
                            : '#0D9488'
                          : isDark
                            ? '#1E293B'
                            : '#E2E8F0',
                    }}
                    className="flex-row items-center rounded-2xl bg-slate-50 px-4 py-3.5 dark:bg-slate-950">
                    <Lock size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 0 }}
                      className="ml-3 text-base font-medium text-slate-900 dark:text-white"
                      placeholder="Enter new password"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        setErrors((prev) => ({ ...prev, newPassword: '' }));
                      }}
                      onFocus={() => setIsNewFocused(true)}
                      onBlur={() => setIsNewFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      className="p-1">
                      {showNewPassword ? (
                        <EyeOff size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                      ) : (
                        <Eye size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {errors.newPassword ? (
                    <Text className="ml-1 mt-1.5 text-xs font-medium text-rose-500">
                      {errors.newPassword}
                    </Text>
                  ) : null}

                  {/* Strength Checklist */}
                  <View className="mt-3 rounded-2xl border border-slate-200/50 bg-slate-100/70 p-3.5 dark:border-slate-800/80 dark:bg-slate-950/60">
                    <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Password Policy Checklist
                    </Text>
                    <View className="space-y-1.5">
                      {[
                        {
                          label: 'At least 8 characters long',
                          valid: passwordStrength.hasMinLength,
                        },
                        {
                          label: 'Contains an uppercase letter (A-Z)',
                          valid: passwordStrength.hasUpperCase,
                        },
                        {
                          label: 'Contains a lowercase letter (a-z)',
                          valid: passwordStrength.hasLowerCase,
                        },
                        { label: 'Contains a number (0-9)', valid: passwordStrength.hasNumber },
                        {
                          label: 'Contains a special character (!@#$%^&*)',
                          valid: passwordStrength.hasSpecialChar,
                        },
                      ].map((item, idx) => (
                        <View key={idx} className="my-0.5 flex-row items-center space-x-2">
                          {item.valid ? (
                            <CheckCircle size={14} color="#10B981" />
                          ) : (
                            <XCircle size={14} color={isDark ? '#475569' : '#94A3B8'} />
                          )}
                          <Text
                            style={{ fontSize: 12 }}
                            className={`ml-1.5 font-medium ${item.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {item.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Confirm Password Field */}
                <View className="mb-6">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Confirm New Password
                  </Text>
                  <View
                    style={{
                      borderWidth: 1.5,
                      borderColor: errors.confirmPassword
                        ? '#EF4444'
                        : isConfirmFocused
                          ? isDark
                            ? '#22D3EE'
                            : '#0D9488'
                          : isDark
                            ? '#1E293B'
                            : '#E2E8F0',
                    }}
                    className="flex-row items-center rounded-2xl bg-slate-50 px-4 py-3.5 dark:bg-slate-950">
                    <Lock size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 0 }}
                      className="ml-3 text-base font-medium text-slate-900 dark:text-white"
                      placeholder="Re-enter new password"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      onFocus={() => setIsConfirmFocused(true)}
                      onBlur={() => setIsConfirmFocused(false)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="p-1">
                      {showConfirmPassword ? (
                        <EyeOff size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                      ) : (
                        <Eye size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword ? (
                    <Text className="ml-1 mt-1.5 text-xs font-medium text-rose-500">
                      {errors.confirmPassword}
                    </Text>
                  ) : null}
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                  onPress={handleUpdatePassword}
                  disabled={submitting}
                  className="w-full items-center justify-center rounded-2xl bg-teal-600 py-4 shadow-lg shadow-teal-600/30 active:opacity-90 dark:bg-teal-500">
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-bold tracking-wide text-white">
                      Update Password & Continue
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => void onSignOut()}
                  className="mt-3 w-full items-center justify-center py-3">
                  <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
