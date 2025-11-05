import React, { useState } from 'react';
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
import { colors, spacing, typography, shadows } from '../constants/theme';
import { saveMemory } from '../services/storageService';
import { saveImagePermanently } from '../services/fileService';

const COMMON_TAGS = [
  'Breakfast',
  "Mom's Cooking",
  'Dinner',
  'Holidays',
  'Street Food',
  'Dessert',
  'Home',
  'Comfort Food',
];

export default function DescriptionEditScreen({ route, navigation }) {
  const { photoUri, audioUri, scentDescription } = route.params;

  const [description, setDescription] = useState(scentDescription);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleTag = tag => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
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
        <View style={styles.tagsContainer}>
          {COMMON_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
              onPress={() => toggleTag(tag)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.textLight,
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
