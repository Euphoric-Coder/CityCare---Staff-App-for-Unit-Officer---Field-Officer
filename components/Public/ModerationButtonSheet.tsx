import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Globe,
  FileText,
  ShieldCheck,
  TriangleAlert as AlertTriangle,
  ChevronRight,
  CircleCheck as CheckCircle2,
  Image as ImageIcon,
  Tag,
  MapPin,
  UserX,
  Eye,
  EyeOff,
  Quote,
  Check,
  Edit3,
  CircleX,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { PublicIssue } from 'lib/types';

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

interface ModerationBottomSheetProps {
  issue: PublicIssue;
  isDark: boolean;
  onClose: () => void;
  onPublish: (updated: PublicIssue) => void;
  onUnpublish: (id: string) => void;
  onSaveDraft: (updated: PublicIssue) => void;
}

const REDACTION_ITEMS = [
  { icon: UserX, label: 'Citizen name removed', color: '#EF4444' },
  { icon: Tag, label: 'Phone number redacted', color: '#F59E0B' },
  { icon: MapPin, label: 'Exact address anonymised', color: '#8B5CF6' },
  { icon: ShieldCheck, label: 'Private notes excluded', color: '#0D9488' },
];

function SelectableOption({
  selected,
  onSelect,
  title,
  icon: Icon,
  children,
  isDark,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  icon: any;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onSelect}
      className="mb-3 overflow-hidden rounded-2xl border-2"
      style={{
        borderColor: selected ? '#0D9488' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        backgroundColor: selected
          ? isDark
            ? 'rgba(13,148,136,0.1)'
            : '#F0FDFA'
          : isDark
            ? 'rgba(30,41,59,0.5)'
            : '#F8FAFC',
      }}>
      <View
        className="flex-row items-center border-b px-4 py-3"
        style={{
          borderColor: selected
            ? 'rgba(13,148,136,0.2)'
            : isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.05)',
        }}>
        <Icon
          color={selected ? '#0D9488' : isDark ? '#94A3B8' : '#64748B'}
          size={16}
          strokeWidth={2.5}
        />
        <Text
          className="ml-2 text-[12px] font-extrabold uppercase tracking-widest"
          style={{ color: selected ? '#0D9488' : isDark ? '#94A3B8' : '#64748B' }}>
          {title}
        </Text>
        <View className="flex-1" />
        <View
          className="h-5 w-5 items-center justify-center rounded-full border-2"
          style={{
            borderColor: selected ? '#0D9488' : isDark ? '#475569' : '#CBD5E1',
            backgroundColor: selected ? '#0D9488' : 'transparent',
          }}>
          {selected && <Check color="#FFFFFF" size={12} strokeWidth={3} />}
        </View>
      </View>
      <View className="p-4">{children}</View>
    </TouchableOpacity>
  );
}

export default function ModerationBottomSheet({
  issue,
  isDark,
  onClose,
  onPublish,
  onUnpublish,
  onSaveDraft,
}: ModerationBottomSheetProps) {
  const [titleMode, setTitleMode] = useState<'original' | 'moderated'>('moderated');
  const [customTitle, setCustomTitle] = useState(issue.title || '');

  const [summaryMode, setSummaryMode] = useState<'original' | 'moderated'>('moderated');
  const [customSummary, setCustomSummary] = useState(issue.summary || '');

  const [resolvedBy, setResolvedBy] = useState(issue.resolved_by || '');
  const [isPrivateResolvedBy, setIsPrivateResolvedBy] = useState(true);
  const [actionPrompt, setActionPrompt] = useState<'none' | 'unpublish' | 'draft'>('none');

  const categoryLabel = CATEGORY_LABEL_MAP[issue.category] ?? issue.category;
  const privateResolvedByText = `Field Officer - ${categoryLabel} Unit`;

  const wordCount = customSummary
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const hasMinWords = summaryMode === 'original' || wordCount >= 20;

  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(900)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 800, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const finalTitle = titleMode === 'original' ? issue.title : customTitle;
  const finalSummary = summaryMode === 'original' ? issue.description : customSummary;

  const buildUpdated = (): any => ({
    id: issue.id,
    title: finalTitle.trim(),
    publicCompletionNote: finalSummary?.trim(),
    foVisible: isPrivateResolvedBy ? false : true,
    moderatedAt: new Date().toISOString(),
  });

  const handlePublish = () => {
    if (hasMinWords) onPublish(buildUpdated());
  };

  const handleSaveDraft = () => {
    onSaveDraft(buildUpdated());
  };

  const confirmUnpublish = () => {
    setActionPrompt('unpublish');
  };

  const confirmSaveDraft = () => {
    setActionPrompt('draft');
  };

  const hasImages = issue.before_images?.length > 0 || issue.after_images?.length > 0;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={{ flex: 1 }}>
        {/* Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdropAnim },
          ]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={close} activeOpacity={1} />
        </Animated.View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none">
          {/* Sheet */}
          <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
            <View
              style={[
                styles.panelContainer,
                isDark ? styles.panelDark : styles.panelLight,
                { marginTop: Math.max(insets.top + 20, 60) },
              ]}>
              <BlurView
                intensity={isDark ? 40 : 60}
                style={StyleSheet.absoluteFill}
                tint={isDark ? 'dark' : 'light'}
              />

              {/* Handle */}
              <View className="items-center pb-1 pt-3">
                <View
                  className="h-1.5 w-12 rounded-full"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
                />
              </View>

              {/* Header */}
              <View style={styles.sheetHeader}>
                <View className="flex-1 flex-row items-center gap-4">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: isDark ? '#134e4a' : '#CCFBF1' }}>
                    <ShieldCheck color="#0D9488" size={22} strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text
                      className="text-[20px] font-black tracking-tight"
                      style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      Moderate Issue
                    </Text>
                    <Text className="mt-0.5 text-[12px] font-bold" style={{ color: '#0EA5A4' }}>
                      {issue.original_issue_id} • {categoryLabel}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={close}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X color={isDark ? '#94A3B8' : '#64748B'} size={18} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 20, paddingBottom: 16 }}>
                {/* Redaction notice */}
                <View
                  className="mb-5 rounded-2xl border p-4"
                  style={{
                    backgroundColor: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(239,246,255,0.7)',
                    borderColor: isDark ? 'rgba(30,58,138,0.5)' : '#BFDBFE',
                  }}>
                  <View className="mb-3 flex-row items-center gap-2">
                    <ShieldCheck color="#3B82F6" size={16} strokeWidth={2.5} />
                    <Text className="text-[13px] font-black tracking-tight text-blue-700 dark:text-blue-400">
                      Redaction Applied Automatically
                    </Text>
                  </View>
                  <View className="gap-2">
                    {REDACTION_ITEMS.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <View key={i} className="flex-row items-center gap-2.5">
                          <View
                            className="h-6 w-6 items-center justify-center rounded-xl"
                            style={{ backgroundColor: item.color + '22' }}>
                            <Icon color={item.color} size={12} strokeWidth={2.5} />
                          </View>
                          <Text className="text-[12px] font-bold text-blue-800 dark:text-blue-300">
                            {item.label}
                          </Text>
                          <CheckCircle2
                            color="#0D9488"
                            size={12}
                            strokeWidth={2.5}
                            style={{ marginLeft: 'auto' }}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Title Section */}
                <View className="mb-6">
                  <Text className="mb-3 text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                    Public Title
                  </Text>

                  <SelectableOption
                    selected={titleMode === 'original'}
                    onSelect={() => setTitleMode('original')}
                    title="Keep Original"
                    icon={Quote}
                    isDark={isDark}>
                    <Text className="text-[14px] font-medium italic text-slate-700 dark:text-slate-300">
                      "{issue.title}"
                    </Text>
                  </SelectableOption>

                  <SelectableOption
                    selected={titleMode === 'moderated'}
                    onSelect={() => setTitleMode('moderated')}
                    title="Use Moderated"
                    icon={Edit3}
                    isDark={isDark}>
                    <TextInput
                      value={customTitle}
                      onChangeText={setCustomTitle}
                      editable={titleMode === 'moderated'}
                      className="text-[15px] font-bold"
                      style={[
                        styles.inputBox,
                        {
                          backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.8)',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          color: isDark ? '#F8FAFC' : '#0F172A',
                          opacity: titleMode === 'moderated' ? 1 : 0.5,
                        },
                      ]}
                      placeholder="Enter a moderated title..."
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    />
                  </SelectableOption>
                </View>

                {/* Summary / Description Section */}
                <View className="mb-6">
                  <Text className="mb-3 text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                    Public Description
                  </Text>

                  <SelectableOption
                    selected={summaryMode === 'original'}
                    onSelect={() => setSummaryMode('original')}
                    title="Keep Original"
                    icon={Quote}
                    isDark={isDark}>
                    <Text className="text-[14px] font-medium italic leading-6 text-slate-700 dark:text-slate-300">
                      "{issue.description}"
                    </Text>
                  </SelectableOption>

                  <SelectableOption
                    selected={summaryMode === 'moderated'}
                    onSelect={() => setSummaryMode('moderated')}
                    title="Use Moderated"
                    icon={Edit3}
                    isDark={isDark}>
                    <View className="mb-2 flex-row justify-end">
                      <Text
                        className="text-[11px] font-bold"
                        style={{
                          color:
                            wordCount >= 20 || summaryMode === 'original' ? '#10B981' : '#EF4444',
                        }}>
                        {wordCount} / 20 words min
                      </Text>
                    </View>
                    <TextInput
                      value={customSummary}
                      onChangeText={setCustomSummary}
                      editable={summaryMode === 'moderated'}
                      className="text-[14px] font-medium leading-6"
                      style={[
                        styles.textAreaBox,
                        {
                          backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.8)',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          color: isDark ? '#E2E8F0' : '#374151',
                          opacity: summaryMode === 'moderated' ? 1 : 0.5,
                        },
                      ]}
                      placeholder="Write a clear public summary..."
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      multiline
                      textAlignVertical="top"
                    />
                  </SelectableOption>
                </View>

                {/* Resolved By */}
                <View className="mb-6">
                  <Text
                    className="mb-3 text-[12px] font-extrabold uppercase tracking-widest"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Resolved By (Public Identity)
                  </Text>

                  <View className="mb-3 flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setIsPrivateResolvedBy(true)}
                      activeOpacity={0.8}
                      className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3"
                      style={{
                        backgroundColor: isPrivateResolvedBy
                          ? isDark
                            ? '#134e4a'
                            : '#CCFBF1'
                          : isDark
                            ? 'rgba(30,41,59,0.5)'
                            : '#F8FAFC',
                        borderColor: isPrivateResolvedBy
                          ? '#0D9488'
                          : isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.1)',
                      }}>
                      <EyeOff
                        color={isPrivateResolvedBy ? '#0D9488' : isDark ? '#64748B' : '#94A3B8'}
                        size={16}
                        strokeWidth={2.5}
                      />
                      <Text
                        className="text-[13px] font-bold"
                        style={{
                          color: isPrivateResolvedBy ? '#0D9488' : isDark ? '#94A3B8' : '#64748B',
                        }}>
                        Anonymized
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsPrivateResolvedBy(false)}
                      activeOpacity={0.8}
                      className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3"
                      style={{
                        backgroundColor: !isPrivateResolvedBy
                          ? isDark
                            ? '#1e3a5f'
                            : '#DBEAFE'
                          : isDark
                            ? 'rgba(30,41,59,0.5)'
                            : '#F8FAFC',
                        borderColor: !isPrivateResolvedBy
                          ? '#3B82F6'
                          : isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.1)',
                      }}>
                      <Eye
                        color={!isPrivateResolvedBy ? '#3B82F6' : isDark ? '#64748B' : '#94A3B8'}
                        size={16}
                        strokeWidth={2.5}
                      />
                      <Text
                        className="text-[13px] font-bold"
                        style={{
                          color: !isPrivateResolvedBy ? '#3B82F6' : isDark ? '#94A3B8' : '#64748B',
                        }}>
                        Custom Name
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    value={
                      isPrivateResolvedBy
                        ? privateResolvedByText
                        : `${resolvedBy} (FO ${categoryLabel} Unit)`
                    }
                    onChangeText={setResolvedBy}
                    editable={!isPrivateResolvedBy}
                    className="text-[14px] font-medium"
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isPrivateResolvedBy
                          ? isDark
                            ? 'rgba(15,23,42,0.4)'
                            : '#F1F5F9'
                          : isDark
                            ? 'rgba(15,23,42,0.6)'
                            : 'rgba(255,255,255,0.8)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        color: isPrivateResolvedBy
                          ? isDark
                            ? '#64748B'
                            : '#94A3B8'
                          : isDark
                            ? '#F1F5F9'
                            : '#0F172A',
                      },
                    ]}
                    placeholder="e.g. Field Officer Team"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  />
                </View>

                {/* Location & Ward (read-only) */}
                <View className="mb-5 flex-row gap-3">
                  <View
                    className="flex-1 rounded-2xl border p-4"
                    style={{
                      backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.5)',
                      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    }}>
                    <Text className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Ward
                    </Text>
                    <Text
                      className="text-[14px] font-black tracking-tight text-slate-700 dark:text-slate-200"
                      numberOfLines={2}>
                      {issue.ward}
                    </Text>
                  </View>
                  <View
                    className="flex-1 rounded-2xl border p-4"
                    style={{
                      backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.5)',
                      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    }}>
                    <Text className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Status
                    </Text>
                    <Text
                      className="text-[14px] font-black tracking-tight"
                      style={{ color: issue.status === 'Resolved' ? '#0D9488' : '#EF4444' }}>
                      {issue.status}
                    </Text>
                  </View>
                </View>

                {/* Images preview */}
                {hasImages && (
                  <View className="mb-4">
                    <Text
                      className="mb-2 text-[12px] font-extrabold uppercase tracking-widest"
                      style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      Images Included
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}>
                      {[...issue.before_images, ...issue.after_images].map((uri, i) => (
                        <View key={i} style={{ position: 'relative' }}>
                          <Image source={{ uri }} style={styles.imgThumb} resizeMode="cover" />
                          <View
                            className="absolute bottom-1.5 left-1.5 rounded-lg px-1.5 py-0.5"
                            style={{
                              backgroundColor:
                                i < issue.before_images?.length
                                  ? 'rgba(15,23,42,0.75)'
                                  : 'rgba(4,120,87,0.8)',
                            }}>
                            <Text className="text-[9px] font-extrabold tracking-widest text-white">
                              {i < issue.before_images?.length ? 'BEFORE' : 'AFTER'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Warning */}
                <View
                  className="mb-2 flex-row items-start gap-3 rounded-2xl border p-3.5"
                  style={{
                    backgroundColor: isDark ? '#1C0A0A' : '#FEF2F2',
                    borderColor: isDark ? '#7f1d1d' : '#FECACA',
                  }}>
                  <AlertTriangle
                    color="#EF4444"
                    size={14}
                    strokeWidth={2.5}
                    style={{ marginTop: 1 }}
                  />
                  <Text className="flex-1 text-[12px] font-semibold leading-[17px] text-red-600 dark:text-red-400">
                    Once published, this will be visible to the public on the CityCare transparency
                    portal.
                  </Text>
                </View>
              </ScrollView>

              {/* Footer actions */}
              <ScrollView
                scrollEnabled={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  backgroundColor: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)',
                }}>
                <TouchableOpacity
                  onPress={confirmSaveDraft}
                  activeOpacity={0.75}
                  className="flex-1 items-center justify-center rounded-2xl border py-4"
                  style={{
                    backgroundColor: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  }}>
                  <View className="flex-row items-center gap-2">
                    <FileText color={isDark ? '#94A3B8' : '#64748B'} size={15} strokeWidth={2.5} />
                    <Text
                      className="text-[14px] font-bold"
                      style={{ color: isDark ? '#E2E8F0' : '#475569' }}>
                      Save Draft
                    </Text>
                  </View>
                </TouchableOpacity>

                {issue.publish_status === 'published' ? (
                  <TouchableOpacity
                    onPress={confirmUnpublish}
                    activeOpacity={0.85}
                    style={[styles.publishBtn, { flex: 1.5 }]}>
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.publishBtnGrad}>
                      <CircleX color="#FFFFFF" size={16} strokeWidth={2.5} />
                      <Text className="text-[14px] font-extrabold text-white">Unpublish</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handlePublish}
                    disabled={!hasMinWords}
                    activeOpacity={0.85}
                    style={[styles.publishBtn, { flex: 1.5, opacity: hasMinWords ? 1 : 0.6 }]}>
                    <LinearGradient
                      colors={['#0D9488', '#0891B2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.publishBtnGrad}>
                      <Globe color="#FFFFFF" size={16} strokeWidth={2.5} />
                      <Text className="text-[14px] font-extrabold text-white">
                        {hasMinWords ? 'Publish Now' : 'Need more words'}
                      </Text>
                      {hasMinWords && (
                        <ChevronRight color="rgba(255,255,255,0.7)" size={15} strokeWidth={2.5} />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* Custom Dialog Overlay */}
            {actionPrompt !== 'none' && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { justifyContent: 'center', alignItems: 'center', zIndex: 100 },
                ]}>
                <View
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)', ...StyleSheet.absoluteFillObject }}
                />
                <BlurView
                  intensity={isDark ? 20 : 10}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />

                <View
                  className="w-[85%] overflow-hidden rounded-[28px] border shadow-2xl"
                  style={{
                    backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.25,
                    shadowRadius: 20,
                  }}>
                  <View className="items-center px-6 pb-6 pt-8">
                    <View
                      className="mb-4 h-16 w-16 items-center justify-center rounded-full"
                      style={{
                        backgroundColor:
                          actionPrompt === 'unpublish'
                            ? isDark
                              ? '#450A0A'
                              : '#FEE2E2'
                            : isDark
                              ? '#1E3A8A'
                              : '#DBEAFE',
                      }}>
                      <AlertTriangle
                        color={actionPrompt === 'unpublish' ? '#EF4444' : '#3B82F6'}
                        size={32}
                        strokeWidth={2.5}
                      />
                    </View>
                    <Text
                      className="mb-2 text-center text-[22px] font-black tracking-tight"
                      style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      {actionPrompt === 'unpublish' ? 'Unpublish Issue?' : 'Save as Draft?'}
                    </Text>
                    <Text
                      className="text-center text-[15px] font-medium leading-[22px]"
                      style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      {actionPrompt === 'unpublish'
                        ? 'If you proceed, this issue will be unpublished and immediately removed from the public transparency portal.'
                        : 'If you proceed, this issue will be saved as a draft and hidden from public view until published.'}
                    </Text>
                  </View>

                  <View
                    className="flex-row border-t"
                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <TouchableOpacity
                      onPress={() => setActionPrompt('none')}
                      activeOpacity={0.7}
                      className="flex-1 items-center justify-center border-r py-5"
                      style={{
                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      }}>
                      <Text
                        className="text-[16px] font-bold"
                        style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setActionPrompt('none');
                        if (actionPrompt === 'unpublish') onUnpublish(issue.id);
                        else handleSaveDraft();
                      }}
                      activeOpacity={0.7}
                      className="flex-1 items-center justify-center py-5">
                      <Text
                        className="text-[16px] font-black"
                        style={{ color: actionPrompt === 'unpublish' ? '#EF4444' : '#3B82F6' }}>
                        {actionPrompt === 'unpublish' ? 'Unpublish' : 'Save Draft'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 32,
  },
  panelContainer: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  panelLight: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  panelDark: {
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.1)',
  },
  inputBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  textAreaBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    maxHeight: 150,
  },
  imgThumb: {
    width: 80,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  publishBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  publishBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
});
