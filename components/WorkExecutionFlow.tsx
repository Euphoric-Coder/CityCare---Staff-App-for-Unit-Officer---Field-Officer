import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  MapPin,
  FileText,
  CircleCheck as CheckCircle2,
  X,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  CircleCheck as CheckCircle,
  Clock,
  ChevronRight,
  Navigation,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Layout,
  Info,
} from 'lucide-react-native';
import * as ExpoCamera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { RotateCcw, AlertTriangle } from 'lucide-react-native';

const REWORK_REASONS_MAP = [
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
];

interface Coords {
  latitude: number;
  longitude: number;
}

interface WorkExecutionFlowProps {
  issueId: string;
  previousWork: {
    beforePhotos: string[];
    afterPhotos: string[];
    beforeLocation: Coords;
    afterLocation: Coords;
    notes: string;
    reworkNote?: string;
    reworkReasons?: string[];
  } | null;
  status: string;
  onClose: () => void;
  onSubmit: (data: {
    beforeImage: string | null;
    afterImage: string | null;
    beforeLocation: Coords | null;
    afterLocation: Coords | null;
    notes: string;
    isBeforeImageReplaced: boolean;
    isAfterImageReplaced: boolean;
    isNotesReplaced: boolean;
  }) => void;
}

function SectionHeader({
  icon,
  title,
  badge,
  badgeColor,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeColor?: 'red' | 'teal' | 'green';
}) {
  const isDark = useColorScheme() === 'dark';
  const badgeStyles: Record<string, string> = {
    red: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    teal: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    green: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };
  const badgeCls = badgeColor ? badgeStyles[badgeColor] : badgeStyles.teal;

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderTitle}>
        <LinearGradient
          colors={isDark ? ['#1E293B', '#0F172A'] : ['#F1F5F9', '#E2E8F0']}
          style={styles.sectionIconBox}>
          {icon}
        </LinearGradient>
        <Text style={[styles.sectionTitleText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          {title}
        </Text>
      </View>
      {badge && (
        <View className={`rounded-full border px-3 py-1 ${badgeCls}`}>
          <Text className="text-[10px] font-black uppercase tracking-tighter">{badge}</Text>
        </View>
      )}
    </View>
  );
}

function LocationBlock({
  label,
  coords,
  isCapturing,
}: {
  label: string;
  coords: Coords | null;
  isCapturing: boolean;
}) {
  const isDark = useColorScheme() === 'dark';
  if (isCapturing) {
    return (
      <View style={[styles.locationBox, styles.locationBoxCapturing]}>
        <ActivityIndicator size="small" color="#F59E0B" />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationLabel}>{label}</Text>
          <Text style={styles.locationSubText}>Acquiring High-Precision GPS...</Text>
        </View>
      </View>
    );
  }

  if (coords) {
    return (
      <View style={[styles.locationBox, styles.locationBoxSuccess]}>
        <ShieldCheck color="#10B981" size={18} strokeWidth={2.5} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.locationLabel, { color: '#065F46' }]}>{label} Verified</Text>
          <Text style={[styles.locationSubText, { color: '#059669' }]}>
            {coords.latitude.toFixed(6)}°, {coords.longitude.toFixed(6)}°
          </Text>
        </View>
        <Navigation size={14} color="#10B981" strokeWidth={2.5} />
      </View>
    );
  }

  return (
    <View style={styles.locationBoxPlaceholder}>
      <MapPin color={isDark ? '#475569' : '#94A3B8'} size={18} strokeWidth={2.5} />
      <Text style={[styles.locationPlaceholderText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
        Auto-captured upon photographic evidence
      </Text>
    </View>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={styles.checklistItem}>
      <LinearGradient
        colors={
          done ? ['#10B981', '#059669'] : isDark ? ['#334155', '#1E293B'] : ['#F1F5F9', '#E2E8F0']
        }
        style={styles.checklistDot}>
        {done && <CheckCircle size={10} color="#FFFFFF" strokeWidth={4} />}
      </LinearGradient>
      <Text
        style={[
          styles.checklistText,
          { color: done ? (isDark ? '#F8FAFC' : '#0F172A') : isDark ? '#475569' : '#94A3B8' },
          done && { fontWeight: '800' },
        ]}>
        {label}
      </Text>
    </View>
  );
}

export default function WorkExecutionFlow({
  issueId,
  previousWork,
  status,
  onClose,
  onSubmit,
}: WorkExecutionFlowProps) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [beforeLocation, setBeforeLocation] = useState<Coords | null>(null);
  const [afterLocation, setAfterLocation] = useState<Coords | null>(null);
  const [notes, setNotes] = useState('');
  const [capturingFor, setCapturingFor] = useState<'before' | 'after' | null>(null);
  const [showImagePicker, setShowImagePicker] = useState<'before' | 'after' | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isRework = status === 'rework_required';

  const deleteImage = useMutation(api.issuesMedia.deleteMedia);

  // Effective data getters (state || previousWork fallback)
  const effectiveBeforeImage = beforeImage || (isRework ? previousWork?.beforePhotos?.[0] : null);
  const effectiveAfterImage = afterImage || (isRework ? previousWork?.afterPhotos?.[0] : null);
  const effectiveBeforeLocation =
    beforeLocation || (isRework ? previousWork?.beforeLocation : null);
  const effectiveAfterLocation = afterLocation || (isRework ? previousWork?.afterLocation : null);
  const effectiveNotes = notes.trim() || (isRework ? previousWork?.notes || '' : '');

  const isBeforeReplaced = !!beforeImage;
  const isAfterReplaced = !!afterImage;
  const isNotesReplaced = notes.trim().length > 0;

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const captureLocationFor = async (type: 'before' | 'after') => {
    if (!hasLocationPermission) return;
    setCapturingFor(type);
    try {
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords: Coords = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      };
      if (type === 'before') {
        setBeforeLocation(coords);
      } else {
        setAfterLocation(coords);
      }
    } catch (error) {
      Alert.alert('Location Error', 'Failed to capture GPS location. Please try again.');
      console.error('Error capturing location:', error);
    } finally {
      setCapturingFor(null);
    }
  };

  const handleImageCaptured = async (imageUri: string, type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforeImage(imageUri);
    } else {
      setAfterImage(imageUri);
    }
    setShowImagePicker(null);
    await captureLocationFor(type);
  };

  const handleOpenCamera = async (type: 'before' | 'after') => {
    try {
      const { status } = await ExpoCamera.Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await handleImageCaptured(result.assets[0].uri, type);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const handleOpenGallery = async (type: 'before' | 'after') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select photos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await handleImageCaptured(result.assets[0].uri, type);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const wordCount = effectiveNotes
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const isNotesValid = wordCount >= 10;

  const isReady =
    !!effectiveBeforeImage &&
    !!effectiveAfterImage &&
    !!effectiveBeforeLocation &&
    !!effectiveAfterLocation &&
    !!effectiveNotes.trim() &&
    isNotesValid;

  const handleSubmit = () => {
    if (!effectiveBeforeImage) {
      Alert.alert('Required', 'Please capture a before image');
      return;
    }
    if (!effectiveBeforeLocation) {
      Alert.alert('Required', 'Before location is missing');
      return;
    }
    if (!effectiveAfterImage) {
      Alert.alert('Required', 'Please capture an after image');
      return;
    }
    if (!effectiveAfterLocation) {
      Alert.alert('Required', 'After location is missing');
      return;
    }
    if (!effectiveNotes.trim()) {
      Alert.alert('Required', 'Please add work notes');
      return;
    }
    if (!isNotesValid) {
      Alert.alert(
        'Insufficient Detail',
        `Please provide at least 10 words in your work notes. Current count: ${wordCount} words.`
      );
      return;
    }
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);

    const finalData = {
      beforeImage: effectiveBeforeImage,
      afterImage: effectiveAfterImage,
      beforeLocation: effectiveBeforeLocation,
      afterLocation: effectiveAfterLocation,
      notes: effectiveNotes,
      isBeforeImageReplaced: isBeforeReplaced,
      isAfterImageReplaced: isAfterReplaced,
      isNotesReplaced: isNotesReplaced,
    };

    console.log('--- REWORK SUBMISSION EXECUTION ---');
    console.log('Original Issue ID:', issueId);
    if (isRework) {
      console.log('Mode: Rework/Rectification');
      console.log('Before Evidence:', isBeforeReplaced ? 'REPLACED' : 'KEPT PREVIOUS');
      console.log('After Evidence:', isAfterReplaced ? 'REPLACED' : 'KEPT PREVIOUS');
      console.log('Notes:', isNotesReplaced ? 'REPLACED' : 'KEPT PREVIOUS');

      if (isBeforeReplaced || isAfterReplaced) {
        // Schedule deletion of previous storage assets
        if (isBeforeReplaced && previousWork?.beforePhotos?.[0]) {
          await deleteImage({
            storageId: previousWork.beforePhotos[0].split('api/storage/')[1] as Id<'_storage'>,
          });
        }

        if (isAfterReplaced && previousWork?.afterPhotos?.[0]) {
          await deleteImage({
            storageId: previousWork.afterPhotos[0].split('api/storage/')[1] as Id<'_storage'>,
          });
        }
      }
    }

    console.log('Final Submission Data:', finalData);
    onSubmit(finalData as any);
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* ── Header ── */}
      <View
        style={[
          styles.headerContainer,
          { paddingTop: insets.top },
          isDark ? styles.headerDark : styles.headerLight,
        ]}>
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View className="flex-row items-center px-6 py-4">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Sparkles size={18} color={isRework ? '#F59E0B' : '#0D9488'} />
              <Text style={[styles.headerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                {isRework ? 'Rectify & Re-submit' : 'Resolution Protocol'}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text style={styles.headerSubtitle}>ASSET ID: {issueId.slice(-8).toUpperCase()}</Text>
              {isRework && (
                <View className="rounded-md bg-amber-500/10 px-1.5 py-0.5">
                  <Text className="text-[8px] font-black tracking-widest text-amber-500">
                    REWORK MODE
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.closeBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            activeOpacity={0.7}>
            <X color={isDark ? '#94A3B8' : '#64748B'} size={20} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Premium Progress Stepper */}
        <View style={styles.stepperContainer}>
          {['EVIDENCE', 'VERIFICATION', 'REMARKS', 'FINALIZE'].map((step, i) => {
            const stepDone = [
              !!effectiveBeforeImage && !!effectiveBeforeLocation,
              !!effectiveAfterImage && !!effectiveAfterLocation,
              !!effectiveNotes.trim(),
              isReady,
            ][i];
            const isCurrent =
              !stepDone &&
              (i === 0 ||
                [
                  !!effectiveBeforeImage && !!effectiveBeforeLocation,
                  !!effectiveAfterImage && !!effectiveAfterLocation,
                  !!effectiveNotes.trim(),
                ][i - 1]);

            return (
              <View key={i} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepTrack,
                    isCurrent && { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                  ]}>
                  <View style={[styles.stepFill, { width: stepDone ? '100%' : '0%' }]} />
                </View>
                <Text
                  style={[
                    styles.stepText,
                    { color: stepDone ? '#0D9488' : isDark ? '#475569' : '#94A3B8' },
                    (isCurrent || (i === 3 && isReady)) && {
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      fontWeight: '900',
                    },
                  ]}>
                  {step}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* ── Rework Instructions ── */}
        {isRework && (previousWork?.reworkNote || (previousWork?.reworkReasons?.length ?? 0) > 0) && (
          <Animated.View 
            entering={FadeInDown.duration(400)}
            className="rounded-3xl bg-amber-50 dark:bg-amber-950/20 p-5 border border-amber-200 dark:border-amber-900/50 shadow-sm"
          >
            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-10 h-10 rounded-xl bg-amber-500 items-center justify-center shadow-md shadow-amber-500/30">
                <RotateCcw color="#FFF" size={20} strokeWidth={2.5} />
              </View>
              <View>
                <Text className="text-[16px] font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">
                  Rework Directive
                </Text>
                <Text className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                  Corrections required by Unit Officer
                </Text>
              </View>
            </View>

            {previousWork?.reworkReasons && previousWork.reworkReasons.length > 0 && (
              <View className="gap-3 mb-4">
                {previousWork.reworkReasons.map((reasonLabel, idx) => {
                  const reasonData = REWORK_REASONS_MAP.find(r => r.label === reasonLabel);
                  return (
                    <View key={idx} className="flex-row gap-3">
                      <View className="mt-1">
                        <AlertTriangle size={14} color="#F59E0B" strokeWidth={3} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[13px] font-extrabold text-amber-800 dark:text-amber-200">
                          {reasonLabel}
                        </Text>
                        {reasonData?.desc && (
                          <Text className="text-[12px] font-medium text-amber-600/80 dark:text-amber-500/80 leading-4 mt-0.5">
                            {reasonData.desc}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {previousWork?.reworkNote && (
              <View className="mt-2 p-4 rounded-2xl bg-white/80 dark:bg-black/20 border border-amber-200/50 dark:border-amber-900/30">
                <Text className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2">
                  Unit Officer Remarks
                </Text>
                <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 leading-5">
                  "{previousWork.reworkNote}"
                </Text>
              </View>
            )}
          </Animated.View>
        )}
        {/* ── Before Image ── */}
        <View className="rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <SectionHeader
            icon={<Camera size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="Before Image"
            badge={isRework && !isBeforeReplaced ? 'Evidence Kept' : 'Required'}
            badgeColor={isRework && !isBeforeReplaced ? 'green' : 'red'}
          />

          {effectiveBeforeImage ? (
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: effectiveBeforeImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.imageGradient}
              />
              <TouchableOpacity
                onPress={() => setShowImagePicker('before')}
                style={styles.retakeBtn}
                activeOpacity={0.85}>
                <RefreshCw size={13} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="ml-1 text-[12px] font-bold text-white">
                  {isBeforeReplaced ? 'Retake' : 'Change Evidence'}
                </Text>
              </TouchableOpacity>
              {!isBeforeReplaced && isRework && (
                <View className="absolute left-3 top-3 rounded-md bg-emerald-500 px-2 py-1">
                  <Text className="text-[10px] font-black text-white">PREVIOUS</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowImagePicker('before')}
              activeOpacity={0.8}
              style={styles.captureZone}>
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-900/30">
                <Camera size={24} color="#0EA5A4" strokeWidth={2.5} />
              </View>
              <Text className="text-[14px] font-extrabold text-teal-600 dark:text-teal-400">
                Capture Before Photo
              </Text>
              <Text className="mt-1 text-[12px] font-medium text-slate-400 dark:text-slate-500">
                Tap to use camera or gallery
              </Text>
            </TouchableOpacity>
          )}

          <View className="mt-3">
            <LocationBlock
              label="Before Location"
              coords={effectiveBeforeLocation}
              isCapturing={capturingFor === 'before'}
            />
          </View>
        </View>

        {/* ── After Image ── */}
        <View className="rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <SectionHeader
            icon={<CheckCircle2 size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="After Image"
            badge={isRework && !isAfterReplaced ? 'Evidence Kept' : 'Required'}
            badgeColor={isRework && !isAfterReplaced ? 'green' : 'red'}
          />

          {effectiveAfterImage ? (
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: effectiveAfterImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.imageGradient}
              />
              <TouchableOpacity
                onPress={() => setShowImagePicker('after')}
                style={styles.retakeBtn}
                activeOpacity={0.85}>
                <RefreshCw size={13} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="ml-1 text-[12px] font-bold text-white">
                  {isAfterReplaced ? 'Retake' : 'Change Evidence'}
                </Text>
              </TouchableOpacity>
              {!isAfterReplaced && isRework && (
                <View className="absolute left-3 top-3 rounded-md bg-emerald-500 px-2 py-1">
                  <Text className="text-[10px] font-black text-white">PREVIOUS</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() =>
                effectiveBeforeImage
                  ? setShowImagePicker('after')
                  : Alert.alert('Required', 'Capture the before image first')
              }
              activeOpacity={effectiveBeforeImage ? 0.8 : 1}
              style={[styles.captureZone, !effectiveBeforeImage && styles.captureZoneDisabled]}>
              <View
                className={`mb-3 h-14 w-14 items-center justify-center rounded-2xl ${effectiveBeforeImage ? 'bg-teal-50 dark:bg-teal-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <Camera
                  size={24}
                  color={effectiveBeforeImage ? '#0EA5A4' : '#94A3B8'}
                  strokeWidth={2.5}
                />
              </View>
              <Text
                className={`text-[14px] font-extrabold ${effectiveBeforeImage ? 'text-teal-600 dark:text-teal-400' : 'text-slate-300 dark:text-slate-600'}`}>
                Capture After Photo
              </Text>
              <Text className="mt-1 text-[12px] font-medium text-slate-400 dark:text-slate-500">
                {effectiveBeforeImage
                  ? 'Tap to use camera or gallery'
                  : 'Complete before image first'}
              </Text>
            </TouchableOpacity>
          )}

          <View className="mt-3">
            <LocationBlock
              label="After Location"
              coords={effectiveAfterLocation}
              isCapturing={capturingFor === 'after'}
            />
          </View>
        </View>

        {/* ── Work Notes ── */}
        <View className="rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <SectionHeader
            icon={<FileText size={16} color={isRework ? '#F59E0B' : '#0EA5A4'} strokeWidth={2.5} />}
            title={isRework ? 'Rectification Notes' : 'Work Notes'}
            badge={isRework && !isNotesReplaced ? 'Notes Kept' : 'Required'}
            badgeColor={isRework && !isNotesReplaced ? 'green' : 'red'}
          />
          <View
            style={[
              styles.notesContainer,
              isDark ? styles.notesDark : styles.notesLight,
              effectiveNotes.trim().length > 0 &&
                !isNotesValid && {
                  borderColor: '#EF4444',
                  backgroundColor: 'rgba(239,68,68,0.02)',
                },
              isNotesValid && { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.02)' },
            ]}>
            <TextInput
              style={[styles.notesInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
              placeholder={
                isRework
                  ? previousWork?.notes || 'Explain corrections...'
                  : 'Detailed report of work performed...'
              }
              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <View style={[styles.notesIconBox, isNotesValid && { backgroundColor: '#10B981' }]}>
              {isNotesValid ? (
                <CheckCircle size={14} color="#FFFFFF" />
              ) : (
                <Sparkles
                  size={14}
                  color={effectiveNotes.trim().length > 0 ? '#EF4444' : '#0D9488'}
                />
              )}
            </View>
          </View>
          {isRework && !isNotesReplaced && previousWork?.notes && (
            <View className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
              <Text className="mb-1 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">
                Previous Notes Preview
              </Text>
              <Text
                className="text-[12px] font-medium italic text-slate-600 dark:text-slate-400"
                numberOfLines={2}>
                {previousWork.notes}
              </Text>
            </View>
          )}
          {effectiveNotes.trim().length > 0 && (
            <View className="mt-3 flex-row items-center justify-between">
              <View style={styles.wordCountBadge}>
                <Text
                  style={[
                    styles.wordCountText,
                    isNotesValid ? { color: '#10B981' } : { color: '#EF4444' },
                  ]}>
                  {wordCount} WORDS
                </Text>
              </View>
              <View style={styles.charCountBox}>
                <Text style={styles.charCountText}>{effectiveNotes.trim().length} CHARS</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Checklist ── */}
        <View className="rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <SectionHeader
            icon={<CheckCircle size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="Submission Checklist"
          />
          <ChecklistItem done={!!effectiveBeforeImage} label="Before image captured" />
          <ChecklistItem done={!!effectiveBeforeLocation} label="Before location recorded" />
          <ChecklistItem done={!!effectiveAfterImage} label="After image captured" />
          <ChecklistItem done={!!effectiveAfterLocation} label="After location recorded" />
          <ChecklistItem
            done={!!effectiveNotes.trim()}
            label={isRework ? 'Rectification notes added' : 'Work notes added'}
          />
        </View>

        <View className="h-4" />
      </ScrollView>

      {/* ── Confirmation Modal ── */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={[styles.confirmModalContent, isDark ? styles.modalDark : styles.modalLight]}>
            <LinearGradient
              colors={isRework ? ['#F59E0B', '#D97706'] : ['#0D9488', '#0891B2']}
              style={styles.modalHeaderIcon}>
              <ShieldCheck size={36} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>

            <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {isRework ? 'Submit Rectification' : 'Finalize Resolution'}
            </Text>

            <Text style={[styles.modalMessage, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {isRework
                ? 'Your corrected evidence and documentation will be sent for secondary verification.'
                : 'Your resolution protocol and evidence will be submitted for official Unit Officer verification.'}
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' },
                ]}>
                <Text style={[styles.modalCancelText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Discard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={executeSubmit} style={styles.modalConfirmBtn}>
                <LinearGradient
                  colors={isRework ? ['#F59E0B', '#D97706'] : ['#0D9488', '#0891B2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmGrad}>
                  <Text style={styles.modalConfirmText}>
                    {isRework ? 'Resubmit' : 'Submit Protocol'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Footer ── */}
      <View
        className="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"
        style={{ paddingBottom: insets.bottom }}>
        <View className="flex-row gap-3 px-5 py-4">
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            className="h-14 flex-1 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Text className="text-[15px] font-bold text-slate-600 dark:text-slate-300">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={isReady ? 0.85 : 1}
            style={{ flex: 2 }}>
            <LinearGradient
              colors={isReady ? ['#0D9488', '#0891B2'] : ['#CBD5E1', '#CBD5E1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGrad}>
              <Upload size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="ml-2 text-[15px] font-extrabold text-white">
                {isRework ? 'Resubmit Resolution' : 'Submit Resolution'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Image Picker Modal ── */}
      <Modal
        visible={showImagePicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImagePicker(null)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="gap-3 rounded-t-3xl bg-white px-5 pb-10 pt-6 dark:bg-slate-900">
            <View className="mb-2 flex-row items-center justify-between">
              <View>
                <Text className="text-[20px] font-extrabold text-slate-900 dark:text-slate-100">
                  {showImagePicker === 'before' ? 'Before' : 'After'} Photo
                </Text>
                <Text className="mt-0.5 text-[13px] font-medium text-slate-400 dark:text-slate-500">
                  Choose how to add your photo
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowImagePicker(null)}
                className="h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X color="#64748B" size={18} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (showImagePicker) handleOpenCamera(showImagePicker);
              }}
              activeOpacity={0.82}
              className="flex-row items-center gap-4 rounded-2xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-800/50 dark:bg-teal-900/20">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                <Camera color="#0EA5A4" size={26} strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
                  Take Photo
                </Text>
                <Text className="mt-0.5 text-[12px] font-medium text-slate-400 dark:text-slate-500">
                  Use device camera
                </Text>
              </View>
              <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (showImagePicker) handleOpenGallery(showImagePicker);
              }}
              activeOpacity={0.82}
              className="flex-row items-center gap-4 rounded-2xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-800/50 dark:bg-teal-900/20">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                <ImageIcon color="#0EA5A4" size={26} strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
                  Choose from Gallery
                </Text>
                <Text className="mt-0.5 text-[12px] font-medium text-slate-400 dark:text-slate-500">
                  Select an existing photo
                </Text>
              </View>
              <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowImagePicker(null)}
              activeOpacity={0.8}
              className="mt-1 h-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Text className="text-[15px] font-bold text-slate-600 dark:text-slate-300">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomWidth: 1.5,
    zIndex: 10,
  },
  headerLight: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerDark: {
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  stepperContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  stepItem: {
    flex: 1,
  },
  stepTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  stepText: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  imageWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  previewImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#F1F5F9',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  captureZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#0D9488',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(13,148,136,0.03)',
  },
  captureZoneDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  locationBoxCapturing: {
    backgroundColor: 'rgba(245,158,11,0.05)',
    borderColor: 'rgba(245,158,11,0.2)',
  },
  locationBoxSuccess: {
    backgroundColor: 'rgba(16,185,129,0.05)',
    borderColor: 'rgba(16,185,129,0.2)',
  },
  locationBoxPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.04)',
    borderStyle: 'dashed',
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  locationSubText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  locationPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitGrad: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  checklistDot: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  notesContainer: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    minHeight: 160,
    position: 'relative',
  },
  notesLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  notesDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  notesInput: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  notesIconBox: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(13,148,136,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  charCountBox: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  charCountText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
  },
  wordCountBadge: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  wordCountText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
  },
  confirmModalContent: {
    width: '100%',
    borderRadius: 36,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  modalLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255,255,255,0.8)',
  },
  modalDark: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeaderIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '600',
    paddingHorizontal: 10,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalConfirmBtn: {
    flex: 1.5,
    height: 56,
  },
  modalConfirmGrad: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
