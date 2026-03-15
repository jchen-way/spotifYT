import { initDb } from '../database/db';

export const logListeningEvent = async (songId, durationListened) => {
  if (!songId || durationListened < 5) {
    return;
  }

  try {
    const db = await initDb();
    await db.runAsync(
      `INSERT INTO play_history (song_id, played_at, duration_listened)
       VALUES (?, datetime('now'), ?)`,
      [songId, Math.round(durationListened)]
    );
  } catch (error) {
    console.error('Error logging play history:', error);
  }
};

export const getWrappedStats = async () => {
  try {
    const db = await initDb();

    const topGenres = await db.getAllAsync(`
      SELECT COALESCE(NULLIF(s.genre, ''), 'Search') AS genre, COUNT(p.id) AS play_count
      FROM play_history p
      JOIN songs s ON p.song_id = s.id
      GROUP BY COALESCE(NULLIF(s.genre, ''), 'Search')
      ORDER BY play_count DESC
      LIMIT 5
    `);

    const listeningByDay = await db.getAllAsync(`
      SELECT strftime('%w', played_at) AS day_index, SUM(duration_listened) AS total_seconds
      FROM play_history
      GROUP BY strftime('%w', played_at)
      ORDER BY day_index ASC
    `);

    const listeningByHour = await db.getAllAsync(`
      SELECT strftime('%H', played_at) AS hour_index, SUM(duration_listened) AS total_seconds
      FROM play_history
      GROUP BY strftime('%H', played_at)
      ORDER BY hour_index ASC
    `);

    const summary = await db.getFirstAsync(`
      SELECT
        COUNT(*) AS total_plays,
        COALESCE(SUM(duration_listened), 0) AS total_seconds,
        COUNT(DISTINCT song_id) AS unique_tracks
      FROM play_history
    `);

    const topSongs = await db.getAllAsync(`
      SELECT
        s.id,
        s.title,
        s.rating,
        COUNT(p.id) AS play_count,
        COALESCE(SUM(p.duration_listened), 0) AS total_seconds
      FROM play_history p
      JOIN songs s ON p.song_id = s.id
      GROUP BY s.id, s.title, s.rating
      ORDER BY total_seconds DESC, play_count DESC
      LIMIT 5
    `);

    const playlistStats = await db.getAllAsync(`
      SELECT MIN(p.id) AS id, p.name, COUNT(ps.song_id) AS track_count
      FROM playlists p
      LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
      GROUP BY p.name
      ORDER BY track_count DESC, p.name ASC
      LIMIT 5
    `);

    return {
      listeningByDay,
      listeningByHour,
      playlistStats,
      summary,
      topGenres,
      topSongs,
    };
  } catch (error) {
    console.error('Error fetching Wrapped stats:', error);
    return null;
  }
};
