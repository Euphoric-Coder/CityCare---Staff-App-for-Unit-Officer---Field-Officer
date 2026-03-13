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
} from 'react-native';
import {
  Lock,
  Eye,
  EyeOff,
  Shield,
  CircleCheck as CheckCircle,
  Circle as XCircle,
} from 'lucide-react-native';

interface ChangePasswordScreenProps {
  onComplete: () => void;
}

export default function ChangePasswordScreen({ onComplete }: ChangePasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      hasMinLength,
      hasUpperCase,
      hasNumber,
      hasSpecialChar,
      isValid: hasMinLength && hasUpperCase && hasNumber && hasSpecialChar,
    };
  };

  const passwordStrength = validatePassword(newPassword);

  const handleUpdatePassword = () => {
    let hasError = false;
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
      hasError = true;
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
      hasError = true;
    } else if (!passwordStrength.isValid) {
      newErrors.newPassword = 'Password does not meet security requirements';
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

    if (!hasError) {
      Alert.alert('Success', 'Password updated successfully', [
        {
          text: 'OK',
          onPress: onComplete,
        },
      ]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F0FDFA] dark:bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Animated.View className="flex-1 pb-10" style={{ opacity: fadeAnim }}>
            {/* Header */}
            <View className="items-center rounded-b-[32px] bg-[#0EA5A4] px-6 pb-10 pt-10 shadow-lg dark:bg-teal-700">
              <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-white/20">
                <Lock size={40} color="#FFFFFF" strokeWidth={2.5} />
              </View>

              <Text className="mb-3 text-center text-[28px] font-bold text-white">
                Change Your Password
              </Text>

              <Text className="px-5 text-center text-[15px] font-medium leading-[22px] text-white opacity-95">
                For security reasons, you must update your password before continuing.
              </Text>
            </View>

            {/* Card */}
            <View className="mx-5 -mt-5 rounded-[20px] bg-white p-6 shadow-md dark:bg-slate-800">
              {/* Current Password */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold tracking-wide text-[#0F766E] dark:text-teal-400">
                  Current Password
                </Text>

                <View className="h-14 flex-row items-center rounded-3xl border-2 border-[#CCFBF1] bg-slate-50 px-4 dark:border-slate-600 dark:bg-slate-700">
                  <View className="mr-4">
                    <Lock size={20} color="#0EA5A4" strokeWidth={2} />
                  </View>

                  <TextInput
                    className="flex-1 text-base font-medium text-slate-800 dark:text-white"
                    placeholder="Enter current password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showCurrentPassword}
                    value={currentPassword}
                    onChangeText={(text) => {
                      setCurrentPassword(text);
                      setErrors({ ...errors, currentPassword: '' });
                    }}
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="ml-2 p-2">
                    {showCurrentPassword ? (
                      <EyeOff size={20} color="#64748B" />
                    ) : (
                      <Eye size={20} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>

                {errors.currentPassword && (
                  <Text className="ml-1 mt-1.5 text-[13px] font-medium text-red-500">
                    {errors.currentPassword}
                  </Text>
                )}
              </View>

              {/* New Password */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold tracking-wide text-[#0F766E] dark:text-teal-400">
                  New Password
                </Text>

                <View className="h-14 flex-row items-center rounded-3xl border-2 border-[#CCFBF1] bg-slate-50 px-4 dark:border-slate-600 dark:bg-slate-700">
                  <View className="mr-4">
                    <Lock size={20} color="#0EA5A4" strokeWidth={2} />
                  </View>

                  <TextInput
                    className="flex-1 text-base font-medium text-slate-800 dark:text-white"
                    placeholder="Enter new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setErrors({ ...errors, newPassword: '' });
                    }}
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    className="ml-2 p-2">
                    {showNewPassword ? (
                      <EyeOff size={20} color="#64748B" />
                    ) : (
                      <Eye size={20} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>

                {errors.newPassword && (
                  <Text className="ml-1 mt-1.5 text-[13px] font-medium text-red-500">
                    {errors.newPassword}
                  </Text>
                )}

                {/* Password Strength */}
                {newPassword.length > 0 && (
                  <View className="mt-3 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] p-4 dark:border-slate-600 dark:bg-slate-700">
                    <Text className="mb-3 text-[13px] font-semibold text-[#0F766E] dark:text-teal-400">
                      Password must contain:
                    </Text>

                    <View className="mb-2 flex-row items-center gap-2">
                      {passwordStrength.hasMinLength ? (
                        <CheckCircle size={16} color="#16A34A" />
                      ) : (
                        <XCircle size={16} color="#DC2626" />
                      )}
                      <Text
                        className={`text-[13px] ${passwordStrength.hasMinLength ? 'font-semibold text-green-500' : 'text-slate-500 dark:text-slate-300'}`}>
                        8+ characters
                      </Text>
                    </View>

                    <View className="mb-2 flex-row items-center gap-2">
                      {passwordStrength.hasUpperCase ? (
                        <CheckCircle size={16} color="#16A34A" />
                      ) : (
                        <XCircle size={16} color="#DC2626" />
                      )}
                      <Text
                        className={`text-[13px] ${passwordStrength.hasUpperCase ? 'font-semibold text-green-500' : 'text-slate-500 dark:text-slate-300'}`}>
                        Uppercase letter
                      </Text>
                    </View>

                    <View className="mb-2 flex-row items-center gap-2">
                      {passwordStrength.hasNumber ? (
                        <CheckCircle size={16} color="#16A34A" />
                      ) : (
                        <XCircle size={16} color="#DC2626" />
                      )}
                      <Text
                        className={`text-[13px] ${passwordStrength.hasNumber ? 'font-semibold text-green-500' : 'text-slate-500 dark:text-slate-300'}`}>
                        Number
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                      {passwordStrength.hasSpecialChar ? (
                        <CheckCircle size={16} color="#16A34A" />
                      ) : (
                        <XCircle size={16} color="#DC2626" />
                      )}
                      <Text
                        className={`text-[13px] ${passwordStrength.hasSpecialChar ? 'font-semibold text-green-500' : 'text-slate-500 dark:text-slate-300'}`}>
                        Special character (!@#$%^&*)
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Confirm Password */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold tracking-wide text-[#0F766E] dark:text-teal-400">
                  Confirm Password
                </Text>

                <View className="h-14 flex-row items-center rounded-3xl border-2 border-[#CCFBF1] bg-slate-50 px-4 dark:border-slate-600 dark:bg-slate-700">
                  <View className="mr-4">
                    <Lock size={20} color="#0EA5A4" />
                  </View>

                  <TextInput
                    className="flex-1 text-base font-medium text-slate-800 dark:text-white"
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setErrors({ ...errors, confirmPassword: '' });
                    }}
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="ml-2 p-2">
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#64748B" />
                    ) : (
                      <Eye size={20} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>

                {errors.confirmPassword && (
                  <Text className="ml-1 mt-1.5 text-[13px] font-medium text-red-500">
                    {errors.confirmPassword}
                  </Text>
                )}
              </View>

              {/* Button */}
              <TouchableOpacity
                className="mt-2 h-14 items-center justify-center rounded-full bg-[#0EA5A4] shadow-lg active:opacity-70 dark:bg-teal-600"
                onPress={handleUpdatePassword}>
                <Text className="text-[17px] font-bold tracking-wide text-white">
                  Update Password
                </Text>
              </TouchableOpacity>
            </View>

            {/* Security Note */}
            <View className="mx-5 mt-6 flex-row items-start gap-3 rounded-2xl border border-[#99F6E4] bg-[#CCFBF1] p-5 dark:border-slate-600 dark:bg-slate-800">
              <Shield size={20} color="#0EA5A4" />
              <Text className="flex-1 text-sm font-medium leading-[21px] text-[#0F766E] dark:text-teal-300">
                For security purposes, all CityCare officers must update their password after first
                login.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
