import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  UserCheck,
  Send,
  Image as ImageIcon,
  RotateCcw,
  RefreshCw,
  Star,
  Briefcase,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Issue } from '../lib/types';
import { mockFieldOfficers } from '../lib/mockData';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import AssignOfficerModal from '../components/AssignOfficerModal';
import RejectionModal from '../components/RejectionModal';
import ReassignmentModal from '../components/ReassignmentModal';
import VerificationFlow from '../components/VerificationFlow';
import { VerificationChecklist, RejectionReason } from '../lib/types';
import { issueService } from 'lib/issueService';

interface IssueDetailScreenProps {
  route: { params: { issueId: string } };
}

export default function IssueDetailScreen({ route }: IssueDetailScreenProps) {
  const navigation = useNavigation();
  const { issueId } = route.params;
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [comment, setComment] = useState('');
  const [localIssue, setLocalIssue] = useState<Issue | null>(null);
  const [verificationTab, setVerificationTab] = useState<'verify' | 'reject'>('verify');

  useEffect(() => {
    loadIssue();
  }, [issueId]);

  useEffect(() => {
    if (issue) {
      setLocalIssue(issue);
    }
  }, [issue]);

  const loadIssue = async () => {
    try {
      setLoading(true);
      const fetchedIssue = await issueService.fetchIssueById(issueId);
      if (fetchedIssue) {
        setIssue(fetchedIssue);
      } else {
        Alert.alert('Error', 'Issue not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading issue:', error);
      Alert.alert('Error', 'Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !issue || !localIssue) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0EA5A4" />
      </View>
    );
  }

  const handleVerify = (checklist: VerificationChecklist, slaDate: string) => {
    setLocalIssue({
      ...localIssue,
      status: 'Verified',
      verificationChecklist: checklist,
      slaDeadline: slaDate,
      timeline: [
        ...localIssue.timeline,
        {
          id: `${Date.now()}`,
          status: 'Verified',
          timestamp: new Date().toISOString(),
          description: 'Issue verified and ready for officer assignment',
          officerName: 'Unit Officer',
        },
      ],
    });
    Alert.alert('Success', 'Issue has been verified and is ready for assignment.');
  };

  const handleReject = (reason: RejectionReason, comment: string) => {
    setLocalIssue({
      ...localIssue,
      status: 'Rejected',
      rejectionReason: reason,
      rejectionComment: comment,
      timeline: [
        ...localIssue.timeline,
        {
          id: `${Date.now()}`,
          status: 'Rejected',
          timestamp: new Date().toISOString(),
          description: `Issue rejected: ${reason}`,
          officerName: 'Unit Officer',
          comment,
        },
      ],
    });
    setShowRejectionModal(false);
    Alert.alert('Rejected', 'Issue has been rejected.');
  };

  const handleAssign = (officerId: string) => {
    const officer = mockFieldOfficers.find((o) => o.id === officerId);
    if (officer) {
      setLocalIssue({
        ...localIssue,
        status: 'Assigned',
        assignedOfficer: officer.name,
        assignedOfficerId: officer.id,
      });
      setShowAssignModal(false);
      Alert.alert('Success', `Issue assigned to ${officer.name}`);
    }
  };

  const handleReassign = (reason: string, comment: string) => {
    setShowReassignModal(false);
    setShowAssignModal(true);
  };

  const handleMarkResolved = () => {
    Alert.alert('Mark as Resolved', 'Confirm that this issue has been officially resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => {
          setLocalIssue({ ...localIssue, status: 'Resolved' });
          Alert.alert('Success', 'Issue marked as resolved.');
        },
      },
    ]);
  };

  const handleReopen = () => {
    Alert.alert('Reopen Issue', 'Are you sure you want to reopen this issue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reopen',
        onPress: () => {
          if (!comment.trim()) {
            Alert.alert('Error', 'Please add a comment explaining why you are reopening.');
            return;
          }
          setLocalIssue({ ...localIssue, status: 'Reopened' });
          Alert.alert('Success', 'Issue has been reopened.');
          setComment('');
        },
      },
    ]);
  };

  const handleAddComment = () => {
    if (comment.trim()) {
      Alert.alert('Success', 'Comment added to issue.');
      setComment('');
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#1E40AF', '#1D4ED8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Details</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.badges}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{localIssue.category}</Text>
            </View>
            <PriorityBadge priority={localIssue.priority} />
            <StatusBadge status={localIssue.status} />
          </View>

          <Text style={styles.title}>{localIssue.title}</Text>

          <View style={styles.infoRow}>
            <MapPin color="#6B7280" size={18} />
            <Text style={styles.infoText}>{localIssue.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <User color="#6B7280" size={18} />
            <Text style={styles.infoText}>
              {localIssue.citizenName} • {localIssue.citizenEmail}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Calendar color="#6B7280" size={18} />
            <Text style={styles.infoText}>Reported {formatTimestamp(localIssue.dateReported)}</Text>
          </View>

          {localIssue.assignedOfficer && localIssue.assignedOfficerId && (
            <View style={styles.assignedOfficerCard}>
              <View style={styles.assignedOfficerHeader}>
                <View style={styles.assignedOfficerIcon}>
                  <UserCheck color="#0EA5A4" size={24} strokeWidth={2.5} />
                </View>
                <View style={styles.assignedOfficerInfo}>
                  <Text style={styles.assignedOfficerLabel}>Assigned to</Text>
                  <Text style={styles.assignedOfficerName}>{localIssue.assignedOfficer}</Text>
                  {(() => {
                    const officer = mockFieldOfficers.find(
                      (o) => o.id === localIssue.assignedOfficerId
                    );
                    return officer ? (
                      <View style={styles.officerStatsRow}>
                        <View style={styles.officerStat}>
                          <Star color="#F59E0B" size={12} fill="#F59E0B" strokeWidth={2} />
                          <Text style={styles.officerStatText}>{officer.rating.toFixed(1)}</Text>
                        </View>
                        <View style={styles.officerStat}>
                          <Briefcase color="#6B7280" size={12} strokeWidth={2} />
                          <Text style={styles.officerStatText}>{officer.active_issues} active</Text>
                        </View>
                      </View>
                    ) : null;
                  })()}
                </View>
                {(localIssue.status === 'Assigned' || localIssue.status === 'In Progress') && (
                  <TouchableOpacity
                    style={styles.reassignButton}
                    onPress={() => setShowReassignModal(true)}
                    activeOpacity={0.7}>
                    <RefreshCw color="#F59E0B" size={18} strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{localIssue.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Evidence</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {localIssue.beforePhotos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <Text style={styles.photoLabel}>Before</Text>
              </View>
            ))}
            {localIssue.afterPhotos?.map((photo, index) => (
              <View key={`after-${index}`} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <Text style={styles.photoLabel}>After</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {localIssue.timeline.map((event, index) => (
            <View key={event.id} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              {index < localIssue.timeline.length - 1 && <View style={styles.timelineLine} />}
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStatus}>{event.status}</Text>
                <Text style={styles.timelineDescription}>{event.description}</Text>
                {event.officerName && (
                  <Text style={styles.timelineOfficer}>by {event.officerName}</Text>
                )}
                <Text style={styles.timelineTimestamp}>{formatTimestamp(event.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discussion</Text>
          {localIssue.comments.map((commentItem) => (
            <View key={commentItem.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {commentItem.author
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </Text>
                </View>
                <View style={styles.commentHeaderText}>
                  <Text style={styles.commentAuthor}>{commentItem.author}</Text>
                  <Text style={styles.commentRole}>{commentItem.role}</Text>
                </View>
                <Text style={styles.commentTime}>{formatTimestamp(commentItem.timestamp)}</Text>
              </View>
              <Text style={styles.commentMessage}>{commentItem.message}</Text>
            </View>
          ))}

          <View style={styles.addCommentBox}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleAddComment}
              activeOpacity={0.7}>
              <Send color="#1D4ED8" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {localIssue.status === 'Pending' && (
          <View style={styles.verificationSection}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, verificationTab === 'verify' && styles.tabActive]}
                onPress={() => setVerificationTab('verify')}
                activeOpacity={0.7}>
                <CheckCircle
                  color={verificationTab === 'verify' ? '#10B981' : '#6B7280'}
                  size={20}
                />
                <Text
                  style={[styles.tabText, verificationTab === 'verify' && styles.tabTextActive]}>
                  Verify & Approve
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, verificationTab === 'reject' && styles.tabActive]}
                onPress={() => setVerificationTab('reject')}
                activeOpacity={0.7}>
                <XCircle color={verificationTab === 'reject' ? '#EF4444' : '#6B7280'} size={20} />
                <Text
                  style={[styles.tabText, verificationTab === 'reject' && styles.tabTextActive]}>
                  Reject Issue
                </Text>
              </TouchableOpacity>
            </View>

            {verificationTab === 'verify' ? (
              <VerificationFlow
                onVerify={handleVerify}
                onReject={() => setVerificationTab('reject')}
              />
            ) : (
              <View style={styles.rejectTab}>
                <Text style={styles.rejectTitle}>Reject Issue</Text>
                <Text style={styles.rejectSubtitle}>Provide a reason for rejecting this issue</Text>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => setShowRejectionModal(true)}
                  activeOpacity={0.85}>
                  <XCircle color="#FFFFFF" size={20} />
                  <Text style={styles.rejectButtonText}>Select Rejection Reason</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {localIssue.status === 'Verified' && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>Assign Field Officer</Text>
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => setShowAssignModal(true)}
              activeOpacity={0.85}>
              <UserCheck color="#FFFFFF" size={20} />
              <Text style={styles.assignButtonText}>Assign to Officer</Text>
            </TouchableOpacity>
          </View>
        )}

        {localIssue.status === 'In Progress' && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>Work in Progress</Text>
            <Text style={styles.actionSubtitle}>
              Field officer is currently working on this issue
            </Text>
          </View>
        )}

        {localIssue.status === 'Assigned' && localIssue.afterPhotos && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>Resolution Confirmation</Text>
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={handleMarkResolved}
              activeOpacity={0.85}>
              <CheckCircle color="#FFFFFF" size={20} />
              <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reopenButton}
              onPress={handleReopen}
              activeOpacity={0.85}>
              <RotateCcw color="#FFFFFF" size={20} />
              <Text style={styles.reopenButtonText}>Reopen Issue</Text>
            </TouchableOpacity>
          </View>
        )}

        {localIssue.status === 'Resolved' && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>Issue Resolved</Text>
            <Text style={styles.actionSubtitle}>This issue has been successfully resolved</Text>
            <TouchableOpacity
              style={styles.reopenButton}
              onPress={handleReopen}
              activeOpacity={0.85}>
              <RotateCcw color="#FFFFFF" size={20} />
              <Text style={styles.reopenButtonText}>Reopen if Needed</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AssignOfficerModal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        officers={mockFieldOfficers}
        onAssign={handleAssign}
      />

      <RejectionModal
        visible={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        onReject={handleReject}
      />

      <ReassignmentModal
        visible={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        onConfirm={handleReassign}
        issueTitle={localIssue.title}
        currentOfficer={localIssue.assignedOfficer || ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 30,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  assignedOfficerCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#5EEAD4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  assignedOfficerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assignedOfficerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedOfficerInfo: {
    flex: 1,
  },
  assignedOfficerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  assignedOfficerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 6,
  },
  officerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  officerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  officerStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  reassignButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  photoContainer: {
    marginRight: 12,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1D4ED8',
    marginTop: 4,
    marginRight: 12,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 16,
    width: 1,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  timelineOfficer: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  timelineTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  commentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  commentHeaderText: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  commentRole: {
    fontSize: 11,
    color: '#6B7280',
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  commentMessage: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  addCommentBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4ED8',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  assignButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  resolveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  reopenButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verificationSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1D4ED8',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1D4ED8',
  },
  rejectTab: {
    padding: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 0,
  },
  rejectTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  rejectSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
});
