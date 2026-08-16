import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FileText } from 'lucide-react-native';
import FieldOfficerDashboard from 'screens/FieldOfficer/FieldOfficerDashboard';
import FieldIssueCard from 'components/FieldOfficer/FieldIssueCard';
import SimpleFilterBar from 'components/FieldOfficer/SimpleFilterBar';
import NotificationPanel from 'components/NotificationPanel';
import { Issue } from 'lib/types';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useUser } from 'context/UserContext';
import { mapIssueToUI } from 'lib/issueMapper';
import { Id } from 'convex/_generated/dataModel';

const FILTERS = ['all', 'assigned', 'in_progress', 'pending_uo_verification', 'rework_required'];

export default function FieldDashboardScreen() {
  const navigation = useNavigation();
  const user = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);

  const fieldOfficer = useQuery(
    api.fieldOfficers.getFieldOfficerByUserId,
    // @ts-ignore
    user?.id ? { userId: user.id } : 'skip'
  );

  const rawIssues = useQuery(
    api.fieldOfficers.getFieldOfficerIssues,
    // @ts-ignore
    user?.id ? { userId: user.id } : 'skip'
  );

  // Fetch Field Officer Notifications
  const notifications = useQuery(
    api.notifications.getByUser,
    user?.id ? { userId: user.id } : 'skip'
  );

  const markAll = useMutation(api.notifications.markAllAsRead);

  const deleteNotification = useMutation(api.notifications.deleteNotification);

  async function handleMarkAllAsRead() {
    await markAll({ userId: user?.id as Id<'users'> });
  }

  async function handleDelete(id: string) {
    await deleteNotification({ id: id as Id<'notifications'> });
  }

  const fieldOfficerIssues = useMemo(() => {
    if (!rawIssues) return [];

    return rawIssues.map((issue) => mapIssueToUI(issue, {}));
  }, [rawIssues]);

  // console.log('rawIssues FO Issues: \n', JSON.stringify(rawIssues, null, 2));

  const filteredIssues =
    selectedFilter === 'all'
      ? fieldOfficerIssues
      : fieldOfficerIssues.filter((issue) => issue?.status === selectedFilter);

  const counts: Record<string, number> = {
    all: fieldOfficerIssues.length,
    assigned: fieldOfficerIssues.filter((i) => i?.status === 'assigned').length,
    in_progress: fieldOfficerIssues.filter((i) => i?.status === 'in_progress').length,
    pending_uo_verification: fieldOfficerIssues.filter(
      (i) => i?.status === 'pending_uo_verification' || i?.status === 'submitted_for_review'
    ).length,
    rework_required: fieldOfficerIssues.filter(
      (i) => i?.status === 'rework_required' || i?.status === 'rework_requested'
    ).length,
  };

  const realStats = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const assignedCount = fieldOfficerIssues.filter((i) => i?.status === 'assigned').length;
    const inProgressCount = fieldOfficerIssues.filter((i) => i?.status === 'in_progress').length;
    const pendingUploadCount = fieldOfficerIssues.filter((i) =>
      ['submitted_for_review', 'pending_uo_verification'].includes(i?.status)
    ).length;
    const reworkCount = fieldOfficerIssues.filter((i) =>
      ['rework_required', 'rework_requested'].includes(i?.status)
    ).length;

    const resolvedToday = fieldOfficerIssues.filter((i) => {
      const isResolved = i?.status === 'resolved' || i?.status === 'closed';
      if (!isResolved) return false;
      const resTime = i?.resolvedAt ?? i?.closedAt ?? i?.createdAt;
      return typeof resTime === 'number' ? resTime >= todayMs : false;
    }).length;

    const unreadNotifs = notifications?.filter((n) => !n.read).length ?? 0;
    const slaBreaches = fieldOfficerIssues.filter(
      (i) =>
        i?.slaDeadline &&
        i.slaDeadline < Date.now() &&
        !['resolved', 'closed'].includes(i?.status)
    ).length;

    return {
      assigned: assignedCount,
      in_progress: inProgressCount,
      pending_upload: pendingUploadCount,
      rework_required: reworkCount,
      resolved_today: resolvedToday,
      sla_breaches: slaBreaches,
      unread_notifs: unreadNotifs,
    };
  }, [fieldOfficerIssues, notifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleIssuePress = (issueId: string) => {
    if (!issueId) {
      // This should never happen since the card is only rendered for valid issues, but just in case
      // @ts-ignore
      Alert.alert('Error', 'Invalid issue data');
      return;
    }
    // @ts-expect-error - navigation params
    navigation.navigate('FieldIssueDetail' as never, { issueId } as never);
  };

  if (!rawIssues && !notifications) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="mt-3 text-sm font-medium text-slate-400">
          Loading Field Officer Dashboard...
        </Text>
      </View>
    );
  }

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
          officerName={fieldOfficer?.fullName || user?.name || 'Field Officer'}
          ward={
            fieldOfficer?.city && fieldOfficer?.department
              ? `${fieldOfficer.city} • ${fieldOfficer.department}`
              : fieldOfficer?.city || 'Field Zone'
          }
          stats={realStats}
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
              {selectedFilter === 'all'
                ? 'My Tasks'
                : selectedFilter.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
            <View className="rounded-full bg-teal-100 px-2.5 py-1 dark:bg-teal-900/40">
              <Text className="text-xs font-bold text-teal-700 dark:text-teal-300">
                {filteredIssues.length} {filteredIssues.length === 1 ? 'Task' : 'Tasks'}
              </Text>
            </View>
          </View>

          {filteredIssues.length > 0 ? (
            filteredIssues.map((issue) => (
              <FieldIssueCard
                key={issue?.id}
                // @ts-ignore - Passing issue as is
                issue={issue}
                onPress={() => handleIssuePress(issue?.id)}
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

      {notifications && (
        <NotificationPanel
          visible={showNotifications}
          onClose={() => setShowNotifications(false)}
          // @ts-ignore
          notification={notifications}
          handleMarkAllAsRead={handleMarkAllAsRead}
          handleDelete={handleDelete}
          role="FieldOfficer"
        />
      )}
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
