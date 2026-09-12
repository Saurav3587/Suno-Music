import express from 'express';
import cors from 'cors';
import yts from 'yt-search';
import { searchSongs, getTrendingSongs, getRomanticHits, getRotatedAcousticHits, generateAutoPlaylist } from './autoPlaylistService.js';
import { normalizeSong } from './decrypt.js';
import { getSpotifyCharts, parseSpotifyUrl, getSpotifyEntity, resolveTrackToPlayable, getOfficialPlaylistsList, getSpotifyPlaylistByKeyOrId } from './spotifyService.js';
import { deduplicateTrackList } from './dedupService.js';
import { initDatabase, createUser, getUserByLogin, updateUserProfileDb, getUserLibrary, syncUserLibrary, toggleLikedSongDb, createPlaylistDb, deletePlaylistDb, addSongToPlaylistDb, recordListenEventDb, getMostListenedSongs24h } from './db.js';
import { hashPassword, comparePassword, generateToken, requireAuth, optionalAuth } from './auth.js';
import { analyzeListeningSession, getAIRecommendationReasoning, interpretMoodRequest, isAIAvailable } from './llmService.js';
import { generateSimilarMoodQueue } from './moodRadioService.js';
import { searchAllPlaylists, getPlaylistDetails } from './playlistSearchService.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory cache for fast responsive responses
const cache = new Map();
function getCache(key, ttlSeconds = 300) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > ttlSeconds * 1000) {
    cache.delete(key);
    return null;
  }
  return item.data;
}
function setCache(key, data) {
  cache.set(key, { time: Date.now(), data });
}

// Health & Database check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: 'MySQL Connected (suno_music)', 
    tables: ['users', 'playlists', 'playlist_songs', 'liked_songs', 'listen_history', 'user_taste_profiles'],
    service: 'Suno Music Server', 
    time: new Date().toISOString() 
  });
});

// Search songs across Spotify/JioSaavn catalog
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ results: [] });
  const cacheKey = `search_${query.toLowerCase()}`;
  const cached = getCache(cacheKey, 180);
  if (cached) return res.json({ results: cached });

  try {
    const results = await searchSongs(query, 25);
    setCache(cacheKey, results);
    res.json({ results });
  } catch (err) {
    console.error('Search API error:', err);
    res.status(500).json({ error: 'Failed to search songs', message: err.message });
  }
});

// Strict filter: Exclude all slowed, reverb, remixes, sped up, nightcore, mashups, non-stop mixes, and meme edits
const EXCLUDE_REMIX_REGEX = /(slowed|reverb|speed\s*up|sped\s*up|nightcore|bass\s*boost|8d\s*audio|remix|mash\s*up|mashup|non\s*stop|tiktok|ringtone|dj\s*mix|extended\s*mix|club\s*mix|status|whatsapp)/i;

function isCleanOriginalOrAcoustic(title) {
  if (!title) return false;
  return !EXCLUDE_REMIX_REGEX.test(title);
}

// Search YouTube strictly for acoustic covers, live sessions, or clean versions (NO remixes, slowed, reverb)
app.get('/api/yt-search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ results: [] });
  const cacheKey = `yt_clean_${query.toLowerCase()}`;
  const cached = getCache(cacheKey, 300);
  if (cached) return res.json({ results: cached });

  try {
    const searchRes = await yts(query);
    const cleanVideos = (searchRes?.videos || [])
      .filter(v => v && v.title && typeof v.title === 'string' && isCleanOriginalOrAcoustic(v.title))
      .map(v => ({
        id: `yt_${v.videoId}`,
        youtubeId: v.videoId,
        source: 'youtube',
        isAcoustic: /(acoustic|unplugged)/i.test(v.title),
        title: v.title.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
        artist: v.author?.name || 'Acoustic Artist',
        album: 'Acoustic Sessions',
        duration: v.seconds || 0,
        image: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        streamUrl: null
      }));
    const dedupedVideos = deduplicateTrackList(cleanVideos, { maxCount: 20 });
    setCache(cacheKey, dedupedVideos);
    res.json({ results: dedupedVideos });
  } catch (err) {
    console.warn('YouTube search fallback:', err.message);
    res.json({ results: [] });
  }
});

// ============================================================
// WORLDWIDE 24-HOUR DAILY TOP 50 ENGINE (6-HOUR AUTO-CYCLE)
// ============================================================
let globalTopHitsCache = null;

async function refreshGlobalTopHitsChart() {
  try {
    const now = Date.now();
    console.log('🌍 [Worldwide Top Hits] Refreshing Spotify Daily Top 50 Worldwide (global-50)...');

    const globalChart = await getSpotifyCharts('global-50');
    const rawTracks = (globalChart?.tracks || []).slice(0, 30);

    const resolved = await Promise.all(
      rawTracks.map(async (t, idx) => {
        try {
          const playable = await resolveTrackToPlayable(t);
          if (playable) {
            return {
              ...playable,
              rank: idx + 1,
              badge: `#${idx + 1} Global`,
              isSpotify: true
            };
          }
        } catch (e) {}

        return {
          id: `sp_${t.spotifyId || idx}`,
          spotifyId: t.spotifyId,
          title: t.title,
          artist: t.artist,
          duration: t.duration,
          image: globalChart?.cover || 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_global_default.jpg',
          album: 'Top 50 - Global',
          badge: `#${idx + 1} Global`,
          rank: idx + 1,
          isSpotify: true
        };
      })
    );

    globalTopHitsCache = {
      id: '37i9dQZEVXbMDoHDwVN2tF',
      key: 'global-50',
      name: 'Top Global Hits',
      title: 'Top Global Hits',
      description: 'Official Spotify Worldwide Daily Top 50: The most listened songs across the globe in the last 24 hours • Auto-updates every 6 hours',
      cover: globalChart?.cover || 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_global_default.jpg',
      badge: 'Worldwide Top 50',
      category: 'charts',
      trackCount: resolved.length,
      lastUpdated: now,
      nextUpdate: now + (6 * 60 * 60 * 1000),
      updateIntervalHours: 6,
      tracks: resolved,
      songs: resolved
    };

    console.log(`✅ [Worldwide Top Hits] Global Daily Chart refreshed successfully: ${resolved.length} tracks. Next update in 6h.`);
    return globalTopHitsCache;
  } catch (err) {
    console.error('❌ [Worldwide Top Hits] Error refreshing Worldwide 24h chart:', err.message);
    if (!globalTopHitsCache) {
      console.warn('Falling back to JioSaavn trending for /api/charts');
      const fallbackSongs = await getTrendingSongs(25);
      return { songs: fallbackSongs };
    }
    return globalTopHitsCache;
  }
}

// Automatically re-compute Worldwide chart every 6 hours
setInterval(refreshGlobalTopHitsChart, 6 * 60 * 60 * 1000);

// Manual trigger endpoint for worldwide top hits
app.post('/api/charts/refresh-global', async (req, res) => {
  const chart = await refreshGlobalTopHitsChart();
  res.json({ success: true, chart });
});

// Get Top Charts & Trending (Actual Worldwide Global Top 50)
app.get('/api/charts', async (req, res) => {
  try {
    if (!globalTopHitsCache || !globalTopHitsCache.songs || globalTopHitsCache.songs.length === 0) {
      const chart = await refreshGlobalTopHitsChart();
      return res.json({ songs: chart?.songs || [] });
    }
    res.json({ songs: globalTopHitsCache.songs });
  } catch (err) {
    console.error('Charts API error:', err);
    res.status(500).json({ error: 'Failed to get charts', message: err.message });
  }
});

// Get Curated Featured & Essential Hits (Rotates every 4 hours with fresh acoustic & timeless melodies)
app.get(['/api/featured', '/api/essentials', '/api/romantic'], async (req, res) => {
  const cacheKey = 'featured_hits_rotated';
  const cached = getCache(cacheKey, 300);
  if (cached) return res.json({ songs: cached });

  try {
    const songs = await getRotatedAcousticHits(25);
    setCache(cacheKey, songs);
    res.json({ songs });
  } catch (err) {
    console.error('Featured API error:', err);
    res.status(500).json({ error: 'Failed to get featured hits', message: err.message });
  }
});

// Get song details by ID
app.get('/api/song/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const url = `https://www.jiosaavn.com/api.php?__call=song.getDetails&pids=${id}&_format=json&_marker=0&api_version=4&ctx=web6dot0`;
    const response = await fetch(url);
    const data = await response.json();
    const rawSong = data[id] || (data.songs && data.songs[0]);
    if (!rawSong) return res.status(404).json({ error: 'Song not found' });
    const normalized = normalizeSong(rawSong);
    res.json(normalized);
  } catch (err) {
    console.error('Song details error:', err);
    res.status(500).json({ error: 'Failed to get song details' });
  }
});

// Get song lyrics
app.get('/api/lyrics', async (req, res) => {
  const songId = req.query.id;
  if (!songId) return res.status(400).json({ error: 'Missing song ID' });

  try {
    const url = `https://www.jiosaavn.com/api.php?__call=lyrics.getLyrics&lyrics_id=${songId}&_format=json&_marker=0&api_version=4&ctx=web6dot0`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({
      lyrics: data.lyrics || null,
      snippet: data.snippet || null,
      copyright: data.copyright_text || ''
    });
  } catch (err) {
    res.json({ lyrics: null });
  }
});

// Auto-Playlist Generator based on recent listening history & matching songs
app.post('/api/auto-playlist', async (req, res) => {
  const { recentSongs = [], type = 'vibe-radar', seedSong = null } = req.body;
  try {
    const playlist = await generateAutoPlaylist({ recentSongs, type, seedSong });
    res.json(playlist);
  } catch (err) {
    console.error('Auto playlist error:', err);
    res.status(500).json({ error: 'Failed to generate playlist', message: err.message });
  }
});

// Smart Mood & Genre Radio Queue (Guarantees matching mood/genre continuity from search)
app.post('/api/radio/similar-queue', async (req, res) => {
  const { seedSong, candidateTracks = [] } = req.body;
  try {
    const result = await generateSimilarMoodQueue(seedSong, candidateTracks);
    res.json(result);
  } catch (err) {
    console.error('Similar queue generation error:', err);
    res.status(500).json({ error: 'Failed to generate similar queue', mood: 'general', moodLabel: 'All Songs', songs: seedSong ? [seedSong] : [] });
  }
});

// Search Playlists across YouTube Music, JioSaavn, and Spotify
app.get('/api/search/playlists', async (req, res) => {
  const query = req.query.q || '';
  if (!query.trim()) return res.json({ playlists: [] });

  try {
    const playlists = await searchAllPlaylists(query, 12);
    res.json({ playlists });
  } catch (err) {
    console.error('Playlist search error:', err);
    res.status(500).json({ error: 'Failed to search playlists', playlists: [] });
  }
});

// Unified Playlist Details (YouTube Music, JioSaavn, Spotify)
app.get('/api/playlist/unified/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const details = await getPlaylistDetails(id);
    res.json(details);
  } catch (err) {
    console.error('Unified playlist details error:', err);
    res.status(500).json({ error: 'Failed to load playlist details', message: err.message });
  }
});

// Get all official Spotify playlists with metadata & category filtering
app.get('/api/spotify/playlists', (req, res) => {
  const category = req.query.category || 'all';
  const playlists = getOfficialPlaylistsList(category);
  res.json({
    playlists,
    total: playlists.length,
    categories: [
      { id: 'all', label: 'All Playlists' },
      { id: 'india', label: 'India & Desi' },
      { id: 'charts', label: 'Top Charts' },
      { id: 'genres', label: 'Rap & Pop' },
      { id: 'moods', label: 'Chill & Focus' },
      { id: 'decades', label: 'Classics & Decades' }
    ]
  });
});

// ============================================================
// INDIA 24-HOUR MOST LISTENED CHART ENGINE (6-HOUR AUTO-CYCLE)
// ============================================================
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
let todayTopHitsCache = null;

async function refreshTodayTopHitsChart() {
  try {
    const now = Date.now();
    console.log('🇮🇳 [Today Top Hits] Refreshing India Daily Top 50 (Most Listened in India in 24h)...');

    // 1. Fetch official Spotify Daily Top 50 - India (the authoritative daily streaming chart in India)
    let indiaChart = null;
    try {
      indiaChart = await getSpotifyCharts('top-india');
    } catch (e) {
      console.warn('⚠️ [Today Top Hits] Could not fetch top-india, falling back to top-hits:', e.message);
      indiaChart = await getSpotifyCharts('top-hits');
    }

    const rawTracks = (indiaChart?.tracks || []).slice(0, 30);

    // 2. Resolve each track in parallel to high-definition 500x500 artwork & 320kbps master audio
    const resolvedTracks = await Promise.all(
      rawTracks.map(async (t, idx) => {
        try {
          const playable = await resolveTrackToPlayable(t);
          if (playable) {
            return {
              ...playable,
              rank: idx + 1,
              badge: `#${idx + 1} India`,
              isSpotify: true
            };
          }
        } catch (e) {}

        return {
          id: `sp_${t.spotifyId || idx}`,
          spotifyId: t.spotifyId,
          title: t.title,
          artist: t.artist,
          duration: t.duration,
          image: indiaChart.cover || 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_in_default.jpg',
          album: "Today's Top Hits - India",
          badge: `#${idx + 1} India`,
          rank: idx + 1,
          isSpotify: true
        };
      })
    );

    todayTopHitsCache = {
      id: '37i9dQZEVXbMWDif5SCqDR',
      key: 'top-hits',
      name: "Today's Top Hits",
      title: "Today's Top Hits",
      description: "Official Spotify India Daily Top 50: The most listened songs in India in the last 24 hours • Auto-updates every 6 hours",
      cover: indiaChart.cover || 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_in_default.jpg',
      badge: 'India Top Hits',
      category: 'charts',
      trackCount: resolvedTracks.length,
      lastUpdated: now,
      nextUpdate: now + SIX_HOURS_MS,
      updateIntervalHours: 6,
      tracks: resolvedTracks,
      songs: resolvedTracks
    };

    console.log(`✅ [Today Top Hits] India Daily Chart refreshed successfully: ${resolvedTracks.length} tracks. Next update in 6h.`);
    return todayTopHitsCache;
  } catch (err) {
    console.error('❌ [Today Top Hits] Error refreshing India 24h chart:', err.message);
    return todayTopHitsCache;
  }
}

// Automatically re-compute chart every 6 hours
setInterval(refreshTodayTopHitsChart, SIX_HOURS_MS);

// Manual trigger / status endpoint for 24h top hits
app.post('/api/charts/refresh-top-hits', async (req, res) => {
  const chart = await refreshTodayTopHitsChart();
  res.json({ success: true, chart });
});

// Get single Spotify official playlist with full playable tracklist
app.get('/api/spotify/playlist/:keyOrId', async (req, res) => {
  const { keyOrId } = req.params;

  // If requesting Today's Top Hits, serve the 24-hour most-listened chart
  if (keyOrId === 'top-hits') {
    if (!todayTopHitsCache) {
      await refreshTodayTopHitsChart();
    }
    return res.json(todayTopHitsCache);
  }

  // If requesting Worldwide Daily Top 50, serve the worldwide chart
  if (keyOrId === 'global-50') {
    if (!globalTopHitsCache) {
      await refreshGlobalTopHitsChart();
    }
    return res.json(globalTopHitsCache);
  }

  // If requesting YouTube Music or JioSaavn unified playlist
  if (keyOrId.startsWith('yt_pl_') || keyOrId.startsWith('saavn_pl_')) {
    try {
      const details = await getPlaylistDetails(keyOrId);
      return res.json(details);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const cacheKey = `spotify_playlist_full_${keyOrId}`;
  const cached = getCache(cacheKey, 600);
  if (cached) return res.json(cached);

  try {
    const playlist = await getSpotifyPlaylistByKeyOrId(keyOrId);
    
    // Map tracks into playable song cards
    const playableSongs = (playlist.tracks || []).map((t, idx) => ({
      id: `sp_${t.spotifyId || idx}`,
      spotifyId: t.spotifyId,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      image: playlist.cover,
      album: playlist.name,
      badge: 'Spotify 320k',
      isSpotify: true
    }));

    const response = {
      ...playlist,
      songs: playableSongs
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error(`Error loading Spotify playlist ${keyOrId}:`, err.message);
    res.status(500).json({ error: 'Failed to fetch Spotify playlist', message: err.message });
  }
});

// Get Spotify Official Charts (Legacy & Live support)
app.get('/api/spotify/charts', async (req, res) => {
  const type = req.query.type || 'top-hits';

  // Today's Top Hits is backed by the 24-hour most-listened engine
  if (type === 'top-hits') {
    if (!todayTopHitsCache) {
      await refreshTodayTopHitsChart();
    }
    return res.json(todayTopHitsCache);
  }

  const cacheKey = `spotify_charts_${type}`;
  const cached = getCache(cacheKey, 600);
  if (cached) return res.json(cached);

  try {
    const chart = await getSpotifyCharts(type);
    setCache(cacheKey, chart);
    res.json(chart);
  } catch (err) {
    console.error('Spotify charts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Spotify charts', message: err.message });
  }
});

// Import any Spotify playlist, album, or track link
app.post('/api/spotify/import', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing Spotify URL' });

  const parsed = parseSpotifyUrl(url);
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid Spotify link format. Please provide a valid open.spotify.com link.' });
  }

  try {
    const entity = await getSpotifyEntity(parsed.type, parsed.id);
    // Resolve the top 20 tracks immediately so they are playable right away
    const resolvedTracks = [];
    const tracksToResolve = entity.tracks.slice(0, 20);

    for (const track of tracksToResolve) {
      const resolved = await resolveTrackToPlayable(track);
      if (resolved) {
        resolvedTracks.push(resolved);
      }
    }

    res.json({
      id: `spotify_${entity.id}`,
      name: entity.name,
      description: entity.description,
      cover: entity.cover,
      trackCount: entity.trackCount,
      songs: resolvedTracks
    });
  } catch (err) {
    console.error('Spotify import error:', err.message);
    res.status(500).json({ error: 'Failed to import Spotify playlist', message: err.message });
  }
});

// Smart Universal Playlist Importer (Spotify, YouTube Music, JioSaavn)
app.post('/api/playlist/import', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Please provide a valid playlist link' });
  }

  const cleanUrl = url.trim();

  try {
    // 1. Spotify URL parsing (playlist, album, track)
    const spotifyParsed = parseSpotifyUrl(cleanUrl);
    if (spotifyParsed) {
      const entity = await getSpotifyEntity(spotifyParsed.type, spotifyParsed.id);
      const tracksToResolve = (entity.tracks || []).slice(0, 25);
      const resolvedTracks = [];

      for (const track of tracksToResolve) {
        const resolved = await resolveTrackToPlayable(track);
        if (resolved) resolvedTracks.push(resolved);
      }

      return res.json({
        id: `spotify_${entity.id}`,
        name: entity.name || 'Imported Spotify Playlist',
        description: entity.description || 'Imported from Spotify',
        cover: entity.cover,
        trackCount: entity.trackCount || resolvedTracks.length,
        source: 'spotify',
        badge: 'Spotify 320k',
        songs: resolvedTracks
      });
    }

    // 2. YouTube / YouTube Music playlist link
    const ytListMatch = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
    if (ytListMatch && ytListMatch[1]) {
      const listId = ytListMatch[1];
      const pl = await getPlaylistDetails(`yt_pl_${listId}`);
      if (pl && pl.songs && pl.songs.length > 0) {
        return res.json({
          ...pl,
          description: pl.description || 'Imported from YouTube Music',
          badge: 'YouTube Music'
        });
      }
    }

    // 3. JioSaavn link
    const saavnMatch = cleanUrl.match(/jiosaavn\.com\/(?:featured|s\/playlist)\/[^/]+\/([a-zA-Z0-9_-]+)/i) ||
                       cleanUrl.match(/[?&]listid=([0-9]+)/i);
    if (saavnMatch && saavnMatch[1]) {
      const listId = saavnMatch[1];
      const pl = await getPlaylistDetails(`saavn_pl_${listId}`);
      if (pl && pl.songs && pl.songs.length > 0) {
        return res.json({
          ...pl,
          description: pl.description || 'Imported from JioSaavn',
          badge: 'Studio 320k'
        });
      }
    }

    // 4. Fallback search by title or keywords
    const searchPlaylists = await searchAllPlaylists(cleanUrl, 1);
    if (searchPlaylists.length > 0) {
      const topMatch = searchPlaylists[0];
      const pl = await getPlaylistDetails(topMatch.id, topMatch);
      if (pl && pl.songs && pl.songs.length > 0) {
        return res.json({
          ...pl,
          badge: pl.badge || 'Imported Playlist'
        });
      }
    }

    return res.status(404).json({
      error: 'Could not resolve playlist from this URL. Please verify that the link is public and accessible.'
    });
  } catch (err) {
    console.error('Smart playlist import error:', err.message);
    return res.status(500).json({ error: 'Failed to import playlist', message: err.message });
  }
});

// Simple direct song recommendations (no algorithmic scoring or graphs)
app.post('/api/recommend', async (req, res) => {
  const { seedSong, limit = 10 } = req.body;
  try {
    const artist = seedSong?.artist ? seedSong.artist.split(/[,&]/)[0].trim() : '';
    let songs = [];
    if (artist) {
      const results = await searchSongs(`${artist} songs`, limit);
      songs = results.filter(s => s.id !== seedSong?.id);
    }
    if (songs.length < 4) {
      const trending = await getTrendingSongs(limit);
      songs = [...songs, ...trending].slice(0, limit);
    }
    res.json({ songs });
  } catch (err) {
    console.error('Recommend error:', err.message);
    const fallback = await getTrendingSongs(limit || 10).catch(() => []);
    res.json({ songs: fallback });
  }
});

app.get('/api/recommend', async (req, res) => {
  const { artist, limit = 10 } = req.query;
  try {
    let songs = [];
    if (artist) {
      songs = await searchSongs(`${artist} songs`, parseInt(limit, 10) || 10);
    }
    if (songs.length < 4) {
      const trending = await getTrendingSongs(parseInt(limit, 10) || 10);
      songs = [...songs, ...trending].slice(0, parseInt(limit, 10) || 10);
    }
    res.json({ songs });
  } catch (err) {
    res.json({ songs: [] });
  }
});


// ==========================================
// USER AUTHENTICATION (PHONE, USER ID, NAME)
// ==========================================

// Register a new user account
app.post('/api/auth/register', async (req, res) => {
  const { name, userId, phone, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
  }
  if (!userId || typeof userId !== 'string' || userId.trim().length < 3) {
    return res.status(400).json({ error: 'Please choose a unique User ID (at least 3 characters).' });
  }
  const cleanPhone = phone ? String(phone).trim().replace(/[^0-9]/g, '') : '';
  if (!cleanPhone || cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const cleanUserId = userId.trim().toLowerCase().replace(/^@/, '');

  try {
    // Check uniqueness
    const existingByUserId = await getUserByLogin(cleanUserId);
    if (existingByUserId) {
      return res.status(409).json({ error: 'This User ID is already taken. Please choose another.' });
    }

    const existingByPhone = await getUserByLogin(cleanPhone);
    if (existingByPhone) {
      return res.status(409).json({ error: 'An account with this phone number already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ name: name.trim(), userId: cleanUserId, phone: cleanPhone, passwordHash });
    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login with Phone Number OR User ID
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Please enter your Phone Number or User ID and Password.' });
  }

  try {
    const userRecord = await getUserByLogin(login);
    if (!userRecord) {
      return res.status(401).json({ error: 'No account found with this Phone Number or User ID.' });
    }

    const isMatch = await comparePassword(password, userRecord.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const safeUser = {
      id: userRecord.id,
      userId: userRecord.user_id || userRecord.userId,
      name: userRecord.name,
      phone: userRecord.phone,
      avatar: userRecord.avatar || '🎧',
      bio: userRecord.bio || 'Listening on Suno Music 🎧'
    };
    const token = generateToken(safeUser);
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Get current logged-in user profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Update user profile (name, bio, avatar)
app.put('/api/user/profile', requireAuth, async (req, res) => {
  const { name, bio, avatar } = req.body;
  try {
    const updated = await updateUserProfileDb(req.user.id, { name, bio, avatar });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ==========================================
// USER LIBRARY & CROSS-DEVICE SYNC
// ==========================================

// Get user's cloud library (playlists, liked songs, history)
app.get('/api/user/library', requireAuth, async (req, res) => {
  try {
    const library = await getUserLibrary(req.user.id);
    res.json(library);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user library' });
  }
});

// Sync local guest library into cloud account
app.post('/api/user/sync', requireAuth, async (req, res) => {
  const { playlists = [], likedSongs = [], recentSongs = [] } = req.body;
  try {
    await syncUserLibrary(req.user.id, { playlists, likedSongs, recentSongs });
    const library = await getUserLibrary(req.user.id);
    res.json({ success: true, library });
  } catch (err) {
    console.error('Sync library error:', err);
    res.status(500).json({ error: 'Failed to sync library' });
  }
});

// Toggle liked song in database
app.post('/api/user/like', requireAuth, async (req, res) => {
  const { song } = req.body;
  if (!song || !song.id) return res.status(400).json({ error: 'Missing song data' });
  try {
    const isLiked = await toggleLikedSongDb(req.user.id, song);
    res.json({ isLiked, songId: song.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update like status' });
  }
});

// Create a new playlist
app.post('/api/user/playlist', requireAuth, async (req, res) => {
  const { name, description = '', cover = '' } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Playlist name is required' });
  try {
    const playlist = await createPlaylistDb(req.user.id, { name, description, cover });
    res.status(201).json({ playlist });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Delete a playlist
app.delete('/api/user/playlist/:id', requireAuth, async (req, res) => {
  try {
    await deletePlaylistDb(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Add a song to a playlist
app.post('/api/user/playlist/:id/song', requireAuth, async (req, res) => {
  const { song } = req.body;
  if (!song || !song.id) return res.status(400).json({ error: 'Missing song data' });
  try {
    await addSongToPlaylistDb(req.params.id, song);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add song to playlist' });
  }
});

// Batch save imported playlist with all songs directly into MySQL database
app.post('/api/user/playlist/import-save', requireAuth, async (req, res) => {
  const { name, description = '', cover = '', songs = [] } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Playlist name is required' });
  try {
    const playlist = await createPlaylistDb(req.user.id, { name: name.trim(), description, cover });
    for (const song of songs) {
      await addSongToPlaylistDb(playlist.id, song);
    }
    res.status(201).json({ playlist: { ...playlist, songs } });
  } catch (err) {
    console.error('Save imported playlist to DB error:', err);
    res.status(500).json({ error: 'Failed to save imported playlist to database' });
  }
});

// Track listening event for algorithmic taste refinement
app.post('/api/user/listen-event', optionalAuth, async (req, res) => {
  const { song, completed = false, skippedEarly = false } = req.body;
  if (req.user && song) {
    await recordListenEventDb(req.user.id, { song, completed, skippedEarly });
  }
  res.json({ status: 'ok' });
});

// ==========================================
// AI DJ ENDPOINTS (Gemini LLM)
// ==========================================

// Check if AI is available
app.get('/api/ai/status', (req, res) => {
  res.json({ available: isAIAvailable() });
});

// Analyze current listening session and return mood insights + smart search queries
app.post('/api/ai/session-insight', async (req, res) => {
  const { currentTrack, recentHistory = [], likedSongs = [] } = req.body;
  try {
    const insight = await analyzeListeningSession(currentTrack, recentHistory, likedSongs);
    res.json(insight);
  } catch (err) {
    console.error('AI session insight error:', err.message);
    res.json({ mood: 'vibing', insight: 'Enjoying the music flow.', searchQueries: [], suggestedArtists: [] });
  }
});

// Explain why a song was recommended (natural language reasoning)
app.post('/api/ai/explain', async (req, res) => {
  const { currentSong, nextSong, recentHistory = [] } = req.body;
  try {
    const reasoning = await getAIRecommendationReasoning(currentSong, nextSong, recentHistory);
    res.json({ reasoning });
  } catch (err) {
    console.error('AI explain error:', err.message);
    res.json({ reasoning: 'This track matches your current vibe.' });
  }
});

// Handle mood-based music playback in AI DJ
app.post('/api/ai/chat', async (req, res) => {
  const { message, mood, currentTrack } = req.body;
  const moodInput = (mood || message || '').trim();
  if (!moodInput) {
    return res.status(400).json({ error: 'Mood is required' });
  }

  try {
    const interpretation = await interpretMoodRequest(moodInput, currentTrack);

    // Fetch songs for each generated query in parallel
    const queries = Array.isArray(interpretation.queries) && interpretation.queries.length > 0
      ? interpretation.queries
      : [`${moodInput} songs`, `${moodInput} hindi hits`];

    const searchPromises = queries.map(q => searchSongs(q, 8).catch(() => []));
    const queryResults = await Promise.all(searchPromises);

    // Interleave and deduplicate results
    const seenIds = new Set();
    const interleaved = [];
    const maxLen = Math.max(...queryResults.map(r => r.length), 0);

    for (let round = 0; round < maxLen && interleaved.length < 25; round++) {
      for (const bucket of queryResults) {
        if (interleaved.length >= 25) break;
        const song = bucket[round];
        if (song && song.id && !seenIds.has(song.id)) {
          seenIds.add(song.id);
          interleaved.push(song);
        }
      }
    }

    let songs = interleaved;
    if (songs.length === 0) {
      songs = await searchSongs(`${moodInput} songs`, 15).catch(() => []);
    }

    res.json({
      response: interpretation.response,
      mood: interpretation.mood,
      query: moodInput,
      songs
    });
  } catch (err) {
    console.error('AI mood DJ error:', err.message);
    try {
      const fallbackSongs = await searchSongs(`${moodInput} songs`, 15);
      res.json({
        response: `Playing songs for ${moodInput} mood.`,
        mood: moodInput,
        query: moodInput,
        songs: fallbackSongs
      });
    } catch {
      res.json({
        response: 'Could not fetch songs for this mood. Please try another mood.',
        mood: moodInput,
        query: moodInput,
        songs: []
      });
    }
  }
});


import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

// Serve built frontend statically
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Initialize database before starting server
initDatabase().then(() => {
  refreshTodayTopHitsChart();
  refreshGlobalTopHitsChart();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 Suno Music Server listening on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database startup error:', err);
  refreshTodayTopHitsChart();
  refreshGlobalTopHitsChart();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 Suno Music Server listening on http://localhost:${PORT}`);
  });
});
