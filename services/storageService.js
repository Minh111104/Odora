import AsyncStorage from '@react-native-async-storage/async-storage';

const MEMORIES_KEY = '@odora_memories';

/**
 * Memory object structure:
 * {
 *   id: string,
 *   photoUri: string,
 *   audioUri: string | null,
 *   scentDescription: string,
 *   customDescription: string | null,
 *   tags: string[],
 *   timestamp: number,
 *   familyVoices: Array<{ name: string, audioUri: string }>,
 *   reminderRating: number | null (1-5 scale)
 * }
 */

/**
 * Save a new memory
 */
export async function saveMemory(memory) {
  try {
    const memories = await getAllMemories();
    const newMemory = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      familyVoices: [],
      reminderRating: null,
      tags: [],
      ...memory,
    };

    memories.unshift(newMemory); // Add to beginning
    await AsyncStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
    return newMemory;
  } catch (error) {
    console.error('Error saving memory:', error);
    throw error;
  }
}

/**
 * Get all memories
 */
export async function getAllMemories() {
  try {
    const memoriesJson = await AsyncStorage.getItem(MEMORIES_KEY);
    return memoriesJson ? JSON.parse(memoriesJson) : [];
  } catch (error) {
    console.error('Error getting memories:', error);
    return [];
  }
}

/**
 * Get a specific memory by ID
 */
export async function getMemoryById(id) {
  try {
    const memories = await getAllMemories();
    return memories.find(m => m.id === id);
  } catch (error) {
    console.error('Error getting memory:', error);
    return null;
  }
}

/**
 * Update an existing memory
 */
export async function updateMemory(id, updates) {
  try {
    const memories = await getAllMemories();
    const index = memories.findIndex(m => m.id === id);

    if (index !== -1) {
      memories[index] = { ...memories[index], ...updates };
      await AsyncStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
      return memories[index];
    }

    throw new Error('Memory not found');
  } catch (error) {
    console.error('Error updating memory:', error);
    throw error;
  }
}

/**
 * Delete a memory
 */
export async function deleteMemory(id) {
  try {
    const memories = await getAllMemories();
    const filtered = memories.filter(m => m.id !== id);
    await AsyncStorage.setItem(MEMORIES_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting memory:', error);
    throw error;
  }
}

/**
 * Add a family voice to a memory
 */
export async function addFamilyVoice(memoryId, name, audioUri) {
  try {
    const memory = await getMemoryById(memoryId);
    if (!memory) throw new Error('Memory not found');

    const familyVoices = memory.familyVoices || [];
    familyVoices.push({ name, audioUri, timestamp: Date.now() });

    return await updateMemory(memoryId, { familyVoices });
  } catch (error) {
    console.error('Error adding family voice:', error);
    throw error;
  }
}

/**
 * Rate how well a memory triggered scent recall
 */
export async function rateMemory(memoryId, rating) {
  try {
    return await updateMemory(memoryId, { reminderRating: rating });
  } catch (error) {
    console.error('Error rating memory:', error);
    throw error;
  }
}

/**
 * Search memories by tag
 */
export async function getMemoriesByTag(tag) {
  try {
    const memories = await getAllMemories();
    return memories.filter(m => m.tags && m.tags.includes(tag));
  } catch (error) {
    console.error('Error searching memories:', error);
    return [];
  }
}
