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
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail,
  Lock,
  ArrowRight,
  Briefcase,
  HardHat,
  Eye,
  EyeOff,
  AlertCircle,
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

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Background Orbs Animations
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const orb3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Continuous Orb Animations
    const loopOrb = (anim: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      ).start();
    };

    loopOrb(orb1Anim, 8000);
    setTimeout(() => loopOrb(orb2Anim, 10000), 1000);
    setTimeout(() => loopOrb(orb3Anim, 12000), 2000);
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

  // Theming & Colors - Breathtaking Green Aesthetic
  const bgColors = isDark ? ['#011c12', '#022c22'] : ['#f0fdf4', '#ecfdf5'];

  const cardBgColor = isDark ? 'rgba(3, 31, 22, 0.85)' : 'rgba(255, 255, 255, 0.95)';
  const cardBorderColor = isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.4)';

  const inputBgColor = isDark ? 'rgba(6, 78, 59, 0.4)' : 'rgba(255, 255, 255, 0.8)';
  const inputBgColorFocusedAndroid = isDark ? '#022c22' : '#ffffff';

  const inputBorderFocused = isDark ? '#34d399' : '#059669';
  const inputBorderUnfocused = isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(5, 150, 105, 0.15)';

  const textColorPrimary = isDark ? '#f0fdf4' : '#064e3b';
  const textColorSecondary = isDark ? '#6ee7b7' : '#047857';
  const iconColor = isDark ? '#6ee7b7' : '#059669';

  const placeholderColor = isDark ? 'rgba(110, 231, 183, 0.5)' : 'rgba(4, 120, 87, 0.5)';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColors[0] }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <LinearGradient
        // @ts-ignore
        colors={bgColors as [string, ...string[]]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative Orbs - Emerald tones */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          {
            opacity: orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.5] }),
            transform: [
              { translateY: orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }) },
              { scale: orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) },
            ],
            backgroundColor: isDark ? '#10b981' : '#34d399',
          },
        ]}
      />

      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          {
            opacity: orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.4] }),
            transform: [
              { translateX: orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) },
              { scale: orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
            ],
            backgroundColor: isDark ? '#059669' : '#6ee7b7',
          },
        ]}
      />

      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          {
            opacity: orb3Anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
            transform: [
              { translateY: orb3Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -100] }) },
              { translateX: orb3Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) },
            ],
            backgroundColor: isDark ? '#047857' : '#10b981',
          },
        ]}
      />

      {/* Main Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              width: '100%',
              alignItems: 'center',
            }}>
            {/* Header Section */}
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={isDark ? ['#065f46', '#022c22'] : ['#a7f3d0', '#ecfdf5']}
                  style={styles.logoBackground}>
                  <Image
                    source={require('../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </LinearGradient>
                <View
                  style={[
                    styles.glowRing,
                    {
                      borderColor: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.25)',
                    },
                  ]}
                />
              </View>

              <Text style={[styles.titleText, { color: textColorPrimary }]}>
                City<Text style={{ color: isDark ? '#34d399' : '#059669' }}>Care</Text>
              </Text>
              <Text style={[styles.subtitleText, { color: textColorSecondary }]}>
                Smart Civic Issue Management
              </Text>
            </View>

            {/* Main Form Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: cardBgColor,
                  borderColor: cardBorderColor,
                  shadowColor: isDark ? '#000' : '#064e3b',
                },
              ]}>
              {/* Error Message */}
              {error ? (
                <Animated.View style={styles.errorContainer}>
                  <AlertCircle color="#ef4444" size={18} strokeWidth={2.5} />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              {/* Role Selection Box Cards */}
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionLabel, { color: textColorSecondary }]}>
                  Select Role
                </Text>
                <View style={styles.roleCardsContainer}>
                  <RoleCard
                    role="Unit Officer"
                    selectedRole={selectedRole}
                    onSelect={setSelectedRole}
                    isDark={isDark}
                    icon={
                      <Briefcase
                        color={selectedRole === 'Unit Officer' ? '#fff' : iconColor}
                        size={26}
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
                        size={26}
                        strokeWidth={2}
                      />
                    }
                    description="Execute & resolve"
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionLabel, { color: textColorSecondary }]}>
                  Email Address
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor:
                        Platform.OS === 'android' && focusedField === 'email'
                          ? inputBgColorFocusedAndroid
                          : inputBgColor,
                      borderColor:
                        focusedField === 'email' ? inputBorderFocused : inputBorderUnfocused,
                      shadowColor: focusedField === 'email' ? inputBorderFocused : 'transparent',
                    },
                  ]}>
                  <Mail
                    color={focusedField === 'email' ? inputBorderFocused : iconColor}
                    size={20}
                    strokeWidth={2}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: textColorPrimary }]}
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

              {/* Password Input */}
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionLabel, { color: textColorSecondary }]}>Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor:
                        Platform.OS === 'android' && focusedField === 'password'
                          ? inputBgColorFocusedAndroid
                          : inputBgColor,
                      borderColor:
                        focusedField === 'password' ? inputBorderFocused : inputBorderUnfocused,
                      shadowColor: focusedField === 'password' ? inputBorderFocused : 'transparent',
                    },
                  ]}>
                  <Lock
                    color={focusedField === 'password' ? inputBorderFocused : iconColor}
                    size={20}
                    strokeWidth={2}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: textColorPrimary, flex: 1 }]}
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
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    activeOpacity={0.7}>
                    {showPassword ? (
                      <Eye color={iconColor} size={20} strokeWidth={2} />
                    ) : (
                      <EyeOff color={iconColor} size={20} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                disabled={loading}
                activeOpacity={0.85}
                onPress={handleSignIn}
                style={styles.signInButtonContainer}>
                <LinearGradient
                  colors={
                    loading
                      ? isDark
                        ? ['#064e3b', '#022c22']
                        : ['#a7f3d0', '#6ee7b7']
                      : isDark
                        ? ['#059669', '#10b981']
                        : ['#10b981', '#059669']
                  }
                  style={styles.signInGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}>
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.signInButtonContent}>
                      <Text style={styles.signInButtonText}>Secure Access</Text>
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

// --- Helper Components ---

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
      Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 70, friction: 6, useNativeDriver: true }),
    ]).start();
    onSelect(role);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1} style={{ flex: 1 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={[
            styles.roleBox,
            {
              borderColor: isSelected
                ? isDark
                  ? '#34d399'
                  : '#059669'
                : isDark
                  ? 'rgba(52,211,153,0.15)'
                  : 'rgba(5,150,105,0.15)',
              backgroundColor: isSelected
                ? Platform.OS === 'android'
                  ? isDark
                    ? '#064e3b'
                    : '#ecfdf5'
                  : isDark
                    ? 'rgba(6,78,59,0.85)'
                    : 'rgba(236,253,245,1)'
                : isDark
                  ? 'rgba(4,47,36,0.6)'
                  : 'rgba(255,255,255,0.7)',
              shadowColor: isSelected ? (isDark ? '#10b981' : '#059669') : 'transparent',
              shadowOpacity: isSelected ? 0.35 : 0,
              shadowRadius: 16,
              elevation: isSelected ? 8 : 0,
            },
          ]}>
          <View
            style={[
              styles.roleIconCircle,
              {
                backgroundColor: isSelected
                  ? isDark
                    ? '#059669'
                    : '#10b981'
                  : isDark
                    ? 'rgba(52,211,153,0.1)'
                    : 'rgba(5,150,105,0.08)',
              },
            ]}>
            {icon}
          </View>

          <Text
            style={[
              styles.roleBoxLabel,
              {
                color: isSelected
                  ? isDark
                    ? '#6ee7b7'
                    : '#064e3b'
                  : isDark
                    ? '#a7f3d0'
                    : '#047857',
              },
            ]}>
            {role}
          </Text>
          <Text
            style={[
              styles.roleBoxDesc,
              {
                color: isSelected
                  ? isDark
                    ? 'rgba(110,231,183,0.9)'
                    : 'rgba(6,78,59,0.7)'
                  : isDark
                    ? 'rgba(167,243,208,0.6)'
                    : 'rgba(4,120,87,0.6)',
              },
            ]}>
            {description}
          </Text>

          {isSelected && (
            <View style={[styles.roleCheck, { backgroundColor: isDark ? '#10b981' : '#059669' }]}>
              <CheckCircle2 color="#fff" size={14} strokeWidth={3} />
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    width: width * 1.3,
    height: width * 1.3,
    top: -width * 0.45,
    left: -width * 0.3,
  },
  orb2: {
    width: width * 1.0,
    height: width * 1.0,
    bottom: -width * 0.25,
    right: -width * 0.35,
  },
  orb3: {
    width: width * 0.8,
    height: width * 0.8,
    top: height * 0.35,
    left: width * 0.45,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 50,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBackground: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  logo: {
    width: 50,
    height: 50,
  },
  glowRing: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 40,
    borderWidth: 2,
    zIndex: 1,
  },
  titleText: {
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  card: {
    width: '100%',
    borderRadius: 36,
    padding: 26,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 26 },
    shadowOpacity: 0.16,
    shadowRadius: 42,
    elevation: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: 16,
    borderRadius: 18,
    marginBottom: 24,
    gap: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 26,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
    marginLeft: 6,
  },
  roleCardsContainer: {
    flexDirection: 'row',
    gap: 14,
  },
  roleBox: {
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 140,
    position: 'relative',
  },
  roleIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  roleBoxLabel: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  roleBoxDesc: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  roleCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 22,
    height: 64,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 3,
  },
  inputIcon: {
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  eyeButton: {
    padding: 14,
  },
  signInButtonContainer: {
    marginTop: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  signInGradient: {
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
