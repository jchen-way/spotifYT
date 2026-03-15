import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getRecentSongs, getTopRatedSongs } from '../database/db';
import { palette, shadows } from '../theme';

const formatBadge = (song) => {
  if (song?.preferredFormat) {
    return song.preferredFormat.toUpperCase();
  }
  if (song?.local_path_mp4) {
    return 'MP4';
  }
  return 'MP3';
};

const renderStars = (rating) => '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);

export default function HomeScreen({ currentSong, onSelectSong, refreshToken }) {
  const insets = useSafeAreaInsets();
  const [recentSongs, setRecentSongs] = useState([]);
  const [topRatedSongs, setTopRatedSongs] = useState([]);

  useEffect(() => {
    getRecentSongs().then(setRecentSongs).catch(console.error);
    getTopRatedSongs().then(setTopRatedSongs).catch(console.error);
  }, [refreshToken]);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} style={styles.container}>
      <View style={styles.skyBackdrop}>
        <View style={styles.skyCloud} />
        <View style={styles.skyCloudSmall} />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroVideoWrap}>
          <ExpoImage
            source={require('../../assets/video_transparent_bg_1.gif')}
            style={styles.heroVideo}
            contentFit="contain"
            contentPosition="center"
            transition={0}
          />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>Seaside archive</Text>
          <Text style={styles.heroTitle}>A vinyl cat watches over the shelf while your offline collection slowly grows.</Text>
          <Text style={styles.heroBody}>
            Save tracks from YouTube, sort them by mood, and come back to them when the room is quiet.
          </Text>
        </View>
      </View>

      <View style={styles.glassCard}>
        <Text style={styles.sectionLabel}>Now resting on the turntable</Text>
        <Text style={styles.nowPlayingTitle}>{currentSong?.title || 'Nothing queued just yet'}</Text>
        <Text style={styles.nowPlayingMeta}>
          {currentSong ? `${currentSong.genre || 'Search'} • ${formatBadge(currentSong)}` : 'Search, download, then tap a format chip in Collection to start playback.'}
        </Text>
      </View>

      <View style={styles.dualHeader}>
        <Text style={styles.sectionTitle}>Recent tides</Text>
        <Text style={styles.sectionCaption}>freshly saved</Text>
      </View>

      {recentSongs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No offline tracks yet</Text>
          <Text style={styles.emptyText}>Once you save songs from Search, this space will feel more alive.</Text>
        </View>
      ) : (
        recentSongs.map((song) => (
          <TouchableOpacity key={song.id} onPress={() => onSelectSong?.(song)} style={styles.songRow}>
            {song.artwork_url ? (
              <Image source={{ uri: song.artwork_url }} style={styles.songArtwork} />
            ) : (
              <View style={styles.songArtworkFallback} />
            )}
            <View style={styles.songInfo}>
              <Text numberOfLines={1} style={styles.songTitle}>
                {song.title}
              </Text>
              <Text style={styles.songMeta}>{song.genre || 'Search'} • {formatBadge(song)}</Text>
            </View>
            <View style={styles.playPill}>
              <Text style={styles.playPillText}>Play</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <View style={styles.dualHeader}>
        <Text style={styles.sectionTitle}>Sunlit favorites</Text>
        <Text style={styles.sectionCaption}>highest ranked</Text>
      </View>

      {topRatedSongs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Rate tracks in Collection and they will bloom here.</Text>
        </View>
      ) : (
        topRatedSongs.map((song) => (
          <TouchableOpacity key={`rated-${song.id}`} onPress={() => onSelectSong?.(song)} style={styles.rankRow}>
            <View style={styles.rankOrb}>
              <Text style={styles.rankOrbText}>{song.rating}</Text>
            </View>
            <View style={styles.songInfo}>
              <Text numberOfLines={1} style={styles.songTitle}>
                {song.title}
              </Text>
              <Text style={styles.songMeta}>{renderStars(song.rating)}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: palette.sand, flex: 1 },
  content: { paddingBottom: 30 },
  skyBackdrop: {
    backgroundColor: palette.sky,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    height: 240,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  skyCloud: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 120,
    height: 120,
    position: 'absolute',
    right: -10,
    top: 16,
    width: 220,
  },
  skyCloudSmall: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 90,
    height: 80,
    left: -12,
    position: 'absolute',
    top: 90,
    width: 150,
  },
  heroCard: {
    ...shadows.card,
    backgroundColor: palette.white,
    borderRadius: 32,
    marginHorizontal: 18,
    marginTop: 12,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  heroVideoWrap: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    height: 334,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    paddingTop: 0,
  },
  heroVideo: {
    height: 340,
    marginLeft: 24,
    marginTop: -6,
    width: '118%',
  },
  heroCopy: { paddingHorizontal: 20, paddingTop: 4 },
  eyebrow: {
    color: palette.teal,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  heroTitle: { color: palette.ink, fontSize: 28, fontWeight: '800', lineHeight: 34, marginBottom: 10 },
  heroBody: { color: palette.dusk, fontSize: 15, lineHeight: 22 },
  glassCard: {
    ...shadows.soft,
    backgroundColor: 'rgba(255, 249, 241, 0.92)',
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 28,
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 18,
    padding: 20,
  },
  sectionLabel: {
    color: palette.teal,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  nowPlayingTitle: { color: palette.deepTeal, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  nowPlayingMeta: { color: palette.dusk, fontSize: 15, lineHeight: 22 },
  dualHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginHorizontal: 18,
    marginTop: 24,
  },
  sectionTitle: { color: palette.ink, fontSize: 24, fontWeight: '800' },
  sectionCaption: { color: palette.teal, fontSize: 13, fontStyle: 'italic' },
  emptyCard: {
    ...shadows.soft,
    backgroundColor: palette.shell,
    borderRadius: 24,
    marginHorizontal: 18,
    padding: 20,
  },
  emptyTitle: { color: palette.ink, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: palette.dusk, fontSize: 14, lineHeight: 21 },
  songRow: {
    ...shadows.soft,
    alignItems: 'center',
    backgroundColor: palette.shell,
    borderRadius: 24,
    flexDirection: 'row',
    marginBottom: 12,
    marginHorizontal: 18,
    padding: 12,
  },
  songArtwork: { borderRadius: 18, height: 66, width: 66 },
  songArtworkFallback: { backgroundColor: palette.foam, borderRadius: 18, height: 66, width: 66 },
  songInfo: { flex: 1, marginHorizontal: 14 },
  songTitle: { color: palette.ink, fontSize: 16, fontWeight: '700', marginBottom: 5 },
  songMeta: { color: palette.dusk, fontSize: 13, lineHeight: 18 },
  playPill: {
    backgroundColor: palette.peach,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  playPillText: { color: palette.cocoa, fontSize: 12, fontWeight: '800' },
  rankRow: {
    ...shadows.soft,
    alignItems: 'center',
    backgroundColor: palette.shell,
    borderRadius: 24,
    flexDirection: 'row',
    marginBottom: 12,
    marginHorizontal: 18,
    padding: 14,
  },
  rankOrb: {
    alignItems: 'center',
    backgroundColor: palette.rose,
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  rankOrbText: { color: palette.cocoa, fontSize: 16, fontWeight: '800' },
});
