import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet } from 'react-native';
import {
  MapPin,
  Eye,
  File as FileEdit,
  Globe,
  CircleCheck as CheckCircle2,
  Clock,
  FileX,
  ChevronRight,
  Tag,
  EyeOff,
  Sparkles,
  XCircle,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { PublicIssue, IssueCategory } from '../../lib/types';

interface IssueModerationCardProps {
  issue: PublicIssue;
  isDark: boolean;
  onPreview: () => void;
  onModerate: () => void;
  onUnpublish: () => void;
}

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function IssueModerationCard({
  issue,
  isDark,
  onPreview,
  onModerate,
  onUnpublish,
}: IssueModerationCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      borestiffness: 400,
    } as any).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const catMeta = CATEGORY_COLORS[issue.category] ?? CATEGORY_COLORS['Pothole'];
  const isPublished = issue.publish_status === 'published';
  const hasBeforeImg = issue.before_images?.length > 0;
  const hasAfterImg = issue.after_images?.length > 0;

  const getCardGradient = () => {
    if (issue.status === 'Resolved') {
      return isDark 
        ? ['#064e3b', '#0f172a'] 
        : ['#d1fae5', '#ffffff'];
    } else {
      return isDark 
        ? ['#7f1d1d', '#0f172a'] 
        : ['#fee2e2', '#ffffff'];
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onModerate}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}>
        <View
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isPublished
              ? isDark
                ? '#134e4a'
                : '#99F6E4'
              : isDark
                ? '#334155'
                : '#E2E8F0',
            ...styles.cardShadow,
          }}>
          <LinearGradient
            colors={getCardGradient()}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Published accent top bar */}
          {isPublished && (
            <LinearGradient
              colors={['#0D9488', '#0891B2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 4 }}
            />
          )}

          {/* Before/After thumbnails row */}
          {(hasBeforeImg || hasAfterImg) && (
            <View className="flex-row" style={{ height: 140 }}>
              {hasBeforeImg && (
                <View style={{ flex: 1, position: 'relative' }}>
                  <Image
                    source={{ uri: issue.before_images[0] }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View className="absolute bottom-2 left-2 overflow-hidden rounded-lg">
                    <BlurView intensity={20} tint="dark" className="px-2.5 py-1">
                      <Text className="text-[10px] font-black tracking-widest text-white/90">
                        BEFORE
                      </Text>
                    </BlurView>
                  </View>
                </View>
              )}
              
              {hasBeforeImg && hasAfterImg && (
                <View style={{ width: 2, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', zIndex: 10 }} />
              )}

              {hasAfterImg && (
                <View style={{ flex: 1, position: 'relative' }}>
                  <Image
                    source={{ uri: issue.after_images[0] }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(4,120,87,0.85)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View className="absolute bottom-2 left-2 overflow-hidden rounded-lg">
                    <BlurView intensity={20} tint="light" className="px-2.5 py-1 bg-emerald-900/30">
                      <Text className="text-[10px] font-black tracking-widest text-emerald-100">
                        AFTER
                      </Text>
                    </BlurView>
                  </View>
                </View>
              )}
              
              {hasBeforeImg && !hasAfterImg && (
                <View
                  style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}
                  className="items-center justify-center border-l border-slate-200/50 dark:border-slate-800/50">
                  <FileX color={isDark ? '#334155' : '#CBD5E1'} size={28} strokeWidth={1.5} />
                  <Text className="mt-2 text-[11px] font-bold text-slate-400 dark:text-slate-600">
                    No After Image
                  </Text>
                </View>
              )}
            </View>
          )}

          <View className="p-4">
            {/* Top row: category + publish status */}
            <View className="mb-3 flex-row items-start justify-between">
              <View className="flex-1 flex-row flex-wrap items-center gap-2">
                
                {/* Status Badge */}
                <View
                  className="flex-row items-center gap-1.5 rounded-xl px-2.5 py-1"
                  style={{
                    backgroundColor: issue.status === 'Resolved' 
                      ? (isDark ? '#134e4a' : '#ccfbf1') 
                      : (isDark ? '#450a0a' : '#fee2e2')
                  }}>
                  {issue.status === 'Resolved' ? (
                    <CheckCircle2 color={isDark ? '#2DD4BF' : '#0D9488'} size={11} strokeWidth={2.5} />
                  ) : (
                    <XCircle color={isDark ? '#F87171' : '#EF4444'} size={11} strokeWidth={2.5} />
                  )}
                  <Text
                    className="text-[11px] font-extrabold tracking-wide"
                    style={{ 
                      color: issue.status === 'Resolved' 
                        ? (isDark ? '#2DD4BF' : '#0D9488') 
                        : (isDark ? '#F87171' : '#EF4444') 
                    }}>
                    {issue.status}
                  </Text>
                </View>

                {/* Category Badge */}
                <View
                  className="flex-row items-center gap-1.5 rounded-xl px-2.5 py-1"
                  style={{ backgroundColor: isDark ? catMeta.darkBg : catMeta.bg }}>
                  <Tag color={catMeta.color} size={11} strokeWidth={2.5} />
                  <Text
                    className="text-[11px] font-extrabold tracking-wide"
                    style={{ color: catMeta.color }}>
                    {issue.category}
                  </Text>
                </View>

                {isPublished ? (
                  <View className="flex-row items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-900/40">
                    <Globe color="#059669" size={11} strokeWidth={2.5} />
                    <Text className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                      Published
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 dark:bg-amber-900/30">
                    <Clock color="#D97706" size={11} strokeWidth={2.5} />
                    <Text className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                      Draft
                    </Text>
                  </View>
                )}
              </View>

              {issue.view_count !== undefined && issue.view_count > 0 && (
                <View className="ml-2 flex-row items-center gap-1">
                  <Eye color={isDark ? '#475569' : '#94A3B8'} size={12} strokeWidth={2} />
                  <Text className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {issue.view_count}
                  </Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text
              className="mb-1.5 text-[15px] font-extrabold leading-5 text-slate-800 dark:text-slate-100"
              numberOfLines={2}>
              {issue.title}
            </Text>

            {/* ID + location row */}
            <View className="mb-2 flex-row items-center gap-3">
              <Text className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-400 dark:bg-slate-700/60 dark:text-slate-500">
                {issue.original_issue_id}
              </Text>
              <View className="flex-1 flex-row items-center gap-1">
                <MapPin color={isDark ? '#475569' : '#94A3B8'} size={11} strokeWidth={2.5} />
                <Text
                  className="text-[12px] font-semibold text-slate-500 dark:text-slate-400"
                  numberOfLines={1}>
                  {issue.ward}
                </Text>
              </View>
            </View>

            {/* Summary */}
            <Text
              className="mb-3 text-[12px] leading-[17px] text-slate-500 dark:text-slate-400"
              numberOfLines={2}>
              {issue.description}
            </Text>

            {/* Resolved by + date */}
            <View
              className="mb-3 flex-row items-center gap-2 rounded-xl px-3 py-2"
              style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
              <CheckCircle2 color={isDark ? '#334155' : '#CBD5E1'} size={12} strokeWidth={2.5} />
              <Text
                className="flex-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500"
                numberOfLines={1}>
                {issue.resolved_by}
              </Text>
              <Text className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                {formatDate(issue.created_at)}
              </Text>
            </View>

            {/* Action buttons */}
            <View className="mt-2 flex-row gap-2.5">
              <TouchableOpacity
                onPress={onPreview}
                activeOpacity={0.75}
                className="flex-1 overflow-hidden rounded-xl border"
                style={{
                  borderColor: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)',
                }}>
                <BlurView 
                  intensity={isDark ? 30 : 60} 
                  tint={isDark ? "dark" : "light"}
                  style={[StyleSheet.absoluteFillObject, {
                    backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.8)',
                  }]}
                />
                <View className="flex-row items-center justify-center gap-1.5 px-3 py-3">
                  <Eye color={isDark ? '#94A3B8' : '#64748B'} size={15} strokeWidth={2.5} />
                  <Text className="text-[13px] font-bold text-slate-600 dark:text-slate-300">
                    Preview
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onModerate}
                activeOpacity={0.75}
                className="flex-1 overflow-hidden rounded-xl border"
                style={{
                  borderColor: isDark ? '#1e40af' : '#BFDBFE',
                }}>
                <LinearGradient
                  colors={isDark ? ['#1e3a5f', '#172554'] : ['#EFF6FF', '#DBEAFE']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View className="flex-row items-center justify-center gap-1.5 px-3 py-3">
                  <FileEdit color="#3B82F6" size={15} strokeWidth={2.5} />
                  <Text className="text-[13px] font-bold text-blue-700 dark:text-blue-400">
                    Moderate
                  </Text>
                </View>
              </TouchableOpacity>

              {isPublished ? (
                <TouchableOpacity
                  onPress={onUnpublish}
                  activeOpacity={0.75}
                  className="overflow-hidden rounded-xl border"
                  style={{
                    borderColor: isDark ? '#7f1d1d' : '#FECACA',
                  }}>
                  <LinearGradient
                    colors={isDark ? ['#450a0a', '#2c0606'] : ['#FEF2F2', '#FEE2E2']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View className="flex-row items-center justify-center gap-1.5 px-4 py-3">
                    <EyeOff color="#EF4444" size={15} strokeWidth={2.5} />
                    <Text className="text-[13px] font-bold text-red-600 dark:text-red-400">Unpublish</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={onModerate}
                  activeOpacity={0.85}
                  className="overflow-hidden rounded-xl shadow-sm shadow-teal-600/30">
                  <LinearGradient
                    colors={['#0D9488', '#0891B2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View className="flex-row items-center justify-center gap-1.5 px-5 py-3">
                    <Sparkles color="#FFFFFF" size={14} strokeWidth={2.5} />
                    <Text className="text-[13px] font-extrabold tracking-wide text-white">Publish</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
});
