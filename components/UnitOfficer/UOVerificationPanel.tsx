import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Linking,
  Platform,
  useColorScheme,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  LinearTransition,
} from 'react-native-reanimated';
import {
  CircleCheck as CheckCircle,
  XCircle,
  X,
  MapPin,
  Navigation,
  Camera,
  Clock,
  TriangleAlert as AlertTriangle,
  ChevronRight,
  RotateCcw,
  FileText,
  ShieldCheck,
  CircleAlert,
  Locate,
  CheckCheck,
  Map as MapIcon,
  Timer,
  AlertCircle,
  Sparkles,
  Square,
  CheckSquare,
  ZoomIn as ZoomInIcon,
} from 'lucide-react-native';
import { Issue, IssueUpdate, MappedIssue } from 'lib/types';
import { useUser } from 'context/UserContext';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { useMutation } from 'convex/react';

function haversineDistanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const THRESHOLD_METRES = 300;

function formatCoords(lat: number, lon: number) {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

function formatTimestamp(iso: any) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Time Unknown';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function openMapLink(lat: number, lon: number, label: string) {
  const encoded = encodeURIComponent(label);
  const scheme = Platform.select({
    ios: `maps:${lat},${lon}?q=${encoded}`,
    android: `geo:${lat},${lon}?q=${lat},${lon}(${encoded})`,
  });
  const web = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  if (scheme) {
    Linking.canOpenURL(scheme)
      .then((ok) => Linking.openURL(ok ? scheme : web))
      .catch(() => Linking.openURL(web));
  } else {
    Linking.openURL(web);
  }
}

const s = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardInner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  greenGlow: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  redGlow: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  orangeGlow: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  purpleGlow: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});

interface LocationCheckCardProps {
  label: string;
  foLat: number;
  foLon: number;
  foTimestamp: string;
  issueLat: number;
  issueLon: number;
}

function LocationCheckCard({
  label,
  foLat,
  foLon,
  foTimestamp,
  issueLat,
  issueLon,
}: LocationCheckCardProps) {
  const isDark = useColorScheme() === 'dark';
  const distance = haversineDistanceMetres(foLat, foLon, issueLat, issueLon);
  const withinThreshold = distance <= THRESHOLD_METRES;
  const distanceText =
    distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${Math.round(distance)} m`;
  const isAfter = label === 'AFTER';
  const pct = Math.min((distance / THRESHOLD_METRES) * 100, 100);

  const accentColors = isAfter
    ? {
        gradient: ['#10B981', '#059669'] as const,
        light: '#ECFDF5',
        lightDark: 'rgba(16,185,129,0.12)',
      }
    : {
        gradient: ['#3B82F6', '#1D4ED8'] as const,
        light: '#EFF6FF',
        lightDark: 'rgba(59,130,246,0.12)',
      };

  const statusColors = withinThreshold
    ? {
        bar: ['#34D399', '#10B981', '#059669'] as const,
        text: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500',
      }
    : {
        bar: ['#FCA5A5', '#EF4444', '#DC2626'] as const,
        text: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-500',
      };

  return (
    <View
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isDark ? '#1E293B' : '#E2E8F0',
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      }}>
      {/* ── Gradient Header Strip ── */}
      <LinearGradient
        colors={accentColors.gradient as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Camera color="#FFF" size={17} strokeWidth={2.5} />
          </View>
          <View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '900',
                color: '#FFFFFF',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}>
              {label} Evidence
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: 'rgba(255,255,255,0.7)',
                marginTop: 1,
              }}>
              Spatial Checkpoint
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: withinThreshold ? 'rgba(255,255,255,0.25)' : 'rgba(239,68,68,0.6)',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 20,
          }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' }} />
          <Text
            style={{
              fontSize: 9,
              fontWeight: '900',
              color: '#FFF',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
            {withinThreshold ? 'VERIFIED' : 'ALERT'}
          </Text>
        </View>
      </LinearGradient>

      {/* ── Card Body ── */}
      <View style={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF', padding: 16, gap: 14 }}>
        {/* ── Coordinate Tiles ── */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* FO Position */}
          <View
            style={{
              flex: 1,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            }}>
            <View style={{ flexDirection: 'row' }}>
              <LinearGradient
                colors={accentColors.gradient as unknown as string[]}
                style={{ width: 3 }}
              />
              <View
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC',
                }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <LinearGradient
                    colors={accentColors.gradient as unknown as string[]}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Locate color="#FFF" size={10} strokeWidth={3} />
                  </LinearGradient>
                  <Text className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Officer GPS
                  </Text>
                </View>
                <Text
                  className="text-[11px] font-bold text-slate-800 dark:text-slate-100"
                  numberOfLines={1}>
                  {formatCoords(foLat, foLon)}
                </Text>
              </View>
            </View>
          </View>
          {/* Issue Location */}
          <View
            style={{
              flex: 1,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
            }}>
            <View style={{ flexDirection: 'row' }}>
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={{ width: 3 }} />
              <View
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC',
                }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <LinearGradient
                    colors={['#8B5CF6', '#6D28D9']}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MapPin color="#FFF" size={10} strokeWidth={3} />
                  </LinearGradient>
                  <Text className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Issue GPS
                  </Text>
                </View>
                <Text
                  className="text-[11px] font-bold text-slate-800 dark:text-slate-100"
                  numberOfLines={1}>
                  {formatCoords(issueLat, issueLon)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Proximity Intelligence ── */}
        <View
          style={{
            borderRadius: 18,
            padding: 14,
            backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : '#F8FAFC',
            borderWidth: 1,
            borderColor: isDark ? '#1E293B' : '#E2E8F0',
          }}>
          {/* Title + Hero distance */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <LinearGradient
                colors={statusColors.bar as unknown as string[]}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MapIcon color="#FFF" size={14} strokeWidth={2.5} />
              </LinearGradient>
              <View>
                <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Deviation
                </Text>
                <Text className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  {withinThreshold ? 'Within range' : 'Out of range'}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text className={`text-[22px] font-black ${statusColors.text}`}>{distanceText}</Text>
              <Text className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                from issue site
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
              overflow: 'hidden',
            }}>
            <LinearGradient
              colors={statusColors.bar as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: `${pct}%`, height: '100%', borderRadius: 4 }}
            />
          </View>

          {/* Labels */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: withinThreshold ? '#10B981' : '#EF4444',
                }}
              />
              <Text className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                {Math.round(pct)}% of threshold
              </Text>
            </View>
            <Text
              className={`text-[8px] font-black uppercase tracking-widest ${withinThreshold ? 'text-slate-400' : 'text-rose-500'}`}>
              Max: {THRESHOLD_METRES}m
            </Text>
          </View>
        </View>

        {/* ── Map Action ── */}
        <TouchableOpacity
          onPress={() => openMapLink(foLat, foLon, `FO ${label} Location`)}
          activeOpacity={0.85}>
          <LinearGradient
            colors={isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F8FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#DBEAFE',
            }}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Navigation color="#FFF" size={11} strokeWidth={3} />
            </LinearGradient>
            <Text className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Open in Maps
            </Text>
            <ChevronRight color={isDark ? '#475569' : '#93C5FD'} size={14} strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface UOVerificationPanelProps {
  issue: MappedIssue;
  onApprove: (updatedIssue: Issue) => void;
  onRework: (note: string, updatedIssue: Issue) => void;
}

export default function UOVerificationPanel({
  issue,
  onApprove,
  onRework,
}: UOVerificationPanelProps) {
  const user = useUser();

  const [activeTab, setActiveTab] = useState<'approve' | 'rework'>('approve');
  const [reworkNote, setReworkNote] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ uri: string; label: string } | null>(null);

  const hasBeforeLocation = !!issue.beforeLocation;
  const hasAfterLocation = !!issue.afterLocation;

  const beforeDistance = hasBeforeLocation
    ? haversineDistanceMetres(
        issue.beforeLocation!.latitude,
        issue.beforeLocation!.longitude,
        issue.coordinates.latitude,
        issue.coordinates.longitude
      )
    : null;

  const afterDistance = hasAfterLocation
    ? haversineDistanceMetres(
        issue.afterLocation!.latitude,
        issue.afterLocation!.longitude,
        issue.coordinates.latitude,
        issue.coordinates.longitude
      )
    : null;

  const beforeOk = beforeDistance !== null ? beforeDistance <= THRESHOLD_METRES : null;
  const afterOk = afterDistance !== null ? afterDistance <= THRESHOLD_METRES : null;
  const bothLocationsPassed = beforeOk !== false && afterOk !== false;

  const approveIssueResolution = useMutation(api.unitOfficers.approveIssueResolution);

  const requestRework = useMutation(api.unitOfficers.requestRework);

  const handleApprove = () => {
    setShowVerifyModal(true);
  };

  const performApprove = async () => {
    try {
      if (!issue.id || !user?.id) return;

      await approveIssueResolution({
        issueId: issue?.id as Id<'issues'>,
        updatedBy: user?.id as Id<'users'>,
        unitOfficerName: user?.name,
      });

      setShowVerifyModal(false);
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const wordCount = reworkNote.trim().split(/\s+/).filter(Boolean).length;
  const isNoteReady = wordCount >= 10;

  const handleRequestRework = () => {
    if (!isNoteReady) {
      Alert.alert('Required', 'Please provide at least 10 words describing the rework needed.');
      return;
    }
    setShowReworkModal(true);
  };

  const performRework = async () => {
    try {
      await requestRework({
        issueId: issue?.id as Id<'issues'>,
        updatedBy: user?.id as Id<'users'>,
        unitOfficerName: user?.name as string,
        note: reworkNote,
        reasons: selectedReasons,
      });

      // Reset UI
      setReworkNote('');
      setSelectedReasons([]);
      setShowReworkModal(false);
    } catch (err) {
      console.error('Rework failed:', err);
    }
  };

  const isDark = useColorScheme() === 'dark';

  return (
    <View
      style={{
        flex: 1,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isDark ? '#1E293B' : '#E2E8F0',
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      }}>
      {/* ✦ Premium Header */}
      <LinearGradient
        colors={isDark ? ['#0F172A', '#1E293B', '#0F172A'] : ['#F8FAFC', '#EFF6FF', '#ECFDF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            className="h-11 w-11 items-center justify-center rounded-2xl"
            style={[{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }, s.cardInner]}>
            <Sparkles color={isDark ? '#A78BFA' : '#7C3AED'} size={22} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-[16px] font-black text-slate-900 dark:text-white">
              Issue Verification Panel
            </Text>
            <Text className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Review field officer resolution evidence
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Gradient pill tab bar */}
      <View className="mt-4 flex-row gap-2 px-4 pb-3">
        <TouchableOpacity
          onPress={() => setActiveTab('approve')}
          activeOpacity={0.85}
          className="flex-1 overflow-hidden rounded-2xl">
          <LinearGradient
            colors={
              activeTab === 'approve'
                ? ['#10B981', '#059669']
                : [isDark ? '#1E293B' : '#F1F5F9', isDark ? '#1E293B' : '#F1F5F9']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 14,
            }}>
            <ShieldCheck
              color={activeTab === 'approve' ? '#FFF' : '#94A3B8'}
              size={17}
              strokeWidth={2.5}
            />
            <Text
              className={`text-[12px] font-black uppercase tracking-wider ${activeTab === 'approve' ? 'text-white' : 'text-slate-400'}`}>
              Approve
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('rework')}
          activeOpacity={0.85}
          className="flex-1 overflow-hidden rounded-2xl">
          <LinearGradient
            colors={
              activeTab === 'rework'
                ? ['#F97316', '#EA580C']
                : [isDark ? '#1E293B' : '#F1F5F9', isDark ? '#1E293B' : '#F1F5F9']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 14,
            }}>
            <RotateCcw
              color={activeTab === 'rework' ? '#FFF' : '#94A3B8'}
              size={17}
              strokeWidth={2.5}
            />
            <Text
              className={`text-[12px] font-black uppercase tracking-wider ${activeTab === 'rework' ? 'text-white' : 'text-slate-400'}`}>
              Rework
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Decorative divider */}
      <LinearGradient
        colors={
          isDark
            ? ['transparent', '#334155', 'transparent']
            : ['transparent', '#E2E8F0', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 1, marginHorizontal: 16 }}
      />

      {/* ─── APPROVE TAB ─── */}
      {activeTab === 'approve' && (
        <Animated.View entering={FadeIn.duration(300)} className="gap-6 p-5">
          {/* Resolution Report */}
          {issue.foResolutionNotes && (
            <Animated.View entering={FadeInUp.duration(400)} className="gap-3">
              <View className="flex-row items-center gap-2.5">
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <FileText color="#FFFFFF" size={17} strokeWidth={2.5} />
                </LinearGradient>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-emerald-600 dark:text-emerald-400">
                    Resolution Report
                  </Text>
                  <Text className="text-[12px] font-semibold text-slate-400 dark:text-slate-500">
                    Field Officer Summary
                  </Text>
                </View>
              </View>
              <View
                className="overflow-hidden rounded-[20px]"
                style={[
                  s.cardInner,
                  { borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0' },
                ]}>
                <View style={{ flexDirection: 'row' }}>
                  <LinearGradient colors={['#10B981', '#059669']} style={{ width: 4 }} />
                  <View className="flex-1 bg-slate-50 p-4 dark:bg-slate-800/60">
                    <Text className="text-[14px] font-semibold leading-6 text-slate-700 dark:text-slate-200">
                      {issue.foResolutionNotes}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Visual Evidence */}
          {(issue.beforePhotos.length > 0 || (issue.afterPhotos?.length ?? 0) > 0) && (
            <Animated.View entering={FadeInUp.delay(100).duration(400)} className="gap-3">
              <View className="flex-row items-center gap-2.5">
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <Camera color="#FFFFFF" size={17} strokeWidth={2.5} />
                </LinearGradient>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-blue-600 dark:text-blue-400">
                    Visual Evidence
                  </Text>
                  <Text className="text-[12px] font-semibold text-slate-400 dark:text-slate-500">
                    Before → After Comparison
                  </Text>
                </View>
              </View>
              <View className="flex-col gap-3">
                {issue.beforePhotos.slice(0, 1).map((uri, i) => (
                  <TouchableOpacity
                    key={`b-${i}`}
                    activeOpacity={0.85}
                    onPress={() => setPreviewImage({ uri, label: 'Before' })}>
                    <View
                      className="relative flex-1 overflow-hidden rounded-[20px]"
                      style={{ borderWidth: 1, borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
                      <Image
                        source={{ uri }}
                        style={{
                          width: '100%',
                          height: 180,
                          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        }}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0.5, y: 0.4 }}
                        end={{ x: 0.5, y: 1 }}
                      />
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 12,
                          left: 12,
                          right: 12,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View className="h-5 w-5 items-center justify-center rounded-md bg-white/20">
                            <Camera color="#FFF" size={10} strokeWidth={3} />
                          </View>
                          <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-white/80">
                            Before
                          </Text>
                        </View>
                        <View className="h-7 w-7 items-center justify-center rounded-full bg-white/20">
                          <ZoomInIcon color="#FFF" size={14} strokeWidth={2.5} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {(issue.afterPhotos ?? []).slice(0, 1).map((uri, i) => (
                  <TouchableOpacity
                    key={`a-${i}`}
                    activeOpacity={0.85}
                    onPress={() => setPreviewImage({ uri, label: 'Resolved' })}>
                    <View
                      className="relative flex-1 overflow-hidden rounded-[20px]"
                      style={{ borderWidth: 1, borderColor: isDark ? '#1E293B' : '#E2E8F0' }}>
                      <Image
                        source={{ uri }}
                        style={{
                          width: '100%',
                          height: 180,
                          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        }}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(5,150,105,0.9)']}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0.5, y: 0.35 }}
                        end={{ x: 0.5, y: 1 }}
                      />
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 12,
                          left: 12,
                          right: 12,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View className="h-5 w-5 items-center justify-center rounded-md bg-white/25">
                            <CheckCircle color="#FFF" size={10} strokeWidth={3} />
                          </View>
                          <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-white">
                            Resolved
                          </Text>
                        </View>
                        <View className="h-7 w-7 items-center justify-center rounded-full bg-white/20">
                          <ZoomInIcon color="#FFF" size={14} strokeWidth={2.5} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Spatial Verification */}
          {(hasBeforeLocation || hasAfterLocation) && (
            <Animated.View entering={FadeInUp.delay(200).duration(400)} className="gap-4">
              <View className="flex-row items-center gap-2.5">
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}>
                  <Locate color="#FFFFFF" size={17} strokeWidth={2.5} />
                </LinearGradient>
                <View className="flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-indigo-600 dark:text-indigo-400">
                    Spatial Analysis
                  </Text>
                  <Text className="text-[12px] font-semibold text-slate-400 dark:text-slate-500">
                    GPS Precision Verification
                  </Text>
                </View>
              </View>

              {/* Master status */}
              <LinearGradient
                colors={
                  bothLocationsPassed
                    ? isDark
                      ? ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.04)']
                      : ['rgba(236,253,245,0.9)', 'rgba(209,250,229,0.4)']
                    : isDark
                      ? ['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.04)']
                      : ['rgba(255,241,242,0.9)', 'rgba(254,226,226,0.4)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 16,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: bothLocationsPassed
                    ? isDark
                      ? 'rgba(16,185,129,0.3)'
                      : 'rgba(16,185,129,0.2)'
                    : isDark
                      ? 'rgba(239,68,68,0.3)'
                      : 'rgba(239,68,68,0.2)',
                }}>
                <LinearGradient
                  colors={bothLocationsPassed ? ['#34D399', '#059669'] : ['#FCA5A5', '#DC2626']}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {bothLocationsPassed ? (
                    <ShieldCheck color="#FFF" size={24} strokeWidth={2.5} />
                  ) : (
                    <AlertCircle color="#FFF" size={24} strokeWidth={2.5} />
                  )}
                </LinearGradient>
                <View className="flex-1">
                  <Text
                    className={`text-[15px] font-black ${bothLocationsPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {bothLocationsPassed ? 'Precision Verified' : 'Location Mismatch'}
                  </Text>
                  <Text className="text-[12px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                    {bothLocationsPassed
                      ? 'All coordinates fall within the operational radius.'
                      : `Coordinates exceed the ${THRESHOLD_METRES}m threshold.`}
                  </Text>
                </View>
              </LinearGradient>

              <View className="gap-4">
                {hasBeforeLocation && (
                  <LocationCheckCard
                    label="BEFORE"
                    foLat={issue.beforeLocation!.latitude}
                    foLon={issue.beforeLocation!.longitude}
                    foTimestamp={issue.beforeLocation!.timestamp}
                    issueLat={issue.coordinates.latitude}
                    issueLon={issue.coordinates.longitude}
                  />
                )}
                {hasAfterLocation && (
                  <LocationCheckCard
                    label="AFTER"
                    foLat={issue.afterLocation!.latitude}
                    foLon={issue.afterLocation!.longitude}
                    foTimestamp={issue.afterLocation!.timestamp}
                    issueLat={issue.coordinates.latitude}
                    issueLon={issue.coordinates.longitude}
                  />
                )}
              </View>
            </Animated.View>
          )}

          {/* Approve action */}
          <View className="mt-2 gap-4">
            <TouchableOpacity
              onPress={handleApprove}
              activeOpacity={0.9}
              className="overflow-hidden rounded-[20px]"
              style={s.greenGlow}>
              <LinearGradient
                colors={['#34D399', '#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  paddingVertical: 18,
                }}>
                <Sparkles color="#FFF" size={18} strokeWidth={2.5} />
                <Text className="text-[14px] font-black uppercase tracking-wider text-white">
                  Approve & Close
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {!bothLocationsPassed && (
              <Animated.View
                entering={FadeIn.delay(400)}
                className="flex-row items-start gap-3 rounded-[18px] p-4"
                style={[
                  s.cardInner,
                  {
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.2)',
                    backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : '#FFFBEB',
                  },
                ]}>
                <AlertTriangle color="#F59E0B" size={18} strokeWidth={2.5} />
                <Text className="flex-1 text-[12px] font-bold leading-5 text-amber-800 dark:text-amber-400">
                  Location variance detected. You can still approve, but will be asked to confirm.
                </Text>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      )}

      {/* ─── REWORK TAB ─── */}
      {activeTab === 'rework' && (
        <Animated.View entering={FadeIn.duration(300)} style={{ padding: 20, gap: 20 }}>
          {/* Directive header */}
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 16,
              borderRadius: 20,
            }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <RotateCcw color="#FFF" size={22} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '900',
                  color: '#FFFFFF',
                }}>
                Rework Directive
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 2,
                }}>
                Select issues & provide instructions
              </Text>
            </View>
          </LinearGradient>

          {/* ── Checklist Section ── */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <CheckSquare color="#FFF" size={14} strokeWidth={2.5} />
              </LinearGradient>
              <Text className="text-[10px] font-black uppercase tracking-[1.5px] text-orange-600 dark:text-orange-400">
                Issues Found
              </Text>
            </View>

            <View
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: isDark ? '#1E293B' : '#E2E8F0',
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                overflow: 'hidden',
              }}>
              {[
                {
                  key: 'photo',
                  label: 'Photo Quality',
                  desc: 'Blurry or unclear evidence photos',
                },
                {
                  key: 'location',
                  label: 'Wrong Location',
                  desc: 'GPS mismatch with issue site',
                },
                {
                  key: 'incomplete',
                  label: 'Incomplete Work',
                  desc: 'Resolution not fully completed',
                },
                {
                  key: 'description',
                  label: 'Poor Description',
                  desc: 'Insufficient resolution details',
                },
                {
                  key: 'wrong_issue',
                  label: 'Wrong Issue Addressed',
                  desc: 'Different problem was resolved',
                },
              ].map((item, idx) => {
                const isSelected = selectedReasons.includes(item.label);
                const isLast = idx === 4;
                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedReasons((prev) =>
                        prev.includes(item.label)
                          ? prev.filter((r) => r !== item.label)
                          : [...prev, item.label]
                      );
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(249,115,22,0.08)'
                            : 'rgba(249,115,22,0.04)'
                          : 'transparent',
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
                      }}>
                      {isSelected ? (
                        <LinearGradient
                          colors={['#F97316', '#EA580C']}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 7,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <CheckSquare color="#FFF" size={14} strokeWidth={3} />
                        </LinearGradient>
                      ) : (
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 7,
                            borderWidth: 2,
                            borderColor: isDark ? '#334155' : '#CBD5E1',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Square
                            color={isDark ? '#475569' : '#94A3B8'}
                            size={12}
                            strokeWidth={2}
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          className={`text-[13px] font-bold ${
                            isSelected
                              ? 'text-orange-700 dark:text-orange-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}>
                          {item.label}
                        </Text>
                        <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {item.desc}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Compose area ── */}
          <View
            className={`overflow-hidden rounded-[24px] border-[1.5px] bg-white shadow-sm dark:bg-slate-900 ${
              reworkNote.length > 0
                ? 'border-orange-400 dark:border-orange-500'
                : 'border-slate-200 dark:border-slate-800'
            }`}
            style={{
              shadowColor: reworkNote.length > 0 ? '#F97316' : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: reworkNote.length > 0 ? 0.15 : 0.03,
              shadowRadius: 10,
              elevation: reworkNote.length > 0 ? 4 : 1,
            }}>
            {/* Compose Header */}
            <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3.5 dark:border-slate-800/80 dark:bg-slate-800/40">
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-orange-100 dark:bg-orange-900/50">
                  <FileText color={isDark ? '#FB923C' : '#F97316'} size={16} strokeWidth={2.5} />
                </View>
                <Text className="text-[14px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  Instructions <Text className="text-orange-500">*</Text>
                </Text>
              </View>

              <View
                className={`rounded-[10px] px-3 py-1.5 ${
                  isNoteReady
                    ? 'bg-emerald-100 dark:bg-emerald-900/40'
                    : 'bg-orange-100 dark:bg-orange-900/40'
                }`}>
                <Text
                  className={`text-[9px] font-black tracking-wider ${
                    isNoteReady
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-orange-700 dark:text-orange-400'
                  }`}>
                  {wordCount} WORDS {wordCount < 10 && '(MIN 10)'}
                </Text>
              </View>
            </View>

            <View className="relative">
              <TextInput
                value={reworkNote}
                onChangeText={setReworkNote}
                placeholder="Explain what needs to be corrected..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                multiline
                style={{
                  fontSize: 15,
                  lineHeight: 24,
                  minHeight: 140,
                  padding: 16,
                  textAlignVertical: 'top',
                  color: isDark ? '#F8FAFC' : '#1E293B',
                  fontWeight: '500',
                }}
              />
            </View>
          </View>

          {/* Send Rework Request Button */}
          <TouchableOpacity
            onPress={handleRequestRework}
            disabled={!isNoteReady}
            activeOpacity={0.9}
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              opacity: isNoteReady ? 1 : 0.6,
              shadowColor: '#F97316',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isNoteReady ? 0.3 : 0,
              shadowRadius: 12,
              elevation: isNoteReady ? 8 : 0,
            }}>
            <LinearGradient
              colors={['#FB923C', '#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingVertical: 18,
              }}>
              <Sparkles color="#FFF" size={18} strokeWidth={2.5} />
              <Text className="text-[14px] font-black uppercase tracking-wider text-white">
                Send Rework Request
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ─── IMAGE PREVIEW MODAL ─── */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: '#000',
          }}>
          {previewImage && (
            <>
              <Image
                source={{ uri: previewImage.uri }}
                style={{
                  width: Dimensions.get('window').width,
                  height: Dimensions.get('window').height,
                }}
                resizeMode="contain"
              />

              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setPreviewImage(null)}
                activeOpacity={0.7}
                style={{
                  position: 'absolute',
                  top: Platform.OS === 'ios' ? 60 : 40,
                  right: 20,
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.25)',
                }}>
                <X color="#FFF" size={24} strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Label Badge */}
              <View
                style={{
                  position: 'absolute',
                  bottom: Platform.OS === 'ios' ? 50 : 30,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 20,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 10,
                      backgroundColor:
                        previewImage.label === 'Before'
                          ? 'rgba(255,255,255,0.15)'
                          : 'rgba(16,185,129,0.3)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {previewImage.label === 'Before' ? (
                      <Camera color="#FFF" size={14} strokeWidth={2.5} />
                    ) : (
                      <CheckCircle color="#34D399" size={14} strokeWidth={2.5} />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '900',
                      color: '#FFFFFF',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                    }}>
                    {previewImage.label} Evidence
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* ─── LOCATION VERIFICATION MODAL ─── */}
      <Modal
        visible={showVerifyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVerifyModal(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowVerifyModal(false)} />

          <Animated.View
            entering={ZoomIn.springify().damping(80)}
            style={{
              width: '100%',
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderRadius: 32,
              padding: 24,
              borderWidth: 1,
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.25,
              shadowRadius: 40,
              elevation: 10,
            }}>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <LinearGradient
                colors={bothLocationsPassed ? ['#10B981', '#059669'] : ['#F43F5E', '#E11D48']}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                {bothLocationsPassed ? (
                  <ShieldCheck color="#FFF" size={32} strokeWidth={2.5} />
                ) : (
                  <CircleAlert color="#FFF" size={32} strokeWidth={2.5} />
                )}
              </LinearGradient>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '900',
                  color: isDark ? '#F8FAFC' : '#1E293B',
                  textAlign: 'center',
                }}>
                Location Intelligence
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isDark ? '#64748B' : '#94A3B8',
                  textAlign: 'center',
                  marginTop: 4,
                }}>
                Verification required for issue closure
              </Text>
            </View>

            {/* Cards */}
            <View style={{ gap: 12 }}>
              <VerificationCard
                label="Before Snapshot"
                passed={beforeOk === true}
                distance={beforeDistance}
                isDark={isDark}
              />
              <VerificationCard
                label="Resolution Point"
                passed={afterOk === true}
                distance={afterDistance}
                isDark={isDark}
              />
            </View>

            {/* Status Message */}
            <View
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 20,
                backgroundColor: bothLocationsPassed
                  ? isDark
                    ? 'rgba(16,185,129,0.1)'
                    : '#ECFDF5'
                  : isDark
                    ? 'rgba(244,63,94,0.1)'
                    : '#FFF1F2',
                borderWidth: 1,
                borderColor: bothLocationsPassed
                  ? isDark
                    ? 'rgba(16,185,129,0.2)'
                    : '#D1FAE5'
                  : isDark
                    ? 'rgba(244,63,94,0.2)'
                    : '#FFE4E6',
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
              }}>
              {bothLocationsPassed ? (
                <CheckCircle color="#10B981" size={20} strokeWidth={2.5} />
              ) : (
                <AlertTriangle color="#F43F5E" size={20} strokeWidth={2.5} />
              )}
              <Text
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: '700',
                  color: bothLocationsPassed
                    ? isDark
                      ? '#34D399'
                      : '#065F46'
                    : isDark
                      ? '#FB7185'
                      : '#9F1239',
                  lineHeight: 18,
                }}>
                {bothLocationsPassed
                  ? 'All proximity checks passed. You can now safely approve and close this issue.'
                  : 'One or more proximity checks failed. Approval is restricted until valid location data is provided.'}
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => setShowVerifyModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: 20,
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: isDark ? '#94A3B8' : '#64748B',
                  }}>
                  Dismiss
                </Text>
              </TouchableOpacity>

              {bothLocationsPassed && (
                <TouchableOpacity
                  onPress={performApprove}
                  activeOpacity={0.9}
                  style={{ flex: 2, borderRadius: 20, overflow: 'hidden' }}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={{
                      paddingVertical: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 8,
                    }}>
                    <Sparkles color="#FFF" size={18} strokeWidth={2.5} />
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFF' }}>
                      Confirm & Approve
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── REWORK CONFIRMATION MODAL ─── */}
      <Modal
        visible={showReworkModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReworkModal(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowReworkModal(false)} />

          <Animated.View
            entering={ZoomIn.springify().damping(80)}
            style={{
              width: '100%',
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderRadius: 32,
              padding: 24,
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.25,
              shadowRadius: 40,
              elevation: 10,
            }}>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                <RotateCcw color="#FFF" size={32} strokeWidth={2.5} />
              </LinearGradient>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '900',
                  color: isDark ? '#F8FAFC' : '#1E293B',
                  textAlign: 'center',
                }}>
                Confirm Rework
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isDark ? '#64748B' : '#94A3B8',
                  textAlign: 'center',
                  marginTop: 4,
                }}>
                Review directive before sending back
              </Text>
            </View>

            {/* Content Summary */}
            <View style={{ gap: 16 }}>
              {selectedReasons.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {selectedReasons.map((reason, idx) => (
                    <View
                      key={idx}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: isDark ? 'rgba(249,115,22,0.1)' : '#FFF7ED',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(249,115,22,0.2)' : '#FFEDD5',
                      }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: '#F97316',
                          textTransform: 'uppercase',
                        }}>
                        {reason}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View
                style={{
                  padding: 20,
                  borderRadius: 24,
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <FileText color={isDark ? '#94A3B8' : '#64748B'} size={16} strokeWidth={2.5} />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: isDark ? '#E2E8F0' : '#475569',
                    }}>
                    Directive Instructions
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    lineHeight: 22,
                    color: isDark ? '#CBD5E1' : '#334155',
                    fontWeight: '500',
                  }}>
                  {reworkNote.trim()}
                </Text>
              </View>
            </View>

            {/* Warning Message */}
            <View
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(249,115,22,0.05)' : '#FFF7ED',
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
              }}>
              <AlertTriangle color="#F97316" size={20} strokeWidth={2.5} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: '700',
                  color: isDark ? '#FB923C' : '#EA580C',
                  lineHeight: 18,
                }}>
                The field officer will be notified to correct the issue based on these instructions.
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => setShowReworkModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: 20,
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: isDark ? '#94A3B8' : '#64748B',
                  }}>
                  Go Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={performRework}
                activeOpacity={0.9}
                style={{ flex: 2, borderRadius: 20, overflow: 'hidden' }}>
                <LinearGradient
                  colors={['#F97316', '#EA580C']}
                  style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}>
                  <Sparkles color="#FFF" size={18} strokeWidth={2.5} />
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFF' }}>
                    Send Directive
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function VerificationCard({
  label,
  passed,
  distance,
  isDark,
}: {
  label: string;
  passed: boolean;
  distance: number | null;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
        borderWidth: 1.5,
        borderColor: passed
          ? isDark
            ? 'rgba(16,185,129,0.3)'
            : '#D1FAE5'
          : isDark
            ? 'rgba(244,63,94,0.3)'
            : '#FFE4E6',
      }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: passed
            ? isDark
              ? 'rgba(16,185,129,0.15)'
              : '#D1FAE5'
            : isDark
              ? 'rgba(244,63,94,0.15)'
              : '#FFE4E6',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}>
        {passed ? (
          <CheckCheck color={isDark ? '#34D399' : '#059669'} size={22} strokeWidth={2.5} />
        ) : (
          <XCircle color={isDark ? '#FB7185' : '#E11D48'} size={22} strokeWidth={2.5} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '800',
            color: isDark ? '#64748B' : '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
          {label}
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '900',
            color: isDark ? '#F1F5F9' : '#1E293B',
            marginTop: 2,
          }}>
          {passed ? 'Verified Match' : 'Distance Mismatch'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 15, fontWeight: '900', color: passed ? '#10B981' : '#F43F5E' }}>
          {distance !== null ? `${Math.round(distance)}m` : 'N/A'}
        </Text>
        <Text
          style={{
            fontSize: 9,
            fontWeight: '700',
            color: isDark ? '#475569' : '#94A3B8',
            marginTop: 2,
          }}>
          LIMIT: {THRESHOLD_METRES}m
        </Text>
      </View>
    </View>
  );
}
