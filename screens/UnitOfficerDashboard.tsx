import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  RotateCcw,
} from 'lucide-react-native';
import { Issue, IssueStatus } from '../lib/types';
import { mockIssues, mockDashboardStats as mockStats } from '../lib/mockData';
import IssueCard from '../components/IssueCard';
import FilterBar from '../components/FilterBar';
import { useNavigation } from '@react-navigation/native';

interface UnitOfficerDashboardProps {
  userName?: string;
  ward?: string;
}

export default function UnitOfficerDashboard({
  userName = 'Kumar Singh',
  ward = 'Varanasi Zone',
}: UnitOfficerDashboardProps) {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | 'All'>('All');

  const filteredIssues = mockIssues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.citizenName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'All' || issue.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      label: 'Total Issues',
      value: mockStats.totalIssues,
      icon: <FileText color="#0EA5A4" size={20} />,
      color: '#0EA5A4',
    },
    {
      label: 'Pending',
      value: mockStats.pendingVerification,
      icon: <Clock color="#F59E0B" size={20} />,
      color: '#F59E0B',
    },
    {
      label: 'Assigned',
      value: mockStats.assigned,
      icon: <AlertCircle color="#06B6D4" size={20} />,
      color: '#06B6D4',
    },
    {
      label: 'Resolved',
      value: mockStats.resolved,
      icon: <CheckCircle color="#10B981" size={20} />,
      color: '#10B981',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#0D9488', '#0EA5A4', '#14B8A6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{userName}</Text>
            <View style={styles.wardBadge}>
              <Text style={styles.wardText}>{ward}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
            <Bell color="#FFFFFF" size={22} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                {stat.icon}
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search color="#9CA3AF" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search issues..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <FilterBar selectedStatus={selectedStatus} onStatusChange={setSelectedStatus} />
        <View style={styles.issuesHeader}>
          <Text style={styles.issuesTitle}>
            {selectedStatus === 'All' ? 'All Issues' : selectedStatus}
          </Text>
          <Text style={styles.issuesCount}>{filteredIssues.length} issues</Text>
        </View>

        {filteredIssues.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText color="#D1D5DB" size={64} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No issues found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search query</Text>
          </View>
        ) : (
          filteredIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onPress={() =>
                navigation.navigate('IssueDetail' as never, { issueId: issue.id } as never)
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
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
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  wardBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  wardText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  issuesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  issuesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  issuesCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
