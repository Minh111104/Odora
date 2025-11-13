import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { getAllMemories } from '../services/storageService';

export default function SettingsScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalMemories: 0,
    totalRituals: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalBadges: 0,
    totalTags: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get memories count
      const memories = await getAllMemories();
      const totalMemories = memories.length;

      // Get unique tags count
      const tagsSet = new Set();
      memories.forEach(memory => {
        if (memory.tags) {
          memory.tags.forEach(tag => tagsSet.add(tag));
        }
      });

      // Get gamification stats
      const rituals = await AsyncStorage.getItem('total_rituals');
      const streak = await AsyncStorage.getItem('ritual_streak');
      const badgesData = await AsyncStorage.getItem('earned_badges');
      const longestStreakData = await AsyncStorage.getItem('longest_streak');

      const badges = badgesData ? JSON.parse(badgesData) : [];
      const currentStreak = streak ? parseInt(streak) : 0;
      const longestStreak = longestStreakData ? parseInt(longestStreakData) : currentStreak;

      // Update longest streak if current is higher
      if (currentStreak > longestStreak) {
        await AsyncStorage.setItem('longest_streak', currentStreak.toString());
      }

      setStats({
        totalMemories,
        totalRituals: rituals ? parseInt(rituals) : 0,
        currentStreak,
        longestStreak: Math.max(currentStreak, longestStreak),
        totalBadges: badges.length,
        totalTags: tagsSet.size,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all memories, rituals, badges, and settings? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

              // Clear all AsyncStorage data
              await AsyncStorage.multiRemove([
                '@odora_memories',
                'ritual_streak',
                'total_rituals',
                'earned_badges',
                'last_ritual_date',
                'longest_streak',
                '@odora_common_tags',
              ]);

              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'All data has been cleared', [
                {
                  text: 'OK',
                  onPress: () => {
                    loadStats();
                    navigation.navigate('Home');
                  },
                },
              ]);
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleClearMemories = () => {
    Alert.alert(
      'Clear Memories',
      'Delete all saved food memories? Gamification stats will be preserved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Memories',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await AsyncStorage.removeItem('@odora_memories');
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'All memories have been cleared');
              loadStats();
            } catch (error) {
              console.error('Error clearing memories:', error);
              Alert.alert('Error', 'Failed to clear memories');
            }
          },
        },
      ]
    );
  };

  const handleResetGamification = () => {
    Alert.alert(
      'Reset Gamification',
      'Reset streaks, rituals count, and badges? Your memories will be preserved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await AsyncStorage.multiRemove([
                'ritual_streak',
                'total_rituals',
                'earned_badges',
                'last_ritual_date',
                'longest_streak',
              ]);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Gamification data has been reset');
              loadStats();
            } catch (error) {
              console.error('Error resetting gamification:', error);
              Alert.alert('Error', 'Failed to reset gamification');
            }
          },
        },
      ]
    );
  };

  const StatCard = ({ icon, label, value, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#FFF" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <BlurView intensity={80} tint="light" style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 28 }} />
      </BlurView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="restaurant"
              label="Total Memories"
              value={stats.totalMemories}
              color={colors.primary}
            />
            <StatCard
              icon="flame"
              label="Current Streak"
              value={`${stats.currentStreak} days`}
              color="#FF6B6B"
            />
            <StatCard
              icon="trophy"
              label="Total Rituals"
              value={stats.totalRituals}
              color="#4ECDC4"
            />
            <StatCard icon="star" label="Badges Earned" value={stats.totalBadges} color="#FFD93D" />
            <StatCard
              icon="ribbon"
              label="Longest Streak"
              value={`${stats.longestStreak} days`}
              color="#A8E6CF"
            />
            <StatCard icon="pricetag" label="Unique Tags" value={stats.totalTags} color="#AA96DA" />
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          {/* Clear Memories */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearMemories}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#FFB347' }]}>
                  <Ionicons name="images-outline" size={20} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.actionButtonTitle}>Clear Memories</Text>
                  <Text style={styles.actionButtonSubtitle}>Delete all saved food memories</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          {/* Reset Gamification */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleResetGamification}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#6C5CE7' }]}>
                  <Ionicons name="trophy-outline" size={20} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.actionButtonTitle}>Reset Gamification</Text>
                  <Text style={styles.actionButtonSubtitle}>
                    Reset streaks, rituals, and badges
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          {/* Clear All Data */}
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleClearAllData}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#FF3B30' }]}>
                  <Ionicons name="trash-outline" size={20} color="#FFF" />
                </View>
                <View>
                  <Text style={[styles.actionButtonTitle, styles.dangerText]}>Clear All Data</Text>
                  <Text style={styles.actionButtonSubtitle}>Delete everything permanently</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF3B30" />
            </View>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.appName}>Odora</Text>
            <Text style={styles.appTagline}>Your Scent Memory Journal</Text>
            <Text style={styles.appDescription}>
              Preserve precious food memories and connect with home through the power of scent and
              ritual.
            </Text>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...shadows.small,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.medium,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.small,
    color: colors.textLight,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  actionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionButtonTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    ...typography.small,
    color: colors.textLight,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  dangerText: {
    color: '#FF3B30',
  },
  aboutCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.medium,
  },
  appName: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  appTagline: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  appDescription: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  versionText: {
    ...typography.small,
    color: colors.textLight,
    fontStyle: 'italic',
  },
});
