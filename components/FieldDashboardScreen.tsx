import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FileText } from 'lucide-react-native';
import FieldOfficerDashboard from '../screens/FieldOfficerDashboard';
import FieldIssueCard from './FieldIssueCard';
import SimpleFilterBar from './SimpleFilterBar';
import NotificationPanel from './NotificationPanel';
import { mockIssues, mockFieldOfficerNotifications } from '../lib/mockData';
import { Issue } from '../lib/types';

const FILTERS = ['All', 'Assigned', 'In Progress', 'Pending UO Verification', 'Rework Required'];

export default function FieldDashboardScreen() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showNotifications, setShowNotifications] = useState(false);

  const foNotifications = mockFieldOfficerNotifications.filter((n) => n.userId === 'fo-1');

  const fieldOfficerIssues = mockIssues.filter(
    (issue) =>
      issue.assignedOfficer &&
      (issue.status === 'Assigned' ||
        issue.status === 'In Progress' ||
        issue.status === 'Pending UO Verification' ||
        issue.status === 'Rework Required')
  );

  const filteredIssues =
    selectedFilter === 'All'
      ? fieldOfficerIssues
      : fieldOfficerIssues.filter((issue) => issue.status === selectedFilter);

  const counts: Record<string, number> = {
    All: fieldOfficerIssues.length,
    Assigned: fieldOfficerIssues.filter((i) => i.status === 'Assigned').length,
    'In Progress': fieldOfficerIssues.filter((i) => i.status === 'In Progress').length,
    'Pending UO Verification': fieldOfficerIssues.filter(
      (i) => i.status === 'Pending UO Verification'
    ).length,
    'Rework Required': fieldOfficerIssues.filter((i) => i.status === 'Rework Required').length,
  };

  const unreadNotifCount = foNotifications.filter((n) => !n.read).length;

  const mockStats = {
    assigned: counts.Assigned,
    in_progress: counts['In Progress'],
    pending_upload: counts['Pending UO Verification'],
    rework_required: counts['Rework Required'],
    resolved_today: 8,
    sla_alerts: unreadNotifCount,
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleIssuePress = (issue: Issue) => {
    if (!issue?.id) {
      // This should never happen since the card is only rendered for valid issues, but just in case
      // @ts-ignore
      Alert.alert('Error', 'Invalid issue data');
      return;
    }
    // @ts-expect-error - navigation params
    navigation.navigate('FieldIssueDetail' as never, { issue } as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0D9488"
            colors={['#0D9488']}
          />
        }>
        <FieldOfficerDashboard
          officerName="Rajesh Kumar"
          ward="Ward 12 – South Zone"
          isOnline
          stats={mockStats}
          onNotificationPress={() => setShowNotifications(true)}
        />

        <SimpleFilterBar
          filters={FILTERS}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          counts={counts}
        />

        <View style={styles.listContent}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {selectedFilter === 'All' ? 'My Tasks' : selectedFilter}
            </Text>
            <View className="rounded-full bg-teal-100 px-2.5 py-1 dark:bg-teal-900/40">
              <Text className="text-xs font-bold text-teal-700 dark:text-teal-300">
                {filteredIssues.length} {filteredIssues.length === 1 ? 'task' : 'tasks'}
              </Text>
            </View>
          </View>

          {filteredIssues.length > 0 ? (
            filteredIssues.map((issue) => (
              <FieldIssueCard
                key={issue.id}
                issue={issue}
                onPress={() => handleIssuePress(issue)}
              />
            ))
          ) : (
            <View className="items-center gap-3 py-16">
              <View className="mb-1 h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800">
                <FileText color="#D1D5DB" size={40} strokeWidth={1.5} />
              </View>
              <Text className="text-[17px] font-bold text-slate-500 dark:text-slate-600">
                No tasks found
              </Text>
              <Text className="px-8 text-center text-[13px] leading-5 text-slate-400 dark:text-slate-600">
                {selectedFilter === 'All'
                  ? 'You have no assigned tasks at the moment'
                  : `No tasks with status "${selectedFilter}"`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <NotificationPanel
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={foNotifications}
        role="FieldOfficer"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
});
