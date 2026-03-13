import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  User as UserIcon,
  Mail,
  LogOut,
  Activity,
  MapPin,
  Wrench,
  LayoutDashboard,
  BarChart3,
  UserCircle,
} from 'lucide-react-native';
import { User } from '../lib/auth';
import { Issue } from '../lib/types';
import UnitOfficerDashboard from '../screens/UnitOfficerDashboard';
import IssueDetailScreen from '../screens/IssueDetailScreen';
import AnalyticsTab from '../screens/AnalyticsTab';
import ProfileTab from '../screens/ProfileTab';
import FieldOfficerDashboard from '../screens/FieldOfficerDashboard';
import FieldIssueCard from './FieldIssueCard';
import FieldIssueDetailScreen from '../screens/FieldIssueDetailScreen';
import FieldAnalyticsTab from '../screens/FieldAnalyticsTab';
import FieldProfileTab from '../screens/FieldProfileTab';
import WorkExecutionFlow from './WorkExecutionFlow';
import ReworkHandler from './ReworkHandler';
import EscalationModal from './EscalationModal';
import MessagingInterface from './MessagingInterface';
import { mockIssues } from '../lib/mockData';
import '../global.css';

interface DashboardScreenProps {
  user: User;
  onSignOut: () => void;
}

type TabType = 'dashboard' | 'analytics' | 'profile';

export default function DashboardScreen({ user, onSignOut }: DashboardScreenProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showUnitOfficer, setShowUnitOfficer] = useState(false);
  const [showFieldOfficer, setShowFieldOfficer] = useState(false);
  const [showWorkExecution, setShowWorkExecution] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              const { removeToken } = await import('../lib/auth');
              await removeToken();
              onSignOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getRoleIcon = (role: string) => {
    if (role === 'Unit Officer') return Shield;
    if (role === 'Field Officer') return Wrench;
    return UserIcon;
  };

  const RoleIcon = getRoleIcon(user.role);

  useEffect(() => {
    if (user.role === 'Unit Officer') {
      setShowUnitOfficer(true);
    }
    if (user.role === 'Field Officer') {
      setShowFieldOfficer(true);
    }
  }, [user.role]);

  const fieldOfficerIssues = mockIssues.filter((issue) =>
    ['Assigned', 'In Progress', 'Rework'].includes(issue.status)
  );

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (user.role === 'Field Officer' && selectedIssue && !showWorkExecution) {
    return (
      <>
        <FieldIssueDetailScreen
          // @ts-ignore
          issue={selectedIssue}
          onBack={() => setSelectedIssue(null)}
          onStartWork={() => {
            Alert.alert('Work Started', 'Issue status updated to In Progress');
            setSelectedIssue(null);
          }}
          onUploadResolution={() => setShowWorkExecution(true)}
          onContactCitizen={() => Alert.alert('Calling', `Calling citizen...`)}
          onMessage={() => Alert.alert('Messaging', 'Opening chat...')}
        />
        <EscalationModal
          visible={showEscalation}
          onClose={() => setShowEscalation(false)}
          onEscalate={(reason, comment) => {
            Alert.alert('Escalated', `Issue escalated: ${reason}`);
            setShowEscalation(false);
            setSelectedIssue(null);
          }}
          issueTitle={selectedIssue.title}
        />
      </>
    );
  }

  if (user.role === 'Field Officer' && showWorkExecution && selectedIssue) {
    return (
      <WorkExecutionFlow
        issueId={selectedIssue.id}
        onClose={() => setShowWorkExecution(false)}
        onSubmit={(data) => {
          Alert.alert('Success', 'Resolution submitted for verification');
          setShowWorkExecution(false);
          setSelectedIssue(null);
        }}
      />
    );
  }

  if (selectedIssue) {
    // @ts-ignore
    return <IssueDetailScreen issue={selectedIssue} onBack={() => setSelectedIssue(null)} />;
  }

  if (user.role === 'Field Officer' && showFieldOfficer) {
    return (
      <View style={styles.unitOfficerContainer}>
        {activeTab === 'dashboard' && (
          <View style={{ flex: 1 }}>
            <FieldOfficerDashboard
              officerName={user.name}
              ward="Varanasi"
              isOnline={true}
              stats={{
                assigned: fieldOfficerIssues.filter((i) => i.status === 'Assigned').length,
                in_progress: fieldOfficerIssues.filter((i) => i.status === 'In Progress').length,
                pending_upload: 1,
                // @ts-ignore
                rework_required: fieldOfficerIssues.filter((i) => i.status === 'Rework').length,
                resolved_today: 3,
                sla_alerts: fieldOfficerIssues.filter(
                  (i) =>
                    // @ts-ignore
                    new Date(i.sla_deadline).getTime() - new Date().getTime() < 3 * 60 * 60 * 1000
                ).length,
              }}
              onNotificationPress={() => Alert.alert('Notifications', 'No new notifications')}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
            <ScrollView
              style={{ flex: 1, paddingHorizontal: 20 }}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>Assigned Issues</Text>
              {fieldOfficerIssues.map((issue) => (
                <FieldIssueCard key={issue.id} issue={issue} onPress={setSelectedIssue} />
              ))}
            </ScrollView>
          </View>
        )}
        {activeTab === 'analytics' && (
          <FieldAnalyticsTab
            data={{
              resolved_this_week: 12,
              avg_resolution_time: 18,
              sla_compliance_rate: 92,
              performance_badge: 'Excellent',
            }}
          />
        )}
        {activeTab === 'profile' && (
          <FieldProfileTab
            profile={{
              name: user.name,
              ward: 'Varanasi',
              phone: '+91 98765 43210',
              email: user.email,
              rating: 4.7,
              total_resolved: 156,
            }}
            darkMode={darkMode}
            onToggleDarkMode={setDarkMode}
            onLogout={handleSignOut}
          />
        )}

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.7}>
            <LayoutDashboard color={activeTab === 'dashboard' ? '#0EA5A4' : '#9CA3AF'} size={24} />
            <Text
              style={[styles.navLabel, activeTab === 'dashboard' && styles.navLabelActiveField]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('analytics')}
            activeOpacity={0.7}>
            <BarChart3 color={activeTab === 'analytics' ? '#0EA5A4' : '#9CA3AF'} size={24} />
            <Text
              style={[styles.navLabel, activeTab === 'analytics' && styles.navLabelActiveField]}>
              Analytics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.7}>
            <UserCircle color={activeTab === 'profile' ? '#0EA5A4' : '#9CA3AF'} size={24} />
            <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActiveField]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (user.role === 'Unit Officer' && showUnitOfficer) {
    return (
      <View style={styles.unitOfficerContainer}>
        {activeTab === 'dashboard' && (
          <UnitOfficerDashboard
            userName={user.name}
            ward="Ward 5"
            // @ts-ignore
            onIssuePress={(issue) => setSelectedIssue(issue)}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsTab ward="Ward 5" />}
        {activeTab === 'profile' && (
          <ProfileTab
            // @ts-ignore
            userName={user.name}
            userEmail={user.email}
            ward="Ward 5"
            role={user.role}
            onSignOut={handleSignOut}
          />
        )}

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.7}>
            <LayoutDashboard color={activeTab === 'dashboard' ? '#0EA5A4' : '#9CA3AF'} size={24} />
            <Text style={[styles.navLabel, activeTab === 'dashboard' && styles.navLabelActive]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('analytics')}
            activeOpacity={0.7}>
            <BarChart3 color={activeTab === 'analytics' ? '#0EA5A4' : '#9CA3AF'} size={24} />
            <Text style={[styles.navLabel, activeTab === 'analytics' && styles.navLabelActive]}>
              Analytics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.7}>
            <UserCircle color={activeTab === 'profile' ? '#0EA5A4' : '#9CA3AF'} size={24} />
            <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#047857', '#059669', '#10b981']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.roleBadge}>
                <RoleIcon color="#ffffff" size={14} strokeWidth={2.5} />
                <Text style={styles.roleBadgeText}>{user.role}</Text>
              </View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user.name}</Text>
            </View>

            <View style={styles.avatarContainer}>
              <RoleIcon color="#ffffff" size={28} strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Activity color="rgba(255,255,255,0.7)" size={18} />
              <Text style={styles.statLabel}>Active Cases</Text>
              <Text style={styles.statValue}>24</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp color="rgba(255,255,255,0.7)" size={18} />
              <Text style={styles.statLabel}>This Week</Text>
              <Text style={styles.statValue}>12</Text>
            </View>
            <View style={styles.statCard}>
              <CheckCircle2 color="rgba(255,255,255,0.7)" size={18} />
              <Text style={styles.statLabel}>Resolved</Text>
              <Text style={styles.statValue}>8</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          <View style={styles.profileHeader}>
            <View style={styles.profileIconContainer}>
              <RoleIcon color="#10b981" size={24} strokeWidth={2.5} />
            </View>
            <View style={styles.profileHeaderText}>
              <Text style={styles.profileTitle}>Officer Profile</Text>
              <View style={styles.profileSubtitleRow}>
                <Shield color="#10b981" size={12} />
                <Text style={styles.profileSubtitle}>CityCare System</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileDetails}>
            <View style={styles.profileRow}>
              <View style={styles.profileLabelRow}>
                <UserIcon color="#6b7280" size={16} />
                <Text style={styles.profileLabel}>Officer ID</Text>
              </View>
              <Text style={styles.profileValue}>#{user.id}</Text>
            </View>

            <View style={styles.profileRow}>
              <View style={styles.profileLabelRow}>
                <Mail color="#6b7280" size={16} />
                <Text style={styles.profileLabel}>Email</Text>
              </View>
              <Text style={styles.profileValue}>{user.email}</Text>
            </View>

            <View style={[styles.profileRow, { borderBottomWidth: 0 }]}>
              <View style={styles.profileLabelRow}>
                <Shield color="#6b7280" size={16} />
                <Text style={styles.profileLabel}>Role</Text>
              </View>
              <View style={styles.roleChip}>
                <RoleIcon color="#047857" size={12} strokeWidth={2.5} />
                <Text style={styles.roleChipText}>{user.role}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>

        <Animated.View
          style={[
            styles.activityCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          {[
            { id: 1, type: 'Pothole', status: 'In Progress', priority: 'High', icon: AlertCircle },
            { id: 2, type: 'Street Light', status: 'Pending', priority: 'Medium', icon: MapPin },
            {
              id: 3,
              type: 'Waste Management',
              status: 'Resolved',
              priority: 'Low',
              icon: CheckCircle2,
            },
          ].map((item, index) => {
            const StatusIcon = item.icon;
            return (
              <View
                key={item.id}
                style={[styles.activityItem, index !== 2 && styles.activityItemBorder]}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.activityBadge}>
                  <StatusIcon color="#ffffff" size={20} strokeWidth={2.5} />
                </LinearGradient>

                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{item.type} Issue</Text>
                  <View style={styles.activityMeta}>
                    <Clock color="#9ca3af" size={12} />
                    <Text style={styles.activityTime}>2 days ago</Text>
                  </View>
                </View>

                <View style={styles.activityRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'Resolved'
                        ? styles.statusResolved
                        : item.status === 'In Progress'
                          ? styles.statusInProgress
                          : styles.statusPending,
                    ]}>
                    <Text
                      style={[
                        styles.statusText,
                        item.status === 'Resolved'
                          ? styles.statusTextResolved
                          : item.status === 'In Progress'
                            ? styles.statusTextInProgress
                            : styles.statusTextPending,
                      ]}>
                      {item.status}
                    </Text>
                  </View>
                  <Text style={styles.priorityText}>{item.priority} Priority</Text>
                </View>
              </View>
            );
          })}
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}>
          <TouchableOpacity
            disabled={loggingOut}
            activeOpacity={0.85}
            onPress={handleSignOut}
            style={styles.signOutButton}>
            <LinearGradient
              colors={loggingOut ? ['#9ca3af', '#6b7280'] : ['#dc2626', '#b91c1c']}
              style={styles.signOutGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              {loggingOut ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.signOutContent}>
                  <LogOut color="#ffffff" size={20} strokeWidth={2.5} />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecfdf5',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  avatarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#d1fae5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  profileIconContainer: {
    backgroundColor: '#d1fae5',
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderText: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  profileSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  profileDetails: {
    gap: 0,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  profileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#d1fae5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusResolved: {
    backgroundColor: '#d1fae5',
  },
  statusInProgress: {
    backgroundColor: '#dbeafe',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextResolved: {
    color: '#047857',
  },
  statusTextInProgress: {
    color: '#1e40af',
  },
  statusTextPending: {
    color: '#92400e',
  },
  priorityText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  signOutButton: {
    marginBottom: 0,
  },
  signOutGradient: {
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  unitOfficerContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  navLabelActive: {
    color: '#0EA5A4',
  },
  navLabelActiveField: {
    color: '#0EA5A4',
  },
});
