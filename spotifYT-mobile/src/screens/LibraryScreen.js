import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';

import {
  createPlaylist,
  deletePlaylist,
  deleteSong,
  getPlaylists,
  getSongPlaylistIds,
  getSongs,
  toggleSongInPlaylist,
  updateSongRating,
} from '../database/db';
import { palette, shadows } from '../theme';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'mp3', label: 'MP3' },
  { key: 'mp4', label: 'MP4' },
];

const renderStars = (rating) => '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);

const withPreferredFormat = (song, format) => ({
  ...song,
  preferredFormat: format,
});

export default function LibraryScreen({ currentSong, onLibraryChanged, onSelectSong, refreshToken }) {
  const [songs, setSongs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistDraft, setPlaylistDraft] = useState('');
  const [songPlaylistIds, setSongPlaylistIds] = useState({});
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const loadData = async () => {
      const [playlistRows, songRows] = await Promise.all([
        getPlaylists(),
        getSongs({ format: filter, playlistId: selectedPlaylistId }),
      ]);

      setPlaylists(playlistRows);
      setSongs(songRows);

      const membershipEntries = await Promise.all(
        songRows.map(async (song) => [song.id, await getSongPlaylistIds(song.id)])
      );
      setSongPlaylistIds(Object.fromEntries(membershipEntries));
    };

    loadData().catch(console.error);
  }, [filter, isFocused, refreshToken, selectedPlaylistId]);

  const selectedPlaylistName = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId)?.name,
    [playlists, selectedPlaylistId]
  );
  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId) || null,
    [playlists, selectedPlaylistId]
  );

  const handleDelete = (song) => {
    Alert.alert('Delete track?', `${song.title} will be removed from the local library.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            for (const uri of [song.local_path_mp3, song.local_path_mp4]) {
              if (uri) {
                await FileSystem.deleteAsync(uri, { idempotent: true });
              }
            }

            await deleteSong(song.id);
            const nextCurrent = currentSong?.id === song.id ? null : currentSong;
            onLibraryChanged?.(nextCurrent);
          } catch (error) {
            Alert.alert('Delete failed', error.message || 'The file could not be removed.');
          }
        },
      },
    ]);
  };

  const handleRate = async (song, rating) => {
    await updateSongRating(song.id, song.rating === rating ? 0 : rating);
    onLibraryChanged?.(currentSong);
  };

  const handleCreatePlaylist = async () => {
    const playlist = await createPlaylist(playlistDraft);
    if (!playlist) {
      return;
    }
    setPlaylistDraft('');
    setSelectedPlaylistId(playlist.id);
    onLibraryChanged?.(currentSong);
  };

  const handleDeletePlaylist = () => {
    if (!selectedPlaylist) {
      return;
    }

    Alert.alert('Delete playlist?', `${selectedPlaylist.name} will be removed, but the songs will stay in your library.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deletePlaylist(selectedPlaylist.id);
          if (!result.deleted) {
            if (result.reason === 'protected') {
              Alert.alert('Protected playlist', 'The built-in playlists cannot be deleted.');
            }
            return;
          }

          setSelectedPlaylistId(null);
          onLibraryChanged?.(currentSong);
        },
      },
    ]);
  };

  const handleTogglePlaylistMembership = async (song, playlistId) => {
    if (!playlistId) {
      Alert.alert('No playlists yet', 'Create a playlist first, then add tracks to it.');
      return;
    }

    await toggleSongInPlaylist(playlistId, song.id);
    onLibraryChanged?.(currentSong);
  };

  const renderFormatButtons = (song) => {
    const modes = [song.local_path_mp3 ? 'mp3' : null, song.local_path_mp4 ? 'mp4' : null].filter(Boolean);

    return (
      <View style={styles.modeRow}>
        {modes.map((mode) => (
          <TouchableOpacity
            key={`${song.id}-${mode}`}
            onPress={() => onSelectSong?.(withPreferredFormat(song, mode))}
            style={[
              styles.modeChip,
              currentSong?.id === song.id && currentSong?.preferredFormat === mode && styles.modeChipActive,
            ]}>
            <Text
              style={[
                styles.modeChipText,
                currentSong?.id === song.id && currentSong?.preferredFormat === mode && styles.modeChipTextActive,
              ]}>
              {mode.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const membership = songPlaylistIds[item.id] || [];

    return (
      <View style={[styles.card, currentSong?.id === item.id && styles.activeCard]}>
        {item.artwork_url ? (
          <Image source={{ uri: item.artwork_url }} style={styles.albumArt} />
        ) : (
          <View style={styles.albumArtFallback} />
        )}
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          <Text style={styles.meta}>
            {item.genre || 'Search'} • {item.local_path_mp3 ? 'MP3' : ''}{item.local_path_mp3 && item.local_path_mp4 ? ' + ' : ''}{item.local_path_mp4 ? 'MP4' : ''}
          </Text>
          <Text style={styles.ratingText}>{renderStars(item.rating || 0)}</Text>
          {renderFormatButtons(item)}
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity key={rating} onPress={() => handleRate(item, rating)} style={styles.starButton}>
                <Text style={[styles.starText, item.rating >= rating && styles.starTextActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistRow}>
            {playlists.map((playlist) => {
              const isMember = membership.includes(playlist.id);
              return (
                <TouchableOpacity
                  key={`${item.id}-playlist-${playlist.id}`}
                  onPress={() => handleTogglePlaylistMembership(item, playlist.id)}
                  style={[styles.secondaryAction, isMember && styles.secondaryActionActive]}>
                  <Text style={[styles.secondaryActionText, isMember && styles.secondaryActionTextActive]}>
                    {playlist.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.footerRow}>
            <Text style={styles.footerHint}>tap a format to play</Text>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteAction}>
              <Text style={styles.deleteActionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.waveBackdrop} />
      <Text style={styles.header}>Collection</Text>
      <Text style={styles.subtitle}>Curate your saved library like a shelf of vinyl, tapes, and sun-faded notebooks.</Text>

      <ScrollView contentContainerStyle={styles.controlsContent} horizontal showsHorizontalScrollIndicator={false} style={styles.chipRail}>
        {FILTERS.map((option) => (
          <TouchableOpacity
            key={option.key}
            onPress={() => setFilter(option.key)}
            style={[styles.filterChip, filter === option.key && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, filter === option.key && styles.filterChipTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setSelectedPlaylistId(null)}
          style={[styles.filterChip, !selectedPlaylistId && styles.filterChipActive]}>
          <Text style={[styles.filterChipText, !selectedPlaylistId && styles.filterChipTextActive]}>All playlists</Text>
        </TouchableOpacity>
        {playlists.map((playlist) => (
          <TouchableOpacity
            key={playlist.id}
            onPress={() => setSelectedPlaylistId(playlist.id)}
            style={[styles.filterChip, selectedPlaylistId === playlist.id && styles.filterChipActiveAlt]}>
            <Text style={[styles.filterChipText, selectedPlaylistId === playlist.id && styles.filterChipTextActive]}>
              {playlist.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.playlistComposer}>
        <TextInput
          placeholder="Name a new playlist"
          placeholderTextColor="#958C86"
          style={styles.playlistInput}
          value={playlistDraft}
          onChangeText={setPlaylistDraft}
          onSubmitEditing={handleCreatePlaylist}
        />
        <TouchableOpacity onPress={handleCreatePlaylist} style={styles.createButton}>
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {selectedPlaylistName ? (
        <View style={styles.selectionRow}>
          <Text style={styles.selectionMeta}>Showing only: {selectedPlaylistName}</Text>
          {!['Liked Offline', 'Focus Sessions'].includes(selectedPlaylistName) ? (
            <TouchableOpacity onPress={handleDeletePlaylist} style={styles.selectionDelete}>
              <Text style={styles.selectionDeleteText}>Delete playlist</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {songs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No tracks match this view yet.</Text>
          <Text style={styles.emptySubText}>Try another format filter or add more songs from Discover.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={songs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: palette.sand, flex: 1, paddingTop: 68 },
  waveBackdrop: {
    backgroundColor: palette.foam,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    height: 210,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  header: { color: palette.deepTeal, fontSize: 36, fontWeight: '800', marginBottom: 8, marginHorizontal: 18 },
  subtitle: {
    color: palette.dusk,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    marginHorizontal: 18,
  },
  chipRail: { maxHeight: 46, minHeight: 46 },
  controlsContent: { gap: 10, paddingHorizontal: 18, paddingVertical: 4 },
  filterChip: {
    backgroundColor: palette.shell,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  filterChipActive: { backgroundColor: palette.deepTeal },
  filterChipActiveAlt: { backgroundColor: palette.seaGlass },
  filterChipText: { color: palette.ink, fontSize: 13, fontWeight: '800' },
  filterChipTextActive: { color: palette.white },
  playlistComposer: {
    ...shadows.soft,
    backgroundColor: 'rgba(255,249,241,0.95)',
    borderRadius: 26,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 14,
    padding: 10,
  },
  playlistInput: {
    backgroundColor: palette.foam,
    borderRadius: 18,
    color: palette.ink,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: palette.peach,
    borderRadius: 18,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  createButtonText: { color: palette.cocoa, fontWeight: '800' },
  selectionMeta: {
    color: palette.teal,
    fontSize: 13,
    fontStyle: 'italic',
  },
  selectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 12,
  },
  selectionDelete: {
    backgroundColor: '#F4D9D2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectionDeleteText: {
    color: palette.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  listContent: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 14 },
  emptyState: {
    ...shadows.soft,
    alignItems: 'center',
    backgroundColor: palette.shell,
    borderRadius: 28,
    marginHorizontal: 18,
    marginTop: 12,
    padding: 28,
  },
  emptyText: { color: palette.ink, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySubText: { color: palette.dusk, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  card: {
    ...shadows.card,
    backgroundColor: palette.shell,
    borderRadius: 28,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 14,
  },
  activeCard: { backgroundColor: '#EEF5F3' },
  albumArt: { borderRadius: 20, height: 88, width: 88 },
  albumArtFallback: { backgroundColor: palette.foam, borderRadius: 20, height: 88, width: 88 },
  info: { flex: 1, marginLeft: 14 },
  title: { color: palette.ink, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  meta: { color: palette.dusk, fontSize: 13, marginBottom: 8 },
  ratingText: { color: palette.gold, fontSize: 13, marginBottom: 10 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeChip: {
    backgroundColor: palette.foam,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modeChipActive: { backgroundColor: palette.deepTeal },
  modeChipText: { color: palette.ink, fontSize: 12, fontWeight: '800' },
  modeChipTextActive: { color: palette.white },
  starRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  starButton: { paddingHorizontal: 2 },
  starText: { color: '#D8D0C2', fontSize: 19 },
  starTextActive: { color: palette.gold },
  playlistRow: { gap: 8, marginBottom: 12 },
  secondaryAction: {
    backgroundColor: palette.rose,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryActionActive: { backgroundColor: palette.seaGlass },
  secondaryActionText: { color: palette.cocoa, fontSize: 12, fontWeight: '800' },
  secondaryActionTextActive: { color: palette.white },
  footerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  footerHint: { color: palette.teal, fontSize: 12, fontStyle: 'italic' },
  deleteAction: {
    backgroundColor: '#F4D9D2',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteActionText: { color: palette.danger, fontSize: 12, fontWeight: '800' },
});
