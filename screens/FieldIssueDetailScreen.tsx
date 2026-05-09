import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Linking,
  Platform,
  useColorScheme,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  MessageCircle,
  Calendar,
  Play,
  Upload,
  Clock,
  TriangleAlert as AlertTriangle,
  Tag,
  FileText,
  CircleCheck as CheckCircle,
  RefreshCw,
  ChevronRight,
  Navigation,
  Video,
  ChevronLeft,
  Layers,
  Hash,
  ExternalLink,
  Send,
  Zap,
  Droplets,
  Trash2,
  Recycle,
  HeartPulse,
  Package,
  Waves,
  Camera,
  X,
  Maximize2,
  Compass,
  UserCheck,
  Mail,
  PhoneOutgoing,
  MessageSquarePlus,
  Eye,
  Users,
  ShieldAlert,
  Paperclip,
  ShieldCheck,
  Notebook,
  ImageIcon,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { Issue, IssueStatus, UpdateScope } from '../lib/types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { mockCitizenMessages } from '../lib/mockData';
import WorkExecutionFlow from 'components/WorkExecutionFlow';
import CitizenMessagingInterface from 'components/CitizenMessagingInterface';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { useUser } from 'context/UserContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { mapIssueToUI } from 'lib/issueMapper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH - 32;
const CAROUSEL_WIDTH = CONTENT_WIDTH - 56;

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

type RootStackParamList = {
  FieldIssueDetail: { issueId: string };
};
type FieldIssueDetailScreenRouteProp = RouteProp<RootStackParamList, 'FieldIssueDetail'>;

interface FileAttachment {
  uri: string;
  type: 'image' | 'video' | 'pdf';
  name: string;
  mimeType?: string;
}

const CATEGORY_COLORS: Record<
  string,
  { bg: string; darkBg: string; text: string; darkText: string; icon: string }
> = {
  road: {
    bg: '#FEF3C7',
    darkBg: '#451a03',
    text: '#92400E',
    darkText: '#FCD34D',
    icon: '#D97706',
  },
  electricity: {
    bg: '#FEF9C3',
    darkBg: '#422006',
    text: '#854D0E',
    darkText: '#FDE047',
    icon: '#CA8A04',
  },
  sanitation: {
    bg: '#DCFCE7',
    darkBg: '#14532d',
    text: '#166534',
    darkText: '#86EFAC',
    icon: '#16A34A',
  },
  water: {
    bg: '#DBEAFE',
    darkBg: '#1e3a5f',
    text: '#1E40AF',
    darkText: '#93C5FD',
    icon: '#2563EB',
  },
  drainage: {
    bg: '#E0F2FE',
    darkBg: '#0c2d4a',
    text: '#0369A1',
    darkText: '#7DD3FC',
    icon: '#0284C7',
  },
  solid_waste: {
    bg: '#FCE7F3',
    darkBg: '#4a0d2a',
    text: '#9D174D',
    darkText: '#F9A8D4',
    icon: '#DB2777',
  },
  public_health: {
    bg: '#FEE2E2',
    darkBg: '#450a0a',
    text: '#991B1B',
    darkText: '#FCA5A5',
    icon: '#DC2626',
  },
  other: {
    bg: '#D1FAE5',
    darkBg: '#064e3b',
    text: '#065F46',
    darkText: '#6EE7B7',
    icon: '#059669',
  },
};

const PRIORITY_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; darkBg: string; label: string }
> = {
  Critical: {
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FECACA',
    darkBg: 'rgba(239,68,68,0.18)',
    label: 'Critical',
  },
  High: {
    color: '#F97316',
    bg: '#FFF7ED',
    border: '#FED7AA',
    darkBg: 'rgba(249,115,22,0.18)',
    label: 'High',
  },
  Medium: {
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    darkBg: 'rgba(245,158,11,0.18)',
    label: 'Medium',
  },
  Low: {
    color: '#22C55E',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    darkBg: 'rgba(34,197,94,0.18)',
    label: 'Low',
  },
};

export const CATEGORY_LABEL_MAP: Record<string, string> = {
  road: 'Road & Infrastructure',
  electricity: 'Electricity & Lighting',
  water: 'Water Supply',
  sanitation: 'Sanitation & Waste',
  drainage: 'Drainage & Sewer',
  solid_waste: 'Solid Waste Management',
  public_health: 'Public Health',
  other: 'Other',
};

export const CATEGORY_ICON_MAP: Record<string, any> = {
  road: Navigation,
  electricity: Zap,
  water: Droplets,
  sanitation: Trash2,
  drainage: Waves,
  solid_waste: Recycle,
  public_health: HeartPulse,
  other: Package,
};

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ReactNode; label: string }
> = {
  pending: {
    color: '#475569',
    bg: '#475569',
    icon: <Clock size={13} color="#FFFFFF" strokeWidth={2.5} />,
    label: 'Pending',
  },
  verified: {
    color: '#059669',
    bg: '#059669',
    icon: <CheckCircle size={13} color="#FFFFFF" strokeWidth={2.5} />,
    label: 'Verified',
  },
  assigned: {
    color: '#2563EB',
    bg: '#2563EB',
    icon: <CheckCircle size={13} color="#FFFFFF" strokeWidth={2.5} />,
    label: 'Assigned',
  },
  in_progress: {
    color: '#D97706',
    bg: '#D97706',
    icon: <RefreshCw size={13} color="#FFFFFF" strokeWidth={2.5} />,
    label: 'In Progress',
  },
  pending_uo_verification: {
    color: '#4F46E5',
    bg: '#4F46E5',
    icon: <Clock size={13} color="#FFFFFF" strokeWidth={2.5} />,
    label: 'Submitted',
  },
  rework_required: {
    color: '#DC2626',
    bg: '#DC2626',
    icon: <AlertTriangle size={13} color="#FFFFFF" strokeWidth={2.5} />,
    label: 'Rework Required',
  },
  closed: {
    color: '#1E293B',
    bg: '#1E293B',
    icon: <CheckCircle size={13} color="#FFFFFF" strokeWidth={2.5} />,
    label: 'Closed',
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

export default function FieldIssueDetailScreen() {
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();
  const route = useRoute<FieldIssueDetailScreenRouteProp>();
  const [showWorkFlow, setShowWorkFlow] = useState(false);
  const [showStartWorkConfirm, setShowStartWorkConfirm] = useState(false);
  const [isStartingWork, setIsStartingWork] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [fullScreenVideo, setFullScreenVideo] = useState<string | null>(null);
  const carouselRef = useRef<ScrollView>(null);
  const [updateText, setUpdateText] = useState('');
  const [updateAttachments, setUpdateAttachments] = useState<FileAttachment[]>([]);
  const [updateScope, setUpdateScope] = useState<UpdateScope>('officer_and_citizen');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const pendingPicker = useRef<'camera' | 'gallery' | 'document' | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<any>(null);
  const issueId = route.params?.issueId;

  const user = useUser();

  const generateUploadUrl = useMutation(api.issuesMedia.generateUploadUrl);

  // @ts-ignore
  // For getting the Issue data by ID
  const rawIssue = useQuery(api.fieldOfficers.getIssueById, { issueId: issueId });

  const issue = mapIssueToUI(rawIssue);

  // For fetching all the Issue updates
  const issueUpdates = useQuery(
    api.issueUpdates.getByIssueId,
    // @ts-ignore
    true ? { issueId: issueId } : 'skip'
  );

  // @ts-ignore
  // For creating an update on an issue by a Field Officer
  const createIssueUpdate = useMutation(api.issueUpdates.createIssueUpdate);

  // For marking the issue to In Progress
  const startWorkMutation = useMutation(api.fieldOfficers.startWork);

  // For sending the work to the Unit Officer for verification
  const submitFieldOfficerWork = useMutation(api.fieldOfficers.submitFieldOfficerWork);

  const issueMessages = useMemo(
    () => (issue ? mockCitizenMessages.filter((m) => m.issueId === issue.id) : []),
    [issue]
  );
  const unreadMsgCount = issueMessages.filter((m) => !m.read && m.fromRole === 'Citizen').length;

  const handleBack = () => navigation.goBack();

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

  const handleStartWork = () => {
    setShowStartWorkConfirm(true);
  };

  const confirmStartWork = async () => {
    if (!issue || !user) return;
    setIsStartingWork(true);
    try {
      await startWorkMutation({
        issueId: issue.id as Id<'issues'>,
        userId: user.id as Id<'users'>,
      });
      setShowStartWorkConfirm(false);
    } catch (error) {
      console.error('Start work error:', error);
      Alert.alert('System Error', 'Failed to update issue status. Please try again.');
    } finally {
      setIsStartingWork(false);
    }
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
        issueId: issue?.id as Id<'issues'>,
        status: issue?.status as IssueStatus,
        comment: updateText as string,
        updatedBy: user?.id as Id<'users'>,
        role: 'field_officer',
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

  const uploadImageToConvex = async (uri: string) => {
    // Convert to blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Get upload URL
    const uploadUrl = await generateUploadUrl();

    // Upload to Convex storage
    const result = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': blob.type },
      body: blob,
    });

    const { storageId } = await result.json();

    return storageId;
  };

  const handleWorkFlowSubmit = async (data: {
    beforeImage: string | null;
    afterImage: string | null;
    beforeLocation: { latitude: number; longitude: number } | null;
    afterLocation: { latitude: number; longitude: number } | null;
    notes: string;
  }) => {
    if (!issue) return;

    try {
      // Upload images first to ConvexDB
      const beforePhotoId = data.beforeImage ? await uploadImageToConvex(data.beforeImage) : null;

      const afterPhotoId = data.afterImage ? await uploadImageToConvex(data.afterImage) : null;

      await submitFieldOfficerWork({
        issueId: issue.id,

        beforePhotos: beforePhotoId ? [beforePhotoId] : [],
        afterPhotos: afterPhotoId ? [afterPhotoId] : [],

        beforeLocation: data.beforeLocation || undefined,
        afterLocation: data.afterLocation || undefined,

        notes: data.notes,
        fieldOfficerId: user?.id as Id<'users'>,
      });

      // Safe Close for iOS devices
      requestAnimationFrame(() => {
        setShowWorkFlow(false);
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleContactCitizen = async () => {
    if (!issue?.citizenEmail) {
      Alert.alert(
        'Protocol Warning',
        'No verified email address associated with this secure identity.'
      );
      return;
    }

    const subject = `CityCare: Regarding Issue #${issue.issueCode}`;
    const body = `Dear ${issue.citizenName},\n\nThis is regarding the issue you reported: ${issue.title} with Issue Code: ${issue.issueCode}. \n \n The status of the issue is ${issue.status}.`;
    const url = `mailto:${issue.citizenEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to simple mailto if complex one fails
        const simpleUrl = `mailto:${issue.citizenEmail}`;
        const canOpenSimple = await Linking.canOpenURL(simpleUrl);
        if (canOpenSimple) {
          await Linking.openURL(simpleUrl);
        } else {
          Alert.alert('System Error', 'No secure email client detected on this device.');
        }
      }
    } catch (error) {
      console.error('Email Feed Error:', error);
      Alert.alert(
        'Protocol Failure',
        'An unexpected error occurred while establishing the email feed.'
      );
    }
  };

  if (!issue) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="mt-3 text-sm font-medium text-slate-400">Loading issue...</Text>
      </View>
    );
  }

  const priority = PRIORITY_CONFIG[issue.priority] ?? PRIORITY_CONFIG.Low;
  const statusCfg =
    STATUS_CONFIG[issue.status.toLowerCase()] ||
    STATUS_CONFIG[issue.status] ||
    STATUS_CONFIG.pending;
  const catColor = CATEGORY_COLORS[issue.category.toLowerCase()] ?? CATEGORY_COLORS.other;
  const slaDate = issue.slaDeadline ? new Date(issue.slaDeadline) : null;

  const openMaps = () => {
    const { latitude, longitude } = issue.coordinates;
    const label = encodeURIComponent(issue.location);
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const appleMapsUrl = `maps://?ll=${latitude},${longitude}&q=${label}`;
    const googleMapsAppUrl = `comgooglemaps://?q=${latitude},${longitude}&zoom=16`;

    if (Platform.OS === 'ios') {
      Linking.canOpenURL(googleMapsAppUrl).then((supported) => {
        Linking.openURL(supported ? googleMapsAppUrl : appleMapsUrl);
      });
    } else if (Platform.OS === 'android') {
      Linking.openURL(`geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`);
    } else {
      Linking.openURL(googleMapsUrl);
    }
  };

  const now = new Date();
  const isOverdue = slaDate ? slaDate < now : false;
  const hoursLeft = slaDate ? Math.round((slaDate.getTime() - now.getTime()) / 3600000) : null;

  const actionButton = () => {
    if (issue.status === 'assigned') {
      return (
        <TouchableOpacity onPress={handleStartWork} activeOpacity={0.85} style={styles.actionBtn}>
          <LinearGradient
            colors={['#22C55E', '#16A34A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGrad}>
            <Play color="#FFFFFF" size={20} strokeWidth={2.5} fill="#FFFFFF" />
            <Text className="ml-2 text-[16px] font-extrabold tracking-tight text-white">
              Start Work
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }
    if (issue.status === 'in_progress' || issue.status === 'rework_required') {
      return (
        <TouchableOpacity
          onPress={() => setShowWorkFlow(true)}
          activeOpacity={0.85}
          style={styles.actionBtn}>
          <LinearGradient
            colors={['#0EA5A4', '#0891B2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGrad}>
            <Upload color="#FFFFFF" size={20} strokeWidth={2.5} />
            <Text className="ml-2 text-[16px] font-extrabold tracking-tight text-white">
              {issue.status === 'rework_required' ? 'Re-upload Resolution' : 'Upload Resolution'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      {/* ── Header ── */}
      <View className="flex-row items-center border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <TouchableOpacity
          onPress={handleBack}
          className="h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800"
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft color="#64748B" size={20} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Issue Details
        </Text>
        <TouchableOpacity
          onPress={() => setShowMessaging(true)}
          className="h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-900/30"
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MessageCircle color="#0EA5A4" size={20} strokeWidth={2.5} />
          {unreadMsgCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#EF4444',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 3,
                borderWidth: 1.5,
                borderColor: '#F0FDFA',
              }}>
              <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800', lineHeight: 12 }}>
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* ── Ultra-Premium Theme-Aware Hero Card ── */}
        <View style={[styles.heroContainer, { shadowColor: isDark ? '#4F46E5' : '#1E1B4B' }]}>
          <LinearGradient
            colors={isDark ? ['#1E1B4B', '#111827', '#020617'] : ['#0D9488', '#0891B2', '#1E1B4B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroCard,
              { borderColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.15)' },
            ]}>
            {/* Multi-layered Glow Effects */}
            <View
              style={[
                styles.heroGlowPrimary,
                { backgroundColor: isDark ? 'rgba(79,70,229,0.15)' : 'rgba(94,234,212,0.15)' },
              ]}
            />
            <View
              style={[
                styles.heroGlowSecondary,
                { backgroundColor: isDark ? 'rgba(67,56,202,0.2)' : 'rgba(79,70,229,0.2)' },
              ]}
            />
            <View style={styles.heroShineOverlay} />

            {/* Top Row: Meta Info */}
            <View className="mb-6 flex-row items-center justify-between">
              <View style={styles.heroIdContainer}>
                <Hash size={11} color="rgba(255,255,255,0.6)" strokeWidth={3} />
                <Text style={styles.heroIdText}>{issue.issueCode}</Text>
              </View>

              {statusCfg && (
                <View
                  style={[
                    styles.heroStatusBadge,
                    {
                      borderColor: 'rgba(255,255,255,0.3)',
                      backgroundColor: statusCfg.color,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 6,
                    },
                  ]}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: '#FFFFFF',
                        shadowColor: '#FFFFFF',
                        shadowOpacity: 1,
                        shadowRadius: 4,
                        elevation: 4,
                      },
                    ]}
                  />
                  <Text style={[styles.heroStatusText, { color: '#FFFFFF', fontWeight: '900' }]}>
                    {statusCfg.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Issue Title */}
            <Text style={styles.heroTitle} numberOfLines={2}>
              {issue.title}
            </Text>

            {/* High-Impact Feature Chips */}
            <View className="mb-6 flex-row flex-wrap items-center gap-3">
              {/* Category Chip */}
              <View
                style={[
                  styles.heroSolidChip,
                  {
                    backgroundColor: catColor.icon,
                    borderColor: 'rgba(255,255,255,0.25)',
                  },
                ]}>
                {(() => {
                  const IconComp =
                    CATEGORY_ICON_MAP[issue.category.toLowerCase()] || CATEGORY_ICON_MAP.other;
                  return <IconComp size={14} color="#FFFFFF" strokeWidth={2.5} />;
                })()}
                <Text style={styles.heroSolidChipText}>
                  {CATEGORY_LABEL_MAP[issue.category.toLowerCase()] || issue.category}
                </Text>
              </View>

              {/* Priority Chip */}
              <View
                style={[
                  styles.heroSolidChip,
                  {
                    backgroundColor: priority.color,
                    borderColor: 'rgba(255,255,255,0.25)',
                  },
                ]}>
                <AlertTriangle size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.heroSolidChipText}>{priority.label} Priority</Text>
              </View>

              {/* Ward Chip */}
              {issue.city && (
                <View
                  style={[
                    styles.heroSolidChip,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#334155',
                      borderColor: 'rgba(255,255,255,0.15)',
                    },
                  ]}>
                  <MapPin size={14} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.heroSolidChipText}>{issue.city}</Text>
                </View>
              )}
            </View>

            {/* SLA Intelligence Widget */}
            {slaDate && (
              <View
                style={[
                  styles.slaWidget,
                  isOverdue && styles.slaWidgetOverdue,
                  { backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(15,23,42,0.4)' },
                ]}>
                <View style={styles.slaHeaderRow}>
                  <View className="flex-row items-center gap-3">
                    <View
                      style={[
                        styles.slaIconBox,
                        isOverdue ? styles.slaIconBoxRed : styles.slaIconBoxTeal,
                      ]}>
                      <Clock size={18} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text style={styles.slaLabelSmall}>SLA DEADLINE</Text>
                      <Text style={styles.slaValueMain}>
                        {slaDate.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.slaTimeBadge}>
                    <Text
                      style={[
                        styles.slaTimeValue,
                        isOverdue ? styles.textRed300 : styles.textTeal200,
                      ]}>
                      {isOverdue ? `${Math.abs(hoursLeft!)}h Overdue` : `${hoursLeft}h Left`}
                    </Text>
                  </View>
                </View>

                {/* Intelligent Progress System */}
                <View style={styles.slaProgressSystem}>
                  <View style={styles.slaProgressBarTrack}>
                    <LinearGradient
                      colors={isOverdue ? ['#EF4444', '#B91C1C'] : ['#2DD4BF', '#0D9488']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.slaProgressBarFill,
                        {
                          width: isOverdue
                            ? '100%'
                            : `${Math.max(10, Math.min(100, (hoursLeft! / 48) * 100))}%`,
                        },
                      ]}
                    />
                  </View>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text style={styles.slaProgressSubtext}>
                      {isOverdue ? 'SLA Compromised' : 'Response Timeline'}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <View
                        className={`h-1.5 w-1.5 rounded-full ${isOverdue ? 'bg-red-400' : 'bg-teal-400'}`}
                      />
                      <Text style={styles.slaProgressStatus}>
                        {isOverdue ? 'Priority Action' : 'Within Limits'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* ── Rework Required Banner ── */}
        {issue.status === 'rework_required' && (
          <ReworkBanner reason={issue.reworkReasons} comment={issue.reworkNote} />
        )}

        {/* ── Work Submitted Banner ── */}
        {issue.status === 'pending_uo_verification' && (
          <WorkSubmittedBanner
            timestamp={issue.submissionTimestamp}
            comment={issue.submissionComment ?? issue.foResolutionDescription}
          />
        )}

        {/* ── Category Card ── */}
        <View style={styles.descriptionContainer}>
          <LinearGradient
            colors={isDark ? ['#1E1B4B', '#0F172A', '#020617'] : ['#FFFFFF', '#F0FDFA', '#F8FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.descriptionCard,
              { borderColor: isDark ? 'rgba(14,165,164,0.3)' : 'rgba(14,165,164,0.15)' },
            ]}>
            {/* Cinematic Effects Layers */}
            <View
              style={[
                styles.descriptionGlow,
                { backgroundColor: isDark ? 'rgba(14,165,164,0.15)' : 'rgba(14,165,164,0.08)' },
              ]}
            />
            <View style={styles.descriptionWatermark}>
              <Layers
                size={180}
                color={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(14,165,164,0.03)'}
                strokeWidth={1}
              />
            </View>

            {/* Header Content */}
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-4">
                <LinearGradient colors={['#0EA5A4', '#0D9488']} style={styles.descriptionIconBox}>
                  <Layers size={22} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.descriptionHeaderTitle,
                      { color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 2 },
                    ]}>
                    Classification
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ gap: 20 }}>
              {/* ELITE CATEGORY DISPLAY */}
              <View>
                <Text style={[styles.premiumCatLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  PRIMARY DOMAIN
                </Text>
                <View
                  style={[
                    styles.eliteCatBadge,
                    {
                      backgroundColor: isDark ? catColor.darkBg : catColor.bg,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    },
                  ]}>
                  <View style={[styles.eliteCatIconBox, { backgroundColor: catColor.icon }]}>
                    {(() => {
                      const IconComp =
                        CATEGORY_ICON_MAP[issue.category.toLowerCase()] || CATEGORY_ICON_MAP.other;
                      return <IconComp size={18} color="#FFFFFF" strokeWidth={2.5} />;
                    })()}
                  </View>
                  <Text style={[styles.eliteCatText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {CATEGORY_LABEL_MAP[issue.category.toLowerCase()] || issue.category}
                  </Text>
                </View>
              </View>

              {/* BREATHTAKING SUB-CATEGORIES */}
              {issue.subCategories && issue.subCategories.length > 0 && (
                <View>
                  <Text style={[styles.premiumCatLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    SPECIALIZED SUB-DOMAINS
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2.5">
                    {issue.subCategories.map((sub, i) => (
                      <View
                        key={i}
                        style={[
                          styles.frostedSubCatChip,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                          },
                        ]}>
                        <Tag size={12} color="#0EA5A4" strokeWidth={2.5} />
                        <Text
                          style={[
                            styles.frostedSubCatText,
                            { color: isDark ? '#E2E8F0' : '#475569' },
                          ]}>
                          {sub}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* SOPHISTICATED TAGS */}
              {issue.tags && issue.tags.length > 0 && (
                <View>
                  <Text style={[styles.premiumCatLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    INTEL_TAGS
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {issue.tags.map((tag, i) => (
                      <View key={i} style={styles.intelTag}>
                        <Hash size={10} color="#0EA5A4" strokeWidth={3} />
                        <Text style={styles.intelTagText}>
                          {tag.replace(/^#/, '').toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* City FOOTER */}
              <View
                style={[
                  styles.premiumWardFooter,
                  { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                ]}>
                <View className="flex-row items-center gap-2">
                  <MapPin size={14} color="#0EA5A4" strokeWidth={2.5} />
                  <Text
                    style={[styles.premiumWardLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    ASSIGNED REGION
                  </Text>
                </View>
                <Text style={[styles.premiumWardValue, { color: isDark ? '#5EEAD4' : '#0D9488' }]}>
                  {issue.city}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Description Card ── */}
        <View style={styles.descriptionContainer}>
          <LinearGradient
            colors={isDark ? ['#1E1B4B', '#0F172A', '#020617'] : ['#FFFFFF', '#F0FDFA', '#F8FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.descriptionCard,
              { borderColor: isDark ? 'rgba(14,165,164,0.3)' : 'rgba(14,165,164,0.15)' },
            ]}>
            {/* Cinematic Effects Layers */}
            <View
              style={[
                styles.descriptionGlow,
                { backgroundColor: isDark ? 'rgba(14,165,164,0.15)' : 'rgba(14,165,164,0.08)' },
              ]}
            />
            <View style={styles.descriptionShine} />
            <View style={styles.descriptionWatermark}>
              <FileText
                size={180}
                color={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(14,165,164,0.03)'}
                strokeWidth={1}
              />
            </View>

            {/* Header Content */}
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-3.5">
                <LinearGradient colors={['#0EA5A4', '#0D9488']} style={styles.descriptionIconBox}>
                  <FileText size={20} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.descriptionHeaderTitle,
                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                    ]}>
                    Description
                  </Text>
                  <Text style={styles.descriptionSubtitle}>REPORTED DETAILS</Text>
                </View>
              </View>
            </View>

            {/* Content with Intelligence Border */}
            <View style={styles.descriptionContentWrapper}>
              <View style={styles.descriptionAccentLine} />
              <View style={styles.descriptionContentBox}>
                <Text style={[styles.descriptionText, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                  {issue.description}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Photo Evidence ── */}
        {issue.images && issue.images.length > 0 && (
          <View style={styles.descriptionContainer}>
            <LinearGradient
              colors={
                isDark ? ['#1E1B4B', '#0F172A', '#020617'] : ['#FFFFFF', '#F0FDFA', '#F8FAFC']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.descriptionCard,
                {
                  borderColor: isDark ? 'rgba(14,165,164,0.3)' : 'rgba(14,165,164,0.15)',
                  paddingBottom: 20,
                },
              ]}>
              {/* Cinematic Effects Layers */}
              <View
                style={[
                  styles.descriptionGlow,
                  { backgroundColor: isDark ? 'rgba(14,165,164,0.15)' : 'rgba(14,165,164,0.08)' },
                ]}
              />
              <View style={styles.descriptionWatermark}>
                <Camera
                  size={180}
                  color={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(14,165,164,0.03)'}
                  strokeWidth={1}
                />
              </View>

              {/* Header Content */}
              <View className="mb-6 flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-4">
                  <LinearGradient colors={['#0EA5A4', '#0D9488']} style={styles.descriptionIconBox}>
                    <Camera size={22} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.descriptionHeaderTitle,
                        { color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 2 },
                      ]}>
                      Evidence Photos
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text
                        style={[
                          styles.descriptionSubtitle,
                          { color: isDark ? '#5EEAD4' : '#0EA5A4', opacity: 1 },
                        ]}>
                        VISUAL VERIFICATION
                      </Text>
                      <View
                        style={[
                          styles.itemsBadge,
                          {
                            backgroundColor: isDark
                              ? 'rgba(14,165,164,0.15)'
                              : 'rgba(14,165,164,0.08)',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.itemsBadgeText,
                            { color: isDark ? '#5EEAD4' : '#0D9488' },
                          ]}>
                          {issue.images.length} FILES
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Enhanced Carousel */}
              <View style={styles.carouselWrapper}>
                <View style={styles.premiumCarouselContainer}>
                  <ScrollView
                    ref={carouselRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
                      setActiveImageIndex(idx);
                    }}
                    style={{ width: CAROUSEL_WIDTH }}>
                    {issue.images.map((img, index) => (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.9}
                        onPress={() => setFullScreenImage(img)}
                        style={[styles.premiumCarouselSlide, { width: CAROUSEL_WIDTH }]}>
                        <Image
                          source={{ uri: img }}
                          style={styles.premiumCarouselImage}
                          resizeMode="cover"
                        />

                        <LinearGradient
                          colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.7)']}
                          style={styles.carouselPremiumGradient}
                        />

                        {/* Floating Badge on Image */}
                        <View style={styles.imageFloatingBadge}>
                          <Text style={styles.imageFloatingBadgeText}>SECURED EVIDENCE</Text>
                        </View>

                        <View style={styles.premiumCarouselCounter}>
                          <Text style={styles.premiumCarouselCounterText}>
                            {index + 1} / {issue.images!.length}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Glassmorphic Arrows */}
                  {activeImageIndex > 0 && (
                    <TouchableOpacity
                      style={[styles.premiumCarouselArrow, styles.premiumCarouselArrowLeft]}
                      onPress={() => {
                        const newIdx = activeImageIndex - 1;
                        carouselRef.current?.scrollTo({
                          x: newIdx * CAROUSEL_WIDTH,
                          animated: true,
                        });
                        setActiveImageIndex(newIdx);
                      }}
                      activeOpacity={0.9}>
                      <BlurView intensity={30} style={StyleSheet.absoluteFill} />
                      <ChevronLeft size={20} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                  )}
                  {activeImageIndex < issue.images.length - 1 && (
                    <TouchableOpacity
                      style={[styles.premiumCarouselArrow, styles.premiumCarouselArrowRight]}
                      onPress={() => {
                        const newIdx = activeImageIndex + 1;
                        carouselRef.current?.scrollTo({
                          x: newIdx * CAROUSEL_WIDTH,
                          animated: true,
                        });
                        setActiveImageIndex(newIdx);
                      }}
                      activeOpacity={0.9}>
                      <BlurView intensity={30} style={StyleSheet.absoluteFill} />
                      <ChevronRight size={20} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* High-Fidelity Indicators */}
                {issue.images.length > 1 && (
                  <View style={styles.premiumDotRow}>
                    {issue.images.map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => {
                          carouselRef.current?.scrollTo({
                            x: i * CAROUSEL_WIDTH,
                            animated: true,
                          });
                          setActiveImageIndex(i);
                        }}
                        style={styles.dotTouchArea}>
                        <View
                          style={[
                            styles.premiumDot,
                            i === activeImageIndex
                              ? styles.premiumDotActive
                              : styles.premiumDotInactive,
                          ]}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── Video Evidence Card ── */}
        {issue.videoEvidence && issue.videoEvidence.length > 0 && (
          <View style={styles.descriptionContainer}>
            <LinearGradient
              colors={
                isDark ? ['#1E1B4B', '#0F172A', '#020617'] : ['#FFFFFF', '#F0FDFA', '#F8FAFC']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.descriptionCard,
                { borderColor: isDark ? 'rgba(14,165,164,0.3)' : 'rgba(14,165,164,0.15)' },
              ]}>
              {/* Cinematic Effects Layers */}
              <View
                style={[
                  styles.descriptionGlow,
                  { backgroundColor: isDark ? 'rgba(14,165,164,0.15)' : 'rgba(14,165,164,0.08)' },
                ]}
              />
              <View style={styles.descriptionWatermark}>
                <Video
                  size={180}
                  color={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(14,165,164,0.03)'}
                  strokeWidth={1}
                />
              </View>

              {/* Header Content */}
              <View className="mb-6 flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-4">
                  <LinearGradient colors={['#0EA5A4', '#0D9488']} style={styles.descriptionIconBox}>
                    <Video size={22} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.descriptionHeaderTitle,
                        { color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 2 },
                      ]}>
                      Multimedia Feed
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text
                        style={[
                          styles.descriptionSubtitle,
                          { color: isDark ? '#5EEAD4' : '#0EA5A4' },
                        ]}>
                        DYNAMIC EVIDENCE
                      </Text>
                      <View
                        style={[
                          styles.itemsBadge,
                          {
                            backgroundColor: isDark
                              ? 'rgba(14,165,164,0.15)'
                              : 'rgba(14,165,164,0.08)',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.itemsBadgeText,
                            { color: isDark ? '#5EEAD4' : '#0D9488' },
                          ]}>
                          {issue.videoEvidence.length} CLIPS
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Cinematic Tabs */}
              <View style={styles.premiumVideoTabRow}>
                {issue.videoEvidence.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      setActiveVideoIndex(i);
                      setPlayingVideo(null);
                    }}
                    style={[
                      styles.premiumVideoTab,
                      i === activeVideoIndex
                        ? styles.premiumVideoTabActive
                        : styles.premiumVideoTabInactive,
                      { borderColor: isDark ? 'rgba(14,165,164,0.2)' : 'rgba(14,165,164,0.1)' },
                    ]}
                    activeOpacity={0.8}>
                    {i === activeVideoIndex && <View style={styles.premiumTabActiveGlow} />}
                    <Text
                      style={[
                        styles.premiumVideoTabText,
                        i === activeVideoIndex
                          ? { color: '#FFFFFF', fontWeight: '900' }
                          : { color: isDark ? '#64748B' : '#94A3B8' },
                      ]}>
                      CLIP {i + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Refined Multimedia Player */}
              <View
                style={[
                  styles.premiumVideoContainer,
                  { borderColor: isDark ? 'rgba(14,165,164,0.3)' : 'rgba(14,165,164,0.1)' },
                ]}>
                {playingVideo === activeVideoIndex ? (
                  <View style={{ flex: 1 }}>
                    <WebView
                      source={{ uri: issue.videoEvidence[activeVideoIndex] }}
                      style={styles.webViewVideo}
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={true}
                      javaScriptEnabled
                    />

                    {/* Controls Overlay */}
                    <View style={styles.videoPlayerControls}>
                      <TouchableOpacity
                        style={styles.playerControlBtn}
                        onPress={() => setFullScreenVideo(issue.videoEvidence[activeVideoIndex])}
                        activeOpacity={0.8}>
                        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                        <Maximize2 size={16} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.playerControlBtn}
                        onPress={() => setPlayingVideo(null)}
                        activeOpacity={0.8}>
                        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                        <X size={16} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.videoThumbnailWrapper}>
                    <LinearGradient
                      colors={
                        isDark
                          ? ['#1E1B4B', '#0EA5A4', '#0F172A']
                          : ['#0D9488', '#0891B2', '#075985']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.videoThumbnailGrad}
                    />
                    <View style={styles.videoOverlayContent}>
                      <TouchableOpacity
                        onPress={() => setPlayingVideo(activeVideoIndex)}
                        style={styles.premiumPlayButton}
                        activeOpacity={0.85}>
                        <View style={styles.playRipple} />
                        <Play size={36} color="#FFFFFF" strokeWidth={2.5} fill="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Multimedia Metadata Badge */}
                    <View style={styles.videoDirectBadge}>
                      <Text style={styles.videoDirectBadgeText}>
                        SECURE_STREAM_0{activeVideoIndex + 1}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── Location Card ── */}
        <View style={styles.descriptionContainer}>
          <LinearGradient
            colors={isDark ? ['#1E1B4B', '#0F172A', '#020617'] : ['#FFFFFF', '#F0FDFA', '#F8FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.descriptionCard,
              { borderColor: isDark ? 'rgba(14,165,164,0.3)' : 'rgba(14,165,164,0.15)' },
            ]}>
            {/* Cinematic Effects Layers */}
            <View
              style={[
                styles.descriptionGlow,
                { backgroundColor: isDark ? 'rgba(14,165,164,0.15)' : 'rgba(14,165,164,0.08)' },
              ]}
            />
            <View style={styles.descriptionWatermark}>
              <Navigation
                size={180}
                color={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(14,165,164,0.03)'}
                strokeWidth={1}
              />
            </View>

            {/* Header Content */}
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-4">
                <LinearGradient colors={['#0EA5A4', '#0D9488']} style={styles.descriptionIconBox}>
                  <MapPin size={22} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.descriptionHeaderTitle,
                      { color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 2 },
                    ]}>
                    Location
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text
                      style={[
                        styles.descriptionSubtitle,
                        { color: isDark ? '#5EEAD4' : '#0EA5A4' },
                      ]}>
                      GEOSPATIAL DATA
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Cinematic Geo-Widget */}
            <TouchableOpacity
              onPress={openMaps}
              activeOpacity={0.82}
              style={styles.premiumGeoWidget}>
              <LinearGradient
                colors={
                  isDark ? ['rgba(30,41,59,0.5)', 'rgba(15,23,42,0.8)'] : ['#F8FAFC', '#F1F5F9']
                }
                style={styles.premiumGeoCard}>
                <View className="flex-row items-center gap-5">
                  <View className="flex-1">
                    <Text
                      style={[styles.premiumGeoAddress, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                      {issue.location}
                    </Text>

                    {/* Professional Geospatial Data Pillars */}
                    <View className="mt-4 flex-row items-center gap-3">
                      <View
                        style={[
                          styles.geoDataPillar,
                          { backgroundColor: isDark ? 'rgba(14,165,164,0.12)' : '#F0FDFA' },
                        ]}>
                        <Compass size={10} color="#0EA5A4" strokeWidth={3} />
                        <Text style={styles.geoPillarLabel}>LAT</Text>
                        <Text style={styles.geoPillarValue}>
                          {issue.coordinates.latitude.toFixed(6)}°
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.geoDataPillar,
                          { backgroundColor: isDark ? 'rgba(14,165,164,0.12)' : '#F0FDFA' },
                        ]}>
                        <Compass size={10} color="#0EA5A4" strokeWidth={3} className="rotate-90" />
                        <Text style={styles.geoPillarLabel}>LNG</Text>
                        <Text style={styles.geoPillarValue}>
                          {issue.coordinates.longitude.toFixed(6)}°
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.premiumGeoActionBtn}>
                    <ExternalLink size={18} color="#0EA5A4" strokeWidth={2.5} />
                  </View>
                </View>

                {/* Bottom Navigation Ribbon */}
                <View
                  style={[
                    styles.premiumGeoRibbon,
                    { borderTopColor: isDark ? 'rgba(14,165,164,0.2)' : 'rgba(14,165,164,0.1)' },
                  ]}>
                  <View className="flex-row items-center gap-2">
                    <Navigation size={14} color="#0EA5A4" strokeWidth={2.5} />
                    <Text style={styles.premiumGeoRibbonText}>NAVIGATE VIA GOOGLE MAPS</Text>
                  </View>
                  <ChevronRight size={14} color="#0EA5A4" strokeWidth={2.5} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* ── Citizen Card ── */}
        <View style={styles.descriptionContainer}>
          <LinearGradient
            colors={isDark ? ['#1E1B4B', '#0F172A', '#020617'] : ['#FFFFFF', '#F0FDFA', '#F8FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.descriptionCard,
              { borderColor: isDark ? 'rgba(14,165,164,0.3)' : 'rgba(14,165,164,0.15)' },
            ]}>
            {/* Cinematic Effects Layers */}
            <View
              style={[
                styles.descriptionGlow,
                { backgroundColor: isDark ? 'rgba(14,165,164,0.15)' : 'rgba(14,165,164,0.08)' },
              ]}
            />
            <View style={styles.descriptionWatermark}>
              <UserCheck
                size={180}
                color={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(14,165,164,0.03)'}
                strokeWidth={1}
              />
            </View>

            {/* Header Content */}
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-4">
                <LinearGradient colors={['#0EA5A4', '#0D9488']} style={styles.descriptionIconBox}>
                  <User size={22} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.descriptionHeaderTitle,
                      { color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 2 },
                    ]}>
                    Reporter Info
                  </Text>
                </View>
              </View>
            </View>

            {/* Elite Profile Widget */}
            <View style={styles.citizenProfileArea}>
              <View className="mb-6 flex-row items-center gap-5">
                <View style={styles.citizenAvatarBox}>
                  <LinearGradient colors={['#1E1B4B', '#0EA5A4']} style={StyleSheet.absoluteFill} />
                  <User size={32} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text
                    style={[styles.citizenPrimaryName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {issue.citizenName}
                  </Text>
                  <Text
                    style={[styles.citizenStatusTag, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    CityCare Member
                  </Text>
                </View>
              </View>

              <View style={styles.citizenDataGrid}>
                <View
                  style={[
                    styles.citizenDataRow,
                    { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                  ]}>
                  <View className="flex-row items-center gap-3">
                    <View style={styles.citizenMiniIcon}>
                      <Phone size={12} color="#0EA5A4" strokeWidth={2.5} />
                    </View>
                    <Text
                      style={[styles.citizenDataLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      PHONE
                    </Text>
                  </View>
                  <Text
                    style={[styles.citizenDataValue, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                    {issue.citizenPhone}
                  </Text>
                </View>

                {issue.citizenEmail && (
                  <View style={styles.citizenDataRow}>
                    <View className="flex-row items-center gap-3">
                      <View style={styles.citizenMiniIcon}>
                        <Mail size={12} color="#0EA5A4" strokeWidth={2.5} />
                      </View>
                      <Text
                        style={[
                          styles.citizenDataLabel,
                          { color: isDark ? '#94A3B8' : '#64748B' },
                        ]}>
                        EMAIL
                      </Text>
                    </View>
                    <Text
                      style={[styles.citizenDataValue, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                      {issue.citizenEmail}
                    </Text>
                  </View>
                )}
              </View>

              {/* Flagship Communication Trigger */}
              <TouchableOpacity
                onPress={handleContactCitizen}
                activeOpacity={0.85}
                style={styles.flagshipContactBtn}>
                <LinearGradient
                  colors={['#0EA5A4', '#0D9488', '#0F766E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.flagshipContactGrad}>
                  <View style={styles.flagshipContactRipple} />
                  <View style={styles.flagshipContactIconBox}>
                    <Mail size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text style={styles.flagshipContactTitle}>CONTACT REPORTER</Text>
                    <Text style={styles.flagshipContactSub}>SECURE FO COORDINATION</Text>
                  </View>
                  <View style={styles.flagshipContactArrow}>
                    <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* ── Issue Updates ── */}
        <SectionCard>
          <SectionHeader
            title="Operations Log"
            icon={<MessageSquarePlus color="#0EA5A4" size={20} strokeWidth={2.5} />}
          />

          <View className="bg-slate-50/30 px-5 py-6 dark:bg-slate-900/40">
            {issueUpdates?.length === 0 ? (
              <View className="items-center py-12">
                <View style={styles.emptyLogIconBox}>
                  <MessageSquarePlus
                    color={isDark ? '#475569' : '#CBD5E1'}
                    size={24}
                    strokeWidth={1.5}
                  />
                </View>
                <Text style={styles.emptyLogText}>NO OPERATIONAL UPDATES DETECTED</Text>
              </View>
            ) : (
              // @ts-ignore
              (issueUpdates ?? []).map((upd, index: number) => {
                const statusColor = STATUS_DOT_COLORS[upd.status] ?? '#94A3B8';
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
                  <View key={upd._id} style={styles.intelTimelineRow}>
                    {/* Cinematic Timeline Track */}
                    <View style={styles.timelineTrack}>
                      <View style={[styles.timelineNode, { backgroundColor: statusColor }]}>
                        {isLatest && (
                          <View
                            style={[styles.timelineNodePulse, { backgroundColor: statusColor }]}
                          />
                        )}
                      </View>
                      {!isLast && (
                        <LinearGradient
                          colors={[statusColor, 'rgba(148,163,184,0.1)']}
                          style={styles.timelineVector}
                        />
                      )}
                    </View>

                    {/* Intelligence Payload Card */}
                    <View style={[styles.intelPayloadCard, { borderTopColor: statusColor }]}>
                      <LinearGradient
                        colors={isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F8FAFC']}
                        style={StyleSheet.absoluteFill}
                      />

                      {/* Payload Header - Multi-Tier Responsive */}
                      <View style={styles.intelPayloadHeader}>
                        <View className="flex-1 pr-2">
                          <Text
                            style={[
                              styles.intelPayloadStatus,
                              { color: isDark ? '#FFFFFF' : '#1E293B' },
                            ]}>
                            {STATUS_LABELS[upd.status] || upd.status}
                          </Text>
                          <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
                            <View
                              style={[
                                styles.roleMicroBadge,
                                { borderColor: roleMeta.color + '33' },
                              ]}>
                              {roleMeta.icon}
                              <Text style={[styles.roleMicroText, { color: roleMeta.color }]}>
                                {roleMeta.label}
                              </Text>
                            </View>
                            <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              •
                            </Text>
                            <Text className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              {upd.updater?.fullName || 'Anonymous'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.intelPayloadMeta}>
                          <Text style={styles.intelPayloadTime}>
                            {formatTimestamp(upd.createdAt)}
                          </Text>
                          <View
                            style={[
                              styles.visibilityTag,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : 'rgba(0,0,0,0.04)',
                              },
                            ]}>
                            {upd.scope === 'citizen' ? (
                              <Eye size={9} color="#64748B" />
                            ) : (
                              <Users size={9} color="#64748B" />
                            )}
                            <Text style={styles.visibilityTagText}>
                              {upd.scope === 'officer_and_citizen' ? 'PUBLIC' : 'INTERNAL'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Content Area */}
                      {upd.comment && (
                        <View className="px-4 py-4">
                          <Text
                            style={[
                              styles.intelPayloadComment,
                              { color: isDark ? '#CBD5E1' : '#475569' },
                            ]}>
                            {upd.comment}
                          </Text>
                        </View>
                      )}

                      {/* Field Evidence Area */}
                      {upd.attachments?.length > 0 && (
                        <View style={styles.mediaIntelRegion}>
                          <View className="mb-3 flex-row items-center gap-2">
                            <View style={styles.mediaIntelLine} />
                            <Text style={styles.mediaIntelTitle}>
                              FIELD EVIDENCE ({upd.attachments.length})
                            </Text>
                          </View>

                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 12 }}>
                            {upd.attachments.map((att: any, ai: number) => {
                              const isImage = att.contentType?.startsWith('image');
                              const isVideo = att.contentType?.startsWith('video');

                              return (
                                <TouchableOpacity
                                  key={ai}
                                  activeOpacity={0.8}
                                  onPress={() =>
                                    setPreviewAttachment({
                                      ...att,
                                      type: isImage ? 'image' : isVideo ? 'video' : 'pdf',
                                    })
                                  }
                                  style={styles.mediaIntelThumbWrapper}>
                                  {isImage ? (
                                    <Image
                                      source={{ uri: att.url }}
                                      style={styles.mediaIntelThumb}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View
                                      style={[
                                        styles.mediaIntelThumb,
                                        {
                                          backgroundColor: '#0F172A',
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                        },
                                      ]}>
                                      <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                                    </View>
                                  )}
                                  <View style={styles.mediaTypeTag}>
                                    <Text style={styles.mediaTypeTagText}>
                                      {isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'PDF'}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
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
            {/* Scope Selector */}
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
                      value: 'officer_and_citizen' as UpdateScope,
                      label: 'UO & Citizen',
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
                    <Notebook color={isDark ? '#FBBF24' : '#F59E0B'} size={15} strokeWidth={2.5} />
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

        <View className="h-6" />
      </ScrollView>

      {/* ── Footer CTA ── */}
      {actionButton() && (
        <View className="border-t border-slate-100 bg-white px-5 pb-6 pt-4 dark:border-slate-800 dark:bg-slate-900">
          {actionButton()}
        </View>
      )}

      {/* ── Start Work Confirmation Modal ── */}
      <Modal
        visible={showStartWorkConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStartWorkConfirm(false)}>
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={80}
            style={StyleSheet.absoluteFill}
            tint={isDark ? 'dark' : 'light'}
          />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowStartWorkConfirm(false)}
          />

          <View style={[styles.confirmModalContent, isDark ? styles.modalDark : styles.modalLight]}>
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeaderIcon}>
              <Play color="#FFFFFF" size={32} strokeWidth={2.5} fill="#FFFFFF" />
            </LinearGradient>

            <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Begin Mission?
            </Text>

            <View style={styles.modalIssueInfo}>
              <Text style={[styles.modalIssueName, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                {issue.title}
              </Text>
              <View className="flex flex-row items-center justify-center">
                <View style={styles.modalIssueCodeBox}>
                  <Hash size={12} color="#22C55E" strokeWidth={3} />
                  <Text style={styles.modalIssueCodeText}>{issue.issueCode}</Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.modalWarningBox,
                { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)' },
              ]}>
              <ShieldAlert size={18} color="#22C55E" />
              <Text style={[styles.modalWarningText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                Status will become <Text style={{ fontWeight: '900' }}>In Progress</Text>. Only
                admins/Unit Officers can change it after this.
              </Text>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                onPress={() => setShowStartWorkConfirm(false)}
                style={[styles.modalCancelBtn, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <Text style={[styles.modalCancelText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmStartWork}
                disabled={isStartingWork}
                activeOpacity={0.8}
                style={styles.modalConfirmBtn}>
                <LinearGradient
                  colors={['#22C55E', '#15803D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmGrad}>
                  {isStartingWork ? (
                    <RefreshCw size={20} color="#FFFFFF" strokeWidth={2.5} />
                  ) : (
                    <>
                      <Text style={styles.modalConfirmText}>Confirm</Text>
                      <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWorkFlow}
        animationType="slide"
        transparent={true}
        onDismiss={() => {
          // Trigger alert only after modal is fully dismissed to prevent iOS freezes
          Alert.alert(
            'Protocol Success',
            `Resolution Protocol for Issue #${issue?.issueCode} has been successfully logged. Your data is now pending Unit Officer verification.`,
            [{ text: 'Acknowledged', style: 'default' }]
          );
        }}
        onRequestClose={() => setShowWorkFlow(false)}>
        <WorkExecutionFlow
          issueId={issue.id}
          previousWork={{
            afterPhotos: issue.afterPhotos,
            afterLocation: issue.afterLocation,
            beforePhotos: issue.beforePhotos,
            beforeLocation: issue.beforeLocation,
            notes: issue.foResolutionNotes,
          }}
          status={issue.status}
          onClose={() => setShowWorkFlow(false)}
          onSubmit={handleWorkFlowSubmit}
        />
      </Modal>

      <CitizenMessagingInterface
        visible={showMessaging}
        onClose={() => setShowMessaging(false)}
        // @ts-ignore
        issue={issue}
        initialMessages={issueMessages}
      />

      {/* ── Full Screen Image Preview ── */}
      <Modal
        visible={fullScreenImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}>
        <View style={styles.fullScreenOverlay}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

          <TouchableOpacity
            style={styles.fullScreenCloseBtn}
            onPress={() => setFullScreenImage(null)}
            activeOpacity={0.7}>
            <X size={32} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
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
        <View style={styles.fullScreenOverlay}>
          <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />

          <TouchableOpacity
            style={styles.fullScreenCloseBtn}
            onPress={() => setFullScreenVideo(null)}
            activeOpacity={0.7}>
            <X size={32} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          {fullScreenVideo && (
            <View style={styles.fullScreenVideoWrapper}>
              <WebView
                source={{ uri: fullScreenVideo }}
                style={styles.fullScreenVideoPlayer}
                allowsInlineMediaPlayback={false}
                javaScriptEnabled
              />
            </View>
          )}
        </View>
      </Modal>

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
    </SafeAreaView>
  );
}

function ReworkBanner({ reason, comment }: { reason?: string[]; comment?: string }) {
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={styles.reworkBannerWrap}>
      <LinearGradient
        colors={
          isDark
            ? ['#7F1D1D', '#991B1B', '#450A0A'] // 🌙 dark red gradient
            : ['#FF6B35', '#F97316', '#EA580C']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.reworkGrad}>
        {/* ICON */}
        <View
          style={[
            styles.reworkIconCircle,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.2)',
              borderColor: 'rgba(255,255,255,0.35)',
            },
          ]}>
          <AlertTriangle size={22} color="#FFFFFF" strokeWidth={2.5} />
        </View>

        {/* CONTENT */}
        <View style={{ flex: 1 }}>
          <Text style={styles.reworkHeading}>Rework Required</Text>

          {reason && reason.length > 0 ? (
            <View style={styles.reworkReasonsContainer}>
              {reason.map((r, i) => (
                <View
                  key={i}
                  style={[
                    styles.reworkReasonPill,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.22)',
                      borderColor: 'rgba(255,255,255,0.25)',
                    },
                  ]}>
                  <Text style={styles.reworkReasonText}>{r}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {comment ? (
            <Text
              style={[
                styles.reworkComment,
                {
                  color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.88)',
                },
              ]}>
              {comment}
            </Text>
          ) : null}
        </View>
      </LinearGradient>

      {/* TOP ACCENT */}
      <View
        style={[
          styles.reworkAccent,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.35)',
          },
        ]}
      />
    </View>
  );
}

function WorkSubmittedBanner({ timestamp, comment }: { timestamp?: string; comment?: string }) {
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const isDark = useColorScheme() === 'dark';

  return (
    <View style={styles.submittedWrap}>
      <View
        style={[
          styles.submittedInner,
          {
            backgroundColor: isDark ? '#022C22' : '#F0FDFA',
            borderColor: isDark ? '#134E4A' : '#99F6E4',
          },
        ]}>
        {/* ICON COLUMN */}
        <View style={styles.submittedIconCol}>
          <View style={styles.submittedIconCircle}>
            <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
          </View>

          <View
            style={[
              styles.submittedIconLine,
              {
                backgroundColor: isDark ? '#134E4A' : '#CCFBF1',
              },
            ]}
          />
        </View>

        {/* CONTENT */}
        <View style={{ flex: 1 }}>
          <View style={styles.submittedTopRow}>
            <Text style={[styles.submittedTitle, { color: isDark ? '#5EEAD4' : '#0F766E' }]}>
              Work Submitted
            </Text>

            <View
              style={[
                styles.submittedBadge,
                {
                  backgroundColor: isDark ? '#022C22' : '#D1FAE5',
                  borderColor: isDark ? '#065F46' : '#6EE7B7',
                },
              ]}>
              <CheckCircle size={11} color="#059669" strokeWidth={2.5} />
              <Text style={[styles.submittedBadgeText, { color: isDark ? '#34D399' : '#059669' }]}>
                Awaiting Review
              </Text>
            </View>
          </View>

          <Text style={[styles.submittedSubtitle, { color: isDark ? '#99F6E4' : '#0F766E' }]}>
            Resolution uploaded and sent to Unit Officer for verification.
          </Text>

          {formattedTime ? (
            <View style={styles.submittedTimeRow}>
              <Clock size={12} color="#0891B2" strokeWidth={2.5} />
              <Text style={[styles.submittedTimeText, { color: isDark ? '#38BDF8' : '#0891B2' }]}>
                Submitted on {formattedTime}
              </Text>
            </View>
          ) : null}

          {comment ? (
            <View
              style={[
                styles.submittedNoteBox,
                {
                  backgroundColor: isDark ? 'rgba(14,165,164,0.12)' : 'rgba(14,165,164,0.08)',
                  borderLeftColor: '#0D9488',
                },
              ]}>
              <Text style={[styles.submittedNoteLabel, { color: '#0D9488' }]}>YOUR NOTES</Text>

              <Text style={[styles.submittedNoteText, { color: isDark ? '#CCFBF1' : '#134E4A' }]}>
                {comment}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  heroContainer: {
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 15,
    marginBottom: 20,
  },
  heroCard: {
    borderRadius: 36,
    padding: 26,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroGlowPrimary: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(94,234,212,0.15)',
  },
  heroGlowSecondary: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(79,70,229,0.2)',
  },
  heroShineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    transform: [{ skewY: '-45deg' }, { translateY: -100 }],
  },
  heroIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroIdText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E2E8F0',
    letterSpacing: 1.2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  heroStatusText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 36,
    marginBottom: 20,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSolidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  heroSolidChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  slaWidget: {
    marginTop: 10,
    backgroundColor: 'rgba(15,23,42,0.4)',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  slaWidgetOverdue: {
    backgroundColor: 'rgba(69,10,10,0.45)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  slaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  slaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  slaIconBoxTeal: {
    backgroundColor: '#0D9488',
    shadowColor: '#0D9488',
  },
  slaIconBoxRed: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  slaLabelSmall: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  slaValueMain: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  slaTimeBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  slaTimeValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  slaProgressSystem: {
    marginTop: 4,
  },
  slaProgressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  slaProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  slaProgressSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  slaProgressStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  textRed300: { color: '#FCA5A5' },
  textTeal200: { color: '#99F6E4' },
  descriptionContainer: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  descriptionCard: {
    borderRadius: 36,
    padding: 28,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
  },
  descriptionGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  descriptionShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    transform: [{ skewX: '-45deg' }, { translateX: -50 }],
  },
  descriptionWatermark: {
    position: 'absolute',
    bottom: -40,
    right: -20,
    transform: [{ rotate: '-15deg' }],
  },
  descriptionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  descriptionHeaderTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
  },
  descriptionSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0EA5A4',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  itemsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(14,165,164,0.2)',
  },
  itemsBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  descriptionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  descriptionTagText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  descriptionContentWrapper: {
    flexDirection: 'row',
    marginTop: 8,
  },
  descriptionAccentLine: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#0EA5A4',
    marginRight: 16,
    opacity: 0.6,
  },
  descriptionContentBox: {
    flex: 1,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  descriptionSeparator: {
    height: 1.5,
    width: '100%',
    marginTop: 24,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  actionBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  actionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 0,
  },
  contactBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  contactGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  carouselWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  premiumCarouselContainer: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  premiumCarouselSlide: {
    height: 280,
    position: 'relative',
  },
  premiumCarouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselPremiumGradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  imageFloatingBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(14,165,164,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  imageFloatingBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  premiumCarouselCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  premiumCarouselCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  premiumCarouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  premiumCarouselArrowLeft: {
    left: 12,
  },
  premiumCarouselArrowRight: {
    right: 12,
  },
  premiumDotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  dotTouchArea: {
    padding: 4,
  },
  premiumDot: {
    borderRadius: 999,
  },
  premiumDotActive: {
    width: 28,
    height: 6,
    backgroundColor: '#0EA5A4',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  premiumDotInactive: {
    width: 6,
    height: 6,
    backgroundColor: '#CBD5E1',
    opacity: 0.5,
  },
  premiumVideoTabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  premiumVideoTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  premiumVideoTabActive: {
    backgroundColor: '#0EA5A4',
    borderColor: '#0EA5A4',
  },
  premiumVideoTabInactive: {
    backgroundColor: 'rgba(15,23,42,0.03)',
  },
  premiumTabActiveGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  premiumVideoTabText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  premiumVideoContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    height: 240,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
  },
  premiumPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(14,165,164,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  playRipple: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    opacity: 0.6,
  },
  premiumVideoClipLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  closePlayerBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  expandVideoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  videoDirectBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(14,165,164,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoDirectBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  videoPlayerControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  playerControlBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fullScreenVideoWrapper: {
    width: SCREEN_WIDTH,
    height: '80%',
    backgroundColor: '#000',
  },
  fullScreenVideoPlayer: {
    flex: 1,
  },
  premiumGeoWidget: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  premiumGeoCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  premiumGeoIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#0EA5A4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  premiumGeoIconRipple: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,164,0.3)',
    opacity: 0.5,
  },
  premiumCatLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  eliteCatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  eliteCatIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  eliteCatText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  frostedSubCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  frostedSubCatText: {
    fontSize: 13,
    fontWeight: '700',
  },
  intelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(14,165,164,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,164,0.15)',
    gap: 4,
  },
  intelTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0EA5A4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  premiumWardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  citizenProfileArea: {
    paddingTop: 4,
  },
  citizenAvatarBox: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#1E1B4B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,164,0.3)',
  },
  avatarOnlineGlow: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#1E1B4B',
  },
  citizenPrimaryName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  citizenStatusTag: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  citizenDataGrid: {
    backgroundColor: 'rgba(14,165,164,0.05)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,165,164,0.1)',
    marginBottom: 24,
  },
  citizenDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  citizenMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(14,165,164,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  citizenDataLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  citizenDataValue: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  flagshipContactBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  flagshipContactGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  flagshipContactRipple: {
    position: 'absolute',
    left: -20,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  flagshipContactIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  flagshipContactTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  flagshipContactSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  flagshipContactArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumWardLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  premiumWardValue: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  premiumGeoAddress: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  geoDataPillar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(14,165,164,0.2)',
    gap: 6,
  },
  geoPillarLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#0EA5A4',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  geoPillarValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    color: '#0EA5A4',
  },
  premiumGeoActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(14,165,164,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14,165,164,0.2)',
  },
  premiumGeoRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  premiumGeoRibbonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0EA5A4',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  videoContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 210,
    backgroundColor: '#0F172A',
  },
  webViewVideo: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoThumbnailWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbnailGrad: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoOverlayContent: {
    alignItems: 'center',
    gap: 10,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoClipLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoTapLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '500',
  },
  locationCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  locationIconBox: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  openMapsBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
  },
  openMapsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(153,246,228,0.6)',
    paddingTop: 10,
    marginTop: 2,
  },
  openMapsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
    letterSpacing: 0.3,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  catBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subCatChip: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subCatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
    letterSpacing: 0.3,
  },
  wardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  wardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    width: 48,
  },
  wardValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },

  reworkBannerWrap: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  reworkGrad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 24,
  },
  reworkAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  reworkIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  reworkHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  reworkReasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reworkReasonPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  reworkReasonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  reworkComment: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 19,
  },

  submittedWrap: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  submittedInner: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#F0FDFA',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
  },
  submittedIconCol: {
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 2,
  },
  submittedIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0891B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedIconLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#CCFBF1',
    marginTop: 6,
    borderRadius: 2,
    minHeight: 20,
  },
  submittedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  submittedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.2,
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  submittedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.3,
  },
  submittedSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F766E',
    lineHeight: 19,
    marginBottom: 8,
    opacity: 0.8,
  },
  submittedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  submittedTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0891B2',
  },
  submittedNoteBox: {
    backgroundColor: 'rgba(14,165,164,0.08)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0D9488',
  },
  submittedNoteLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  intelTimelineRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineTrack: {
    width: 20,
    alignItems: 'center',
  },
  timelineNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 18,
    zIndex: 5,
  },
  timelineNodePulse: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    opacity: 0.3,
  },
  timelineVector: {
    flex: 1,
    width: 2,
    marginTop: 6,
    marginBottom: -6,
    opacity: 0.4,
  },
  intelPayloadCard: {
    flex: 1,
    marginLeft: 16,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 3,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  intelPayloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.08)',
  },
  intelPayloadMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  intelPayloadStatus: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  intelPayloadTime: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  intelPayloadComment: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  roleMicroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleMicroText: {
    fontSize: 8,
    fontWeight: '900',
  },
  visibilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  visibilityTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748B',
  },
  mediaIntelRegion: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.08)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  mediaIntelLine: {
    width: 2,
    height: 12,
    backgroundColor: '#0EA5A4',
    borderRadius: 1,
  },
  mediaIntelTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  mediaIntelThumbWrapper: {
    width: 100,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  mediaIntelThumb: {
    width: '100%',
    height: '100%',
  },
  mediaTypeTag: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaTypeTagText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emptyLogIconBox: {
    width: 60,
    height: 60,
    borderRadius: 24,
    backgroundColor: 'rgba(148,163,184,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyLogText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
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
  attachmentThumb: {
    width: 80,
    height: 64,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
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
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  submittedNoteText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#134E4A',
    lineHeight: 18,
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalContent: {
    width: '100%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  modalLight: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: 'rgba(255,255,255,0.8)',
  },
  modalDark: {
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeaderIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  modalIssueInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIssueName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalIssueCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  modalIssueCodeText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalWarningBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 28,
  },
  modalWarningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalConfirmBtn: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalConfirmGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
