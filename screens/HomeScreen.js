import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllMemories } from '../services/storageService';
import { colors, spacing, typography, shadows } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.lg * 3) / 2;

export default function HomeScreen({ navigation }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemories();

    // Refresh memories when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadMemories();
    });

    return unsubscribe;
  }, [navigation]);

  const loadMemories = async () => {
    try {
      const data = await getAllMemories();
      setMemories(data);
    } catch (error) {
      console.error('Error loading memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMemoryCard = ({ item }) => (
    <TouchableOpacity
      style={styles.memoryCard}
      onPress={() => navigation.navigate('Playback', { memoryId: item.id })}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.photoUri }} style={styles.memoryImage} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.gradient}>
        <Text style={styles.memoryDate}>
          {new Date(item.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        {item.reminderRating && (
          <View style={styles.ratingContainer}>
            {[...Array(5)].map((_, index) => {
              const starValue = index + 1;
              const rating = item.reminderRating || 0;

              if (rating >= starValue) {
                return <Ionicons key={index} name="star" size={12} color="#FFD700" />;
              } else if (rating >= starValue - 0.5) {
                return <Ionicons key={index} name="star-half" size={12} color="#FFD700" />;
              } else {
                return <Ionicons key={index} name="star-outline" size={12} color="#FFD700" />;
              }
            })}
          </View>
        )}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagContainer}>
            <Text style={styles.tag} numberOfLines={1}>
              {item.tags[0]}
            </Text>
          </View>
        )}
      </LinearGradient>
      {item.audioUri && (
        <View style={styles.audioIndicator}>
          <Ionicons name="volume-medium" size={16} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="restaurant-outline" size={80} color={colors.textLight} />
      <Text style={styles.emptyTitle}>No Memories Yet</Text>
      <Text style={styles.emptyText}>Start capturing your favorite food memories!</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Odora</Text>
        <Text style={styles.headerSubtitle}>Your Scent Memory Journal</Text>
      </View>

      {/* Memories Grid */}
      {memories.length === 0 && !loading ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={memories}
          renderItem={renderMemoryCard}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Memory Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Capture')}
        activeOpacity={0.8}
      >
        <LinearGradient colors={[colors.primary, colors.accent]} style={styles.fabGradient}>
          <Ionicons name="camera" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.primary,
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  grid: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  memoryCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    margin: spacing.sm,
    ...shadows.medium,
    backgroundColor: colors.cardBg,
  },
  memoryImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    justifyContent: 'flex-end',
  },
  memoryDate: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: 2,
  },
  tagContainer: {
    marginTop: spacing.xs,
  },
  tag: {
    color: '#FFF',
    fontSize: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  audioIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 64,
    height: 64,
    borderRadius: 32,
    ...shadows.large,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
