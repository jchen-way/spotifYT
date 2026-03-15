import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Audio, ResizeMode, Video } from 'expo-av';

import VinylSpinner from '../components/VinylSpinner';
import { palette, shadows } from '../theme';
import { logListeningEvent } from '../utils/tracking';

const formatTime = (millis = 0) => {
  const totalSeconds = Math.max(0, Math.floor(millis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function PlayerScreen({ currentSong }) {
  const playbackRef = useRef(null);
  const videoRef = useRef(null);
  const loggedSecondsRef = useRef(0);
  const activeSongIdRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);

  const preferredFormat =
    currentSong?.preferredFormat || (currentSong?.local_path_mp3 ? 'mp3' : currentSong?.local_path_mp4 ? 'mp4' : null);
  const mediaUri =
    preferredFormat === 'mp4' ? currentSong?.local_path_mp4 : currentSong?.local_path_mp3 || currentSong?.local_path_mp4;
  const isVideoMode = preferredFormat === 'mp4' && Boolean(currentSong?.local_path_mp4);

  const handlePlaybackStatus = (status) => {
    if (!status.isLoaded) {
      return;
    }

    setIsPlaying(status.isPlaying);
    setPositionMillis(status.positionMillis ?? 0);
    setDurationMillis(status.durationMillis ?? 0);
    loggedSecondsRef.current = Math.max(
      loggedSecondsRef.current,
      Math.floor((status.positionMillis ?? 0) / 1000)
    );

    if (status.didJustFinish && activeSongIdRef.current) {
      logListeningEvent(activeSongIdRef.current, Math.floor((status.durationMillis ?? 0) / 1000));
      activeSongIdRef.current = null;
      loggedSecondsRef.current = 0;
    }
  };

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: true,
    }).catch(console.error);

    return () => {
      unloadAndTrack();
    };
  }, []);

  useEffect(() => {
    if (!currentSong || !mediaUri) {
      return undefined;
    }

    let cancelled = false;

    const loadCurrentSong = async () => {
      setIsLoading(true);
      await unloadAndTrack();

      if (isVideoMode) {
        activeSongIdRef.current = currentSong.id;
        loggedSecondsRef.current = 0;
        setPositionMillis(0);
        setDurationMillis(0);
        setIsPlaying(false);
        setIsLoading(false);
        return;
      }

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: mediaUri },
          { shouldPlay: true },
          handlePlaybackStatus
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        playbackRef.current = sound;
        activeSongIdRef.current = currentSong.id;
        loggedSecondsRef.current = 0;
      } catch (error) {
        console.error('Audio load error:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCurrentSong().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [currentSong, isVideoMode, mediaUri]);

  const unloadAndTrack = async () => {
    const playback = playbackRef.current;
    const video = videoRef.current;
    const listenedSeconds = loggedSecondsRef.current;
    const songId = activeSongIdRef.current;

    playbackRef.current = null;
    activeSongIdRef.current = null;
    loggedSecondsRef.current = 0;
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(0);

    if (playback) {
      try {
        await playback.unloadAsync();
      } catch (error) {
        console.error('Audio unload error:', error);
      }
    }

    if (video) {
      try {
        const status = await video.getStatusAsync();
        if (status.isLoaded) {
          await video.stopAsync();
          await video.setPositionAsync(0);
        }
      } catch (error) {
        console.error('Video reset error:', error);
      }
    }

    if (songId && listenedSeconds >= 5) {
      await logListeningEvent(songId, listenedSeconds);
    }
  };

  const togglePlayback = async () => {
    const playback = isVideoMode ? videoRef.current : playbackRef.current;
    if (!playback) {
      return;
    }

    const status = await playback.getStatusAsync();
    if (!status.isLoaded) {
      return;
    }

    if (status.isPlaying) {
      await playback.pauseAsync();
    } else {
      activeSongIdRef.current = currentSong?.id || null;
      await playback.playAsync();
    }
  };

  const seekBy = async (offsetMillis) => {
    const playback = isVideoMode ? videoRef.current : playbackRef.current;
    if (!playback) {
      return;
    }

    const status = await playback.getStatusAsync();
    if (!status.isLoaded) {
      return;
    }

    const nextPosition = Math.max(0, Math.min((status.positionMillis ?? 0) + offsetMillis, durationMillis || 0));
    await playback.setPositionAsync(nextPosition);
  };

  const artworkUrl = currentSong?.artwork_url;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Player</Text>
      <Text style={styles.caption}>Warm wood, sea breeze, and a little cat-on-the-turntable energy.</Text>

      {!currentSong ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nothing on deck</Text>
          <Text style={styles.emptyText}>Choose a format chip in Collection to spin something up.</Text>
        </View>
      ) : (
        <>
          {isVideoMode ? (
            <View style={styles.videoShell}>
              <Video
                ref={videoRef}
                isLooping={false}
                onLoadStart={() => setIsLoading(true)}
                onPlaybackStatusUpdate={(status) => {
                  handlePlaybackStatus(status);
                  if (status.isLoaded) {
                    setIsLoading(false);
                  }
                }}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                source={{ uri: mediaUri }}
                style={styles.video}
                useNativeControls={false}
              />
            </View>
          ) : (
            <View style={styles.vinylShell}>
              <VinylSpinner artworkUrl={artworkUrl} isPlaying={isPlaying} />
            </View>
          )}

          <View style={styles.songInfo}>
            <Text numberOfLines={2} style={styles.songTitle}>
              {currentSong.title}
            </Text>
            <Text style={styles.songArtist}>
              {currentSong.genre || 'Search'} • {preferredFormat?.toUpperCase() || 'FILE'}
            </Text>
          </View>

          <View style={styles.timelineCard}>
            <View style={styles.timeline}>
              <Text style={styles.timelineText}>{formatTime(positionMillis)}</Text>
              <View style={styles.timelineTrack}>
                <View
                  style={[
                    styles.timelineProgress,
                    { width: `${durationMillis ? (positionMillis / durationMillis) * 100 : 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.timelineText}>{formatTime(durationMillis)}</Text>
            </View>

            {isLoading ? (
              <ActivityIndicator color={palette.teal} size="large" style={styles.loader} />
            ) : (
              <View style={styles.controlsRow}>
                <TouchableOpacity onPress={() => seekBy(-15000)} style={styles.secondaryControl}>
                  <Text style={styles.secondaryControlText}>-15s</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={togglePlayback} style={styles.primaryControl}>
                  <Text style={styles.primaryControlText}>{isPlaying ? 'Pause' : 'Play'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => seekBy(15000)} style={styles.secondaryControl}>
                  <Text style={styles.secondaryControlText}>+15s</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: palette.sand,
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 68,
  },
  header: { color: palette.deepTeal, fontSize: 36, fontWeight: '800', marginBottom: 8 },
  caption: { color: palette.dusk, fontSize: 15, lineHeight: 22, marginBottom: 22, textAlign: 'center' },
  emptyState: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: palette.shell,
    borderRadius: 30,
    marginTop: 50,
    padding: 28,
    width: '100%',
  },
  emptyTitle: { color: palette.ink, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  emptyText: { color: palette.dusk, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  vinylShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,249,241,0.75)',
    borderRadius: 34,
    paddingHorizontal: 10,
    width: '100%',
  },
  videoShell: {
    ...shadows.card,
    backgroundColor: palette.cocoa,
    borderRadius: 30,
    height: 300,
    overflow: 'hidden',
    width: '100%',
  },
  video: { height: '100%', width: '100%' },
  songInfo: { alignItems: 'center', marginTop: 20 },
  songTitle: { color: palette.ink, fontSize: 28, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  songArtist: { color: palette.teal, fontSize: 15, fontWeight: '700' },
  timelineCard: {
    ...shadows.soft,
    backgroundColor: palette.shell,
    borderRadius: 28,
    marginTop: 24,
    padding: 18,
    width: '100%',
  },
  timeline: { alignItems: 'center', flexDirection: 'row', gap: 12, width: '100%' },
  timelineText: { color: palette.dusk, fontSize: 12, width: 36 },
  timelineTrack: { backgroundColor: '#D8E8E3', borderRadius: 999, flex: 1, height: 8, overflow: 'hidden' },
  timelineProgress: { backgroundColor: palette.teal, height: '100%' },
  loader: { marginTop: 24 },
  controlsRow: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginTop: 24 },
  primaryControl: {
    alignItems: 'center',
    backgroundColor: palette.deepTeal,
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  primaryControlText: { color: palette.white, fontSize: 16, fontWeight: '800' },
  secondaryControl: {
    alignItems: 'center',
    backgroundColor: palette.peach,
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  secondaryControlText: { color: palette.cocoa, fontSize: 14, fontWeight: '800' },
});
