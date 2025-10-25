import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { getMemoryById, rateMemory, deleteMemory } from '../services/storageService';

const { width, height } = Dimensions.get('window');

export default function PlaybackScreen({ route, navigation }) {
  const { memoryId } = route.params;

  const [memory, setMemory] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rating, setRating] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadMemory();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      Speech.stop();
    };
  }, []);

  const loadMemory = async () => {
    const data = await getMemoryById(memoryId);
    setMemory(data);
    setRating(data?.reminderRating);
  };

  const playAmbientSound = async () => {
    try {
      if (!memory?.audioUri) return;

      if (sound) {
        await sound.unloadAsync();
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: memory.audioUri },
        { isLooping: true, volume: 0.7 }
      );

      setSound(newSound);
      await newSound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play ambient sounds');
    }
  };

  const stopAmbientSound = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const speakDescription = async () => {
    try {
      if (isSpeaking) {
        Speech.stop();
        setIsSpeaking(false);
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const description = memory?.customDescription || memory?.scentDescription;

      Speech.speak(description, {
        language: 'en',
        pitch: 1.0,
        rate: 0.85, // Slightly slower for a calming effect
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Error with text-to-speech:', error);
    }
  };

  const handleRating = async newRating => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRating(newRating);
      await rateMemory(memoryId, newRating);
    } catch (error) {
      console.error('Error rating memory:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMemory(memoryId);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting memory:', error);
              Alert.alert('Error', 'Failed to delete memory');
            }
          },
        },
      ]
    );
  };

  if (!memory) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading memory...</Text>
      </View>
    );
  }

  const description = memory.customDescription || memory.scentDescription;

  return (
    <View style={styles.container}>
      {/* Background Image with Warm Filter */}
      <Image source={{ uri: memory.photoUri }} style={styles.backgroundImage} blurRadius={2} />

      {/* Warm Overlay */}
      <LinearGradient
        colors={['rgba(255,140,66,0.3)', 'rgba(232,131,92,0.4)']}
        style={styles.overlay}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.date}>
            {new Date(memory.timestamp).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Main Photo Card */}
        <Animated.View
          style={[
            styles.photoCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image source={{ uri: memory.photoUri }} style={styles.photo} />
        </Animated.View>

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {memory.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Description Card */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>Scent Memory</Text>
          <Text style={styles.description}>{description}</Text>

          {/* TTS Button */}
          <TouchableOpacity style={styles.ttsButton} onPress={speakDescription} activeOpacity={0.7}>
            <Ionicons
              name={isSpeaking ? 'stop-circle' : 'play-circle'}
              size={24}
              color={colors.primary}
            />
            <Text style={styles.ttsText}>{isSpeaking ? 'Stop Reading' : 'Read Aloud'}</Text>
          </TouchableOpacity>
        </View>

        {/* Audio Playback */}
        {memory.audioUri && (
          <TouchableOpacity
            style={styles.audioButton}
            onPress={isPlaying ? stopAmbientSound : playAmbientSound}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isPlaying ? [colors.accent, colors.primary] : [colors.primary, colors.accent]}
              style={styles.audioGradient}
            >
              <Ionicons name={isPlaying ? 'pause' : 'volume-high'} size={28} color="#FFF" />
              <Text style={styles.audioButtonText}>
                {isPlaying ? 'Stop Ambient Sounds' : 'Play Ambient Sounds'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>How well did this trigger your scent memory?</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(star => {
              const isFullStar = rating >= star;
              const isHalfStar = rating === star - 0.5;

              return (
                <View key={star} style={styles.starContainer}>
                  <TouchableOpacity
                    style={styles.starButton}
                    onPress={() => handleRating(star)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isFullStar ? 'star' : isHalfStar ? 'star-half' : 'star-outline'}
                      size={40}
                      color={isFullStar || isHalfStar ? '#FFD700' : colors.textLight}
                    />
                  </TouchableOpacity>
                  {/* Half star button overlay (invisible, positioned on left half) */}
                  {star > 1 && (
                    <TouchableOpacity
                      style={styles.halfStarButton}
                      onPress={() => handleRating(star - 0.5)}
                      activeOpacity={0.7}
                    />
                  )}
                </View>
              );
            })}
          </View>
          {rating && (
            <Text style={styles.ratingText}>
              {rating} {rating === 1 ? 'star' : 'stars'}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
    opacity: 0.4,
  },
  overlay: {
    position: 'absolute',
    width: width,
    height: height,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,59,48,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  date: {
    color: '#FFF',
    ...typography.body,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  photoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.large,
  },
  photo: {
    width: '100%',
    height: 350,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  descriptionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  ttsText: {
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  audioButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  audioGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  audioButtonText: {
    color: '#FFF',
    ...typography.body,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  ratingSection: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.medium,
  },
  ratingTitle: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  starContainer: {
    position: 'relative',
  },
  starButton: {
    padding: spacing.xs,
  },
  halfStarButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 1,
  },
  ratingText: {
    color: colors.text,
    ...typography.small,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  loadingText: {
    color: '#FFF',
    textAlign: 'center',
    marginTop: 100,
  },
});
