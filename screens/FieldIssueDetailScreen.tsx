import React, { useState, useRef, useMemo } from 'react';
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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { Issue } from '../lib/types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { mockCitizenMessages } from '../lib/mockData';
import WorkExecutionFlow from 'components/WorkExecutionFlow';
import CitizenMessagingInterface from 'components/CitizenMessagingInterface';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_IMAGE_WIDTH = SCREEN_WIDTH - 32 - 40;

type RootStackParamList = {
  FieldIssueDetail: { issue: Issue };
};
type FieldIssueDetailScreenRouteProp = RouteProp<RootStackParamList, 'FieldIssueDetail'>;

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

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  Assigned: {
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
    icon: <CheckCircle size={13} color="#3B82F6" strokeWidth={2.5} />,
  },
  'In Progress': {
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    icon: <RefreshCw size={13} color="#F59E0B" strokeWidth={2.5} />,
  },
  'Pending UO Verification': {
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
    icon: <Clock size={13} color="#8B5CF6" strokeWidth={2.5} />,
  },
  'Rework Required': {
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    icon: <AlertTriangle size={13} color="#EF4444" strokeWidth={2.5} />,
  },
};

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View className="mb-3 flex-row items-center gap-2.5">
      <View className="h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
        {icon}
      </View>
      <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
        {title}
      </Text>
    </View>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-row items-center justify-between border-b border-slate-100 py-3 last:border-0 dark:border-slate-700/50">
      <Text className="text-[13px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </Text>
      <Text
        className={`ml-4 flex-1 text-right text-[14px] font-bold ${
          accent ? 'text-teal-600 dark:text-teal-400' : 'text-slate-800 dark:text-slate-200'
        }`}
        numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function FieldIssueDetailScreen() {
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();
  const route = useRoute<FieldIssueDetailScreenRouteProp>();
  const issue = route.params?.issue;
  const [showWorkFlow, setShowWorkFlow] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);
  const carouselRef = useRef<ScrollView>(null);

  const issueMessages = useMemo(
    () => (issue ? mockCitizenMessages.filter((m) => m.issueId === issue.id) : []),
    [issue]
  );
  const unreadMsgCount = issueMessages.filter((m) => !m.read && m.fromRole === 'Citizen').length;

  const handleBack = () => navigation.goBack();

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

  const handleWorkFlowSubmit = (data: {
    beforeImage: string | null;
    afterImage: string | null;
    beforeLocation: { latitude: number; longitude: number } | null;
    afterLocation: { latitude: number; longitude: number } | null;
    notes: string;
  }) => {
    setShowWorkFlow(false);
    Alert.alert('Success', 'Resolution submitted for verification', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const handleContactCitizen = () => {
    Alert.alert('Contact Citizen', `Call ${issue?.citizenName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Alert.alert('Calling', `${issue?.citizenPhone}`) },
    ]);
  };

  if (!issue) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
        <View className="flex-row items-center border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <TouchableOpacity
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800"
            activeOpacity={0.7}>
            <ArrowLeft color="#64748B" size={20} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[18px] font-extrabold text-slate-900 dark:text-slate-100">
            Issue Details
          </Text>
          <View className="h-10 w-10" />
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-[16px] text-slate-400 dark:text-slate-600">
            No issue data available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const priority = PRIORITY_CONFIG[issue.priority] ?? PRIORITY_CONFIG.Low;
  const statusCfg = STATUS_CONFIG[issue.status];
  const catColor = CATEGORY_COLORS[issue.category] ?? CATEGORY_COLORS['Pothole'];
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
    if (issue.status === 'Assigned') {
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
    if (issue.status === 'In Progress' || issue.status === 'Rework Required') {
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
              {issue.status === 'Rework Required' ? 'Re-upload Resolution' : 'Upload Resolution'}
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
        {/* ── Hero Card ── */}
        <LinearGradient
          colors={['#0D9488', '#0891B2', '#075985']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          {/* top row: id + status */}
          <View className="mb-3 flex-row items-center justify-between">
            <View className="rounded-xl bg-white/20 px-3 py-1.5">
              <Text className="text-[12px] font-extrabold uppercase tracking-widest text-white/90">
                #{issue.id.slice(0, 8)}
              </Text>
            </View>
            {statusCfg && (
              <View
                className="flex-row items-center gap-1.5 rounded-xl px-3 py-1.5"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                {statusCfg.icon}
                <Text className="text-[11px] font-extrabold tracking-wide text-white">
                  {issue.status}
                </Text>
              </View>
            )}
          </View>

          {/* title */}
          <Text className="mb-3 text-[22px] font-extrabold leading-tight text-white">
            {issue.title}
          </Text>

          {/* category + priority row */}
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="flex-row items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5">
              <Tag size={12} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
              <Text className="text-[12px] font-bold text-white/90">{issue.category}</Text>
            </View>
            <View
              className="flex-row items-center gap-1.5 rounded-xl px-3 py-1.5"
              style={{ backgroundColor: priority.darkBg }}>
              <AlertTriangle size={12} color={priority.color} strokeWidth={2.5} />
              <Text className="text-[12px] font-extrabold" style={{ color: priority.color }}>
                {priority.label} Priority
              </Text>
            </View>
            {issue.ward && (
              <View className="flex-row items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5">
                <Navigation size={12} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
                <Text className="text-[12px] font-bold text-white/90">{issue.ward}</Text>
              </View>
            )}
          </View>

          {/* SLA strip */}
          {slaDate && (
            <View
              className="mt-4 flex-row items-center justify-between rounded-2xl px-4 py-3"
              style={{
                backgroundColor: isOverdue ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                borderColor: isOverdue ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.2)',
              }}>
              <View className="flex-row items-center gap-2">
                <Clock
                  size={15}
                  color={isOverdue ? '#FCA5A5' : 'rgba(255,255,255,0.8)'}
                  strokeWidth={2.5}
                />
                <Text
                  className={`text-[12px] font-bold ${isOverdue ? 'text-red-300' : 'text-white/80'}`}>
                  SLA Deadline
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className={`text-[13px] font-extrabold ${isOverdue ? 'text-red-300' : 'text-white'}`}>
                  {slaDate.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                {hoursLeft !== null && (
                  <Text
                    className={`text-[11px] font-bold ${isOverdue ? 'text-red-400' : 'text-teal-200'}`}>
                    {isOverdue ? `${Math.abs(hoursLeft)}h overdue` : `${hoursLeft}h remaining`}
                  </Text>
                )}
              </View>
            </View>
          )}
        </LinearGradient>

        {/* ── Rework Required Banner ── */}
        {issue.status === 'Rework Required' && (
          <ReworkBanner reason={issue.reworkReason} comment={issue.reworkComment} />
        )}

        {/* ── Work Submitted Banner ── */}
        {issue.status === 'Pending UO Verification' && (
          <WorkSubmittedBanner
            timestamp={issue.submissionTimestamp}
            comment={issue.submissionComment ?? issue.foResolutionDescription}
          />
        )}

        {/* ── Description ── */}
        <View
          className="mb-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900"
          style={styles.card}>
          <SectionHeader
            icon={<FileText size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="Description"
          />
          <Text className="text-[14px] leading-6 text-slate-600 dark:text-slate-400">
            {issue.description}
          </Text>
        </View>

        {/* ── Evidence Photos Carousel ── */}
        {issue.images && issue.images.length > 0 && (
          <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
            <SectionHeader
              icon={<Tag size={16} color="#0EA5A4" strokeWidth={2.5} />}
              title={`Evidence Photos (${issue.images.length})`}
            />
            <View style={styles.carouselContainer}>
              <ScrollView
                ref={carouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_IMAGE_WIDTH);
                  setActiveImageIndex(idx);
                }}
                style={{ width: CAROUSEL_IMAGE_WIDTH }}>
                {issue.images.map((img, index) => (
                  <View key={index} style={[styles.carouselSlide, { width: CAROUSEL_IMAGE_WIDTH }]}>
                    <Image source={{ uri: img }} style={styles.carouselImage} resizeMode="cover" />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.55)']}
                      style={styles.carouselGradient}
                    />
                    <View style={styles.carouselCounter}>
                      <Text style={styles.carouselCounterText}>
                        {index + 1} / {issue.images!.length}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Prev / Next arrows */}
              {activeImageIndex > 0 && (
                <TouchableOpacity
                  style={[styles.carouselArrow, styles.carouselArrowLeft]}
                  onPress={() => {
                    const newIdx = activeImageIndex - 1;
                    carouselRef.current?.scrollTo({
                      x: newIdx * CAROUSEL_IMAGE_WIDTH,
                      animated: true,
                    });
                    setActiveImageIndex(newIdx);
                  }}
                  activeOpacity={0.8}>
                  <ChevronLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
              {activeImageIndex < issue.images.length - 1 && (
                <TouchableOpacity
                  style={[styles.carouselArrow, styles.carouselArrowRight]}
                  onPress={() => {
                    const newIdx = activeImageIndex + 1;
                    carouselRef.current?.scrollTo({
                      x: newIdx * CAROUSEL_IMAGE_WIDTH,
                      animated: true,
                    });
                    setActiveImageIndex(newIdx);
                  }}
                  activeOpacity={0.8}>
                  <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>

            {/* Dot indicators */}
            {issue.images.length > 1 && (
              <View style={styles.dotRow}>
                {issue.images.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      carouselRef.current?.scrollTo({
                        x: i * CAROUSEL_IMAGE_WIDTH,
                        animated: true,
                      });
                      setActiveImageIndex(i);
                    }}>
                    <View
                      style={[
                        styles.dot,
                        i === activeImageIndex ? styles.dotActive : styles.dotInactive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Video Evidence ── */}
        {issue.videoEvidence && issue.videoEvidence.length > 0 && (
          <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
            <SectionHeader
              icon={<Video size={16} color="#0EA5A4" strokeWidth={2.5} />}
              title={`Video Evidence (${issue.videoEvidence.length})`}
            />
            <View style={styles.videoTabRow}>
              {issue.videoEvidence.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setActiveVideoIndex(i);
                    setPlayingVideo(null);
                  }}
                  style={[
                    styles.videoTab,
                    i === activeVideoIndex ? styles.videoTabActive : styles.videoTabInactive,
                  ]}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.videoTabText,
                      i === activeVideoIndex
                        ? styles.videoTabTextActive
                        : styles.videoTabTextInactive,
                    ]}>
                    Clip {i + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.videoContainer}>
              {playingVideo === activeVideoIndex ? (
                <WebView
                  source={{ uri: issue.videoEvidence[activeVideoIndex] }}
                  style={styles.webViewVideo}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                />
              ) : (
                <View style={styles.videoThumbnailWrapper}>
                  <LinearGradient
                    colors={['#0D9488', '#0891B2', '#075985']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.videoThumbnailGrad}
                  />
                  <View style={styles.videoOverlayContent}>
                    <TouchableOpacity
                      onPress={() => setPlayingVideo(activeVideoIndex)}
                      style={styles.playButton}
                      activeOpacity={0.85}>
                      <Play size={28} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.videoClipLabel}>Clip {activeVideoIndex + 1}</Text>
                    <Text style={styles.videoTapLabel}>Tap to play</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Location ── */}
        <View
          className="mb-4 rounded-3xl p-5"
          style={[styles.card, { backgroundColor: isDark ? '#020617' : '#FFFFFF' }]}>
          <SectionHeader
            icon={<MapPin size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="Location"
          />

          <TouchableOpacity onPress={openMaps} activeOpacity={0.82}>
            <LinearGradient
              colors={isDark ? ['#042F2E', '#082F49'] : ['#F0FDFA', '#E0F2FE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.locationCard,
                {
                  borderColor: isDark ? '#134E4A' : '#99F6E4',
                },
              ]}>
              <View className="flex-row items-start gap-3">
                {/* ICON */}
                <View style={styles.locationIconBox}>
                  <MapPin color="#FFFFFF" size={18} strokeWidth={2.5} />
                </View>

                {/* TEXT */}
                <View className="flex-1">
                  <Text
                    style={{
                      ...styles.wardValue,
                      fontWeight: '700',
                      marginBottom: 4,
                      color: isDark ? '#F1F5F9' : '#0F172A',
                    }}>
                    {issue.location}
                  </Text>

                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: isDark ? '#94A3B8' : '#64748B',
                    }}>
                    {issue.coordinates.latitude.toFixed(5)},{' '}
                    {issue.coordinates.longitude.toFixed(5)}
                  </Text>
                </View>

                {/* OPEN BTN */}
                <View
                  style={[
                    styles.openMapsBtn,
                    {
                      backgroundColor: isDark ? '#022C22' : '#F0FDFA',
                      borderColor: isDark ? '#134E4A' : '#99F6E4',
                    },
                  ]}>
                  <ExternalLink size={15} color="#0EA5A4" strokeWidth={2.5} />
                </View>
              </View>

              {/* CTA */}
              <View
                style={[
                  styles.openMapsRow,
                  {
                    borderTopColor: isDark ? '#134E4A' : 'rgba(153,246,228,0.6)',
                  },
                ]}>
                <Navigation size={13} color="#0EA5A4" strokeWidth={2.5} />
                <Text style={styles.openMapsLabel}>Open in Google Maps</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Category Details ── */}
        <View
          className="mb-4 rounded-3xl p-5"
          style={[styles.card, { backgroundColor: isDark ? '#020617' : '#FFFFFF' }]}>
          <SectionHeader
            icon={<Layers size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="Category Details"
          />

          <View style={{ gap: 16 }}>
            {/* CATEGORY */}
            <View>
              <Text style={[styles.catLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Category
              </Text>

              <View
                style={[
                  styles.catBadge,
                  {
                    backgroundColor: isDark ? catColor.darkBg : catColor.bg,
                  },
                ]}>
                <Layers color={catColor.icon} size={14} strokeWidth={2.5} />
                <Text
                  style={[
                    styles.catBadgeText,
                    { color: isDark ? catColor.darkText : catColor.text },
                  ]}>
                  {issue.category}
                </Text>
              </View>
            </View>

            {/* SUB-CATEGORIES */}
            {issue.subCategories?.length > 0 && (
              <View>
                <Text style={[styles.catLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Sub-Categories
                </Text>

                <View className="flex-row flex-wrap gap-2">
                  {issue.subCategories.map((sub, i) => (
                    <View
                      key={i}
                      style={[
                        styles.subCatChip,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                        },
                      ]}
                      className="flex-row items-center gap-1.5 px-3 py-2">
                      <Tag color={isDark ? '#CBD5F5' : '#64748B'} size={12} strokeWidth={2.5} />
                      <Text style={[styles.subCatText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                        {sub}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* TAGS */}
            {issue.tags?.length > 0 && (
              <View>
                <Text style={[styles.catLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Tags
                </Text>

                <View className="flex-row flex-wrap gap-2">
                  {issue.tags.map((tag, i) => (
                    <View
                      key={i}
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: isDark ? '#022C22' : '#F0FDFA',
                          borderColor: isDark ? '#134E4A' : '#CCFBF1',
                        },
                      ]}>
                      <Hash color="#0EA5A4" size={11} strokeWidth={2.5} />
                      <Text style={styles.tagText}>{tag.replace(/^#/, '')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* WARD */}
            <View
              style={[
                styles.wardRow,
                {
                  backgroundColor: isDark ? '#020617' : '#F8FAFC',
                  borderTopWidth: 1,
                  borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
                },
              ]}>
              <Text style={[styles.wardLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Ward
              </Text>

              <Text style={[styles.wardValue, { color: isDark ? '#F1F5F9' : '#334155' }]}>
                {issue.ward}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Citizen Information ── */}
        <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <SectionHeader
            icon={<User size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="Citizen Information"
          />

          <View className="mb-4 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <View className="px-4">
              <InfoRow label="Name" value={issue.citizenName} />
              <InfoRow label="Phone" value={issue.citizenPhone} accent />
              {issue.citizenEmail && <InfoRow label="Email" value={issue.citizenEmail} />}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleContactCitizen}
            activeOpacity={0.82}
            style={styles.contactBtn}>
            <LinearGradient
              colors={['#0D9488', '#0891B2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.contactGrad}>
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <Phone color="#FFFFFF" size={18} strokeWidth={2.5} />
              </View>
              <Text className="ml-3 flex-1 text-[15px] font-extrabold text-white">
                Contact Citizen
              </Text>
              <ChevronRight color="rgba(255,255,255,0.7)" size={18} strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Timeline ── */}
        <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <SectionHeader
            icon={<Calendar size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="Timeline"
          />

          <View className="gap-0">
            <TimelineItem
              label="Reported"
              value={new Date(issue.createdAt).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              color="#22C55E"
              isLast={!slaDate}
            />
            {slaDate && (
              <TimelineItem
                label="SLA Deadline"
                value={slaDate.toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                color={isOverdue ? '#EF4444' : '#F59E0B'}
                isLast
                overdue={isOverdue}
              />
            )}
          </View>
        </View>

        {/* ── Issue Updates ── */}
        {issue.issueUpdates && issue.issueUpdates.length > 0 && (
          <View className="mb-4 rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
            <SectionHeader
              icon={<RefreshCw size={16} color="#0EA5A4" strokeWidth={2.5} />}
              title="Activity Log"
            />
            <View className="gap-3">
              {issue.issueUpdates
                .slice()
                .reverse()
                .map((update, i) => (
                  <View
                    key={update.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700/50 dark:bg-slate-800/60">
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <View className="rounded-lg bg-teal-50 px-2.5 py-1 dark:bg-teal-900/30">
                        <Text className="text-[11px] font-extrabold uppercase tracking-wide text-teal-700 dark:text-teal-400">
                          {update.status}
                        </Text>
                      </View>
                      <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {new Date(update.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <Text className="text-[13px] leading-5 text-slate-600 dark:text-slate-400">
                      {update.comment}
                    </Text>
                    <Text className="mt-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-600">
                      by {update.updatedBy} · {update.role}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        <View className="h-6" />
      </ScrollView>

      {/* ── Footer CTA ── */}
      {actionButton() && (
        <View className="border-t border-slate-100 bg-white px-5 pb-6 pt-4 dark:border-slate-800 dark:bg-slate-900">
          {actionButton()}
        </View>
      )}

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

      <CitizenMessagingInterface
        visible={showMessaging}
        onClose={() => setShowMessaging(false)}
        issue={issue}
        initialMessages={issueMessages}
      />
    </SafeAreaView>
  );
}

function ReworkBanner({ reason, comment }: { reason?: string; comment?: string }) {
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

          {reason ? (
            <View
              style={[
                styles.reworkReasonPill,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.22)',
                  borderColor: 'rgba(255,255,255,0.25)',
                },
              ]}>
              <Text style={styles.reworkReasonText}>{reason}</Text>
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

function TimelineItem({
  label,
  value,
  color,
  isLast,
  overdue,
}: {
  label: string;
  value: string;
  color: string;
  isLast?: boolean;
  overdue?: boolean;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="items-center" style={{ width: 24 }}>
        <View
          className="h-5 w-5 items-center justify-center rounded-full"
          style={{ backgroundColor: color + '22', borderWidth: 2, borderColor: color }}>
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        </View>
        {!isLast && (
          <View
            className="mt-1 w-0.5 flex-1"
            style={{ backgroundColor: '#E2E8F0', minHeight: 24 }}
          />
        )}
      </View>
      <View className="flex-1 pb-4">
        <Text
          className={`mb-0.5 text-[12px] font-bold uppercase tracking-widest ${overdue ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
          {label}
        </Text>
        <Text
          className={`text-[14px] font-semibold ${overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
          {value}
        </Text>
        {overdue && (
          <View className="mt-1 flex-row items-center gap-1">
            <AlertTriangle size={11} color="#EF4444" strokeWidth={2.5} />
            <Text className="text-[11px] font-bold text-red-500">SLA Overdue</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
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
  carouselContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  carouselSlide: {
    height: 220,
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  carouselCounter: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  carouselCounterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  carouselArrow: {
    position: 'absolute',
    top: 92,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselArrowLeft: {
    left: 10,
  },
  carouselArrowRight: {
    right: 10,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    borderRadius: 999,
  },
  dotActive: {
    width: 20,
    height: 7,
    backgroundColor: '#0EA5A4',
  },
  dotInactive: {
    width: 7,
    height: 7,
    backgroundColor: '#CBD5E1',
  },
  videoTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  videoTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  videoTabActive: {
    backgroundColor: '#0EA5A4',
    borderColor: '#0EA5A4',
  },
  videoTabInactive: {
    backgroundColor: 'transparent',
    borderColor: '#CBD5E1',
  },
  videoTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  videoTabTextActive: {
    color: '#FFFFFF',
  },
  videoTabTextInactive: {
    color: '#64748B',
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
    marginBottom: 8,
  },
  reworkReasonPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 8,
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
  submittedNoteText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#134E4A',
    lineHeight: 18,
  },
});
