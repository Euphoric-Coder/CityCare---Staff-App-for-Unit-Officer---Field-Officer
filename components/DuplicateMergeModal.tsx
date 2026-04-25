import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  StyleSheet,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  ChevronLeft as AlignLeft,
  Navigation,
  ChevronRight,
  CircleX as XCircle,
} from 'lucide-react-native';
import { DuplicateGroup, Issue } from '../lib/types';

interface DuplicateMergeModalProps {
  group: DuplicateGroup;
  onClose: () => void;
  onMerge: (keepIssue: Issue, deleteIssueId: string) => void;
  onReject: (issueId: string) => void;
}

type ModalStep = 'compare' | 'merge' | 'reject';

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
}: {
  label: string;
  valA: string;
  valB: string;
  match: boolean;
  icon: React.ReactNode;
}) {
  return (
    <View className="mb-3">
      <View className="mb-1.5 flex-row items-center gap-1.5">
        {icon}
        <Text className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {label}
        </Text>
        <View className="flex-1" />
        <MatchBadge match={match} />
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-700/60 dark:bg-slate-800/80">
          <Text className="mb-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-500">
            Issue A
          </Text>
          <Text
            className="text-[12px] font-semibold leading-[17px] text-slate-700 dark:text-slate-200"
            numberOfLines={3}>
            {valA}
          </Text>
        </View>
        <View className="flex-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-700/60 dark:bg-slate-800/80">
          <Text className="mb-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-500">
            Issue B
          </Text>
          <Text
            className="text-[12px] font-semibold leading-[17px] text-slate-700 dark:text-slate-200"
            numberOfLines={3}>
            {valB}
          </Text>
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
}: {
  issue: Issue;
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  const priorityColor = PRIORITY_COLOR[issue.priority] ?? '#94A3B8';
  const statusColor = STATUS_COLOR[issue.status] ?? '#94A3B8';

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.85}
      className={`mb-3 overflow-hidden rounded-2xl border-2 ${
        selected ? 'border-teal-500 dark:border-teal-400' : 'border-slate-100 dark:border-slate-700'
      }`}>
      {/* Selected Banner */}
      {selected && (
        <LinearGradient
          colors={['#0D9488', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <CheckCircle2 color="#FFFFFF" size={12} strokeWidth={2.5} />

          <Text
            style={{
              marginLeft: 6,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1,
              color: '#FFFFFF',
              includeFontPadding: false,
            }}>
            {label}
          </Text>
        </LinearGradient>
      )}

      {/* CARD BODY */}
      <View className="bg-white p-4 dark:bg-slate-800">
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

        {/* ID */}
        <Text
          style={{
            marginTop: 10,
            fontSize: 10,
            fontWeight: '600',
            color: '#94A3B8',
          }}>
          {issue.id}
        </Text>
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
  const slideAnim = useRef(new Animated.Value(900)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<ModalStep>('compare');
  const [selectedKeep, setSelectedKeep] = useState<string | null>(null);
  const [selectedReject, setSelectedReject] = useState<string | null>(null);

  const [issA, issB] = group.issues;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, []);

  const actionButtonStyle = {
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 900, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleMergeConfirm = () => {
    if (!selectedKeep) return;
    const keepIssue = group.issues.find((i) => i.id === selectedKeep)!;
    const deleteId = group.issues.find((i) => i.id !== selectedKeep)!.id;
    onMerge(keepIssue, deleteId);
    close();
  };

  const handleRejectConfirm = () => {
    if (!selectedReject) return;
    onReject(selectedReject);
    close();
  };

  const distMeters = haversineDistanceMeters(
    issA.coordinates.latitude,
    issA.coordinates.longitude,
    issB.coordinates.latitude,
    issB.coordinates.longitude
  );

  const titleSim = simpleWordSimilarity(issA.title, issB.title);
  const descSim = simpleWordSimilarity(issA.description, issB.description);
  const categoryMatch = issA.category === issB.category;
  const subCatMatch =
    issA.subCategories?.length && issB.subCategories?.length
      ? issA.subCategories[0] === issB.subCategories[0]
      : false;
  const locationSim = simpleWordSimilarity(issA.location, issB.location);
  const isNearby = distMeters < 500;

  const overallScore =
    titleSim * 0.3 +
    descSim * 0.2 +
    (categoryMatch ? 1 : 0) * 0.2 +
    locationSim * 0.15 +
    (isNearby ? 1 : 0) * 0.15;

  const distA = formatDistance(distMeters / 2);
  const distB = formatDistance(distMeters / 2);

  const canConfirmMerge = step === 'merge' && selectedKeep !== null;
  const canConfirmReject = step === 'reject' && selectedReject !== null;

  const stepTitle =
    step === 'compare'
      ? 'Issue Comparison'
      : step === 'merge'
        ? 'Merge — Select Issue to Keep'
        : 'Reject — Select Issue to Remove';

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={{ flex: 1 }} className="flex-1">
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: backdropAnim }]}
          className="bg-black/70"
          pointerEvents="box-none">
          <TouchableOpacity className="flex-1" onPress={close} activeOpacity={1} />
        </Animated.View>

        <Animated.View
          style={{
            flex: 1,
            transform: [{ translateY: slideAnim }],
          }}>
          <View
            className="overflow-hidden rounded-t-[32px] bg-white dark:bg-slate-900"
            style={{
              flex: 1,
              marginTop: Math.max(insets.top + 10, 50),
            }}>
            {/* Drag handle */}
            <View className="items-center pb-1 pt-3">
              <View className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
            </View>

            {/* Header */}
            <View className="overflow-hidden">
              <LinearGradient
                colors={isDark ? ['#0F172A', '#020617'] : ['#FFFBEB', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />

              <View className="flex-row items-center border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/80">
                  <AlertTriangle color="#F59E0B" size={20} strokeWidth={2.5} />
                </View>

                <View className="flex-1">
                  <Text className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                    {stepTitle}
                  </Text>
                  <Text className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {group.citizenName} · {group.issues.length} similar reports
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={close}
                  className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X color={isDark ? '#CBD5E1' : '#64748B'} size={16} strokeWidth={2.5} />
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
                  {/* Similarity reason banner */}
                  <View className="mb-5 flex-row items-start rounded-2xl border border-amber-100 bg-amber-50 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/50">
                    <View className="mr-2.5 pt-0.5">
                      <AlertCircle color="#F59E0B" size={14} strokeWidth={2.5} />
                    </View>
                    <Text className="flex-1 text-[12px] font-semibold leading-[18px] text-amber-800 dark:text-amber-300">
                      {group.similarityReason}
                    </Text>
                  </View>

                  {/* Overall similarity score */}
                  <View className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-[12px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Overall Similarity
                      </Text>
                      <Text
                        className={`text-[13px] font-extrabold ${
                          overallScore >= 0.7
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : overallScore >= 0.4
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-500 dark:text-red-400'
                        }`}>
                        {Math.round(overallScore * 100)}% Similar
                      </Text>
                    </View>
                    <SimilarityBar score={overallScore} />
                  </View>

                  {/* Distance card */}
                  <View className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
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

                    <View className="flex-row gap-2">
                      <View className="flex-1 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                        <Text className="mb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          ISSUE A
                        </Text>
                        <Text
                          className="text-[12px] font-semibold leading-[16px] text-slate-700 dark:text-slate-200"
                          numberOfLines={2}>
                          {issA.location}
                        </Text>
                        <Text className="mt-1.5 text-[10px] font-bold text-teal-500">
                          ~{distA} from midpoint
                        </Text>
                      </View>

                      <View className="flex-1 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                        <Text className="mb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          ISSUE B
                        </Text>
                        <Text
                          className="text-[12px] font-semibold leading-[16px] text-slate-700 dark:text-slate-200"
                          numberOfLines={2}>
                          {issB.location}
                        </Text>
                        <Text className="mt-1.5 text-[10px] font-bold text-teal-500">
                          ~{distB} from midpoint
                        </Text>
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
                    match={titleSim >= 0.4}
                    icon={<AlignLeft color="#64748B" size={11} strokeWidth={2.5} />}
                  />

                  <CompareRow
                    label="Category"
                    valA={issA.category}
                    valB={issB.category}
                    match={categoryMatch}
                    icon={<Tag color="#64748B" size={11} strokeWidth={2.5} />}
                  />

                  <CompareRow
                    label="Sub-category"
                    valA={issA.subCategories?.[0] ?? '—'}
                    valB={issB.subCategories?.[0] ?? '—'}
                    match={subCatMatch}
                    icon={<Layers color="#64748B" size={11} strokeWidth={2.5} />}
                  />

                  <CompareRow
                    label="Description"
                    valA={issA.description}
                    valB={issB.description}
                    match={descSim >= 0.3}
                    icon={<AlignLeft color="#64748B" size={11} strokeWidth={2.5} />}
                  />

                  {/* Similarity breakdown */}
                  <View className="mb-2 mt-1 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
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
                        score: isNearby ? 1 : Math.max(0, 1 - distMeters / 1000),
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
                  <View className="mt-3 flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setStep('merge')}
                      activeOpacity={0.85}
                      className="flex-1 overflow-hidden rounded-2xl">
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
                            fontSize: 13,
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
                      className="flex-1 overflow-hidden rounded-2xl">
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
                            fontSize: 13,
                            fontWeight: '800',
                            includeFontPadding: false,
                          }}>
                          Reject One
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── MERGE STEP ── */}
              {step === 'merge' && (
                <View>
                  <View className="mb-5 flex-row items-start rounded-2xl border border-teal-100 bg-teal-50 p-3.5 dark:border-teal-900/50 dark:bg-teal-950/40">
                    <View className="mr-2.5 pt-0.5">
                      <GitMerge color="#0D9488" size={14} strokeWidth={2.5} />
                    </View>
                    <Text className="flex-1 text-[12px] font-semibold leading-[18px] text-teal-800 dark:text-teal-300">
                      Select the issue you want to keep. The other will be permanently deleted and
                      its data merged into the selected one.
                    </Text>
                  </View>

                  {group.issues.map((issue) => (
                    <IssueSelectCard
                      key={issue.id}
                      issue={issue}
                      selected={selectedKeep === issue.id}
                      label="KEEP THIS ISSUE"
                      onSelect={() => setSelectedKeep(issue.id)}
                    />
                  ))}
                </View>
              )}

              {/* ── REJECT STEP ── */}
              {step === 'reject' && (
                <View>
                  <View className="mb-5 flex-row items-start rounded-2xl border border-red-100 bg-red-50 p-3.5 dark:border-red-900/50 dark:bg-red-950/40">
                    <View className="mr-2.5 pt-0.5">
                      <Trash2 color="#EF4444" size={14} strokeWidth={2.5} />
                    </View>
                    <Text className="flex-1 text-[12px] font-semibold leading-[18px] text-red-800 dark:text-red-300">
                      Select the issue to mark as Rejected with reason "Duplicate". The other issue
                      will remain active.
                    </Text>
                  </View>

                  {group.issues.map((issue) => (
                    <IssueSelectCard
                      key={issue.id}
                      issue={issue}
                      selected={selectedReject === issue.id}
                      label="REJECT THIS ISSUE"
                      onSelect={() => setSelectedReject(issue.id)}
                    />
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Footer — always shown when not on compare step */}
            {step !== 'compare' && (
              <View
                className="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"
                style={{
                  paddingBottom: Math.max(insets.bottom, 12),
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
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
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
                      className="flex-[2] overflow-hidden rounded-2xl"
                      style={{ opacity: canConfirmMerge ? 1 : 0.38 }}>
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
                      className="flex-[2] overflow-hidden rounded-2xl"
                      style={{ opacity: canConfirmReject ? 1 : 0.38 }}>
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
                          Confirm Reject
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '700' },
});
