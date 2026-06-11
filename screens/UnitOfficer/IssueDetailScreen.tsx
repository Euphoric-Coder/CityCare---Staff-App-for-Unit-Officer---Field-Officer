import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  InteractionManager,
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
import { BlurView } from 'expo-blur';
import { WebView } from 'react-native-webview';
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
  ShieldCheck,
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
  Compass,
  ExternalLink,
  Maximize2,
  MessageCircle,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import {
  FieldOfficerDetails,
  Issue,
  IssueStatus,
  IssueUpdate,
  MappedIssue,
  UpdateScope,
} from 'lib/types';
import RejectionModal from 'components/UnitOfficer/RejectionModal';
import ReassignmentModal from 'components/UnitOfficer/ReassignmentModal';
import {
  VerificationChecklist,
  RejectionReason,
  SLAOverdueRejectionReason,
  SLAExtensionReason,
  FieldOfficer,
} from 'lib/types';
import AssignOfficerModal from 'components/UnitOfficer/AssignOfficerModal';
import VerificationFlow from 'components/UnitOfficer/VerificationFlow';
import UOVerificationPanel from 'components/UnitOfficer/UOVerificationPanel';
import SLAOverduePanel from 'components/UnitOfficer/SLAOverduePanel';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { mapIssueToUI } from 'lib/issueMapper';
import { useUser } from 'context/UserContext';
import { Id } from 'convex/_generated/dataModel';
import { mockCitizenMessages } from 'lib/mockData';
import CitizenMessagingInterface from 'components/CitizenMessagingInterface';
import { getDuplicateFlagsByIssueId } from 'lib/duplicateDetection';
import DuplicateIssueCard from 'components/UnitOfficer/DuplicateIssueCard';
import AIReviewCard from 'components/UnitOfficer/AIReviewCard';

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
  pending_uo_verification: 'pending_uo_verification',
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

function PhotoCarousel({
  photos,
  label,
  isDark,
  statusHex,
  onPressImage,
}: {
  photos: string[];
  label: string;
  isDark: boolean;
  statusHex: string;
  onPressImage: (uri: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Use a fallback estimated width, but we will rely on exact onLayout calculations for pixel-perfect sizing
  const defaultWidth = Dimensions.get('window').width - 100;
  const [itemWidth, setItemWidth] = useState(defaultWidth);

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, photos.length - 1));
    scrollRef.current?.scrollTo({ x: clamped * itemWidth, animated: true });
    setActiveIndex(clamped);
  };

  return (
    <View
      onLayout={(e) => {
        // Capture exact width provided by the parent container layout engine
        setItemWidth(e.nativeEvent.layout.width);
      }}>
      <View style={{ position: 'relative' }} className="overflow-hidden rounded-[24px]">
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
            setActiveIndex(index);
          }}
          style={{ width: itemWidth }}>
          {photos.map((photo, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.9}
              onPress={() => onPressImage(photo)}
              style={{ width: itemWidth }}>
              <Image
                source={{ uri: photo }}
                style={{ width: '100%', height: 240, borderRadius: 24 }}
                resizeMode="cover"
              />

              {/* Cinematic Premium Gradient */}
              <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.7)']}
                style={StyleSheet.absoluteFillObject}
                className="rounded-[24px]"
              />

              {/* Floating Badge on Image */}
              <View className="absolute left-4 top-4 overflow-hidden rounded-full border border-white/30 bg-black/40 px-3 py-1.5 shadow-sm">
                <Text className="text-[9px] font-black tracking-[0.15em] text-white">
                  SECURED EVIDENCE
                </Text>
              </View>

              {/* Premium Carousel Counter */}
              <View className="absolute bottom-4 right-4 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5">
                <Text className="text-[11px] font-black text-white">
                  {i + 1} / {photos.length}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {photos.length > 1 && (
          <>
            {activeIndex > 0 && (
              <TouchableOpacity
                onPress={() => goTo(activeIndex - 1)}
                activeOpacity={0.85}
                className="absolute left-3 top-[45%] h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 shadow-lg">
                <ChevronLeft color="#FFFFFF" size={20} strokeWidth={3} />
              </TouchableOpacity>
            )}
            {activeIndex < photos.length - 1 && (
              <TouchableOpacity
                onPress={() => goTo(activeIndex + 1)}
                activeOpacity={0.85}
                className="absolute right-3 top-[45%] h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 shadow-lg">
                <ChevronRight color="#FFFFFF" size={20} strokeWidth={3} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* High-Fidelity Dot Indicators */}
      {photos.length > 1 && (
        <View className="mt-4 flex-row justify-center gap-2 pb-2">
          {photos.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
              <View
                style={{
                  width: i === activeIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    i === activeIndex
                      ? statusHex
                      : isDark
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(0,0,0,0.1)',
                }}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
export default function IssueDetailScreen({ route }: IssueDetailScreenProps) {
  const user = useUser();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { issueId } = route.params;

  // Evidence Intelligence States
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [fullScreenVideo, setFullScreenVideo] = useState<string | null>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

  const rawIssues = useQuery(
    api.unitOfficers.getUnitOfficerIssues,
    // @ts-ignore
    user?.id ? { userId: user.id } : 'skip'
  );

  const issueUpdates = useQuery(
    api.issueUpdates.getByIssueId,
    // @ts-ignore
    true ? { issueId: issueId } : 'skip'
  );

  const duplicateFlags = getDuplicateFlagsByIssueId(
    (rawIssues?.filter((i: any) => i.status === 'pending' || i.status === 'reopened') as any) || [],
    (issueId as string) || ''
  );

  // const review = await reviewIssueWithGemini({
  //   unitOfficerDepartment: user?.department,
  //   title: rawIssues?.title,
  //   description: rawIssues?.description,
  //   category: rawIssues?.category,
  //   subcategory: rawIssues?.subcategory?.[0],
  //   location: rawIssues?.address,
  // });

  // console.log(review);

  // @ts-ignore
  const issue = useQuery(api.unitOfficers.getIssueById, { issueId });

  const generateUploadUrl = useMutation(api.issuesMedia.generateUploadUrl);

  // @ts-ignore
  const createIssueUpdate = useMutation(api.issueUpdates.createIssueUpdate);

  // Verify Issue Mutation
  const verifyIssue = useMutation(api.unitOfficers.verifyIssue);

  const duplicateRejectIssues = useMutation(api.unitOfficers.rejectDuplicateIssues);

  // Reject Issue Mutation
  const rejectIssue = useMutation(api.unitOfficers.rejectIssue);

  // Fetches Field Officers assigned to Unit Officer
  // @ts-ignore
  const assignedFO = useQuery(api.unitOfficers.getAssignedFieldOfficers, { userId: user?.id });

  // Assigns Issue to Field Officer
  const assignIssueToFieldOfficer = useMutation(api.unitOfficers.assignIssueToFieldOfficer);

  // Extends SLA Deadline
  const extendSLADeadline = useMutation(api.unitOfficers.extendSLADeadline);

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
  const [updateScope, setUpdateScope] = useState<UpdateScope>('officer_and_citizen');
  const [updateAttachments, setUpdateAttachments] = useState<FileAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const pendingPicker = useRef<'camera' | 'gallery' | 'document' | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<any>(null);
  const [showMessaging, setShowMessaging] = useState(false);

  const [showSLAPanel, setShowSLAPanel] = useState(true);

  const issueMessages = useMemo(
    () => (issue ? mockCitizenMessages.filter((m) => m.issueId === '1') : []),
    [issue]
  );

  // const unreadMsgCount = issueMessages.filter((m) => !m.read && m.fromRole === 'Citizen').length;

  const unreadMsgCountQuery = useQuery(
    api.messages.getUnreadIssueMessagesCount,
    issue?._id && user?.id
      ? { issueId: issue._id as Id<'issues'>, userId: user.id as Id<'users'> }
      : 'skip'
  );

  const unreadMsgCount = unreadMsgCountQuery || 0;

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
        status: issue.status,
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
        status: issue.status,
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

  const handleAssign = async (officerId: string) => {
    if (!assignedFO) return;

    const officer = assignedFO.find((o: any) => o?._id === officerId);
    if (!officer || !mappedIssue || !user) return;

    const isReassign = assignModalMode === 'reassign';
    const previousOfficer = mappedIssue.assignedOfficer;

    try {
      await assignIssueToFieldOfficer({
        issueId: mappedIssue.id,
        fieldOfficerId: officer._id as Id<'fieldOfficers'>,
        assignedBy: user.id as Id<'users'>,

        issueTitle: mappedIssue.title,
        issueCode: mappedIssue.issueCode,

        isReassign,
        previousFieldOfficerName: previousOfficer?.fullName ?? undefined,
        reassignmentReason: pendingReassignMeta?.reason,
        reassignmentComment: pendingReassignMeta?.comment,
      });

      console.log('FO Assignment and Reassignment Details', {
        issueId: mappedIssue.id,
        fieldOfficerId: officer._id as Id<'fieldOfficers'>,
        assignedBy: user.id as Id<'users'>,

        issueTitle: mappedIssue.title,
        issueCode: mappedIssue.issueCode,

        isReassign,
        previousFieldOfficerName: previousOfficer ?? undefined,
        reassignmentReason: pendingReassignMeta?.reason,
        reassignmentComment: pendingReassignMeta?.comment,
      });

      // Optional: UI feedback
      Alert.alert(
        isReassign ? 'Reassigned' : 'Assigned',
        `Issue successfully ${isReassign ? 'reassigned' : 'assigned'} to ${officer.fullName}`
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to assign issue');
    }

    // Reset UI
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
            role: 'citizen',
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

  const handleSLAReassign = (
    issueId: Id<'issues'>,
    fieldOfficerId: Id<'fieldOfficers'>,
    assignedBy: Id<'users'>,
    issueTitle: string,
    issueCode: string,
    isReassign: boolean,
    previousFieldOfficerName: string,
    reassignmentReason: string,
    reassignmentComment: string,
    newSLADeadline: number
  ) => {
    InteractionManager.runAfterInteractions(async () => {
      try {
        console.log({
          issueId: issueId,
          fieldOfficerId: fieldOfficerId,
          assignedBy: assignedBy,
          issueTitle: issueTitle,
          issueCode: issueCode,
          isReassign: isReassign,
          previousFieldOfficerName: previousFieldOfficerName,
          reassignmentReason: reassignmentReason,
          reassignmentComment: reassignmentComment,
          newSLADeadline: newSLADeadline,
        });
        await assignIssueToFieldOfficer({
          issueId: issueId,
          fieldOfficerId: fieldOfficerId,
          assignedBy: assignedBy,
          issueTitle: issueTitle,
          issueCode: issueCode,
          isReassign: isReassign,
          previousFieldOfficerName: previousFieldOfficerName,
          reassignmentReason: reassignmentReason,
          reassignmentComment: reassignmentComment,
          newSLADeadline: newSLADeadline,
          isSlaReassign: true,
        });

        setTimeout(() => {
          Alert.alert(
            'Issue Reassigned',
            'Issue has been reassigned to a new officer with new SLA deadline.'
          );
        }, 150);
      } catch (error: any) {
        console.error('SLA Reassignment Error:', error);
        setTimeout(() => {
          Alert.alert(
            'Reassignment Failed',
            error?.message || 'Something went wrong. Please try again.'
          );
        }, 150);
      }
    });
  };

  const handleSLAReject = (
    issueId: Id<'issues'>,
    issueCode: string,
    reason: string,
    comment: string,
    UOName: string,
    status: string,
    rejectedBy: Id<'users'>,
    issueName: string,
    reporterId: Id<'users'>
  ) => {
    console.log({
      issueId: issueId,
      issueCode: issueCode,
      reason: reason,
      comment: comment,
      UOName: UOName,
      status: status,
      rejectedBy: rejectedBy,
      issueName: issueName,
      reporterId: reporterId,
    });
    InteractionManager.runAfterInteractions(async () => {
      try {
        await rejectIssue({
          issueId,
          issueCode,
          reason,
          comment,
          UOName,
          status,
          rejectedBy,
          issueName,
          reporterId,
          isSlaRejection: true,
        });

        setTimeout(() => {
          Alert.alert('Issue Rejected', 'Issue has been rejected. Citizen has been notified.');
        }, 150);
      } catch (error: any) {
        console.error('SLA Rejection Error:', error);
        setTimeout(() => {
          Alert.alert(
            'Rejection Failed',
            error?.message || 'Something went wrong. Please try again.'
          );
        }, 150);
      }
    });
  };

  const handleSLAExtend = (
    issueId: string,
    issueCode: string,
    issueName: string,

    extendedBy: Id<'users'>,
    extendedByName: string,

    reporterId: Id<'users'>,

    assignedFieldOfficerUserId: Id<'users'>,

    assignedFieldOfficerName: string,

    reason: string,
    comment: string,
    newSlaDeadline: number
  ) => {
    // Defer the mutation to run AFTER React finishes processing the current
    // interaction. This prevents the Convex reactive re-render from firing
    // mid-render-cycle, which unmounts the SLAOverduePanel and causes
    // useNavigation() to lose its context.
    InteractionManager.runAfterInteractions(async () => {
      try {
        await extendSLADeadline({
          issueId: issueId as Id<'issues'>,
          issueCode,
          issueName,

          extendedBy,
          extendedByName,

          reporterId,

          assignedFieldOfficerUserId: assignedFieldOfficerUserId || undefined,
          assignedFieldOfficerName: assignedFieldOfficerName || undefined,

          reason,
          comment,
          newSlaDeadline,
        });

        setTimeout(() => {
          Alert.alert('SLA Extended', 'New SLA deadline has been set. Citizen has been notified.');
        }, 150);
      } catch (error: any) {
        console.error('SLA Extension Error:', error);
        setTimeout(() => {
          Alert.alert(
            'Extension Failed',
            error?.message || 'Something went wrong. Please try again.'
          );
        }, 150);
      }
    });
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
      setUpdateScope('officer_and_citizen');

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

  const mappedIssue = mapIssueToUI(issue);

  const nowTime = Date.now();

  const slaTime =
    mappedIssue?.slaDeadline !== undefined && mappedIssue?.slaDeadline !== null
      ? new Date(mappedIssue?.slaDeadline).getTime()
      : null;

  const completedStatuses = ['resolved', 'closed', 'rejected', 'withdrawn', 'escalated'];

  const hasValidSla = slaTime !== null && !Number.isNaN(slaTime);

  const isSlaOverdueCard =
    hasValidSla &&
    slaTime < nowTime &&
    !completedStatuses.includes(mappedIssue?.status?.toLowerCase());

  const isSLAOverdue = !!(
    hasValidSla &&
    slaTime < nowTime &&
    !completedStatuses.includes(mappedIssue?.status?.toLowerCase())
  );

  useEffect(() => {
    if (isSLAOverdue) {
      setShowSLAPanel(true);
    }
  }, [isSLAOverdue]);

  if (!mappedIssue) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="mt-3 text-sm font-medium text-slate-400">Loading issue...</Text>
      </View>
    );
  }

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
    // navigation.goBack();
    return null;
  }

  const assignedOfficerData = mappedIssue.assignedOfficer;

  const statusDotColor = STATUS_DOT_COLORS[mappedIssue.status] ?? '#94A3B8';
  const catColor = CATEGORY_COLORS[mappedIssue.category] ?? CATEGORY_COLORS['Pothole'];

  const allBeforePhotos = mappedIssue.beforePhotos ?? [];
  const allAfterPhotos = mappedIssue.afterPhotos ?? [];
  const hasPhotos =
    allBeforePhotos.length > 0 || allAfterPhotos.length > 0 || mappedIssue.images.length > 0;
  const hasVideo = (mappedIssue.videoEvidence?.length ?? 0) > 0;

  const getStatusStyle = (
    statusValue: string
  ): {
    hex: string;
    bg: string;
    border: string;
    borderClass: string;
    glow: string;
    gradientDark: readonly [string, string, ...string[]];
    gradientLight: readonly [string, string, ...string[]];
  } => {
    switch (statusValue) {
      case 'pending':
        return {
          hex: '#F59E0B',
          bg: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
          border: isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.3)',
          borderClass: 'border-amber-500/40',
          glow: 'rgba(245, 158, 11, 0.6)',
          gradientDark: ['#78350F', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#FFFBEB', '#FEF3C7'],
        };
      case 'verified':
        return {
          hex: '#06B6D4',
          bg: isDark ? 'rgba(6, 182, 212, 0.12)' : '#ECFEFF',
          border: isDark ? 'rgba(6, 182, 212, 0.4)' : 'rgba(6, 182, 212, 0.3)',
          borderClass: 'border-cyan-500/40',
          glow: 'rgba(6, 182, 212, 0.6)',
          gradientDark: ['#164E63', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#ECFEFF', '#CFFAFE'],
        };
      case 'assigned':
        return {
          hex: '#6366F1',
          bg: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
          border: isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)',
          borderClass: 'border-indigo-500/40',
          glow: 'rgba(99, 102, 241, 0.6)',
          gradientDark: ['#312E81', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#EEF2FF', '#E0E7FF'],
        };
      case 'in_progress':
        return {
          hex: '#8B5CF6',
          bg: isDark ? 'rgba(139, 92, 246, 0.12)' : '#F5F3FF',
          border: isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.3)',
          borderClass: 'border-violet-500/40',
          glow: 'rgba(139, 92, 246, 0.6)',
          gradientDark: ['#4C1D95', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#F5F3FF', '#EDE9FE'],
        };
      case 'pending_uo_verification':
        return {
          hex: '#F97316',
          bg: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
          border: isDark ? 'rgba(249, 115, 22, 0.5)' : 'rgba(249, 115, 22, 0.4)',
          borderClass: 'border-orange-500/50',
          glow: 'rgba(249, 115, 22, 0.7)',
          gradientDark: ['#7C2D12', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#FFF7ED', '#FFEDD5'],
        };
      case 'rework_required':
        return {
          hex: '#EC4899',
          bg: isDark ? 'rgba(236, 72, 153, 0.12)' : '#FDF2F8',
          border: isDark ? 'rgba(236, 72, 153, 0.4)' : 'rgba(236, 72, 153, 0.3)',
          borderClass: 'border-pink-500/40',
          glow: 'rgba(236, 72, 153, 0.6)',
          gradientDark: ['#831843', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#FDF2F8', '#FCE7F3'],
        };
      case 'reopened':
        return {
          hex: '#F97316',
          bg: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
          border: isDark ? 'rgba(249, 115, 22, 0.5)' : 'rgba(249, 115, 22, 0.4)',
          borderClass: 'border-orange-500/50',
          glow: 'rgba(249, 115, 22, 0.7)',
          gradientDark: ['#7C2D12', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#FFF7ED', '#FFEDD5'],
        };
      case 'escalated':
        return {
          hex: '#EF4444',
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
          border: isDark ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.4)',
          borderClass: 'border-red-500/50',
          glow: 'rgba(239, 68, 68, 0.7)',
          gradientDark: ['#7F1D1D', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#FEF2F2', '#FEE2E2'],
        };
      case 'resolved':
        return {
          hex: '#10B981',
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4',
          border: isDark ? 'rgba(16, 185, 129, 0.5)' : 'rgba(16, 185, 129, 0.4)',
          borderClass: 'border-emerald-500/50',
          glow: 'rgba(16, 185, 129, 0.7)',
          gradientDark: ['#064E3B', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#ECFDF5', '#D1FAE5'],
        };
      case 'rejected':
        return {
          hex: '#EF4444',
          bg: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
          border: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)',
          borderClass: 'border-red-500/40',
          glow: 'rgba(239, 68, 68, 0.6)',
          gradientDark: ['#7F1D1D', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#FEF2F2', '#FEE2E2'],
        };
      case 'withdrawn':
        return {
          hex: '#64748B',
          bg: isDark ? 'rgba(100, 116, 139, 0.12)' : '#F8FAFC',
          border: isDark ? 'rgba(100, 116, 139, 0.4)' : 'rgba(100, 116, 139, 0.3)',
          borderClass: 'border-slate-500/40',
          glow: 'rgba(100, 116, 139, 0.6)',
          gradientDark: ['#0F172A', '#020617', '#000000'],
          gradientLight: ['#FFFFFF', '#F8FAFC', '#F1F5F9'],
        };
      case 'closed':
        return {
          hex: '#64748B',
          bg: isDark ? 'rgba(100, 116, 139, 0.08)' : '#F8FAFC',
          border: isDark ? 'rgba(100, 116, 139, 0.3)' : 'rgba(100, 116, 139, 0.2)',
          borderClass: 'border-slate-500/30',
          glow: 'rgba(100, 116, 139, 0.4)',
          gradientDark: ['#0F172A', '#020617', '#000000'],
          gradientLight: ['#FFFFFF', '#F8FAFC', '#F1F5F9'],
        };
      default:
        return {
          hex: '#3B82F6',
          bg: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
          border: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)',
          borderClass: 'border-blue-500/40',
          glow: 'rgba(59, 130, 246, 0.6)',
          gradientDark: ['#1E3A8A', '#0F172A', '#020617'],
          gradientLight: ['#FFFFFF', '#EFF6FF', '#DBEAFE'],
        };
    }
  };

  const statusStyle = getStatusStyle(mappedIssue.status);

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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

            <TouchableOpacity
              onPress={() => setShowMessaging(true)}
              className="h-[46px] w-[46px] items-center justify-center rounded-[18px] border border-white/30 bg-white/20 shadow-md dark:border-white/20 dark:bg-white/10"
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MessageCircle color="#FFFFFF" size={22} strokeWidth={2.5} />
              {unreadMsgCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#EF4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.8)',
                  }}>
                  <Text
                    style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800', lineHeight: 12 }}>
                    {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* HERO TITLE CARD (Breathtaking Modernization) */}
          {(() => {
            const PRIORITY_META: Record<string, any> = {
              critical: { bg: 'bg-red-100', text: 'text-red-700', dot: '#DC2626' },
              high: { bg: 'bg-orange-100', text: 'text-orange-700', dot: '#F97316' },
              medium: { bg: 'bg-amber-100', text: 'text-amber-700', dot: '#F59E0B' },
              low: { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981' },
            };
            const pm = PRIORITY_META[mappedIssue.priority] || PRIORITY_META.medium;
            const StatusIconValue =
              mappedIssue.status === 'in_progress'
                ? TrendingUp
                : mappedIssue.status === 'pending_uo_verification'
                  ? Clock
                  : CheckCircle;

            return (
              <View
                style={{
                  shadowColor: statusStyle.hex,
                  shadowOffset: { width: 0, height: 25 },
                  shadowOpacity: isDark ? 0.4 : 0.15,
                  shadowRadius: 40,
                  elevation: 20,
                  marginBottom: 32,
                }}>
                <View
                  style={{
                    backgroundColor: isDark ? '#020617' : '#FFFFFF',
                    borderColor: statusStyle.border,
                    borderWidth: 2.5,
                    borderRadius: 40,
                    overflow: 'hidden',
                  }}>
                  {/* Status Ambient Tint */}
                  <View
                    style={{ backgroundColor: statusStyle.bg, ...StyleSheet.absoluteFillObject }}
                  />

                  {/* Priority Side Strip */}
                  <View
                    style={{
                      backgroundColor: pm.dot,
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 10,
                      shadowColor: pm.dot,
                      shadowOpacity: 1,
                      shadowRadius: 15,
                    }}
                  />

                  <View className="py-8 pl-10 pr-7">
                    {/* Header Row */}
                    <View className="mb-6 flex-row items-center gap-3">
                      <View
                        className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${statusStyle.borderClass} bg-white/60 shadow-sm dark:bg-slate-900/60`}>
                        <StatusIconValue size={12} strokeWidth={3} color={statusStyle.hex} />
                        <Text
                          style={{ color: statusStyle.hex }}
                          className="text-[10px] font-black uppercase tracking-widest">
                          {STATUS_LABELS[mappedIssue.status]?.toUpperCase() ||
                            mappedIssue.status.toUpperCase()}
                        </Text>
                      </View>

                      <View
                        className={`flex-row items-center gap-2 rounded-full border border-slate-200/50 bg-white/60 px-4 py-2 shadow-sm dark:border-white/10 dark:bg-slate-900/60`}>
                        <View
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: pm.dot }}
                        />
                        <Text
                          className={`text-[10px] font-black uppercase tracking-widest ${pm.text} dark:text-white`}>
                          {mappedIssue.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text className="mb-6 text-[28px] font-black leading-[38px] tracking-tight text-slate-900 dark:text-white">
                      {mappedIssue.title}
                    </Text>

                    {/* SLA Section */}
                    {hasValidSla && (
                      <View
                        className="mb-6"
                        style={{
                          shadowColor: isSlaOverdueCard ? '#DC2626' : '#EA580C',
                          shadowOffset: { width: 0, height: 10 },
                          shadowOpacity: 0.35,
                          shadowRadius: 20,
                          elevation: 10,
                        }}>
                        <View
                          className={`relative overflow-hidden rounded-[24px] border-[1.5px] ${
                            isSlaOverdueCard
                              ? 'border-red-400/50'
                              : 'border-orange-200/60 dark:border-orange-500/20'
                          }`}>
                          {/* Background */}
                          {isSlaOverdueCard ? (
                            <>
                              <LinearGradient
                                colors={['#EF4444', '#B91C1C']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                              />

                              <LinearGradient
                                colors={['rgba(255,255,255,0.25)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: 50,
                                }}
                              />
                            </>
                          ) : (
                            <View className="absolute inset-0 bg-orange-50/80 dark:bg-orange-900/10" />
                          )}

                          {/* Content */}
                          <View className="flex-row items-center gap-4 px-5 py-5">
                            <View
                              className={`h-[50px] w-[50px] items-center justify-center rounded-[16px] ${
                                isSlaOverdueCard
                                  ? 'bg-red-950/30'
                                  : 'bg-orange-100/80 dark:bg-orange-500/20'
                              }`}>
                              {isSlaOverdueCard && (
                                <View className="absolute inset-0 rounded-[16px] border-[1.5px] border-white/20" />
                              )}

                              {isSlaOverdueCard ? (
                                <AlertTriangle color="#FFFFFF" size={24} strokeWidth={2.5} />
                              ) : (
                                <Clock
                                  color={isDark ? '#FB923C' : '#EA580C'}
                                  size={24}
                                  strokeWidth={2.5}
                                />
                              )}
                            </View>

                            <View className="flex-1 justify-center pr-2">
                              <Text
                                className={`text-[11px] font-black uppercase tracking-[0.15em] ${
                                  isSlaOverdueCard
                                    ? 'text-red-100'
                                    : 'text-orange-600 dark:text-orange-500'
                                }`}>
                                {isSlaOverdueCard ? 'SLA Protocol Breached' : 'ACTIVE SLA DEADLINE'}
                              </Text>

                              <Text
                                className={`text-[16px] font-black leading-tight tracking-tight ${
                                  isSlaOverdueCard
                                    ? 'text-white'
                                    : 'text-orange-800 dark:text-orange-300'
                                }`}
                                numberOfLines={1}
                                adjustsFontSizeToFit>
                                {isSlaOverdueCard
                                  ? `Missed: ${formatTimestamp(mappedIssue?.slaDeadline)}`
                                  : `Due: ${formatTimestamp(mappedIssue?.slaDeadline)}`}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Assigned Officer card (Preserved) */}
                    {mappedIssue.assignedOfficer && (
                      <View
                        className="mt-3 overflow-hidden rounded-2xl border border-teal-200 dark:border-teal-700/50"
                        style={styles.officerCard}>
                        <LinearGradient
                          colors={isDark ? ['#0d3330', '#0f172a'] : ['#f0fdfa', '#e6fffa']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.officerGradient}>
                          {/* Top row */}
                          <View className="flex-row items-start gap-3">
                            {/* Avatar */}
                            <View style={styles.officerAvatar}>
                              {assignedOfficerData?.avatar ? (
                                <Image
                                  source={{ uri: assignedOfficerData.avatar }}
                                  style={styles.officerAvatarImg}
                                />
                              ) : (
                                <View
                                  className="h-full w-full items-center justify-center"
                                  style={{ backgroundColor: isDark ? '#134E4A' : '#CCFBF1' }}>
                                  <UserCheck
                                    color={isDark ? '#5EEAD4' : '#0F766E'}
                                    size={22}
                                    strokeWidth={2.5}
                                  />
                                </View>
                              )}
                            </View>

                            <View className="flex-1">
                              <Text className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                                Assigned Officer
                              </Text>
                              <Text className="mb-1 text-[16px] font-extrabold text-teal-800 dark:text-teal-200">
                                {assignedOfficerData?.fullName}
                              </Text>

                              {/* Stats row */}
                              {assignedOfficerData && (
                                <View className="flex-row items-center gap-3">
                                  <View className="flex-row items-center gap-1">
                                    <Star
                                      color="#F59E0B"
                                      size={12}
                                      fill="#F59E0B"
                                      strokeWidth={2}
                                    />
                                    <Text className="text-[12px] font-bold text-amber-500">
                                      {assignedOfficerData.rating.toFixed(1)}
                                    </Text>
                                  </View>
                                  <View className="flex-row items-center gap-1">
                                    <TrendingUp
                                      color={isDark ? '#10B981' : '#059669'}
                                      size={12}
                                      strokeWidth={2.5}
                                    />
                                    <Text className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      {assignedOfficerData?.efficiencyScore}%
                                    </Text>
                                  </View>
                                  <View className="flex-row items-center gap-1">
                                    <Briefcase
                                      color={isDark ? '#6B7280' : '#9CA3AF'}
                                      size={11}
                                      strokeWidth={2}
                                    />
                                    <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                      {assignedOfficerData?.currentActiveIssues} active
                                    </Text>
                                  </View>
                                </View>
                              )}
                            </View>

                            {(mappedIssue.status === 'assigned' ||
                              mappedIssue.status === 'in_progress') && (
                              <TouchableOpacity
                                onPress={() => setShowReassignModal(true)}
                                activeOpacity={0.75}
                                className="h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/40">
                                <RefreshCw color="#D97706" size={17} strokeWidth={2.5} />
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Specialisations */}
                          {assignedOfficerData?.specialisations &&
                            assignedOfficerData.specialisations.length > 0 && (
                              <View className="mt-3 flex-row flex-wrap gap-1.5">
                                {/* @ts-ignore */}
                                {assignedOfficerData.specialisations.map((spec, i) => (
                                  <View
                                    key={i}
                                    className="rounded-full px-2.5 py-1"
                                    style={{
                                      backgroundColor: isDark ? '#0C2A3F' : '#EFF6FF',
                                      borderWidth: 1,
                                      borderColor: isDark ? '#1E3A5F' : '#BFDBFE',
                                    }}>
                                    <Text className="text-[11px] font-bold text-blue-600 dark:text-blue-300">
                                      {spec}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}

                          {/* Workload bar */}
                          {assignedOfficerData && (
                            <View className="mt-3">
                              <View className="mb-1.5 flex-row items-center justify-between">
                                <Text className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                                  Current Workload
                                </Text>
                                <Text
                                  className="text-[12px] font-extrabold"
                                  style={{
                                    color:
                                      assignedOfficerData.workloadPercentage >= 85
                                        ? '#EF4444'
                                        : assignedOfficerData.workloadPercentage >= 55
                                          ? '#F59E0B'
                                          : '#10B981',
                                  }}>
                                  {assignedOfficerData.workloadPercentage.toFixed(2)}%
                                </Text>
                              </View>
                              <View
                                className="h-1.5 overflow-hidden rounded-full"
                                style={{ backgroundColor: isDark ? '#1E293B' : '#CCFBF1' }}>
                                <View
                                  style={{
                                    width: `${Math.min(assignedOfficerData.workloadPercentage, 100)}%`,
                                    height: '100%',
                                    backgroundColor:
                                      assignedOfficerData.workloadPercentage >= 85
                                        ? '#EF4444'
                                        : assignedOfficerData.workloadPercentage >= 55
                                          ? '#F59E0B'
                                          : '#10B981',
                                    borderRadius: 99,
                                  }}
                                />
                              </View>
                            </View>
                          )}
                        </LinearGradient>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })()}

          {/* AI ISSUE REVIEW */}
          {mappedIssue &&
            !['closed', 'resolved', 'rejected', 'pending_uo_verification'].includes(
              mappedIssue.status
            ) && (
              <AIReviewCard
                issue={mappedIssue}
                unitOfficerDepartment={(user as any).department || 'road'}
              />
            )}

          <DuplicateIssueCard
            duplicateFlags={duplicateFlags}
            isDark={isDark}
            statusHex={statusStyle.hex}
            onMerge={(keepIssueId, deleteIssueIds, groupId) => {
              console.log('Duplicate merge requested:', {
                keepIssueId,
                deleteIssueIds,
                groupId,
              });

              Alert.alert(
                'Merge Requested',
                'Duplicate merge action has been captured. Backend merge mutation can be connected next.'
              );
            }}
            onReject={async (issueIds, groupId) => {
              if (!user?.id || !user?.name) {
                throw new Error('Missing Unit Officer details.');
              }

              await duplicateRejectIssues({
                issueIds: issueIds as Id<'issues'>[],
                UOName: user.name,
                rejectedBy: user.id as Id<'users'>,
                reason: 'Duplicate issue detected',
                comment:
                  'This issue has been rejected because it appears to be a duplicate of another active issue reported by the same citizen.',
              });
            }}
          />

          {/* CATEGORY CARD*/}
          <View
            style={{
              shadowColor: statusStyle.hex,
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: isDark ? 0.35 : 0.1,
              shadowRadius: 30,
              elevation: 15,
              marginBottom: 32,
            }}>
            <LinearGradient
              colors={isDark ? statusStyle.gradientDark : statusStyle.gradientLight}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderColor: statusStyle.border,
                borderWidth: 1.5,
                borderRadius: 40,
                overflow: 'hidden',
                position: 'relative',
              }}>
              {/* Cinematic Watermark Layer */}
              <View style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.04 }}>
                <Layers size={220} color={statusStyle.hex} strokeWidth={1} />
              </View>

              <View className="py-9 pe-7 ps-7">
                {/* Header Section */}
                <View className="mb-8 flex-row items-center gap-4">
                  <LinearGradient
                    colors={[statusStyle.hex, statusStyle.hex]}
                    style={{
                      height: 50,
                      width: 50,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Layers size={24} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                      Classification
                    </Text>
                    <Text
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500"
                      style={{ color: statusStyle.hex }}>
                      HIERARCHICAL MATRIX
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 24 }}>
                  {/* ELITE CATEGORY DISPLAY */}
                  <View>
                    <Text className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      PRIMARY DOMAIN
                    </Text>
                    <View
                      style={{
                        backgroundColor: statusStyle.bg,
                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderWidth: 1,
                        borderRadius: 24,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 15,
                      }}>
                      <View
                        style={{ backgroundColor: statusStyle.hex }}
                        className="h-11 w-11 items-center justify-center rounded-xl shadow-md">
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
                          return <IconComponent color="#FFFFFF" size={20} strokeWidth={2.5} />;
                        })()}
                      </View>
                      <Text className="text-[18px] font-black tracking-tight text-slate-900 dark:text-white">
                        {CATEGORY_LABEL_MAP[mappedIssue.category] ??
                          mappedIssue.category.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* BREATHTAKING SUB-CATEGORIES */}
                  {mappedIssue.subCategories && mappedIssue.subCategories.length > 0 && (
                    <View>
                      <Text className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        SPECIALIZED SUB-DOMAINS
                      </Text>
                      <View className="flex-row flex-wrap gap-2.5">
                        {mappedIssue.subCategories.map((sub: string, i: number) => (
                          <View
                            key={i}
                            style={{
                              backgroundColor: isDark
                                ? 'rgba(255,255,255,0.05)'
                                : 'rgba(0,0,0,0.03)',
                              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                              borderWidth: 1,
                              borderRadius: 14,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                            }}>
                            <Tag size={12} color={statusStyle.hex} strokeWidth={2.5} />
                            <Text className="text-[11px] font-black tracking-wide text-slate-700 dark:text-slate-200">
                              {sub.toUpperCase()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* SOPHISTICATED TAGS */}
                  {mappedIssue.tags && mappedIssue.tags.length > 0 && (
                    <View>
                      <Text className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        INTEL_TAGS
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {mappedIssue.tags.map((tag: string, i: number) => (
                          <View
                            key={i}
                            className="flex-row items-center gap-1.5 rounded-lg border border-slate-200/50 bg-slate-50/50 px-3 py-2 dark:border-white/5 dark:bg-black/20">
                            <Hash color={statusStyle.hex} size={10} strokeWidth={3} />
                            <Text className="text-[10px] font-black tracking-widest text-slate-600 dark:text-slate-300">
                              {tag.replace(/^#/, '').toUpperCase()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* City FOOTER */}
                  <View
                    style={{
                      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      borderTopWidth: 1,
                    }}
                    className="mt-2 flex-row items-center justify-between pt-6">
                    <View className="flex-row items-center gap-2.5">
                      <View
                        style={{ backgroundColor: statusStyle.bg }}
                        className="h-8 w-8 items-center justify-center rounded-lg">
                        <MapPin size={14} color={statusStyle.hex} strokeWidth={2.5} />
                      </View>
                      <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        ASSIGNED REGION
                      </Text>
                    </View>
                    <Text
                      style={{ color: statusStyle.hex }}
                      className="text-[14px] font-black tracking-tight">
                      {mappedIssue.city || 'KOLKATA'}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* REPORTED BY */}
          <View
            style={{
              shadowColor: statusStyle.hex,
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: isDark ? 0.35 : 0.1,
              shadowRadius: 30,
              elevation: 15,
              marginBottom: 32,
            }}>
            <LinearGradient
              colors={isDark ? statusStyle.gradientDark : statusStyle.gradientLight}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderColor: statusStyle.border,
                borderWidth: 1.5,
                borderRadius: 40,
                overflow: 'hidden',
                position: 'relative',
              }}>
              {/* Cinematic Watermark Layer */}
              <View style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.04 }}>
                <UserCheck size={220} color={statusStyle.hex} strokeWidth={1} />
              </View>

              <View className="py-9 pe-7 ps-7">
                {/* Header Section */}
                <View className="mb-8 flex-row items-center gap-4">
                  <LinearGradient
                    colors={[statusStyle.hex, statusStyle.hex]}
                    style={{
                      height: 50,
                      width: 50,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <User size={24} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                      Reporter Info
                    </Text>
                    <Text
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500"
                      style={{ color: statusStyle.hex }}>
                      CITIZEN IDENTITY
                    </Text>
                  </View>
                </View>

                {/* Elite Profile Widget */}
                <View className="mb-8">
                  <View className="mb-6 flex-row items-center gap-5">
                    <View className="h-16 w-16 overflow-hidden rounded-2xl shadow-lg">
                      <LinearGradient
                        colors={['#1E1B4B', statusStyle.hex]}
                        style={StyleSheet.absoluteFill}
                      />
                      <View className="flex-1 items-center justify-center">
                        <User size={32} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                        {mappedIssue.citizenName}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-2">
                        <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          Verified Citizen
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Citizen Data Grid */}
                  <View className="rounded-3xl border border-slate-200/50 bg-white/50 p-1 dark:border-white/5 dark:bg-black/20">
                    <View className="flex-row items-center justify-between border-b border-slate-100 p-4 dark:border-white/5">
                      <View className="flex-row items-center gap-3">
                        <View
                          style={{ backgroundColor: statusStyle.bg }}
                          className="h-8 w-8 items-center justify-center rounded-lg">
                          <Phone size={14} color={statusStyle.hex} strokeWidth={2.5} />
                        </View>
                        <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                          PHONE
                        </Text>
                      </View>
                      <Text className="text-[13px] font-black tracking-tight text-slate-700 dark:text-slate-200">
                        {mappedIssue.citizenPhone}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between p-4">
                      <View className="flex-row items-center gap-3">
                        <View
                          style={{ backgroundColor: statusStyle.bg }}
                          className="h-8 w-8 items-center justify-center rounded-lg">
                          <Mail size={14} color={statusStyle.hex} strokeWidth={2.5} />
                        </View>
                        <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                          EMAIL
                        </Text>
                      </View>
                      <Text className="text-[13px] font-black tracking-tight text-slate-700 dark:text-slate-200">
                        {mappedIssue.citizenEmail}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Flagship Communication Trigger (1:1 Premium Parity) */}
                <TouchableOpacity
                  onPress={() => {}} // Handle contact
                  activeOpacity={0.85}
                  style={{
                    borderRadius: 24,
                    overflow: 'hidden',
                    marginTop: 12,
                    shadowColor: statusStyle.hex,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.4,
                    shadowRadius: 15,
                    elevation: 10,
                  }}>
                  <LinearGradient
                    colors={[statusStyle.hex, statusStyle.hex]} // Status-coded base
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 20 }}>
                    {/* Cinematic Ripple Layer */}
                    <View
                      style={{
                        position: 'absolute',
                        left: -20,
                        top: -20,
                        width: 120,
                        height: 120,
                        borderRadius: 60,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      }}
                    />

                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 18,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.2)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Mail size={22} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 14,
                          fontWeight: '900',
                          letterSpacing: 1.5,
                        }}>
                        CONTACT REPORTER
                      </Text>
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: 9,
                          fontWeight: '800',
                          marginTop: 2,
                          letterSpacing: 0.5,
                        }}>
                        SECURE FO COORDINATION
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <ChevronRight size={18} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* LOCATION DETAILS */}
          <View
            style={{
              shadowColor: statusStyle.hex,
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: isDark ? 0.35 : 0.1,
              shadowRadius: 30,
              elevation: 15,
              marginBottom: 32,
            }}>
            <LinearGradient
              colors={isDark ? statusStyle.gradientDark : statusStyle.gradientLight}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderColor: statusStyle.border,
                borderWidth: 1.5,
                borderRadius: 40,
                overflow: 'hidden',
                position: 'relative',
              }}>
              {/* Cinematic Watermark Layer */}
              <View style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.04 }}>
                <Navigation size={220} color={statusStyle.hex} strokeWidth={1} />
              </View>

              <View className="py-9 pe-7 ps-7">
                {/* Header Section */}
                <View className="mb-8 flex-row items-center gap-4">
                  <LinearGradient
                    colors={[statusStyle.hex, statusStyle.hex]}
                    style={{
                      height: 50,
                      width: 50,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MapPin size={24} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                      Location
                    </Text>
                    <Text
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500"
                      style={{ color: isDark ? statusStyle.hex : statusStyle.hex }}>
                      GEOSPATIAL DATA
                    </Text>
                  </View>
                </View>

                {/* Cinematic Geo-Widget */}
                <TouchableOpacity
                  onPress={openMaps}
                  activeOpacity={0.85}
                  style={{ borderRadius: 28, overflow: 'hidden' }}>
                  <LinearGradient
                    colors={
                      isDark ? ['rgba(30,41,59,0.5)', 'rgba(15,23,42,0.8)'] : ['#F8FAFC', '#F1F5F9']
                    }
                    className="border border-white/10 dark:border-white/5">
                    <View className="p-6">
                      <View className="flex-row items-center gap-5">
                        <View className="flex-1">
                          <Text className="text-[16px] font-black leading-[24px] tracking-tight text-slate-800 dark:text-slate-100">
                            {mappedIssue.address || 'Address Unspecified'}
                          </Text>

                          {/* Professional Geo-Data Pillars (Chromatic Toning) */}
                          <View className="mt-5 flex-row items-center gap-3">
                            <View
                              style={{ backgroundColor: statusStyle.bg }}
                              className="flex-row items-center gap-2 rounded-xl border border-slate-200/40 px-3 py-2 dark:border-white/5">
                              <Compass size={12} color={statusStyle.hex} strokeWidth={3} />
                              <Text
                                style={{ color: statusStyle.hex }}
                                className="text-[8px] font-black opacity-70">
                                LAT
                              </Text>
                              <Text
                                style={{ color: statusStyle.hex }}
                                className="text-[11px] font-black tracking-tight">
                                {mappedIssue.coordinates.latitude.toFixed(6)}°
                              </Text>
                            </View>

                            <View
                              style={{ backgroundColor: statusStyle.bg }}
                              className="flex-row items-center gap-2 rounded-xl border border-slate-200/40 px-3 py-2 dark:border-white/5">
                              <Compass
                                size={12}
                                color={statusStyle.hex}
                                strokeWidth={3}
                                className="rotate-90"
                              />
                              <Text
                                style={{ color: statusStyle.hex }}
                                className="text-[8px] font-black opacity-70">
                                LNG
                              </Text>
                              <Text
                                style={{ color: statusStyle.hex }}
                                className="text-[11px] font-black tracking-tight">
                                {mappedIssue.coordinates.longitude.toFixed(6)}°
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View
                          style={{ backgroundColor: statusStyle.bg }}
                          className="h-10 w-10 items-center justify-center rounded-xl shadow-sm">
                          <ExternalLink size={20} color={statusStyle.hex} strokeWidth={2.5} />
                        </View>
                      </View>
                    </View>

                    {/* Bottom Navigation Ribbon (Status Colored) */}
                    <View
                      className="flex-row items-center justify-between border-t border-slate-200/50 px-6 py-4 dark:border-white/5"
                      style={{
                        backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.5)',
                      }}>
                      <View className="flex-row items-center gap-3">
                        <Navigation size={14} color={statusStyle.hex} strokeWidth={2.5} />
                        <Text
                          style={{ color: statusStyle.hex }}
                          className="text-[10px] font-black tracking-[0.15em]">
                          NAVIGATE VIA GOOGLE MAPS
                        </Text>
                      </View>
                      <ChevronRight size={14} color={statusStyle.hex} strokeWidth={3} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* DESCRIPTION */}
          <View
            style={{
              shadowColor: statusStyle.hex,
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: isDark ? 0.35 : 0.1,
              shadowRadius: 30,
              elevation: 15,
              marginBottom: 32,
            }}>
            <LinearGradient
              colors={isDark ? statusStyle.gradientDark : statusStyle.gradientLight}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderColor: statusStyle.border,
                borderWidth: 1.5,
                borderRadius: 40,
                overflow: 'hidden',
                position: 'relative',
              }}>
              {/* Cinematic Watermark Layer */}
              <View style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.04 }}>
                <FileText size={220} color={statusStyle.hex} strokeWidth={1} />
              </View>

              <View className="py-9 pe-7 ps-7">
                {/* Header Section */}
                <View className="mb-8 flex-row items-center gap-4">
                  <LinearGradient
                    colors={[statusStyle.hex, statusStyle.hex]}
                    style={{
                      height: 50,
                      width: 50,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <FileText size={24} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                      Description
                    </Text>
                    <Text
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500"
                      style={{ color: statusStyle.hex }}>
                      REPORTED DETAILS
                    </Text>
                  </View>
                </View>

                {/* Intelligence Content Field */}
                <View className="flex-row overflow-hidden rounded-[28px] border border-slate-100/50 bg-slate-50/50 dark:border-white/5 dark:bg-white/5">
                  {/* Status Vertical Accent */}
                  <View style={{ width: 6, backgroundColor: statusStyle.hex }} />

                  <View className="flex-1 p-6">
                    <Text
                      style={{ lineHeight: 28, letterSpacing: 0.3 }}
                      className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
                      {mappedIssue.description ||
                        'No detailed description provided by the citizen.'}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* PHOTO EVIDENCE (Evidence Intelligence Pod) */}
          {hasPhotos && (
            <View
              style={{
                shadowColor: statusStyle.hex,
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: isDark ? 0.35 : 0.1,
                shadowRadius: 30,
                elevation: 15,
                marginBottom: 32,
              }}>
              <LinearGradient
                colors={isDark ? statusStyle.gradientDark : statusStyle.gradientLight}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderColor: statusStyle.border,
                  borderWidth: 1.5,
                  borderRadius: 40,
                  overflow: 'hidden',
                  position: 'relative',
                  paddingBottom: 20,
                }}>
                {/* Cinematic Watermark Layer */}
                <View style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.04 }}>
                  <Camera size={220} color={statusStyle.hex} strokeWidth={1} />
                </View>

                <View className="py-9 pe-7 ps-7">
                  {/* Header Section */}
                  <View className="mb-8 flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center gap-4">
                      <LinearGradient
                        colors={[statusStyle.hex, statusStyle.hex]}
                        style={{
                          height: 50,
                          width: 50,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Camera size={24} color="#FFFFFF" strokeWidth={2.5} />
                      </LinearGradient>
                      <View className="flex-1">
                        <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                          Evidence Photos
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <Text
                            className="text-[10px] font-black uppercase tracking-[0.2em]"
                            style={{ color: statusStyle.hex }}>
                            VISUAL VERIFICATION
                          </Text>
                          <View
                            style={{ backgroundColor: statusStyle.bg }}
                            className="rounded-full px-2.5 py-0.5">
                            <Text
                              className="text-[9px] font-black tracking-widest"
                              style={{ color: statusStyle.hex }}>
                              {mappedIssue.images.length +
                                allBeforePhotos.length +
                                allAfterPhotos.length}{' '}
                              FILES
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="gap-8">
                    {mappedIssue.images.length > 0 && (
                      <View>
                        <Text className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                          PHOTOS BY CITIZEN
                        </Text>
                        <PhotoCarousel
                          photos={mappedIssue.images}
                          label="PHOTOS"
                          isDark={isDark}
                          statusHex={statusStyle.hex}
                          onPressImage={setFullScreenImage}
                        />
                      </View>
                    )}

                    {allBeforePhotos.length > 0 && (
                      <View>
                        <Text className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                          BEFORE PHOTOS
                        </Text>
                        <PhotoCarousel
                          photos={allBeforePhotos}
                          label="BEFORE"
                          isDark={isDark}
                          statusHex={statusStyle.hex}
                          onPressImage={setFullScreenImage}
                        />
                      </View>
                    )}

                    {allAfterPhotos.length > 0 && (
                      <View>
                        <View className="mb-8 h-px bg-slate-100 dark:bg-white/5" />
                        <Text className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500 dark:text-emerald-400">
                          AFTER PHOTOS
                        </Text>
                        <PhotoCarousel
                          photos={allAfterPhotos}
                          label="AFTER"
                          isDark={isDark}
                          statusHex={statusStyle.hex}
                          onPressImage={setFullScreenImage}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* VIDEO EVIDENCE (Multimedia Intelligence Pod) */}
          {hasVideo && (
            <View
              style={{
                shadowColor: statusStyle.hex,
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: isDark ? 0.35 : 0.1,
                shadowRadius: 30,
                elevation: 15,
                marginBottom: 32,
              }}>
              <LinearGradient
                colors={isDark ? statusStyle.gradientDark : statusStyle.gradientLight}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderColor: statusStyle.border,
                  borderWidth: 1.5,
                  borderRadius: 40,
                  overflow: 'hidden',
                  position: 'relative',
                  paddingBottom: 24,
                }}>
                {/* Cinematic Watermark Layer */}
                <View style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.04 }}>
                  <Video size={220} color={statusStyle.hex} strokeWidth={1} />
                </View>

                <View className="py-9 pe-7 ps-7">
                  {/* Header Section */}
                  <View className="mb-8 flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center gap-4">
                      <LinearGradient
                        colors={[statusStyle.hex, statusStyle.hex]}
                        style={{
                          height: 50,
                          width: 50,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Video size={24} color="#FFFFFF" strokeWidth={2.5} />
                      </LinearGradient>
                      <View className="flex-1">
                        <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                          Multimedia Feed
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <Text
                            className="text-[10px] font-black uppercase tracking-[0.2em]"
                            style={{ color: statusStyle.hex }}>
                            DYNAMIC EVIDENCE
                          </Text>
                          <View
                            style={{ backgroundColor: statusStyle.bg }}
                            className="rounded-full px-2.5 py-0.5">
                            <Text
                              className="text-[9px] font-black tracking-widest"
                              style={{ color: statusStyle.hex }}>
                              {mappedIssue.videoEvidence!.length} CLIPS
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Cinematic Tabs */}
                  {mappedIssue.videoEvidence!.length > 1 && (
                    <View className="mb-6 flex-row flex-wrap gap-2">
                      {mappedIssue.videoEvidence!.map((_, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => {
                            setActiveVideoIndex(i);
                            setPlayingVideo(null);
                          }}
                          className={`items-center justify-center rounded-xl border px-4 py-2 ${
                            i === activeVideoIndex
                              ? 'bg-black/80 dark:bg-white/10'
                              : 'bg-transparent'
                          }`}
                          style={{ borderColor: statusStyle.border }}
                          activeOpacity={0.8}>
                          <Text
                            className={`text-[11px] uppercase tracking-[0.15em] ${
                              i === activeVideoIndex
                                ? 'font-black text-white'
                                : 'font-bold text-slate-500 dark:text-slate-400'
                            }`}>
                            CLIP {i + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Refined Multimedia Player */}
                  <View
                    className="overflow-hidden rounded-[24px] border"
                    style={{
                      height: 240,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      backgroundColor: '#000000',
                    }}>
                    {playingVideo === activeVideoIndex ? (
                      <View style={{ flex: 1 }}>
                        <WebView
                          source={{ uri: mappedIssue.videoEvidence![activeVideoIndex] }}
                          style={{ flex: 1, backgroundColor: 'transparent' }}
                          allowsInlineMediaPlayback
                          mediaPlaybackRequiresUserAction={true}
                          allowsFullscreenVideo={true}
                          javaScriptEnabled
                        />

                        {/* Controls Overlay */}
                        <View className="absolute bottom-4 right-4 flex-row gap-3">
                          <TouchableOpacity
                            className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/40"
                            onPress={() =>
                              setFullScreenVideo(mappedIssue.videoEvidence![activeVideoIndex])
                            }
                            activeOpacity={0.8}>
                            <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                            <Maximize2 size={16} color="#FFFFFF" strokeWidth={2.5} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/40"
                            onPress={() => setPlayingVideo(null)}
                            activeOpacity={0.8}>
                            <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                            <X size={16} color="#FFFFFF" strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={{ flex: 1, position: 'relative' }}>
                        <LinearGradient
                          colors={
                            isDark
                              ? ['#1E1B4B', statusStyle.hex, '#0F172A']
                              : [statusStyle.hex, '#0891B2', '#075985']
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ flex: 1, opacity: 0.8 }}
                        />
                        <View className="absolute inset-0 items-center justify-center">
                          <TouchableOpacity
                            onPress={() => setPlayingVideo(activeVideoIndex)}
                            className="items-center justify-center"
                            activeOpacity={0.85}>
                            <View className="absolute h-20 w-20 rounded-full border border-white/30 bg-white/10" />
                            <Play size={44} color="#FFFFFF" strokeWidth={2.5} fill="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* ISSUE UPDATES (Issue Updates Intelligence Pod) */}
          <View
            style={{
              shadowColor: statusStyle.hex,
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: isDark ? 0.35 : 0.1,
              shadowRadius: 30,
              elevation: 15,
              marginBottom: 32,
            }}>
            <LinearGradient
              colors={isDark ? statusStyle.gradientDark : statusStyle.gradientLight}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderColor: statusStyle.border,
                borderWidth: 1.5,
                borderRadius: 40,
                overflow: 'hidden',
                position: 'relative',
                paddingBottom: 24,
              }}>
              {/* Cinematic Watermark Layer */}
              <View style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.04 }}>
                <MessageSquarePlus size={220} color={statusStyle.hex} strokeWidth={1} />
              </View>

              <View className="py-9 pe-7 ps-7">
                {/* Header Section */}
                <View className="mb-8 flex-row items-center gap-4">
                  <LinearGradient
                    colors={[statusStyle.hex, statusStyle.hex]}
                    style={{
                      height: 50,
                      width: 50,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MessageSquarePlus size={24} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                      Issue Updates
                    </Text>
                    <Text
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500"
                      style={{ color: statusStyle.hex }}>
                      ISSUE LIFECYCLE TIMELINE
                    </Text>
                  </View>
                </View>

                {/* Timeline Content */}
                <View className="mt-2">
                  {issueUpdates?.length === 0 ? (
                    <View className="items-center py-12">
                      <View
                        style={{ backgroundColor: statusStyle.bg }}
                        className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/50 dark:border-white/5">
                        <MessageSquarePlus color={statusStyle.hex} size={28} strokeWidth={1.5} />
                      </View>
                      <Text
                        style={{ color: statusStyle.hex }}
                        className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">
                        NO OPERATIONAL UPDATES DETECTED
                      </Text>
                    </View>
                  ) : (
                    (issueUpdates ?? []).map((upd: any, index: number) => {
                      const updDotColor = STATUS_DOT_COLORS[upd.status] ?? '#94A3B8';
                      const isLatest = index === 0;
                      const isLast = index === (issueUpdates?.length ?? 0) - 1;

                      const roleMeta =
                        upd.role === 'unit_officer'
                          ? {
                              label: 'Unit Officer',
                              icon: <ShieldCheck size={10} color="#0EA5A4" />,
                              color: '#0EA5A4',
                            }
                          : upd.role === 'field_officer'
                            ? {
                                label: 'Field Officer',
                                icon: <User size={10} color="#F59E0B" />,
                                color: '#F59E0B',
                              }
                            : {
                                label: 'Administrator',
                                icon: <ShieldAlert size={10} color="#EF4444" />,
                                color: '#EF4444',
                              };

                      return (
                        <View key={upd._id} className="flex-row">
                          {/* Cinematic Timeline Track */}
                          <View className="w-12 items-center">
                            <View
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 7,
                                backgroundColor: updDotColor,
                                borderWidth: 3,
                                borderColor: isDark ? '#0F172A' : '#FFFFFF',
                                shadowColor: updDotColor,
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: isLatest ? 0.8 : 0.4,
                                shadowRadius: isLatest ? 8 : 4,
                                elevation: 5,
                                zIndex: 10,
                                marginTop: 4,
                              }}>
                              {isLatest && (
                                <View
                                  style={{
                                    position: 'absolute',
                                    inset: -4,
                                    borderRadius: 10,
                                    backgroundColor: updDotColor,
                                    opacity: 0.3,
                                  }}
                                />
                              )}
                            </View>
                            {!isLast && (
                              <LinearGradient
                                colors={[updDotColor, 'rgba(148,163,184,0.1)']}
                                style={{ flex: 1, width: 2, marginTop: 4, marginBottom: 4 }}
                              />
                            )}
                          </View>

                          {/* Intelligence Payload Card */}
                          <View
                            className="mb-6 flex-1 overflow-hidden rounded-[20px] border-t-2 shadow-sm"
                            style={{
                              borderTopColor: updDotColor,
                              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                              borderLeftWidth: 1,
                              borderRightWidth: 1,
                              borderBottomWidth: 1,
                              borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            }}>
                            <LinearGradient
                              colors={isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F8FAFC']}
                              style={StyleSheet.absoluteFill}
                            />

                            {/* Payload Header */}
                            <View className="flex-row items-start justify-between border-b border-slate-100/50 p-4 dark:border-white/5">
                              <View className="flex-1 pr-2">
                                <Text className="mb-1 text-[15px] font-black tracking-tight text-slate-800 dark:text-white">
                                  {STATUS_LABELS[upd.status] || upd.status}
                                </Text>
                                <View className="flex-row flex-wrap items-center gap-2">
                                  <View
                                    className="flex-row items-center gap-1 rounded-full border px-2 py-0.5"
                                    style={{
                                      borderColor: roleMeta.color + '40',
                                      backgroundColor: roleMeta.color + '10',
                                    }}>
                                    {roleMeta.icon}
                                    <Text
                                      className="text-[9px] font-black uppercase tracking-wider"
                                      style={{ color: roleMeta.color }}>
                                      {roleMeta.label}
                                    </Text>
                                  </View>
                                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                    •
                                  </Text>
                                  <Text className="text-[11px] font-bold tracking-tight text-slate-500 dark:text-slate-400">
                                    {upd.updater?.fullName || 'Anonymous'}
                                  </Text>
                                </View>
                              </View>

                              <View className="items-end gap-2">
                                <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                  {formatTimestamp(upd.createdAt)}
                                </Text>
                                <View
                                  className="flex-row items-center gap-1 rounded-lg px-2 py-1"
                                  style={{
                                    backgroundColor: isDark
                                      ? 'rgba(255,255,255,0.06)'
                                      : 'rgba(0,0,0,0.04)',
                                  }}>
                                  {upd.scope === 'citizen' ? (
                                    <Eye size={9} color="#64748B" />
                                  ) : (
                                    <Users size={9} color="#64748B" />
                                  )}
                                  <Text className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                                    {upd.scope === 'officer_and_citizen' ? 'PUBLIC' : 'INTERNAL'}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Comment Payload */}
                            {upd.comment && (
                              <View className="p-4">
                                <Text className="text-[14px] font-medium leading-[24px] text-slate-600 dark:text-slate-300">
                                  {upd.comment}
                                </Text>
                              </View>
                            )}

                            {/* Attachments Module */}
                            {upd.attachments?.length > 0 && (
                              <View className="border-t border-slate-100/50 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-black/20">
                                <View className="mb-3 flex-row items-center gap-1.5">
                                  <Paperclip
                                    color={isDark ? '#64748B' : '#94A3B8'}
                                    size={12}
                                    strokeWidth={2.5}
                                  />
                                  <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    SECURED ASSETS ({upd.attachments.length})
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
                                            className="h-14 w-16 rounded-xl border border-slate-200 dark:border-white/10"
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
                                          className="h-14 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-900 dark:border-white/10">
                                          <View className="h-6 w-6 items-center justify-center rounded-full bg-white/20">
                                            <Play color="#fff" size={10} fill="#fff" />
                                          </View>
                                        </TouchableOpacity>
                                      );
                                    }

                                    if (isPDF) {
                                      return (
                                        <TouchableOpacity
                                          key={ai}
                                          activeOpacity={0.8}
                                          onPress={() =>
                                            setPreviewAttachment({ ...att, type: 'pdf' })
                                          }
                                          className="h-14 w-16 items-center justify-center rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/20">
                                          <FileText color="#DC2626" size={18} strokeWidth={2} />
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
              </View>
            </LinearGradient>
          </View>

          {/* POST UPDATE (Action Intelligence Pod) */}
          <View
            style={{
              shadowColor: statusStyle.hex,
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: isDark ? 0.35 : 0.1,
              shadowRadius: 30,
              elevation: 15,
              marginBottom: 32,
            }}>
            <LinearGradient
              colors={isDark ? statusStyle.gradientDark : statusStyle.gradientLight}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderColor: statusStyle.border,
                borderWidth: 1.5,
                borderRadius: 40,
                overflow: 'hidden',
                position: 'relative',
              }}>
              {/* Cinematic Watermark Layer */}
              <View style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.04 }}>
                <Send size={220} color={statusStyle.hex} strokeWidth={1} />
              </View>

              <View className="py-9 pe-7 ps-7">
                {/* Header Section */}
                <View className="mb-8 flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center gap-4">
                    <LinearGradient
                      colors={[statusStyle.hex, statusStyle.hex]}
                      style={{
                        height: 50,
                        width: 50,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Send size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </LinearGradient>
                    <View className="flex-1">
                      <Text className="text-[20px] font-black tracking-tight text-slate-900 dark:text-white">
                        Post Update
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="text-[10px] font-black uppercase tracking-[0.2em]"
                          style={{ color: statusStyle.hex }}>
                          Seamless Issue Updates
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Form Content */}
                <View className="gap-6">
                  {/* Scope Selector */}
                  <View>
                    <Text className="mb-3 ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Visibility Scope
                    </Text>
                    <View className="flex-row rounded-full border border-slate-200/50 bg-slate-100/50 p-1 dark:border-white/5 dark:bg-slate-900/40">
                      {(
                        [
                          {
                            value: 'citizen' as UpdateScope,
                            label: 'Citizen Only',
                            icon: <Eye size={12} strokeWidth={2.5} />,
                          },
                          {
                            value: 'officer_and_citizen' as UpdateScope,
                            label: 'FO & Citizen',
                            icon: <Users size={12} strokeWidth={2.5} />,
                          },
                          {
                            value: 'admin_only' as UpdateScope,
                            label: 'Admin Only',
                            icon: <ShieldAlert size={12} strokeWidth={2.5} />,
                          },
                        ] as const
                      ).map((opt) => {
                        const isActive = updateScope === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            onPress={() => setUpdateScope(opt.value)}
                            activeOpacity={0.85}
                            style={{ flex: 1, borderRadius: 999, marginHorizontal: 2 }}>
                            {isActive ? (
                              <View
                                style={{
                                  backgroundColor: statusStyle.hex,
                                  borderRadius: 999,
                                  paddingVertical: 10,
                                  paddingHorizontal: 8,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexDirection: 'row',
                                  gap: 6,
                                  shadowColor: statusStyle.hex,
                                  shadowOffset: { width: 0, height: 4 },
                                  shadowOpacity: 0.3,
                                  shadowRadius: 8,
                                  elevation: 5,
                                }}>
                                {React.cloneElement(
                                  opt.icon as React.ReactElement<{ color: string }>,
                                  {
                                    color: '#FFFFFF',
                                  }
                                )}
                                <Text
                                  style={{ color: '#FFFFFF' }}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  className="text-[11px] font-black tracking-wide">
                                  {opt.label}
                                </Text>
                              </View>
                            ) : (
                              <View
                                style={{
                                  borderRadius: 999,
                                  paddingVertical: 10,
                                  paddingHorizontal: 8,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexDirection: 'row',
                                  gap: 6,
                                }}>
                                {React.cloneElement(
                                  opt.icon as React.ReactElement<{ color: string }>,
                                  {
                                    color: isDark ? '#64748B' : '#94A3B8',
                                  }
                                )}
                                <Text
                                  style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  className="text-[11px] font-bold tracking-wide">
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
                  <View>
                    <Text className="mb-3 ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Message Log
                    </Text>
                    <View
                      style={{
                        borderColor:
                          updateText &&
                          updateText
                            .trim()
                            .split(/\s+/)
                            .filter((w) => w.length > 0).length < 5
                            ? '#F59E0B' // amber
                            : isDark
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,0,0,0.05)',
                        borderWidth: 1,
                      }}
                      className="overflow-hidden rounded-[24px] bg-white/60 dark:bg-slate-900/40">
                      <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-white/5 dark:bg-slate-800/40">
                        <View className="flex-row items-center gap-3">
                          <View
                            style={{ backgroundColor: statusStyle.bg }}
                            className="h-8 w-8 items-center justify-center rounded-xl">
                            <Notebook color={statusStyle.hex} size={15} strokeWidth={2.5} />
                          </View>
                          <Text className="text-[14px] font-black tracking-tight text-slate-800 dark:text-slate-100">
                            Comments
                          </Text>
                        </View>

                        <View
                          className="rounded-lg px-3 py-1.5"
                          style={{
                            backgroundColor:
                              updateText &&
                              updateText
                                .trim()
                                .split(/\s+/)
                                .filter((w) => w.length > 0).length >= 5
                                ? statusStyle.bg
                                : isDark
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : '#FEF3C7',
                          }}>
                          <Text
                            className="text-[10px] font-black"
                            style={{
                              color:
                                updateText &&
                                updateText
                                  .trim()
                                  .split(/\s+/)
                                  .filter((w) => w.length > 0).length >= 5
                                  ? statusStyle.hex
                                  : '#D97706',
                            }}>
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

                      <View className="max-h-[220px] px-2 py-2">
                        <ScrollView
                          showsVerticalScrollIndicator={false}
                          contentContainerStyle={{ flexGrow: 1 }}
                          nestedScrollEnabled={true}
                          keyboardShouldPersistTaps="handled">
                          <TextInput
                            className="min-h-[110px] bg-transparent px-4 py-3"
                            placeholder="Draft your secure update protocol here..."
                            placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                            value={updateText}
                            onChangeText={setUpdateText}
                            multiline
                            scrollEnabled={false}
                            style={{
                              fontSize: 15,
                              lineHeight: 24,
                              textAlignVertical: 'top',
                              color: isDark ? '#F8FAFC' : '#0F172A',
                              fontWeight: '500',
                            }}
                          />
                        </ScrollView>
                      </View>
                    </View>
                  </View>

                  {/* Attachment previews */}
                  {updateAttachments.length > 0 && (
                    <View>
                      <Text className="mb-3 ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        Attachments ({updateAttachments.length})
                      </Text>
                      <View className="flex-row flex-wrap gap-3">
                        {updateAttachments.map((att, i) => (
                          <View
                            key={i}
                            className="relative overflow-hidden rounded-[20px] border border-slate-200/50 bg-slate-100/50 dark:border-white/5 dark:bg-slate-900/40"
                            style={{ height: 100, width: 100 }}>
                            {att.type === 'image' ? (
                              <Image
                                source={{ uri: att.uri }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                              />
                            ) : att.type === 'video' ? (
                              <View className="flex-1 items-center justify-center bg-slate-800 p-2">
                                <Video color="#FFFFFF" size={24} strokeWidth={2} />
                                <Text
                                  className="mt-2 text-center text-[9px] font-bold text-white"
                                  numberOfLines={1}>
                                  {att.name}
                                </Text>
                              </View>
                            ) : (
                              <View className="flex-1 items-center justify-center bg-slate-800 p-2">
                                <Text className="font-black text-red-500">PDF</Text>
                                <Text
                                  className="mt-2 text-center text-[9px] font-bold text-white"
                                  numberOfLines={1}>
                                  {att.name}
                                </Text>
                              </View>
                            )}
                            <TouchableOpacity
                              onPress={() =>
                                setUpdateAttachments(
                                  updateAttachments.filter((_, idx) => idx !== i)
                                )
                              }
                              activeOpacity={0.8}
                              style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                borderRadius: 100,
                                padding: 4,
                              }}>
                              <X color="#fff" size={12} strokeWidth={3} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Action row */}
                  <View className="mt-2 flex-row gap-3">
                    <TouchableOpacity
                      onPress={handleShowAttachMenu}
                      activeOpacity={0.75}
                      className="flex-row items-center gap-2 rounded-2xl border border-slate-200/50 bg-white/60 px-5 py-4 dark:border-white/5 dark:bg-slate-900/40">
                      <Paperclip color={statusStyle.hex} size={18} strokeWidth={2.5} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handlePostUpdate}
                      activeOpacity={0.85}
                      style={{ flex: 1 }}>
                      <LinearGradient
                        colors={[statusStyle.hex, statusStyle.hex]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          borderRadius: 16,
                          flex: 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 8,
                          shadowColor: statusStyle.hex,
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.3,
                          shadowRadius: 12,
                          elevation: 8,
                        }}>
                        <Send color="#FFFFFF" size={18} strokeWidth={2.5} />
                        <Text className="text-[15px] font-black text-white">Post Update</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* SLA OVERDUE ACTION PANEL */}
          {isSLAOverdue && assignedFO && (
            <SectionCard>
              <SLAOverduePanel
                issue={mappedIssue}
                fieldOfficers={assignedFO.filter(
                  (officer: any) => officer?._id !== assignedOfficerData?._id
                )}
                onReassign={handleSLAReassign}
                onReject={handleSLAReject}
                onExtend={handleSLAExtend}
                // onEscalate={handleSLAEscalate}
              />
            </SectionCard>
          )}

          {/* Issue Verification & Rejection (Pending) */}
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

          {/* Issue Re-Verification & Re-Rejection (Reopened) */}
          {mappedIssue.status === 'reopened' && (
            <SectionCard>
              {/* Reopened context banner */}
              <View className="mx-5 mb-4 mt-5 overflow-hidden rounded-2xl">
                <LinearGradient
                  colors={isDark ? ['#4a1938', '#2d1040'] : ['#fdf2f8', '#fce7f3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: isDark ? '#7c3a60' : '#f9a8d4',
                  }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: isDark ? '#7c1d4a' : '#fce7f3',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <RotateCcw color="#EC4899" size={17} strokeWidth={2.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: '#EC4899',
                        letterSpacing: 0.8,
                        marginBottom: 3,
                      }}>
                      ISSUE RE-OPENED BY CITIZEN
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: isDark ? '#f9a8d4' : '#be185d',
                        lineHeight: 18,
                        fontWeight: '500',
                      }}>
                      The citizen has re-opened this issue. Review the original concern and
                      re-verify to reassign for resolution.
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Re-verification tabs — same UI as Pending */}
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
                    Re-Verify
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
                      Reject Re-opened Issue
                    </Text>
                  </View>
                  <Text className="mb-5 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                    Reject the citizen's re-open request if the concern is invalid or already
                    resolved. The citizen will be notified.
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

          {/* ASSIGN OFFICER (Verified) */}
          {mappedIssue.status === 'verified' && (
            <SectionCard>
              <View className="p-5">
                <View className="mb-1 flex-row items-center gap-2">
                  <UserCheck color="#0D9488" size={18} strokeWidth={2.5} />
                  <Text className="text-[17px] font-extrabold text-slate-800 dark:text-slate-100">
                    Assign Field Officer
                  </Text>
                </View>
                <Text className="mb-5 text-[13px] text-slate-500 dark:text-slate-400">
                  Issue is verified. Assign a field officer to begin work.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAssignModal(true)}
                  activeOpacity={0.85}
                  style={styles.actionBtn}>
                  <LinearGradient
                    colors={['#0D9488', '#0891B2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionBtnGradient}>
                    <UserCheck color="#FFFFFF" size={19} strokeWidth={2.5} />
                    <Text className="text-[15px] font-bold text-white">Assign to Officer</Text>
                    <ChevronRight color="rgba(255,255,255,0.7)" size={18} strokeWidth={2.5} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </SectionCard>
            // <>
            //   <Text>Assigned Officer </Text>
            // </>
          )}

          {/* IN PROGRESS */}
          {mappedIssue.status === 'in_progress' && (
            <SectionCard>
              <View className="flex-row items-center gap-4 p-5">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/30">
                  <Clock color="#0EA5E9" size={22} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-[16px] font-extrabold text-slate-800 dark:text-slate-100">
                    Work in Progress
                  </Text>
                  <Text className="text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                    Field officer is currently working on this issue
                  </Text>
                </View>
              </View>
            </SectionCard>
          )}

          {/* RESOLUTION */}
          {mappedIssue.status === 'assigned' && mappedIssue.afterPhotos && (
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
          {mappedIssue.status === 'pending_uo_verification' && (
            <SectionCard>
              <UOVerificationPanel
                issue={mappedIssue}
                onApprove={handleUOApprove}
                onRework={handleUORework}
              />
            </SectionCard>
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

        {assignedFO && (
          <AssignOfficerModal
            visible={showAssignModal}
            onClose={() => {
              setShowAssignModal(false);
              setPendingReassignMeta(null);
              setAssignModalMode('assign');
            }}
            // @ts-ignore
            officers={assignedFO}
            onAssign={handleAssign}
            mode={assignModalMode}
            currentOfficerName={mappedIssue.assignedOfficer?.fullName || ''}
            currentOfficerId={mappedIssue.assignedOfficer?._id}
          />
        )}

        <RejectionModal
          visible={showRejectionModal}
          // @ts-ignore
          issue={issue}
          onClose={() => setShowRejectionModal(false)}
          onReject={handleReject}
        />

        <ReassignmentModal
          visible={showReassignModal}
          onClose={() => setShowReassignModal(false)}
          onConfirm={handleReassign}
          issueTitle={mappedIssue.title}
          currentOfficer={mappedIssue.assignedOfficer?.fullName || ''}
        />

        <CitizenMessagingInterface
          visible={showMessaging}
          onClose={() => setShowMessaging(false)}
          // @ts-ignore
          issue={mappedIssue}
          initialMessages={issueMessages}
        />

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
                <View
                  style={{
                    width: '90%',
                    height: '75%',
                    borderRadius: 24,
                    overflow: 'hidden',
                    backgroundColor: '#000',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}>
                  <WebView
                    source={
                      previewAttachment.type === 'pdf' && Platform.OS === 'android'
                        ? {
                            html: `
                              <!DOCTYPE html>
                              <html lang="en">
                              <head>
                                  <meta charset="UTF-8">
                                  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                  <style>
                                      body { margin: 0; padding: 0; background-color: #000; display: flex; flex-direction: column; align-items: center; overflow-y: auto; overflow-x: hidden; }
                                      canvas { max-width: 100%; height: auto; margin-bottom: 8px; border-bottom: 1px solid #333; }
                                  </style>
                                  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
                              </head>
                              <body>
                                  <div id="pdf-container" style="width: 100%; display: flex; flex-direction: column; align-items: center;"></div>
                                  <script>
                                      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                                      
                                      var loadingTask = pdfjsLib.getDocument('${previewAttachment.url}');
                                      loadingTask.promise.then(function(pdf) {
                                          var container = document.getElementById('pdf-container');
                                          
                                          // Loop through all pages sequentially to maintain order
                                          var renderPage = function(pageNum) {
                                              if (pageNum > pdf.numPages) return;
                                              
                                              pdf.getPage(pageNum).then(function(page) {
                                                  var scale = window.innerWidth / page.getViewport({scale: 1}).width;
                                                  // Limit max scale to prevent memory issues on large screens
                                                  scale = Math.min(scale, 1.5);
                                                  var viewport = page.getViewport({ scale: scale });
                                                  
                                                  var canvas = document.createElement('canvas');
                                                  var context = canvas.getContext('2d');
                                                  canvas.height = viewport.height;
                                                  canvas.width = viewport.width;
                                                  canvas.style.width = '100%';
                                                  
                                                  container.appendChild(canvas);
                                                  
                                                  var renderContext = {
                                                      canvasContext: context,
                                                      viewport: viewport
                                                  };
                                                  
                                                  page.render(renderContext).promise.then(function() {
                                                      renderPage(pageNum + 1);
                                                  });
                                              });
                                          };
                                          
                                          renderPage(1);
                                          
                                      }).catch(function(error) {
                                          console.error('PDF.js Error:', error);
                                      });
                                  </script>
                              </body>
                              </html>
                            `,
                          }
                        : { uri: previewAttachment.url }
                    }
                    originWhitelist={['*']}
                    style={{ flex: 1, backgroundColor: 'transparent' }}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={true}
                    allowsFullscreenVideo={true}
                    javaScriptEnabled
                    domStorageEnabled={true}
                    startInLoadingState={true}
                  />
                  {/* Cinematic Overlay Badge */}
                  <View className="absolute bottom-4 left-4 rounded-xl border border-white/20 bg-black/60 px-4 py-2 backdrop-blur-md">
                    <View className="flex-row items-center gap-2">
                      {previewAttachment.type === 'video' ? (
                        <Play size={12} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <FileText size={12} color="#EF4444" strokeWidth={3} />
                      )}
                      <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                        {previewAttachment.type === 'video'
                          ? 'SECURE_STREAM_PREVIEW'
                          : 'SECURE_DOC_PREVIEW'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        {/* ── Full Screen Image Preview ── */}
        <Modal
          visible={fullScreenImage !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullScreenImage(null)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.95)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 50,
                right: 20,
                zIndex: 50,
                padding: 10,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 20,
              }}
              onPress={() => setFullScreenImage(null)}
              activeOpacity={0.7}>
              <X size={32} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            {fullScreenImage && (
              <Image
                source={{ uri: fullScreenImage }}
                style={{ width: '100%', height: '80%' }}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

        {/* ── Full Screen Video Preview ── */}
        <Modal
          visible={fullScreenVideo !== null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setFullScreenVideo(null)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.95)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />

            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 50,
                right: 20,
                zIndex: 50,
                padding: 10,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 20,
              }}
              onPress={() => setFullScreenVideo(null)}
              activeOpacity={0.7}>
              <X size={32} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            {fullScreenVideo && (
              <View
                style={{ width: '100%', height: 300, backgroundColor: '#000', overflow: 'hidden' }}>
                <WebView
                  source={{ uri: fullScreenVideo }}
                  style={{ flex: 1 }}
                  allowsInlineMediaPlayback={false}
                  allowsFullscreenVideo={true}
                  javaScriptEnabled
                />
              </View>
            )}
          </View>
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
