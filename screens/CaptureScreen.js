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
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../constants/theme';
import { generateScentDescription } from '../services/aiService';
import { saveMemory } from '../services/storageService';

export default function CaptureScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();

  const [capturedImage, setCapturedImage] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackSound, setPlaybackSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPermission, setAudioPermission] = useState(null);
  const [recording, setRecording] = useState(null);

  const cameraRef = useRef(null);
  const recordingTimer = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    (async () => {
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission?.granted) {
        await requestPermission();
      }

      // Request audio recording permission
      const audioStatus = await Audio.requestPermissionsAsync();
      setAudioPermission(audioStatus);
    })();

    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      if (playbackSound) {
        playbackSound.unloadAsync?.();
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
      // Check audio permission first
      if (!audioPermission?.granted) {
        const { granted } = await Audio.requestPermissionsAsync();
        setAudioPermission({ granted });
        if (!granted) {
          Alert.alert('Permission Required', 'Microphone permission is required to record audio');
          return;
        }
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Set audio mode to allow recording on iOS
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording with expo-av...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
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
      Alert.alert('Error', 'Failed to start recording: ' + error.message);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      console.log('Stopping recording...');
      await recording.stopAndUnloadAsync();

      // Get the URI from the recording
      const uri = recording.getURI();

      console.log('Recording stopped, URI:', uri);

      setAudioUri(uri);
      setRecording(null);
      setIsRecording(false);
      stopRecordingPulse();

      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording: ' + error.message);
    }
  };

  const playRecording = async () => {
    try {
      if (!audioUri) {
        Alert.alert('No Recording', 'No audio recording found');
        return;
      }

      console.log('Playing recording from URI:', audioUri);

      if (isPlaying && playbackSound) {
        // Stop playback
        console.log('Stopping playback...');
        await playbackSound.stopAsync();
        await playbackSound.unloadAsync();
        setPlaybackSound(null);
        setIsPlaying(false);
      } else {
        // Unload any existing sound first
        if (playbackSound) {
          await playbackSound.unloadAsync();
          setPlaybackSound(null);
        }

        // Configure audio mode for playback
        console.log('Setting audio mode for playback...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        console.log('Creating sound from URI...');
        // Create and play the sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true, volume: 1.0 },
          status => {
            // Playback status update callback
            if (status.isLoaded) {
              console.log('Playback status:', {
                isPlaying: status.isPlaying,
                positionMillis: status.positionMillis,
                durationMillis: status.durationMillis,
              });

              if (status.didJustFinish) {
                console.log('Playback finished');
                setIsPlaying(false);
                sound.unloadAsync();
                setPlaybackSound(null);
              }
            } else if (status.error) {
              console.error('Playback error:', status.error);
              Alert.alert('Playback Error', status.error);
              setIsPlaying(false);
            }
          }
        );

        console.log('Sound created and playing');
        setPlaybackSound(sound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing recording:', error);
      Alert.alert('Error', 'Failed to play recording: ' + error.message);
      setIsPlaying(false);
      if (playbackSound) {
        await playbackSound.unloadAsync();
        setPlaybackSound(null);
      }
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

  if (!permission?.granted || !audioPermission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera and microphone permissions are required</Text>
        <TouchableOpacity
          onPress={async () => {
            await requestPermission();
            const audioStatus = await Audio.requestPermissionsAsync();
            setAudioPermission(audioStatus);
          }}
        >
          <Text style={styles.permissionButton}>Grant Permissions</Text>
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
                <TouchableOpacity style={styles.playButton} onPress={playRecording}>
                  <Ionicons
                    name={isPlaying ? 'pause-circle' : 'play-circle'}
                    size={32}
                    color={colors.primary}
                  />
                </TouchableOpacity>
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
              onPress={async () => {
                setCapturedImage(null);
                setAudioUri(null);
                setRecordingDuration(0);
                if (playbackSound) {
                  await playbackSound.unloadAsync();
                  setPlaybackSound(null);
                }
                setIsPlaying(false);
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
    marginRight: spacing.md,
    ...typography.body,
  },
  playButton: {
    marginLeft: spacing.sm,
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
