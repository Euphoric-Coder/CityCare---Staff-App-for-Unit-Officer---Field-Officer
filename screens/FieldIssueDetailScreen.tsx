import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  MessageCircle,
  Calendar,
  Play,
  Upload,
} from 'lucide-react-native';
import { Issue } from '../lib/types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import WorkExecutionFlow from '../components/WorkExecutionFlow';

type RootStackParamList = {
  FieldIssueDetail: { issue: Issue };
};

type FieldIssueDetailScreenRouteProp = RouteProp<RootStackParamList, 'FieldIssueDetail'>;

export default function FieldIssueDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<FieldIssueDetailScreenRouteProp>();
  const issue = route.params?.issue;
  const [showWorkFlow, setShowWorkFlow] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleStartWork = () => {
    Alert.alert('Start Work', 'This will mark the issue as In Progress', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: () => {
          Alert.alert('Success', 'Work has been started on this issue');
          navigation.goBack();
        },
      },
    ]);
  };

  const handleUploadResolution = () => {
    setShowWorkFlow(true);
  };

  const handleWorkFlowSubmit = (data: {
    beforeImage: string | null;
    afterImage: string | null;
    location: { latitude: number; longitude: number } | null;
    notes: string;
  }) => {
    setShowWorkFlow(false);
    Alert.alert('Success', 'Resolution submitted for verification', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const handleContactCitizen = () => {
    Alert.alert('Contact Citizen', `Call ${issue?.citizenName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Alert.alert('Calling', `${issue?.citizenPhone}`) },
    ]);
  };

  const handleMessage = () => {
    Alert.alert('Messages', 'Message feature coming soon');
  };

  if (!issue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <ArrowLeft color="#111827" size={24} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Issue Details</Text>
          <View style={styles.messageButton} />
        </View>
        <View style={styles.content}>
          <Text style={styles.errorText}>No issue data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return '#DC2626';
      case 'Medium':
        return '#F59E0B';
      case 'Low':
        return '#16A34A';
      default:
        return '#6B7280';
    }
  };

  const getActionButton = () => {
    switch (issue.status) {
      case 'Assigned':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={handleStartWork}
            activeOpacity={0.7}>
            <Play color="#FFFFFF" size={20} strokeWidth={2.5} fill="#FFFFFF" />
            <Text style={styles.actionButtonText}>Start Work</Text>
          </TouchableOpacity>
        );
      case 'In Progress':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton]}
            onPress={handleUploadResolution}
            activeOpacity={0.7}>
            <Upload color="#FFFFFF" size={20} strokeWidth={2.5} />
            <Text style={styles.actionButtonText}>Upload Resolution</Text>
          </TouchableOpacity>
        );
      case 'Rework Required':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton]}
            onPress={handleUploadResolution}
            activeOpacity={0.7}>
            <Upload color="#FFFFFF" size={20} strokeWidth={2.5} />
            <Text style={styles.actionButtonText}>Re-upload Resolution</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <ArrowLeft color="#111827" size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Details</Text>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={handleMessage}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <MessageCircle color="#0EA5A4" size={24} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.issueCard}>
          <View style={styles.issueHeader}>
            <Text style={styles.issueId}>#{issue.id.slice(0, 8)}</Text>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: `${getPriorityColor(issue.priority)}15` },
              ]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(issue.priority) }]}>
                {issue.priority} Priority
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{issue.title}</Text>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{issue.category}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.description}>{issue.description}</Text>
          </View>
        </View>

        {issue.images && issue.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
              {issue.images.map((img, index) => (
                <Image key={index} source={{ uri: img }} style={styles.evidenceImage} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <MapPin color="#0EA5A4" size={20} strokeWidth={2.5} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>{issue.location}</Text>
              <Text style={styles.coordinates}>
                {issue.coordinates.latitude.toFixed(4)}, {issue.coordinates.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Citizen Information</Text>
          <View style={styles.citizenCard}>
            <View style={styles.citizenRow}>
              <View style={styles.citizenIcon}>
                <User color="#0EA5A4" size={18} strokeWidth={2.5} />
              </View>
              <View style={styles.citizenInfo}>
                <Text style={styles.citizenLabel}>Name</Text>
                <Text style={styles.citizenValue}>{issue.citizenName}</Text>
              </View>
            </View>
            <View style={styles.citizenRow}>
              <View style={styles.citizenIcon}>
                <Phone color="#0EA5A4" size={18} strokeWidth={2.5} />
              </View>
              <View style={styles.citizenInfo}>
                <Text style={styles.citizenLabel}>Phone</Text>
                <Text style={styles.citizenValue}>{issue.citizenPhone}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactCitizen}
              activeOpacity={0.7}>
              <Phone color="#FFFFFF" size={18} strokeWidth={2.5} />
              <Text style={styles.contactButtonText}>Contact Citizen</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timelineCard}>
            <View style={styles.timelineRow}>
              <Calendar color="#6B7280" size={16} strokeWidth={2} />
              <View style={styles.timelineInfo}>
                <Text style={styles.timelineLabel}>Reported</Text>
                <Text style={styles.timelineValue}>
                  {new Date(issue.createdAt).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
            {issue.slaDeadline && (
              <View style={styles.timelineRow}>
                <Calendar color="#DC2626" size={16} strokeWidth={2} />
                <View style={styles.timelineInfo}>
                  <Text style={styles.timelineLabel}>SLA Deadline</Text>
                  <Text style={[styles.timelineValue, styles.deadlineText]}>
                    {new Date(issue.slaDeadline).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {getActionButton() && <View style={styles.footer}>{getActionButton()}</View>}

      <Modal
        visible={showWorkFlow}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowWorkFlow(false)}>
        <WorkExecutionFlow
          issueId={issue.id}
          onClose={() => setShowWorkFlow(false)}
          onSubmit={handleWorkFlowSubmit}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  messageButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
  },
  issueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#0EA5A4',
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  issueId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 28,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F766E',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  descriptionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  imagesRow: {
    flexDirection: 'row',
  },
  evidenceImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  citizenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  citizenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  citizenIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  citizenInfo: {
    flex: 1,
  },
  citizenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  citizenValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0EA5A4',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineInfo: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  deadlineText: {
    color: '#DC2626',
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 14,
    minHeight: 56,
  },
  startButton: {
    backgroundColor: '#16A34A',
  },
  uploadButton: {
    backgroundColor: '#0EA5A4',
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
