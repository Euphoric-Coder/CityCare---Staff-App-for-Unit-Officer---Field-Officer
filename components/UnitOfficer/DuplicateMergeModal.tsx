import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
  useColorScheme,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import {
  X,
  GitMerge,
  Trash2,
  Calendar,
  MapPin,
  Tag,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle2,
  TriangleAlert as AlertTriangle,
  Layers,
  AlignLeft,
  ChevronLeft,
  Navigation,
  ChevronRight,
  CircleX as XCircle,
  Zap,
  Droplets,
  Recycle,
  Package,
  HeartPulse,
  MoreHorizontal,
} from 'lucide-react-native';
import { DuplicateGroup, Issue } from 'lib/types';

interface DuplicateMergeModalProps {
  group: DuplicateGroup;
  onClose: () => void;
  onMerge: (keepIssue: Issue, deleteIssueId: string) => void;
  onReject: (issueIds: string[]) => void;
}

type ModalStep = 'compare' | 'merge' | 'reject';

const CATEGORIES = [
  { value: "road", label: "Road & Infrastructure", icon: MapPin, color: "text-blue-600 dark:text-blue-400" },
  { value: "electricity", label: "Electricity & Lighting", icon: Zap, color: "text-yellow-600 dark:text-yellow-400" },
  { value: "water", label: "Water Supply", icon: Droplets, color: "text-cyan-600 dark:text-cyan-400" },
  { value: "sanitation", label: "Sanitation & Waste", icon: Trash2, color: "text-green-600 dark:text-green-400" },
  { value: "drainage", label: "Drainage & Sewer", icon: Recycle, color: "text-purple-600 dark:text-purple-400" },
  { value: "solid_waste", label: "Solid Waste Management", icon: Package, color: "text-orange-600 dark:text-orange-400" },
  { value: "public_health", label: "Public Health", icon: HeartPulse, color: "text-red-600 dark:text-red-400" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "text-gray-600 dark:text-gray-400" },
];

const PRIORITY_COLOR: Record<string, string> = {
  Critical: '#DC2626',
  High: '#F97316',
  Medium: '#F59E0B',
  Low: '#16A34A',
};

const STATUS_COLOR: Record<string, string> = {
  Pending: '#F59E0B',
  Verified: '#10B981',
  Assigned: '#3B82F6',
  'In Progress': '#8B5CF6',
  Rejected: '#EF4444',
  Closed: '#94A3B8',
  'Pending UO Verification': '#F59E0B',
  'Rework Required': '#EF4444',
  Reopened: '#F97316',
  Escalated: '#DC2626',
};

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function simpleWordSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function MatchBadge({ match }: { match: boolean }) {
  if (match) {
    return (
      <View className="flex-row items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-0.5 dark:border-emerald-900/50 dark:bg-emerald-950/60">
        <CheckCircle2 color="#10B981" size={10} strokeWidth={2.5} />
        <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Match</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2 py-0.5 dark:border-red-900/50 dark:bg-red-950/50">
      <XCircle color="#EF4444" size={10} strokeWidth={2.5} />
      <Text className="text-[10px] font-bold text-red-500 dark:text-red-400">Differs</Text>
    </View>
  );
}

function SimilarityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <View
          style={{ width: `${pct}%`, backgroundColor: color, height: '100%', borderRadius: 4 }}
        />
      </View>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{pct}%</Text>
    </View>
  );
}

function CompareRow({
  label,
  valA,
  valB,
  match,
  icon,
  titleA = 'Issue A',
  titleB = 'Issue B',
}: {
  label: string;
  valA: React.ReactNode | string;
  valB: React.ReactNode | string;
  match: boolean;
  icon: React.ReactNode;
  titleA?: string;
  titleB?: string;
}) {
  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center gap-1.5">
        {icon}
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {label}
        </Text>
        <View className="flex-1" />
        <MatchBadge match={match} />
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-[18px] border-[1.5px] border-slate-100/80 bg-white/60 p-3.5 dark:border-slate-700/60 dark:bg-slate-800/60">
          <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {titleA}
          </Text>
          {typeof valA === 'string' ? (
            <Text className="text-[13px] font-semibold leading-[20px] text-slate-700 dark:text-slate-200">
              {valA}
            </Text>
          ) : (
            valA
          )}
        </View>
        <View className="flex-1 rounded-[18px] border-[1.5px] border-slate-100/80 bg-white/60 p-3.5 dark:border-slate-700/60 dark:bg-slate-800/60">
          <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {titleB}
          </Text>
          {typeof valB === 'string' ? (
            <Text className="text-[13px] font-semibold leading-[20px] text-slate-700 dark:text-slate-200">
              {valB}
            </Text>
          ) : (
            valB
          )}
        </View>
      </View>
    </View>
  );
}

function IssueSelectCard({
  issue,
  selected,
  label,
  onSelect,
  intent = 'merge',
}: {
  issue: Issue;
  selected: boolean;
  label: string;
  onSelect: () => void;
  intent?: 'merge' | 'reject';
}) {
  const priorityColor = PRIORITY_COLOR[issue.priority] ?? '#94A3B8';
  const statusColor = STATUS_COLOR[issue.status] ?? '#94A3B8';

  const borderColor =
    intent === 'merge'
      ? 'border-teal-500 dark:border-teal-400'
      : 'border-red-500 dark:border-red-400';
  const gradientColors = intent === 'merge' ? ['#0D9488', '#0891B2'] : ['#EF4444', '#DC2626'];

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.85}
      className={`mb-4 overflow-hidden rounded-[20px] border-[2px] ${
        selected ? borderColor : 'border-slate-200 dark:border-slate-700/80'
      }`}>
      {/* Selected Banner */}
      {selected && (
        <LinearGradient
          colors={gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <CheckCircle2 color="#FFFFFF" size={14} strokeWidth={3} />

          <Text
            style={{
              marginLeft: 8,
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: 1.5,
              color: '#FFFFFF',
              includeFontPadding: false,
            }}>
            {label}
          </Text>
        </LinearGradient>
      )}

      {/* CARD BODY */}
      <View className="bg-white/80 p-5 dark:bg-slate-800/90">
        {/* Priority + Status */}
        <View className="mb-3 flex-row flex-wrap gap-2">
          <View
            className="flex-row items-center rounded-lg px-2.5 py-1"
            style={{ backgroundColor: `${priorityColor}20` }}>
            <View style={[styles.dot, { backgroundColor: priorityColor, marginRight: 6 }]} />
            <Text style={[styles.pillText, { color: priorityColor }]}>
              {issue.priority?.toUpperCase()}
            </Text>
          </View>

          <View
            className="flex-row items-center rounded-lg px-2.5 py-1"
            style={{ backgroundColor: `${statusColor}20` }}>
            <View style={[styles.dot, { backgroundColor: statusColor, marginRight: 6 }]} />
            <Text style={[styles.pillText, { color: statusColor }]}>{issue.status}</Text>
          </View>
        </View>

        {/* Title */}
        <Text
          className="mb-3 text-[14px] font-extrabold leading-[20px] text-slate-900 dark:text-slate-50"
          numberOfLines={2}>
          {issue.title}
        </Text>

        {/* Meta Info */}
        <View style={{ gap: 6 }}>
          {/* Location */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MapPin color="#9CA3AF" size={12} strokeWidth={2} />
            <Text
              style={{
                flex: 1,
                marginLeft: 6,
                fontSize: 11,
                color: '#64748B',
              }}
              numberOfLines={1}>
              {issue.location}
            </Text>
          </View>

          {/* Date */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Calendar color="#9CA3AF" size={12} strokeWidth={2} />
            <Text style={{ marginLeft: 6, fontSize: 11, color: '#64748B' }}>
              {formatDate(issue.dateReported)}
            </Text>
          </View>

          {/* Category */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Tag color="#9CA3AF" size={12} strokeWidth={2} />
            <Text style={{ marginLeft: 6, fontSize: 11, color: '#64748B' }}>
              {issue.category}
              {issue.subCategories?.length ? ` · ${issue.subCategories[0]}` : ''}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DuplicateMergeModal({
  group,
  onClose,
  onMerge,
  onReject,
}: DuplicateMergeModalProps) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [isClosing, setIsClosing] = useState(false);

  const [step, setStep] = useState<ModalStep>('compare');
  const [selectedKeep, setSelectedKeep] = useState<string | null>(null);
  const [selectedReject, setSelectedReject] = useState<string[]>([]);
  const [compareIdx, setCompareIdx] = useState(0);

  // Build all unique pairs for comparison
  const pairs = useMemo(() => {
    const p: [number, number][] = [];
    for (let i = 0; i < group.issues.length; i++)
      for (let j = i + 1; j < group.issues.length; j++) p.push([i, j]);
    return p;
  }, [group.issues.length]);

  const [idxA, idxB] = pairs[compareIdx] ?? [0, 1];
  const issA = group.issues[idxA];
  const issB = group.issues[idxB];

  const currentPairMetrics = useMemo(() => {
    return group.pairMetrics?.find(
      (pair) =>
        (pair.issueAId === issA.id && pair.issueBId === issB.id) ||
        (pair.issueAId === issB.id && pair.issueBId === issA.id)
    );
  }, [group.pairMetrics, issA.id, issB.id]);

  const actionButtonStyle = {
    height: 50,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const close = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 280);
  };

  const handleMergeConfirm = () => {
    if (!selectedKeep) return;
    const keepIssue = group.issues.find((i) => i.id === selectedKeep)!;
    const deleteIds = group.issues.filter((i) => i.id !== selectedKeep).map((i) => i.id);
    // onMerge(keepIssue, deleteId);
    console.log('Keep Issue:', keepIssue);
    console.log('Delete ID:', deleteIds);
    close();
  };

  const handleRejectConfirm = () => {
    if (selectedReject.length === 0) return;
    // onReject(selectedReject);
    console.log('Selected Reject:', selectedReject);
    close();
  };

  const distMeters = haversineDistanceMeters(
    issA.coordinates.latitude,
    issA.coordinates.longitude,
    issB.coordinates.latitude,
    issB.coordinates.longitude
  );

  const titleSim =
    currentPairMetrics?.titleSimilarity ?? simpleWordSimilarity(issA.title, issB.title);

  const descSim =
    currentPairMetrics?.descriptionSimilarity ??
    simpleWordSimilarity(issA.description, issB.description);

  const categoryMatch = currentPairMetrics?.categoryMatch ?? issA.category === issB.category;

  const subCatMatch =
    currentPairMetrics?.subCategoryMatch ??
    Boolean(
      issA.subCategories?.length &&
      issB.subCategories?.length &&
      issA.subCategories[0] === issB.subCategories[0]
    );

  const matchedSubCategories = currentPairMetrics?.matchedSubCategories || [];

  const locationSim =
    currentPairMetrics?.locationSimilarity ?? simpleWordSimilarity(issA.location, issB.location);

  const proximitySim = currentPairMetrics?.proximitySimilarity ?? (distMeters < 500 ? 1 : 0);

  const isNearby = currentPairMetrics ? currentPairMetrics.distanceMeters <= 500 : distMeters < 500;

  const duplicateScore = currentPairMetrics?.duplicateScore;

  const distA = formatDistance(distMeters / 2);
  const distB = formatDistance(distMeters / 2);

  const canConfirmMerge = step === 'merge' && selectedKeep !== null;
  const canConfirmReject = step === 'reject' && selectedReject.length > 0;

  const stepTitle =
    step === 'compare'
      ? 'Issue Comparison'
      : step === 'merge'
        ? 'Merge — Select Issue to Keep'
        : 'Reject — Select Issue to Remove';

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      {!isClosing && (
        <>
          {/* Blurred backdrop */}
          <Animated.View entering={FadeIn.duration(350)} style={StyleSheet.absoluteFillObject}>
            <BlurView
              intensity={isDark ? 40 : 25}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
              experimentalBlurMethod="dimezisBlurView"
            />
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            entering={SlideInDown.springify().damping(80).stiffness(200)}
            style={{ flex: 1, marginTop: Math.max(insets.top + 10, 50) }}>
            <BlurView
              intensity={isDark ? 80 : 100}
              tint={isDark ? 'dark' : 'light'}
              experimentalBlurMethod="dimezisBlurView"
              className="overflow-hidden rounded-t-[32px]"
              style={{
                flex: 1,
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.88)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                borderWidth: 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
                elevation: 20,
              }}>
              {/* Specular top highlight */}
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255,255,255,0.06)', 'transparent']
                    : ['rgba(255,255,255,0.5)', 'transparent']
                }
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.15 }}
                pointerEvents="none"
              />

              {/* Drag handle */}
              <View className="items-center pb-1 pt-4">
                <View
                  className="h-1.5 w-11 rounded-full"
                  style={{ backgroundColor: isDark ? '#475569' : '#CBD5E1', opacity: 0.6 }}
                />
              </View>

              {/* Header */}
              <View className="border-b border-slate-100/50 px-5 py-4 dark:border-slate-800/50">
                <View className="flex-row items-center">
                  {/* Deep Glass Icon Well */}
                  <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-[16px] bg-amber-500/15">
                    <View className="absolute inset-0 rounded-[16px] border-[1.5px] border-amber-400/30 dark:border-amber-600/20" />
                    <AlertTriangle
                      color={isDark ? '#FCD34D' : '#D97706'}
                      size={22}
                      strokeWidth={2.5}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[17px] font-black tracking-tight text-slate-900 dark:text-slate-50">
                      {stepTitle}
                    </Text>
                    <Text className="mt-0.5 text-[12px] font-bold text-slate-400 dark:text-slate-500">
                      {group.citizenName} · {group.issues.length} reports
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={close}
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(241,245,249,0.8)',
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X color={isDark ? '#94A3B8' : '#64748B'} size={17} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Step tabs */}
              <View className="flex-row gap-2 px-5 pb-0 pt-4">
                {(['compare', 'merge', 'reject'] as ModalStep[]).map((s) => {
                  const labels = { compare: 'Compare', merge: 'Merge', reject: 'Reject' };
                  const isActive = step === s;
                  const isReject = s === 'reject';

                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setStep(s)}
                      activeOpacity={0.8}
                      className={`flex-1 rounded-xl border py-2.5 ${
                        isActive
                          ? isReject
                            ? 'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-950/50'
                            : 'border-teal-200 bg-teal-50 dark:border-teal-800/60 dark:bg-teal-950/50'
                          : 'border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                      }`}>
                      <View className="flex-row items-center justify-center">
                        <View className="mr-1.5">
                          {s === 'compare' && (
                            <Layers
                              size={12}
                              color={isActive ? '#0D9488' : '#9CA3AF'}
                              strokeWidth={2.5}
                            />
                          )}
                          {s === 'merge' && (
                            <GitMerge
                              size={12}
                              color={isActive ? '#0D9488' : '#9CA3AF'}
                              strokeWidth={2.5}
                            />
                          )}
                          {s === 'reject' && (
                            <Trash2
                              size={12}
                              color={isActive ? '#EF4444' : '#9CA3AF'}
                              strokeWidth={2.5}
                            />
                          )}
                        </View>

                        <Text
                          className={`text-[12px] font-bold ${
                            isActive
                              ? isReject
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-teal-600 dark:text-teal-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}>
                          {labels[s]}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  padding: 20,
                  paddingBottom: step === 'compare' ? 20 : 120,
                }}
                keyboardShouldPersistTaps="handled">
                {/* ── COMPARE STEP ── */}
                {step === 'compare' && (
                  <View>
                    {/* Pair Navigator — only visible when 3+ issues */}
                    {pairs.length > 1 && (
                      <View
                        className="mb-4 flex-row items-center justify-between rounded-2xl border border-slate-100/80 p-3 dark:border-slate-700/60"
                        style={{
                          backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.6)',
                        }}>
                        <TouchableOpacity
                          onPress={() => setCompareIdx((p) => Math.max(0, p - 1))}
                          disabled={compareIdx === 0}
                          className="h-8 w-8 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: isDark ? 'rgba(51,65,85,0.6)' : '#E2E8F0',
                            opacity: compareIdx === 0 ? 0.35 : 1,
                          }}>
                          <ChevronLeft
                            color={isDark ? '#CBD5E1' : '#475569'}
                            size={16}
                            strokeWidth={3}
                          />
                        </TouchableOpacity>

                        <View className="flex-1 items-center px-3">
                          <Text className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Comparison Pair
                          </Text>
                          <Text className="mt-0.5 text-[15px] font-black text-slate-700 dark:text-slate-200">
                            {compareIdx + 1} of {pairs.length}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => setCompareIdx((p) => Math.min(pairs.length - 1, p + 1))}
                          disabled={compareIdx === pairs.length - 1}
                          className="h-8 w-8 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: isDark ? 'rgba(51,65,85,0.6)' : '#E2E8F0',
                            opacity: compareIdx === pairs.length - 1 ? 0.35 : 1,
                          }}>
                          <ChevronRight
                            color={isDark ? '#CBD5E1' : '#475569'}
                            size={16}
                            strokeWidth={3}
                          />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Full Width Context Headers */}
                    <View className="mb-6 gap-3">
                      <View className="rounded-[20px] border-[1.5px] border-slate-200/80 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-800/80">
                        <View className="mb-1.5 flex-row items-center gap-2">
                          <View className="h-2 w-2 rounded-full bg-amber-500" />
                          <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Issue {idxA + 1}
                          </Text>
                        </View>
                        <Text className="text-[14px] font-bold leading-[22px] text-slate-800 dark:text-slate-100">
                          {issA.title}
                        </Text>
                      </View>
                      <View className="rounded-[20px] border-[1.5px] border-slate-200/80 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-800/80">
                        <View className="mb-1.5 flex-row items-center gap-2">
                          <View className="h-2 w-2 rounded-full bg-emerald-500" />
                          <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Issue {idxB + 1}
                          </Text>
                        </View>
                        <Text className="text-[14px] font-bold leading-[22px] text-slate-800 dark:text-slate-100">
                          {issB.title}
                        </Text>
                      </View>
                    </View>

                    {/* Similarity reason banner */}
                    <View
                      className="mb-5 flex-row items-start rounded-2xl border border-amber-100/80 p-3.5 dark:border-amber-900/50"
                      style={{
                        backgroundColor: isDark ? 'rgba(69,26,3,0.4)' : 'rgba(255,251,235,0.8)',
                      }}>
                      <View className="mr-2.5 pt-0.5">
                        <AlertCircle color="#F59E0B" size={14} strokeWidth={2.5} />
                      </View>
                      <Text className="flex-1 text-[12px] font-semibold leading-[18px] text-amber-800 dark:text-amber-300">
                        {group.similarityReason}
                      </Text>
                    </View>

                    {/* Overall similarity score */}
                    <View
                      className="mb-5 overflow-hidden rounded-2xl border border-slate-100/60 p-4 dark:border-slate-700/50"
                      style={{
                        backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.7)',
                      }}>
                      <View className="mb-2 flex-row items-center justify-between">
                        <Text className="text-[12px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Overall Similarity
                        </Text>
                        <Text
                          className={`text-[13px] font-extrabold ${
                            // @ts-ignore
                            duplicateScore >= 0.7
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : // @ts-ignore
                                duplicateScore >= 0.4
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-500 dark:text-red-400'
                          }`}>
                          {/* @ts-ignore */}
                          {Math.round(duplicateScore)}% Similar
                        </Text>
                      </View>
                      {/* @ts-ignore */}
                      <SimilarityBar score={duplicateScore / 100} />
                    </View>

                    {/* Distance card */}
                    <View
                      className="mb-5 overflow-hidden rounded-2xl border border-slate-100/60 p-4 dark:border-slate-700/50"
                      style={{
                        backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.7)',
                      }}>
                      <View className="mb-3 flex-row items-center">
                        <Navigation color="#0D9488" size={14} strokeWidth={2.5} />
                        <Text className="ml-2 text-[12px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Location Distance
                        </Text>
                        <View className="flex-1" />
                        <View
                          className={`rounded-lg px-2.5 py-1 ${
                            isNearby
                              ? 'bg-emerald-50 dark:bg-emerald-950/60'
                              : 'bg-amber-50 dark:bg-amber-950/60'
                          }`}>
                          <Text
                            className={`text-[11px] font-bold ${
                              isNearby
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}>
                            {isNearby ? 'Very Close' : 'Farther Apart'}
                          </Text>
                        </View>
                      </View>

                      <View className="mb-3 items-center">
                        <Text className="text-[26px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                          {formatDistance(distMeters)}
                        </Text>
                        <Text className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          apart (Haversine formula)
                        </Text>
                      </View>

                      <View className="flex-row gap-3">
                        <View className="flex-1 rounded-[16px] border-[1.5px] border-slate-100/80 bg-slate-50/60 p-3.5 dark:border-slate-700/60 dark:bg-slate-800/60">
                          <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Issue {idxA + 1}
                          </Text>
                          <Text className="text-[13px] font-semibold leading-[20px] text-slate-700 dark:text-slate-200">
                            {issA.location}
                          </Text>
                          <View className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-lg bg-teal-50/50 px-2 py-1 dark:bg-teal-900/20">
                            <Navigation color="#14B8A6" size={10} strokeWidth={3} />
                            <Text className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400">
                              ~{distA}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-1 rounded-[16px] border-[1.5px] border-slate-100/80 bg-slate-50/60 p-3.5 dark:border-slate-700/60 dark:bg-slate-800/60">
                          <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Issue {idxB + 1}
                          </Text>
                          <Text className="text-[13px] font-semibold leading-[20px] text-slate-700 dark:text-slate-200">
                            {issB.location}
                          </Text>
                          <View className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-lg bg-teal-50/50 px-2 py-1 dark:bg-teal-900/20">
                            <Navigation color="#14B8A6" size={10} strokeWidth={3} />
                            <Text className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400">
                              ~{distB}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Parameter comparisons */}
                    <Text className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Field Comparison
                    </Text>

                    <CompareRow
                      label="Title"
                      valA={issA.title}
                      valB={issB.title}
                      titleA={`Issue ${idxA + 1}`}
                      titleB={`Issue ${idxB + 1}`}
                      match={titleSim >= 0.4}
                      icon={<AlignLeft color="#64748B" size={11} strokeWidth={2.5} />}
                    />

                    <CompareRow
                      label="Category"
                      valA={
                        <View className="flex-row items-start gap-1.5 pt-0.5">
                          {(() => {
                            const cat = CATEGORIES.find((c) => c.value === issA.category);
                            if (!cat) return <Text className="flex-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">{issA.category}</Text>;
                            const IconCmp = cat.icon;
                            return (
                              <>
                                <View className="mt-0.5">
                                  <IconCmp size={14} color="#64748B" strokeWidth={2.5} />
                                </View>
                                <Text className={`flex-1 text-[13px] font-bold leading-[20px] ${cat.color}`}>
                                  {cat.label}
                                </Text>
                              </>
                            );
                          })()}
                        </View>
                      }
                      valB={
                        <View className="flex-row items-start gap-1.5 pt-0.5">
                          {(() => {
                            const cat = CATEGORIES.find((c) => c.value === issB.category);
                            if (!cat) return <Text className="flex-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">{issB.category}</Text>;
                            const IconCmp = cat.icon;
                            return (
                              <>
                                <View className="mt-0.5">
                                  <IconCmp size={14} color="#64748B" strokeWidth={2.5} />
                                </View>
                                <Text className={`flex-1 text-[13px] font-bold leading-[20px] ${cat.color}`}>
                                  {cat.label}
                                </Text>
                              </>
                            );
                          })()}
                        </View>
                      }
                      titleA={issA.title}
                      titleB={issB.title}
                      match={categoryMatch}
                      icon={<Tag color="#64748B" size={11} strokeWidth={2.5} />}
                    />

                    <CompareRow
                      label="Sub-category"
                      valA={matchedSubCategories?.join(', ') || '—'}
                      valB={matchedSubCategories?.join(', ') || '—'}
                      titleA={issA.title}
                      titleB={issB.title}
                      match={subCatMatch}
                      icon={<Layers color="#64748B" size={11} strokeWidth={2.5} />}
                    />

                    <CompareRow
                      label="Description"
                      valA={issA.description}
                      valB={issB.description}
                      titleA={issA.title}
                      titleB={issB.title}
                      match={descSim >= 0.3}
                      icon={<AlignLeft color="#64748B" size={11} strokeWidth={2.5} />}
                    />

                    {/* Similarity breakdown */}
                    <View
                      className="mb-2 mt-1 overflow-hidden rounded-2xl border border-slate-100/60 p-4 dark:border-slate-700/50"
                      style={{
                        backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.7)',
                      }}>
                      <Text className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Similarity Breakdown
                      </Text>

                      {[
                        { label: 'Title Match', score: titleSim },
                        { label: 'Description Match', score: descSim },
                        { label: 'Location Match', score: locationSim },
                        { label: 'Category Match', score: categoryMatch ? 1 : 0 },
                        {
                          label: 'Proximity',
                          score: proximitySim,
                        },
                      ].map(({ label, score }) => (
                        <View key={label} className="mb-2">
                          <View className="mb-1 flex-row justify-between">
                            <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {label}
                            </Text>
                            <Text className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {Math.round(score * 100)}%
                            </Text>
                          </View>
                          <SimilarityBar score={score} />
                        </View>
                      ))}
                    </View>

                    {/* CTA buttons */}
                    <View className="mt-4 flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => setStep('merge')}
                        activeOpacity={0.85}
                        className="flex-1 overflow-hidden rounded-[18px]"
                        style={{
                          shadowColor: '#0D9488',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 10,
                          elevation: 5,
                        }}>
                        <LinearGradient
                          colors={['#0D9488', '#0891B2']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={actionButtonStyle}>
                          <View style={{ marginRight: 8 }}>
                            <GitMerge color="#FFFFFF" size={15} strokeWidth={2.5} />
                          </View>
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 14,
                              fontWeight: '800',
                              includeFontPadding: false,
                            }}>
                            Merge
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setStep('reject')}
                        activeOpacity={0.85}
                        className="flex-1 overflow-hidden rounded-[18px]"
                        style={{
                          shadowColor: '#EF4444',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 10,
                          elevation: 5,
                        }}>
                        <LinearGradient
                          colors={['#EF4444', '#DC2626']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={actionButtonStyle}>
                          <View style={{ marginRight: 8 }}>
                            <Trash2 color="#FFFFFF" size={15} strokeWidth={2.5} />
                          </View>
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 14,
                              fontWeight: '800',
                              includeFontPadding: false,
                            }}>
                            Reject Issues
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* ── MERGE STEP ── */}
                {step === 'merge' && (
                  <View>
                    <View className="mb-6 overflow-hidden rounded-[24px] border-[1.5px] border-teal-200/60 bg-teal-50/80 p-5 dark:border-teal-900/50 dark:bg-teal-950/40">
                      <View className="mb-3 flex-row items-center gap-2">
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/60">
                          <GitMerge color="#0D9488" size={16} strokeWidth={2.5} />
                        </View>
                        <Text className="text-[13px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">
                          Merge Issues
                        </Text>
                      </View>
                      <Text className="text-[13px] font-medium leading-[20px] text-teal-800 dark:text-teal-300">
                        Select the{' '}
                        <Text className="font-black text-teal-900 dark:text-teal-100">
                          primary issue
                        </Text>{' '}
                        you want to keep. All other issues in this group will be permanently deleted
                        and their data merged into the primary one.
                      </Text>
                    </View>

                    <View className="gap-3">
                      {group.issues.map((issue) => (
                        <IssueSelectCard
                          key={issue.id}
                          issue={issue}
                          selected={selectedKeep === issue.id}
                          label="KEEP THIS ISSUE"
                          intent="merge"
                          onSelect={() => setSelectedKeep(issue.id)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* ── REJECT STEP ── */}
                {step === 'reject' && (
                  <View>
                    <View className="mb-6 overflow-hidden rounded-[24px] border-[1.5px] border-red-200/60 bg-red-50/80 p-5 dark:border-red-900/50 dark:bg-red-950/40">
                      <View className="mb-3 flex-row items-center gap-2">
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/60">
                          <Trash2 color="#EF4444" size={16} strokeWidth={2.5} />
                        </View>
                        <Text className="text-[13px] font-black uppercase tracking-widest text-red-700 dark:text-red-400">
                          Reject Duplicates
                        </Text>
                      </View>
                      <Text className="text-[13px] font-medium leading-[20px] text-red-800 dark:text-red-300">
                        Select the issues you want to mark as{' '}
                        <Text className="font-black text-red-900 dark:text-red-100">
                          Rejected (Duplicate)
                        </Text>
                        . You must leave at least one issue active.
                      </Text>
                    </View>

                    <View className="gap-3">
                      {group.issues.map((issue) => (
                        <IssueSelectCard
                          key={issue.id}
                          issue={issue}
                          selected={selectedReject.includes(issue.id)}
                          label="REJECT THIS ISSUE"
                          intent="reject"
                          onSelect={() => {
                            setSelectedReject((prev) => {
                              const isCurrentlySelected = prev.includes(issue.id);
                              if (!isCurrentlySelected && prev.length === group.issues.length - 1) {
                                Alert.alert(
                                  'Invalid Selection',
                                  'You cannot reject all issues in this group. You must keep at least one issue active.',
                                  [{ text: 'Understood', style: 'default' }]
                                );
                                return prev;
                              }
                              return isCurrentlySelected
                                ? prev.filter((id) => id !== issue.id)
                                : [...prev, issue.id];
                            });
                          }}
                        />
                      ))}
                    </View>

                    {/* Selection counter */}
                    {selectedReject.length > 0 && (
                      <View
                        className="mt-4 flex-row items-center justify-center rounded-[16px] border-[1.5px] border-red-200/50 p-3 dark:border-red-900/50"
                        style={{
                          backgroundColor: isDark ? 'rgba(69,10,10,0.4)' : 'rgba(254,226,226,0.6)',
                        }}>
                        <Text className="text-[13px] font-black tracking-wide text-red-600 dark:text-red-400">
                          {selectedReject.length} issue{selectedReject.length > 1 ? 's' : ''}{' '}
                          selected for rejection
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Footer — always shown when not on compare step */}
              {step !== 'compare' && (
                <View
                  className="border-t border-slate-100/50 dark:border-slate-800/50"
                  style={{
                    paddingBottom: Math.max(insets.bottom, 16),
                    paddingTop: 14,
                    paddingHorizontal: 20,
                  }}>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setStep('compare')}
                      activeOpacity={0.75}
                      style={[
                        actionButtonStyle,
                        {
                          flex: 1,
                          backgroundColor: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(241,245,249,0.8)',
                          borderWidth: 1.5,
                          borderColor: isDark ? 'rgba(51,65,85,0.6)' : '#E2E8F0',
                        },
                      ]}>
                      <Text
                        style={{
                          color: isDark ? '#CBD5E1' : '#64748B',
                          fontSize: 14,
                          fontWeight: '700',
                          includeFontPadding: false,
                        }}>
                        Back
                      </Text>
                    </TouchableOpacity>

                    {step === 'merge' && (
                      <TouchableOpacity
                        onPress={handleMergeConfirm}
                        activeOpacity={canConfirmMerge ? 0.85 : 1}
                        className="flex-[2] overflow-hidden rounded-[18px]"
                        style={{
                          opacity: canConfirmMerge ? 1 : 0.38,
                          shadowColor: '#0D9488',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: canConfirmMerge ? 0.35 : 0,
                          shadowRadius: 10,
                          elevation: canConfirmMerge ? 6 : 0,
                        }}>
                        <LinearGradient
                          colors={['#0D9488', '#0891B2']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={actionButtonStyle}>
                          <View style={{ marginRight: 8 }}>
                            <GitMerge color="#FFFFFF" size={16} strokeWidth={2.5} />
                          </View>
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 14,
                              fontWeight: '800',
                              includeFontPadding: false,
                            }}>
                            Confirm Merge
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}

                    {step === 'reject' && (
                      <TouchableOpacity
                        onPress={handleRejectConfirm}
                        activeOpacity={canConfirmReject ? 0.85 : 1}
                        className="flex-[2] overflow-hidden rounded-[18px]"
                        style={{
                          opacity: canConfirmReject ? 1 : 0.38,
                          shadowColor: '#EF4444',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: canConfirmReject ? 0.35 : 0,
                          shadowRadius: 10,
                          elevation: canConfirmReject ? 6 : 0,
                        }}>
                        <LinearGradient
                          colors={['#EF4444', '#DC2626']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={actionButtonStyle}>
                          <View style={{ marginRight: 8 }}>
                            <Trash2 color="#FFFFFF" size={16} strokeWidth={2.5} />
                          </View>
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 14,
                              fontWeight: '800',
                              includeFontPadding: false,
                            }}>
                            Reject {selectedReject.length > 1 ? `(${selectedReject.length})` : ''}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </BlurView>
          </Animated.View>
        </>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '700' },
});
