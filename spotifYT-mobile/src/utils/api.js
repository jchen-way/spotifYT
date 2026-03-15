import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

const configuredBackendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  Constants.expoConfig?.extra?.backendUrl ||
  'http://localhost:3000';

const BACKEND_URL = configuredBackendUrl.replace(/\/$/, '');

export const getBackendUrl = () => BACKEND_URL;

export const searchYouTube = async (query) => {
  try {
    const response = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to fetch search results');
    return await response.json();
  } catch (error) {
    console.error('API Search Error:', error);
    throw error;
  }
};

export const downloadMedia = async (url, format, title) => {
  const safeTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'download';
  const extension = format === 'mp4' ? 'mp4' : 'mp3';
  const fileUri = `${FileSystem.documentDirectory}${safeTitle}_${Date.now()}.${extension}`;

  try {
    const downloadUrl = `${BACKEND_URL}/download?url=${encodeURIComponent(url)}&format=${format}`;
    const result = await FileSystem.downloadAsync(downloadUrl, fileUri);
    if (result.status && result.status >= 400) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      throw new Error(`Download failed with status ${result.status}`);
    }

    return result.uri;
  } catch (error) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
    console.error('API Download Error:', error);
    throw error;
  }
};
