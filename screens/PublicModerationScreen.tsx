import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Globe,
  Search,
  SlidersHorizontal,
  Eye,
  File as FileEdit,
  CircleCheck as CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
} from 'lucide-react-native';
import { PublicIssue } from 'lib/types';
import { publicIssues as initialPublicIssues } from 'lib/mockData';
import IssueModerationCard from 'components/Public/IssueModerateCard';
import ModerationBottomSheet from 'components/Public/ModerationButtonSheet';
import PublicPreviewModal from 'components/Public/PublicPreviewModal';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useUser } from 'context/UserContext';
import { Id } from 'convex/_generated/dataModel';
import { mapToMobilePublicIssues } from 'lib/issueMapper';

type FilterTab = 'all' | 'published' | 'draft';

function StatsBar({ issues, isDark }: { issues: PublicIssue[]; isDark: boolean }) {
  const published = issues?.filter((i) => i.publish_status === 'published').length;
  const drafts = issues?.filter((i) => i.publish_status === 'draft').length;
  const totalViews = issues?.reduce((s, i) => s + (i.view_count ?? 0), 0);

  const stats = [
    {
      label: 'Published',
      value: published,
      icon: Globe,
      color: '#0D9488',
      bg: isDark ? '#134e4a' : '#f0fdfa',
    },
    {
      label: 'Drafts',
      value: drafts,
      icon: FileText,
      color: '#F59E0B',
      bg: isDark ? '#451a03' : '#fefce8',
    },
    {
      label: 'Total Views',
      value: totalViews,
      icon: TrendingUp,
      color: '#3B82F6',
      bg: isDark ? '#1e3a5f' : '#eff6ff',
    },
  ];

  return (
    <View className="mb-5 mt-2 flex-row gap-3 px-5">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <View
            key={s.label}
            className="flex-1 overflow-hidden rounded-3xl border"
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              ...styles.cardShadow,
            }}>
            <LinearGradient
              colors={isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F8FAFC']}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Subtle glow indicator */}
            <View
              style={{
                position: 'absolute',
                top: -15,
                right: -15,
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: s.color,
                opacity: 0.15,
              }}
            />

            <View className="p-4">
              <View
                className="mb-2.5 h-8 w-8 items-center justify-center rounded-xl"
                style={{ backgroundColor: s.bg }}>
                <Icon color={s.color} size={15} strokeWidth={2.5} />
              </View>
              <Text className="text-[24px] font-black tracking-tight text-slate-800 dark:text-white">
                {s.value}
              </Text>
              <Text className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {s.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function PublicModerationScreen() {
  const colorScheme = useColorScheme();
  const user = useUser();
  const isDark = colorScheme === 'dark';
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [moderatingIssue, setModeratingIssue] = useState<PublicIssue | null>(null);
  const [previewingIssue, setPreviewingIssue] = useState<PublicIssue | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = React.useRef(new Animated.Value(0)).current;

  const rawIssues = useQuery(api.publicIssues.getPublicIssues, {
    unitOfficerId: user?.id as Id<'users'>,
  });

  const publishPublicIssue = useMutation(api.publicIssues.publishPublicIssue);

  const unpublishPublicIssue = useMutation(api.publicIssues.unpublishPublicIssue);

  const saveDraftPublicIssue = useMutation(api.publicIssues.saveDraftPublicIssue);

  const issues = mapToMobilePublicIssues(rawIssues ?? []);

  const showToast = useCallback(
    (msg: string) => {
      setToastMessage(msg);
      setToastVisible(true);
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(toastOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start(() => setToastVisible(false));
    },
    [toastOpacity]
  );

  const handlePublish = useCallback(
    async (updated: PublicIssue) => {
      try {
        await publishPublicIssue({
          id: updated.id as Id<'publicIssues'>,
          title: updated.title.trim(),
          publicCompletionNote: updated.publicCompletionNote?.trim() || '',
          foVisible: updated.foVisible,
          moderatedAt: new Date().getTime(),
        });

        showToast('Issue successfully published to public dashboard');
      } catch (error) {
        console.error('Failed to publish issue:', error);
        showToast('Failed to publish issue');
      }
    },
    [publishPublicIssue, showToast]
  );

  const handleSaveDraft = useCallback(
    async (updated: PublicIssue) => {
      try {
        await saveDraftPublicIssue({
          id: updated.id as Id<'publicIssues'>,
          title: updated.title.trim(),
          publicCompletionNote: updated.publicCompletionNote?.trim() || '',
          foVisible: updated.foVisible ?? true,
        });

        showToast('Draft saved successfully');
      } catch (error) {
        console.error('Failed to save draft:', error);
        showToast('Failed to save draft');
      }
    },
    [saveDraftPublicIssue, showToast]
  );

  const handleUnpublish = useCallback(
    async (id: string) => {
      try {
        await unpublishPublicIssue({ id: id as Id<'publicIssues'> });

        showToast('Issue moved back to drafts');
      } catch (error) {
        console.error('Failed to unpublish issue:', error);
        showToast('Failed to unpublish issue');
      }
    },
    [unpublishPublicIssue, showToast]
  );

  const FILTERS: {
    key: FilterTab;
    label: string;
    icon: React.ComponentType<{ color: string; size: number; strokeWidth: number }>;
  }[] = [
    { key: 'all', label: 'All', icon: SlidersHorizontal },
    { key: 'published', label: 'Published', icon: Globe },
    { key: 'draft', label: 'Drafts', icon: FileEdit },
  ];

  const filtered = issues?.filter((issue) => {
    const matchFilter =
      activeFilter === 'all' ||
      (activeFilter === 'published' && issue.publish_status === 'published') ||
      (activeFilter === 'draft' && issue.publish_status === 'draft');

    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      issue.title.toLowerCase().includes(q) ||
      issue.original_issue_id.toLowerCase().includes(q) ||
      issue.ward.toLowerCase().includes(q) ||
      issue.category.toLowerCase().includes(q);

    return matchFilter && matchSearch;
  });

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#090E17]">
      <StatusBar style="light" />

      {/* Header */}
      <View style={{ paddingBottom: 24 }}>
        <LinearGradient
          colors={isDark ? ['#020617', '#0F172A', '#1E293B'] : ['#0F766E', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFillObject,
            { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
          ]}
        />
        {/* Decorative elements */}
        <View
          style={{
            position: 'absolute',
            right: -30,
            top: -20,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: '#2DD4BF',
            opacity: 0.1,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: -40,
            bottom: -10,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: '#38BDF8',
            opacity: 0.1,
          }}
        />

        <SafeAreaView edges={['top']} className="px-5 pt-4">
          <View className="flex-row items-center gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-sm">
              <Globe color="#FFFFFF" size={22} strokeWidth={2.5} />
            </View>
            <View>
              <Text className="text-[11px] font-bold uppercase tracking-widest text-teal-100/70">
                Transparency Portal
              </Text>
              <Text className="text-[22px] font-black tracking-tight text-white shadow-sm">
                Public Moderation
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-center gap-2.5">
            <View className="flex-row items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5">
              <CheckCircle2 color="#6EE7B7" size={12} strokeWidth={2.5} />
              <Text className="text-[12px] font-bold text-emerald-100">
                {issues?.filter((i) => i.publish_status === 'published').length} Live
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1.5">
              <Clock color="#FCD34D" size={12} strokeWidth={2.5} />
              <Text className="text-[12px] font-bold text-amber-100">
                {issues?.filter((i) => i.publish_status === 'draft').length} Pending
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}>
        {/* Stats */}
        <StatsBar issues={issues} isDark={isDark} />

        {/* Search */}
        <View className="mb-4 px-5">
          <View
            className="flex-row items-center gap-3 rounded-2xl border px-4 py-3.5"
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
              ...styles.searchShadow,
            }}>
            <Search color={isDark ? '#475569' : '#94A3B8'} size={18} strokeWidth={2.5} />
            <TextInput
              className="flex-1 text-[15px] font-medium text-slate-800 dark:text-slate-100"
              placeholder="Search by title, ID, ward..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                <View className="h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                  <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    ✕
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 4 }}
          className="mb-5">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            const Icon = f.icon;
            const count =
              f.key === 'all'
                ? issues?.length
                : issues?.filter((i) => i.publish_status === f.key).length;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.8}
                className="overflow-hidden rounded-full border"
                style={{
                  borderColor: isActive ? 'transparent' : isDark ? '#334155' : '#E2E8F0',
                  backgroundColor: isActive ? 'transparent' : isDark ? '#1E293B' : '#FFFFFF',
                }}>
                {isActive && (
                  <LinearGradient
                    colors={['#0D9488', '#0891B2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}
                <View className="flex-row items-center gap-2 px-4 py-3">
                  <Icon
                    color={isActive ? '#FFFFFF' : isDark ? '#64748B' : '#94A3B8'}
                    size={14}
                    strokeWidth={2.5}
                  />
                  <Text
                    className="text-[14px] font-bold"
                    style={{ color: isActive ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B' }}>
                    {f.label}
                  </Text>
                  <View
                    className="min-w-[22px] items-center rounded-full px-1.5 py-0.5"
                    style={{
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.25)'
                        : isDark
                          ? '#0F172A'
                          : '#F1F5F9',
                    }}>
                    <Text
                      className="text-[11px] font-extrabold"
                      style={{ color: isActive ? '#FFFFFF' : isDark ? '#64748B' : '#94A3B8' }}>
                      {count}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section label */}
        <View className="mb-3 flex-row items-center justify-between px-4">
          <Text className="text-[12px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {filtered?.length} issue{filtered?.length !== 1 ? 's' : ''}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Eye color={isDark ? '#475569' : '#94A3B8'} size={12} strokeWidth={2.5} />
            <Text className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {issues?.reduce((s, i) => s + (i.view_count ?? 0), 0)} total views
            </Text>
          </View>
        </View>

        {/* Issue cards */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          {filtered?.length === 0 ? (
            <View className="items-center py-16">
              <View
                className="mb-4 h-16 w-16 items-center justify-center rounded-3xl"
                style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}>
                <Globe color={isDark ? '#475569' : '#CBD5E1'} size={28} strokeWidth={1.5} />
              </View>
              <Text className="mb-1 text-[16px] font-bold text-slate-400 dark:text-slate-500">
                No issues found
              </Text>
              <Text className="px-8 text-center text-[13px] text-slate-400 dark:text-slate-600">
                Try adjusting your search or filter to find issues
              </Text>
            </View>
          ) : (
            filtered?.map((issue, index) => (
              <View key={issue.id} style={{ marginBottom: index < filtered?.length - 1 ? 12 : 0 }}>
                <IssueModerationCard
                  issue={issue}
                  isDark={isDark}
                  onPreview={() => setPreviewingIssue(issue)}
                  onModerate={() => setModeratingIssue(issue)}
                  onUnpublish={() => handleUnpublish(issue.id)}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Moderation bottom sheet */}
      {moderatingIssue && (
        <ModerationBottomSheet
          issue={moderatingIssue}
          isDark={isDark}
          onClose={() => setModeratingIssue(null)}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onSaveDraft={handleSaveDraft}
        />
      )}

      {/* Preview modal */}
      {previewingIssue && (
        <PublicPreviewModal
          issue={previewingIssue}
          isDark={isDark}
          onClose={() => setPreviewingIssue(null)}
        />
      )}

      {/* Toast */}
      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <CheckCircle2 color="#FFFFFF" size={16} strokeWidth={2.5} />
          <Text className="flex-1 text-[13px] font-bold text-white">{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  searchShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#0D9488',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
});
