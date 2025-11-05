import * as FileSystem from 'expo-file-system';

/**
 * Copy an image from temporary location to permanent storage
 * @param {string} tempUri - Temporary URI from camera or image picker
 * @returns {Promise<string>} - Permanent URI in app's document directory
 */
export async function saveImagePermanently(tempUri) {
  try {
    // Create a unique filename
    const filename = `photo_${Date.now()}.jpg`;
    const permanentUri = `${FileSystem.documentDirectory}${filename}`;

    // Copy the file from temp location to permanent storage
    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentUri,
    });

    console.log('Image saved permanently:', permanentUri);
    return permanentUri;
  } catch (error) {
    console.error('Error saving image permanently:', error);
    throw error;
  }
}

/**
 * Delete an image from permanent storage
 * @param {string} uri - URI of the image to delete
 */
export async function deleteImage(uri) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri);
      console.log('Image deleted:', uri);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}
