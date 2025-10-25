import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../constants/theme';
import { generateScentDescription } from '../services/aiService';
import { saveMemory } from '../services/storageService';

export default function CaptureScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [capturedImage, setCapturedImage] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const cameraRef = useRef(null);
  const recordingTimer = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    (async () => {
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission?.granted) {
        await requestPermission();
      }
    })();

    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, []);

  const startRecordingPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopRecordingPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setCapturedImage(photo);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        setCapturedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const startRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Set audio mode to allow recording on iOS
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.record();

      setIsRecording(true);
      setRecordingDuration(0);
      startRecordingPulse();

      // Update duration every second
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop at 30 seconds
          if (newDuration >= 30) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!audioRecorder.isRecording) return;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const uri = await audioRecorder.stop();

      setAudioUri(uri);
      setIsRecording(false);
      stopRecordingPulse();

      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const processMemory = async () => {
    if (!capturedImage) {
      Alert.alert('Missing Photo', 'Please capture a photo first');
      return;
    }

    setIsProcessing(true);

    try {
      // Generate AI scent description
      const scentDescription = await generateScentDescription(capturedImage.base64);

      // Navigate to edit screen
      navigation.navigate('DescriptionEdit', {
        photoUri: capturedImage.uri,
        audioUri,
        scentDescription,
      });
    } catch (error) {
      console.error('Error processing memory:', error);
      Alert.alert('Error', 'Failed to generate scent description. Please check your API key.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera and microphone permissions are required</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text style={styles.permissionButton}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage.uri }} style={styles.preview} />

        <View style={styles.previewControls}>
          {/* Audio Recording */}
          <View style={styles.audioSection}>
            {audioUri ? (
              <View style={styles.audioRecorded}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.audioText}>Audio Recorded ({recordingDuration}s)</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={isRecording ? stopRecording : startRecording}
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons
                    name={isRecording ? 'stop-circle' : 'mic'}
                    size={32}
                    color={isRecording ? colors.error : colors.primary}
                  />
                </Animated.View>
                <Text style={styles.recordText}>
                  {isRecording ? `Recording... ${recordingDuration}s` : 'Record Ambient Sounds'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => {
                setCapturedImage(null);
                setAudioUri(null);
                setRecordingDuration(0);
              }}
            >
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={processMemory}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                style={styles.continueGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.continueText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Ionicons name="images" size={28} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    justifyContent: 'space-between',
  },
  closeButton: {
    margin: spacing.lg,
    marginTop: spacing.xxl,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  galleryButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
  },
  placeholder: {
    width: 50,
  },
  preview: {
    flex: 1,
  },
  previewControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: spacing.lg,
  },
  audioSection: {
    marginBottom: spacing.lg,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  recordText: {
    color: '#FFF',
    marginLeft: spacing.sm,
    ...typography.body,
  },
  audioRecorded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  audioText: {
    color: '#FFF',
    marginLeft: spacing.sm,
    ...typography.body,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  retakeButton: {
    flex: 1,
    padding: spacing.md,
    marginRight: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeText: {
    color: '#FFF',
    ...typography.body,
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    marginLeft: spacing.sm,
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  continueText: {
    color: '#FFF',
    ...typography.body,
    fontWeight: '600',
  },
  permissionText: {
    color: '#FFF',
    textAlign: 'center',
    padding: spacing.xl,
    ...typography.body,
  },
  permissionButton: {
    color: colors.primary,
    textAlign: 'center',
    padding: spacing.md,
    ...typography.body,
    fontWeight: '600',
  },
});
