import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'suno_music';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

let pool = null;
let isConnected = false;

// In-memory fallback if MySQL server is not running locally during development
const fallbackStore = {
  users: new Map(), // user_id or phone -> user object
  playlists: new Map(), // id -> playlist object
  likedSongs: new Map(), // user_id -> Map of song_id -> song
  history: new Map(), // user_id -> Array of songs
  tasteProfiles: new Map() // user_id -> profile
};

/**
 * Initializes MySQL connection pool and creates all required tables & indexes
 */
export async function initDatabase() {
  try {
    // Step 1: Connect to MySQL server without selecting DB to ensure DB exists
    const rootConn = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    // Step 2: Create connection pool targeting the suno_music database
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });

    // Test connection
    const testConn = await pool.getConnection();
    isConnected = true;
    testConn.release();

    console.log(`✅ [MySQL] Successfully connected to database: ${DB_NAME} at ${DB_HOST}:${DB_PORT}`);

    // Step 3: Run table migrations
    await createTables();
    return true;
  } catch (err) {
    console.warn(`⚠️ [MySQL] Could not connect to MySQL server (${err.message}).`);
    console.warn(`💡 [MySQL] Running with fast In-Memory storage. Start MySQL/XAMPP on port ${DB_PORT} to persist data to disk.`);
    isConnected = false;
    return false;
  }
}

/**
 * Creates all tables required for user auth, playlists, likes, and recommendation history
 */
async function createTables() {
  if (!pool || !isConnected) return;

  // 1. Users Table (name, unique user_id, phone, password_hash)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar VARCHAR(100) DEFAULT '🎧',
      bio VARCHAR(255) DEFAULT 'Listening on Suno Music 🎧',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_phone (phone),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Playlists Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS playlists (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      cover VARCHAR(500),
      is_public BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_playlists (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Playlist Songs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      playlist_id VARCHAR(36) NOT NULL,
      song_id VARCHAR(100) NOT NULL,
      song_data JSON NOT NULL,
      position INT DEFAULT 0,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_playlist_id (playlist_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Liked Songs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS liked_songs (
      user_id VARCHAR(36) NOT NULL,
      song_id VARCHAR(100) NOT NULL,
      song_data JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, song_id),
      INDEX idx_user_likes (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Listen History
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listen_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      song_id VARCHAR(100) NOT NULL,
      song_data JSON NOT NULL,
      listened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed BOOLEAN DEFAULT FALSE,
      skipped_early BOOLEAN DEFAULT FALSE,
      INDEX idx_user_history (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. User Taste Profile (Spotify / YT Music Brain Persistent State)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_taste_profiles (
      user_id VARCHAR(36) PRIMARY KEY,
      liked_artists JSON,
      skipped_artists JSON,
      preferred_vibes JSON,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ [MySQL] All database tables & indexes verified.');
}

// ==========================================
// USER AUTHENTICATION & MANAGEMENT
// ==========================================

/**
 * Creates a new user with name, unique user_id, phone, and password_hash
 */
export async function createUser({ name, userId, phone, passwordHash, avatar = '🎧' }) {
  const id = `usr_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const cleanUserId = userId.trim().toLowerCase().replace(/^@/, '');
  const cleanPhone = phone.trim().replace(/[^0-9+]/g, '');

  if (isConnected && pool) {
    await pool.query(
      `INSERT INTO users (id, user_id, name, phone, password_hash, avatar) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, cleanUserId, name.trim(), cleanPhone, passwordHash, avatar]
    );
    return { id, userId: cleanUserId, name: name.trim(), phone: cleanPhone, avatar };
  }

  // Fallback
  const user = { id, userId: cleanUserId, name: name.trim(), phone: cleanPhone, password_hash: passwordHash, avatar, created_at: new Date() };
  fallbackStore.users.set(cleanUserId, user);
  fallbackStore.users.set(cleanPhone, user);
  fallbackStore.users.set(id, user);
  return { id, userId: cleanUserId, name: name.trim(), phone: cleanPhone, avatar };
}

/**
 * Finds user by either their unique user_id OR their phone number
 */
export async function getUserByLogin(login) {
  if (!login) return null;
  const clean = login.trim().toLowerCase().replace(/^@/, '');
  const cleanDigits = login.trim().replace(/[^0-9+]/g, '');

  if (isConnected && pool) {
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE user_id = ? OR phone = ? OR phone = ? LIMIT 1`,
      [clean, clean, cleanDigits]
    );
    if (rows.length > 0) return rows[0];
    return null;
  }

  // Fallback
  return fallbackStore.users.get(clean) || fallbackStore.users.get(cleanDigits) || null;
}

/**
 * Finds user by internal UUID
 */
export async function getUserById(id) {
  if (!id) return null;

  if (isConnected && pool) {
    const [rows] = await pool.query(`SELECT id, user_id, name, phone, avatar, bio, created_at FROM users WHERE id = ? LIMIT 1`, [id]);
    if (rows.length > 0) {
      const u = rows[0];
      return {
        id: u.id,
        userId: u.user_id,
        user_id: u.user_id,
        name: u.name,
        phone: u.phone,
        avatar: u.avatar || '🎧',
        bio: u.bio || 'Listening on Suno Music 🎧',
        created_at: u.created_at
      };
    }
    return null;
  }

  const u = fallbackStore.users.get(id);
  if (!u) return null;
  const { password_hash, ...safe } = u;
  return { ...safe, userId: safe.user_id || safe.userId, user_id: safe.user_id || safe.userId };
}

// ==========================================
// USER LIBRARY & PLAYLIST MANAGEMENT
// ==========================================

/**
 * Fetches user's complete library: playlists with songs, liked songs, and listening history
 */
export async function getUserLibrary(userId) {
  if (!userId) return { playlists: [], likedSongs: [], history: [] };

  if (isConnected && pool) {
    // 1. Playlists
    const [playlists] = await pool.query(
      `SELECT id, name, description, cover, is_public, created_at FROM playlists WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    for (const pl of playlists) {
      const [songs] = await pool.query(
        `SELECT song_id, song_data, position FROM playlist_songs WHERE playlist_id = ? ORDER BY position ASC, added_at DESC`,
        [pl.id]
      );
      pl.songs = songs.map(s => (typeof s.song_data === 'string' ? JSON.parse(s.song_data) : s.song_data));
    }

    // 2. Liked songs
    const [likes] = await pool.query(
      `SELECT song_id, song_data, created_at FROM liked_songs WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    const likedSongs = likes.map(l => (typeof l.song_data === 'string' ? JSON.parse(l.song_data) : l.song_data));

    // 3. Recent history
    const [historyRows] = await pool.query(
      `SELECT song_id, song_data, listened_at FROM listen_history WHERE user_id = ? ORDER BY listened_at DESC LIMIT 50`,
      [userId]
    );
    const history = historyRows.map(h => (typeof h.song_data === 'string' ? JSON.parse(h.song_data) : h.song_data));

    return { playlists, likedSongs, history };
  }

  // Fallback
  const userLikes = fallbackStore.likedSongs.get(userId) || new Map();
  const likedSongs = Array.from(userLikes.values());
  const history = fallbackStore.history.get(userId) || [];
  const playlists = Array.from(fallbackStore.playlists.values()).filter(p => p.user_id === userId);

  return { playlists, likedSongs, history };
}

/**
 * Merges / syncs guest local storage with user's MySQL cloud account
 */
export async function syncUserLibrary(userId, { playlists = [], likedSongs = [], recentSongs = [] }) {
  if (!userId) return;

  if (isConnected && pool) {
    // 1. Sync liked songs
    for (const song of likedSongs) {
      if (!song || !song.id) continue;
      await pool.query(
        `INSERT IGNORE INTO liked_songs (user_id, song_id, song_data) VALUES (?, ?, ?)`,
        [userId, song.id, JSON.stringify(song)]
      );
    }

    // 2. Sync playlists
    for (const pl of playlists) {
      if (!pl || !pl.name) continue;
      const plId = pl.id && pl.id.startsWith('pl_') ? pl.id : `pl_${randomUUID().slice(0, 8)}`;
      await pool.query(
        `INSERT INTO playlists (id, user_id, name, description, cover) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), cover = VALUES(cover)`,
        [plId, userId, pl.name, pl.description || '', pl.cover || '']
      );

      if (Array.isArray(pl.songs)) {
        for (let i = 0; i < pl.songs.length; i++) {
          const song = pl.songs[i];
          if (!song || !song.id) continue;
          await pool.query(
            `INSERT IGNORE INTO playlist_songs (playlist_id, song_id, song_data, position) VALUES (?, ?, ?, ?)`,
            [plId, song.id, JSON.stringify(song), i]
          );
        }
      }
    }

    // 3. Sync recent history
    for (const song of recentSongs.slice(0, 30)) {
      if (!song || !song.id) continue;
      await pool.query(
        `INSERT INTO listen_history (user_id, song_id, song_data) VALUES (?, ?, ?)`,
        [userId, song.id, JSON.stringify(song)]
      );
    }
    return;
  }

  // Fallback
  if (!fallbackStore.likedSongs.has(userId)) fallbackStore.likedSongs.set(userId, new Map());
  const userLikes = fallbackStore.likedSongs.get(userId);
  likedSongs.forEach(s => userLikes.set(s.id, s));

  playlists.forEach(pl => {
    fallbackStore.playlists.set(pl.id, { ...pl, user_id: userId });
  });

  fallbackStore.history.set(userId, recentSongs.slice(0, 50));
}

/**
 * Adds or removes a liked song in MySQL
 */
export async function toggleLikedSongDb(userId, song) {
  if (!userId || !song || !song.id) return false;

  if (isConnected && pool) {
    const [existing] = await pool.query(
      `SELECT song_id FROM liked_songs WHERE user_id = ? AND song_id = ? LIMIT 1`,
      [userId, song.id]
    );

    if (existing.length > 0) {
      await pool.query(`DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?`, [userId, song.id]);
      return false; // unliked
    } else {
      await pool.query(
        `INSERT INTO liked_songs (user_id, song_id, song_data) VALUES (?, ?, ?)`,
        [userId, song.id, JSON.stringify(song)]
      );
      return true; // liked
    }
  }

  // Fallback
  if (!fallbackStore.likedSongs.has(userId)) fallbackStore.likedSongs.set(userId, new Map());
  const userLikes = fallbackStore.likedSongs.get(userId);
  if (userLikes.has(song.id)) {
    userLikes.delete(song.id);
    return false;
  } else {
    userLikes.set(song.id, song);
    return true;
  }
}

/**
 * Creates a custom playlist in MySQL
 */
export async function createPlaylistDb(userId, { name, description = '', cover = '' }) {
  const plId = `pl_${randomUUID().slice(0, 10)}`;

  if (isConnected && pool) {
    await pool.query(
      `INSERT INTO playlists (id, user_id, name, description, cover) VALUES (?, ?, ?, ?, ?)`,
      [plId, userId, name.trim(), description.trim(), cover]
    );
    return { id: plId, name: name.trim(), description: description.trim(), cover, songs: [] };
  }

  const pl = { id: plId, user_id: userId, name: name.trim(), description: description.trim(), cover, songs: [], createdAt: new Date().toLocaleDateString() };
  fallbackStore.playlists.set(plId, pl);
  return pl;
}

/**
 * Deletes a custom playlist from MySQL
 */
export async function deletePlaylistDb(userId, playlistId) {
  if (isConnected && pool) {
    await pool.query(`DELETE FROM playlist_songs WHERE playlist_id = ?`, [playlistId]);
    await pool.query(`DELETE FROM playlists WHERE id = ? AND user_id = ?`, [playlistId, userId]);
    return true;
  }
  fallbackStore.playlists.delete(playlistId);
  return true;
}

/**
 * Adds a song to a custom playlist in MySQL
 */
export async function addSongToPlaylistDb(playlistId, song) {
  if (!playlistId || !song || !song.id) return;

  if (isConnected && pool) {
    await pool.query(
      `INSERT IGNORE INTO playlist_songs (playlist_id, song_id, song_data) VALUES (?, ?, ?)`,
      [playlistId, song.id, JSON.stringify(song)]
    );
    return;
  }

  const pl = fallbackStore.playlists.get(playlistId);
  if (pl) {
    if (!pl.songs.some(s => s.id === song.id)) {
      pl.songs = [song, ...pl.songs];
    }
  }
}

// ==========================================
// TASTE PROFILER & LISTEN EVENT LOGGING
// ==========================================

/**
 * Logs a song stream event (completed or fast skip) to refine the user's permanent Spotify brain taste profile
 */
export async function recordListenEventDb(userId, { song, completed = false, skippedEarly = false }) {
  if (!userId || !song || !song.id) return;

  const primaryArtist = (song.artist || '').split(/[,&]/)[0].trim();

  if (isConnected && pool) {
    // 1. Insert history row
    await pool.query(
      `INSERT INTO listen_history (user_id, song_id, song_data, completed, skipped_early) VALUES (?, ?, ?, ?, ?)`,
      [userId, song.id, JSON.stringify(song), completed, skippedEarly]
    );

    // 2. Update persistent taste profile
    const [rows] = await pool.query(`SELECT * FROM user_taste_profiles WHERE user_id = ? LIMIT 1`, [userId]);
    let profile = { liked_artists: {}, skipped_artists: {}, preferred_vibes: {} };

    if (rows.length > 0) {
      profile.liked_artists = typeof rows[0].liked_artists === 'string' ? JSON.parse(rows[0].liked_artists || '{}') : (rows[0].liked_artists || {});
      profile.skipped_artists = typeof rows[0].skipped_artists === 'string' ? JSON.parse(rows[0].skipped_artists || '{}') : (rows[0].skipped_artists || {});
    }

    if (completed && primaryArtist) {
      profile.liked_artists[primaryArtist] = (profile.liked_artists[primaryArtist] || 0) + 1;
    } else if (skippedEarly && primaryArtist) {
      profile.skipped_artists[primaryArtist] = (profile.skipped_artists[primaryArtist] || 0) + 1;
    }

    await pool.query(
      `INSERT INTO user_taste_profiles (user_id, liked_artists, skipped_artists) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE liked_artists = VALUES(liked_artists), skipped_artists = VALUES(skipped_artists)`,
      [userId, JSON.stringify(profile.liked_artists), JSON.stringify(profile.skipped_artists)]
    );
    return;
  }

  // Fallback
  if (!fallbackStore.tasteProfiles.has(userId)) {
    fallbackStore.tasteProfiles.set(userId, { liked_artists: {}, skipped_artists: {} });
  }
  const prof = fallbackStore.tasteProfiles.get(userId);
  if (completed && primaryArtist) {
    prof.liked_artists[primaryArtist] = (prof.liked_artists[primaryArtist] || 0) + 1;
  } else if (skippedEarly && primaryArtist) {
    prof.skipped_artists[primaryArtist] = (prof.skipped_artists[primaryArtist] || 0) + 1;
  }
}

/**
 * Gets user's persistent taste profile for the recommendation engine
 */
export async function getUserTasteProfileDb(userId) {
  if (!userId) return null;

  if (isConnected && pool) {
    const [rows] = await pool.query(`SELECT * FROM user_taste_profiles WHERE user_id = ? LIMIT 1`, [userId]);
    if (rows.length > 0) {
      return {
        likedArtists: typeof rows[0].liked_artists === 'string' ? JSON.parse(rows[0].liked_artists || '{}') : (rows[0].liked_artists || {}),
        skippedArtists: typeof rows[0].skipped_artists === 'string' ? JSON.parse(rows[0].skipped_artists || '{}') : (rows[0].skipped_artists || {})
      };
    }
    return null;
  }

  return fallbackStore.tasteProfiles.get(userId) || null;
}
