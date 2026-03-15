import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { upsertSong } from '../database/db';
import { palette, shadows } from '../theme';
import { downloadMedia, getBackendUrl, searchYouTube } from '../utils/api';

const inferGenre = (text) => {
  const value = text.toLowerCase();

  if (value.includes('lofi') || value.includes('study')) return 'Lofi';
  if (value.includes('jazz')) return 'Jazz';
  if (value.includes('house') || value.includes('edm') || value.includes('dance')) return 'Electronic';
  if (value.includes('hip hop') || value.includes('rap')) return 'Hip-Hop';
  if (value.includes('pop')) return 'Pop';
  if (value.includes('rock')) return 'Rock';
  if (value.includes('r&b') || value.includes('soul')) return 'R&B';
  if (value.includes('podcast') || value.includes('interview')) return 'Talk';
  if (value.includes('indie') || value.includes('folk')) return 'Indie';
  if (value.includes('classical') || value.includes('piano')) return 'Classical';
  if (value.includes('ambient') || value.includes('sleep')) return 'Ambient';
  if (value.includes('phonk')) return 'Phonk';
  if (value.includes('afrobeats')) return 'Afrobeats';

  const cleaned = text
    .split(/[|,-]/)[0]
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(' ');

  return cleaned ? cleaned.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Search';
};

export default function SearchScreen({ onSongDownloaded }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeDownloadId, setActiveDownloadId] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    try {
      const videos = await searchYouTube(query.trim());
      setResults(videos);
    } catch (_error) {
      Alert.alert(
        'Search failed',
        `Could not reach the backend at ${getBackendUrl()}. Check that EXPO_PUBLIC_BACKEND_URL points to a reachable local or hosted backend.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (item, format) => {
    setActiveDownloadId(`${item.videoId}-${format}`);
    try {
      const localUri = await downloadMedia(item.url, format, item.title);
      const song = await upsertSong({
        artworkUrl: item.thumbnail,
        genre: inferGenre(`${query} ${item.title}`),
        localPathMp3: format === 'mp3' ? localUri : null,
        localPathMp4: format === 'mp4' ? localUri : null,
        title: item.title,
        youtubeUrl: item.url,
      });

      onSongDownloaded?.(song);
      Alert.alert('Saved offline', `${item.title} was added to your collection.`);
    } catch (error) {
      Alert.alert('Download failed', error.message || 'The backend could not process this media.');
    } finally {
      setActiveDownloadId(null);
    }
  };

  const renderItem = ({ item, index }) => {
    const mp3Busy = activeDownloadId === `${item.videoId}-mp3`;
    const mp4Busy = activeDownloadId === `${item.videoId}-mp4`;

    return (
      <View style={[styles.card, index === 0 && styles.firstCard]}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        <View style={styles.cardOverlay} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.author}>{item.author?.name || 'Unknown creator'}</Text>
          <Text style={styles.meta}>
            {item.timestamp || 'Live'} • {item.views ? `${Math.round(item.views / 1000)}K views` : 'YouTube'}
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              disabled={Boolean(activeDownloadId)}
              onPress={() => handleDownload(item, 'mp3')}
              style={[styles.button, styles.primaryButton, mp3Busy && styles.disabledButton]}>
              <Text style={styles.primaryButtonText}>{mp3Busy ? 'Saving…' : 'Save MP3'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={Boolean(activeDownloadId)}
              onPress={() => handleDownload(item, 'mp4')}
              style={[styles.button, styles.secondaryButton, mp4Busy && styles.disabledButton]}>
              <Text style={styles.secondaryButtonText}>{mp4Busy ? 'Saving…' : 'Save MP4'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sunsetBackdrop} />
      <View style={styles.headerWrap}>
        <Text style={styles.header}>Discover</Text>
        <Text style={styles.subtitle}>Search YouTube and turn it into a soft offline shelf of audio and video.</Text>
      </View>

      <View style={styles.searchShell}>
        <TextInput
          style={styles.input}
          placeholder="Search lofi, playlists, lectures, ocean sets…"
          placeholderTextColor="#8A97A7"
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Go</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={palette.teal} size="large" style={styles.loading} />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={results}
          keyExtractor={(item) => item.videoId}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>A little quiet here</Text>
              <Text style={styles.emptyText}>
                Search for a track, mix, or video essay and it will appear in this breezy gallery.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: palette.sand, flex: 1, paddingTop: 66 },
  sunsetBackdrop: {
    backgroundColor: '#A9D4E9',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    height: 210,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  headerWrap: { marginHorizontal: 18, marginTop: 4 },
  header: { color: palette.deepTeal, fontSize: 36, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: palette.dusk, fontSize: 15, lineHeight: 22, maxWidth: '92%' },
  searchShell: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: 'rgba(255,249,241,0.96)',
    borderRadius: 26,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 18,
    padding: 10,
  },
  input: {
    backgroundColor: palette.foam,
    borderRadius: 18,
    color: palette.ink,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: palette.teal,
    borderRadius: 18,
    justifyContent: 'center',
    minWidth: 74,
    paddingVertical: 15,
  },
  searchButtonText: { color: palette.white, fontSize: 15, fontWeight: '800' },
  loading: { marginTop: 48 },
  listContent: { padding: 18, paddingTop: 16 },
  card: {
    ...shadows.card,
    backgroundColor: palette.white,
    borderRadius: 30,
    marginBottom: 18,
    overflow: 'hidden',
  },
  firstCard: {
    transform: [{ scale: 1.01 }],
  },
  thumbnail: { height: 210, width: '100%' },
  cardOverlay: {
    backgroundColor: 'rgba(39, 75, 87, 0.18)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  info: { padding: 18 },
  title: { color: palette.ink, fontSize: 18, fontWeight: '800', marginBottom: 7 },
  author: { color: palette.teal, fontSize: 14, fontWeight: '700', marginBottom: 5 },
  meta: { color: palette.dusk, fontSize: 13, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 10 },
  button: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    paddingVertical: 13,
  },
  primaryButton: { backgroundColor: palette.deepTeal },
  primaryButtonText: { color: palette.white, fontWeight: '800' },
  secondaryButton: { backgroundColor: palette.peach },
  secondaryButtonText: { color: palette.cocoa, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
  emptyState: {
    ...shadows.soft,
    alignItems: 'center',
    backgroundColor: palette.shell,
    borderRadius: 28,
    marginTop: 8,
    padding: 28,
  },
  emptyTitle: { color: palette.ink, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyText: { color: palette.dusk, fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
