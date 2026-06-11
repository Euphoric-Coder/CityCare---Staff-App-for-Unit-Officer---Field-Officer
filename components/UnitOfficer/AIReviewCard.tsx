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
} from 'lucide-react-native';
import { reviewIssueWithGemini } from 'lib/issueReview';

interface AIReviewCardProps {
  issue: any;
  unitOfficerDepartment: string;
}

const loadingMessages = [
  'Initializing cognitive scanning...',
  'Extracting semantics and metadata...',
  'Comparing against department categories...',
  'Evaluating jurisdiction boundaries...',
  'Calibrating risk parameters...',
];

const isIOS = Platform.OS === 'ios';

export default function AIReviewCard({ issue, unitOfficerDepartment }: AIReviewCardProps) {
  const isDark = useColorScheme() === 'dark';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<any | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

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
    if (loading) {
      interval = setInterval(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
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
  }, [loading]);

  const handleGenerateReview = async () => {
    if (!issue) return;
    setLoading(true);
    setError(null);

    const subcategory =
      issue.subCategories?.[0] ||
      issue.subcategory?.[0] ||
      (Array.isArray(issue.subcategory) ? issue.subcategory[0] : issue.subcategory) ||
      '';

    const location = issue.location || issue.address || '';

    try {
      const response = await reviewIssueWithGemini({
        unitOfficerDepartment,
        title: issue.title || '',
        description: issue.description || '',
        category: issue.category || '',
        subcategory,
        location,
        images: issue.images || [],
      });

      setReview(response);
    } catch (err: any) {
      console.error('AI review generation failed:', err);
      setError('Unable to compile AI intelligence report.');
    } finally {
      setLoading(false);
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

        {/* Refreshes review */}
        {review && !loading && (
          <TouchableOpacity
            onPress={handleGenerateReview}
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
      </LinearGradient>

      {/* ── CARD INNER CONTENT ── */}
      <View style={{ padding: isIOS ? 18 : 24 }}>
        {/* STATE 1: INITIAL STATE (ADVANCED RADAR SCANNER LOOK) */}
        {!review && !loading && !error && (
          <Reanimated.View entering={FadeIn.duration(400)} className="items-center py-4">
            {/* Breathtaking Symmetrical Concentric Radar HUD */}
            <View
              style={{
                width: isIOS ? 92 : 110,
                height: isIOS ? 92 : 110,
                borderRadius: isIOS ? 46 : 55,
                borderWidth: 1.5,
                borderColor: isDark ? 'rgba(56,189,248,0.2)' : 'rgba(2,132,199,0.1)',
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
              className="mb-5">
              {/* Glowing Inner Core Ring */}
              <View
                style={{
                  width: isIOS ? 68 : 82,
                  height: isIOS ? 68 : 82,
                  borderRadius: isIOS ? 34 : 41,
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(56,189,248,0.4)' : 'rgba(2,132,199,0.25)',
                  borderWidth: 1.5,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#38BDF8',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: isDark ? 0.35 : 0.08,
                  shadowRadius: 16,
                  elevation: 4,
                  position: 'relative',
                }}>
                {/* Micro Ambient Tint */}
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(6,182,212,0.1)', 'transparent']
                      : ['rgba(2,132,199,0.03)', 'transparent']
                  }
                  style={[StyleSheet.absoluteFillObject, { borderRadius: isIOS ? 33 : 40 }]}
                />

                {/* Bot Icon */}
                <Bot
                  color={isDark ? '#38BDF8' : '#0284C7'}
                  size={isIOS ? 30 : 38}
                  strokeWidth={1.5}
                />
              </View>

              {/* Glowing Radar Sweep Pings */}
              <View
                style={{
                  position: 'absolute',
                  top: isIOS ? 10 : 12,
                  right: isIOS ? 10 : 12,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#22D3EE',
                  shadowColor: '#22D3EE',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                }}
              />
            </View>

            <Text
              className={`px-2 text-center font-extrabold leading-6 text-slate-800 dark:text-slate-100 ${isIOS ? 'mb-1 text-[14px]' : 'mb-2 text-[15px]'}`}>
              AI Issue Classification & Integrity Scan
            </Text>
            <Text
              className={`px-6 text-center font-semibold leading-[18px] text-slate-400 dark:text-slate-500 ${isIOS ? 'mb-6 text-[11px]' : 'mb-8 text-[12px]'}`}>
              Execute a dynamic cognitive audit to verify department scope, category mapping
              accuracy, and public safety threat levels.
            </Text>

            {/* SCANNING POINTS MICRO-CHIPS */}
            <View className={`flex-row flex-wrap justify-center gap-2 ${isIOS ? 'mb-6' : 'mb-8'}`}>
              <View className="flex-row items-center gap-1.5 rounded-xl border border-slate-200/50 bg-slate-50 px-2.5 py-1 dark:border-slate-800/80 dark:bg-slate-900">
                <ShieldCheck color={isDark ? '#38BDF8' : '#0284C7'} size={11} strokeWidth={2.5} />
                <Text className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Scope Match
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 rounded-xl border border-slate-200/50 bg-slate-50 px-2.5 py-1 dark:border-slate-800/80 dark:bg-slate-900">
                <Target color={isDark ? '#38BDF8' : '#0284C7'} size={11} strokeWidth={2.5} />
                <Text className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Category Match
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 rounded-xl border border-slate-200/50 bg-slate-50 px-2.5 py-1 dark:border-slate-800/80 dark:bg-slate-900">
                <AlertCircle color={isDark ? '#38BDF8' : '#0284C7'} size={11} strokeWidth={2.5} />
                <Text className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Risk Assessment
                </Text>
              </View>
            </View>

            {/* Glowing Action Button */}
            <View
              style={{
                width: '100%',
                shadowColor: '#0E7490',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.4 : 0.15,
                shadowRadius: 16,
                elevation: 4,
              }}>
              <TouchableOpacity
                onPress={handleGenerateReview}
                activeOpacity={0.85}
                className="overflow-hidden rounded-[20px]">
                <LinearGradient
                  colors={['#0891B2', '#0ED4C6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: isIOS ? 13 : 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 10,
                  }}>
                  <Brain color="#FFFFFF" size={16} strokeWidth={2.5} />
                  <Text
                    className={`font-black uppercase tracking-[0.12em] text-white ${isIOS ? 'text-[12px]' : 'text-[13px]'}`}>
                    Generate AI Review
                  </Text>
                </LinearGradient>
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
                {loadingMessages[loadingMsgIndex]}
              </Text>
            </Animated.View>

            {/* Interactive Progress Indicators */}
            <View className="w-full gap-2.5 px-3">
              {/* Micro bar segments */}
              <View className="h-1 flex-row gap-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                {loadingMessages.map((_, index) => {
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
                  {Math.round(((loadingMsgIndex + 1) / loadingMessages.length) * 100)}%
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
              onPress={handleGenerateReview}
              activeOpacity={0.8}
              className="w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-3.5 dark:border-slate-800 dark:bg-slate-900/60">
              <Text className="text-[12px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Re-initialize Pipeline
              </Text>
            </TouchableOpacity>
          </Reanimated.View>
        )}

        {/* STATE 4: DATA RESOLVED (Futuristic UI Compilations) */}
        {review && !loading && !error && (
          <View style={{ gap: isIOS ? 14 : 24 }}>
            {/* Cascading animations one by one */}
            {/* Row 1: Scope Verdict & Confidence Score */}
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

            {/* Row 3.5: Image Authenticity Assessment */}
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


            {/* Row 4: AI Reasoning Dialog Bubble */}
            {review.reason && (
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
            {review.actionRecommendation && (
              <Reanimated.View entering={FadeInDown.delay(500).duration(400)} className="gap-2">
                <Text className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Operational Guidelines
                </Text>

                <View
                  style={{
                    shadowColor: '#0E7490',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isDark ? 0.3 : 0.03,
                    shadowRadius: 12,
                    elevation: 2,
                  }}>
                  <LinearGradient
                    colors={
                      isDark
                        ? ['rgba(6,182,212,0.1)', 'rgba(6,182,212,0.02)']
                        : ['#ECFEFF', '#FFFFFF']
                    }
                    style={{
                      borderRadius: 20,
                      borderColor: isDark ? 'rgba(6,182,212,0.25)' : '#CFFAFE',
                      borderWidth: 1.5,
                      padding: 14,
                    }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}>
                    <View className="flex-row items-center gap-3">
                      <View className="h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/20">
                        <Activity
                          color={isDark ? '#22D3EE' : '#0891B2'}
                          size={16}
                          strokeWidth={2.5}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="mb-0.5 text-[8.5px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                          Recommended Protocol
                        </Text>
                        <Text
                          className={`font-black text-slate-800 dark:text-slate-200 ${isIOS ? 'text-[12.5px]' : 'text-[13.0px]'}`}>
                          {review.actionRecommendation}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
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
