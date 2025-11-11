import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { saveMemory } from '../services/storageService';
import { saveImagePermanently } from '../services/fileService';

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

export default function DescriptionEditScreen({ route, navigation }) {
  const { photoUri, audioUri, scentDescription } = route.params;

  const [description, setDescription] = useState(scentDescription);
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [commonTags, setCommonTags] = useState(DEFAULT_COMMON_TAGS);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadCommonTags();
  }, []);

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

  const saveCommonTags = async tags => {
    try {
      await AsyncStorage.setItem(COMMON_TAGS_KEY, JSON.stringify(tags));
    } catch (error) {
      console.error('Error saving common tags:', error);
    }
  };

  const toggleTag = tag => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const deleteCommonTag = tagToDelete => {
    Alert.alert(
      'Delete Common Tag',
      `Remove "${tagToDelete}" from common tags? It will also be removed from your selection.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const newCommonTags = commonTags.filter(tag => tag !== tagToDelete);
            setCommonTags(newCommonTags);
            setSelectedTags(selectedTags.filter(tag => tag !== tagToDelete));
            await saveCommonTags(newCommonTags);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const addToCommonTags = tag => {
    if (commonTags.includes(tag)) {
      Alert.alert('Already Exists', 'This tag is already in common tags');
      return;
    }

    Alert.alert(
      'Add to Common Tags',
      `Add "${tag}" to common tags? It will be available for future memories.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const newCommonTags = [...commonTags, tag];
            setCommonTags(newCommonTags);
            await saveCommonTags(newCommonTags);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const addCustomTag = () => {
    const trimmedTag = customTagInput.trim();

    if (!trimmedTag) {
      return;
    }

    if (selectedTags.includes(trimmedTag)) {
      Alert.alert('Duplicate Tag', 'This tag is already added');
      return;
    }

    if (trimmedTag.length > 20) {
      Alert.alert('Tag Too Long', 'Tags should be 20 characters or less');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTags(prev => [...prev, trimmedTag]);
    setCustomTagInput('');
  };

  const removeCustomTag = tag => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please add a scent description');
      return;
    }

    setIsSaving(true);

    try {
      // Save image to permanent storage
      const permanentPhotoUri = await saveImagePermanently(photoUri);

      await saveMemory({
        photoUri: permanentPhotoUri,
        audioUri,
        scentDescription: description,
        tags: selectedTags,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate back to home
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error saving memory:', error);
      Alert.alert('Error', 'Failed to save memory');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Describe Your Memory</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Photo Preview */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: photoUri }} style={styles.photo} />
          {audioUri && (
            <View style={styles.audioIndicator}>
              <Ionicons name="volume-medium" size={16} color="#FFF" />
              <Text style={styles.audioText}>Audio Included</Text>
            </View>
          )}
        </View>

        {/* AI Generated Label */}
        <View style={styles.aiLabel}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={styles.aiLabelText}>AI-Generated Description</Text>
        </View>

        {/* Description Input */}
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the aromas and scents..."
          placeholderTextColor={colors.textLight}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={styles.hint}>
          Feel free to personalize this description to match your memory!
        </Text>

        {/* Tags Section */}
        <Text style={styles.sectionTitle}>Add Tags (Optional)</Text>

        {/* Common Tags */}
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Common Tags</Text>
          <TouchableOpacity onPress={toggleEditMode} style={styles.manageButton}>
            <Ionicons
              name={editMode ? 'checkmark-circle' : 'settings-outline'}
              size={20}
              color={editMode ? colors.primary : colors.text}
            />
            <Text style={[styles.manageButtonText, editMode && styles.manageButtonTextActive]}>
              {editMode ? 'Done' : 'Manage'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tagsContainer}>
          {commonTags.map(tag => (
            <View key={tag} style={styles.tagWrapper}>
              <TouchableOpacity
                style={[styles.tag, selectedTags.includes(tag) && !editMode && styles.tagSelected]}
                onPress={() => !editMode && toggleTag(tag)}
                disabled={editMode}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tagText,
                    selectedTags.includes(tag) && !editMode && styles.tagTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
              {editMode && (
                <TouchableOpacity
                  style={styles.deleteCommonTagButton}
                  onPress={() => deleteCommonTag(tag)}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Custom Tag Input */}
        <Text style={styles.subsectionTitle}>Create Custom Tag</Text>
        <View style={styles.customTagInputContainer}>
          <TextInput
            style={styles.customTagInput}
            value={customTagInput}
            onChangeText={setCustomTagInput}
            placeholder="e.g., Grandma's Recipe, Spicy, Birthday..."
            placeholderTextColor={colors.textLight}
            maxLength={20}
            returnKeyType="done"
            onSubmitEditing={addCustomTag}
          />
          <TouchableOpacity
            style={[styles.addTagButton, !customTagInput.trim() && styles.addTagButtonDisabled]}
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
        <Text style={styles.tagHint}>Press + to add your custom tag</Text>

        {/* Selected Custom Tags */}
        {selectedTags.filter(tag => !commonTags.includes(tag)).length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Your Custom Tags</Text>
            <View style={styles.tagsContainer}>
              {selectedTags
                .filter(tag => !commonTags.includes(tag))
                .map(tag => (
                  <View key={tag} style={styles.customTagWrapper}>
                    <View style={[styles.tag, styles.customTag]}>
                      <Text style={[styles.tagText, styles.customTagText]}>{tag}</Text>
                      <View style={styles.customTagActions}>
                        <TouchableOpacity
                          onPress={() => addToCommonTags(tag)}
                          style={styles.addToCommonButton}
                        >
                          <Ionicons name="star" size={16} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeCustomTag(tag)}
                          style={styles.removeTagButton}
                        >
                          <Ionicons name="close-circle" size={16} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
            </View>
            <Text style={styles.tagHint}>⭐ Tap star to add to common tags • ✕ Tap to remove</Text>
          </>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <LinearGradient colors={[colors.primary, colors.accent]} style={styles.saveGradient}>
            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save Memory'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  photoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  photo: {
    width: '100%',
    height: 250,
    backgroundColor: colors.cardBg,
  },
  audioIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  audioText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  aiLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  aiLabelText: {
    color: colors.primary,
    fontSize: 14,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    minHeight: 120,
    ...shadows.small,
  },
  hint: {
    ...typography.small,
    color: colors.textLight,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subsectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  subsectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  manageButtonText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  manageButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  tagWrapper: {
    position: 'relative',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.textLight,
  },
  deleteCommonTagButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  tagSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    ...typography.small,
    color: colors.text,
  },
  tagTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  customTagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: colors.cardBg,
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
  tagHint: {
    ...typography.small,
    color: colors.textLight,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  customTagWrapper: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  customTag: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.xs,
  },
  customTagText: {
    color: '#FFF',
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  customTagActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  addToCommonButton: {
    marginRight: spacing.xs,
  },
  removeTagButton: {
    marginLeft: spacing.xs,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.medium,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  saveText: {
    color: '#FFF',
    ...typography.body,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
