import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { config } from '../config';

// Initialize ElevenLabs client
const client = new ElevenLabsClient({
  apiKey: config.ELEVENLABS_API_KEY,
});

/**
 * Generate speech from text using ElevenLabs
 * @param {string} text - The text to convert to speech
 * @returns {Promise<Sound>} - Expo Audio Sound object
 */
export async function speakWithElevenLabs(text) {
  try {
    // Generate audio stream from ElevenLabs
    const audio = await client.textToSpeech.convert({
      voice_id: config.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Rachel voice
      model_id: 'eleven_monolingual_v1',
      text: text,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true,
      },
    });

    // Convert the stream to array buffer
    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }

    // Combine chunks into single buffer
    const audioBuffer = Buffer.concat(chunks);

    // Save to temporary file
    const fileUri = FileSystem.cacheDirectory + 'temp_speech.mp3';
    await FileSystem.writeAsStringAsync(fileUri, audioBuffer.toString('base64'), {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Load and play audio
    const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });

    return sound;
  } catch (error) {
    console.error('Error with ElevenLabs TTS:', error);
    throw error;
  }
}

/**
 * Check if ElevenLabs is configured
 * @returns {boolean}
 */
export function isElevenLabsConfigured() {
  return config.ELEVENLABS_API_KEY && config.ELEVENLABS_API_KEY !== 'your-elevenlabs-api-key-here';
}
