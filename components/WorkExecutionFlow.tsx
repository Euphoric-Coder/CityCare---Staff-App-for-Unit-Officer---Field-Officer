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
} from 'lucide-react-native';
import * as ExpoCamera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

interface Coords {
  latitude: number;
  longitude: number;
}

interface WorkExecutionFlowProps {
  issueId: string;
  onClose: () => void;
  onSubmit: (data: {
    beforeImage: string | null;
    afterImage: string | null;
    beforeLocation: Coords | null;
    afterLocation: Coords | null;
    notes: string;
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
  const badgeStyles: Record<string, string> = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    green: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  };
  const badgeCls = badgeColor ? badgeStyles[badgeColor] : badgeStyles.teal;

  return (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-900/30">
          {icon}
        </View>
        <Text className="text-[15px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
          {title}
        </Text>
      </View>
      {badge && (
        <View className={`rounded-lg px-2.5 py-1 ${badgeCls.split(' ').slice(0, 2).join(' ')}`}>
          <Text className={`text-[11px] font-bold ${badgeCls.split(' ').slice(2).join(' ')}`}>
            {badge}
          </Text>
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
  if (isCapturing) {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
          <ActivityIndicator size="small" color="#F59E0B" />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-bold text-amber-700 dark:text-amber-400">{label}</Text>
          <Text className="mt-0.5 text-[12px] font-medium text-amber-600 dark:text-amber-500">
            Acquiring GPS signal...
          </Text>
        </View>
      </View>
    );
  }

  if (coords) {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-700/50 dark:bg-emerald-900/20">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 color="#16A34A" size={20} strokeWidth={2.5} />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">
            {label} Captured
          </Text>
          <Text className="mt-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-500">
            {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </Text>
        </View>
        <Navigation size={14} color="#16A34A" strokeWidth={2.5} />
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/60">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
        <MapPin color="#94A3B8" size={18} strokeWidth={2.5} />
      </View>
      <Text className="flex-1 text-[13px] font-semibold text-slate-400 dark:text-slate-500">
        Auto-captured when photo is taken
      </Text>
    </View>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-700/50">
      <View
        className={`h-5 w-5 items-center justify-center rounded-full ${
          done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
        }`}>
        {done && <CheckCircle size={13} color="#FFFFFF" strokeWidth={3} />}
      </View>
      <Text
        className={`text-[13px] font-semibold ${
          done ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
        }`}>
        {label}
      </Text>
    </View>
  );
}

export default function WorkExecutionFlow({ issueId, onClose, onSubmit }: WorkExecutionFlowProps) {
  const insets = useSafeAreaInsets();
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [beforeLocation, setBeforeLocation] = useState<Coords | null>(null);
  const [afterLocation, setAfterLocation] = useState<Coords | null>(null);
  const [notes, setNotes] = useState('');
  const [capturingFor, setCapturingFor] = useState<'before' | 'after' | null>(null);
  const [showImagePicker, setShowImagePicker] = useState<'before' | 'after' | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

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
        allowsEditing: true,
        aspect: [4, 3],
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
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await handleImageCaptured(result.assets[0].uri, type);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const isReady =
    !!beforeImage && !!afterImage && !!beforeLocation && !!afterLocation && !!notes.trim();

  const handleSubmit = () => {
    if (!beforeImage) {
      Alert.alert('Required', 'Please capture a before image');
      return;
    }
    if (!beforeLocation) {
      Alert.alert('Required', 'Before location is still being captured');
      return;
    }
    if (!afterImage) {
      Alert.alert('Required', 'Please capture an after image');
      return;
    }
    if (!afterLocation) {
      Alert.alert('Required', 'After location is still being captured');
      return;
    }
    if (!notes.trim()) {
      Alert.alert('Required', 'Please add work notes');
      return;
    }

    Alert.alert('Confirm Submission', 'Submit resolution for UO verification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: () => onSubmit({ beforeImage, afterImage, beforeLocation, afterLocation, notes }),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* ── Header ── */}
      <View
        className="border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"
        style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-5 py-3">
          <View className="flex-1">
            <Text className="text-[18px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Upload Resolution
            </Text>
            <Text className="mt-0.5 text-[12px] font-medium text-slate-400 dark:text-slate-500">
              Issue #{issueId.slice(0, 8)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}>
            <X color="#64748B" size={20} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View className="flex-row gap-1.5 px-5 pb-4">
          {['Before', 'After', 'Notes', 'Submit'].map((step, i) => {
            const stepDone = [!!beforeImage, !!afterImage, !!notes.trim(), isReady][i];
            return (
              <View key={i} className="flex-1">
                <View
                  className={`h-1.5 rounded-full ${stepDone ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                />
                <Text
                  className={`mt-1 text-center text-[9px] font-bold ${stepDone ? 'text-teal-600 dark:text-teal-400' : 'text-slate-300 dark:text-slate-600'}`}>
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
        {/* ── Before Image ── */}
        <View className="rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <SectionHeader
            icon={<Camera size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="Before Image"
            badge="Required"
            badgeColor="red"
          />

          {beforeImage ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: beforeImage }} style={styles.previewImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.imageGradient}
              />
              <TouchableOpacity
                onPress={() => {
                  setBeforeImage(null);
                  setBeforeLocation(null);
                }}
                style={styles.retakeBtn}
                activeOpacity={0.85}>
                <RefreshCw size={13} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="ml-1 text-[12px] font-bold text-white">Retake</Text>
              </TouchableOpacity>
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
              coords={beforeLocation}
              isCapturing={capturingFor === 'before'}
            />
          </View>
        </View>

        {/* ── After Image ── */}
        <View className="rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <SectionHeader
            icon={<CheckCircle2 size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="After Image"
            badge="Required"
            badgeColor="red"
          />

          {afterImage ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: afterImage }} style={styles.previewImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.imageGradient}
              />
              <TouchableOpacity
                onPress={() => {
                  setAfterImage(null);
                  setAfterLocation(null);
                }}
                style={styles.retakeBtn}
                activeOpacity={0.85}>
                <RefreshCw size={13} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="ml-1 text-[12px] font-bold text-white">Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() =>
                beforeImage
                  ? setShowImagePicker('after')
                  : Alert.alert('Required', 'Capture the before image first')
              }
              activeOpacity={beforeImage ? 0.8 : 1}
              style={[styles.captureZone, !beforeImage && styles.captureZoneDisabled]}>
              <View
                className={`mb-3 h-14 w-14 items-center justify-center rounded-2xl ${beforeImage ? 'bg-teal-50 dark:bg-teal-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <Camera size={24} color={beforeImage ? '#0EA5A4' : '#94A3B8'} strokeWidth={2.5} />
              </View>
              <Text
                className={`text-[14px] font-extrabold ${beforeImage ? 'text-teal-600 dark:text-teal-400' : 'text-slate-300 dark:text-slate-600'}`}>
                Capture After Photo
              </Text>
              <Text className="mt-1 text-[12px] font-medium text-slate-400 dark:text-slate-500">
                {beforeImage ? 'Tap to use camera or gallery' : 'Complete before image first'}
              </Text>
            </TouchableOpacity>
          )}

          <View className="mt-3">
            <LocationBlock
              label="After Location"
              coords={afterLocation}
              isCapturing={capturingFor === 'after'}
            />
          </View>
        </View>

        {/* ── Work Notes ── */}
        <View className="rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <SectionHeader
            icon={<FileText size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="Work Notes"
            badge="Required"
            badgeColor="red"
          />
          <View className="flex-row gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/60">
            <FileText color="#94A3B8" size={18} strokeWidth={2} style={{ marginTop: 2 }} />
            <TextInput
              className="flex-1 text-[14px] font-medium text-slate-800 dark:text-slate-200"
              placeholder="Describe the work completed, materials used, issues encountered..."
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{ minHeight: 110 }}
            />
          </View>
          {notes.trim().length > 0 && (
            <Text className="mt-2 text-right text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {notes.trim().length} characters
            </Text>
          )}
        </View>

        {/* ── Checklist ── */}
        <View className="rounded-3xl bg-white p-5 dark:bg-slate-900" style={styles.card}>
          <SectionHeader
            icon={<CheckCircle size={16} color="#0EA5A4" strokeWidth={2.5} />}
            title="Submission Checklist"
          />
          <ChecklistItem done={!!beforeImage} label="Before image captured" />
          <ChecklistItem done={!!beforeLocation} label="Before location recorded" />
          <ChecklistItem done={!!afterImage} label="After image captured" />
          <ChecklistItem done={!!afterLocation} label="After location recorded" />
          <ChecklistItem done={!!notes.trim()} label="Work notes added" />
        </View>

        <View className="h-4" />
      </ScrollView>

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
              <Text className="ml-2 text-[15px] font-extrabold text-white">Submit Resolution</Text>
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
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 4,
  },
  imageWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F1F5F9',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  retakeBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  captureZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#0EA5A4',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(14,165,164,0.03)',
  },
  captureZoneDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: 'transparent',
  },
  submitGrad: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
