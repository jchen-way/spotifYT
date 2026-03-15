import * as SQLite from 'expo-sqlite';

let db = null;
let initPromise = null;

const DEFAULT_PLAYLISTS = ['Liked Offline', 'Focus Sessions'];

export const initDb = async () => {
  if (db) {
    return db;
  }

  if (!initPromise) {
    initPromise = (async () => {
      db = await SQLite.openDatabaseAsync('spotifYT.db');

      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          youtube_url TEXT UNIQUE,
          genre TEXT,
          local_path_mp3 TEXT,
          local_path_mp4 TEXT,
          rating INTEGER DEFAULT 0,
          artwork_url TEXT
        );

        CREATE TABLE IF NOT EXISTS play_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          song_id INTEGER NOT NULL,
          played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          duration_listened INTEGER DEFAULT 0,
          FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS playlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS playlist_songs (
          playlist_id INTEGER NOT NULL,
          song_id INTEGER NOT NULL,
          PRIMARY KEY (playlist_id, song_id),
          FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
          FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE
        );
      `);

      const duplicatePlaylists = await db.getAllAsync(`
        SELECT name
        FROM playlists
        GROUP BY name
        HAVING COUNT(*) > 1
      `);

      for (const playlist of duplicatePlaylists) {
        const rows = await db.getAllAsync(
          'SELECT id FROM playlists WHERE name = ? ORDER BY id ASC',
          [playlist.name]
        );

        const [keeper, ...duplicates] = rows;
        for (const duplicate of duplicates) {
          await db.runAsync(
            `
              INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id)
              SELECT ?, song_id
              FROM playlist_songs
              WHERE playlist_id = ?
            `,
            [keeper.id, duplicate.id]
          );
          await db.runAsync('DELETE FROM playlist_songs WHERE playlist_id = ?', [duplicate.id]);
          await db.runAsync('DELETE FROM playlists WHERE id = ?', [duplicate.id]);
        }
      }

      for (const playlistName of DEFAULT_PLAYLISTS) {
        await db.runAsync('INSERT OR IGNORE INTO playlists (name) VALUES (?)', [playlistName]);
      }

      return db;
    })();
  }

  return initPromise;
};

export const getSongs = async ({ format = 'all', playlistId = null } = {}) => {
  const database = await initDb();

  const where = [];
  const params = [];

  if (format === 'mp3') {
    where.push('s.local_path_mp3 IS NOT NULL');
  } else if (format === 'mp4') {
    where.push('s.local_path_mp4 IS NOT NULL');
  }

  let playlistJoin = '';
  if (playlistId) {
    playlistJoin = 'INNER JOIN playlist_songs ps ON ps.song_id = s.id';
    where.push('ps.playlist_id = ?');
    params.push(playlistId);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  return database.getAllAsync(
    `
      SELECT s.*
      FROM songs s
      ${playlistJoin}
      ${whereClause}
      ORDER BY s.rating DESC, s.id DESC
    `,
    params
  );
};

export const getRecentSongs = async (limit = 5) => {
  const database = await initDb();
  return database.getAllAsync(
    `
      SELECT s.*
      FROM songs s
      LEFT JOIN play_history p ON p.song_id = s.id
      GROUP BY s.id
      ORDER BY MAX(p.played_at) DESC, s.id DESC
      LIMIT ?
    `,
    [limit]
  );
};

export const getTopRatedSongs = async (limit = 5) => {
  const database = await initDb();
  return database.getAllAsync(
    `
      SELECT *
      FROM songs
      WHERE rating > 0
      ORDER BY rating DESC, id DESC
      LIMIT ?
    `,
    [limit]
  );
};

export const upsertSong = async (song) => {
  const database = await initDb();

  const existing = await database.getFirstAsync(
    'SELECT * FROM songs WHERE youtube_url = ?',
    [song.youtubeUrl]
  );

  if (existing) {
    await database.runAsync(
      `
        UPDATE songs
        SET title = ?,
            genre = COALESCE(NULLIF(?, ''), genre),
            local_path_mp3 = COALESCE(?, local_path_mp3),
            local_path_mp4 = COALESCE(?, local_path_mp4),
            artwork_url = COALESCE(?, artwork_url)
        WHERE id = ?
      `,
      [
        song.title,
        song.genre,
        song.localPathMp3 ?? null,
        song.localPathMp4 ?? null,
        song.artworkUrl ?? null,
        existing.id,
      ]
    );

    return database.getFirstAsync('SELECT * FROM songs WHERE id = ?', [existing.id]);
  }

  const result = await database.runAsync(
    `
      INSERT INTO songs (
        title,
        youtube_url,
        genre,
        local_path_mp3,
        local_path_mp4,
        artwork_url
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      song.title,
      song.youtubeUrl,
      song.genre ?? 'Search',
      song.localPathMp3 ?? null,
      song.localPathMp4 ?? null,
      song.artworkUrl ?? null,
    ]
  );

  return database.getFirstAsync('SELECT * FROM songs WHERE id = ?', [result.lastInsertRowId]);
};

export const deleteSong = async (songId) => {
  const database = await initDb();
  const song = await database.getFirstAsync('SELECT * FROM songs WHERE id = ?', [songId]);
  if (!song) {
    return null;
  }

  await database.runAsync('DELETE FROM songs WHERE id = ?', [songId]);
  return song;
};

export const updateSongRating = async (songId, rating) => {
  const database = await initDb();
  const clamped = Math.max(0, Math.min(5, rating));
  await database.runAsync('UPDATE songs SET rating = ? WHERE id = ?', [clamped, songId]);
  return database.getFirstAsync('SELECT * FROM songs WHERE id = ?', [songId]);
};

export const getPlaylists = async () => {
  const database = await initDb();
  return database.getAllAsync(`
    SELECT MIN(p.id) AS id, p.name, MIN(p.created_at) AS created_at, COUNT(ps.song_id) AS song_count
    FROM playlists p
    LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
    GROUP BY p.name
    ORDER BY MIN(p.created_at) ASC
  `);
};

export const createPlaylist = async (name) => {
  const database = await initDb();
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }

  await database.runAsync('INSERT OR IGNORE INTO playlists (name) VALUES (?)', [trimmed]);
  return database.getFirstAsync('SELECT * FROM playlists WHERE name = ?', [trimmed]);
};

export const deletePlaylist = async (playlistId) => {
  const database = await initDb();
  const playlist = await database.getFirstAsync('SELECT * FROM playlists WHERE id = ?', [playlistId]);

  if (!playlist) {
    return { deleted: false, reason: 'missing' };
  }

  if (DEFAULT_PLAYLISTS.includes(playlist.name)) {
    return { deleted: false, reason: 'protected', playlist };
  }

  await database.runAsync('DELETE FROM playlists WHERE id = ?', [playlistId]);
  return { deleted: true, playlist };
};

export const toggleSongInPlaylist = async (playlistId, songId) => {
  const database = await initDb();
  const existing = await database.getFirstAsync(
    'SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
    [playlistId, songId]
  );

  if (existing) {
    await database.runAsync(
      'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
      [playlistId, songId]
    );
    return false;
  }

  await database.runAsync(
    'INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)',
    [playlistId, songId]
  );
  return true;
};

export const getSongPlaylistIds = async (songId) => {
  const database = await initDb();
  const rows = await database.getAllAsync(
    'SELECT playlist_id FROM playlist_songs WHERE song_id = ?',
    [songId]
  );
  return rows.map((row) => row.playlist_id);
};
