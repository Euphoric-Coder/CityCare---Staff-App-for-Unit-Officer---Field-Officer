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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Mail, Lock, CheckCircle, Building2 } from 'lucide-react-native';
import { User } from '../lib/auth';
import '../global.css';

interface SignInScreenProps {
  onSignIn: (user: User) => void;
}

type UserRole = 'Unit Officer' | 'Field Officer' | null;

export default function SignInScreen({ onSignIn }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
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
      const { mockVerifyUser } = await import('../lib/convexClient');
      const { saveToken, saveUserData } = await import('../lib/auth');

      const response = await mockVerifyUser({ email, password, role: selectedRole });

      console.log('Authentication response:', response);

      await saveToken(response.token);
      await saveUserData(response.user);

      onSignIn(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const RoleCard = ({ role, icon }: { role: UserRole; icon: string }) => {
    const isSelected = selectedRole === role;
    return (
      <TouchableOpacity
        onPress={() => setSelectedRole(role)}
        activeOpacity={0.7}
        style={[styles.roleCard, isSelected ? styles.roleCardSelected : styles.roleCardUnselected]}>
        <View className="items-center">
          <Text className="mb-3 text-4xl">{icon}</Text>
          <Text
            className={`text-center text-sm font-bold ${
              isSelected ? 'text-emerald-700' : 'text-gray-700'
            }`}>
            {role}
          </Text>
          {isSelected && (
            <View style={styles.checkmarkBadge}>
              <Text className="text-xs font-bold text-white">✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <LinearGradient
          colors={['#064e3b', '#065f46', '#047857', '#10b981']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}>
              <View className="mb-8 items-center">
                <View className="mb-6 flex items-center justify-center">
                  <View
                    className="rounded-full border 
               border-white/20 bg-white/10 p-4 
               backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/30">
                    <Image
                      source={require('../assets/logo.png')} // adjust path if needed
                      className="h-[70px] w-[70px]"
                      resizeMode="contain"
                    />
                  </View>
                </View>

                <Text style={styles.appTitle}>CityCare</Text>
                <View style={styles.subtitleBadge}>
                  <Shield color="#065f46" size={14} />
                  <Text style={styles.subtitleText}>CIVIC ISSUE MANAGEMENT</Text>
                </View>
              </View>

              {error ? (
                <View className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                  <Text className="text-center text-sm font-semibold text-red-700">{error}</Text>
                </View>
              ) : null}

              <View className="mb-6">
                <Text className="mb-3 text-base font-bold text-gray-700">Select Your Role</Text>
                <View className="flex-row gap-3">
                  <RoleCard role="Unit Officer" icon="👮" />
                  <RoleCard role="Field Officer" icon="🚧" />
                </View>
              </View>

              <View className="mb-5">
                <Text className="mb-3 text-sm font-bold text-gray-700">Email Address</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIcon}>
                    <Mail color="#10b981" size={20} />
                  </View>
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="officer@citycare.com"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                  />
                </View>
              </View>

              <View className="mb-7">
                <Text className="mb-3 text-sm font-bold text-gray-700">Password</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIcon}>
                    <Lock color="#10b981" size={20} />
                  </View>
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter your secure password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={!loading}
                  />
                </View>
              </View>

              <TouchableOpacity disabled={loading} activeOpacity={0.85} onPress={handleSignIn}>
                <LinearGradient
                  colors={loading ? ['#9ca3af', '#6b7280'] : ['#10b981', '#059669', '#047857']}
                  style={styles.signInButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}>
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text className="text-lg font-bold tracking-wide text-white">
                      Sign In Securely
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064e3b',
  },
  keyboardView: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 32,
    padding: 32,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  inputContainer: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  signInButton: {
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  roleCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCardSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  roleCardUnselected: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  checkmarkBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#10b981',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  subtitleText: {
    color: '#065f46',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  logoCheckmark: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#10b981',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  inputWrapper: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 20,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
