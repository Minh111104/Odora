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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { getMemoryById, rateMemory, deleteMemory, updateMemory } from '../services/storageService';
import { speakWithElevenLabs, isElevenLabsConfigured } from '../services/ttsService';

const DEFAULT_COMMON_TAGS = [
  'Breakfast',
  "Mom's Cooking",
  'Dinner',
  'Holidays',
  'Street Food',
  'Dessert',
  'Home',
  'Comfort Food',
];

const COMMON_TAGS_KEY = '@odora_common_tags';

const { width, height } = Dimensions.get('window');

export default function PlaybackScreen({ route, navigation }) {
  const { memoryId } = route.params;

  const [memory, setMemory] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSound, setTtsSound] = useState(null);
  const [rating, setRating] = useState(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTags, setEditingTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [commonTags, setCommonTags] = useState(DEFAULT_COMMON_TAGS);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadMemory();
    loadCommonTags();

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
      if (ttsSound) {
        ttsSound.unloadAsync();
      }
      Speech.stop();
    };
  }, []);

  const loadMemory = async () => {
    const data = await getMemoryById(memoryId);
    setMemory(data);
    setRating(data?.reminderRating);
  };

  const loadCommonTags = async () => {
    try {
      const stored = await AsyncStorage.getItem(COMMON_TAGS_KEY);
      if (stored) {
        setCommonTags(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading common tags:', error);
    }
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
      // Stop if already speaking
      if (isSpeaking) {
        if (ttsSound) {
          await ttsSound.stopAsync();
          await ttsSound.unloadAsync();
          setTtsSound(null);
        }
        Speech.stop();
        setIsSpeaking(false);
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const description = memory?.customDescription || memory?.scentDescription;

      // Use ElevenLabs if configured, otherwise fallback to expo-speech
      if (isElevenLabsConfigured()) {
        try {
          setIsSpeaking(true);
          const sound = await speakWithElevenLabs(description);
          setTtsSound(sound);

          // Set up playback status listener
          sound.setOnPlaybackStatusUpdate(status => {
            if (status.didJustFinish) {
              setIsSpeaking(false);
              setTtsSound(null);
            }
          });
        } catch (error) {
          console.error('ElevenLabs TTS failed, falling back to expo-speech:', error);
          // Fallback to expo-speech
          useFallbackTTS(description);
        }
      } else {
        // Use expo-speech if ElevenLabs is not configured
        useFallbackTTS(description);
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      setIsSpeaking(false);
    }
  };

  const useFallbackTTS = description => {
    Speech.speak(description, {
      language: 'en',
      pitch: 1.0,
      rate: 0.85, // Slightly slower for a calming effect
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
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

  const openTagEditor = () => {
    setEditingTags(memory.tags || []);
    setShowTagModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleTag = tag => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const addCustomTag = () => {
    const trimmedTag = customTagInput.trim();

    if (!trimmedTag) {
      return;
    }

    if (editingTags.includes(trimmedTag)) {
      Alert.alert('Duplicate Tag', 'This tag is already added');
      return;
    }

    if (trimmedTag.length > 20) {
      Alert.alert('Tag Too Long', 'Tags should be 20 characters or less');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingTags(prev => [...prev, trimmedTag]);
    setCustomTagInput('');
  };

  const removeCustomTag = tag => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTags(prev => prev.filter(t => t !== tag));
  };

  const saveTags = async () => {
    try {
      await updateMemory(memoryId, { tags: editingTags });
      setMemory({ ...memory, tags: editingTags });
      setShowTagModal(false);
      setCustomTagInput('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error updating tags:', error);
      Alert.alert('Error', 'Failed to update tags');
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
        <View style={styles.tagsSection}>
          <View style={styles.tagsSectionHeader}>
            <Text style={styles.tagsSectionTitle}>Tags</Text>
            <TouchableOpacity onPress={openTagEditor} style={styles.editTagsButton}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.editTagsText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {memory.tags && memory.tags.length > 0 ? (
            <View style={styles.tagsContainer}>
              {memory.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noTagsText}>No tags added yet</Text>
          )}
        </View>

        {/* Description Card */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>Scent Memory</Text>
          <Text style={styles.description}>{description}</Text>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            {/* TTS Button */}
            <TouchableOpacity
              style={styles.ttsButton}
              onPress={speakDescription}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSpeaking ? 'stop-circle' : 'play-circle'}
                size={24}
                color={colors.primary}
              />
              <Text style={styles.ttsText}>{isSpeaking ? 'Stop' : 'Read Aloud'}</Text>
            </TouchableOpacity>

            {/* 3D View Button */}
            <TouchableOpacity
              style={styles.arButton}
              onPress={() =>
                navigation.navigate('ARView', {
                  photoUri: memory.photoUri,
                  scentDescription: description,
                })
              }
              activeOpacity={0.7}
            >
              <Ionicons name="cube-outline" size={24} color={colors.accent} />
              <Text style={styles.arText}>3D View</Text>
            </TouchableOpacity>
          </View>
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

      {/* Tag Editor Modal */}
      <Modal
        visible={showTagModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTagModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTagModal(false)}
          />
          <View style={styles.modalContent}>
            <BlurView intensity={100} tint="light" style={styles.modalBlur}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Tags</Text>
                <TouchableOpacity onPress={() => setShowTagModal(false)}>
                  <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Common Tags */}
                <Text style={styles.modalSectionTitle}>Common Tags</Text>
                <Text style={styles.modalHint}>Tap to add or remove tags</Text>
                <View style={styles.modalTagsContainer}>
                  {commonTags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.modalTag,
                        editingTags.includes(tag) && styles.modalTagSelected,
                      ]}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalTagText,
                          editingTags.includes(tag) && styles.modalTagTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                      {editingTags.includes(tag) && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#FFF"
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Tag Input */}
                <Text style={styles.modalSectionTitle}>Create Custom Tag</Text>
                <View style={styles.customTagInputContainer}>
                  <TextInput
                    style={styles.customTagInput}
                    value={customTagInput}
                    onChangeText={setCustomTagInput}
                    placeholder="e.g., Grandma's Recipe, Spicy..."
                    placeholderTextColor={colors.textLight}
                    maxLength={20}
                    returnKeyType="done"
                    onSubmitEditing={addCustomTag}
                  />
                  <TouchableOpacity
                    style={[
                      styles.addTagButton,
                      !customTagInput.trim() && styles.addTagButtonDisabled,
                    ]}
                    onPress={addCustomTag}
                    disabled={!customTagInput.trim()}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="add-circle"
                      size={32}
                      color={customTagInput.trim() ? colors.primary : colors.textLight}
                    />
                  </TouchableOpacity>
                </View>

                {/* Selected Custom Tags */}
                {editingTags.filter(tag => !commonTags.includes(tag)).length > 0 && (
                  <>
                    <Text style={styles.modalSectionTitle}>Your Custom Tags</Text>
                    <View style={styles.modalTagsContainer}>
                      {editingTags
                        .filter(tag => !commonTags.includes(tag))
                        .map(tag => (
                          <View key={tag} style={[styles.modalTag, styles.modalCustomTag]}>
                            <Text style={[styles.modalTagText, styles.modalCustomTagText]}>
                              {tag}
                            </Text>
                            <TouchableOpacity
                              onPress={() => removeCustomTag(tag)}
                              style={styles.removeTagButton}
                            >
                              <Ionicons name="close-circle" size={18} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                    </View>
                  </>
                )}
              </ScrollView>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveTagsButton}
                onPress={saveTags}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  style={styles.saveTagsGradient}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                  <Text style={styles.saveTagsText}>Save Tags</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  tagsSection: {
    marginBottom: spacing.lg,
  },
  tagsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tagsSectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editTagsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  editTagsText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  noTagsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontStyle: 'italic',
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
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ttsButton: {
    flex: 1,
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
  arButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  arText: {
    color: colors.accent,
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
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalBlur: {
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },
  modalScroll: {
    maxHeight: 450,
  },
  modalSectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  modalHint: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  modalTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  modalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.textLight,
  },
  modalTagSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalTagText: {
    ...typography.small,
    color: colors.text,
  },
  modalTagTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  customTagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    marginRight: spacing.sm,
    ...shadows.small,
  },
  addTagButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagButtonDisabled: {
    opacity: 0.3,
  },
  modalCustomTag: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.xs,
  },
  modalCustomTagText: {
    color: '#FFF',
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  removeTagButton: {
    marginLeft: spacing.xs,
  },
  saveTagsButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: spacing.md,
    ...shadows.medium,
  },
  saveTagsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  saveTagsText: {
    color: '#FFF',
    ...typography.body,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
