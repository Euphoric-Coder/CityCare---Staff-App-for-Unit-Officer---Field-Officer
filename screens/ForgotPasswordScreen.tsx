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
  CheckCircle2,
  Info,
  Sparkles,
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

  // Role card animation values
  const unitScale = useRef(new Animated.Value(1)).current;
  const fieldScale = useRef(new Animated.Value(1)).current;

  const animateRoleSelect = (role: 'Unit Officer' | 'Field Officer') => {
    setSelectedRole(role);
    const targetAnim = role === 'Unit Officer' ? unitScale : fieldScale;
    const otherAnim = role === 'Unit Officer' ? fieldScale : unitScale;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(targetAnim, {
          toValue: 0.95,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(targetAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(otherAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

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
        if (result.code === 'PASSWORD_CHANGE_COOLDOWN_ACTIVE') {
          const allowedDate = (result as any).nextPasswordChangeAllowedAt
            ? new Date((result as any).nextPasswordChangeAllowedAt).toLocaleString()
            : '';

          setError(
            allowedDate
              ? `You cannot reset your password yet. Try again after ${allowedDate}.`
              : 'You cannot reset your password yet.'
          );
          return;
        }

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
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionLabel, { color: textColorSecondary }]}>Officer Role</Text>
                  <View style={[styles.requiredBadge, { backgroundColor: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.08)' }]}>
                    <Sparkles size={10} color={isDark ? '#34d399' : '#059669'} />
                    <Text style={[styles.requiredBadgeText, { color: isDark ? '#34d399' : '#059669' }]}>Required</Text>
                  </View>
                </View>

                <View style={styles.roleCardsContainer}>
                  {/* Unit Officer Card */}
                  <TouchableOpacity
                    onPress={() => animateRoleSelect('Unit Officer')}
                    activeOpacity={0.9}
                    style={{ flex: 1 }}
                  >
                    <Animated.View style={{ transform: [{ scale: unitScale }] }}>
                      <LinearGradient
                        colors={
                          selectedRole === 'Unit Officer'
                            ? (isDark ? ['#064e3b', '#022c22'] : ['#ecfdf5', '#d1fae5'])
                            : (isDark ? ['rgba(6,78,59,0.25)', 'rgba(4,47,36,0.15)'] : ['#ffffff', '#f8fafc'])
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.roleCard,
                          {
                            borderColor: selectedRole === 'Unit Officer'
                              ? (isDark ? '#34d399' : '#10b981')
                              : (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.15)'),
                            shadowColor: selectedRole === 'Unit Officer' ? (isDark ? '#34d399' : '#10b981') : '#000',
                            shadowOpacity: selectedRole === 'Unit Officer' ? (isDark ? 0.35 : 0.15) : 0.03,
                            shadowRadius: selectedRole === 'Unit Officer' ? 10 : 4,
                            shadowOffset: { width: 0, height: 4 },
                            elevation: selectedRole === 'Unit Officer' ? 6 : 1,
                          },
                        ]}
                      >
                        {/* Top Indicator / Badge */}
                        <View style={styles.roleCardHeader}>
                          <LinearGradient
                            colors={
                              selectedRole === 'Unit Officer'
                                ? ['#10b981', '#059669']
                                : (isDark ? ['rgba(52,211,153,0.15)', 'rgba(52,211,153,0.08)'] : ['rgba(5,150,105,0.1)', 'rgba(5,150,105,0.05)'])
                            }
                            style={styles.roleIconBadge}
                          >
                            <Briefcase color={selectedRole === 'Unit Officer' ? '#ffffff' : iconColor} size={20} strokeWidth={2.2} />
                          </LinearGradient>

                          <View
                            style={[
                              styles.checkCircleContainer,
                              {
                                backgroundColor: selectedRole === 'Unit Officer'
                                  ? (isDark ? '#34d399' : '#059669')
                                  : 'transparent',
                                borderColor: selectedRole === 'Unit Officer'
                                  ? (isDark ? '#34d399' : '#059669')
                                  : (isDark ? 'rgba(52,211,153,0.25)' : 'rgba(5,150,105,0.2)'),
                              },
                            ]}
                          >
                            {selectedRole === 'Unit Officer' && (
                              <CheckCircle2 color="#ffffff" size={13} strokeWidth={3} />
                            )}
                          </View>
                        </View>

                        {/* Card Content */}
                        <View style={styles.roleCardContent}>
                          <Text
                            style={[
                              styles.roleTitleText,
                              {
                                color: selectedRole === 'Unit Officer'
                                  ? (isDark ? '#ffffff' : '#064e3b')
                                  : textColorPrimary,
                              },
                            ]}
                          >
                            Unit Officer
                          </Text>
                          <Text
                            style={[
                              styles.roleSubtitleText,
                              {
                                color: selectedRole === 'Unit Officer'
                                  ? (isDark ? '#6ee7b7' : '#047857')
                                  : textColorSecondary,
                              },
                            ]}
                          >
                            Admin & Desk
                          </Text>
                        </View>

                        {/* Active Bottom Accent Bar */}
                        {selectedRole === 'Unit Officer' && (
                          <View style={[styles.activeAccentBar, { backgroundColor: isDark ? '#34d399' : '#059669' }]} />
                        )}
                      </LinearGradient>
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Field Officer Card */}
                  <TouchableOpacity
                    onPress={() => animateRoleSelect('Field Officer')}
                    activeOpacity={0.9}
                    style={{ flex: 1 }}
                  >
                    <Animated.View style={{ transform: [{ scale: fieldScale }] }}>
                      <LinearGradient
                        colors={
                          selectedRole === 'Field Officer'
                            ? (isDark ? ['#064e3b', '#022c22'] : ['#ecfdf5', '#d1fae5'])
                            : (isDark ? ['rgba(6,78,59,0.25)', 'rgba(4,47,36,0.15)'] : ['#ffffff', '#f8fafc'])
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.roleCard,
                          {
                            borderColor: selectedRole === 'Field Officer'
                              ? (isDark ? '#34d399' : '#10b981')
                              : (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.15)'),
                            shadowColor: selectedRole === 'Field Officer' ? (isDark ? '#34d399' : '#10b981') : '#000',
                            shadowOpacity: selectedRole === 'Field Officer' ? (isDark ? 0.35 : 0.15) : 0.03,
                            shadowRadius: selectedRole === 'Field Officer' ? 10 : 4,
                            shadowOffset: { width: 0, height: 4 },
                            elevation: selectedRole === 'Field Officer' ? 6 : 1,
                          },
                        ]}
                      >
                        {/* Top Indicator / Badge */}
                        <View style={styles.roleCardHeader}>
                          <LinearGradient
                            colors={
                              selectedRole === 'Field Officer'
                                ? ['#10b981', '#059669']
                                : (isDark ? ['rgba(52,211,153,0.15)', 'rgba(52,211,153,0.08)'] : ['rgba(5,150,105,0.1)', 'rgba(5,150,105,0.05)'])
                            }
                            style={styles.roleIconBadge}
                          >
                            <HardHat color={selectedRole === 'Field Officer' ? '#ffffff' : iconColor} size={20} strokeWidth={2.2} />
                          </LinearGradient>

                          <View
                            style={[
                              styles.checkCircleContainer,
                              {
                                backgroundColor: selectedRole === 'Field Officer'
                                  ? (isDark ? '#34d399' : '#059669')
                                  : 'transparent',
                                borderColor: selectedRole === 'Field Officer'
                                  ? (isDark ? '#34d399' : '#059669')
                                  : (isDark ? 'rgba(52,211,153,0.25)' : 'rgba(5,150,105,0.2)'),
                              },
                            ]}
                          >
                            {selectedRole === 'Field Officer' && (
                              <CheckCircle2 color="#ffffff" size={13} strokeWidth={3} />
                            )}
                          </View>
                        </View>

                        {/* Card Content */}
                        <View style={styles.roleCardContent}>
                          <Text
                            style={[
                              styles.roleTitleText,
                              {
                                color: selectedRole === 'Field Officer'
                                  ? (isDark ? '#ffffff' : '#064e3b')
                                  : textColorPrimary,
                              },
                            ]}
                          >
                            Field Officer
                          </Text>
                          <Text
                            style={[
                              styles.roleSubtitleText,
                              {
                                color: selectedRole === 'Field Officer'
                                  ? (isDark ? '#6ee7b7' : '#047857')
                                  : textColorSecondary,
                              },
                            ]}
                          >
                            On-Site & Dispatch
                          </Text>
                        </View>

                        {/* Active Bottom Accent Bar */}
                        {selectedRole === 'Field Officer' && (
                          <View style={[styles.activeAccentBar, { backgroundColor: isDark ? '#34d399' : '#059669' }]} />
                        )}
                      </LinearGradient>
                    </Animated.View>
                  </TouchableOpacity>
                </View>

                {/* Helper / Info Text */}
                <View style={styles.roleHelperContainer}>
                  <Info size={13} color={textColorSecondary} style={{ marginTop: 1 }} />
                  <Text style={[styles.roleHelperText, { color: textColorSecondary }]}>
                    Select the officer role assigned to your registered account.
                  </Text>
                </View>
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
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  requiredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  requiredBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  roleCardsContainer: { flexDirection: 'row', gap: 12 },
  roleCard: { borderRadius: 22, borderWidth: 1.5, padding: 14, minHeight: 120, justifyContent: 'space-between', overflow: 'hidden', position: 'relative' },
  roleCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  roleIconBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  checkCircleContainer: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  roleCardContent: { gap: 2 },
  roleTitleText: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  roleSubtitleText: { fontSize: 11, fontWeight: '600' },
  activeAccentBar: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  roleHelperContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  roleHelperText: { fontSize: 11.5, fontWeight: '500', flex: 1, lineHeight: 15 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, height: 58 },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  signInButtonContainer: { marginTop: 10 },
  signInGradient: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  signInButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signInButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
