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
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  Mail,
} from 'lucide-react-native';
import { useAction, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { savePasswordRecoveryState } from '../lib/passwordRecoveryStorage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import '../global.css';

const { width } = Dimensions.get('window');

type AuthStackParamList = {
  SignIn: { successMessage?: string; email?: string; role?: 'Unit Officer' | 'Field Officer' } | undefined;
  ForgotPassword: { email?: string; role?: 'Unit Officer' | 'Field Officer'; errorMessage?: string } | undefined;
  VerifyResetOtp: { requestId: string; maskedDeliveryEmail: string; expiresAt: number; resendAllowedAt: number; officerRole: 'unit_officer' | 'field_officer' };
  ResetForgottenPassword: { resetSessionToken?: string; resetSessionExpiresAt?: number } | undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyResetOtp'>;

export default function VerifyPasswordResetOtpScreen({ navigation, route }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const requestId = route.params?.requestId;
  const maskedDeliveryEmail = route.params?.maskedDeliveryEmail;
  const expiresAtParam = route.params?.expiresAt;
  const resendAllowedAtParam = route.params?.resendAllowedAt;
  const officerRole = route.params?.officerRole;

  // Guard against missing parameters
  useEffect(() => {
    if (!requestId || !maskedDeliveryEmail) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'ForgotPassword',
            params: {
              errorMessage: 'The password-reset request is unavailable. Please start again.',
            },
          },
        ],
      });
    }
  }, [requestId, maskedDeliveryEmail, navigation]);

  if (!requestId || !maskedDeliveryEmail) {
    return null;
  }

  const verifyOtp = useAction(api.passwordResetNode.verifyPasswordResetOtp);
  const resendOtp = useAction(api.passwordResetNode.resendPasswordResetOtp);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const [currentRequestId, setCurrentRequestId] = useState(requestId);
  const [currentExpiresAt, setCurrentExpiresAt] = useState(expiresAtParam);
  const [currentResendAllowedAt, setCurrentResendAllowedAt] = useState(resendAllowedAtParam);

  const getRemainingMs = (timestamp: number) => Math.max(0, timestamp - Date.now());

  const [expiryTimeLeft, setExpiryTimeLeft] = useState(getRemainingMs(currentExpiresAt));
  const [resendCooldownLeft, setResendCooldownLeft] = useState(getRemainingMs(currentResendAllowedAt));

  const backendStatus = useQuery(api.passwordResetPublic.checkPasswordResetRequestStatus, {
    requestId: currentRequestId as any,
  });

  // AppState active recalculation
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        setExpiryTimeLeft(getRemainingMs(currentExpiresAt));
        setResendCooldownLeft(getRemainingMs(currentResendAllowedAt));
      }
    });
    return () => subscription.remove();
  }, [currentExpiresAt, currentResendAllowedAt]);

  // Reactive status updates
  useEffect(() => {
    if (!backendStatus) return;

    if (backendStatus.status === 'cancelled' || backendStatus.supersededByRequestId) {
      setError('A newer verification code was issued. Use the latest code or request another one.');
    } else if (backendStatus.status === 'expired') {
      setError('This verification code has expired. Request a new code.');
    } else if (backendStatus.status === 'locked') {
      setError('Too many incorrect attempts. Request a new verification code.');
    } else if (backendStatus.expiresAt) {
      setCurrentExpiresAt(backendStatus.expiresAt);
      if (backendStatus.resendAllowedAt) {
        setCurrentResendAllowedAt(backendStatus.resendAllowedAt);
      }
    }
  }, [backendStatus]);

  // Countdown timer interval
  useEffect(() => {
    const interval = setInterval(() => {
      const remainingExpiry = getRemainingMs(currentExpiresAt);
      const remainingResend = getRemainingMs(currentResendAllowedAt);

      setExpiryTimeLeft(remainingExpiry);
      setResendCooldownLeft(remainingResend);

      if (remainingExpiry <= 0) {
        setError('This verification code has expired. Request a new code.');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentExpiresAt, currentResendAllowedAt]);

  const formatTime = (ms: number): string => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOtp = async (codeToSubmit?: string) => {
    if (loading) return;

    const otpVal = codeToSubmit || code;
    setError('');

    if (otpVal.length !== 6 || !/^\d+$/.test(otpVal)) {
      setError('Please enter a complete 6-digit verification code.');
      return;
    }

    if (expiryTimeLeft <= 0) {
      setError('This verification code has expired. Request a new code.');
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOtp({
        requestId: currentRequestId as any,
        otp: otpVal,
      });

      if (response.success && response.resetSessionToken) {
        await savePasswordRecoveryState({
          stage: 'otp_verified',
          resetSessionToken: response.resetSessionToken,
          resetSessionExpiresAt: response.resetSessionExpiresAt,
        });

        setCode('');

        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'ResetForgottenPassword',
              params: {
                resetSessionToken: response.resetSessionToken,
                resetSessionExpiresAt: response.resetSessionExpiresAt,
              },
            },
          ],
        });
      }
    } catch (err: any) {
      let rawMessage = err instanceof Error ? err.message : String(err);
      let userFacingError = rawMessage
        .replace(/^.*?Uncaught\s+(?:Error|ConvexError):\s*/i, '')
        .replace(/\s+at\s+handler[\s\S]*$/i, '')
        .trim();

      setError(userFacingError || 'Failed to verify OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending || resendCooldownLeft > 0) return;

    setResending(true);
    setError('');

    try {
      const response = await resendOtp({
        requestId: currentRequestId as any,
      });

      if (response.success && response.requestId) {
        setCurrentRequestId(response.requestId);
        setCurrentExpiresAt(response.expiresAt);
        setCurrentResendAllowedAt(response.resendAllowedAt);
        setExpiryTimeLeft(getRemainingMs(response.expiresAt));
        setResendCooldownLeft(getRemainingMs(response.resendAllowedAt));
        setCode('');

        await savePasswordRecoveryState({
          stage: 'otp_pending',
          requestId: response.requestId,
          maskedDeliveryEmail: response.maskedDeliveryEmail,
          officerRole,
          expiresAt: response.expiresAt,
          resendAllowedAt: response.resendAllowedAt,
        });

        Alert.alert('Code Dispatched', 'A new 6-digit verification code was sent to your email.');
      }
    } catch (err: any) {
      let rawMessage = err instanceof Error ? err.message : String(err);
      let userFacingError = rawMessage
        .replace(/^.*?Uncaught\s+(?:Error|ConvexError):\s*/i, '')
        .replace(/\s+at\s+handler[\s\S]*$/i, '')
        .trim();

      setError(userFacingError || 'Unable to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  const hiddenInputRef = useRef<TextInput>(null);

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
          
          <View style={{ width: '100%', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'ForgotPassword' }] })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start', backgroundColor: isDark ? 'rgba(52,211,153,0.1)' : 'rgba(5,150,105,0.08)' }}>
              <ArrowLeft color={textColorSecondary} size={18} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: textColorSecondary }}>Change Email</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerContainer}>
            <View style={{ width: 68, height: 68, borderRadius: 24, backgroundColor: isDark ? '#065f46' : '#a7f3d0', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <ShieldCheck color={isDark ? '#6ee7b7' : '#065f46'} size={34} strokeWidth={2} />
            </View>
            <Text style={[styles.titleText, { color: textColorPrimary }]}>Enter Security Code</Text>
            <Text style={[styles.subtitleText, { color: textColorSecondary }]}>
              Sent to <Text style={{ fontWeight: '800' }}>{maskedDeliveryEmail}</Text>
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
            {error ? (
              <View style={styles.errorContainer}>
                <AlertCircle color="#ef4444" size={18} strokeWidth={2.5} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* OTP Code Digits */}
            <TouchableOpacity activeOpacity={1} onPress={() => hiddenInputRef.current?.focus()} style={styles.otpBoxContainer}>
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const char = code[index] || '';
                const isFocused = code.length === index || (code.length === 6 && index === 5);

                return (
                  <View
                    key={index}
                    style={[
                      styles.digitBox,
                      {
                        borderColor: isFocused ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(52,211,153,0.2)' : 'rgba(5,150,105,0.2)'),
                        backgroundColor: char ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? 'rgba(6,78,59,0.3)' : '#ffffff'),
                      },
                    ]}>
                    <Text style={[styles.digitText, { color: textColorPrimary }]}>{char}</Text>
                  </View>
                );
              })}
            </TouchableOpacity>

            <TextInput
              ref={hiddenInputRef}
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
              value={code}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                setCode(cleaned);
                if (cleaned.length === 6) {
                  handleVerifyOtp(cleaned);
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              editable={!loading}
            />

            {/* Timer and Resend Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: textColorSecondary }}>
                Expires in: <Text style={{ fontWeight: '900', color: isDark ? '#34d399' : '#059669' }}>{formatTime(expiryTimeLeft)}</Text>
              </Text>

              <TouchableOpacity
                disabled={resending || resendCooldownLeft > 0}
                onPress={handleResendOtp}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: resending || resendCooldownLeft > 0 ? 0.5 : 1 }}>
                {resending ? <ActivityIndicator size="small" color={textColorSecondary} /> : <RotateCcw size={14} color={textColorSecondary} />}
                <Text style={{ fontSize: 13, fontWeight: '800', color: textColorSecondary }}>
                  {resendCooldownLeft > 0 ? `Resend in ${Math.ceil(resendCooldownLeft / 1000)}s` : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity disabled={loading || code.length !== 6} activeOpacity={0.85} onPress={() => handleVerifyOtp()} style={{ marginTop: 10 }}>
              <LinearGradient colors={loading || code.length !== 6 ? ['#064e3b', '#022c22'] : ['#10b981', '#059669']} style={styles.signInGradient}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.signInButtonContent}>
                    <Text style={styles.signInButtonText}>Verify & Proceed</Text>
                    <ArrowRight color="#ffffff" size={20} strokeWidth={2.5} />
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
  otpBoxContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginVertical: 10 },
  digitBox: { flex: 1, height: 60, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  digitText: { fontSize: 24, fontWeight: '800' },
  signInGradient: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  signInButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signInButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
