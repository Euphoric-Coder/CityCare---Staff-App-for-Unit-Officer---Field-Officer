import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  X,
  Globe,
  MapPin,
  Calendar,
  CircleCheck as CheckCircle2,
  CircleX as XCircle,
  Tag,
  Eye,
  ShieldCheck,
  ArrowLeft,
  Info,
  Clock,
  CheckCircle,
  FileText,
  ImageIcon,
  Quote,
} from 'lucide-react-native';
import { PublicIssue, IssueCategory } from '../../lib/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PublicPreviewModalProps {
  issue: PublicIssue;
  isDark: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

const CATEGORY_COLORS: Record<IssueCategory, { color: string; bg: string; darkBg: string }> = {
  Pothole: { color: '#D97706', bg: '#FEF3C7', darkBg: '#451a03' },
  'Street Light': { color: '#CA8A04', bg: '#FEF9C3', darkBg: '#422006' },
  'Waste Management': { color: '#16A34A', bg: '#DCFCE7', darkBg: '#14532d' },
  'Water Supply': { color: '#2563EB', bg: '#DBEAFE', darkBg: '#1e3a5f' },
  Drainage: { color: '#0284C7', bg: '#E0F2FE', darkBg: '#0c2d4a' },
  'Road Repair': { color: '#DB2777', bg: '#FCE7F3', darkBg: '#4a0d2a' },
  'Park Maintenance': { color: '#059669', bg: '#D1FAE5', darkBg: '#064e3b' },
  'Public Safety': { color: '#DC2626', bg: '#FEE2E2', darkBg: '#450a0a' },
};

function formatDate(dateStr?: string) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PublicPreviewModal({ issue, isDark, onClose }: PublicPreviewModalProps) {
  const insets = useSafeAreaInsets();
  const catMeta = CATEGORY_COLORS[issue.category] ?? CATEGORY_COLORS['Pothole'];
  const hasBeforeImg = issue.before_images?.length > 0;
  const hasAfterImg = issue.after_images?.length > 0;
  const isRejected = issue.status === 'Rejected';

  const StatusIcon = isRejected ? XCircle : CheckCircle2;
  const statusColor = isRejected ? '#EF4444' : '#10B981';

  // Advanced gradients
  const bgGradient = isDark ? ['#020617', '#0F172A', '#020617'] : ['#F8FAFC', '#F1F5F9', '#F8FAFC'];
  const headerGradient = isDark ? ['#0F766E', '#064E3B'] : ['#0F766E', '#047857'];

  const statusGradients = isRejected
    ? {
        light: ['#FEF2F2', '#FEE2E2'],
        dark: ['#450A0A', '#290606'],
        border: isDark ? '#7F1D1D' : '#FECACA',
      }
    : {
        light: ['#ECFDF5', '#D1FAE5'],
        dark: ['#064E3B', '#022C22'],
        border: isDark ? '#065F46' : '#A7F3D0',
      };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onClose}>
      <LinearGradient colors={bgGradient} style={{ flex: 1 }}>
        {/* Fake public portal header */}
        <LinearGradient
          colors={headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.portalHeader, { paddingTop: Math.max(insets.top + 10, 50) }]}>
          {/* Animated Glow Orbs */}
          <View className="absolute inset-0 overflow-hidden opacity-30">
            <View className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-teal-300 blur-3xl" />
            <View className="absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-emerald-400 blur-3xl" />
            <View className="absolute left-1/2 top-0 h-32 w-32 -translate-x-16 rounded-full bg-cyan-400 opacity-50 blur-3xl" />
          </View>

          {/* Header Controls */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerLeft}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <BlurView
                intensity={40}
                tint="light"
                className="h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                <ArrowLeft color="#FFFFFF" size={18} strokeWidth={3} />
              </BlurView>
              <Text style={styles.exitText}>Exit Preview</Text>
            </TouchableOpacity>

            <BlurView
              intensity={30}
              tint="light"
              className="flex-row items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-black/20 px-3.5 py-1.5">
              <Globe color="#6EE7B7" size={14} strokeWidth={2.5} />
              <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
                Public Portal
              </Text>
            </BlurView>
          </View>
        </LinearGradient>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 48) }}>
          {/* Main Content Container */}
          <View className="px-5 pt-8">
            {/* Meta Tags Row */}
            <View className="mb-6 flex-row flex-wrap items-center gap-2.5">
              <LinearGradient
                colors={isDark ? statusGradients.dark : statusGradients.light}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-full border shadow-sm"
                style={{ borderColor: statusGradients.border }}>
                <View className="flex-row items-center gap-1.5 px-3.5 py-1.5">
                  <StatusIcon color={statusColor} size={12} strokeWidth={3} />
                  <Text
                    className="text-[11px] font-black uppercase tracking-widest"
                    style={{ color: statusColor, marginTop: 1 }}>
                    {issue.status}
                  </Text>
                </View>
              </LinearGradient>

              <View
                className="flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5 shadow-sm"
                style={{
                  backgroundColor: isDark ? catMeta.darkBg : catMeta.bg,
                  borderColor: isDark ? catMeta.color + '40' : catMeta.color + '40',
                }}>
                <Tag color={catMeta.color} size={12} strokeWidth={2.5} />
                <Text
                  className="text-[11px] font-black uppercase tracking-widest"
                  style={{ color: catMeta.color, marginTop: 1 }}>
                  {issue.category}
                </Text>
              </View>

              <View className="flex-row items-center gap-1.5 rounded-full border border-slate-300 bg-white/50 px-3.5 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400" style={{ marginTop: 1 }}>
                  ID: {issue.original_issue_id}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text className="mb-5 text-[28px] font-black leading-[34px] tracking-tighter text-slate-900 dark:text-white">
              {issue.title}
            </Text>

            {/* Location */}
            <View className="mb-8 flex-row items-center gap-3">
              <View className="items-center justify-center rounded-full bg-indigo-100/50 p-2.5 dark:bg-indigo-900/30">
                <MapPin color={isDark ? '#818CF8' : '#6366F1'} size={16} strokeWidth={2.5} />
              </View>
              <Text className="flex-1 text-[15px] font-bold text-slate-600 dark:text-slate-300">
                {issue.ward} · {issue.location}
              </Text>
            </View>

            {/* Original Description */}
            {issue.description && (
              <View className="relative mb-10">
                <View className="mb-3 flex-row items-center gap-2">
                  <FileText color={isDark ? '#64748B' : '#94A3B8'} size={15} strokeWidth={2.5} />
                  <Text className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Citizen Report
                  </Text>
                </View>

                <View className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white/60 p-6 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
                  {/* Subtle watermark quote icon */}
                  <View className="absolute -right-4 -top-4 opacity-5 dark:opacity-10">
                    <Quote size={80} color={isDark ? '#FFFFFF' : '#000000'} />
                  </View>
                  <Text className="relative z-10 text-[16px] font-medium italic leading-[28px] text-slate-700 dark:text-slate-300">
                    "{issue.description}"
                  </Text>
                </View>
              </View>
            )}

            {/* Timeline */}
            <View className="mb-10">
              <View className="mb-5 flex-row items-center gap-2">
                <Clock color={isDark ? '#64748B' : '#94A3B8'} size={15} strokeWidth={2.5} />
                <Text className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Issue Timeline
                </Text>
              </View>

              <View className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
                {/* Created */}
                <View className="mb-6 flex-row gap-5">
                  <View className="items-center">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 shadow-sm dark:bg-slate-800">
                      <View className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                    </View>
                    <View className="mt-2 h-10 w-0.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                  </View>
                  <View className="flex-1 pt-1">
                    <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">
                      Reported by Citizen
                    </Text>
                    <Text className="mt-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(issue.created_at)}
                    </Text>
                  </View>
                </View>

                {/* Reviewed/Moderated */}
                <View className="mb-6 flex-row gap-5">
                  <View className="items-center">
                    <View className="h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 shadow-sm shadow-blue-500/20 dark:border-blue-800/50 dark:bg-blue-900/30">
                      <View className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    </View>
                    <View className="mt-2 h-10 w-0.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                  </View>
                  <View className="flex-1 pt-1">
                    <Text className="text-[14px] font-black text-slate-800 dark:text-slate-100">
                      Reviewed by {issue.moderated_by || 'Unit Officer'}
                    </Text>
                    <Text className="mt-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(issue.reviewed_at || issue.moderated_at)}
                    </Text>
                  </View>
                </View>

                {/* Resolved / Rejected */}
                <View className="flex-row gap-5">
                  <View className="items-center">
                    <View
                      className="h-8 w-8 items-center justify-center rounded-full shadow-lg"
                      style={{
                        backgroundColor: isRejected
                          ? isDark
                            ? '#450A0A'
                            : '#FEE2E2'
                          : isDark
                            ? '#064E3B'
                            : '#D1FAE5',
                        shadowColor: statusColor,
                      }}>
                      <StatusIcon color={statusColor} size={14} strokeWidth={3} />
                    </View>
                  </View>
                  <View className="flex-1 pt-1">
                    <Text
                      className="text-[14px] font-black"
                      style={{
                        color: isRejected
                          ? isDark
                            ? '#FCA5A5'
                            : '#B91C1C'
                          : isDark
                            ? '#34D399'
                            : '#047857',
                      }}>
                      {isRejected ? 'Rejected' : 'Resolved'} by{' '}
                      {issue.resolved_by || 'Field Officer'}
                    </Text>
                    <Text className="mt-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(issue.resolved_date)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Evidence Gallery */}
            {(hasBeforeImg || hasAfterImg) && (
              <View className="mb-10">
                <View className="mb-4 flex-row items-center gap-2">
                  <ImageIcon color={isDark ? '#64748B' : '#94A3B8'} size={15} strokeWidth={2.5} />
                  <Text className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Evidence Gallery
                  </Text>
                </View>

                <View className="flex-row gap-4">
                  {hasBeforeImg && (
                    <View
                      className="flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
                      style={{ height: 180 }}>
                      <Image
                        source={{ uri: issue.before_images[0] }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={StyleSheet.absoluteFillObject}
                        locations={[0.4, 1]}
                      />
                      <View className="absolute bottom-3 left-3 overflow-hidden rounded-full border border-white/20">
                        <BlurView intensity={30} tint="dark" className="px-3.5 py-1.5">
                          <Text className="text-[10px] font-black tracking-widest text-white">
                            BEFORE
                          </Text>
                        </BlurView>
                      </View>
                    </View>
                  )}
                  {hasAfterImg && (
                    <View
                      className="flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-xl shadow-emerald-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
                      style={{ height: 180 }}>
                      <Image
                        source={{ uri: issue.after_images[0] }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(4,120,87,0.8)']}
                        style={StyleSheet.absoluteFillObject}
                        locations={[0.4, 1]}
                      />
                      <View className="absolute bottom-3 right-3 overflow-hidden rounded-full border border-emerald-300/30">
                        <BlurView
                          intensity={30}
                          tint="light"
                          className="bg-emerald-900/20 px-3.5 py-1.5">
                          <Text className="text-[10px] font-black tracking-widest text-white">
                            AFTER
                          </Text>
                        </BlurView>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Official Summary (Public Note) */}
            <View className="mb-10 overflow-hidden rounded-[28px] shadow-2xl shadow-slate-200/60 dark:shadow-black/50">
              <LinearGradient
                colors={isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F8FAFC']}
                style={StyleSheet.absoluteFillObject}
              />
              <View className="absolute inset-0 rounded-[28px] border border-slate-200/80 dark:border-slate-700/50" />

              <View
                className="flex-row items-center gap-2.5 border-b px-6 py-5"
                style={{
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
                }}>
                <View className="rounded-full bg-emerald-100/50 p-1.5 dark:bg-emerald-900/30">
                  <Info color={isDark ? '#34D399' : '#059669'} size={16} strokeWidth={2.5} />
                </View>
                <Text className="text-[14px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  Public Summary
                </Text>
              </View>

              <View className="p-6">
                {isRejected && issue.rejection_reason && (
                  <View className="mb-5 rounded-[20px] border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-900/50 dark:bg-red-950/30">
                    <Text className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                      Rejection Reason
                    </Text>
                    <Text className="text-[15px] font-bold leading-6 text-red-900 dark:text-red-200">
                      {issue.rejection_reason}
                    </Text>
                  </View>
                )}
                <Text className="text-[16px] font-medium leading-[28px] text-slate-700 dark:text-slate-300">
                  {issue.summary}
                </Text>
              </View>
            </View>

            {/* Privacy notice */}
            <View className="mb-10 flex-row items-center gap-3.5 rounded-[20px] border border-blue-100 bg-blue-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              <View className="rounded-full bg-blue-100 p-2 dark:bg-slate-800">
                <ShieldCheck color={isDark ? '#94A3B8' : '#3B82F6'} size={16} strokeWidth={2.5} />
              </View>
              <Text className="flex-1 text-[12px] font-semibold leading-[18px] text-slate-600 dark:text-slate-400">
                Personal information has been removed from this public record to protect citizen
                privacy.
              </Text>
            </View>

            {/* Footer */}
            <View className="mb-4 items-center opacity-50">
              <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-500">
                Moderated by {issue.moderated_by || 'Unit Officer'}
              </Text>
              <Text className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
                CityCare Transparency Portal
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  portalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exitText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
