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
  Image,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield,
  Mail,
  Lock,
  CheckCircle,
  Building2,
  ArrowRight,
  LogIn,
  Briefcase,
  HardHat,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';
import { User } from '../lib/auth';
import '../global.css';

const { width, height } = Dimensions.get('window');

interface SignInScreenProps {
  onSignIn: (user: User) => void;
}

type UserRole = 'Unit Officer' | 'Field Officer' | null;

export default function SignInScreen({ onSignIn }: SignInScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(blob1Anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(blob2Anim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 8, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.timing(cardAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleSignIn = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!selectedRole) {
      setError('Please select your role');
      return;
    }

    setLoading(true);

    try {
      const { verifyUser } = await import('../lib/convexClient');
      const { saveToken, saveUserData } = await import('../lib/auth');

      const response = await verifyUser({
        email,
        password,
        role: selectedRole,
      });

      // Handle custom responses
      if (!response.success) {
        setError(response.error);
        return;
      }

      await saveToken(response.token);
      await saveUserData(response.user);

      onSignIn(response.user);
    } catch (err) {
      setError('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const bgGradient: [string, string, string, string] = isDark
    ? ['#011c12', '#022c22', '#041f1a', '#011c12']
    : ['#f0fdf4', '#dcfce7', '#f0fdf4', '#ecfdf5'];

  const iconColor = isDark ? '#34d399' : '#059669';
  const iconColorSecondary = isDark ? '#6ee7b7' : '#047857';
  const placeholderColor = isDark ? '#4b5563' : '#9ca3af';

  const blob1Translate = blob1Anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
  const blob2Translate = blob2Anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const headerOpacity = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const headerSlide = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });
  const cardOpacity = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const cardTranslate = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  return (
    <SafeAreaView className="flex-1 bg-green-950 dark:bg-[#011c12]">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <LinearGradient
        colors={bgGradient}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob1,
          {
            opacity: blob1Anim,
            transform: [{ translateY: blob1Translate }],
            backgroundColor: isDark ? 'rgba(6,78,59,0.45)' : 'rgba(187,247,208,0.7)',
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob2,
          {
            opacity: blob2Anim,
            transform: [{ translateY: blob2Translate }],
            backgroundColor: isDark ? 'rgba(4,47,46,0.5)' : 'rgba(167,243,208,0.55)',
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob3,
          {
            opacity: shimmerAnim,
            backgroundColor: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.05)',
          },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View
            style={{
              opacity: headerOpacity,
              transform: [{ translateY: headerSlide }],
              paddingHorizontal: 28,
              paddingTop: 28,
              paddingBottom: 4,
              alignItems: 'center',
            }}>
            <View style={styles.logoRow}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <LinearGradient
                  colors={
                    isDark ? ['#065f46', '#047857', '#059669'] : ['#059669', '#047857', '#065f46']
                  }
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <Image
                    source={require('../assets/logo.png')}
                    style={{
                      height: 60,
                      width: 60,
                    }}
                    resizeMode="contain"
                  />
                  <View
                    style={[
                      styles.logoSparkle,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(255,255,255,0.2)',
                      },
                    ]}
                  />
                </LinearGradient>
              </Animated.View>

              <View style={styles.logoBadge}>
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(52,211,153,0.2)', 'rgba(16,185,129,0.1)']
                      : ['rgba(5,150,105,0.15)', 'rgba(4,120,87,0.08)']
                  }
                  style={styles.badgeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <View
                    style={[styles.badgeDot, { backgroundColor: isDark ? '#34d399' : '#059669' }]}
                  />
                  <Text
                    className="font-bold tracking-widest text-emerald-700 dark:text-emerald-300"
                    style={{ fontSize: 9 }}>
                    SECURE PORTAL
                  </Text>
                </LinearGradient>
              </View>
            </View>

            <Text
              className="mt-5 font-extrabold tracking-tight text-emerald-950 dark:text-white"
              style={{ fontSize: 44, lineHeight: 50, letterSpacing: -1.5 }}>
              City
              <Text className="text-emerald-600 dark:text-emerald-400">Care</Text>
            </Text>
            <Text
              className="mt-1.5 font-medium text-emerald-700/70 dark:text-emerald-400/60"
              style={{ fontSize: 13, letterSpacing: 0.3 }}>
              Smart Civic Issue Management
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslate }],
                backgroundColor: isDark ? 'rgba(3,31,22,0.85)' : 'rgba(255,255,255,0.92)',
                borderColor: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.13)',
                shadowColor: isDark ? '#10b981' : '#059669',
              },
            ]}>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(6,78,59,0.18)', 'rgba(3,31,22,0)']
                  : ['rgba(240,253,244,0.95)', 'rgba(255,255,255,0)']
              }
              style={styles.cardInnerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.6 }}
            />

            {error ? (
              <View className="mb-5 flex-row items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800/60 dark:bg-red-950/50">
                <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/60">
                  <Text style={{ fontSize: 10, color: '#ef4444' }}>!</Text>
                </View>
                <Text className="flex-1 text-sm font-semibold leading-5 text-red-700 dark:text-red-400">
                  {error}
                </Text>
              </View>
            ) : null}

            <Text className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-emerald-200/70">
              Select Role
            </Text>
            <View className="mb-6 flex-row gap-3">
              <RoleCard
                role="Unit Officer"
                selectedRole={selectedRole}
                onSelect={setSelectedRole}
                isDark={isDark}
                icon={
                  <Briefcase
                    color={selectedRole === 'Unit Officer' ? '#fff' : iconColor}
                    size={22}
                    strokeWidth={2}
                  />
                }
                description="Manage & oversee"
              />
              <RoleCard
                role="Field Officer"
                selectedRole={selectedRole}
                onSelect={setSelectedRole}
                isDark={isDark}
                icon={
                  <HardHat
                    color={selectedRole === 'Field Officer' ? '#fff' : iconColor}
                    size={22}
                    strokeWidth={2}
                  />
                }
                description="Execute & resolve"
              />
            </View>

            <View className="mb-4">
              <Text className="mb-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-emerald-200/70">
                Email Address
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor:
                      focusedField === 'email'
                        ? isDark
                          ? '#34d399'
                          : '#059669'
                        : isDark
                          ? 'rgba(52,211,153,0.15)'
                          : 'rgba(5,150,105,0.18)',
                    backgroundColor: isDark ? 'rgba(4,47,35,0.6)' : 'rgba(240,253,244,0.8)',
                    shadowColor:
                      focusedField === 'email' ? (isDark ? '#34d399' : '#059669') : 'transparent',
                    shadowOpacity: focusedField === 'email' ? 0.18 : 0,
                    shadowRadius: 8,
                  },
                ]}>
                <View style={styles.inputIcon}>
                  <Mail
                    color={
                      focusedField === 'email' ? (isDark ? '#34d399' : '#059669') : placeholderColor
                    }
                    size={18}
                    strokeWidth={2}
                  />
                </View>
                <TextInput
                  style={[styles.input, { color: isDark ? '#f0fdf4' : '#052e16' }]}
                  placeholder="officer@citycare.com"
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
            </View>

            <View className="mb-7">
              <Text className="mb-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-emerald-200/70">
                Password
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor:
                      focusedField === 'password'
                        ? isDark
                          ? '#34d399'
                          : '#059669'
                        : isDark
                          ? 'rgba(52,211,153,0.15)'
                          : 'rgba(5,150,105,0.18)',
                    backgroundColor: isDark ? 'rgba(4,47,35,0.6)' : 'rgba(240,253,244,0.8)',
                    shadowColor:
                      focusedField === 'password'
                        ? isDark
                          ? '#34d399'
                          : '#059669'
                        : 'transparent',
                    shadowOpacity: focusedField === 'password' ? 0.18 : 0,
                    shadowRadius: 8,
                  },
                ]}>
                <View style={styles.inputIcon}>
                  <Lock
                    color={
                      focusedField === 'password'
                        ? isDark
                          ? '#34d399'
                          : '#059669'
                        : placeholderColor
                    }
                    size={18}
                    strokeWidth={2}
                  />
                </View>
                <TextInput
                  style={[styles.input, { color: isDark ? '#f0fdf4' : '#052e16', flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={placeholderColor}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((p) => !p)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}>
                  {showPassword ? (
                    <Eye color={placeholderColor} size={18} strokeWidth={2} />
                  ) : (
                    <EyeOff color={placeholderColor} size={18} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              disabled={loading}
              activeOpacity={0.88}
              onPress={handleSignIn}
              style={styles.signInBtn}>
              <LinearGradient
                colors={
                  loading
                    ? ['#6b7280', '#4b5563']
                    : isDark
                      ? ['#059669', '#047857', '#065f46']
                      : ['#10b981', '#059669', '#047857']
                }
                style={styles.signInGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View className="flex-row items-center gap-2.5">
                    <Text className="text-base font-bold tracking-wide text-white">
                      Sign In Securely
                    </Text>
                    <ArrowRight color="#ffffff" size={18} strokeWidth={2.5} />
                  </View>
                )}
                <View style={[styles.btnSheen, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface RoleCardProps {
  role: UserRole;
  selectedRole: UserRole;
  onSelect: (r: UserRole) => void;
  isDark: boolean;
  icon: React.ReactNode;
  description: string;
}

function RoleCard({ role, selectedRole, onSelect, isDark, icon, description }: RoleCardProps) {
  const isSelected = selectedRole === role;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),
    ]).start();
    onSelect(role);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1} style={{ flex: 1 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={[
            styles.roleCard,
            {
              borderColor: isSelected
                ? isDark
                  ? '#34d399'
                  : '#059669'
                : isDark
                  ? 'rgba(52,211,153,0.12)'
                  : 'rgba(5,150,105,0.15)',
              backgroundColor: isSelected
                ? isDark
                  ? 'rgba(6,78,59,0.6)'
                  : 'rgba(240,253,244,1)'
                : isDark
                  ? 'rgba(4,31,24,0.5)'
                  : 'rgba(249,250,251,0.9)',
              shadowColor: isSelected ? (isDark ? '#10b981' : '#059669') : 'transparent',
              shadowOpacity: isSelected ? 0.22 : 0,
              shadowRadius: 10,
              elevation: isSelected ? 4 : 0,
            },
          ]}>
          {isSelected && (
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(16,185,129,0.18)', 'rgba(6,78,59,0.08)']
                  : ['rgba(5,150,105,0.12)', 'rgba(240,253,244,0)']
              }
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}

          <View
            style={[
              styles.roleIconCircle,
              {
                backgroundColor: isSelected
                  ? isDark
                    ? '#059669'
                    : '#059669'
                  : isDark
                    ? 'rgba(52,211,153,0.1)'
                    : 'rgba(5,150,105,0.08)',
              },
            ]}>
            {icon}
          </View>

          <Text
            style={[
              styles.roleLabel,
              {
                color: isSelected
                  ? isDark
                    ? '#6ee7b7'
                    : '#065f46'
                  : isDark
                    ? '#9ca3af'
                    : '#374151',
              },
            ]}>
            {role}
          </Text>
          <Text
            style={[
              styles.roleDesc,
              {
                color: isSelected
                  ? isDark
                    ? 'rgba(110,231,183,0.7)'
                    : 'rgba(6,95,70,0.65)'
                  : isDark
                    ? 'rgba(107,114,128,0.8)'
                    : 'rgba(107,114,128,0.9)',
              },
            ]}>
            {description}
          </Text>

          {isSelected && (
            <View style={[styles.roleCheck, { backgroundColor: isDark ? '#059669' : '#059669' }]}>
              <CheckCircle2 color="#fff" size={11} strokeWidth={3} />
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function DemoRow({
  label,
  email,
  isDark,
  icon,
}: {
  label: string;
  email: string;
  isDark: boolean;
  icon: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#a7f3d0' : '#065f46' }}>
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 11,
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          color: isDark ? '#6ee7b7' : '#047857',
          fontWeight: '600',
        }}>
        {email}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  blob1: {
    position: 'absolute',
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    top: -width * 0.45,
    left: -width * 0.1,
  },
  blob2: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    bottom: height * 0.04,
    right: -width * 0.25,
  },
  blob3: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    top: height * 0.35,
    left: -width * 0.2,
  },
  logoRow: {
    alignItems: 'center',
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoSparkle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  logoBadge: {
    marginTop: 10,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(5,150,105,0.2)',
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  card: {
    marginHorizontal: 18,
    marginTop: 22,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  cardInnerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    paddingRight: 16,
    fontSize: 15,
    fontWeight: '500',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  signInBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  signInGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  demoSection: {},
  demoCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  roleCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    minHeight: 108,
    justifyContent: 'center',
  },
  roleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  roleDesc: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  roleCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 16,
  },
});
