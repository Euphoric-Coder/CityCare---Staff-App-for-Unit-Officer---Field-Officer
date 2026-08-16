import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

import Splash from './components/SplashScreen';
import RootErrorBoundary from './components/RootErrorBoundary';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  ListTodo,
  MessageSquare,
  BarChart3,
  User as UserIcon,
  Globe,
} from 'lucide-react-native';

import SignInScreen from 'components/SignInScreen';
import ForgotPasswordScreen from 'screens/ForgotPasswordScreen';
import VerifyPasswordResetOtpScreen from 'screens/VerifyPasswordResetOtpScreen';
import ResetForgottenPasswordScreen from 'screens/ResetForgottenPasswordScreen';
import { getPasswordRecoveryState, clearPasswordRecoveryState } from 'lib/passwordRecoveryStorage';
import UnitOfficerDashboard from 'screens/UnitOfficer/UnitOfficerDashboard';
import IssueDetailScreen from 'screens/UnitOfficer/IssueDetailScreen';
import AnalyticsTab from 'screens/UnitOfficer/AnalyticsTab';
import MessagesTab from 'components/OfficerMessaging/MessagesTab';
import FieldDashboardScreen from 'screens/FieldOfficer/FieldDashboardScreen';
import FieldIssueDetailScreen from 'screens/FieldOfficer/FieldIssueDetailScreen';
import FieldProfileTab from 'screens/FieldOfficer/FieldProfileTab';
import { getToken, getUserData, User, clearAuthData, saveUserData } from 'lib/auth';
import './global.css';
import ProfileTab from 'screens/UnitOfficer/ProfileTab';
import ChangePasswordScreen from 'screens/ChangePasswordScreen';
import { ConvexProvider, ConvexReactClient, useQuery } from 'convex/react';
import { api } from './convex/_generated/api';
import { UserContext } from 'context/UserContext';
import PublicModerationScreen from 'screens/PublicModerationScreen';

export type RootStackParamList = {
  Authentication: undefined;
  ForcedPasswordChange: undefined;
  OfficerApplication: undefined;
};

export type AuthStackParamList = {
  SignIn: { successMessage?: string; email?: string; role?: 'Unit Officer' | 'Field Officer' } | undefined;
  ForgotPassword: { email?: string; role?: 'Unit Officer' | 'Field Officer'; errorMessage?: string } | undefined;
  VerifyResetOtp: { requestId: string; maskedDeliveryEmail: string; expiresAt: number; resendAllowedAt: number; officerRole: 'unit_officer' | 'field_officer' };
  ResetForgottenPassword: { resetSessionToken?: string; resetSessionExpiresAt?: number } | undefined;
};

type OfficerDashboardStackParamList = {
  DashboardHome: undefined;
  PublicModeration: undefined;
  FieldDashboardHome: undefined;
  FieldIssueDetail: undefined;
  IssueDetail: { issueId: string };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<OfficerDashboardStackParamList>();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

function PasswordRecoveryRestorer() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const restorationStartedRef = useRef(false);

  useEffect(() => {
    if (restorationStartedRef.current) {
      return;
    }
    restorationStartedRef.current = true;
    let mounted = true;

    const restoreRecovery = async () => {
      try {
        const state = await getPasswordRecoveryState();

        if (!mounted || !state) {
          return;
        }

        if (state.stage === 'otp_pending') {
          const status = await convex.query(
            api.passwordResetPublic.checkPasswordResetRequestStatus,
            { requestId: state.requestId as any }
          );

          if (status && status.status === 'pending' && status.expiresAt > Date.now()) {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'VerifyResetOtp',
                  params: {
                    requestId: state.requestId,
                    maskedDeliveryEmail: state.maskedDeliveryEmail,
                    expiresAt: status.expiresAt,
                    resendAllowedAt: status.resendAllowedAt,
                    officerRole: state.officerRole,
                  },
                },
              ],
            });
            return;
          }
        }

        if (state.stage === 'otp_verified') {
          const status = await convex.query(
            api.passwordResetPublic.checkPasswordResetSessionStatus,
            { resetSessionToken: state.resetSessionToken }
          );

          if (status && status.valid && status.status === 'valid' && status.expiresAt > Date.now()) {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'ResetForgottenPassword',
                  params: {
                    resetSessionToken: state.resetSessionToken,
                    resetSessionExpiresAt: status.expiresAt,
                  },
                },
              ],
            });
            return;
          }
        }

        await clearPasswordRecoveryState();
      } catch (error) {
        console.error('Password recovery restoration failed', error);
        await clearPasswordRecoveryState();
      }
    };

    void restoreRecovery();

    return () => {
      mounted = false;
    };
  }, [navigation]);

  return null;
}

function AuthNavigator({ onSignIn }: { onSignIn: (user: User) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <AuthStack.Navigator initialRouteName="SignIn" screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="SignIn">
          {(props) => <SignInScreen {...props} onSignIn={onSignIn} />}
        </AuthStack.Screen>
        <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <AuthStack.Screen name="VerifyResetOtp" component={VerifyPasswordResetOtpScreen} />
        <AuthStack.Screen name="ResetForgottenPassword" component={ResetForgottenPasswordScreen} />
      </AuthStack.Navigator>
      <PasswordRecoveryRestorer />
    </View>
  );
}

// Unit Officer Stacks
function DashboardStack({ user }: { user: User }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome">{() => <UnitOfficerDashboard />}</Stack.Screen>
      <Stack.Screen name="IssueDetail" component={IssueDetailScreen} />
    </Stack.Navigator>
  );
}

// Public Issue Moderation Dashboard
function PublicStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PublicModeration" component={PublicModerationScreen} />
    </Stack.Navigator>
  );
}

// Field Officer Stacks
function FieldDashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FieldDashboardHome" component={FieldDashboardScreen} />
      <Stack.Screen name="FieldIssueDetail" component={FieldIssueDetailScreen} />
    </Stack.Navigator>
  );
}

interface TabNavigatorProps {
  user: User;
  onSignOut: () => Promise<void>;
}

function UnitOfficerTabNavigator({ user, onSignOut }: TabNavigatorProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tabBarHeight = 60 + insets.bottom;

  const conversations =
    useQuery(api.directMessages.getUserConversations, { userId: user.id as any }) || [];
  const unreadCount = conversations.reduce((acc, conv) => {
    return acc + (conv.unreadCountMap ? (conv.unreadCountMap as any)[user.id] || 0 : 0);
  }, 0);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0D9488',
        tabBarInactiveTintColor: isDark ? '#475569' : '#94A3B8',
        tabBarStyle: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          height: tabBarHeight,
          shadowColor: isDark ? '#000' : '#94A3B8',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
      }}>
      <Tab.Screen
        name="Dashboard"
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}>
        {() => <DashboardStack user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="Public"
        component={PublicStack}
        options={{
          tabBarIcon: ({ color, size }) => <Globe size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesTab}
        options={{
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tab.Screen
        name="Analytics"
        options={{
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}>
        {() => <AnalyticsTab user={user} />}
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <UserIcon size={size} color={color} />,
        }}>
        {() => <ProfileTab user={user} onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function FieldOfficerTabNavigator({ user, onSignOut }: TabNavigatorProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tabBarHeight = 60 + insets.bottom;

  const conversations =
    useQuery(api.directMessages.getUserConversations, { userId: user.id as any }) || [];
  const unreadCount = conversations.reduce((acc, conv) => {
    return acc + (conv.unreadCountMap ? (conv.unreadCountMap as any)[user.id] || 0 : 0);
  }, 0);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0D9488',
        tabBarInactiveTintColor: isDark ? '#475569' : '#94A3B8',
        tabBarStyle: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          height: tabBarHeight,
          shadowColor: isDark ? '#000' : '#94A3B8',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
      }}>
      <Tab.Screen
        name="My Tasks"
        component={FieldDashboardStack}
        options={{
          tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesTab}
        options={{
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <UserIcon size={size} color={color} />,
        }}>
        {() => (
          <FieldProfileTab
            user={user}
            profile={{
              name: user.name,
              userId: user.id,
              ward: 'Ward 12 - South Zone',
              phone: '+91 98765 43210',
              email: user.email,
              rating: 4.8,
              total_resolved: 156,
            }}
            onLogout={onSignOut}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function OfficerApplication({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  if (user.role === 'unit_officer') {
    return <UnitOfficerTabNavigator user={user} onSignOut={onSignOut} />;
  }

  if (user.role === 'field_officer') {
    return <FieldOfficerTabNavigator user={user} onSignOut={onSignOut} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0FDFA', padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#991B1B', textAlign: 'center' }}>
        Invalid Officer Role
      </Text>
      <TouchableOpacity
        onPress={() => void onSignOut()}
        style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#0D9488', borderRadius: 10 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Return to Sign In</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

type AppProps = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

function App({ user, setUser }: AppProps) {
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const restoreAuthentication = async () => {
      try {
        setLoading(true);

        const [token, savedUser] = await Promise.all([getToken(), getUserData()]);

        if (!mounted) {
          return;
        }

        if (token && savedUser) {
          setUser(savedUser);
        } else {
          await clearAuthData();
          if (mounted) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Authentication restoration failed', error);
        await clearAuthData();
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void restoreAuthentication();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const prepareApp = async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setAppReady(true);
    };
    prepareApp();
  }, []);

  useEffect(() => {
    if (appReady && !loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady, loading]);

  const handleSignIn = (signedInUser: User): void => {
    console.info('ROOT_SIGN_IN_RECEIVED', {
      id: signedInUser.id,
      email: signedInUser.email,
      role: signedInUser.role,
      mustChangePassword: signedInUser.mustChangePassword,
    });

    setUser(signedInUser);
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      await clearAuthData();
    } catch (error) {
      console.error('Unable to clear stored authentication', error);
    } finally {
      setUser(null);
    }
  };

  const handleForcedPasswordChangeComplete = async (): Promise<void> => {
    if (!user) {
      return;
    }

    const updatedUser: User = {
      ...user,
      mustChangePassword: false,
    };

    await saveUserData(updatedUser);
    setUser(updatedUser);
  };

  if (showSplash) {
    return <Splash onFinish={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#F0FDFA',
          }}>
          <ActivityIndicator size="large" color="#0EA5A4" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <RootStack.Screen name="Authentication">
              {() => <AuthNavigator onSignIn={handleSignIn} />}
            </RootStack.Screen>
          ) : user.mustChangePassword === true ? (
            <RootStack.Screen name="ForcedPasswordChange">
              {() => {
                console.info('PASSING_USER_TO_MANDATORY_SCREEN', {
                  id: user.id,
                  email: user.email,
                  role: user.role,
                  mustChangePassword: user.mustChangePassword,
                });

                return (
                  <ChangePasswordScreen
                    user={user}
                    onComplete={handleForcedPasswordChangeComplete}
                    onSignOut={handleSignOut}
                  />
                );
              }}
            </RootStack.Screen>
          ) : (
            <RootStack.Screen name="OfficerApplication">
              {() => <OfficerApplication user={user} onSignOut={handleSignOut} />}
            </RootStack.Screen>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function AppWrapper() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <RootErrorBoundary>
      <ConvexProvider client={convex}>
        <UserContext.Provider value={user}>
          <App user={user} setUser={setUser} />
        </UserContext.Provider>
      </ConvexProvider>
    </RootErrorBoundary>
  );
}
