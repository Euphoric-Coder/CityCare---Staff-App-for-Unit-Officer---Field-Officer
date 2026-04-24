import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  useColorScheme,
  Dimensions,
  Linking,
  Platform,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  CircleCheck as CheckCircle,
  XCircle,
  UserCheck,
  Send,
  RotateCcw,
  RefreshCw,
  Star,
  Briefcase,
  TrendingUp,
  Clock,
  TriangleAlert as AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Tag,
  Layers,
  Phone,
  Mail,
  Navigation,
  Play,
  Video,
  Hash,
  Paperclip,
  Eye,
  EyeOff,
  Users,
  ShieldAlert,
  MessageSquarePlus,
  X,
  Camera,
  Image as ImageIcon,
  FileText,
  Zap,
  Droplets,
  Trash2,
  Recycle,
  Package,
  HeartPulse,
  MoreHorizontal,
  Notebook,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Issue, IssueStatus, IssueUpdate, UpdateScope } from '../lib/types';
import { mockFieldOfficers } from '../lib/mockData';
import { issueService } from '../lib/issueService';
import StatusBadge, { PriorityBadge } from '../components/StatusBadge';
import RejectionModal from '../components/RejectionModal';
import ReassignmentModal from '../components/ReassignmentModal';
import {
  VerificationChecklist,
  RejectionReason,
  SLAOverdueRejectionReason,
  SLAExtensionReason,
  FieldOfficer,
} from '../lib/types';
import AssignOfficerModal from 'components/AssignOfficerModal';
import VerificationFlow from 'components/VerificationFlow';
import UOVerificationPanel from 'components/UOVerificationPanel';
import SLAOverduePanel from 'components/SLAOverduePanel';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { mapIssueToUI } from 'lib/issueMapper';
import { useUser } from 'context/UserContext';
import { Id } from 'convex/_generated/dataModel';

interface IssueDetailScreenProps {
  route: { params: { issueId: string } };
}

interface FileAttachment {
  uri: string;
  type: 'image' | 'video' | 'pdf';
  name: string;
  mimeType?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH - 48;

const STATUS_DOT_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  verified: '#3B82F6',
  assigned: '#6366F1',
  in_progress: '#0EA5E9',
  pending_uo_verification: '#A855F7',
  rework_required: '#F97316',
  closed: '#10B981',
  rejected: '#EF4444',
  reopened: '#EC4899',
  escalated: '#8B5CF6',
  resolved: '#10B981',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  verified: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  pending_uo_verification: 'Pending UO Verification',
  rework_required: 'Rework Required',
  closed: 'Closed',
  rejected: 'Rejected',
  reopened: 'Reopened',
  escalated: 'Escalated',
  resolved: 'Resolved',
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  road: 'Road & Infrastructure',
  electricity: 'Electricity & Lighting',
  water: 'Water Supply',
  sanitation: 'Sanitation & Waste',
  drainage: 'Drainage & Sewer',
  solid_waste: 'Solid Waste Management',
  public_health: 'Public Health',
  other: 'Other',
};

const CATEGORY_COLORS: Record<
  string,
  { bg: string; darkBg: string; text: string; darkText: string; icon: string }
> = {
  road: {
    bg: '#DBEAFE',
    darkBg: '#1E3A5F',
    text: '#1E40AF',
    darkText: '#93C5FD',
    icon: '#2563EB',
  },

  electricity: {
    bg: '#FEF9C3',
    darkBg: '#422006',
    text: '#854D0E',
    darkText: '#FDE047',
    icon: '#CA8A04',
  },

  water: {
    bg: '#CFFAFE',
    darkBg: '#083344',
    text: '#0E7490',
    darkText: '#67E8F9',
    icon: '#06B6D4',
  },

  sanitation: {
    bg: '#DCFCE7',
    darkBg: '#14532D',
    text: '#166534',
    darkText: '#86EFAC',
    icon: '#16A34A',
  },

  drainage: {
    bg: '#F3E8FF',
    darkBg: '#2E1065',
    text: '#6B21A8',
    darkText: '#C4B5FD',
    icon: '#9333EA',
  },

  solid_waste: {
    bg: '#FFEDD5',
    darkBg: '#431407',
    text: '#9A3412',
    darkText: '#FDBA74',
    icon: '#EA580C',
  },

  public_health: {
    bg: '#FEE2E2',
    darkBg: '#450A0A',
    text: '#991B1B',
    darkText: '#FCA5A5',
    icon: '#DC2626',
  },

  other: {
    bg: '#F1F5F9',
    darkBg: '#1E293B',
    text: '#475569',
    darkText: '#CBD5F5',
    icon: '#64748B',
  },
};

function formatTimestamp(dateValue: string | number) {
  const date = new Date(dateValue);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateFull(dateValue: string | number) {
  const date = new Date(dateValue);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const isDark = useColorScheme() === 'dark';
  return (
    <View
      className="mx-4 mb-5 overflow-hidden rounded-[26px] border border-slate-200/50 bg-white dark:border-slate-800 dark:bg-[#0F172A]/90"
      style={{
        shadowColor: isDark ? '#000000' : '#475569',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.5 : 0.06,
        shadowRadius: 20,
        elevation: 6,
      }}>
      {children}
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2.5 border-b border-slate-100/50 px-5 pb-4 pt-5 dark:border-slate-800">
      {icon}
      <Text className="text-[16px] font-black tracking-tight text-slate-800 dark:text-slate-100">
        {title}
      </Text>
    </View>
  );
}

function PhotoCarousel({
  photos,
  label,
  isDark,
}: {
  photos: string[];
  label: string;
  isDark: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, photos.length - 1));
    scrollRef.current?.scrollTo({ x: clamped * CAROUSEL_ITEM_WIDTH, animated: true });
    setActiveIndex(clamped);
  };

  return (
    <View>
      <View style={{ position: 'relative' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_ITEM_WIDTH);
            setActiveIndex(index);
          }}
          style={{ width: CAROUSEL_ITEM_WIDTH }}>
          {photos.map((photo, i) => (
            <View key={i} style={{ width: CAROUSEL_ITEM_WIDTH, paddingHorizontal: 0 }}>
              <Image source={{ uri: photo }} style={styles.carouselPhoto} resizeMode="cover" />
            </View>
          ))}
        </ScrollView>

        {photos.length > 1 && (
          <>
            {activeIndex > 0 && (
              <TouchableOpacity
                onPress={() => goTo(activeIndex - 1)}
                activeOpacity={0.85}
                style={[styles.carouselArrow, styles.carouselArrowLeft]}>
                <ChevronLeft color="#fff" size={20} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
            {activeIndex < photos.length - 1 && (
              <TouchableOpacity
                onPress={() => goTo(activeIndex + 1)}
                activeOpacity={0.85}
                style={[styles.carouselArrow, styles.carouselArrowRight]}>
                <ChevronRight color="#fff" size={20} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.carouselLabelContainer}>
          <View
            className={
              label === 'BEFORE'
                ? 'rounded-xl bg-slate-800/80 px-3 py-1'
                : 'rounded-xl bg-emerald-600/90 px-3 py-1'
            }>
            <Text className="text-[11px] font-extrabold tracking-widest text-white">{label}</Text>
          </View>
          <View className="ml-2 rounded-xl bg-black/50 px-2.5 py-1">
            <Text className="text-[11px] font-bold text-white">
              {activeIndex + 1}/{photos.length}
            </Text>
          </View>
        </View>
      </View>

      {photos.length > 1 && (
        <View style={styles.dotsRow}>
          {photos.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
              <View
                style={[
                  styles.dot,
                  i === activeIndex
                    ? { backgroundColor: '#0D9488', width: 20 }
                    : { backgroundColor: isDark ? '#334155' : '#CBD5E1', width: 8 },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function VideoEvidenceCard({ videoUrl, isDark }: { videoUrl: string; isDark: boolean }) {
  const openVideo = () => {
    Linking.openURL(videoUrl).catch(() => {
      Alert.alert('Cannot open video', 'No compatible app found to play this video.');
    });
  };

  return (
    <TouchableOpacity onPress={openVideo} activeOpacity={0.88} style={styles.videoCard}>
      <LinearGradient
        colors={isDark ? ['#1E293B', '#0F172A'] : ['#F8FAFC', '#F1F5F9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.videoGradient}>
        <View style={styles.videoIconWrap}>
          <LinearGradient colors={['#0D9488', '#0891B2']} style={styles.videoPlayCircle}>
            <Play color="#fff" size={22} fill="#fff" strokeWidth={0} />
          </LinearGradient>
        </View>
        <View style={{ flex: 1 }}>
          <Text className="mb-0.5 text-[13px] font-bold text-slate-800 dark:text-slate-100">
            Video Evidence
          </Text>
          <Text className="text-[11px] text-slate-400 dark:text-slate-500" numberOfLines={1}>
            Tap to play in external viewer
          </Text>
        </View>
        <ChevronRight color={isDark ? '#475569' : '#94A3B8'} size={18} strokeWidth={2} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function IssueDetailScreen({ route }: IssueDetailScreenProps) {
  const user = useUser();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { issueId } = route.params;

  const issueUpdates = useQuery(
    api.issueUpdates.getByIssueId,
    // @ts-ignore
    true ? { issueId: issueId } : 'skip'
  );

  // @ts-ignore
  const issue = useQuery(api.unitOfficers.getIssueById, { issueId });

  const generateUploadUrl = useMutation(api.issuesMedia.generateUploadUrl);

  // @ts-ignore
  const createIssueUpdate = useMutation(api.issueUpdates.createIssueUpdate);

  // Verify Issue Mutation
  const verifyIssue = useMutation(api.unitOfficers.verifyIssue);

  // Reject Issue Mutation
  const rejectIssue = useMutation(api.unitOfficers.rejectIssue);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignModalMode, setAssignModalMode] = useState<'assign' | 'reassign'>('assign');
  const [pendingReassignMeta, setPendingReassignMeta] = useState<{
    reason: string;
    comment: string;
  } | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [verificationTab, setVerificationTab] = useState<'verify' | 'reject'>('verify');
  const [updateText, setUpdateText] = useState('');
  const [updateScope, setUpdateScope] = useState<UpdateScope>('field_and_citizen');
  const [updateAttachments, setUpdateAttachments] = useState<FileAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const pendingPicker = useRef<'camera' | 'gallery' | 'document' | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<any>(null);

  const launchCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUpdateAttachments((prev) => [
          ...prev,
          {
            uri: asset.uri,
            type: 'image',
            name: asset.fileName ?? `photo_${Date.now()}.jpg`,
          },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera. Please try again.');
      console.error('Camera error:', error);
    }
  }, []);

  const launchGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Gallery permission is required to select photos and videos.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.85,
        videoMaxDuration: 120,
      });
      if (!result.canceled) {
        const newFiles: FileAttachment[] = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          name: asset.fileName ?? `media_${Date.now()}`,
          mimeType: asset.mimeType || undefined,
        }));
        setUpdateAttachments((prev) => [...prev, ...newFiles]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
      console.error('Gallery error:', error);
    }
  }, []);

  const launchDocumentPicker = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        const newFiles: FileAttachment[] = result.assets.map((asset) => ({
          uri: asset.uri,
          type: 'pdf',
          name: asset.name,
          mimeType: asset.mimeType,
        }));
        setUpdateAttachments((prev) => [...prev, ...newFiles]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open document picker. Please try again.');
      console.error('Document picker error:', error);
    }
  }, []);

  const handleAttachMenuDismissed = useCallback(() => {
    const action = pendingPicker.current;
    pendingPicker.current = null;
    if (action === 'camera') launchCamera();
    else if (action === 'gallery') launchGallery();
    else if (action === 'document') launchDocumentPicker();
  }, [launchCamera, launchGallery, launchDocumentPicker]);

  useEffect(() => {
    if (!showAttachMenu && pendingPicker.current && Platform.OS === 'android') {
      const action = pendingPicker.current;
      pendingPicker.current = null;
      const timer = setTimeout(() => {
        if (action === 'camera') launchCamera();
        else if (action === 'gallery') launchGallery();
        else if (action === 'document') launchDocumentPicker();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showAttachMenu, launchCamera, launchGallery, launchDocumentPicker]);

  const uploadFileToConvex = async (file: FileAttachment) => {
    try {
      const uploadUrl = await generateUploadUrl();

      const fileResponse = await fetch(file.uri);

      if (!fileResponse.ok) {
        throw new Error('Failed to read file');
      }

      const blob = await fileResponse.blob();

      // Use actual mimeType OR fallback
      const contentType =
        file.mimeType ||
        (file.type === 'image'
          ? 'image/*'
          : file.type === 'video'
            ? 'video/*'
            : 'application/octet-stream');

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body: blob,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Upload failed:', text);
        throw new Error('Upload failed');
      }

      const { storageId } = await res.json();

      return storageId;
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  };

  const handleVerify = async (checklist: VerificationChecklist, slaDate: string, notes: string) => {
    if (!issue || !user) {
      throw new Error('Missing issue or user');
    }

    try {
      await verifyIssue({
        issueId: issue._id,
        issueCode: issue.issueCode,
        verificationChecklist: checklist,
        slaDeadline: new Date(slaDate).getTime(),
        notes: notes,
        UOName: user.name,
        verifiedBy: user.id as Id<'users'>,
        issueName: issue.title,
        reporterId: issue.reportedBy as Id<'users'>,
      });

      Alert.alert('Success', 'Issue has been verified and is ready for assignment.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to verify issue.');
    }
  };

  const handleReverify = (checklist: VerificationChecklist, slaDate: string) => {
    const newUpdate: IssueUpdate = {
      id: `upd-${Date.now()}`,
      issueId: mappedIssue!.id,
      status: 'verified',
      comment:
        'Re-opened issue re-verified after citizen review. Assigned back for further action.',
      role: 'UnitOfficer',
      attachments: [],
      updatedBy: 'uo-1',
      scope: 'field_and_citizen',
      createdAt: new Date().toISOString(),
    };
    console.log('Issue Update:', newUpdate);
    console.log('Verification Checklist', {
      status: 'Verified',
      verificationChecklist: checklist,
      slaDeadline: slaDate,
    });
    Alert.alert('Re-verified', 'Issue has been re-verified and is ready for re-assignment.');
  };

  const handleReject = async (reason: RejectionReason, reasonComment: string) => {
    if (!issue || !user) {
      throw new Error('Missing issue or user');
    }

    try {
      await rejectIssue({
        issueId: issue._id,
        issueCode: issue.issueCode,
        reason: reason,
        comment: reasonComment,
        UOName: user.name,
        rejectedBy: user.id as Id<'users'>,
        issueName: issue.title,
        reporterId: issue.reportedBy as Id<'users'>,
      });

      console.log('Rejection of Issue:', {
        issueId: issue._id,
        issueCode: issue.issueCode,
        reason: reason,
        comment: reasonComment,
        UOName: user.name,
        rejectedBy: user.id as Id<'users'>,
        issueName: issue.title,
        reporterId: issue.reportedBy as Id<'users'>,
      });

      // Delay alert to next frame for iOS
      setTimeout(() => {
        Alert.alert('Rejected', 'Issue has been rejected.');
      }, 300);
      
    } catch (error) {
      console.error('Error rejecting issue:', error);
      Alert.alert('Error', 'Failed to reject issue.');
    } finally {
      setShowRejectionModal(false);
    }
  };

  const handleAssign = (officerId: string) => {
    const officer = mockFieldOfficers.find((o) => o.id === officerId);
    if (!officer || !mappedIssue) return;

    const isReassign = assignModalMode === 'reassign';
    const previousOfficer = 'Rekha Devi';
    // const previousOfficer = mappedIssue.assignedOfficer;

    const timelineEntry: IssueUpdate = {
      id: `upd-${Date.now()}`,
      issueId: mappedIssue.id,
      status: 'assigned',
      comment: isReassign
        ? `Issue reassigned from ${previousOfficer ?? 'previous officer'} to ${officer.name}.${pendingReassignMeta?.reason ? ` Reason: ${pendingReassignMeta.reason}.` : ''}${pendingReassignMeta?.comment ? ` ${pendingReassignMeta.comment}` : ''}`
        : `Issue assigned to field officer ${officer.name} (Rating: ${officer.rating.toFixed(1)}, Success Rate: ${officer.successRate}%).`,
      role: 'UnitOfficer',
      attachments: [],
      updatedBy: 'Unit Officer',
      scope: 'field_and_citizen',
      createdAt: new Date().toISOString(),
    };

    console.log('Issue Update:', timelineEntry);

    console.log('Assignment', {
      status: 'Assigned',
      assignedOfficer: 'Rekha Devi',
      assignedOfficerId: 'fo-8',
      ...(isReassign && pendingReassignMeta
        ? {
            reassignmentReason: pendingReassignMeta.reason as any,
            reassignmentComment: pendingReassignMeta.comment,
          }
        : {}),
    });

    setPendingReassignMeta(null);
    setAssignModalMode('assign');
    setShowAssignModal(false);
  };

  const handleReassign = (reason: string, comment: string) => {
    setPendingReassignMeta({ reason, comment });
    setAssignModalMode('reassign');
    setShowReassignModal(false);
    setShowAssignModal(true);
  };

  const handleMarkResolved = () => {
    Alert.alert('Mark as Resolved', 'Confirm that this issue has been officially resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => {
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
          const newUpdate: IssueUpdate = {
            id: `upd-${Date.now()}`,
            issueId: mappedIssue!.id,
            status: 'reopened',
            comment: 'Issue reopened for further action.',
            role: 'Citizen',
            attachments: [],
            updatedBy: 'citizen-1',
            scope: 'citizen',
            createdAt: new Date().toISOString(),
          };
          console.log('Issue Update:', newUpdate);
          console.log('Reopen', { status: 'Reopened' });
          Alert.alert('Success', 'Issue has been reopened.');
        },
      },
    ]);
  };

  const isSLAOverdue = !!(
    mappedIssue?.slaDeadline &&
    new Date(mappedIssue.slaDeadline) < new Date() &&
    !['Closed', 'Rejected', 'Escalated'].includes(mappedIssue.status)
  );

  const handleSLAReassign = (
    _newOfficer: FieldOfficer,
    _reason: any,
    _note: string,
    _date: Date,
    updated: Issue
  ) => {
    console.log('handleSLAReassign', _newOfficer, _reason, _note, _date, updated);
    Alert.alert(
      'Reassigned',
      `Issue has been reassigned to ${_newOfficer.name} with a new SLA deadline.`
    );
  };

  const handleSLAReject = (_reason: SLAOverdueRejectionReason, _note: string, updated: Issue) => {
    console.log('handleSLAReject', _reason, _note, updated);
    Alert.alert('Issue Rejected', 'Issue has been rejected. Citizen has been notified.');
  };

  const handleSLAExtend = (
    _reason: SLAExtensionReason,
    _note: string,
    _date: Date,
    updated: Issue
  ) => {
    console.log('handleSLAExtend', _reason, _note, _date, updated);
    Alert.alert('SLA Extended', 'New SLA deadline has been set. Citizen has been notified.');
  };

  const handleSLAEscalate = (_note: string, updated: Issue) => {
    console.log('handleSLAEscalate', _note, updated);
    Alert.alert('Escalated', 'Issue has been escalated to Admin. Citizen has been informed.');
  };

  const handleUOApprove = (updatedIssue: Issue) => {
    console.log('handleUOApprove', updatedIssue);
    Alert.alert('Issue Closed', 'Resolution approved and issue has been closed successfully.');
  };

  const handleUORework = (note: string, updatedIssue: Issue) => {
    console.log('handleUORework', note, updatedIssue);
    Alert.alert('Rework Requested', 'Field officer has been notified to redo the work.');
  };

  const handlePostUpdate = async () => {
    const textWords = updateText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const wordCount = textWords.length;

    if (wordCount < 5) {
      Alert.alert(
        'Insufficient Detail',
        `You have only entered ${wordCount} word${
          wordCount === 1 ? '' : 's'
        }. An official update requires a minimum of 5 words to be filed.`
      );
      return;
    }

    try {
      // Upload all attachments first to DB
      const uploadedStorageIds = await Promise.all(
        updateAttachments.map((file) => uploadFileToConvex(file))
      );

      console.log('Uploaded Storage ID:', uploadedStorageIds);

      // Create Issue Update with storageIds
      await createIssueUpdate({
        issueId: issue?._id as Id<'issues'>,
        status: issue?.status as IssueStatus,
        comment: updateText as string,
        updatedBy: user?.id as Id<'users'>,
        role: 'unit_officer',
        attachments: uploadedStorageIds,
        scope: updateScope,
      });

      setUpdateText('');
      setUpdateAttachments([]);
      setUpdateScope('field_and_citizen');

      Alert.alert('Success', 'Update posted successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload attachments.');
    }
  };

  const handleShowAttachMenu = () => {
    setShowAttachMenu(true);
  };

  const handlePickFromCamera = () => {
    pendingPicker.current = 'camera';
    setShowAttachMenu(false);
  };

  const handlePickFromGallery = () => {
    pendingPicker.current = 'gallery';
    setShowAttachMenu(false);
  };

  const handlePickDocument = () => {
    pendingPicker.current = 'document';
    setShowAttachMenu(false);
  };

  const openMaps = () => {
    // @ts-ignore
    const { latitude, longitude } = mappedIssue.coordinates;

    // @ts-ignore
    const label = encodeURIComponent(mappedIssue.location);

    const scheme = Platform.select({
      ios: `maps:${latitude},${longitude}?q=${label}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
    });
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    if (scheme) {
      Linking.canOpenURL(scheme)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(scheme);
          }
          return Linking.openURL(webUrl);
        })
        .catch(() => Linking.openURL(webUrl));
    } else {
      Linking.openURL(webUrl);
    }
  };

  if (issue === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="mt-3 text-sm font-medium text-slate-400">Loading issue...</Text>
      </View>
    );
  }

  if (issue === null) {
    Alert.alert('Error', 'Issue not found');
    navigation.goBack();
    return null;
  }

  const mappedIssue = mapIssueToUI(issue, {});

  if (!mappedIssue) {
    return (
      <View>
        <Text>Something went wrong</Text>
      </View>
    );
  }

  const assignedOfficerData = mappedIssue.assignedOfficerId
    ? mockFieldOfficers.find((o) => o.id === mappedIssue.assignedOfficerId)
    : null;

  const statusDotColor = STATUS_DOT_COLORS[mappedIssue.status] ?? '#94A3B8';
  const catColor = CATEGORY_COLORS[mappedIssue.category] ?? CATEGORY_COLORS['Pothole'];

  const allBeforePhotos = mappedIssue.beforePhotos ?? [];
  const allAfterPhotos = mappedIssue.afterPhotos ?? [];
  const hasPhotos =
    allBeforePhotos.length > 0 || allAfterPhotos.length > 0 || mappedIssue.images.length > 0;
  const hasVideo = (mappedIssue.videoEvidence?.length ?? 0) > 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              zIndex: 10,
              shadowColor: isDark ? '#000000' : '#0369A1',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: isDark ? 0.4 : 0.3,
              shadowRadius: 24,
            },
          ]}>
          <LinearGradient
            colors={isDark ? ['#0F766E', '#0891B2', '#0C4A6E'] : ['#67B7CC', '#0284C7', '#6B8CF0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View className="mt-2 w-full flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
              className="h-[46px] w-[46px] items-center justify-center rounded-[18px] border border-white/30 bg-white/20 shadow-md dark:border-white/20 dark:bg-white/10">
              <ArrowLeft color="#FFFFFF" size={22} strokeWidth={3} />
            </TouchableOpacity>

            <View className="flex-1 items-center px-2">
              <View className="mb-1.5 flex-row items-center justify-center rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 shadow-sm dark:border-white/20 dark:bg-white/10">
                <Text className="text-[10px] font-black uppercase tracking-[0.25em] text-white/95">
                  Issue #{mappedIssue.issueCode}
                </Text>
              </View>
              <Text
                className="text-center text-[19px] font-black tracking-tight text-white"
                numberOfLines={1}>
                Issue Details
              </Text>
            </View>

            <View className="h-[46px] w-[46px] items-center justify-center rounded-[18px] border border-white/30 bg-white/20 shadow-md dark:border-white/20 dark:bg-white/10">
              <View
                className="h-4 w-4 rounded-full border-2 border-white/90"
                style={{
                  backgroundColor: statusDotColor,
                  shadowColor: statusDotColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 8,
                }}
              />
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* HERO TITLE CARD */}
          <SectionCard>
            <View className="px-5 pb-4 pt-5">
              {(() => {
                const STATUS_META: Record<string, any> = {
                  pending: {
                    bg: 'bg-amber-100',
                    darkBg: 'dark:bg-amber-900/40',
                    text: 'text-amber-700',
                    darkText: 'dark:text-amber-300',
                    dot: '#F59E0B',
                    border: 'border-amber-200 dark:border-amber-800',
                  },
                  verified: {
                    bg: 'bg-emerald-100',
                    darkBg: 'dark:bg-emerald-900/40',
                    text: 'text-emerald-700',
                    darkText: 'dark:text-emerald-300',
                    dot: '#10B981',
                    border: 'border-emerald-200 dark:border-emerald-800',
                  },
                  assigned: {
                    bg: 'bg-blue-100',
                    darkBg: 'dark:bg-blue-900/40',
                    text: 'text-blue-700',
                    darkText: 'dark:text-blue-300',
                    dot: '#3B82F6',
                    border: 'border-blue-200 dark:border-blue-800',
                  },
                  in_progress: {
                    bg: 'bg-violet-100',
                    darkBg: 'dark:bg-violet-900/40',
                    text: 'text-violet-700',
                    darkText: 'dark:text-violet-300',
                    dot: '#8B5CF6',
                    border: 'border-violet-200 dark:border-violet-800',
                  },
                  pending_uo_verification: {
                    bg: 'bg-amber-500',
                    darkBg: 'dark:bg-amber-800',
                    text: 'text-white',
                    darkText: 'dark:text-white',
                    dot: '#FFFFFF',
                    border: 'border-amber-400 dark:border-amber-500',
                  },
                  rework_required: {
                    bg: 'bg-red-100',
                    darkBg: 'dark:bg-red-900/40',
                    text: 'text-red-700',
                    darkText: 'dark:text-red-300',
                    dot: '#EF4444',
                    border: 'border-red-200 dark:border-red-800',
                  },
                  resolved: {
                    bg: 'bg-emerald-500',
                    darkBg: 'dark:bg-emerald-800',
                    text: 'text-white',
                    darkText: 'dark:text-white',
                    dot: '#FFFFFF',
                    border: 'border-emerald-400 dark:border-emerald-600',
                  },
                  closed: {
                    bg: 'bg-slate-100',
                    darkBg: 'dark:bg-slate-700/50',
                    text: 'text-slate-600',
                    darkText: 'dark:text-slate-400',
                    dot: '#94A3B8',
                    border: 'border-slate-200 dark:border-slate-600',
                  },
                  rejected: {
                    bg: 'bg-red-100',
                    darkBg: 'dark:bg-red-900/40',
                    text: 'text-red-900',
                    darkText: 'dark:text-red-400',
                    dot: '#991B1B',
                    border: 'border-red-200 dark:border-red-800',
                  },
                };
                const PRIORITY_META: Record<string, any> = {
                  critical: {
                    bg: 'bg-red-100',
                    darkBg: 'dark:bg-red-900/40',
                    text: 'text-red-700',
                    darkText: 'dark:text-red-300',
                    dot: '#DC2626',
                  },
                  high: {
                    bg: 'bg-orange-100',
                    darkBg: 'dark:bg-orange-900/40',
                    text: 'text-orange-700',
                    darkText: 'dark:text-orange-300',
                    dot: '#F97316',
                  },
                  medium: {
                    bg: 'bg-amber-100',
                    darkBg: 'dark:bg-amber-900/40',
                    text: 'text-amber-700',
                    darkText: 'dark:text-amber-300',
                    dot: '#F59E0B',
                  },
                  low: {
                    bg: 'bg-green-100',
                    darkBg: 'dark:bg-green-900/40',
                    text: 'text-green-700',
                    darkText: 'dark:text-green-300',
                    dot: '#10B981',
                  },
                };

                const getStatusIconValue = (val: string) => {
                  switch (val) {
                    case 'pending':
                    case 'pending_uo_verification':
                      return Clock;
                    case 'verified':
                    case 'resolved':
                    case 'closed':
                      return CheckCircle;
                    case 'assigned':
                      return UserCheck;
                    case 'in_progress':
                      return TrendingUp;
                    case 'rework_required':
                      return AlertTriangle;
                    default:
                      return CheckCircle;
                  }
                };

                const sm = STATUS_META[mappedIssue.status] || STATUS_META.pending;
                const pm = PRIORITY_META[mappedIssue.priority] || PRIORITY_META.medium;
                const StatusIconValue = getStatusIconValue(mappedIssue.status);

                return (
                  <View className="mb-4 flex-row flex-wrap items-center gap-2">
                    <View
                      className={`shrink-0 flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5 shadow-sm ${sm.bg} ${sm.darkBg} ${sm.border}`}>
                      <StatusIconValue
                        size={12}
                        strokeWidth={3}
                        color={
                          sm.text === 'text-white' || sm.bg.includes('500') ? '#FFFFFF' : sm.dot
                        }
                      />
                      <Text
                        className={`text-[10px] font-black tracking-widest ${sm.text} ${sm.darkText}`}>
                        {STATUS_LABELS[mappedIssue.status]?.toUpperCase() ??
                          mappedIssue.status.toUpperCase()}
                      </Text>
                    </View>

                    <View
                      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-sm ${pm.bg} ${pm.darkBg} border-slate-200/50 dark:border-white/10 dark:bg-slate-800`}>
                      <View
                        className="h-2 w-2 rounded-full border border-white/50"
                        style={{
                          backgroundColor: pm.dot,
                          shadowColor: pm.dot,
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 1,
                          shadowRadius: 3,
                        }}
                      />
                      <Text
                        className={`text-[10px] font-black tracking-widest ${pm.text} ${pm.darkText}`}>
                        {mappedIssue.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              <Text className="mb-5 text-[26px] font-black leading-[34px] tracking-tight text-slate-900 dark:text-white">
                {mappedIssue.title}
              </Text>

              {/* SLA DEADLINE ENHANCED */}
              {mappedIssue.slaDeadline &&
                (() => {
                  const isOverdue =
                    new Date(mappedIssue.slaDeadline) < new Date() &&
                    !['resolved', 'closed', 'rejected', 'escalated'].includes(mappedIssue.status);

                  if (isOverdue) {
                    return (
                      <LinearGradient
                        colors={['#EF4444', '#9F1239']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className="mb-5 flex-row items-center justify-between rounded-[20px] px-5 py-4 shadow-sm">
                        <View className="flex-row items-center gap-3.5">
                          <View className="rounded-full bg-white/30 p-2.5 shadow-sm">
                            <AlertTriangle color="#FFFFFF" size={16} strokeWidth={3} />
                          </View>
                          <View>
                            <Text className="mb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                              SLA OVERDUE
                            </Text>
                            <Text className="text-[14px] font-black tracking-wide text-white">
                              Was due: {formatTimestamp(mappedIssue.slaDeadline)}
                            </Text>
                          </View>
                        </View>
                        <View className="rounded-full border border-red-200 bg-white px-3 py-1.5 shadow-sm">
                          <Text className="text-[10px] font-black uppercase tracking-widest text-red-700">
                            IMMEDIATE ACTION
                          </Text>
                        </View>
                      </LinearGradient>
                    );
                  }

                  return (
                    <View className="mb-5 flex-row items-center gap-3.5 rounded-[20px] border border-orange-200/60 bg-orange-50/80 px-4 py-4 shadow-sm dark:border-orange-800/50 dark:bg-orange-900/20">
                      <View className="rounded-full bg-orange-100 p-2.5 shadow-sm dark:bg-orange-900/60">
                        <Clock color={isDark ? '#FCA5A5' : '#EA580C'} size={16} strokeWidth={2.5} />
                      </View>
                      <View>
                        <Text className="mb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600/80 dark:text-orange-400">
                          SLA Deadline
                        </Text>
                        <Text className="text-[14px] font-black tracking-wide text-orange-700 dark:text-orange-300">
                          Due: {formatTimestamp(mappedIssue.slaDeadline)}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

              {/* Assigned Officer card */}
              {mappedIssue && (
                // Change the above to this:
                // {mappedIssue.assignedOfficer && (
                // <View
                //   className="mt-3 overflow-hidden rounded-2xl border border-teal-200 dark:border-teal-700/50"
                //   style={styles.officerCard}>
                //   <LinearGradient
                //     colors={isDark ? ['#0d3330', '#0f172a'] : ['#f0fdfa', '#e6fffa']}
                //     start={{ x: 0, y: 0 }}
                //     end={{ x: 1, y: 1 }}
                //     style={styles.officerGradient}>
                //     {/* Top row */}
                //     <View className="flex-row items-start gap-3">
                //       {/* Avatar */}
                //       <View style={styles.officerAvatar}>
                //         {assignedOfficerData?.avatar ? (
                //           <Image
                //             source={{ uri: assignedOfficerData.avatar }}
                //             style={styles.officerAvatarImg}
                //           />
                //         ) : (
                //           <View
                //             className="h-full w-full items-center justify-center"
                //             style={{ backgroundColor: isDark ? '#134E4A' : '#CCFBF1' }}>
                //             <UserCheck
                //               color={isDark ? '#5EEAD4' : '#0F766E'}
                //               size={22}
                //               strokeWidth={2.5}
                //             />
                //           </View>
                //         )}
                //       </View>

                //       <View className="flex-1">
                //         {/* <Text className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                //           Assigned Officer
                //         </Text>
                //         <Text className="mb-1 text-[16px] font-extrabold text-teal-800 dark:text-teal-200">
                //           {mappedIssue.assignedOfficer}
                //         </Text> */}

                //         {/* Stats row */}
                //         {/* {assignedOfficerData && (
                //           <View className="flex-row items-center gap-3">
                //             <View className="flex-row items-center gap-1">
                //               <Star color="#F59E0B" size={12} fill="#F59E0B" strokeWidth={2} />
                //               <Text className="text-[12px] font-bold text-amber-500">
                //                 {assignedOfficerData.rating.toFixed(1)}
                //               </Text>
                //             </View>
                //             <View className="flex-row items-center gap-1">
                //               <TrendingUp
                //                 color={isDark ? '#10B981' : '#059669'}
                //                 size={12}
                //                 strokeWidth={2.5}
                //               />
                //               <Text className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                //                 {assignedOfficerData.successRate}%
                //               </Text>
                //             </View>
                //             <View className="flex-row items-center gap-1">
                //               <Briefcase
                //                 color={isDark ? '#6B7280' : '#9CA3AF'}
                //                 size={11}
                //                 strokeWidth={2}
                //               />
                //               <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                //                 {assignedOfficerData.activeIssues} active
                //               </Text>
                //             </View>
                //           </View>
                //         )} */}
                //       </View>

                //       {(mappedIssue.status === 'Assigned' || mappedIssue.status === 'In Progress') && (
                //         <TouchableOpacity
                //           onPress={() => setShowReassignModal(true)}
                //           activeOpacity={0.75}
                //           className="h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/40">
                //           <RefreshCw color="#D97706" size={17} strokeWidth={2.5} />
                //         </TouchableOpacity>
                //       )}
                //     </View>

                //     {/* Specialisations */}
                //     {assignedOfficerData?.specializations &&
                //       assignedOfficerData.specializations.length > 0 && (
                //         <View className="mt-3 flex-row flex-wrap gap-1.5">
                //           {assignedOfficerData.specializations.map((spec, i) => (
                //             <View
                //               key={i}
                //               className="rounded-full px-2.5 py-1"
                //               style={{
                //                 backgroundColor: isDark ? '#0C2A3F' : '#EFF6FF',
                //                 borderWidth: 1,
                //                 borderColor: isDark ? '#1E3A5F' : '#BFDBFE',
                //               }}>
                //               <Text className="text-[11px] font-bold text-blue-600 dark:text-blue-300">
                //                 {spec}
                //               </Text>
                //             </View>
                //           ))}
                //         </View>
                //       )}

                //     {/* Workload bar */}
                //     {assignedOfficerData && (
                //       <View className="mt-3">
                //         <View className="mb-1.5 flex-row items-center justify-between">
                //           <Text className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                //             Current Workload
                //           </Text>
                //           <Text
                //             className="text-[12px] font-extrabold"
                //             style={{
                //               color:
                //                 assignedOfficerData.workloadPercentage >= 85
                //                   ? '#EF4444'
                //                   : assignedOfficerData.workloadPercentage >= 55
                //                     ? '#F59E0B'
                //                     : '#10B981',
                //             }}>
                //             {assignedOfficerData.workloadPercentage}%
                //           </Text>
                //         </View>
                //         <View
                //           className="h-1.5 overflow-hidden rounded-full"
                //           style={{ backgroundColor: isDark ? '#1E293B' : '#CCFBF1' }}>
                //           <View
                //             style={{
                //               width: `${Math.min(assignedOfficerData.workloadPercentage, 100)}%`,
                //               height: '100%',
                //               backgroundColor:
                //                 assignedOfficerData.workloadPercentage >= 85
                //                   ? '#EF4444'
                //                   : assignedOfficerData.workloadPercentage >= 55
                //                     ? '#F59E0B'
                //                     : '#10B981',
                //               borderRadius: 99,
                //             }}
                //           />
                //         </View>
                //       </View>
                //     )}
                //   </LinearGradient>
                // </View>
                <></>
              )}
            </View>
          </SectionCard>

          {/* CATEGORY & SUBCATEGORY */}
          <SectionCard>
            <SectionHeader
              title="Category Details"
              icon={<Tag color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />}
            />
            <View className="px-5 py-5">
              {/* Primary category chip */}
              <View>
                <View className="mb-3 flex-row items-center gap-2">
                  <View className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-sm" />
                  <Text className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Primary Classification
                  </Text>
                </View>
                <View className="flex-row">
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: isDark ? catColor.darkBg : catColor.bg, borderRadius: 16 },
                    ]}>
                    {(() => {
                      let IconComponent = MoreHorizontal;
                      switch (mappedIssue.category) {
                        case 'road':
                          IconComponent = MapPin;
                          break;
                        case 'electricity':
                          IconComponent = Zap;
                          break;
                        case 'water':
                          IconComponent = Droplets;
                          break;
                        case 'sanitation':
                          IconComponent = Trash2;
                          break;
                        case 'drainage':
                          IconComponent = Recycle;
                          break;
                        case 'solid_waste':
                          IconComponent = Package;
                          break;
                        case 'public_health':
                          IconComponent = HeartPulse;
                          break;
                      }
                      return <IconComponent color={catColor.icon} size={16} strokeWidth={2.5} />;
                    })()}
                    <Text
                      style={{ color: isDark ? catColor.darkText : catColor.text }}
                      className="ml-2 text-[14px] font-black tracking-wide">
                      {CATEGORY_LABEL_MAP[mappedIssue.category] ??
                        mappedIssue.category.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Sub-categories */}
              {mappedIssue.subCategories && mappedIssue.subCategories.length > 0 && (
                <>
                  <View className="my-5 h-[2px] w-full rounded-full bg-slate-50 dark:bg-slate-800/80" />
                  <View>
                    <View className="mb-3 flex-row items-center gap-2">
                      <View className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm" />
                      <Text className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Sub-Categories
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2.5">
                      {mappedIssue.subCategories.map((sub: string, i: number) => (
                        <View
                          key={i}
                          className="flex-row items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-100 px-3.5 py-1.5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80">
                          <Tag color={isDark ? '#94A3B8' : '#64748B'} size={11} strokeWidth={3} />
                          <Text className="text-[11px] font-black tracking-wider text-slate-700 dark:text-slate-200">
                            {sub.toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* Tags */}
              {mappedIssue.tags && mappedIssue.tags.length > 0 && (
                <>
                  <View className="my-5 h-[2px] w-full rounded-full bg-slate-50 dark:bg-slate-800/80" />
                  <View>
                    <View className="mb-3 flex-row items-center gap-2">
                      <View className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-sm" />
                      <Text className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Associated Tags
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {mappedIssue.tags.map((tag: string, i: number) => (
                        <View
                          key={i}
                          className="flex-row items-center gap-1 rounded-md border border-teal-200/50 bg-teal-50/50 px-2.5 py-1 dark:border-teal-700/30 dark:bg-teal-900/20">
                          <Hash color={isDark ? '#5EEAD4' : '#0F766E'} size={11} strokeWidth={3} />
                          <Text className="text-[10px] font-black tracking-widest text-teal-700 dark:text-teal-300">
                            {tag.replace(/^#/, '').toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          </SectionCard>

          {/* REPORTED BY */}
          <SectionCard>
            <SectionHeader
              title="Reporter Profile"
              icon={<User color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />}
            />
            <View className="px-5 py-5">
              <View className="mb-5 flex-row items-center gap-4 rounded-[20px] border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 shadow-sm dark:bg-blue-900/60">
                  <Text className="text-[20px] font-black tracking-tighter text-blue-700 dark:text-blue-300">
                    {mappedIssue.citizenName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </Text>
                </View>
                <View className="flex-1 justify-center">
                  <Text className="mb-1 text-[18px] font-black tracking-tight text-slate-800 dark:text-slate-100">
                    {mappedIssue.citizenName}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Verified Citizen
                    </Text>
                  </View>
                </View>
              </View>

              <View className="gap-3">
                <View className="flex-row items-center gap-3.5 rounded-2xl bg-slate-100 px-4 py-3.5 shadow-sm dark:bg-slate-800">
                  <Mail color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />
                  <Text className="flex-1 text-[13px] font-bold tracking-wide text-slate-700 dark:text-slate-200">
                    {mappedIssue.citizenEmail}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3.5 rounded-2xl bg-slate-100 px-4 py-3.5 shadow-sm dark:bg-slate-800">
                  <Phone color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />
                  <Text className="flex-1 text-[13px] font-bold tracking-wide text-slate-700 dark:text-slate-200">
                    {mappedIssue.citizenPhone}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3.5 rounded-2xl bg-slate-100 px-4 py-3.5 shadow-sm dark:bg-slate-800">
                  <Calendar color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />
                  <Text className="flex-1 text-[13px] font-bold tracking-wide text-slate-700 dark:text-slate-200">
                    {formatDateFull(mappedIssue.dateReported)}
                  </Text>
                </View>
              </View>
            </View>
          </SectionCard>

          {/* LOCATION DETAILS */}
          <SectionCard>
            <SectionHeader
              title="Location Details"
              icon={<MapPin color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />}
            />
            <View className="px-5 py-5">
              <View className="mb-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <View
                  className="absolute bottom-0 left-0 top-0 w-1.5"
                  style={{ backgroundColor: isDark ? '#3B82F6' : '#2563EB' }}
                />
                <View className="p-4 pl-5">
                  <Text className="mb-3 text-[14px] font-black leading-[22px] tracking-tight text-slate-800 dark:text-slate-100">
                    {mappedIssue.address || 'Address Unspecified'}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {mappedIssue.city && (
                      <View className="rounded-[8px] bg-slate-100 px-2.5 py-1 dark:bg-slate-700/50">
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          {mappedIssue.city}
                        </Text>
                      </View>
                    )}
                    {mappedIssue.state && (
                      <View className="rounded-[8px] bg-slate-100 px-2.5 py-1 dark:bg-slate-700/50">
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          {mappedIssue.state}
                        </Text>
                      </View>
                    )}
                    {mappedIssue.postal && (
                      <View className="rounded-[8px] bg-slate-100 px-2.5 py-1 dark:bg-slate-700/50">
                        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          {mappedIssue.postal}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View className="flex-row items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 dark:border-slate-700/50 dark:bg-slate-900/50">
                  <MapPin color={isDark ? '#94A3B8' : '#64748B'} size={12} strokeWidth={3} />
                  <Text className="text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400">
                    {mappedIssue.coordinates.latitude.toFixed(6)},{' '}
                    {mappedIssue.coordinates.longitude.toFixed(6)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={openMaps} activeOpacity={0.85} style={styles.mapsBtn}>
                <LinearGradient
                  colors={['#0D9488', '#0891B2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.mapsBtnGradient}>
                  <Navigation color="#FFFFFF" size={17} strokeWidth={3} />
                  <Text className="flex-1 text-[14px] font-black tracking-wide text-white">
                    Open in Google Maps
                  </Text>
                  <ChevronRight color="rgba(255,255,255,0.7)" size={18} strokeWidth={3} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SectionCard>

          {/* DESCRIPTION */}
          <SectionCard>
            <SectionHeader
              title="Description"
              icon={<FileText color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />}
            />
            <View className="px-5 py-6">
              <View className="overflow-hidden rounded-[24px] rounded-tl-[6px] border border-blue-100 bg-blue-50/40 px-6 py-5 shadow-sm dark:border-blue-900/30 dark:bg-blue-900/10">
                {/* Bold Editorial Left-Border */}
                <View className="absolute bottom-0 left-0 top-0 w-1.5 bg-blue-500" />

                {/* Giant Watermark Background */}
                <View className="absolute -right-6 -top-6 opacity-[0.04] dark:opacity-5">
                  <FileText color={isDark ? '#60A5FA' : '#2563EB'} size={140} strokeWidth={2} />
                </View>

                <Text className="text-[15px] font-medium leading-[28px] tracking-[0.02em] text-slate-700 dark:text-slate-300">
                  {mappedIssue.description || 'No detailed description provided by the citizen.'}
                </Text>
              </View>
            </View>
          </SectionCard>

          {/* PHOTO EVIDENCE */}
          {hasPhotos && (
            <SectionCard>
              <SectionHeader
                title="Photo Evidence"
                icon={<Tag color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />}
              />
              <View className="gap-5 pb-4 pt-4">
                {mappedIssue.images.length > 0 && (
                  <View className="px-5">
                    <Text className="mb-3 text-[12px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Photos by Citizen ({mappedIssue.images.length} photo
                      {mappedIssue.images.length > 1 ? 's' : ''})
                    </Text>
                    <PhotoCarousel photos={mappedIssue.images} label="PHOTOS" isDark={isDark} />
                  </View>
                )}
                {allBeforePhotos.length > 0 && (
                  <View className="px-5">
                    <Text className="mb-3 text-[12px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Before ({allBeforePhotos.length} photo{allBeforePhotos.length > 1 ? 's' : ''})
                    </Text>
                    <PhotoCarousel photos={allBeforePhotos} label="BEFORE" isDark={isDark} />
                  </View>
                )}
                {allAfterPhotos.length > 0 && (
                  <View className="px-5">
                    <View className="mb-5 h-px bg-slate-100 dark:bg-slate-700/60" />
                    <Text className="mb-3 text-[12px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      After ({allAfterPhotos.length} photo{allAfterPhotos.length > 1 ? 's' : ''})
                    </Text>
                    <PhotoCarousel photos={allAfterPhotos} label="AFTER" isDark={isDark} />
                  </View>
                )}
              </View>
            </SectionCard>
          )}

          {/* VIDEO EVIDENCE */}
          {hasVideo && (
            <SectionCard>
              <SectionHeader
                title="Video Evidence"
                icon={<Video color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />}
              />
              <View className="gap-2 px-5 pb-4 pt-3">
                {mappedIssue.videoEvidence!.map((url, i) => (
                  <VideoEvidenceCard key={i} videoUrl={url} isDark={isDark} />
                ))}
              </View>
            </SectionCard>
          )}

          {/* ISSUE UPDATES */}
          <SectionCard>
            <SectionHeader
              title="Issue Updates"
              icon={
                <MessageSquarePlus
                  color={isDark ? '#38BDF8' : '#0284C7'}
                  size={18}
                  strokeWidth={2.5}
                />
              }
            />
            <View className="bg-slate-50/50 px-5 py-5 dark:bg-slate-900/30">
              {issueUpdates?.length === 0 ? (
                <View className="items-center py-10">
                  <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <MessageSquarePlus
                      color={isDark ? '#475569' : '#CBD5E1'}
                      size={20}
                      strokeWidth={2}
                    />
                  </View>
                  <Text className="text-[13px] font-bold text-slate-400 dark:text-slate-500">
                    No updates yet
                  </Text>
                </View>
              ) : (
                (issueUpdates ?? []).map((upd, index: number) => {
                  const dotColor = STATUS_DOT_COLORS[upd.status] ?? '#94A3B8';
                  const isLast = index === (issueUpdates?.length ?? 0) - 1;

                  const scopeMeta =
                    upd.scope === 'citizen'
                      ? {
                          label: 'Citizen only',
                          icon: <Eye color="#0284C7" size={11} strokeWidth={2.5} />,
                          bg: 'bg-sky-50 dark:bg-sky-900/40',
                          text: 'text-sky-700 dark:text-sky-300',
                        }
                      : upd.scope === 'field_and_citizen'
                        ? {
                            label: 'Officer & Citizen',
                            icon: <Users color="#059669" size={11} strokeWidth={2.5} />,
                            bg: 'bg-emerald-50 dark:bg-emerald-900/40',
                            text: 'text-emerald-700 dark:text-emerald-300',
                          }
                        : {
                            label: 'Admin only',
                            icon: <ShieldAlert color="#DC2626" size={11} strokeWidth={2.5} />,
                            bg: 'bg-red-50 dark:bg-red-900/40',
                            text: 'text-red-700 dark:text-red-300',
                          };

                  return (
                    <View key={upd._id} style={styles.timelineRow}>
                      {/* LEFT TIMELINE */}
                      <View className="items-center" style={styles.timelineLeft}>
                        <View
                          style={[
                            styles.timelineDot,
                            {
                              backgroundColor: dotColor,
                              shadowColor: dotColor,
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.4,
                              shadowRadius: 8,
                              elevation: 5,
                              borderWidth: 2,
                              borderColor: isDark ? '#1E293B' : '#FFFFFF',
                            },
                          ]}
                        />
                        {!isLast && (
                          <LinearGradient
                            colors={[dotColor, isDark ? '#334155' : '#E2E8F0']}
                            style={[
                              styles.timelineLine,
                              { flex: 1, width: 2, opacity: 0.5, marginTop: 4, marginBottom: 4 },
                            ]}
                          />
                        )}
                      </View>

                      {/* CARD */}
                      <View
                        className={`mb-5 ml-4 flex-1 overflow-hidden rounded-[24px] border ${
                          isLast
                            ? 'border-cyan-300/60 bg-white shadow-sm dark:border-cyan-800/60 dark:bg-slate-800'
                            : 'border-slate-200/60 bg-white/60 dark:border-slate-700/50 dark:bg-slate-800/60'
                        }`}>
                        {/* HEADER */}
                        <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700/50">
                          <View>
                            <Text className="mb-0.5 text-[14px] font-black text-slate-800 dark:text-slate-100">
                              {STATUS_LABELS[upd.status] || upd.status}
                            </Text>
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              {formatTimestamp(upd.createdAt)}
                            </Text>
                          </View>

                          <View className="items-end gap-1.5">
                            <Text
                              style={{
                                color:
                                  upd.role === 'citizen'
                                    ? '#2563EB'
                                    : upd.role === 'unit_officer'
                                      ? '#0D9488'
                                      : upd.role === 'field_officer'
                                        ? '#D97706'
                                        : '#7C3AED',
                              }}
                              className="text-[11px] font-black uppercase">
                              {upd.role === 'unit_officer'
                                ? 'Unit Officer'
                                : upd.role === 'field_officer'
                                  ? 'Field Officer'
                                  : upd.role.charAt(0).toUpperCase() + upd.role.slice(1)}
                            </Text>
                            <View
                              className={`flex-row items-center gap-1.5 rounded-lg px-2 py-1 ${scopeMeta.bg}`}>
                              {scopeMeta.icon}
                              <Text className={`text-[9px] font-black uppercase ${scopeMeta.text}`}>
                                {scopeMeta.label}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* COMMENT */}
                        {upd.comment && (
                          <View className="px-4 py-3.5">
                            <Text className="text-[14px] font-medium leading-[22px] text-slate-600 dark:text-slate-300">
                              {upd.comment}
                            </Text>
                          </View>
                        )}

                        {/* ATTACHMENTS */}
                        {upd.attachments?.length > 0 && (
                          <View className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-700/40 dark:bg-slate-900/20">
                            <View className="mb-2.5 flex-row items-center gap-1.5">
                              <Paperclip
                                color={isDark ? '#64748B' : '#94A3B8'}
                                size={12}
                                strokeWidth={2.5}
                              />
                              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Attachments ({upd.attachments.length})
                              </Text>
                            </View>

                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={{ gap: 10 }}>
                              {upd.attachments.map((att: any, ai: number) => {
                                const isImage = att.contentType?.startsWith('image');
                                const isVideo = att.contentType?.startsWith('video');
                                const isPDF = att.contentType?.includes('pdf');

                                if (isImage) {
                                  return (
                                    <TouchableOpacity
                                      key={ai}
                                      activeOpacity={0.8}
                                      onPress={() =>
                                        setPreviewAttachment({ ...att, type: 'image' })
                                      }>
                                      <Image
                                        source={{ uri: att.url }}
                                        style={[
                                          styles.attachmentThumb,
                                          {
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: isDark ? '#334155' : '#E2E8F0',
                                          },
                                        ]}
                                        resizeMode="cover"
                                      />
                                    </TouchableOpacity>
                                  );
                                }

                                if (isVideo) {
                                  return (
                                    <TouchableOpacity
                                      key={ai}
                                      activeOpacity={0.8}
                                      onPress={() =>
                                        setPreviewAttachment({ ...att, type: 'video' })
                                      }
                                      style={[
                                        styles.attachmentThumb,
                                        {
                                          backgroundColor: '#0F172A',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: 12,
                                          borderWidth: 1,
                                          borderColor: isDark ? '#334155' : '#E2E8F0',
                                        },
                                      ]}>
                                      <View className="h-8 w-8 items-center justify-center rounded-full bg-white/20">
                                        <Play color="#fff" size={14} fill="#fff" />
                                      </View>
                                    </TouchableOpacity>
                                  );
                                }

                                if (isPDF) {
                                  return (
                                    <TouchableOpacity
                                      key={ai}
                                      activeOpacity={0.8}
                                      onPress={() => setPreviewAttachment({ ...att, type: 'pdf' })}
                                      style={[
                                        styles.attachmentThumb,
                                        {
                                          backgroundColor: '#FEF2F2',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: 12,
                                          borderWidth: 1,
                                          borderColor: isDark ? '#334155' : '#E2E8F0',
                                        },
                                      ]}>
                                      <View className="h-8 w-8 items-center justify-center rounded-full bg-red-100">
                                        <FileText color="#DC2626" size={14} strokeWidth={2.5} />
                                      </View>
                                    </TouchableOpacity>
                                  );
                                }

                                return null;
                              })}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </SectionCard>

          {/* POST UPDATE */}
          <SectionCard>
            <SectionHeader
              title="Post Update"
              icon={<Send color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />}
            />
            <View className="gap-4 px-5 py-4">
              {/* Premium Scope Selector */}
              <View>
                <Text className="mb-2.5 ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Visibility Scope
                </Text>
                <View className="shadow-inner flex-row rounded-full bg-slate-200/60 p-1 dark:bg-slate-800/80">
                  {(
                    [
                      {
                        value: 'citizen' as UpdateScope,
                        label: 'Citizen Only',
                        icon: <Eye size={11} strokeWidth={3} />,
                        gradientOptions: isDark ? ['#0284C7', '#0369A1'] : ['#38BDF8', '#0284C7'],
                      },
                      {
                        value: 'field_and_citizen' as UpdateScope,
                        label: 'FO & Citizen',
                        icon: <Users size={11} strokeWidth={3} />,
                        gradientOptions: isDark ? ['#059669', '#047857'] : ['#34D399', '#059669'],
                      },
                      {
                        value: 'admin_only' as UpdateScope,
                        label: 'Admin Only',
                        icon: <ShieldAlert size={11} strokeWidth={3} />,
                        gradientOptions: isDark ? ['#E11D48', '#BE123C'] : ['#FB7185', '#E11D48'],
                      },
                    ] as const
                  ).map((opt) => {
                    const isActive = updateScope === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setUpdateScope(opt.value)}
                        activeOpacity={0.85}
                        style={{
                          flex: 1,
                          borderRadius: 999,
                          marginHorizontal: 2,
                        }}>
                        {isActive ? (
                          <LinearGradient
                            // @ts-ignore
                            colors={opt.gradientOptions}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                              borderRadius: 999,
                              paddingVertical: 8,
                              paddingHorizontal: 6,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'row',
                              gap: 4,
                            }}>
                            {React.cloneElement(opt.icon as React.ReactElement<{ color: string }>, {
                              color: '#FFFFFF',
                            })}
                            <Text
                              style={{ color: '#fff' }}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              className="text-[10px] font-black">
                              {opt.label}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View
                            style={{
                              borderRadius: 999,
                              paddingVertical: 8,
                              paddingHorizontal: 6,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'row',
                              gap: 4,
                            }}>
                            {React.cloneElement(opt.icon as React.ReactElement<{ color: string }>, {
                              color: isDark ? '#94A3B8' : '#64748B',
                            })}
                            <Text
                              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              className="text-[10px] font-bold">
                              {opt.label}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Comment Canvas */}
              <View
                className={`overflow-hidden rounded-[24px] border bg-white shadow-sm dark:bg-slate-900 ${
                  updateText &&
                  updateText
                    .trim()
                    .split(/\s+/)
                    .filter((word) => word.length > 0).length < 5
                    ? 'border-amber-300 dark:border-amber-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}>
                <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3.5 dark:border-slate-800/80 dark:bg-slate-800/40">
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
                      <Notebook
                        color={isDark ? '#FBBF24' : '#F59E0B'}
                        size={15}
                        strokeWidth={2.5}
                      />
                    </View>
                    <Text className="text-[14px] font-black tracking-tight text-slate-800 dark:text-slate-100">
                      Comment
                    </Text>
                  </View>

                  <View
                    className={`rounded-lg px-2.5 py-1.5 ${
                      updateText
                        .trim()
                        .split(/\s+/)
                        .filter((word) => word.length > 0).length >= 5
                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                        : 'bg-amber-100 dark:bg-amber-900/40'
                    }`}>
                    <Text
                      className={`text-[10px] font-black ${
                        updateText
                          .trim()
                          .split(/\s+/)
                          .filter((word) => word.length > 0).length >= 5
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}>
                      {
                        updateText
                          .trim()
                          .split(/\s+/)
                          .filter((word) => word.length > 0).length
                      }{' '}
                      WORDS{' '}
                      {updateText
                        .trim()
                        .split(/\s+/)
                        .filter((word) => word.length > 0).length < 5 && '(MIN 5)'}
                    </Text>
                  </View>
                </View>

                <View className="max-h-[220px] px-1 py-1">
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1 }}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled">
                    <TextInput
                      className="min-h-[110px] bg-transparent px-4 py-3"
                      placeholder="Record a secure update (minimum 5 words)..."
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={updateText}
                      onChangeText={setUpdateText}
                      multiline
                      scrollEnabled={false}
                      style={{
                        fontSize: 15,
                        lineHeight: 24,
                        textAlignVertical: 'top',
                        color: isDark ? '#F1F5F9' : '#1F2937',
                        fontWeight: '500',
                      }}
                    />
                  </ScrollView>
                </View>
              </View>

              {/* Attachment previews */}
              {updateAttachments.length > 0 && (
                <View>
                  <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Attachments ({updateAttachments.length})
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {updateAttachments.map((att, i) => (
                      <View key={i} style={styles.attachmentPreviewWrap}>
                        {att.type === 'image' ? (
                          <Image
                            source={{ uri: att.uri }}
                            style={styles.attachmentPreview}
                            resizeMode="cover"
                          />
                        ) : att.type === 'video' ? (
                          <View
                            style={[styles.attachmentPreview, styles.attachmentMediaPlaceholder]}>
                            <Video color="#fff" size={22} strokeWidth={2} />
                            <Text style={styles.attachmentMediaLabel} numberOfLines={1}>
                              {att.name}
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.attachmentPreview, styles.attachmentPdfPlaceholder]}>
                            <Text style={styles.attachmentPdfIcon}>PDF</Text>
                            <Text style={styles.attachmentMediaLabel} numberOfLines={1}>
                              {att.name}
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() =>
                            setUpdateAttachments(updateAttachments.filter((_, idx) => idx !== i))
                          }
                          activeOpacity={0.8}
                          style={styles.attachmentRemove}>
                          <X color="#fff" size={10} strokeWidth={3} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action row */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleShowAttachMenu}
                  activeOpacity={0.75}
                  className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-600/50 dark:bg-slate-700">
                  <Paperclip color={isDark ? '#94A3B8' : '#64748B'} size={15} strokeWidth={2.5} />
                  <Text className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                    Attach
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePostUpdate}
                  activeOpacity={0.85}
                  style={[styles.actionBtn, { flex: 1 }]}>
                  <LinearGradient
                    colors={['#0D9488', '#0891B2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionBtnGradient}>
                    <Send color="#FFFFFF" size={16} strokeWidth={2.5} />
                    <Text className="text-[14px] font-bold text-white">Post Update</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </SectionCard>

          {/* SLA OVERDUE ACTION PANEL */}
          {/* {isSLAOverdue && (
          <SectionCard>
            <SLAOverduePanel
              issue={mappedIssue}
              fieldOfficers={mockFieldOfficers}
              onReassign={handleSLAReassign}
              onReject={handleSLAReject}
              onExtend={handleSLAExtend}
              onEscalate={handleSLAEscalate}
            />
          </SectionCard>
        )} */}

          {/* VERIFICATION (Pending) */}
          {mappedIssue.status === 'pending' && (
            <SectionCard>
              <View className="flex-row border-b border-slate-100 dark:border-slate-700">
                <TouchableOpacity
                  onPress={() => setVerificationTab('verify')}
                  activeOpacity={0.75}
                  className={`flex-1 flex-row items-center justify-center gap-2 border-b-[3px] py-4 ${
                    verificationTab === 'verify' ? 'border-emerald-500' : 'border-transparent'
                  }`}>
                  <CheckCircle
                    color={
                      verificationTab === 'verify' ? '#10B981' : isDark ? '#475569' : '#9CA3AF'
                    }
                    size={18}
                    strokeWidth={2.5}
                  />
                  <Text
                    className={`text-[14px] font-bold ${
                      verificationTab === 'verify'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                    Verify
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setVerificationTab('reject')}
                  activeOpacity={0.75}
                  className={`flex-1 flex-row items-center justify-center gap-2 border-b-[3px] py-4 ${
                    verificationTab === 'reject' ? 'border-red-500' : 'border-transparent'
                  }`}>
                  <XCircle
                    color={
                      verificationTab === 'reject' ? '#EF4444' : isDark ? '#475569' : '#9CA3AF'
                    }
                    size={18}
                    strokeWidth={2.5}
                  />
                  <Text
                    className={`text-[14px] font-bold ${
                      verificationTab === 'reject'
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>

              {verificationTab === 'verify' ? (
                <VerificationFlow
                  onVerify={handleVerify}
                  onReject={() => setVerificationTab('reject')}
                />
              ) : (
                <View className="bg-red-50 p-5 dark:bg-red-900/10">
                  <View className="mb-2 flex-row items-center gap-2">
                    <AlertTriangle color="#DC2626" size={18} strokeWidth={2.5} />
                    <Text className="text-[17px] font-extrabold text-slate-800 dark:text-slate-100">
                      Reject Issue
                    </Text>
                  </View>
                  <Text className="mb-5 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                    Provide a reason for rejecting this issue. The citizen will be notified.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowRejectionModal(true)}
                    activeOpacity={0.85}
                    className="flex-row items-center justify-center gap-2 rounded-2xl bg-red-500 py-4 dark:bg-red-600">
                    <XCircle color="#FFFFFF" size={19} strokeWidth={2.5} />
                    <Text className="text-[15px] font-bold text-white">
                      Select Rejection Reason
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </SectionCard>
          )}

          {/* RE-VERIFICATION (Reopened) */}
          {mappedIssue.status === 'Reopened' && (
            // <SectionCard>
            //   {/* Reopened context banner */}
            //   <View className="mx-5 mb-4 mt-5 overflow-hidden rounded-2xl">
            //     <LinearGradient
            //       colors={isDark ? ['#4a1938', '#2d1040'] : ['#fdf2f8', '#fce7f3']}
            //       start={{ x: 0, y: 0 }}
            //       end={{ x: 1, y: 1 }}
            //       style={{
            //         flexDirection: 'row',
            //         alignItems: 'flex-start',
            //         gap: 12,
            //         padding: 14,
            //         borderRadius: 16,
            //         borderWidth: 1,
            //         borderColor: isDark ? '#7c3a60' : '#f9a8d4',
            //       }}>
            //       <View
            //         style={{
            //           width: 36,
            //           height: 36,
            //           borderRadius: 10,
            //           backgroundColor: isDark ? '#7c1d4a' : '#fce7f3',
            //           alignItems: 'center',
            //           justifyContent: 'center',
            //         }}>
            //         <RotateCcw color="#EC4899" size={17} strokeWidth={2.5} />
            //       </View>
            //       <View style={{ flex: 1 }}>
            //         <Text
            //           style={{
            //             fontSize: 12,
            //             fontWeight: '800',
            //             color: '#EC4899',
            //             letterSpacing: 0.8,
            //             marginBottom: 3,
            //           }}>
            //           ISSUE RE-OPENED BY CITIZEN
            //         </Text>
            //         <Text
            //           style={{
            //             fontSize: 13,
            //             color: isDark ? '#f9a8d4' : '#be185d',
            //             lineHeight: 18,
            //             fontWeight: '500',
            //           }}>
            //           The citizen has re-opened this issue. Review the original concern and re-verify
            //           to reassign for resolution.
            //         </Text>
            //       </View>
            //     </LinearGradient>
            //   </View>

            //   {/* Re-verification tabs — same UI as Pending */}
            //   <View className="flex-row border-b border-slate-100 dark:border-slate-700">
            //     <TouchableOpacity
            //       onPress={() => setVerificationTab('verify')}
            //       activeOpacity={0.75}
            //       className={`flex-1 flex-row items-center justify-center gap-2 border-b-[3px] py-4 ${
            //         verificationTab === 'verify' ? 'border-emerald-500' : 'border-transparent'
            //       }`}>
            //       <CheckCircle
            //         color={verificationTab === 'verify' ? '#10B981' : isDark ? '#475569' : '#9CA3AF'}
            //         size={18}
            //         strokeWidth={2.5}
            //       />
            //       <Text
            //         className={`text-[14px] font-bold ${
            //           verificationTab === 'verify'
            //             ? 'text-emerald-600 dark:text-emerald-400'
            //             : 'text-slate-400 dark:text-slate-500'
            //         }`}>
            //         Re-Verify
            //       </Text>
            //     </TouchableOpacity>
            //     <TouchableOpacity
            //       onPress={() => setVerificationTab('reject')}
            //       activeOpacity={0.75}
            //       className={`flex-1 flex-row items-center justify-center gap-2 border-b-[3px] py-4 ${
            //         verificationTab === 'reject' ? 'border-red-500' : 'border-transparent'
            //       }`}>
            //       <XCircle
            //         color={verificationTab === 'reject' ? '#EF4444' : isDark ? '#475569' : '#9CA3AF'}
            //         size={18}
            //         strokeWidth={2.5}
            //       />
            //       <Text
            //         className={`text-[14px] font-bold ${
            //           verificationTab === 'reject'
            //             ? 'text-red-500 dark:text-red-400'
            //             : 'text-slate-400 dark:text-slate-500'
            //         }`}>
            //         Reject
            //       </Text>
            //     </TouchableOpacity>
            //   </View>

            //   {verificationTab === 'verify' ? (
            //     <VerificationFlow
            //       onVerify={handleReverify}
            //       onReject={() => setVerificationTab('reject')}
            //     />
            //   ) : (
            //     <View className="bg-red-50 p-5 dark:bg-red-900/10">
            //       <View className="mb-2 flex-row items-center gap-2">
            //         <AlertTriangle color="#DC2626" size={18} strokeWidth={2.5} />
            //         <Text className="text-[17px] font-extrabold text-slate-800 dark:text-slate-100">
            //           Reject Re-opened Issue
            //         </Text>
            //       </View>
            //       <Text className="mb-5 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
            //         Reject the citizen's re-open request if the concern is invalid or already
            //         resolved. The citizen will be notified.
            //       </Text>
            //       <TouchableOpacity
            //         onPress={() => setShowRejectionModal(true)}
            //         activeOpacity={0.85}
            //         className="flex-row items-center justify-center gap-2 rounded-2xl bg-red-500 py-4 dark:bg-red-600">
            //         <XCircle color="#FFFFFF" size={19} strokeWidth={2.5} />
            //         <Text className="text-[15px] font-bold text-white">Select Rejection Reason</Text>
            //       </TouchableOpacity>
            //     </View>
            //   )}
            // </SectionCard>
            <></>
          )}

          {/* ASSIGN OFFICER (Verified) */}
          {mappedIssue.status === 'verified' && (
            // <SectionCard>
            //   <View className="p-5">
            //     <View className="mb-1 flex-row items-center gap-2">
            //       <UserCheck color="#0D9488" size={18} strokeWidth={2.5} />
            //       <Text className="text-[17px] font-extrabold text-slate-800 dark:text-slate-100">
            //         Assign Field Officer
            //       </Text>
            //     </View>
            //     <Text className="mb-5 text-[13px] text-slate-500 dark:text-slate-400">
            //       Issue is verified. Assign a field officer to begin work.
            //     </Text>
            //     <TouchableOpacity
            //       onPress={() => setShowAssignModal(true)}
            //       activeOpacity={0.85}
            //       style={styles.actionBtn}>
            //       <LinearGradient
            //         colors={['#0D9488', '#0891B2']}
            //         start={{ x: 0, y: 0 }}
            //         end={{ x: 1, y: 0 }}
            //         style={styles.actionBtnGradient}>
            //         <UserCheck color="#FFFFFF" size={19} strokeWidth={2.5} />
            //         <Text className="text-[15px] font-bold text-white">Assign to Officer</Text>
            //         <ChevronRight color="rgba(255,255,255,0.7)" size={18} strokeWidth={2.5} />
            //       </LinearGradient>
            //     </TouchableOpacity>
            //   </View>
            // </SectionCard>
            <>
              <Text>Assigned Officer </Text>
            </>
          )}

          {/* IN PROGRESS */}
          {mappedIssue.status === 'In Progress' && (
            // <SectionCard>
            //   <View className="flex-row items-center gap-4 p-5">
            //     <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/30">
            //       <Clock color="#0EA5E9" size={22} strokeWidth={2.5} />
            //     </View>
            //     <View className="flex-1">
            //       <Text className="mb-1 text-[16px] font-extrabold text-slate-800 dark:text-slate-100">
            //         Work in Progress
            //       </Text>
            //       <Text className="text-[13px] leading-5 text-slate-500 dark:text-slate-400">
            //         Field officer is currently working on this issue
            //       </Text>
            //     </View>
            //   </View>
            // </SectionCard>
            <></>
          )}

          {/* RESOLUTION */}
          {mappedIssue.status === 'Assigned' && mappedIssue.afterPhotos && (
            // <SectionCard>
            //   <View className="p-5">
            //     <Text className="mb-1 text-[17px] font-extrabold text-slate-800 dark:text-slate-100">
            //       Resolution Confirmation
            //     </Text>
            //     <Text className="mb-4 text-[13px] text-slate-500 dark:text-slate-400">
            //       Review work completion and confirm resolution.
            //     </Text>
            //     <TouchableOpacity
            //       onPress={handleMarkResolved}
            //       activeOpacity={0.85}
            //       style={styles.actionBtn}>
            //       <LinearGradient
            //         colors={['#10B981', '#059669']}
            //         start={{ x: 0, y: 0 }}
            //         end={{ x: 1, y: 0 }}
            //         style={styles.actionBtnGradient}>
            //         <CheckCircle color="#FFFFFF" size={19} strokeWidth={2.5} />
            //         <Text className="text-[15px] font-bold text-white">Mark as Resolved</Text>
            //       </LinearGradient>
            //     </TouchableOpacity>
            //     <TouchableOpacity
            //       onPress={handleReopen}
            //       activeOpacity={0.85}
            //       className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-amber-400 bg-amber-50 py-3.5 dark:border-amber-500 dark:bg-amber-900/20">
            //       <RotateCcw color="#D97706" size={17} strokeWidth={2.5} />
            //       <Text className="text-[14px] font-bold text-amber-600 dark:text-amber-400">
            //         Reopen Issue
            //       </Text>
            //     </TouchableOpacity>
            //   </View>
            // </SectionCard>
            <></>
          )}

          {/* PENDING UO VERIFICATION */}
          {mappedIssue.status === 'Pending UO Verification' && (
            // <SectionCard>
            //   <UOVerificationPanel
            //     issue={mappedIssue}
            //     onApprove={handleUOApprove}
            //     onRework={handleUORework}
            //   />
            // </SectionCard>
            <></>
          )}

          {/* RESOLVED */}
          {/* @ts-ignore */}
          {mappedIssue.status === 'Resolved' && (
            // <SectionCard>
            //   <View className="p-5">
            //     <View className="mb-4 flex-row items-center gap-3">
            //       <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            //         <CheckCircle color="#10B981" size={22} strokeWidth={2.5} />
            //       </View>
            //       <View className="flex-1">
            //         <Text className="mb-0.5 text-[16px] font-extrabold text-emerald-700 dark:text-emerald-400">
            //           Issue Resolved
            //         </Text>
            //         <Text className="text-[13px] text-slate-500 dark:text-slate-400">
            //           This issue has been successfully resolved
            //         </Text>
            //       </View>
            //     </View>
            //     <TouchableOpacity
            //       onPress={handleReopen}
            //       activeOpacity={0.85}
            //       className="flex-row items-center justify-center gap-2 rounded-2xl border-2 border-amber-400 bg-amber-50 py-3.5 dark:border-amber-500 dark:bg-amber-900/20">
            //       <RotateCcw color="#D97706" size={17} strokeWidth={2.5} />
            //       <Text className="text-[14px] font-bold text-amber-600 dark:text-amber-400">
            //         Reopen if Needed
            //       </Text>
            //     </TouchableOpacity>
            //   </View>
            // </SectionCard>
            <></>
          )}
        </ScrollView>

        {/* <AssignOfficerModal
        visible={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setPendingReassignMeta(null);
          setAssignModalMode('assign');
        }}
        officers={mockFieldOfficers}
        onAssign={handleAssign}
        mode={assignModalMode}
        currentOfficerName={mappedIssue.assignedOfficer}
      /> */}
        <RejectionModal
          visible={showRejectionModal}
          onClose={() => setShowRejectionModal(false)}
          onReject={handleReject}
        />
        {/* <ReassignmentModal
        visible={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        onConfirm={handleReassign}
        issueTitle={mappedIssue.title}
        currentOfficer={mappedIssue.assignedOfficer || ''}
      /> */}

        {/* Attachment picker bottom sheet */}
        <Modal
          visible={showAttachMenu}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAttachMenu(false)}
          onDismiss={handleAttachMenuDismissed}>
          <TouchableOpacity
            style={styles.attachMenuOverlay}
            activeOpacity={1}
            onPress={() => setShowAttachMenu(false)}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.attachMenuSheet,
                isDark ? styles.attachMenuSheetDark : styles.attachMenuSheetLight,
              ]}>
              {/* Drag handle */}
              <View
                style={[
                  styles.attachMenuHandle,
                  { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
                ]}
              />

              {/* Gradient banner header */}
              <LinearGradient
                colors={isDark ? ['#1E3A5F', '#0F2236'] : ['#EFF6FF', '#E0F2FE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.attachMenuBanner}>
                <View
                  style={[
                    styles.attachMenuBannerIconRing,
                    { borderColor: isDark ? '#3B82F620' : '#BFDBFE' },
                  ]}>
                  <View
                    style={[
                      styles.attachMenuBannerIcon,
                      { backgroundColor: isDark ? '#1D4ED8' : '#2563EB' },
                    ]}>
                    <Paperclip color="#FFFFFF" size={20} strokeWidth={2.5} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.attachMenuBannerTitle,
                      { color: isDark ? '#F1F5F9' : '#0F172A' },
                    ]}>
                    Add Attachment
                  </Text>
                  <Text
                    style={[styles.attachMenuBannerSub, { color: isDark ? '#93C5FD' : '#3B82F6' }]}>
                    Choose how to attach your file
                  </Text>
                </View>
              </LinearGradient>

              {/* Option cards */}
              <View style={styles.attachMenuOptionsGrid}>
                {/* Camera */}
                <TouchableOpacity
                  onPress={handlePickFromCamera}
                  activeOpacity={0.72}
                  style={[
                    styles.attachMenuCard,
                    {
                      backgroundColor: isDark ? '#0F1E38' : '#EFF6FF',
                      borderColor: isDark ? '#2563EB' : '#93C5FD',
                    },
                  ]}>
                  <View
                    style={[
                      styles.attachMenuCardGlow,
                      { backgroundColor: isDark ? '#2563EB18' : '#DBEAFE' },
                    ]}
                  />
                  <View style={[styles.attachMenuCardIcon, { backgroundColor: '#2563EB' }]}>
                    <Camera color="#FFFFFF" size={24} strokeWidth={2.5} />
                  </View>
                  <Text
                    style={[styles.attachMenuCardTitle, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
                    Camera
                  </Text>
                  <View
                    style={[
                      styles.attachMenuCardBadge,
                      { backgroundColor: isDark ? '#1D4ED830' : '#DBEAFE' },
                    ]}>
                    <Text
                      style={[
                        styles.attachMenuCardBadgeText,
                        { color: isDark ? '#60A5FA' : '#2563EB' },
                      ]}>
                      Live shot
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Gallery */}
                <TouchableOpacity
                  onPress={handlePickFromGallery}
                  activeOpacity={0.72}
                  style={[
                    styles.attachMenuCard,
                    {
                      backgroundColor: isDark ? '#0B1F14' : '#F0FDF4',
                      borderColor: isDark ? '#16A34A' : '#86EFAC',
                    },
                  ]}>
                  <View
                    style={[
                      styles.attachMenuCardGlow,
                      { backgroundColor: isDark ? '#16A34A18' : '#DCFCE7' },
                    ]}
                  />
                  <View style={[styles.attachMenuCardIcon, { backgroundColor: '#16A34A' }]}>
                    <ImageIcon color="#FFFFFF" size={24} strokeWidth={2.5} />
                  </View>
                  <Text
                    style={[styles.attachMenuCardTitle, { color: isDark ? '#86EFAC' : '#14532D' }]}>
                    Gallery
                  </Text>
                  <View
                    style={[
                      styles.attachMenuCardBadge,
                      { backgroundColor: isDark ? '#15803D30' : '#DCFCE7' },
                    ]}>
                    <Text
                      style={[
                        styles.attachMenuCardBadgeText,
                        { color: isDark ? '#4ADE80' : '#16A34A' },
                      ]}>
                      Photo / Video
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* PDF */}
                <TouchableOpacity
                  onPress={handlePickDocument}
                  activeOpacity={0.72}
                  style={[
                    styles.attachMenuCard,
                    {
                      backgroundColor: isDark ? '#1F0F07' : '#FFF7ED',
                      borderColor: isDark ? '#EA580C' : '#FDBA74',
                    },
                  ]}>
                  <View
                    style={[
                      styles.attachMenuCardGlow,
                      { backgroundColor: isDark ? '#EA580C18' : '#FFEDD5' },
                    ]}
                  />
                  <View style={[styles.attachMenuCardIcon, { backgroundColor: '#EA580C' }]}>
                    <FileText color="#FFFFFF" size={24} strokeWidth={2.5} />
                  </View>
                  <Text
                    style={[styles.attachMenuCardTitle, { color: isDark ? '#FDBA74' : '#7C2D12' }]}>
                    PDF
                  </Text>
                  <View
                    style={[
                      styles.attachMenuCardBadge,
                      { backgroundColor: isDark ? '#C2410C30' : '#FFEDD5' },
                    ]}>
                    <Text
                      style={[
                        styles.attachMenuCardBadgeText,
                        { color: isDark ? '#FB923C' : '#EA580C' },
                      ]}>
                      Document
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View
                style={[
                  styles.attachMenuDivider,
                  { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                ]}
              />

              {/* Cancel button */}
              <TouchableOpacity
                onPress={() => setShowAttachMenu(false)}
                activeOpacity={0.75}
                style={[
                  styles.attachMenuCancel,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}>
                <X color={isDark ? '#64748B' : '#94A3B8'} size={15} strokeWidth={2.5} />
                <Text
                  style={{
                    color: isDark ? '#94A3B8' : '#64748B',
                    fontSize: 14,
                    fontWeight: '700',
                    letterSpacing: 0.2,
                  }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ATTACHMENT PREVIEW MODAL */}
        <Modal
          visible={!!previewAttachment}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewAttachment(null)}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.95)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={1}
            onPress={() => setPreviewAttachment(null)}>
            <View className="absolute right-6 top-14 z-50">
              <View className="h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-white/20 bg-slate-800/80 backdrop-blur-md">
                <X color="#ffffff" size={32} strokeWidth={2.5} />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={1}
              style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => {}}>
              {previewAttachment?.type === 'image' && (
                <Image
                  source={{ uri: previewAttachment.url }}
                  style={{ width: SCREEN_WIDTH, height: '80%' }}
                  resizeMode="contain"
                />
              )}

              {(previewAttachment?.type === 'video' || previewAttachment?.type === 'pdf') && (
                <View className="items-center px-10">
                  <View
                    className={`h-24 w-24 items-center justify-center rounded-3xl ${previewAttachment.type === 'video' ? 'bg-cyan-500/20' : 'bg-red-500/20'} mb-6`}>
                    {previewAttachment.type === 'video' ? (
                      <Video color="#22D3EE" size={40} strokeWidth={2} />
                    ) : (
                      <FileText color="#EF4444" size={40} strokeWidth={2} />
                    )}
                  </View>
                  <Text className="mb-2 text-center text-[20px] font-black tracking-tight text-white">
                    {previewAttachment.type === 'video' ? 'Video Evidence' : 'Document Evidence'}
                  </Text>
                  <Text className="mb-8 text-center text-[13px] font-medium text-slate-400">
                    Due to native platform requirements, please open this file in your system's
                    default viewer.
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(previewAttachment.url)}
                    className="w-full flex-row items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4">
                    <Text className="text-[15px] font-black text-slate-900">
                      Open External Viewer
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  officerCard: {
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  officerGradient: {
    padding: 16,
  },
  officerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    flexShrink: 0,
  },
  officerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  carouselPhoto: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  carouselArrowLeft: {
    left: 10,
  },
  carouselArrowRight: {
    right: 10,
  },
  carouselLabelContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  videoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  videoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  videoIconWrap: {
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  videoPlayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapsBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  mapsBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: -4,
  },
  updateInput: {
    minHeight: 80,
    maxHeight: 140,
    textAlignVertical: 'top',
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  attachmentThumb: {
    width: 80,
    height: 64,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  attachmentPreviewWrap: {
    position: 'relative',
  },
  attachmentPreview: {
    width: 72,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  attachmentRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentMediaPlaceholder: {
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  attachmentPdfPlaceholder: {
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  attachmentMediaLabel: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  attachmentPdfIcon: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 1,
  },
  attachMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  attachMenuSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingBottom: 44,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 24,
  },
  attachMenuSheetLight: {
    backgroundColor: '#FFFFFF',
  },
  attachMenuSheetDark: {
    backgroundColor: '#0B1120',
  },
  attachMenuHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 18,
  },
  attachMenuBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  attachMenuBannerIconRing: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachMenuBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  attachMenuBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  attachMenuBannerSub: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachMenuHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  attachMenuHeaderIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachMenuTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  attachMenuSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  attachMenuOptionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  attachMenuCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 22,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  attachMenuCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  attachMenuCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  attachMenuCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  attachMenuCardBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  attachMenuCardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  attachMenuCardSub: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  attachMenuDivider: {
    height: 1.5,
    borderRadius: 1,
    marginBottom: 14,
  },
  attachMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  attachMenuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachMenuOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  attachMenuOptionSub: {
    fontSize: 12,
  },
  attachMenuCancel: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
});
