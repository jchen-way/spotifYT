import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { palette, shadows } from '../theme';
import { getWrappedStats } from '../utils/tracking';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = ['00', '04', '08', '12', '16', '20'];

function MiniBars({ data, valueKey, labelKey, accentColor }) {
  const maxValue = Math.max(...data.map((item) => item[valueKey]), 1);

  return (
    <View style={styles.chartRow}>
      {data.map((item) => (
        <View key={item[labelKey]} style={styles.barColumn}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  backgroundColor: accentColor,
                  height: `${Math.max(12, (item[valueKey] / maxValue) * 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.barLabel}>{item[labelKey]}</Text>
        </View>
      ))}
    </View>
  );
}

function TimeOfDayLine({ points }) {
  const width = 300;
  const height = 130;
  const maxValue = Math.max(...points.map((point) => point.minutes), 1);
  const chartPoints = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * width;
    const y = height - (point.minutes / maxValue) * (height - 18) - 9;
    return { ...point, x, y };
  });

  const segments = chartPoints.slice(1).map((point, index) => {
    const prev = chartPoints[index];
    const dx = point.x - prev.x;
    const dy = point.y - prev.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;
    const midX = (prev.x + point.x) / 2;
    const midY = (prev.y + point.y) / 2;

    return (
      <View
        key={`${prev.hour}-${point.hour}`}
        style={[
          styles.lineSegment,
          {
            left: midX - length / 2,
            top: midY - 1.5,
            transform: [{ rotate: angle }],
            width: length,
          },
        ]}
      />
    );
  });

  return (
    <View>
      <View style={styles.lineChart}>
        <View style={styles.lineChartGrid}>
          {[0, 1, 2, 3].map((row) => (
            <View key={row} style={styles.lineGridRow} />
          ))}
        </View>
        {segments}
        {chartPoints.map((point) => (
          <View
            key={point.hour}
            style={[
              styles.lineDot,
              {
                left: point.x - 5,
                top: point.y - 5,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.lineLabels}>
        {chartPoints.map((point) => (
          <Text key={point.hour} style={styles.barLabel}>
            {point.hour}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function WrappedScreen({ refreshToken }) {
  const isFocused = useIsFocused();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let active = true;

    getWrappedStats()
      .then((nextStats) => {
        if (active) {
          setStats(nextStats);
        }
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, [isFocused, refreshToken]);

  const summary = stats?.summary || { total_plays: 0, total_seconds: 0, unique_tracks: 0 };
  const totalMinutes = Math.round((summary.total_seconds || 0) / 60);
  const topGenres = stats?.topGenres || [];
  const topSongs = stats?.topSongs || [];
  const playlistStats = stats?.playlistStats || [];

  const dayMap = new Map((stats?.listeningByDay || []).map((item) => [Number(item.day_index), Number(item.total_seconds)]));
  const weeklySeries = DAYS.map((day, index) => ({
    day,
    minutes: Math.round((dayMap.get(index) || 0) / 60),
  }));

  const hourlyPoints = useMemo(() => {
    const rawMap = new Map(
      (stats?.listeningByHour || []).map((item) => [Number(item.hour_index), Math.round(Number(item.total_seconds) / 60)])
    );

    return HOURS.map((hour) => {
      const start = Number(hour);
      let total = 0;
      for (let index = start; index < start + 4; index += 1) {
        total += rawMap.get(index) || 0;
      }
      return { hour, minutes: total };
    });
  }, [stats]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.pastelSky} />
      <Text style={styles.header}>Wrapped</Text>
      <Text style={styles.subtitle}>A pastel diary of how, when, and where your offline collection has been living.</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Minutes</Text>
          <Text style={styles.summaryValue}>{totalMinutes}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Plays</Text>
          <Text style={styles.summaryValue}>{summary.total_plays || 0}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Tracks</Text>
          <Text style={styles.summaryValue}>{summary.unique_tracks || 0}</Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.cardTitle}>Listen frequency by time of day</Text>
        <TimeOfDayLine points={hourlyPoints} />
      </View>

      <View style={styles.statCard}>
        <Text style={styles.cardTitle}>Weekly listening</Text>
        <MiniBars accentColor={palette.seaGlass} data={weeklySeries} labelKey="day" valueKey="minutes" />
      </View>

      <View style={styles.statCard}>
        <Text style={styles.cardTitle}>Top genres</Text>
        {topGenres.length > 0 ? (
          <MiniBars accentColor={palette.peach} data={topGenres} labelKey="genre" valueKey="play_count" />
        ) : (
          <Text style={styles.emptyText}>Play a few tracks and this chart will bloom automatically.</Text>
        )}
      </View>

      <View style={styles.statCard}>
        <Text style={styles.cardTitle}>Playlist coverage</Text>
        {playlistStats.length > 0 ? (
          playlistStats.map((playlist) => (
            <View key={playlist.id} style={styles.listRow}>
              <Text style={styles.listLabel}>{playlist.name}</Text>
              <Text style={styles.listValue}>{playlist.track_count} tracks</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Create playlists in Collection and they will appear here.</Text>
        )}
      </View>

      <View style={styles.statCard}>
        <Text style={styles.cardTitle}>Top tracks</Text>
        {topSongs.length > 0 ? (
          topSongs.map((song, index) => (
            <View key={song.id} style={styles.topSongRow}>
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={styles.topSongInfo}>
                <Text numberOfLines={1} style={styles.topSongTitle}>
                  {song.title}
                </Text>
                <Text style={styles.topSongMeta}>
                  {Math.round(song.total_seconds / 60)} min • {song.play_count} plays • {song.rating || 0}/5
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No history yet. Once you listen more, this page will start feeling personal.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: palette.sand, flex: 1 },
  content: { paddingBottom: 32, paddingHorizontal: 18, paddingTop: 68 },
  pastelSky: {
    backgroundColor: '#D8E8F5',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    height: 220,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  header: { color: palette.deepTeal, fontSize: 36, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: palette.dusk, fontSize: 15, lineHeight: 22, marginBottom: 20, maxWidth: '95%' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  summaryCard: {
    ...shadows.soft,
    backgroundColor: 'rgba(255,249,241,0.95)',
    borderRadius: 24,
    flex: 1,
    padding: 16,
  },
  summaryLabel: { color: palette.teal, fontSize: 12, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' },
  summaryValue: { color: palette.ink, fontSize: 28, fontWeight: '800' },
  statCard: {
    ...shadows.card,
    backgroundColor: palette.shell,
    borderRadius: 28,
    marginBottom: 16,
    padding: 18,
  },
  cardTitle: { color: palette.ink, fontSize: 19, fontWeight: '800', marginBottom: 16 },
  chartRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 10, height: 190, justifyContent: 'space-between' },
  barColumn: { alignItems: 'center', flex: 1 },
  barTrack: {
    alignItems: 'center',
    backgroundColor: '#EAF3EF',
    borderRadius: 999,
    height: 150,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  barFill: { borderRadius: 999, minHeight: 8, width: '100%' },
  barLabel: { color: palette.dusk, fontSize: 12, marginTop: 10 },
  lineChart: {
    backgroundColor: '#F3F8F5',
    borderRadius: 18,
    height: 130,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
    width: 300,
  },
  lineChartGrid: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  lineGridRow: {
    borderTopColor: '#DCE7E1',
    borderTopWidth: 1,
    flex: 1,
  },
  lineSegment: {
    backgroundColor: palette.teal,
    borderRadius: 999,
    height: 3,
    position: 'absolute',
  },
  lineDot: {
    backgroundColor: palette.peach,
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    width: 10,
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 300,
  },
  emptyText: { color: palette.dusk, fontSize: 14, lineHeight: 21 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  listLabel: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  listValue: { color: palette.teal, fontSize: 13 },
  topSongRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 14 },
  rank: { color: palette.gold, fontSize: 20, fontWeight: '800', marginRight: 14, width: 20 },
  topSongInfo: { flex: 1 },
  topSongTitle: { color: palette.ink, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  topSongMeta: { color: palette.dusk, fontSize: 13 },
});
