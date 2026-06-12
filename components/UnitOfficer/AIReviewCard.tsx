import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Animated,
  Platform,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  Sparkles,
  Brain,
  Bot,
  ShieldCheck,
  TriangleAlert as AlertTriangle,
  CircleCheck as CheckCircle,
  Target,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Activity,
  Fingerprint,
  Camera,
  Copy,
  X,
} from 'lucide-react-native';
import { reviewIssueWithGemini } from 'lib/issueReview';

interface AIReviewCardProps {
  issue: any;
  unitOfficerDepartment: string;
  duplicateFlags?: any;
}

const loadingMessagesScan = [
  'Initializing cognitive scanning...',
  'Extracting semantics and metadata...',
  'Comparing against department categories...',
  'Evaluating jurisdiction boundaries...',
  'Calibrating risk parameters...',
];

const loadingMessagesSuggest = [
  'Drafting resolution strategy...',
  'Formulating action comment template...',
  'Aligning details with operational protocol...',
  'Reviewing tone and compliance parameters...',
];

const isIOS = Platform.OS === 'ios';

export default function AIReviewCard({ issue, unitOfficerDepartment, duplicateFlags }: AIReviewCardProps) {
  const isDark = useColorScheme() === 'dark';

  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'scan' | 'suggest' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<any | null>(null);
  const [suggestResult, setSuggestResult] = useState<any | null>(null);
  const [showSuggestChoice, setShowSuggestChoice] = useState(false);
  const [selectedSuggestType, setSelectedSuggestType] = useState<'verify' | 'reject' | null>(null);
  const [selectedSuggestSubType, setSelectedSuggestSubType] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const [copiedVerify, setCopiedVerify] = useState(false);
  const [copiedReject, setCopiedReject] = useState(false);

  const copyToClipboard = (text: string, type: 'verify' | 'reject') => {
    Clipboard.setString(text);
    if (type === 'verify') {
      setCopiedVerify(true);
      setTimeout(() => setCopiedVerify(false), 2000);
    } else {
      setCopiedReject(true);
      setTimeout(() => setCopiedReject(false), 2000);
    }
  };

  const handleReset = () => {
    setReview(null);
    setSuggestResult(null);
    setShowSuggestChoice(false);
    setSelectedSuggestType(null);
    setSelectedSuggestSubType(null);
    setError(null);
  };

  const activeMessages = loadingType === 'suggest' ? loadingMessagesSuggest : loadingMessagesScan;

  // Reanimated values for pulsing scanner
  const pulseScale = useSharedValue(1);

  // Animated message fade
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation when loading is active
  useEffect(() => {
    if (loading) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1.0);
    }
  }, [loading]);

  const animatedBrainStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  // Cycle loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const currentMessages = loadingType === 'suggest' ? loadingMessagesSuggest : loadingMessagesScan;
    if (loading) {
      interval = setInterval(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setLoadingMsgIndex((prev) => (prev + 1) % currentMessages.length);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
        });
      }, 1800);
    } else {
      setLoadingMsgIndex(0);
      fadeAnim.setValue(1);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, loadingType]);

  const handleScan = async () => {
    if (!issue) return;
    setLoading(true);
    setLoadingType('scan');
    setError(null);

    const subcategory =
      issue.subCategories?.[0] ||
      issue.subcategory?.[0] ||
      (Array.isArray(issue.subcategory) ? issue.subcategory[0] : issue.subcategory) ||
      '';

    const location = issue.location || issue.address || '';

    try {
      const response = await reviewIssueWithGemini({
        mode: 'scan',
        unitOfficerDepartment,
        title: issue.title || '',
        description: issue.description || '',
        category: issue.category || '',
        subcategory,
        location,
        images: issue.images || [],
        duplicateFlags,
      });

      setReview(response);
    } catch (err: any) {
      console.error('AI review scan failed:', err);
      setError('Unable to compile AI intelligence scan.');
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handleGenerateSuggestion = async (type: 'verify' | 'reject', subType: string) => {
    if (!issue) return;
    setLoading(true);
    setLoadingType('suggest');
    setError(null);
    setShowSuggestChoice(false);

    const subcategory =
      issue.subCategories?.[0] ||
      issue.subcategory?.[0] ||
      (Array.isArray(issue.subcategory) ? issue.subcategory[0] : issue.subcategory) ||
      '';

    const location = issue.location || issue.address || '';

    try {
      const response = await reviewIssueWithGemini({
        mode: 'suggest',
        suggestionType: type,
        suggestionSubType: subType,
        unitOfficerDepartment,
        title: issue.title || '',
        description: issue.description || '',
        category: issue.category || '',
        subcategory,
        location,
        images: issue.images || [],
        duplicateFlags,
      });

      if (type === 'verify') {
        setSuggestResult({
          suggestedVerificationComment: response.suggestedVerificationComment,
          suggestedRejectionComment: undefined,
          suggestedRejectionType: undefined,
        });
      } else {
        setSuggestResult({
          suggestedVerificationComment: undefined,
          suggestedRejectionComment: response.suggestedRejectionComment,
          suggestedRejectionType: response.suggestedRejectionType,
        });
      }
    } catch (err: any) {
      console.error('AI suggestion draft failed:', err);
      setError('Unable to compile AI suggestion draft.');
    } finally {
      setLoading(false);
      setLoadingType(null);
      setSelectedSuggestType(null);
      setSelectedSuggestSubType(null);
    }
  };

  const handleSelectSuggestType = (type: 'verify' | 'reject') => {
    setSelectedSuggestType(type);
    if (type === 'reject' && duplicateFlags?.hasDuplicateFlags) {
      setSelectedSuggestSubType('duplicate');
    } else if (type === 'verify') {
      setSelectedSuggestSubType('standard');
    } else {
      setSelectedSuggestSubType(null);
    }
  };

  const currentCategory = (issue?.category || '').toLowerCase().trim();
  const detectedCategory = (review?.detectedCategory || '').toLowerCase().trim();
  const categoryMismatch =
    review && (currentCategory !== detectedCategory || !review.categoryMatch);

  // Priority Styling Config
  const getPriorityConfig = (priority: string) => {
    const p = (priority || '').toLowerCase().trim();
    switch (p) {
      case 'critical':
        return {
          text: 'Critical',
          bg: 'bg-red-500/10 dark:bg-red-950/20',
          textClass: 'text-red-500 dark:text-red-400',
          border: 'border-red-500/30',
          glow: '#EF4444',
        };
      case 'high':
        return {
          text: 'High',
          bg: 'bg-orange-500/10 dark:bg-orange-950/20',
          textClass: 'text-orange-500 dark:text-orange-400',
          border: 'border-orange-500/30',
          glow: '#F97316',
        };
      case 'medium':
        return {
          text: 'Medium',
          bg: 'bg-amber-500/10 dark:bg-amber-950/20',
          textClass: 'text-amber-500 dark:text-amber-400',
          border: 'border-amber-500/30',
          glow: '#F59E0B',
        };
      case 'low':
      default:
        return {
          text: 'Low',
          bg: 'bg-blue-500/10 dark:bg-blue-950/20',
          textClass: 'text-blue-500 dark:text-blue-400',
          border: 'border-blue-500/30',
          glow: '#3B82F6',
        };
    }
  };

  // Safety Risk Styling Config
  const getSafetyRiskConfig = (risk: string) => {
    const r = (risk || '').toLowerCase().trim();
    switch (r) {
      case 'critical':
        return {
          text: 'Critical',
          bg: 'bg-red-500/10 dark:bg-red-950/20',
          textClass: 'text-red-500 dark:text-red-400',
          border: 'border-red-500/30',
          glow: '#EF4444',
        };
      case 'high':
        return {
          text: 'High',
          bg: 'bg-orange-500/10 dark:bg-orange-950/20',
          textClass: 'text-orange-500 dark:text-orange-400',
          border: 'border-orange-500/30',
          glow: '#F97316',
        };
      case 'medium':
        return {
          text: 'Medium',
          bg: 'bg-amber-500/10 dark:bg-amber-950/20',
          textClass: 'text-amber-500 dark:text-amber-400',
          border: 'border-amber-500/30',
          glow: '#F59E0B',
        };
      case 'low':
      default:
        return {
          text: 'Low',
          bg: 'bg-blue-500/10 dark:bg-blue-950/20',
          textClass: 'text-blue-500 dark:text-blue-400',
          border: 'border-blue-500/30',
          glow: '#3B82F6',
        };
    }
  };

  return (
    <View
      style={[
        s.card,
        {
          borderRadius: isIOS ? 28 : 36,
          borderColor: isDark ? '#1E293B' : '#E2E8F0',
          borderWidth: 1.5,
          backgroundColor: isDark ? '#090D1A' : '#FFFFFF',
          overflow: 'hidden',
          marginBottom: isIOS ? 20 : 32,
        },
      ]}>
      {/* ── CINEMATIC GLOW HEADER ── */}
      <LinearGradient
        colors={isDark ? ['#13182C', '#090D1A'] : ['#F0F7FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          paddingHorizontal: isIOS ? 18 : 24,
          paddingVertical: isIOS ? 14 : 20,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(30,41,59,0.7)' : '#E2E8F0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: isIOS ? 10 : 14 }}>
          {/* Futuristic icon container */}
          <View
            style={[
              s.iconWell,
              {
                width: isIOS ? 36 : 42,
                height: isIOS ? 36 : 42,
                borderRadius: isIOS ? 11 : 14,
                backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : '#E0F2FE',
                borderColor: isDark ? 'rgba(14,165,233,0.3)' : '#BAE6FD',
                borderWidth: 1.5,
              },
            ]}>
            <Sparkles
              color={isDark ? '#38BDF8' : '#0284C7'}
              size={isIOS ? 17 : 20}
              strokeWidth={2.5}
            />
          </View>
          <View>
            <View className="flex-row items-center gap-2">
              <Text
                className={`font-black tracking-tight text-slate-900 dark:text-white ${isIOS ? 'text-[14px]' : 'text-[16px]'}`}>
                CityCare Cognitive Review
              </Text>
            </View>
            <Text
              className={`mt-0.5 font-bold text-slate-400 dark:text-slate-500 ${isIOS ? 'text-[10px]' : 'text-[11px]'}`}>
              Intelligent triage & classification support
            </Text>
          </View>
        </View>

        {/* Actions header controls */}
        {(review || suggestResult) && !loading && (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {review && (
              <TouchableOpacity
                onPress={handleScan}
                activeOpacity={0.7}
                className={`items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 ${
                  isIOS ? 'h-8 w-8' : 'h-9 w-9'
                }`}>
                <RefreshCw
                  color={isDark ? '#38BDF8' : '#0284C7'}
                  size={isIOS ? 13 : 15}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleReset}
              activeOpacity={0.7}
              className={`items-center justify-center rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-950/40 dark:bg-rose-950/20 ${
                isIOS ? 'h-8 w-8' : 'h-9 w-9'
              }`}>
              <X
                color={isDark ? '#F87171' : '#EF4444'}
                size={isIOS ? 14 : 16}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* ── CARD INNER CONTENT ── */}
      <View style={{ padding: isIOS ? 18 : 24 }}>
        {/* STATE 1.1: INITIAL STATE (SLEEK HORIZONTAL BANNER WITH TWO BUTTONS) */}
        {!review && !suggestResult && !loading && !error && !showSuggestChoice && (
          <Reanimated.View
            entering={FadeIn.duration(400)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: isIOS ? 10 : 14,
              paddingVertical: isIOS ? 2 : 4,
            }}>
            {/* Left: Bot Icon Badge */}
            <View
              style={{
                width: isIOS ? 38 : 44,
                height: isIOS ? 38 : 44,
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(14,165,233,0.1)' : '#E0F2FE',
                borderColor: isDark ? 'rgba(14,165,233,0.25)' : '#BAE6FD',
                borderWidth: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
              <Bot
                color={isDark ? '#38BDF8' : '#0284C7'}
                size={isIOS ? 18 : 22}
                strokeWidth={1.5}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: '#22D3EE',
                }}
              />
            </View>

            {/* Middle: Brief Text Copy */}
            <View style={{ flex: 1, gap: 1 }}>
              <Text
                className="font-black text-slate-800 dark:text-slate-100"
                style={{ fontSize: isIOS ? 12 : 13.5, lineHeight: 16 }}>
                AI Integrity Scan
              </Text>
              <Text
                className="font-semibold text-slate-400 dark:text-slate-500"
                style={{ fontSize: isIOS ? 9.5 : 10.5, lineHeight: 14 }}>
                Verify scope desk, category mapping, and images.
              </Text>
            </View>

            {/* Right: Actions */}
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {/* Scan Button */}
              <TouchableOpacity
                onPress={handleScan}
                activeOpacity={0.85}
                style={{
                  shadowColor: '#0A5C8E',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.3 : 0.1,
                  shadowRadius: 8,
                  elevation: 2,
                }}>
                <LinearGradient
                  colors={['#0EA5E9', '#0284C7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingHorizontal: isIOS ? 10 : 12,
                    paddingVertical: isIOS ? 7 : 9,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                  <Sparkles color="#FFFFFF" size={10} strokeWidth={2.5} />
                  <Text
                    className="font-black uppercase tracking-[0.05em] text-white"
                    style={{ fontSize: isIOS ? 9 : 10 }}>
                    Scan
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Suggest Button */}
              <TouchableOpacity
                onPress={() => setShowSuggestChoice(true)}
                activeOpacity={0.85}
                style={{
                  shadowColor: '#0E7490',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.3 : 0.1,
                  shadowRadius: 8,
                  elevation: 2,
                }}>
                <LinearGradient
                  colors={['#0891B2', '#0ED4C6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingHorizontal: isIOS ? 10 : 12,
                    paddingVertical: isIOS ? 7 : 9,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                  <Brain color="#FFFFFF" size={10} strokeWidth={2.5} />
                  <Text
                    className="font-black uppercase tracking-[0.05em] text-white"
                    style={{ fontSize: isIOS ? 9 : 10 }}>
                    Suggest
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Reanimated.View>
        )}

        {/* STATE 1.2: SUGGESTION TARGET CHOICE HUD */}
        {!review && !suggestResult && !loading && !error && showSuggestChoice && (
          <Reanimated.View
            entering={FadeIn.duration(300)}
            style={{
              gap: 10,
              paddingVertical: 2,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(14,165,233,0.1)' : '#E0F2FE',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Brain color={isDark ? '#38BDF8' : '#0284C7'} size={15} />
              </View>
              <Text className="font-extrabold text-[12px] text-slate-800 dark:text-slate-100">
                Choose Suggestion Type:
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                onPress={() => handleSelectSuggestType('verify')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  backgroundColor: selectedSuggestType === 'verify' ? (isDark ? 'rgba(16,185,129,0.1)' : '#F0FDF4') : (isDark ? '#0F172A' : '#FFFFFF'),
                  borderColor: selectedSuggestType === 'verify' ? '#10B981' : (isDark ? '#334155' : '#E2E8F0'),
                  alignItems: 'center',
                }}>
                <Text className={`font-black text-[11px] ${selectedSuggestType === 'verify' ? 'text-emerald-500' : 'text-slate-500'}`}>
                  Verify (Field Notes)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectSuggestType('reject')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  backgroundColor: selectedSuggestType === 'reject' ? (isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2') : (isDark ? '#0F172A' : '#FFFFFF'),
                  borderColor: selectedSuggestType === 'reject' ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0'),
                  alignItems: 'center',
                }}>
                <Text className={`font-black text-[11px] ${selectedSuggestType === 'reject' ? 'text-rose-500' : 'text-slate-550 dark:text-slate-400'}`}>
                  Reject Issue
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sub-option Selector */}
            {selectedSuggestType && (
              <View style={{ marginTop: 4, gap: 6 }}>
                <Text className="font-extrabold text-[10px] text-slate-500 dark:text-slate-400">
                  Select Sub-Option (Draft Tone/Reason):
                </Text>

                {selectedSuggestType === 'verify' ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { value: 'standard', label: 'Standard Notes' },
                      { value: 'detailed', label: 'Detailed / Technical' },
                      { value: 'quick', label: 'Quick / Brief' },
                    ].map((opt) => {
                      const active = selectedSuggestSubType === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setSelectedSuggestSubType(opt.value)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            borderWidth: 1.2,
                            backgroundColor: active ? (isDark ? 'rgba(14,165,233,0.1)' : '#F0F9FF') : (isDark ? '#0F172A' : '#F1F5F9'),
                            borderColor: active ? '#0EA5E9' : (isDark ? '#334155' : '#E2E8F0'),
                          }}>
                          <Text className={`text-[10px] font-black ${active ? 'text-cyan-500' : 'text-slate-500'}`}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ gap: 6 }}>
                    {selectedSuggestType === 'reject' && duplicateFlags?.hasDuplicateFlags && (
                      <View
                        style={{
                          backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : '#FFFBEB',
                          borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#FDE68A',
                          borderWidth: 1,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                        <AlertTriangle color="#F59E0B" size={11} strokeWidth={2.5} />
                        <Text className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400">
                          Recommended: Reject as Duplicate
                        </Text>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        { value: 'duplicate', label: 'Duplicate' },
                        { value: 'spam', label: 'Spam / Fake' },
                        { value: 'outside_jurisdiction', label: 'Outside Area' },
                        { value: 'insufficient_evidence', label: 'Insufficient Evidence' },
                        { value: 'invalid_location', label: 'Invalid Location' },
                        { value: 'other', label: 'Other Reason' },
                      ].map((opt) => {
                        const active = selectedSuggestSubType === opt.value;
                        const isRecommended = opt.value === 'duplicate' && duplicateFlags?.hasDuplicateFlags;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            onPress={() => setSelectedSuggestSubType(opt.value)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              borderWidth: 1.2,
                              backgroundColor: active
                                ? (isRecommended ? (isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB') : (isDark ? 'rgba(14,165,233,0.1)' : '#F0F9FF'))
                                : (isDark ? '#0F172A' : '#F1F5F9'),
                              borderColor: active
                                ? (isRecommended ? '#F59E0B' : '#0EA5E9')
                                : (isRecommended ? 'rgba(245,158,11,0.3)' : (isDark ? '#334155' : '#E2E8F0')),
                            }}>
                            <Text className={`text-[10px] font-black ${active ? (isRecommended ? 'text-amber-500' : 'text-cyan-500') : 'text-slate-500'}`}>
                              {opt.label} {isRecommended ? '⭐' : ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowSuggestChoice(false);
                  setSelectedSuggestType(null);
                  setSelectedSuggestSubType(null);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                }}>
                <Text className="text-[10px] font-bold text-slate-500">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!selectedSuggestType || !selectedSuggestSubType}
                onPress={() => handleGenerateSuggestion(selectedSuggestType!, selectedSuggestSubType!)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: (selectedSuggestType && selectedSuggestSubType) ? '#0891B2' : (isDark ? '#1E293B' : '#E2E8F0'),
                }}>
                <Text className={`text-[10px] font-black ${(selectedSuggestType && selectedSuggestSubType) ? 'text-white' : 'text-slate-400'}`}>
                  Generate
                </Text>
              </TouchableOpacity>
            </View>
          </Reanimated.View>
        )}

        {/* STATE 2: LOADING PROGRESS BAR HUD */}
        {loading && (
          <View className="items-center py-6">
            {/* Pulsing Scanner Ring */}
            <Reanimated.View
              className="mb-6 items-center justify-center rounded-[24px] border"
              style={[
                animatedBrainStyle,
                {
                  width: isIOS ? 64 : 80,
                  height: isIOS ? 64 : 80,
                  backgroundColor: isDark ? 'rgba(14,165,233,0.1)' : '#F0F9FF',
                  borderColor: isDark ? 'rgba(14,165,233,0.3)' : '#BAE6FD',
                },
              ]}>
              <Activity
                color={isDark ? '#38BDF8' : '#0284C7'}
                size={isIOS ? 24 : 32}
                strokeWidth={2}
              />
            </Reanimated.View>

            {/* Sequential Message Fader */}
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', height: 38 }}>
              <Text
                className={`text-center font-black text-cyan-600 dark:text-cyan-400 ${isIOS ? 'text-[13.5px]' : 'text-[15px]'}`}>
                {activeMessages[loadingMsgIndex]}
              </Text>
            </Animated.View>

            {/* Interactive Progress Indicators */}
            <View className="w-full gap-2.5 px-3">
              {/* Micro bar segments */}
              <View className="h-1 flex-row gap-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                {activeMessages.map((_, index) => {
                  const isActive = index <= loadingMsgIndex;
                  return (
                    <View
                      key={index}
                      className={`h-full flex-1 rounded-full ${
                        isActive ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  );
                })}
              </View>

              <View className="flex-row items-center justify-between px-0.5">
                <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Audit Progress
                </Text>
                <Text className="text-[9px] font-black text-cyan-600 dark:text-cyan-400">
                  {Math.round(((loadingMsgIndex + 1) / activeMessages.length) * 100)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* STATE 3: ERROR STATE */}
        {error && !loading && (
          <Reanimated.View entering={ZoomIn.duration(300)} className="items-center py-6">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
              <AlertCircle color="#EF4444" size={24} strokeWidth={2} />
            </View>

            <Text className="mb-2 text-center text-[14px] font-black text-rose-600 dark:text-rose-400">
              Review Pipeline Interrupted
            </Text>
            <Text className="mb-6 px-6 text-center text-[11px] font-semibold leading-[16px] text-slate-400 dark:text-slate-500">
              {error} Please check your connection and configuration keys.
            </Text>

            <TouchableOpacity
              onPress={handleScan}
              activeOpacity={0.8}
              className="w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-3.5 dark:border-slate-800 dark:bg-slate-900/60">
              <Text className="text-[12px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Re-initialize Pipeline
              </Text>
            </TouchableOpacity>
          </Reanimated.View>
        )}

        {/* STATE 4: DATA RESOLVED (Futuristic UI Compilations) */}
        {(review || suggestResult) && !loading && !error && (
          <View style={{ gap: isIOS ? 14 : 24 }}>
            {/* Duplicate Flag Banner inside Scan results */}
            {review && duplicateFlags?.hasDuplicateFlags && (
              <Reanimated.View
                entering={FadeInDown.delay(50).duration(400)}
                style={{
                  backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : '#FFFBEB',
                  borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A',
                  borderRadius: 20,
                  borderWidth: 1.5,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}>
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7',
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Copy color={isDark ? '#F59E0B' : '#D97706'} size={16} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Potential Duplicate Detected
                  </Text>
                  <Text
                    className="font-bold text-slate-700 dark:text-slate-350 leading-5"
                    style={{ fontSize: isIOS ? 11.5 : 12.5 }}>
                    This citizen has reported {duplicateFlags.duplicateIssueCount} similar {duplicateFlags.duplicateIssueCount === 1 ? 'issue' : 'issues'}. Similarity index is high. Recommending a merge review.
                  </Text>
                </View>
              </Reanimated.View>
            )}

            {/* Cascading animations one by one */}
            {/* Row 1: Scope Verdict & Confidence Score */}
            {review && (
              <Reanimated.View
                entering={FadeInDown.delay(100).duration(400)}
                style={{ gap: isIOS ? 10 : 16 }}
                className="flex-row">
              {/* Verdict Card */}
              <View
                className="relative flex-[1.3] overflow-hidden rounded-3xl border p-4"
                style={{
                  backgroundColor: isDark ? '#0C1122' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(30,41,59,0.8)' : '#E2E8F0',
                }}>
                <Text className="mb-2.5 text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Scope Assessment
                </Text>

                {review.withinOfficerScope || review.departmentMatch ? (
                  <View style={{ gap: isIOS ? 8 : 12 }}>
                    <View className="h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                      <ShieldCheck color="#10B981" size={isIOS ? 18 : 22} strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text
                        className={`font-black tracking-tight text-emerald-600 dark:text-emerald-400 ${isIOS ? 'text-[13px]' : 'text-[15px]'}`}>
                        In Department Scope
                      </Text>
                      <Text
                        className={`mt-0.5 font-bold text-slate-400 dark:text-slate-500 ${isIOS ? 'text-[9px]' : 'text-[10px]'}`}>
                        Matches your assignable tags
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: isIOS ? 8 : 12 }}>
                    <View className="h-9 w-9 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
                      <ShieldAlert color="#EF4444" size={isIOS ? 18 : 22} strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text
                        className={`font-black tracking-tight text-rose-500 dark:text-rose-400 ${isIOS ? 'text-[13px]' : 'text-[15px]'}`}>
                        Scope Mismatch
                      </Text>
                      <Text
                        className={`mt-0.5 font-bold text-slate-400 dark:text-slate-500 ${isIOS ? 'text-[9px]' : 'text-[10px]'}`}>
                        Belongs to different desk
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Confidence Circle Card */}
              <View
                className="flex-1 items-center justify-center rounded-3xl border p-4"
                style={{
                  backgroundColor: isDark ? '#0C1122' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(30,41,59,0.8)' : '#E2E8F0',
                }}>
                <Text className="mb-2 text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Scan Index
                </Text>
                <View
                  style={{
                    width: isIOS ? 60 : 72,
                    height: isIOS ? 60 : 72,
                    borderRadius: isIOS ? 30 : 36,
                    borderWidth: 3,
                    borderColor: isDark ? 'rgba(6,182,212,0.15)' : '#ECFEFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                  <LinearGradient
                    colors={
                      isDark
                        ? ['rgba(6,182,212,0.1)', 'transparent']
                        : ['rgba(6,182,212,0.03)', 'transparent']
                    }
                    style={StyleSheet.absoluteFillObject}
                    className="rounded-full"
                  />
                  <View className="flex-row items-baseline">
                    <Text
                      className={`font-black text-cyan-600 dark:text-cyan-400 ${isIOS ? 'text-[17px]' : 'text-[20px]'}`}>
                      {review.confidenceScore ?? 92}
                    </Text>
                    <Text
                      className={`font-black text-cyan-600 dark:text-cyan-400 ${isIOS ? 'text-[8.5px]' : 'text-[10px]'}`}>
                      %
                    </Text>
                  </View>
                  <Text
                    className={`absolute text-[7px] font-black text-slate-400 ${isIOS ? 'bottom-0.5' : 'bottom-1'}`}>
                    CONFIDENCE
                  </Text>
                </View>
              </View>
            </Reanimated.View>
            )}

            {/* Row 2: Category Comparison HUD */}
            {categoryMismatch && (
              <Reanimated.View entering={FadeInDown.delay(200).duration(400)}>
                <View
                  className="rounded-3xl border p-4"
                  style={{
                    backgroundColor: isDark ? '#0C1122' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(30,41,59,0.8)' : '#E2E8F0',
                  }}>
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Category Mapping Matrix
                    </Text>

                    <View className="flex-row items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5">
                      <AlertTriangle color="#F59E0B" size={9} strokeWidth={2.5} />
                      <Text className="text-[7.5px] font-black tracking-wide text-amber-600 dark:text-amber-400">
                        CORRECTION RECOMMENDED
                      </Text>
                    </View>
                  </View>

                  {/* Classification Flow */}
                  <View className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-slate-200/40 bg-slate-100 p-3.5 dark:border-slate-800/40 dark:bg-slate-900/60">
                    <View className="flex-1">
                      <Text className="mb-0.5 text-[8.5px] font-black uppercase tracking-widest text-slate-400">
                        Current
                      </Text>
                      <Text
                        className={`font-extrabold capitalize text-slate-800 dark:text-slate-200 ${isIOS ? 'text-[12px]' : 'text-[13px]'}`}>
                        {currentCategory}
                      </Text>
                    </View>

                    <View className="mx-3 h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
                      <ArrowRight
                        color="#F59E0B"
                        size={12}
                        strokeWidth={3}
                      />
                    </View>

                    <View className="flex-1 items-end">
                      <Text className="mb-0.5 text-[8.5px] font-black uppercase tracking-widest text-slate-400">
                        Detected
                      </Text>
                      <Text
                        className={`font-extrabold capitalize text-amber-500 dark:text-amber-400 ${isIOS ? 'text-[12px]' : 'text-[13px]'}`}>
                        {review.detectedCategory ?? review.suggestedCategory ?? currentCategory}
                      </Text>
                    </View>
                  </View>

                  {review.suggestedSubcategory && (
                    <View className="flex-row items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/60">
                      <Text
                        className={`font-bold text-slate-500 dark:text-slate-400 ${isIOS ? 'text-[11.5px]' : 'text-[12px]'}`}>
                        Suggested Subcategory
                      </Text>
                      <View className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1">
                        <Text className="text-[10px] font-black text-cyan-600 dark:text-cyan-400">
                          {review.suggestedSubcategory}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </Reanimated.View>
            )}

            {/* Row 3: Priority & Safety Threat Levels */}
            {review && (
              <Reanimated.View
                entering={FadeInDown.delay(300).duration(400)}
                className="flex-row gap-4">
              {/* Priority Display */}
              {(() => {
                const config = getPriorityConfig(review.priority);
                return (
                  <View
                    style={{
                      shadowColor: config.glow,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.2 : 0.05,
                      shadowRadius: 12,
                      elevation: 2,
                    }}
                    className={`flex-1 rounded-3xl border p-4 ${config.bg} ${config.border}`}>
                    <Text className="mb-2.5 text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Priority Suggestion
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-white/40 dark:bg-black/20">
                        <Target color={config.glow} size={14} strokeWidth={2.5} />
                      </View>
                      <Text
                        className={`font-black uppercase tracking-wide ${config.textClass} ${isIOS ? 'text-[12px]' : 'text-[14px]'}`}>
                        {config.text}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Safety Warning */}
              {(() => {
                const config = getSafetyRiskConfig(review.safetyRisk);
                return (
                  <View
                    style={{
                      shadowColor: config.glow,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.2 : 0.05,
                      shadowRadius: 12,
                      elevation: 2,
                    }}
                    className={`flex-1 rounded-3xl border p-4 ${config.bg} ${config.border}`}>
                    <Text className="mb-2.5 text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Safety Risk Warning
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-white/40 dark:bg-black/20">
                        <AlertTriangle color={config.glow} size={14} strokeWidth={2.5} />
                      </View>
                      <Text
                        className={`font-black uppercase tracking-wide ${config.textClass} ${isIOS ? 'text-[12px]' : 'text-[14px]'}`}>
                        {config.text}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </Reanimated.View>
            )}

            {/* Row 3.5: Image Authenticity Assessment */}
            {review && (
              <Reanimated.View entering={FadeInDown.delay(350).duration(400)} className="gap-2">
              <Text className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Image Integrity Scan
              </Text>

              {issue.images && issue.images.length > 0 ? (
                review.imageAuthentic ? (
                  <View
                    style={{
                      backgroundColor: isDark ? 'rgba(16,185,129,0.05)' : '#F0FDF4',
                      borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#DCFCE7',
                      borderRadius: 20,
                      borderWidth: 1.5,
                      padding: 14,
                    }}
                    className="flex-row items-start gap-3">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                      <ShieldCheck
                        color={isDark ? '#34D399' : '#059669'}
                        size={18}
                        strokeWidth={2.5}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-0.5 text-[8.5px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Images Verified Authentic
                      </Text>
                      <Text
                        className={`font-semibold text-slate-600 dark:text-slate-350 leading-5 ${isIOS ? 'text-[12px]' : 'text-[12.5px]'}`}>
                        {review.imageAuthenticityReason || 'The photos match the description and appear authentic.'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: isDark ? 'rgba(239,68,68,0.05)' : '#FEF2F2',
                      borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2',
                      borderRadius: 20,
                      borderWidth: 1.5,
                      padding: 14,
                    }}
                    className="flex-row items-start gap-3">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10">
                      <ShieldAlert
                        color={isDark ? '#F87171' : '#E11D48'}
                        size={18}
                        strokeWidth={2.5}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-0.5 text-[8.5px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Image Integrity Warning
                      </Text>
                      <Text
                        className={`font-semibold text-slate-600 dark:text-slate-350 leading-5 ${isIOS ? 'text-[12px]' : 'text-[12.5px]'}`}>
                        {review.imageAuthenticityReason || 'The photos do not match the description or appear inauthentic.'}
                      </Text>
                    </View>
                  </View>
                )
              ) : (
                <View
                  style={{
                    backgroundColor: isDark ? '#0C1122' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(30,41,59,0.8)' : '#E2E8F0',
                    borderRadius: 20,
                    borderWidth: 1.5,
                    padding: 14,
                  }}
                  className="flex-row items-start gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-slate-500/10">
                    <Camera
                      color={isDark ? '#94A3B8' : '#64748B'}
                      size={18}
                      strokeWidth={2.5}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-0.5 text-[8.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      No Media Uploaded
                    </Text>
                    <Text
                      className={`font-semibold text-slate-600 dark:text-slate-350 leading-5 ${isIOS ? 'text-[12px]' : 'text-[12.5px]'}`}>
                      No images were provided for visual authenticity review.
                    </Text>
                  </View>
                </View>
              )}
            </Reanimated.View>
            )}

            {/* Row 4: AI Reasoning Dialog Bubble */}
            {review && review.reason && (
              <Reanimated.View entering={FadeInDown.delay(400).duration(400)} className="gap-2">
                <Text className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Semantic Logic & Reasoning
                </Text>

                <View
                  style={{
                    backgroundColor: isDark ? '#0C1122' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(30,41,59,0.8)' : '#E2E8F0',
                    borderRadius: 20,
                    overflow: 'hidden',
                  }}
                  className="border">
                  <View style={{ flexDirection: 'row' }}>
                    <LinearGradient
                      colors={isDark ? ['#38BDF8', '#0D9488'] : ['#0891B2', '#0ED4C6']}
                      style={{ width: 4 }}
                    />
                    <View className="flex-1 flex-row gap-3 p-3.5">
                      <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                        <Fingerprint color={isDark ? '#38BDF8' : '#0891B2'} size={13} />
                      </View>
                      <Text
                        className={`flex-1 font-semibold italic leading-5 text-slate-600 dark:text-slate-300 ${isIOS ? 'text-[12px]' : 'text-[13px]'}`}>
                        "{review.reason}"
                      </Text>
                    </View>
                  </View>
                </View>
              </Reanimated.View>
            )}

            {/* Row 5: Action Recommendation protocol */}
            {review && review.actionRecommendation && (
              <Reanimated.View entering={FadeInDown.delay(500).duration(400)} className="gap-2.5">
                <Text className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Operational Guidelines
                </Text>

                <View
                  style={{
                    shadowColor: '#06B6D4',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.25 : 0.05,
                    shadowRadius: 10,
                    elevation: 2,
                  }}>
                  <LinearGradient
                    colors={isDark ? ['rgba(6,182,212,0.06)', 'rgba(6,182,212,0.01)'] : ['#F0FDFD', '#F6FDFD']}
                    style={{
                      borderColor: isDark ? 'rgba(6,182,212,0.2)' : '#CFFAFE',
                      borderRadius: 20,
                      borderWidth: 1.5,
                      padding: 16,
                      overflow: 'hidden',
                      flexDirection: 'row',
                    }}>
                    {/* Left bar accent line */}
                    <View style={{ width: 4, backgroundColor: '#06B6D4', borderRadius: 2, marginRight: 14 }} />

                    <View style={{ flex: 1 }}>
                      <View className="mb-2.5 flex-row items-center gap-2">
                        <View
                          style={{
                            backgroundColor: isDark ? 'rgba(6,182,212,0.1)' : '#CFFAFE',
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Activity color="#06B6D4" size={13} strokeWidth={3} />
                        </View>
                        <Text className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                          Recommended Protocol
                        </Text>
                      </View>

                      <Text
                        className="font-semibold leading-relaxed text-slate-700 dark:text-slate-300"
                        style={{ fontSize: isIOS ? 12.5 : 13 }}>
                        {review.actionRecommendation}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              </Reanimated.View>
            )}

            {/* Row 5.5: Inline Suggestion Triggers inside results view */}
            {review && !suggestResult && !showSuggestChoice && (
              <Reanimated.View entering={FadeInDown.delay(520).duration(400)}>
                <TouchableOpacity
                  onPress={() => setShowSuggestChoice(true)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: isDark ? 'rgba(8,145,178,0.1)' : '#ECFEFF',
                    borderColor: isDark ? 'rgba(8,145,178,0.3)' : '#CFFAFE',
                    borderRadius: 16,
                    borderWidth: 1.2,
                    padding: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    marginTop: 4,
                  }}>
                  <Brain color={isDark ? '#22D3EE' : '#0891B2'} size={14} strokeWidth={2.5} />
                  <Text className="text-[11px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Draft Action Comments (Verify / Reject)
                  </Text>
                </TouchableOpacity>
              </Reanimated.View>
            )}

            {showSuggestChoice && (
              <Reanimated.View
                entering={FadeInDown.delay(520).duration(400)}
                style={{
                  gap: 10,
                  backgroundColor: isDark ? '#0C1122' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(30,41,59,0.8)' : '#E2E8F0',
                  borderRadius: 20,
                  borderWidth: 1.5,
                  padding: 12,
                  marginTop: 4,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      backgroundColor: isDark ? 'rgba(14,165,233,0.1)' : '#E0F2FE',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Brain color={isDark ? '#38BDF8' : '#0284C7'} size={14} />
                  </View>
                  <Text className="font-extrabold text-[11.5px] text-slate-800 dark:text-slate-100">
                    Select Suggestion Type:
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => handleSelectSuggestType('verify')}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      backgroundColor: selectedSuggestType === 'verify' ? (isDark ? 'rgba(16,185,129,0.1)' : '#F0FDF4') : (isDark ? '#0F172A' : '#FFFFFF'),
                      borderColor: selectedSuggestType === 'verify' ? '#10B981' : (isDark ? '#334155' : '#E2E8F0'),
                      alignItems: 'center',
                    }}>
                    <Text className={`font-black text-[10.5px] ${selectedSuggestType === 'verify' ? 'text-emerald-500' : 'text-slate-500'}`}>
                      Verify (Field Notes)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSelectSuggestType('reject')}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      backgroundColor: selectedSuggestType === 'reject' ? (isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2') : (isDark ? '#0F172A' : '#FFFFFF'),
                      borderColor: selectedSuggestType === 'reject' ? '#EF4444' : (isDark ? '#334155' : '#E2E8F0'),
                      alignItems: 'center',
                    }}>
                    <Text className={`font-black text-[10.5px] ${selectedSuggestType === 'reject' ? 'text-rose-500' : 'text-slate-550 dark:text-slate-400'}`}>
                      Reject Issue
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Sub-option Selector */}
                {selectedSuggestType && (
                  <View style={{ marginTop: 2, gap: 6 }}>
                    <Text className="font-extrabold text-[10px] text-slate-500 dark:text-slate-400">
                      Select Sub-Option (Draft Tone/Reason):
                    </Text>

                    {selectedSuggestType === 'verify' ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {[
                          { value: 'standard', label: 'Standard Notes' },
                          { value: 'detailed', label: 'Detailed / Technical' },
                          { value: 'quick', label: 'Quick / Brief' },
                        ].map((opt) => {
                          const active = selectedSuggestSubType === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              onPress={() => setSelectedSuggestSubType(opt.value)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 8,
                                borderWidth: 1.2,
                                backgroundColor: active ? (isDark ? 'rgba(14,165,233,0.1)' : '#F0F9FF') : (isDark ? '#0F172A' : '#F1F5F9'),
                                borderColor: active ? '#0EA5E9' : (isDark ? '#334155' : '#E2E8F0'),
                              }}>
                              <Text className={`text-[9.5px] font-black ${active ? 'text-cyan-500' : 'text-slate-500'}`}>
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={{ gap: 6 }}>
                        {selectedSuggestType === 'reject' && duplicateFlags?.hasDuplicateFlags && (
                          <View
                            style={{
                              backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : '#FFFBEB',
                              borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#FDE68A',
                              borderWidth: 1,
                              borderRadius: 8,
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                            }}>
                            <AlertTriangle color="#F59E0B" size={10} strokeWidth={2.5} />
                            <Text className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                              Recommended: Reject as Duplicate
                            </Text>
                          </View>
                        )}

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                          {[
                            { value: 'duplicate', label: 'Duplicate' },
                            { value: 'spam', label: 'Spam / Fake' },
                            { value: 'outside_jurisdiction', label: 'Outside Area' },
                            { value: 'insufficient_evidence', label: 'Insufficient Evidence' },
                            { value: 'invalid_location', label: 'Invalid Location' },
                            { value: 'other', label: 'Other Reason' },
                          ].map((opt) => {
                            const active = selectedSuggestSubType === opt.value;
                            const isRecommended = opt.value === 'duplicate' && duplicateFlags?.hasDuplicateFlags;
                            return (
                              <TouchableOpacity
                                key={opt.value}
                                onPress={() => setSelectedSuggestSubType(opt.value)}
                                style={{
                                  paddingHorizontal: 8,
                                  paddingVertical: 5,
                                  borderRadius: 8,
                                  borderWidth: 1.2,
                                  backgroundColor: active
                                    ? (isRecommended ? (isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB') : (isDark ? 'rgba(14,165,233,0.1)' : '#F0F9FF'))
                                    : (isDark ? '#0F172A' : '#F1F5F9'),
                                  borderColor: active
                                    ? (isRecommended ? '#F59E0B' : '#0EA5E9')
                                    : (isRecommended ? 'rgba(245,158,11,0.3)' : (isDark ? '#334155' : '#E2E8F0')),
                                }}>
                                <Text className={`text-[9.5px] font-black ${active ? (isRecommended ? 'text-amber-500' : 'text-cyan-500') : 'text-slate-500'}`}>
                                  {opt.label} {isRecommended ? '⭐' : ''}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowSuggestChoice(false);
                      setSelectedSuggestType(null);
                      setSelectedSuggestSubType(null);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    }}>
                    <Text className="text-[10px] font-bold text-slate-500">Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={!selectedSuggestType || !selectedSuggestSubType}
                    onPress={() => handleGenerateSuggestion(selectedSuggestType!, selectedSuggestSubType!)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 6,
                      backgroundColor: (selectedSuggestType && selectedSuggestSubType) ? '#0891B2' : (isDark ? '#1E293B' : '#E2E8F0'),
                    }}>
                    <Text className={`text-[10px] font-black ${(selectedSuggestType && selectedSuggestSubType) ? 'text-white' : 'text-slate-400'}`}>
                      Generate
                    </Text>
                  </TouchableOpacity>
                </View>
              </Reanimated.View>
            )}

            {/* Row 6: Suggested Action Drafts */}
            {/* Row 6: Suggested Action Drafts */}
            {(suggestResult?.suggestedVerificationComment || suggestResult?.suggestedRejectionComment) && !showSuggestChoice && (
              <Reanimated.View entering={FadeInDown.delay(550).duration(400)} className="gap-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    AI Decision Assistant Drafts
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowSuggestChoice(true)}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 px-3 py-1 border border-slate-200 dark:border-slate-800/80">
                    <Brain color={isDark ? '#38BDF8' : '#0284C7'} size={11} strokeWidth={2.5} />
                    <Text className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">CHANGE TYPE</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 12 }}>
                  {/* Option 1: Verification / Field Notes Draft */}
                  {suggestResult.suggestedVerificationComment && (
                    <LinearGradient
                      colors={isDark ? ['rgba(16,185,129,0.06)', 'rgba(16,185,129,0.01)'] : ['#F0FDF4', '#F6FDF9']}
                      style={{
                        borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#DCFCE7',
                        borderRadius: 20,
                        borderWidth: 1.5,
                        padding: 16,
                        overflow: 'hidden',
                        flexDirection: 'row',
                      }}>
                      {/* Left bar accent line */}
                      <View style={{ width: 4, backgroundColor: '#10B981', borderRadius: 2, marginRight: 14 }} />
                      
                      <View style={{ flex: 1 }}>
                        <View className="mb-2.5 flex-row items-center gap-2">
                          <View
                            style={{
                              backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#DCFCE7',
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                            <CheckCircle color="#10B981" size={13} strokeWidth={3} />
                          </View>
                          <Text className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Verification Draft (Field Notes)
                          </Text>
                        </View>
                        
                        <Text
                          className="font-medium italic leading-relaxed text-slate-655 text-slate-600 dark:text-slate-300"
                          style={{ fontSize: isIOS ? 12.5 : 13 }}>
                          "{suggestResult.suggestedVerificationComment}"
                        </Text>

                        <TouchableOpacity
                          onPress={() => copyToClipboard(suggestResult.suggestedVerificationComment, 'verify')}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            borderRadius: 12,
                            marginTop: 14,
                            backgroundColor: copiedVerify ? '#10B981' : (isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'),
                            borderColor: copiedVerify ? 'transparent' : (isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1'),
                            borderWidth: 1,
                          }}>
                          {copiedVerify ? (
                            <>
                              <CheckCircle color="#FFFFFF" size={14} strokeWidth={3} />
                              <Text className="text-[10.5px] font-black tracking-wider text-white">
                                COPIED TO CLIPBOARD
                              </Text>
                            </>
                          ) : (
                            <>
                              <Copy color={isDark ? '#34D399' : '#059669'} size={13} strokeWidth={2.5} />
                              <Text className="text-[10.5px] font-black tracking-wider text-slate-700 dark:text-slate-350">
                                COPY DRAFT COMMENT
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  )}

                  {/* Option 2: Rejection / Reason Draft */}
                  {suggestResult.suggestedRejectionComment && (
                    <LinearGradient
                      colors={isDark ? ['rgba(239,68,68,0.06)', 'rgba(239,68,68,0.01)'] : ['#FEF2F2', '#FFF8F8']}
                      style={{
                        borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2',
                        borderRadius: 20,
                        borderWidth: 1.5,
                        padding: 16,
                        overflow: 'hidden',
                        flexDirection: 'row',
                      }}>
                      {/* Left bar accent line */}
                      <View style={{ width: 4, backgroundColor: '#EF4444', borderRadius: 2, marginRight: 14 }} />

                      <View style={{ flex: 1 }}>
                        <View className="mb-2.5 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <View
                              style={{
                                backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2',
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                              <ShieldAlert color="#EF4444" size={13} strokeWidth={3} />
                            </View>
                            <Text className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                              Rejection Draft
                            </Text>
                          </View>

                          {suggestResult.suggestedRejectionType && (
                            <View className="rounded-full bg-rose-500/10 px-3 py-1 border border-rose-500/20">
                              <Text className="text-[8.5px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                {suggestResult.suggestedRejectionType}
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text
                          className="font-medium italic leading-relaxed text-slate-600 dark:text-slate-350"
                          style={{ fontSize: isIOS ? 12.5 : 13 }}>
                          "{suggestResult.suggestedRejectionComment}"
                        </Text>

                        <TouchableOpacity
                          onPress={() => copyToClipboard(suggestResult.suggestedRejectionComment, 'reject')}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            borderRadius: 12,
                            marginTop: 14,
                            backgroundColor: copiedReject ? '#EF4444' : (isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'),
                            borderColor: copiedReject ? 'transparent' : (isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1'),
                            borderWidth: 1,
                          }}>
                          {copiedReject ? (
                            <>
                              <CheckCircle color="#FFFFFF" size={14} strokeWidth={3} />
                              <Text className="text-[10.5px] font-black tracking-wider text-white">
                                COPIED TO CLIPBOARD
                              </Text>
                            </>
                          ) : (
                            <>
                              <Copy color={isDark ? '#F87171' : '#EF4444'} size={13} strokeWidth={2.5} />
                              <Text className="text-[10.5px] font-black tracking-wider text-slate-700 dark:text-slate-350">
                                COPY DRAFT COMMENT
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  )}
                </View>
              </Reanimated.View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },
  iconWell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
