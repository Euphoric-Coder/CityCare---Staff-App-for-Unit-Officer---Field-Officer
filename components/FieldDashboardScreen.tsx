import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FieldOfficerDashboard from '../screens/FieldOfficerDashboard';
import FieldIssueCard from './FieldIssueCard';
import SimpleFilterBar from './SimpleFilterBar';
import { mockIssues } from '../lib/mockData';
import { Issue } from '../lib/types';

export default function FieldDashboardScreen() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');

  // Filter issues assigned to field officers
  const fieldOfficerIssues = mockIssues.filter(
    (issue) =>
      issue.assignedOfficer &&
      (issue.status === 'Assigned' ||
        issue.status === 'In Progress' ||
        issue.status === 'Pending UO Verification' ||
        issue.status === 'Rework Required')
  );

  // Apply filter
  const filteredIssues =
    selectedFilter === 'All'
      ? fieldOfficerIssues
      : fieldOfficerIssues.filter((issue) => issue.status === selectedFilter);

  const mockStats = {
    assigned: fieldOfficerIssues.filter((i) => i.status === 'Assigned').length,
    in_progress: fieldOfficerIssues.filter((i) => i.status === 'In Progress').length,
    pending_upload: fieldOfficerIssues.filter((i) => i.status === 'Pending UO Verification').length,
    rework_required: fieldOfficerIssues.filter((i) => i.status === 'Rework Required').length,
    resolved_today: 8,
    sla_alerts: 4,
  };

  const handleNotificationPress = () => {
    Alert.alert('Notifications', 'You have 4 SLA alerts pending attention');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const handleIssuePress = (issue: Issue) => {
    if (!issue || !issue.id) {
      Alert.alert('Error', 'Invalid issue data');
      return;
    }
    // @ts-ignore
    navigation.navigate('FieldIssueDetail' as never, { issue } as never);
  };

  const filters = ['All', 'Assigned', 'In Progress', 'Pending UO Verification', 'Rework Required'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.issuesList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={filteredIssues.length === 0 ? styles.emptyContent : undefined}>
        <FieldOfficerDashboard
          officerName="Rajesh Kumar"
          ward="Ward 12 - South Zone"
          isOnline={true}
          stats={mockStats}
          onNotificationPress={handleNotificationPress}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
        <View style={styles.issuesSection}>
          <SimpleFilterBar
            filters={filters}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
          />
          {filteredIssues.length > 0 ? (
            filteredIssues.map((issue) => (
              <FieldIssueCard
                key={issue.id}
                issue={issue}
                onPress={() => handleIssuePress(issue)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No issues found</Text>
              <Text style={styles.emptySubtext}>
                {selectedFilter === 'All'
                  ? 'You have no assigned issues at the moment'
                  : `No issues with status "${selectedFilter}"`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDFA',
  },
  issuesSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  issuesList: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
