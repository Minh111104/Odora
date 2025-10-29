import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { config } from '../config';

/**
 * Generate speech from text using ElevenLabs REST API
 * @param {string} text - The text to convert to speech
 * @returns {Promise<Sound>} - Expo Audio Sound object
 */
export async function speakWithElevenLabs(text) {
  try {
    const voiceId = config.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

    // Call ElevenLabs API directly using fetch
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': config.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Get audio data as base64
    const audioBlob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result.split(',')[1];

          // Save to temporary file
          const fileUri = FileSystem.cacheDirectory + 'temp_speech.mp3';
          await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
            encoding: 'base64',
          });

          // Load and play audio
          const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });

          resolve(sound);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
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
