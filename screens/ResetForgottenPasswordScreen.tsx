import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Animated,
  useColorScheme,
  Dimensions,
  Easing,
  Alert,
  BackHandler,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Lock,
  Eye,
  EyeOff,
  Shield,
  CircleCheck as CheckCircle,
  Circle as XCircle,
  AlertTriangle,
  X,
} from 'lucide-react-native';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import {
  getPasswordRecoveryState,
  clearPasswordRecoveryState,
} from '../lib/passwordRecoveryStorage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import '../global.css';

type AuthStackParamList = {
  SignIn: { successMessage?: string; email?: string; role?: 'Unit Officer' | 'Field Officer' } | undefined;
  ForgotPassword: { email?: string; role?: 'Unit Officer' | 'Field Officer'; errorMessage?: string } | undefined;
  VerifyResetOtp: { requestId: string; maskedDeliveryEmail: string; expiresAt: number; resendAllowedAt: number; officerRole: 'unit_officer' | 'field_officer' };
  ResetForgottenPassword: { resetSessionToken?: string; resetSessionExpiresAt?: number } | undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetForgottenPassword'>;

export default function ResetForgottenPasswordScreen({ navigation, route }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const completeReset = useAction(api.passwordResetNode.completeForgottenPasswordReset);
  const checkSessionStatusAction = useAction(api.passwordResetNode.getPasswordResetSessionStatus);

  const [resetSessionToken, setResetSessionToken] = useState<string | null>(
    route.params?.resetSessionToken ?? null
  );
  const [resetSessionExpiresAt, setResetSessionExpiresAt] = useState<number | null>(
    route.params?.resetSessionExpiresAt ?? null
  );

  const [restoringSession, setRestoringSession] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const confirmPasswordRef = useRef<TextInput>(null);
  const allowNavigationRef = useRef(false);

  // Restore session from route params or SecureStore with backend validation
  useEffect(() => {
    let mounted = true;

    const restoreResetSession = async () => {
      try {
        if (mounted) {
          setRestoringSession(true);
          setServerError('');
        }

        let targetToken: string | null = route.params?.resetSessionToken ?? null;
        let targetExpiry: number | null = route.params?.resetSessionExpiresAt ?? null;

        if (!targetToken || !targetExpiry || targetExpiry <= Date.now()) {
          const storedState = await getPasswordRecoveryState();

          if (
            storedState?.stage === 'otp_verified' &&
            storedState.resetSessionToken &&
            storedState.resetSessionExpiresAt > Date.now()
          ) {
            targetToken = storedState.resetSessionToken;
            targetExpiry = storedState.resetSessionExpiresAt;
          }
        }

        if (!targetToken || !targetExpiry || targetExpiry <= Date.now()) {
          await clearPasswordRecoveryState();
          if (!mounted) return;

          allowNavigationRef.current = true;
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'ForgotPassword',
                params: {
                  errorMessage: 'Your password-reset session has expired. Please start again.',
                },
              },
            ],
          });
          return;
        }

        const backendCheck = await checkSessionStatusAction({
          resetSessionToken: targetToken,
        });

        if (!mounted) return;

        if (backendCheck.valid && backendCheck.status === 'valid') {
          setResetSessionToken(targetToken);
          setResetSessionExpiresAt(backendCheck.expiresAt || targetExpiry);
        } else {
          await clearPasswordRecoveryState();
          allowNavigationRef.current = true;

          const msg =
            backendCheck.status === 'expired'
              ? 'Your password-reset session has expired. Please start again.'
              : 'This password-reset session is no longer valid. Please start again.';

          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'ForgotPassword',
                params: { errorMessage: msg },
              },
            ],
          });
        }
      } catch (err) {
        await clearPasswordRecoveryState();
        if (!mounted) return;

        allowNavigationRef.current = true;
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'ForgotPassword',
              params: {
                errorMessage: 'Unable to restore your password-reset session. Please start again.',
              },
            },
          ],
        });
      } finally {
        if (mounted) {
          setRestoringSession(false);
        }
      }
    };

    void restoreResetSession();

    return () => {
      mounted = false;
    };
  }, [navigation, route.params?.resetSessionToken, route.params?.resetSessionExpiresAt]);

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

  const strengthAnim = useRef(new Animated.Value(0)).current;

  const passwordStrength = validatePassword(newPassword);

  const getStrengthScore = (strength: ReturnType<typeof validatePassword>) => {
    let score = 0;
    if (strength.hasMinLength) score++;
    if (strength.hasUpperCase) score++;
    if (strength.hasLowerCase) score++;
    if (strength.hasNumber) score++;
    if (strength.hasSpecialChar) score++;
    return score;
  };

  const score = getStrengthScore(passwordStrength);
  const targetPercent = newPassword.length === 0 ? 0 : score / 5;

  useEffect(() => {
    Animated.timing(strengthAnim, {
      toValue: targetPercent,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [targetPercent]);

  const strengthWidth = strengthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const getStrengthInfo = (score: number, length: number) => {
    if (length === 0) return { label: 'Very Weak', color: isDark ? '#475569' : '#94a3b8' };
    if (score <= 2) return { label: 'Weak', color: '#ef4444' };
    if (score === 3) return { label: 'Moderate', color: '#f59e0b' };
    if (score === 4) return { label: 'Good', color: '#10b981' };
    return { label: 'Strong & Secure', color: isDark ? '#34d399' : '#059669' };
  };

  const strengthInfo = getStrengthInfo(score, newPassword.length);

  const handleResetPassword = async () => {
    if (submitting || restoringSession) return;

    setServerError('');

    if (!resetSessionToken) {
      await clearPasswordRecoveryState();
      allowNavigationRef.current = true;
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'ForgotPassword',
            params: {
              errorMessage: 'Your password-reset session is no longer available. Please start again.',
            },
          },
        ],
      });
      return;
    }

    if (!passwordStrength.isValid) {
      setServerError('Password does not meet security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setServerError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await completeReset({
        resetSessionToken,
        newPassword,
      });

      await clearPasswordRecoveryState();

      setNewPassword('');
      setConfirmPassword('');

      allowNavigationRef.current = true;
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'SignIn',
            params: {
              successMessage: 'Password reset successfully. Sign in using your new password.',
            },
          },
        ],
      });
    } catch (error: any) {
      let rawMessage = error instanceof Error ? error.message : String(error);
      let userFacingError = rawMessage
        .replace(/^.*?Uncaught\s+(?:Error|ConvexError):\s*/i, '')
        .replace(/\s+at\s+handler[\s\S]*$/i, '')
        .trim();

      setServerError(userFacingError || 'Unable to complete password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  if (restoringSession) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={{ marginTop: 16, fontSize: 14, fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b' }}>
          Restoring password-reset session...
        </Text>
      </SafeAreaView>
    );
  }

  if (!resetSessionToken) {
    return null;
  }

  const bgColors: [string, string] = isDark ? ['#011c12', '#022c22'] : ['#f0fdf4', '#ecfdf5'];
  const cardBgColor = isDark ? 'rgba(3, 31, 22, 0.85)' : 'rgba(255, 255, 255, 0.95)';
  const cardBorderColor = isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.4)';
  const textColorPrimary = isDark ? '#f0fdf4' : '#064e3b';
  const textColorSecondary = isDark ? '#6ee7b7' : '#047857';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColors[0] }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerContainer}>
            <View style={{ width: 68, height: 68, borderRadius: 24, backgroundColor: isDark ? '#065f46' : '#a7f3d0', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Lock color={isDark ? '#6ee7b7' : '#065f46'} size={34} strokeWidth={2} />
            </View>
            <Text style={[styles.titleText, { color: textColorPrimary }]}>Reset Password</Text>
            <Text style={[styles.subtitleText, { color: textColorSecondary }]}>Create a new secure password for your officer account</Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
            {serverError ? (
              <View style={styles.errorContainer}>
                <AlertTriangle color="#ef4444" size={18} strokeWidth={2.5} />
                <Text style={styles.errorText}>{serverError}</Text>
              </View>
            ) : null}

            {/* New Password */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionLabel, { color: textColorSecondary }]}>New Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(6,78,59,0.5)' : '#ffffff', borderColor: isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.15)' }]}>
                <Lock color={textColorSecondary} size={20} style={{ marginHorizontal: 12 }} />
                <TextInput
                  style={[styles.input, { color: textColorPrimary }]}
                  placeholder="Enter new password"
                  placeholderTextColor={isDark ? 'rgba(110,231,183,0.5)' : 'rgba(4,120,87,0.5)'}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                  editable={!submitting}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 12 }}>
                  {showNewPassword ? <EyeOff color={textColorSecondary} size={20} /> : <Eye color={textColorSecondary} size={20} />}
                </TouchableOpacity>
              </View>

              {/* Strength Meter Bar */}
              {newPassword.length > 0 && (
                <View style={styles.strengthMeterContainer}>
                  <View style={styles.strengthHeaderRow}>
                    <Text style={[styles.strengthLabelTitle, { color: textColorSecondary }]}>Password Strength:</Text>
                    <Text style={[styles.strengthLabelValue, { color: strengthInfo.color }]}>
                      {strengthInfo.label}
                    </Text>
                  </View>
                  <View style={[styles.strengthTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                    <Animated.View
                      style={[
                        styles.strengthFill,
                        {
                          width: strengthWidth,
                          backgroundColor: strengthInfo.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Password Security Requirements Checklist */}
              {newPassword.length > 0 && (
                <View style={[styles.requirementsCard, { backgroundColor: isDark ? 'rgba(6,78,59,0.25)' : 'rgba(240,253,244,0.6)', borderColor: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(16,185,129,0.15)' }]}>
                  <Text style={[styles.requirementsTitle, { color: textColorPrimary }]}>Security Requirements:</Text>
                  
                  <View style={styles.requirementsGrid}>
                    {/* Requirement 1: Min 8 chars */}
                    <View style={styles.requirementItem}>
                      {passwordStrength.hasMinLength ? (
                        <CheckCircle size={15} color={isDark ? '#34d399' : '#059669'} strokeWidth={2.5} />
                      ) : (
                        <XCircle size={15} color={isDark ? '#475569' : '#94a3b8'} strokeWidth={2} />
                      )}
                      <Text style={[styles.requirementText, { color: passwordStrength.hasMinLength ? (isDark ? '#6ee7b7' : '#047857') : (isDark ? '#94a3b8' : '#64748b') }]}>
                        At least 8 characters
                      </Text>
                    </View>

                    {/* Requirement 2: Uppercase */}
                    <View style={styles.requirementItem}>
                      {passwordStrength.hasUpperCase ? (
                        <CheckCircle size={15} color={isDark ? '#34d399' : '#059669'} strokeWidth={2.5} />
                      ) : (
                        <XCircle size={15} color={isDark ? '#475569' : '#94a3b8'} strokeWidth={2} />
                      )}
                      <Text style={[styles.requirementText, { color: passwordStrength.hasUpperCase ? (isDark ? '#6ee7b7' : '#047857') : (isDark ? '#94a3b8' : '#64748b') }]}>
                        One uppercase letter (A-Z)
                      </Text>
                    </View>

                    {/* Requirement 3: Lowercase */}
                    <View style={styles.requirementItem}>
                      {passwordStrength.hasLowerCase ? (
                        <CheckCircle size={15} color={isDark ? '#34d399' : '#059669'} strokeWidth={2.5} />
                      ) : (
                        <XCircle size={15} color={isDark ? '#475569' : '#94a3b8'} strokeWidth={2} />
                      )}
                      <Text style={[styles.requirementText, { color: passwordStrength.hasLowerCase ? (isDark ? '#6ee7b7' : '#047857') : (isDark ? '#94a3b8' : '#64748b') }]}>
                        One lowercase letter (a-z)
                      </Text>
                    </View>

                    {/* Requirement 4: Number */}
                    <View style={styles.requirementItem}>
                      {passwordStrength.hasNumber ? (
                        <CheckCircle size={15} color={isDark ? '#34d399' : '#059669'} strokeWidth={2.5} />
                      ) : (
                        <XCircle size={15} color={isDark ? '#475569' : '#94a3b8'} strokeWidth={2} />
                      )}
                      <Text style={[styles.requirementText, { color: passwordStrength.hasNumber ? (isDark ? '#6ee7b7' : '#047857') : (isDark ? '#94a3b8' : '#64748b') }]}>
                        One numerical digit (0-9)
                      </Text>
                    </View>

                    {/* Requirement 5: Special Character */}
                    <View style={styles.requirementItem}>
                      {passwordStrength.hasSpecialChar ? (
                        <CheckCircle size={15} color={isDark ? '#34d399' : '#059669'} strokeWidth={2.5} />
                      ) : (
                        <XCircle size={15} color={isDark ? '#475569' : '#94a3b8'} strokeWidth={2} />
                      )}
                      <Text style={[styles.requirementText, { color: passwordStrength.hasSpecialChar ? (isDark ? '#6ee7b7' : '#047857') : (isDark ? '#94a3b8' : '#64748b') }]}>
                        One special character (!@#$%^&*...)
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.sectionLabel, { color: textColorSecondary }]}>Confirm Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(6,78,59,0.5)' : '#ffffff', borderColor: confirmPassword.length > 0 ? (newPassword === confirmPassword ? (isDark ? '#34d399' : '#059669') : '#ef4444') : (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.15)') }]}>
                <Lock color={textColorSecondary} size={20} style={{ marginHorizontal: 12 }} />
                <TextInput
                  ref={confirmPasswordRef}
                  style={[styles.input, { color: textColorPrimary }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={isDark ? 'rgba(110,231,183,0.5)' : 'rgba(4,120,87,0.5)'}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  editable={!submitting}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 12 }}>
                  {showConfirmPassword ? <EyeOff color={textColorSecondary} size={20} /> : <Eye color={textColorSecondary} size={20} />}
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  {newPassword === confirmPassword ? (
                    <>
                      <CheckCircle size={14} color={isDark ? '#34d399' : '#059669'} strokeWidth={2.5} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#34d399' : '#059669' }}>
                        Passwords match
                      </Text>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} color="#ef4444" strokeWidth={2.5} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>
                        Passwords do not match
                      </Text>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Action Button */}
            <TouchableOpacity disabled={submitting} activeOpacity={0.85} onPress={handleResetPassword} style={{ marginTop: 10 }}>
              <LinearGradient colors={submitting ? ['#064e3b', '#022c22'] : ['#10b981', '#059669']} style={styles.signInGradient}>
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.signInButtonContent}>
                    <Shield color="#ffffff" size={20} strokeWidth={2.5} />
                    <Text style={styles.signInButtonText}>Save New Password</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 40 },
  headerContainer: { alignItems: 'center', marginBottom: 28 },
  titleText: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  subtitleText: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  card: { width: '100%', borderRadius: 32, padding: 24, borderWidth: 1, elevation: 8 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.35)', padding: 14, borderRadius: 16, marginBottom: 20, gap: 10 },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '700', flex: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, height: 58 },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  strengthMeterContainer: { marginTop: 10, marginBottom: 12 },
  strengthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  strengthLabelTitle: { fontSize: 11, fontWeight: '700' },
  strengthLabelValue: { fontSize: 11, fontWeight: '800' },
  strengthTrack: { height: 6, borderRadius: 3, overflow: 'hidden', width: '100%' },
  strengthFill: { height: '100%', borderRadius: 3 },
  requirementsCard: { marginTop: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  requirementsTitle: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  requirementsGrid: { gap: 8 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requirementText: { fontSize: 12, fontWeight: '600' },
  signInGradient: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  signInButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signInButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
