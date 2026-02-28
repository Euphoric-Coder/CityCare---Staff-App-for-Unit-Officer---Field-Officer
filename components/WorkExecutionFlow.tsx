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
} from 'react-native';
import { Camera, MapPin, FileText, CheckCircle2, X, ImageIcon } from 'lucide-react-native';
import * as ExpoCamera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

interface WorkExecutionFlowProps {
  issueId: string;
  onClose: () => void;
  onSubmit: (data: {
    beforeImage: string | null;
    afterImage: string | null;
    location: { latitude: number; longitude: number } | null;
    notes: string;
  }) => void;
}

export default function WorkExecutionFlow({ issueId, onClose, onSubmit }: WorkExecutionFlowProps) {
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState<'before' | 'after' | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to capture your location'
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const captureLocation = async () => {
    if (!hasLocationPermission) {
      Alert.alert('Permission Required', 'Please enable location permissions to continue');
      return;
    }

    setIsCapturingLocation(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setIsCapturingLocation(false);
    } catch (error) {
      setIsCapturingLocation(false);
      Alert.alert('Error', 'Failed to capture location. Please try again.');
      console.error('Error capturing location:', error);
    }
  };

  const handleImageCaptured = async (imageUri: string, type: 'before' | 'after') => {
    if (type === 'before') {
      setBeforeImage(imageUri);
    } else {
      setAfterImage(imageUri);
    }
    setShowImagePicker(null);

    await captureLocation();
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
      console.error('Camera error:', error);
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
      console.error('Gallery error:', error);
    }
  };

  const handleCaptureBeforeImage = () => {
    setShowImagePicker('before');
  };

  const handleCaptureAfterImage = () => {
    setShowImagePicker('after');
  };

  const handleSubmit = () => {
    if (!beforeImage) {
      Alert.alert('Required', 'Please capture before image');
      return;
    }
    if (!afterImage) {
      Alert.alert('Required', 'Please capture after image');
      return;
    }
    if (!location) {
      Alert.alert('Required', 'Please capture location');
      return;
    }
    if (!notes.trim()) {
      Alert.alert('Required', 'Please add work notes');
      return;
    }

    Alert.alert('Confirm Submission', 'Submit resolution for verification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: () => {
          onSubmit({ beforeImage, afterImage, location, notes });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload Resolution</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X color="#6B7280" size={24} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Before Image</Text>
            <Text style={styles.required}>Required</Text>
          </View>
          {beforeImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: beforeImage }} style={styles.image} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => setBeforeImage(null)}
                activeOpacity={0.7}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCaptureBeforeImage}
              activeOpacity={0.7}>
              <Camera color="#0EA5A4" size={24} strokeWidth={2.5} />
              <Text style={styles.captureButtonText}>Capture Before Image</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>After Image</Text>
            <Text style={styles.required}>Required</Text>
          </View>
          {afterImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: afterImage }} style={styles.image} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => setAfterImage(null)}
                activeOpacity={0.7}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.captureButton, !beforeImage && styles.captureButtonDisabled]}
              onPress={handleCaptureAfterImage}
              disabled={!beforeImage}
              activeOpacity={0.7}>
              <Camera color={beforeImage ? '#0EA5A4' : '#9CA3AF'} size={24} strokeWidth={2.5} />
              <Text
                style={[
                  styles.captureButtonText,
                  !beforeImage && styles.captureButtonTextDisabled,
                ]}>
                Capture After Image
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.autoCapture}>Auto-captured</Text>
          </View>
          {location ? (
            <View style={styles.locationCard}>
              <View style={styles.locationIcon}>
                <CheckCircle2 color="#16A34A" size={24} strokeWidth={2.5} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Location Captured</Text>
                <Text style={styles.locationValue}>
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.locationPending}>
              <MapPin color="#6B7280" size={24} strokeWidth={2.5} />
              <Text style={styles.locationPendingText}>
                {isCapturingLocation
                  ? 'Capturing location...'
                  : 'Location will be captured automatically after taking photos'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Work Notes</Text>
            <Text style={styles.required}>Required</Text>
          </View>
          <View style={styles.notesInputContainer}>
            <FileText color="#6B7280" size={20} strokeWidth={2} />
            <TextInput
              style={styles.notesInput}
              placeholder="Describe the work completed..."
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.validationCard}>
          <Text style={styles.validationTitle}>Checklist</Text>
          <View style={styles.validationItem}>
            <View style={[styles.validationDot, beforeImage && styles.validationDotComplete]} />
            <Text style={styles.validationText}>Before image captured</Text>
          </View>
          <View style={styles.validationItem}>
            <View style={[styles.validationDot, afterImage && styles.validationDotComplete]} />
            <Text style={styles.validationText}>After image captured</Text>
          </View>
          <View style={styles.validationItem}>
            <View style={[styles.validationDot, location && styles.validationDotComplete]} />
            <Text style={styles.validationText}>Location verified</Text>
          </View>
          <View style={styles.validationItem}>
            <View style={[styles.validationDot, notes.trim() && styles.validationDotComplete]} />
            <Text style={styles.validationText}>Work notes added</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!beforeImage || !afterImage || !location || !notes.trim()) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!beforeImage || !afterImage || !location || !notes.trim()}
          activeOpacity={0.7}>
          <Text style={styles.submitButtonText}>Submit Resolution</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showImagePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePicker(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {showImagePicker === 'before' ? 'Before' : 'After'} Image
              </Text>
              <TouchableOpacity
                onPress={() => setShowImagePicker(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                if (showImagePicker) handleOpenCamera(showImagePicker);
              }}
              activeOpacity={0.7}>
              <View style={styles.modalOptionIcon}>
                <Camera color="#0EA5A4" size={28} strokeWidth={2.5} />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>Take Photo</Text>
                <Text style={styles.modalOptionDesc}>Use camera to capture image</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                if (showImagePicker) handleOpenGallery(showImagePicker);
              }}
              activeOpacity={0.7}>
              <View style={styles.modalOptionIcon}>
                <ImageIcon color="#0EA5A4" size={28} strokeWidth={2.5} />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.modalOptionDesc}>Select from existing photos</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowImagePicker(null)}
              activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  required: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  autoCapture: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0EA5A4',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#0EA5A4',
    borderStyle: 'dashed',
    minHeight: 120,
  },
  captureButtonDisabled: {
    borderColor: '#E5E7EB',
    opacity: 0.5,
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0EA5A4',
  },
  captureButtonTextDisabled: {
    color: '#9CA3AF',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  retakeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retakeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#D1FAE5',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#86EFAC',
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  locationPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  locationPendingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  notesInputContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  notesInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    fontWeight: '500',
  },
  validationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  validationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  validationDotComplete: {
    backgroundColor: '#16A34A',
  },
  validationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
  },
  submitButton: {
    flex: 2,
    padding: 16,
    backgroundColor: '#0EA5A4',
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#CCFBF1',
  },
  modalOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalOptionDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalCancelButton: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
  },
});
