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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  ArrowRight,
  Briefcase,
  HardHat,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react-native';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { savePasswordRecoveryState } from '../lib/passwordRecoveryStorage';
import { parsePasswordResetError } from '../lib/passwordResetErrors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import '../global.css';

const { width, height } = Dimensions.get('window');

type AuthStackParamList = {
  SignIn: { successMessage?: string; email?: string; role?: 'Unit Officer' | 'Field Officer' } | undefined;
  ForgotPassword: { email?: string; role?: 'Unit Officer' | 'Field Officer'; errorMessage?: string } | undefined;
  VerifyResetOtp: { requestId: string; maskedDeliveryEmail: string; expiresAt: number; resendAllowedAt: number; officerRole: 'unit_officer' | 'field_officer' };
  ResetForgottenPassword: { resetSessionToken?: string; resetSessionExpiresAt?: number } | undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
type UserRole = 'Unit Officer' | 'Field Officer' | null;

export default function ForgotPasswordScreen({ navigation, route }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const requestOtp = useAction(api.passwordResetNode.requestPasswordResetOtp);

  const initialEmail = route.params?.email ?? '';
  const initialRole = route.params?.role ?? null;
  const initialError = route.params?.errorMessage ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (route.params) {
      if (route.params.email) setEmail(route.params.email);
      if (route.params.role) setSelectedRole(route.params.role);
      if (route.params.errorMessage) setError(route.params.errorMessage);
    }
  }, [route.params]);

  // Entry Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Background Orbs
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    const loopOrb = (anim: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      ).start();
    };

    loopOrb(orb1Anim, 8000);
    setTimeout(() => loopOrb(orb2Anim, 10000), 1000);
  }, []);

  const handleRequestOtp = async (): Promise<void> => {
    if (loading) {
      return;
    }

    setError('');

    if (!selectedRole) {
      setError('Select your officer role.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Enter your registered email.');
      return;
    }

    try {
      setLoading(true);

      const result = await requestOtp({
        email: normalizedEmail,
        role: selectedRole === 'Unit Officer' ? 'unit_officer' : 'field_officer',
      });

      if (!result.success) {
        if (result.code === 'OTP_REQUEST_NOT_FOUND') {
          setError('No matching officer account was found. Check the email and role.');
          return;
        }

        setError('Unable to process the request. Please try again.');
        return;
      }

      await savePasswordRecoveryState({
        stage: 'otp_pending',
        requestId: result.requestId,
        maskedDeliveryEmail: result.maskedDeliveryEmail,
        officerRole: result.officerRole,
        expiresAt: result.expiresAt,
        resendAllowedAt: result.resendAllowedAt,
      });

      navigation.navigate('VerifyResetOtp', {
        requestId: result.requestId,
        maskedDeliveryEmail: result.maskedDeliveryEmail,
        expiresAt: result.expiresAt,
        resendAllowedAt: result.resendAllowedAt,
        officerRole: result.officerRole,
      });
    } catch (error) {
      const parsedError = parsePasswordResetError(error);

      if (!parsedError.expected) {
        console.warn('PASSWORD_RESET_REQUEST_FAILED', {
          code: parsedError.code,
        });
      }

      setError(parsedError.message);
    } finally {
      setLoading(false);
    }
  };

  const bgColors: [string, string] = isDark ? ['#011c12', '#022c22'] : ['#f0fdf4', '#ecfdf5'];
  const cardBgColor = isDark ? 'rgba(3, 31, 22, 0.85)' : 'rgba(255, 255, 255, 0.95)';
  const cardBorderColor = isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.4)';
  const textColorPrimary = isDark ? '#f0fdf4' : '#064e3b';
  const textColorSecondary = isDark ? '#6ee7b7' : '#047857';
  const iconColor = isDark ? '#6ee7b7' : '#059669';
  const placeholderColor = isDark ? 'rgba(110, 231, 183, 0.5)' : 'rgba(4, 120, 87, 0.5)';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColors[0] }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }], width: '100%', alignItems: 'center' }}>
            
            {/* Top Bar Back Button */}
            <View style={{ width: '100%', marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignIn', { email, role: selectedRole ?? undefined })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start', backgroundColor: isDark ? 'rgba(52,211,153,0.1)' : 'rgba(5,150,105,0.08)' }}>
                <ArrowLeft color={iconColor} size={18} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: textColorSecondary }}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Header Section */}
            <View style={styles.headerContainer}>
              <View style={{ width: 68, height: 68, borderRadius: 24, backgroundColor: isDark ? '#065f46' : '#a7f3d0', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <ShieldCheck color={isDark ? '#6ee7b7' : '#065f46'} size={34} strokeWidth={2} />
              </View>
              <Text style={[styles.titleText, { color: textColorPrimary }]}>Account Recovery</Text>
              <Text style={[styles.subtitleText, { color: textColorSecondary }]}>Enter your details to receive a 6-digit verification code</Text>
            </View>

            {/* Form Card */}
            <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor, shadowColor: isDark ? '#000' : '#064e3b' }]}>
              {Boolean(error) && (
                <View style={[styles.errorContainer, { backgroundColor: isDark ? 'rgba(69, 26, 26, 0.85)' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FECACA' }]}>
                  <AlertCircle color={isDark ? '#FCA5A5' : '#B91C1C'} size={18} strokeWidth={2.5} style={{ marginTop: 2 }} />
                  <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>{error}</Text>
                </View>
              )}

              {/* Role Selector */}
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionLabel, { color: textColorSecondary }]}>Officer Role</Text>
                <View style={styles.roleCardsContainer}>
                  <TouchableOpacity onPress={() => setSelectedRole('Unit Officer')} activeOpacity={0.8} style={{ flex: 1 }}>
                    <View style={[styles.roleBox, { borderColor: selectedRole === 'Unit Officer' ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.15)'), backgroundColor: selectedRole === 'Unit Officer' ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? 'rgba(4,47,36,0.6)' : 'rgba(255,255,255,0.7)') }]}>
                      <Briefcase color={selectedRole === 'Unit Officer' ? '#fff' : iconColor} size={22} />
                      <Text style={[styles.roleBoxLabel, { color: selectedRole === 'Unit Officer' ? (isDark ? '#6ee7b7' : '#064e3b') : textColorSecondary }]}>Unit Officer</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setSelectedRole('Field Officer')} activeOpacity={0.8} style={{ flex: 1 }}>
                    <View style={[styles.roleBox, { borderColor: selectedRole === 'Field Officer' ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.15)'), backgroundColor: selectedRole === 'Field Officer' ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? 'rgba(4,47,36,0.6)' : 'rgba(255,255,255,0.7)') }]}>
                      <HardHat color={selectedRole === 'Field Officer' ? '#fff' : iconColor} size={22} />
                      <Text style={[styles.roleBoxLabel, { color: selectedRole === 'Field Officer' ? (isDark ? '#6ee7b7' : '#064e3b') : textColorSecondary }]}>Field Officer</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '500', color: textColorSecondary, marginTop: 6 }}>
                  Select the same officer role assigned to your registered account.
                </Text>
              </View>

              {/* Email Address */}
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionLabel, { color: textColorSecondary }]}>Registered Email</Text>
                <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(6,78,59,0.5)' : '#ffffff', borderColor: focusedField === 'email' ? (isDark ? '#34d399' : '#059669') : (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.15)') }]}>
                  <Mail color={iconColor} size={20} style={{ marginHorizontal: 12 }} />
                  <TextInput
                    style={[styles.input, { color: textColorPrimary }]}
                    placeholder="officer@citycare.dev"
                    placeholderTextColor={placeholderColor}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                  />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '500', color: textColorSecondary, marginTop: 6 }}>
                  Use the official email address registered by your CityCare administrator.
                </Text>
              </View>

              {/* Action Button */}
              <TouchableOpacity disabled={loading} activeOpacity={0.85} onPress={handleRequestOtp} style={styles.signInButtonContainer}>
                <LinearGradient colors={loading ? ['#064e3b', '#022c22'] : ['#10b981', '#059669']} style={styles.signInGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.signInButtonContent}>
                      <Text style={styles.signInButtonText}>Send Verification Code</Text>
                      <ArrowRight color="#ffffff" size={20} strokeWidth={2.5} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 40 },
  headerContainer: { alignItems: 'center', marginBottom: 28 },
  titleText: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  subtitleText: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },
  card: { width: '100%', borderRadius: 32, padding: 24, borderWidth: 1, elevation: 8 },
  errorContainer: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 16, marginBottom: 20, borderWidth: 1, gap: 10 },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  sectionContainer: { marginBottom: 22 },
  sectionLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  roleCardsContainer: { flexDirection: 'row', gap: 12 },
  roleBox: { borderRadius: 18, borderWidth: 1.5, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  roleBoxLabel: { fontSize: 13, fontWeight: '800' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, height: 58 },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  signInButtonContainer: { marginTop: 10 },
  signInGradient: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  signInButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signInButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
