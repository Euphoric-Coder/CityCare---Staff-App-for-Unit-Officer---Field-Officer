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
import { Shield, Mail, Lock, CheckCircle, Building2, ArrowRight, LogIn } from 'lucide-react-native';
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
      const { verifyUser } = await import('../lib/convexClient');
      const { saveToken, saveUserData } = await import('../lib/auth');

      const response = await verifyUser({ email, password, role: selectedRole });

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
        className={`flex-1 items-center justify-center rounded-2xl border-2 p-5 ${
          isSelected
            ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40'
            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
        }`}>
        <View className="items-center">
          <Text className="mb-3 text-4xl">{icon}</Text>
          <Text
            className={`text-center text-sm font-bold ${
              isSelected
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
            {role}
          </Text>
          {isSelected && (
            <View className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-emerald-500 dark:bg-emerald-600">
              <Text className="text-xs font-bold text-white">✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-emerald-900 dark:bg-emerald-950">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <LinearGradient
          colors={['#064e3b', '#065f46', '#047857', '#10b981']}
          className="flex-1"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <ScrollView
            contentContainerClassName="flex-grow justify-center p-5 pb-10"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Animated.View
              className="mx-2 rounded-[32px] bg-white/95 p-8 shadow-2xl dark:bg-gray-900/95"
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}>
              <View className="mb-8 items-center">
                <View className="mb-6 items-center">
                  <LinearGradient
                    colors={['#10b981', '#059669', '#047857']}
                    style={{
                      height: 100,
                      width: 100,
                      borderRadius: 100,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 5,
                    }}
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
                  </LinearGradient>
                </View>

                <Text className="mb-3 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                  CityCare
                </Text>
                <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-100 px-4 py-2 dark:bg-emerald-950/60">
                  <Shield color="#065f46" size={14} />
                  <Text className="text-[11px] font-bold tracking-wider text-emerald-900 dark:text-emerald-300">
                    CIVIC ISSUE MANAGEMENT
                  </Text>
                </View>
              </View>

              {error ? (
                <View className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
                  <Text className="text-center text-sm font-semibold text-red-700 dark:text-red-400">
                    {error}
                  </Text>
                </View>
              ) : null}

              <View className="mb-6">
                <Text className="mb-3 text-base font-bold text-gray-700 dark:text-gray-300">
                  Select Your Role
                </Text>
                <View className="flex-row gap-3">
                  <RoleCard role="Unit Officer" icon="👮" />
                  <RoleCard role="Field Officer" icon="🚧" />
                </View>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                  Email Address
                </Text>
                <View
                  style={{
                    borderRadius: 16,
                    borderWidth: 2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                  className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <View style={{ paddingLeft: 16, paddingRight: 12 }}>
                    <Mail color="#10b981" size={20} />
                  </View>
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      paddingRight: 20,
                      fontSize: 16,
                      fontWeight: '500',
                    }}
                    className="text-gray-900 dark:text-white"
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

              <View style={{ marginBottom: 28 }}>
                <Text className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                  Password
                </Text>
                <View
                  style={{
                    borderRadius: 16,
                    borderWidth: 2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                  className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <View style={{ paddingLeft: 16, paddingRight: 12 }}>
                    <Lock color="#10b981" size={20} />
                  </View>
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 16,
                      paddingRight: 20,
                      fontSize: 16,
                      fontWeight: '500',
                    }}
                    className="text-gray-900 dark:text-white"
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

              <TouchableOpacity
                disabled={loading}
                activeOpacity={0.85}
                onPress={handleSignIn}
                className="overflow-hidden rounded-2xl">
                <LinearGradient
                  colors={loading ? ['#9ca3af', '#6b7280'] : ['#10b981', '#059669', '#047857']}
                  style={{
                    borderRadius: 16,
                    paddingVertical: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row', // important for icon + text
                    gap: 8,
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}>
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <LogIn size={20} color="#ffffff" />
                      <Text className="text-lg font-bold tracking-wide text-white">Sign In</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <View className="mt-6 items-center">
              <View className="flex-row items-center rounded-3xl bg-white/20 px-6 py-3 dark:bg-black/20">
                <Shield color="#ffffff" size={16} />
                <Text className="ml-2 text-sm font-semibold text-white">
                  Secure Authentication Portal
                </Text>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
