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
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getAllMemories } from '../services/storageService';
import { colors, spacing, typography, shadows } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.lg * 3) / 2;

export default function HomeScreen({ navigation }) {
  const [memories, setMemories] = useState([]);
  const [filteredMemories, setFilteredMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadMemories();

    // Refresh memories when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadMemories();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    filterMemories();
  }, [memories, searchQuery, selectedTags]);

  const loadMemories = async () => {
    try {
      const data = await getAllMemories();
      setMemories(data);

      // Extract all unique tags
      const tags = new Set();
      data.forEach(memory => {
        if (memory.tags) {
          memory.tags.forEach(tag => tags.add(tag));
        }
      });
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error('Error loading memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMemories = () => {
    let filtered = [...memories];

    // Filter by search query (searches in tags, description, and custom description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(memory => {
        const matchesTags = memory.tags?.some(tag => tag.toLowerCase().includes(query));
        const matchesDescription = memory.scentDescription?.toLowerCase().includes(query);
        const matchesCustom = memory.customDescription?.toLowerCase().includes(query);
        return matchesTags || matchesDescription || matchesCustom;
      });
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(memory => {
        return selectedTags.every(tag => memory.tags?.includes(tag));
      });
    }

    setFilteredMemories(filtered);
  };

  const toggleTag = tag => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <BlurView intensity={80} tint="light" style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search memories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textLight}
          />
          {(searchQuery || selectedTags.length > 0) && (
            <TouchableOpacity onPress={clearFilters}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </BlurView>

        {/* Filter Toggle Button */}
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'filter' : 'filter-outline'}
            size={20}
            color={showFilters ? colors.primary : colors.text}
          />
          {selectedTags.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{selectedTags.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tag Filter Pills */}
      {showFilters && allTags.length > 0 && (
        <BlurView intensity={80} tint="light" style={styles.tagFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagScrollContent}
          >
            {allTags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagPill, selectedTags.includes(tag) && styles.tagPillActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagPillText,
                    selectedTags.includes(tag) && styles.tagPillTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </BlurView>
      )}

      {/* Results Count */}
      {(searchQuery || selectedTags.length > 0) && (
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>
            {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'} found
          </Text>
        </View>
      )}

      {/* Memories Grid */}
      {memories.length === 0 && !loading ? (
        renderEmptyState()
      ) : filteredMemories.length === 0 && (searchQuery || selectedTags.length > 0) ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={80} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Matches Found</Text>
          <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredMemories}
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    ...shadows.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  filterButtonActive: {
    backgroundColor: colors.background,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tagFilterContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...shadows.small,
  },
  tagScrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tagPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: spacing.xs,
  },
  tagPillActive: {
    backgroundColor: colors.primary,
  },
  tagPillText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  tagPillTextActive: {
    color: '#FFF',
  },
  resultsCount: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  resultsCountText: {
    fontSize: 14,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  clearButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
