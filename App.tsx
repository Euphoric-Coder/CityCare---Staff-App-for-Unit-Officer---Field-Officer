import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

import Splash from './components/SplashScreen';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  ListTodo,
  MessageSquare,
  BarChart3,
  User as UserIcon,
  Globe,
} from 'lucide-react-native';

import SignInScreen from './components/SignInScreen';
import UnitOfficerDashboard from 'screens/UnitOfficerDashboard';
import IssueDetailScreen from 'screens/IssueDetailScreen';
import AnalyticsTab from './screens/AnalyticsTab';
import MessagesTab from './components/MessagesTab';
import FieldDashboardScreen from './components/FieldDashboardScreen';
import FieldIssueDetailScreen from 'screens/FieldIssueDetailScreen';
import FieldProfileTab from 'screens/FieldProfileTab';
import { getToken, getUserData, User, removeToken } from './lib/auth';
import './global.css';
import ProfileTab from 'screens/ProfileTab';
import ChangePasswordScreen from 'screens/ChangePasswordScreen';
import { getUnitOfficerByUserId } from 'lib/convexClient';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { UserContext } from 'context/UserContext';

type RootStackParamList = {
  DashboardHome: undefined;
  FieldDashboardHome: undefined;
  FieldIssueDetail: undefined;
  IssueDetail: { issueId: string };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

// Unit Officer Stacks
function DashboardStack({ user }: { user: User }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome">{() => <UnitOfficerDashboard />}</Stack.Screen>
      <Stack.Screen name="IssueDetail" component={IssueDetailScreen} />
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
  onSignOut: () => void;
}

function UnitOfficerTabNavigator({ user, onSignOut }: TabNavigatorProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tabBarHeight = 60 + insets.bottom;
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
      {/* <Tab.Screen
        name="Public"
        component={PublicStack}
        options={{
          tabBarIcon: ({ color, size }) => <Globe size={size} color={color} />,
        }}
      /> */}
      {/* <Tab.Screen
        name="Messages"
        component={MessagesTab}
        options={{
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
          tabBarBadge: 2,
        }}
      /> */}
      <Tab.Screen
        name="Analytics"
        component={AnalyticsTab}
        options={{
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
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
      {/* TODO - add messages tabs for field officers as well once implemented */}
      {/* <Tab.Screen
        name="Messages"
        component={MessagesTab}
        options={{
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
          tabBarBadge: 2,
        }}
      /> */}
      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => <UserIcon size={size} color={color} />,
        }}>
        {() => (
          <FieldProfileTab
            profile={{
              name: user.name,
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

type AppProps = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

function App({ user, setUser }: AppProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        const token = await getToken();
        const userData = await getUserData();

        if (token && userData) {
          setUser(userData);
          setIsAuthenticated(true);

          setMustChangePassword(true);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
      setAppReady(true);
    };

    prepare();
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  const handleSignIn = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    setMustChangePassword(true); // force password change UI
  };

  const handleSignOut = async () => {
    try {
      await removeToken(); // delete token + user data from secure storage
      setUser(null);
      setIsAuthenticated(false);
      setMustChangePassword(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (showSplash) {
    return <Splash onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      {isAuthenticated && user ? (
        // mustChangePassword ? (
        //   <ChangePasswordScreen
        //     onComplete={() => {
        //       setMustChangePassword(false);
        //     }}
        //   />
        // ) : (
        <NavigationContainer>
          {user.role === 'field_officer' ? (
            <FieldOfficerTabNavigator user={user} onSignOut={handleSignOut} />
          ) : (
            <UnitOfficerTabNavigator user={user} onSignOut={handleSignOut} />
          )}
        </NavigationContainer>
      ) : (
        // )
        <SignInScreen onSignIn={handleSignIn} />
      )}
    </SafeAreaProvider>
  );
}

export default function AppWrapper() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <ConvexProvider client={convex}>
      <UserContext.Provider value={user}>
        <App user={user} setUser={setUser} />
      </UserContext.Provider>
    </ConvexProvider>
  );
}
