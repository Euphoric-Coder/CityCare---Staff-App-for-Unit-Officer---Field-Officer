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
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Issue, IssueUpdate, UpdateScope } from '../lib/types';
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

interface IssueDetailScreenProps {
  route: { params: { issueId: string } };
}

interface FileAttachment {
  uri: string;
  type: 'image' | 'video' | 'pdf';
  name: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH - 48;

const STATUS_DOT_COLORS: Record<string, string> = {
  Pending: '#F59E0B',
  Verified: '#3B82F6',
  Assigned: '#6366F1',
  'In Progress': '#0EA5E9',
  'Pending UO Verification': '#A855F7',
  'Rework Required': '#F97316',
  Closed: '#10B981',
  Rejected: '#EF4444',
  Reopened: '#EC4899',
  Escalated: '#8B5CF6',
  Resolved: '#10B981',
};

const CATEGORY_COLORS: Record<
  string,
  { bg: string; darkBg: string; text: string; darkText: string; icon: string }
> = {
  Pothole: {
    bg: '#FEF3C7',
    darkBg: '#451a03',
    text: '#92400E',
    darkText: '#FCD34D',
    icon: '#D97706',
  },
  'Street Light': {
    bg: '#FEF9C3',
    darkBg: '#422006',
    text: '#854D0E',
    darkText: '#FDE047',
    icon: '#CA8A04',
  },
  'Waste Management': {
    bg: '#DCFCE7',
    darkBg: '#14532d',
    text: '#166534',
    darkText: '#86EFAC',
    icon: '#16A34A',
  },
  'Water Supply': {
    bg: '#DBEAFE',
    darkBg: '#1e3a5f',
    text: '#1E40AF',
    darkText: '#93C5FD',
    icon: '#2563EB',
  },
  Drainage: {
    bg: '#E0F2FE',
    darkBg: '#0c2d4a',
    text: '#0369A1',
    darkText: '#7DD3FC',
    icon: '#0284C7',
  },
  'Road Repair': {
    bg: '#FCE7F3',
    darkBg: '#4a0d2a',
    text: '#9D174D',
    darkText: '#F9A8D4',
    icon: '#DB2777',
  },
  'Park Maintenance': {
    bg: '#D1FAE5',
    darkBg: '#064e3b',
    text: '#065F46',
    darkText: '#6EE7B7',
    icon: '#059669',
  },
  'Public Safety': {
    bg: '#FEE2E2',
    darkBg: '#450a0a',
    text: '#991B1B',
    darkText: '#FCA5A5',
    icon: '#DC2626',
  },
};

function formatTimestamp(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateFull(dateString: string) {
  const date = new Date(dateString);
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
  return (
    <View
      className="mx-4 mb-3 overflow-hidden rounded-2xl bg-white dark:bg-slate-800"
      style={styles.sectionCard}>
      {children}
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2 border-b border-slate-100 px-5 pb-3 pt-5 dark:border-slate-700/60">
      {icon}
      <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
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
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { issueId } = route.params;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignModalMode, setAssignModalMode] = useState<'assign' | 'reassign'>('assign');
  const [pendingReassignMeta, setPendingReassignMeta] = useState<{
    reason: string;
    comment: string;
  } | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [localIssue, setLocalIssue] = useState<Issue | null>(null);
  const [verificationTab, setVerificationTab] = useState<'verify' | 'reject'>('verify');
  const [updateText, setUpdateText] = useState('');
  const [updateScope, setUpdateScope] = useState<UpdateScope>('field_and_citizen');
  const [updateAttachments, setUpdateAttachments] = useState<FileAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const pendingPicker = useRef<'camera' | 'gallery' | 'document' | null>(null);

  useEffect(() => {
    loadIssue();
  }, [issueId]);

  useEffect(() => {
    if (issue) setLocalIssue(issue);
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
    } catch {
      Alert.alert('Error', 'Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading || !issue || !localIssue) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="mt-3 text-sm font-medium text-slate-400 dark:text-slate-500">
          Loading issue...
        </Text>
      </View>
    );
  }

  const handleVerify = (checklist: VerificationChecklist, slaDate: string) => {
    const newUpdate: IssueUpdate = {
      id: `upd-${Date.now()}`,
      issueId: localIssue!.id,
      status: 'Verified',
      comment: 'Issue verified and ready for officer assignment.',
      role: 'UnitOfficer',
      attachments: [],
      updatedBy: 'uo-1',
      scope: 'field_and_citizen',
      createdAt: new Date().toISOString(),
    };
    setLocalIssue({
      ...localIssue!,
      status: 'Verified',
      verificationChecklist: checklist,
      slaDeadline: slaDate,
      issueUpdates: [...localIssue!.issueUpdates, newUpdate],
    });
    Alert.alert('Success', 'Issue has been verified and is ready for assignment.');
  };

  const handleReverify = (checklist: VerificationChecklist, slaDate: string) => {
    const newUpdate: IssueUpdate = {
      id: `upd-${Date.now()}`,
      issueId: localIssue!.id,
      status: 'Verified',
      comment:
        'Re-opened issue re-verified after citizen review. Assigned back for further action.',
      role: 'UnitOfficer',
      attachments: [],
      updatedBy: 'uo-1',
      scope: 'field_and_citizen',
      createdAt: new Date().toISOString(),
    };
    setLocalIssue({
      ...localIssue!,
      status: 'Verified',
      verificationChecklist: checklist,
      slaDeadline: slaDate,
      issueUpdates: [...localIssue!.issueUpdates, newUpdate],
    });
    Alert.alert('Re-verified', 'Issue has been re-verified and is ready for re-assignment.');
  };

  const handleReject = (reason: RejectionReason, reasonComment: string) => {
    const newUpdate: IssueUpdate = {
      id: `upd-${Date.now()}`,
      issueId: localIssue!.id,
      status: 'Rejected',
      comment: `Rejected: ${reason}. ${reasonComment}`,
      role: 'UnitOfficer',
      attachments: [],
      updatedBy: 'uo-1',
      scope: 'citizen',
      createdAt: new Date().toISOString(),
    };
    setShowRejectionModal(false);

    // delays heavy update
    setTimeout(() => {
      setLocalIssue({
        ...localIssue!,
        status: 'Rejected',
        rejectionReason: reason,
        rejectionComment: reasonComment,
        issueUpdates: [...localIssue!.issueUpdates, newUpdate],
      });
    }, 100);

    // Delay alert to next frame for iOS
    setTimeout(() => {
      Alert.alert('Rejected', 'Issue has been rejected.');
    }, 300);
  };

  const handleAssign = (officerId: string) => {
    const officer = mockFieldOfficers.find((o) => o.id === officerId);
    if (!officer || !localIssue) return;

    const isReassign = assignModalMode === 'reassign';
    const previousOfficer = localIssue.assignedOfficer;

    const timelineEntry: IssueUpdate = {
      id: `upd-${Date.now()}`,
      issueId: localIssue.id,
      status: 'Assigned',
      comment: isReassign
        ? `Issue reassigned from ${previousOfficer ?? 'previous officer'} to ${officer.name}.${pendingReassignMeta?.reason ? ` Reason: ${pendingReassignMeta.reason}.` : ''}${pendingReassignMeta?.comment ? ` ${pendingReassignMeta.comment}` : ''}`
        : `Issue assigned to field officer ${officer.name} (Rating: ${officer.rating.toFixed(1)}, Success Rate: ${officer.successRate}%).`,
      role: 'UnitOfficer',
      attachments: [],
      updatedBy: 'Unit Officer',
      scope: 'field_and_citizen',
      createdAt: new Date().toISOString(),
    };

    setLocalIssue({
      ...localIssue,
      status: 'Assigned',
      assignedOfficer: officer.name,
      assignedOfficerId: officer.id,
      ...(isReassign && pendingReassignMeta
        ? {
            reassignmentReason: pendingReassignMeta.reason as any,
            reassignmentComment: pendingReassignMeta.comment,
          }
        : {}),
      issueUpdates: [...localIssue.issueUpdates, timelineEntry],
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
          // @ts-ignore
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
          const newUpdate: IssueUpdate = {
            id: `upd-${Date.now()}`,
            issueId: localIssue!.id,
            status: 'Reopened',
            comment: 'Issue reopened for further action.',
            role: 'Citizen',
            attachments: [],
            updatedBy: 'citizen-1',
            scope: 'citizen',
            createdAt: new Date().toISOString(),
          };
          setLocalIssue({
            ...localIssue!,
            status: 'Reopened',
            issueUpdates: [...localIssue!.issueUpdates, newUpdate],
          });
          Alert.alert('Success', 'Issue has been reopened.');
        },
      },
    ]);
  };

  const isSLAOverdue = !!(
    localIssue?.slaDeadline &&
    new Date(localIssue.slaDeadline) < new Date() &&
    !['Closed', 'Rejected', 'Escalated'].includes(localIssue.status)
  );

  const handleSLAReassign = (
    _newOfficer: FieldOfficer,
    _reason: any,
    _note: string,
    _date: Date,
    updated: Issue
  ) => {
    setLocalIssue(updated);
    Alert.alert(
      'Reassigned',
      `Issue has been reassigned to ${_newOfficer.name} with a new SLA deadline.`
    );
  };

  const handleSLAReject = (_reason: SLAOverdueRejectionReason, _note: string, updated: Issue) => {
    setLocalIssue(updated);
    Alert.alert('Issue Rejected', 'Issue has been rejected. Citizen has been notified.');
  };

  const handleSLAExtend = (
    _reason: SLAExtensionReason,
    _note: string,
    _date: Date,
    updated: Issue
  ) => {
    setLocalIssue(updated);
    Alert.alert('SLA Extended', 'New SLA deadline has been set. Citizen has been notified.');
  };

  const handleSLAEscalate = (_note: string, updated: Issue) => {
    setLocalIssue(updated);
    Alert.alert('Escalated', 'Issue has been escalated to Admin. Citizen has been informed.');
  };

  const handleUOApprove = (updatedIssue: Issue) => {
    setLocalIssue(updatedIssue);
    Alert.alert('Issue Closed', 'Resolution approved and issue has been closed successfully.');
  };

  const handleUORework = (note: string, updatedIssue: Issue) => {
    setLocalIssue(updatedIssue);
    Alert.alert('Rework Requested', 'Field officer has been notified to redo the work.');
  };

  const handlePostUpdate = () => {
    if (!updateText.trim()) {
      Alert.alert('Error', 'Please enter an update comment.');
      return;
    }
    const newUpdate: IssueUpdate = {
      id: `upd-${Date.now()}`,
      issueId: localIssue!.id,
      status: localIssue!.status,
      comment: updateText.trim(),
      role: 'UnitOfficer',
      attachments: updateAttachments.map((a) => a.uri),
      updatedBy: 'uo-1',
      scope: updateScope,
      createdAt: new Date().toISOString(),
    };
    setLocalIssue({
      ...localIssue!,
      issueUpdates: [...localIssue!.issueUpdates, newUpdate],
    });
    setUpdateText('');
    setUpdateAttachments([]);
    setUpdateScope('field_and_citizen');
    Alert.alert('Success', 'Update posted successfully.');
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
    const { latitude, longitude } = localIssue.coordinates;
    const label = encodeURIComponent(localIssue.location);
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

  const assignedOfficerData = localIssue.assignedOfficerId
    ? mockFieldOfficers.find((o) => o.id === localIssue.assignedOfficerId)
    : null;

  const statusDotColor = STATUS_DOT_COLORS[localIssue.status] ?? '#94A3B8';
  const catColor = CATEGORY_COLORS[localIssue.category] ?? CATEGORY_COLORS['Pothole'];

  const allBeforePhotos = localIssue.beforePhotos ?? [];
  const allAfterPhotos = localIssue.afterPhotos ?? [];
  const hasPhotos = allBeforePhotos.length > 0 || allAfterPhotos.length > 0;
  const hasVideo = (localIssue.videoEvidence?.length ?? 0) > 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      <StatusBar style="light" />

      {/* HEADER */}
      <LinearGradient
        colors={isDark ? ['#0F172A', '#1E293B'] : ['#0F766E', '#0891B2', '#0C4A6E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
          className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
          <ArrowLeft color="#FFFFFF" size={22} strokeWidth={2.5} />
        </TouchableOpacity>

        <View className="flex-1 items-center px-3">
          <Text className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/60">
            Issue #{localIssue.id.slice(-6).toUpperCase()}
          </Text>
          <Text className="text-[17px] font-extrabold text-white" numberOfLines={1}>
            Issue Details
          </Text>
        </View>

        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <View style={[styles.statusIndicator, { backgroundColor: statusDotColor }]} />
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* HERO TITLE CARD */}
        <SectionCard>
          <View className="px-5 pb-4 pt-5">
            <View className="mb-4 flex-row flex-wrap gap-2">
              <PriorityBadge priority={localIssue.priority} />
              <StatusBadge status={localIssue.status} />
            </View>

            <Text className="mb-4 text-[22px] font-extrabold leading-8 tracking-tight text-slate-900 dark:text-white">
              {localIssue.title}
            </Text>

            {localIssue.slaDeadline &&
              (() => {
                const isOverdue =
                  new Date(localIssue.slaDeadline) < new Date() &&
                  !['Closed', 'Rejected', 'Escalated'].includes(localIssue.status);
                return (
                  <View
                    className={`flex-row items-center gap-3 rounded-xl px-4 py-3 ${
                      isOverdue ? 'bg-red-100 dark:bg-red-900/40' : 'bg-red-50 dark:bg-red-900/20'
                    }`}>
                    <View
                      className={`h-8 w-8 items-center justify-center rounded-lg ${isOverdue ? 'bg-red-200 dark:bg-red-800/60' : 'bg-red-100 dark:bg-red-900/40'}`}>
                      <Clock
                        color={isOverdue ? '#B91C1C' : '#DC2626'}
                        size={15}
                        strokeWidth={2.5}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      {isOverdue && (
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: '#B91C1C',
                            letterSpacing: 1,
                            marginBottom: 2,
                          }}>
                          SLA OVERDUE
                        </Text>
                      )}
                      <Text
                        className={`flex-1 text-[13px] font-semibold ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-red-600 dark:text-red-400'}`}>
                        {isOverdue ? 'Was due: ' : 'SLA Deadline: '}
                        {formatTimestamp(localIssue.slaDeadline)}
                      </Text>
                    </View>
                    {isOverdue && (
                      <View
                        style={{
                          backgroundColor: '#B91C1C',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                        }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                          OVERDUE
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

            {/* Assigned Officer card */}
            {localIssue.assignedOfficer && (
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
                        {localIssue.assignedOfficer}
                      </Text>

                      {/* Stats row */}
                      {assignedOfficerData && (
                        <View className="flex-row items-center gap-3">
                          <View className="flex-row items-center gap-1">
                            <Star color="#F59E0B" size={12} fill="#F59E0B" strokeWidth={2} />
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
                              {assignedOfficerData.successRate}%
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1">
                            <Briefcase
                              color={isDark ? '#6B7280' : '#9CA3AF'}
                              size={11}
                              strokeWidth={2}
                            />
                            <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {assignedOfficerData.activeIssues} active
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {(localIssue.status === 'Assigned' || localIssue.status === 'In Progress') && (
                      <TouchableOpacity
                        onPress={() => setShowReassignModal(true)}
                        activeOpacity={0.75}
                        className="h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/40">
                        <RefreshCw color="#D97706" size={17} strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Specialisations */}
                  {assignedOfficerData?.specializations &&
                    assignedOfficerData.specializations.length > 0 && (
                      <View className="mt-3 flex-row flex-wrap gap-1.5">
                        {assignedOfficerData.specializations.map((spec, i) => (
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
                          {assignedOfficerData.workloadPercentage}%
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
        </SectionCard>

        {/* CATEGORY & SUBCATEGORY */}
        <SectionCard>
          <SectionHeader
            title="Category Details"
            icon={<Tag color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />}
          />
          <View className="gap-4 px-5 py-4">
            {/* Primary category chip */}
            <View>
              <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Category
              </Text>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: isDark ? catColor.darkBg : catColor.bg },
                ]}>
                <Layers color={catColor.icon} size={14} strokeWidth={2.5} />
                <Text
                  style={{ color: isDark ? catColor.darkText : catColor.text }}
                  className="ml-1.5 text-[13px] font-extrabold tracking-wide">
                  {localIssue.category}
                </Text>
              </View>
            </View>

            {/* Sub-categories — array of chips */}
            {localIssue.subCategories && localIssue.subCategories.length > 0 && (
              <View>
                <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Sub-Categories
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {localIssue.subCategories.map((sub, i) => (
                    <View
                      key={i}
                      className="flex-row items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 dark:border-slate-600/50 dark:bg-slate-700/80">
                      <Tag color={isDark ? '#94A3B8' : '#64748B'} size={12} strokeWidth={2.5} />
                      <Text className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                        {sub}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Tags */}
            {localIssue.tags && localIssue.tags.length > 0 && (
              <View>
                <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Tags
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {localIssue.tags.map((tag, i) => (
                    <View
                      key={i}
                      className="flex-row items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 dark:border-teal-700/50 dark:bg-teal-900/30">
                      <Hash color={isDark ? '#5EEAD4' : '#0F766E'} size={11} strokeWidth={2.5} />
                      <Text className="text-[11px] font-bold tracking-wide text-teal-700 dark:text-teal-300">
                        {tag.replace(/^#/, '')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Ward */}
            <View className="flex-row items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/40">
              <Text className="w-20 text-[12px] font-bold text-slate-500 dark:text-slate-400">
                Ward
              </Text>
              <Text className="flex-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                {localIssue.ward}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* REPORTED BY */}
        <SectionCard>
          <SectionHeader
            title="Reported By"
            icon={<User color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />}
          />
          <View className="px-5 py-4">
            <View className="mb-4 flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40">
                <Text className="text-[20px] font-extrabold text-blue-700 dark:text-blue-300">
                  {localIssue.citizenName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="mb-0.5 text-[17px] font-extrabold text-slate-800 dark:text-slate-100">
                  {localIssue.citizenName}
                </Text>
                <Text className="text-[12px] text-slate-400 dark:text-slate-500">Citizen</Text>
              </View>
            </View>

            <View className="gap-2.5">
              <View className="flex-row items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/40">
                <Mail color={isDark ? '#60A5FA' : '#2563EB'} size={14} strokeWidth={2.5} />
                <Text className="flex-1 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                  {localIssue.citizenEmail}
                </Text>
              </View>
              <View className="flex-row items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/40">
                <Phone color={isDark ? '#34D399' : '#059669'} size={14} strokeWidth={2.5} />
                <Text className="flex-1 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                  {localIssue.citizenPhone}
                </Text>
              </View>
              <View className="flex-row items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/40">
                <Calendar color={isDark ? '#FBBF24' : '#D97706'} size={14} strokeWidth={2.5} />
                <Text className="flex-1 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                  {formatDateFull(localIssue.dateReported)}
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
          <View className="gap-3 px-5 py-4">
            <View className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-700/40">
              <Text className="mb-1 text-[13px] font-semibold leading-5 text-slate-700 dark:text-slate-200">
                {localIssue.location}
              </Text>
              <Text className="text-[11px] text-slate-400 dark:text-slate-500">
                {localIssue.coordinates.latitude.toFixed(6)},{' '}
                {localIssue.coordinates.longitude.toFixed(6)}
              </Text>
            </View>

            <TouchableOpacity onPress={openMaps} activeOpacity={0.85} style={styles.mapsBtn}>
              <LinearGradient
                colors={['#0D9488', '#0891B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mapsBtnGradient}>
                <Navigation color="#FFFFFF" size={17} strokeWidth={2.5} />
                <Text className="flex-1 text-[14px] font-bold text-white">Open in Google Maps</Text>
                <ChevronRight color="rgba(255,255,255,0.7)" size={17} strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* DESCRIPTION */}
        <SectionCard>
          <SectionHeader title="Description" />
          <Text className="px-5 py-4 text-[14px] leading-[22px] text-slate-600 dark:text-slate-300">
            {localIssue.description}
          </Text>
        </SectionCard>

        {/* PHOTO EVIDENCE */}
        {hasPhotos && (
          <SectionCard>
            <SectionHeader
              title="Photo Evidence"
              icon={<Tag color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />}
            />
            <View className="gap-5 pb-4 pt-4">
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
              {localIssue.videoEvidence!.map((url, i) => (
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
                color={isDark ? '#94A3B8' : '#64748B'}
                size={16}
                strokeWidth={2.5}
              />
            }
          />
          <View className="px-5 py-4">
            {localIssue.issueUpdates.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-sm text-slate-400 dark:text-slate-600">No updates yet</Text>
              </View>
            ) : (
              localIssue.issueUpdates.map((upd, index) => {
                const dotColor = STATUS_DOT_COLORS[upd.status] ?? '#94A3B8';
                const isLast = index === localIssue.issueUpdates.length - 1;

                const scopeMeta =
                  upd.scope === 'citizen'
                    ? {
                        label: 'Citizen only',
                        icon: <Eye color="#0284C7" size={11} strokeWidth={2.5} />,
                        bg: 'bg-sky-50 dark:bg-sky-900/20',
                        text: 'text-sky-700 dark:text-sky-300',
                        border: 'border-sky-200 dark:border-sky-700/40',
                      }
                    : upd.scope === 'field_and_citizen'
                      ? {
                          label: 'Officer & Citizen',
                          icon: <Users color="#059669" size={11} strokeWidth={2.5} />,
                          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                          text: 'text-emerald-700 dark:text-emerald-300',
                          border: 'border-emerald-200 dark:border-emerald-700/40',
                        }
                      : {
                          label: 'Admin only',
                          icon: <ShieldAlert color="#DC2626" size={11} strokeWidth={2.5} />,
                          bg: 'bg-red-50 dark:bg-red-900/20',
                          text: 'text-red-700 dark:text-red-300',
                          border: 'border-red-200 dark:border-red-700/40',
                        };

                const roleColors: Record<string, string> = {
                  Citizen: '#2563EB',
                  UnitOfficer: '#0D9488',
                  FieldOfficer: '#D97706',
                  Admin: '#7C3AED',
                };
                const roleColor = roleColors[upd.role] ?? '#64748B';

                return (
                  <View key={upd.id} style={styles.timelineRow}>
                    <View className="items-center" style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineDot,
                          { backgroundColor: dotColor, shadowColor: dotColor },
                        ]}
                      />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    <View
                      className={`mb-4 ml-3 flex-1 overflow-hidden rounded-2xl border ${
                        isLast
                          ? 'border-teal-200 dark:border-teal-700/40'
                          : 'border-slate-100 dark:border-slate-700/30'
                      }`}>
                      {/* Header row */}
                      <View
                        className={`px-3 pb-2 pt-3 ${isLast ? 'bg-teal-50 dark:bg-teal-900/20' : 'bg-slate-50 dark:bg-slate-700/40'}`}>
                        <View className="mb-1.5 flex-row items-center justify-between">
                          <View className="flex-1 flex-row items-center gap-2">
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: dotColor,
                              }}
                            />
                            <Text className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">
                              {upd.status}
                            </Text>
                          </View>
                          <Text className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            {formatTimestamp(upd.createdAt)}
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text style={{ color: roleColor }} className="text-[11px] font-bold">
                            {upd.role === 'UnitOfficer'
                              ? 'Unit Officer'
                              : upd.role === 'FieldOfficer'
                                ? 'Field Officer'
                                : upd.role}
                          </Text>
                          {/* Scope badge */}
                          <View
                            className={`flex-row items-center gap-1 rounded-lg border px-2 py-0.5 ${scopeMeta.bg} ${scopeMeta.border}`}>
                            {scopeMeta.icon}
                            <Text className={`text-[10px] font-bold ${scopeMeta.text}`}>
                              {scopeMeta.label}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Comment body */}
                      <View
                        className={`px-3 py-2.5 ${isLast ? 'bg-teal-50/50 dark:bg-teal-900/10' : 'bg-white dark:bg-slate-800'}`}>
                        <Text className="text-[13px] leading-[20px] text-slate-600 dark:text-slate-300">
                          {upd.comment}
                        </Text>
                      </View>

                      {/* Attachments */}
                      {upd.attachments.length > 0 && (
                        <View className="gap-2 bg-white px-3 pb-3 pt-1 dark:bg-slate-800">
                          <View className="mb-1 flex-row items-center gap-1">
                            <Paperclip
                              color={isDark ? '#64748B' : '#94A3B8'}
                              size={11}
                              strokeWidth={2.5}
                            />
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              Attachments ({upd.attachments.length})
                            </Text>
                          </View>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="flex-row gap-2">
                            {upd.attachments.map((att, ai) => (
                              <Image
                                key={ai}
                                source={{ uri: att }}
                                style={styles.attachmentThumb}
                                resizeMode="cover"
                              />
                            ))}
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
            {/* Scope selector */}
            <View>
              <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Visibility
              </Text>
              <View className="flex-row gap-2">
                {(
                  [
                    {
                      value: 'citizen' as UpdateScope,
                      label: 'Citizen Only',
                      icon: <Eye size={13} strokeWidth={2.5} />,
                      activeColor: '#0284C7',
                    },
                    {
                      value: 'field_and_citizen' as UpdateScope,
                      label: 'Officer & Citizen',
                      icon: <Users size={13} strokeWidth={2.5} />,
                      activeColor: '#059669',
                    },
                    {
                      value: 'admin_only' as UpdateScope,
                      label: 'Admin Only',
                      icon: <ShieldAlert size={13} strokeWidth={2.5} />,
                      activeColor: '#DC2626',
                    },
                  ] as const
                ).map((opt) => {
                  const isActive = updateScope === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setUpdateScope(opt.value)}
                      activeOpacity={0.75}
                      style={[
                        styles.scopeBtn,
                        isActive
                          ? {
                              borderColor: opt.activeColor,
                              backgroundColor: isDark
                                ? `${opt.activeColor}20`
                                : `${opt.activeColor}10`,
                            }
                          : {},
                      ]}>
                      {React.cloneElement(opt.icon as React.ReactElement<{ color: string }>, {
                        color: isActive ? opt.activeColor : isDark ? '#64748B' : '#94A3B8',
                      })}
                      <Text
                        style={{
                          color: isActive ? opt.activeColor : isDark ? '#64748B' : '#94A3B8',
                        }}
                        className="text-[11px] font-bold"
                        numberOfLines={1}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Comment input */}
            <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
              <TextInput
                className="text-[14px] text-slate-900 dark:text-slate-100"
                placeholder="Write your update for the citizen..."
                placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                value={updateText}
                onChangeText={setUpdateText}
                multiline
                style={styles.updateInput}
              />
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
                        <View style={[styles.attachmentPreview, styles.attachmentMediaPlaceholder]}>
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
        {isSLAOverdue && (
          <SectionCard>
            <SLAOverduePanel
              issue={localIssue}
              fieldOfficers={mockFieldOfficers}
              onReassign={handleSLAReassign}
              onReject={handleSLAReject}
              onExtend={handleSLAExtend}
              onEscalate={handleSLAEscalate}
            />
          </SectionCard>
        )}

        {/* VERIFICATION (Pending) */}
        {localIssue.status === 'Pending' && (
          <SectionCard>
            <View className="flex-row border-b border-slate-100 dark:border-slate-700">
              <TouchableOpacity
                onPress={() => setVerificationTab('verify')}
                activeOpacity={0.75}
                className={`flex-1 flex-row items-center justify-center gap-2 border-b-[3px] py-4 ${
                  verificationTab === 'verify' ? 'border-emerald-500' : 'border-transparent'
                }`}>
                <CheckCircle
                  color={verificationTab === 'verify' ? '#10B981' : isDark ? '#475569' : '#9CA3AF'}
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
                  color={verificationTab === 'reject' ? '#EF4444' : isDark ? '#475569' : '#9CA3AF'}
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
                  <Text className="text-[15px] font-bold text-white">Select Rejection Reason</Text>
                </TouchableOpacity>
              </View>
            )}
          </SectionCard>
        )}

        {/* RE-VERIFICATION (Reopened) */}
        {localIssue.status === 'Reopened' && (
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
                    The citizen has re-opened this issue. Review the original concern and re-verify
                    to reassign for resolution.
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
                  color={verificationTab === 'verify' ? '#10B981' : isDark ? '#475569' : '#9CA3AF'}
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
                  color={verificationTab === 'reject' ? '#EF4444' : isDark ? '#475569' : '#9CA3AF'}
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
                onVerify={handleReverify}
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
                  <Text className="text-[15px] font-bold text-white">Select Rejection Reason</Text>
                </TouchableOpacity>
              </View>
            )}
          </SectionCard>
        )}

        {/* ASSIGN OFFICER (Verified) */}
        {localIssue.status === 'Verified' && (
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
        )}

        {/* IN PROGRESS */}
        {localIssue.status === 'In Progress' && (
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
        {localIssue.status === 'Assigned' && localIssue.afterPhotos && (
          <SectionCard>
            <View className="p-5">
              <Text className="mb-1 text-[17px] font-extrabold text-slate-800 dark:text-slate-100">
                Resolution Confirmation
              </Text>
              <Text className="mb-4 text-[13px] text-slate-500 dark:text-slate-400">
                Review work completion and confirm resolution.
              </Text>
              <TouchableOpacity
                onPress={handleMarkResolved}
                activeOpacity={0.85}
                style={styles.actionBtn}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionBtnGradient}>
                  <CheckCircle color="#FFFFFF" size={19} strokeWidth={2.5} />
                  <Text className="text-[15px] font-bold text-white">Mark as Resolved</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReopen}
                activeOpacity={0.85}
                className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-amber-400 bg-amber-50 py-3.5 dark:border-amber-500 dark:bg-amber-900/20">
                <RotateCcw color="#D97706" size={17} strokeWidth={2.5} />
                <Text className="text-[14px] font-bold text-amber-600 dark:text-amber-400">
                  Reopen Issue
                </Text>
              </TouchableOpacity>
            </View>
          </SectionCard>
        )}

        {/* PENDING UO VERIFICATION */}
        {localIssue.status === 'Pending UO Verification' && (
          <SectionCard>
            <UOVerificationPanel
              issue={localIssue}
              onApprove={handleUOApprove}
              onRework={handleUORework}
            />
          </SectionCard>
        )}

        {/* RESOLVED */}
        {/* @ts-ignore */}
        {localIssue.status === 'Resolved' && (
          <SectionCard>
            <View className="p-5">
              <View className="mb-4 flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle color="#10B981" size={22} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="mb-0.5 text-[16px] font-extrabold text-emerald-700 dark:text-emerald-400">
                    Issue Resolved
                  </Text>
                  <Text className="text-[13px] text-slate-500 dark:text-slate-400">
                    This issue has been successfully resolved
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleReopen}
                activeOpacity={0.85}
                className="flex-row items-center justify-center gap-2 rounded-2xl border-2 border-amber-400 bg-amber-50 py-3.5 dark:border-amber-500 dark:bg-amber-900/20">
                <RotateCcw color="#D97706" size={17} strokeWidth={2.5} />
                <Text className="text-[14px] font-bold text-amber-600 dark:text-amber-400">
                  Reopen if Needed
                </Text>
              </TouchableOpacity>
            </View>
          </SectionCard>
        )}
      </ScrollView>

      <AssignOfficerModal
        visible={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setPendingReassignMeta(null);
          setAssignModalMode('assign');
        }}
        officers={mockFieldOfficers}
        onAssign={handleAssign}
        mode={assignModalMode}
        currentOfficerName={localIssue.assignedOfficer}
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
              style={[styles.attachMenuHandle, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]}
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
                  style={[styles.attachMenuBannerTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
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
