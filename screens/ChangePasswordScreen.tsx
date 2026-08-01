import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
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
import { useUser } from 'context/UserContext';
import { Id } from 'convex/_generated/dataModel';

const { width } = Dimensions.get('window');

interface ChangePasswordScreenProps {
  onComplete: () => void;
}

export default function ChangePasswordScreen({ onComplete }: ChangePasswordScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const user = useUser();
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

  const newPasswordRef = React.useRef<TextInput>(null);
  const confirmPasswordRef = React.useRef<TextInput>(null);

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
            onPress: onComplete,
          },
        ],
        { cancelable: false }
      );
    } catch (error: unknown) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : 'Unable to update your password';

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

  // Gradient definitions matching splash screens
  const bgColors: [string, string, string] = isDark
    ? ['#020617', '#022c22', '#064e3b']
    : ['#f8fafc', '#ecfdf5', '#cffafe'];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
      <LinearGradient colors={bgColors} style={{ flex: 1 }}>
        
        {/* Glow blobs */}
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          <View
            style={{
              position: 'absolute',
              width: width * 0.9,
              height: width * 0.9,
              top: -width * 0.35,
              left: -width * 0.15,
              borderRadius: 999,
              backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.05)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: width * 0.8,
              height: width * 0.8,
              bottom: -width * 0.25,
              right: -width * 0.2,
              borderRadius: 999,
              backgroundColor: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(207,250,254,0.4)',
            }}
          />
        </View>

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
              <View className="items-center justify-center pt-14 pb-6">
                <View style={{ width: 130, height: 130 }} className="items-center justify-center mb-4">
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
                      width: 104,
                      height: 104,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(34,211,238,0.15)' : 'rgba(13,148,136,0.12)',
                      backgroundColor: isDark ? 'rgba(34,211,238,0.02)' : 'rgba(13,148,136,0.02)',
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      width: 78,
                      height: 78,
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(34,211,238,0.35)' : 'rgba(13,148,136,0.3)',
                      backgroundColor: isDark ? 'rgba(34,211,238,0.04)' : 'rgba(13,148,136,0.04)',
                    }}
                  />
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(34,211,238,0.45)' : 'rgba(13,148,136,0.3)',
                      backgroundColor: isDark ? '#064e3b' : '#bbf7d0',
                      shadowColor: isDark ? '#22d3ee' : '#0d9488',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.3,
                      shadowRadius: 10,
                      elevation: 10,
                    }}>
                    <Lock size={22} color={isDark ? '#6ee7b7' : '#065f46'} strokeWidth={2} />
                  </View>
                </View>

                <Text className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Secure Your Account
                </Text>
                <Text className={`mt-1.5 text-center text-xs font-semibold px-12 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Create a personalized password before accessing your municipal officer dashboard.
                </Text>
              </View>

              {/* Input Card */}
              <View className={`mx-5 rounded-[28px] p-6 shadow-xl border ${
                isDark 
                  ? 'bg-slate-900/60 border-slate-800/80 shadow-black/40' 
                  : 'bg-white/90 border-slate-100 shadow-slate-200/50'
              }`}>
                
                {/* Server Error Display */}
                {serverError ? (
                  <View className="mb-5 flex-row items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4 dark:bg-rose-950/20 dark:border-rose-900/30">
                    <AlertTriangle size={18} color="#E11D48" />
                    <Text className="flex-1 text-[13px] font-bold text-rose-600 dark:text-rose-455" style={{ flexWrap: 'wrap' }} numberOfLines={0}>
                      {serverError}
                    </Text>
                  </View>
                ) : null}

                {/* Current Password Input */}
                <View className="mb-5">
                  <Text className="mb-2 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Current Password
                  </Text>

                  <View
                    style={{
                      borderColor: errors.currentPassword
                        ? '#EF4444'
                        : isCurrentFocused
                          ? '#0D9488'
                          : isDark
                            ? '#1e293b'
                            : '#f1f5f9',
                      borderWidth: 1.5,
                      backgroundColor: isDark ? 'rgba(15,23,42,0.4)' : '#f8fafc',
                    }}
                    className="h-14 flex-row items-center rounded-2xl px-4">
                    <View className="mr-3">
                      <Lock size={18} color={isCurrentFocused ? '#0D9488' : '#94A3B8'} />
                    </View>

                    <TextInput
                      className="flex-1 text-sm font-semibold text-slate-800 dark:text-white"
                      placeholder="Enter current password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showCurrentPassword}
                      value={currentPassword}
                      onChangeText={(text) => {
                        setCurrentPassword(text);
                        setErrors((prev) => ({ ...prev, currentPassword: '' }));
                      }}
                      onFocus={() => setIsCurrentFocused(true)}
                      onBlur={() => setIsCurrentFocused(false)}
                      autoCapitalize="none"
                      editable={!submitting}
                      textContentType="password"
                      autoComplete="password"
                      onSubmitEditing={() => newPasswordRef.current?.focus()}
                      blurOnSubmit={false}
                      returnKeyType="next"
                    />

                    <TouchableOpacity
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{ padding: 14, margin: -6 }}
                      disabled={submitting}>
                      {showCurrentPassword ? (
                        <EyeOff size={18} color="#94A3B8" />
                      ) : (
                        <Eye size={18} color="#94A3B8" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {errors.currentPassword ? (
                    <Text className="ml-1 mt-1.5 text-xs font-bold text-red-500">
                      {errors.currentPassword}
                    </Text>
                  ) : null}
                </View>

                {/* New Password Input */}
                <View className="mb-5">
                  <Text className="mb-2 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    New Password
                  </Text>

                  <View
                    style={{
                      borderColor: errors.newPassword
                        ? '#EF4444'
                        : isNewFocused
                          ? '#0D9488'
                          : isDark
                            ? '#1e293b'
                            : '#f1f5f9',
                      borderWidth: 1.5,
                      backgroundColor: isDark ? 'rgba(15,23,42,0.4)' : '#f8fafc',
                    }}
                    className="h-14 flex-row items-center rounded-2xl px-4">
                    <View className="mr-3">
                      <Lock size={18} color={isNewFocused ? '#0D9488' : '#94A3B8'} />
                    </View>

                    <TextInput
                      ref={newPasswordRef}
                      className="flex-1 text-sm font-semibold text-slate-800 dark:text-white"
                      placeholder="Enter new password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        setErrors((prev) => ({ ...prev, newPassword: '' }));
                      }}
                      onFocus={() => setIsNewFocused(true)}
                      onBlur={() => setIsNewFocused(false)}
                      autoCapitalize="none"
                      editable={!submitting}
                      textContentType="newPassword"
                      autoComplete="password"
                      onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                      blurOnSubmit={false}
                      returnKeyType="next"
                    />

                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={{ padding: 14, margin: -6 }}
                      disabled={submitting}>
                      {showNewPassword ? (
                        <EyeOff size={18} color="#94A3B8" />
                      ) : (
                        <Eye size={18} color="#94A3B8" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {errors.newPassword ? (
                    <Text className="ml-1 mt-1.5 text-xs font-bold text-red-500">
                      {errors.newPassword}
                    </Text>
                  ) : null}

                  {/* Password Strength Checklist (2-Column Grid Layout) */}
                  {newPassword.length > 0 && (
                    <View className="mt-4 rounded-2xl border border-teal-100/20 bg-teal-50/5 p-4 dark:border-slate-800/80 dark:bg-slate-950/25">
                      <Text className="mb-3 text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">
                        Password Safety Requirements
                      </Text>

                      <View className="flex-row flex-wrap justify-between gap-y-2">
                        {/* Requirement 1 */}
                        <View style={{ width: '48%' }} className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${
                          passwordStrength.hasMinLength 
                            ? 'bg-emerald-500/10 border-emerald-500/25 dark:bg-emerald-500/15' 
                            : 'bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800'
                        }`}>
                          {passwordStrength.hasMinLength ? (
                            <CheckCircle size={14} color="#10B981" />
                          ) : (
                            <XCircle size={14} color="#94A3B8" />
                          )}
                          <Text className={`text-[11px] font-bold ${
                            passwordStrength.hasMinLength 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            8+ characters
                          </Text>
                        </View>

                        {/* Requirement 2 */}
                        <View style={{ width: '48%' }} className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${
                          passwordStrength.hasUpperCase 
                            ? 'bg-emerald-500/10 border-emerald-500/25 dark:bg-emerald-500/15' 
                            : 'bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800'
                        }`}>
                          {passwordStrength.hasUpperCase ? (
                            <CheckCircle size={14} color="#10B981" />
                          ) : (
                            <XCircle size={14} color="#94A3B8" />
                          )}
                          <Text className={`text-[11px] font-bold ${
                            passwordStrength.hasUpperCase 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            Uppercase
                          </Text>
                        </View>

                        {/* Requirement 3 */}
                        <View style={{ width: '48%' }} className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${
                          passwordStrength.hasLowerCase 
                            ? 'bg-emerald-500/10 border-emerald-500/25 dark:bg-emerald-500/15' 
                            : 'bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800'
                        }`}>
                          {passwordStrength.hasLowerCase ? (
                            <CheckCircle size={14} color="#10B981" />
                          ) : (
                            <XCircle size={14} color="#94A3B8" />
                          )}
                          <Text className={`text-[11px] font-bold ${
                            passwordStrength.hasLowerCase 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            Lowercase
                          </Text>
                        </View>

                        {/* Requirement 4 */}
                        <View style={{ width: '48%' }} className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${
                          passwordStrength.hasNumber 
                            ? 'bg-emerald-500/10 border-emerald-500/25 dark:bg-emerald-500/15' 
                            : 'bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800'
                        }`}>
                          {passwordStrength.hasNumber ? (
                            <CheckCircle size={14} color="#10B981" />
                          ) : (
                            <XCircle size={14} color="#94A3B8" />
                          )}
                          <Text className={`text-[11px] font-bold ${
                            passwordStrength.hasNumber 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            Number (0-9)
                          </Text>
                        </View>

                        {/* Requirement 5 */}
                        <View style={{ width: '100%' }} className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${
                          passwordStrength.hasSpecialChar 
                            ? 'bg-emerald-500/10 border-emerald-500/25 dark:bg-emerald-500/15' 
                            : 'bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800'
                        }`}>
                          {passwordStrength.hasSpecialChar ? (
                            <CheckCircle size={14} color="#10B981" />
                          ) : (
                            <XCircle size={14} color="#94A3B8" />
                          )}
                          <Text className={`text-[11px] font-bold ${
                            passwordStrength.hasSpecialChar 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            Special Symbol (!@#$%^&*)
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Confirm Password Input */}
                <View className="mb-6">
                  <Text className="mb-2 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Confirm Password
                  </Text>

                  <View
                    style={{
                      borderColor: errors.confirmPassword
                        ? '#EF4444'
                        : isConfirmFocused
                          ? '#0D9488'
                          : isDark
                            ? '#1e293b'
                            : '#f1f5f9',
                      borderWidth: 1.5,
                      backgroundColor: isDark ? 'rgba(15,23,42,0.4)' : '#f8fafc',
                    }}
                    className="h-14 flex-row items-center rounded-2xl px-4">
                    <View className="mr-3">
                      <Lock size={18} color={isConfirmFocused ? '#0D9488' : '#94A3B8'} />
                    </View>

                    <TextInput
                      ref={confirmPasswordRef}
                      className="flex-1 text-sm font-semibold text-slate-800 dark:text-white"
                      placeholder="Re-enter new password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      onFocus={() => setIsConfirmFocused(true)}
                      onBlur={() => setIsConfirmFocused(false)}
                      autoCapitalize="none"
                      editable={!submitting}
                      textContentType="newPassword"
                      autoComplete="password"
                      onSubmitEditing={handleUpdatePassword}
                      returnKeyType="done"
                    />

                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ padding: 14, margin: -6 }}
                      disabled={submitting}>
                      {showConfirmPassword ? (
                        <EyeOff size={18} color="#94A3B8" />
                      ) : (
                        <Eye size={18} color="#94A3B8" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {errors.confirmPassword ? (
                    <Text className="ml-1 mt-1.5 text-xs font-bold text-red-500">
                      {errors.confirmPassword}
                    </Text>
                  ) : null}
                </View>

                {/* Update Action Button (Full-width custom styling) */}
                <View className="mt-6 w-full" style={{
                  shadowColor: '#14b8a6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.15 : 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }}>
                  <TouchableOpacity
                    disabled={submitting}
                    activeOpacity={0.85}
                    onPress={handleUpdatePassword}
                    style={{
                      width: '100%',
                      borderRadius: 18,
                      overflow: 'hidden',
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: submitting, busy: submitting }}
                    accessibilityLabel={submitting ? "Updating Password, please wait" : "Update Password"}>
                    <LinearGradient
                      colors={
                        submitting
                          ? ['#64748B', '#475569']
                          : ['#14B8A6', '#0F766E']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: '100%',
                        minHeight: 60,
                        paddingHorizontal: 24,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: submitting ? 0.8 : 1,
                      }}>
                      {submitting ? (
                        <View className="flex-row items-center gap-2">
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text className="text-sm font-extrabold text-white tracking-widest uppercase">
                            Updating Password...
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-2">
                          <Shield size={18} color="#FFFFFF" strokeWidth={2} />
                          <Text className="text-sm font-extrabold text-white tracking-widest uppercase">
                            Update Password
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom security pill note */}
              <View className={`mx-5 mt-6 flex-row items-start gap-3 rounded-2xl border p-4 ${
                isDark 
                  ? 'border-slate-800 bg-slate-900/45' 
                  : 'border-teal-100 bg-[#CCFBF1]/10'
              }`}>
                <View className="mt-0.5">
                  <Shield size={16} color={isDark ? '#22d3ee' : '#0ea5a4'} />
                </View>
                <Text className={`flex-1 text-[11px] font-semibold leading-normal ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  For municipal compliance and data safety, all city municipal officers must secure their account using a personalized password upon first sign-in.
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
