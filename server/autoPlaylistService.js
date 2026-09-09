import { normalizeSong, cleanText } from './decrypt.js';
import { deduplicateTrackList } from './dedupService.js';

const JIOSAAVN_API = 'https://www.jiosaavn.com/api.php';

async function fetchJioSaavn(params) {
  const url = new URL(JIOSAAVN_API);
  params._format = 'json';
  params._marker = '0';
  params.api_version = '4';
  params.ctx = 'web6dot0';

  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`JioSaavn fetch failed: ${res.status}`);
  return await res.json();
}

const EXCLUDE_REMIX_REGEX = /(slowed|reverb|speed\s*up|sped\s*up|nightcore|bass\s*boost|8d\s*audio|remix|mash\s*up|mashup|non\s*stop|tiktok|ringtone|dj\s*mix|extended\s*mix|club\s*mix|status|whatsapp)/i;

export function isCleanTrack(song) {
  if (!song || !song.title) return false;
  return !EXCLUDE_REMIX_REGEX.test(song.title);
}

/**
 * Searches songs by query string
 */
export async function searchSongs(query, limit = 20) {
  if (!query || !query.trim()) return [];
  try {
    const data = await fetchJioSaavn({
      __call: 'search.getResults',
      q: query.trim(),
      n: limit.toString(),
      p: '1'
    });
    const rawList = data.results || [];
    const normalized = rawList
      .map(normalizeSong)
      .filter(s => s && s.streamUrl);
    return deduplicateTrackList(normalized, { maxCount: limit });
  } catch (err) {
    console.error('searchSongs error:', err.message);
    return [];
  }
}

/**
 * Fetches top romantic charts / curated love playlists
 */
export async function getRomanticHits(limit = 30) {
  try {
    // 1139074020 is JioSaavn's 'Most Streamed Love Songs: Hindi'
    const data = await fetchJioSaavn({
      __call: 'playlist.getDetails',
      listid: '1139074020'
    });
    const songs = (data.list || [])
      .map(normalizeSong)
      .filter(s => s && s.streamUrl);
    const deduped = deduplicateTrackList(songs, { maxCount: limit });
    if (deduped.length >= 8) return deduped;

    // Fallback: search romantic classics
    const fallback = await searchSongs('romantic love songs', limit);
    return deduplicateTrackList(fallback, { maxCount: limit });
  } catch (err) {
    console.error('getRomanticHits error:', err.message);
    return await searchSongs('love hits ed sheeran taylor swift arijit singh', limit);
  }
}

/**
 * Fetches trending charts
 */
export async function getTrendingSongs(limit = 30) {
  try {
    // 110858205 is 'Trending Today'
    const data = await fetchJioSaavn({
      __call: 'playlist.getDetails',
      listid: '110858205'
    });
    const songs = (data.list || [])
      .map(normalizeSong)
      .filter(s => s && s.streamUrl);
    const deduped = deduplicateTrackList(songs, { maxCount: limit });
    if (deduped.length > 5) return deduped;

    // Alternative: India Superhits Top 50 (1134543272)
    const superhits = await fetchJioSaavn({
      __call: 'playlist.getDetails',
      listid: '1134543272'
    });
    const superSongs = (superhits.list || [])
      .map(normalizeSong)
      .filter(s => s && s.streamUrl);
    return deduplicateTrackList(superSongs, { maxCount: limit });
  } catch (err) {
    console.error('getTrendingSongs error:', err.message);
    return await searchSongs('global top 50 pop hits', limit);
  }
}

/**
 * Generates an Auto-Playlist based on recent listening history and matching artists
 */
export async function generateAutoPlaylist({ recentSongs = [], type = 'vibe-radar', seedSong = null }) {
  const seenIds = new Set();
  let results = [];
  let playlistTitle = 'Auto Mix';
  let playlistDescription = 'Generated automatically just for you';
  let gradient = 'linear-gradient(135deg, #ff4b72 0%, #7b2cbf 100%)';

  // 1. Endless Matching Radio for a specific song
  if (type === 'radio' && seedSong) {
    playlistTitle = `Radio: Based on ${seedSong.title}`;
    playlistDescription = `Endless flow of matching tracks inspired by ${seedSong.artist}`;
    gradient = 'linear-gradient(135deg, #e056fd 0%, #686de0 100%)';

    const artistFirst = seedSong.artist ? seedSong.artist.split(/[,&]/)[0].trim() : '';
    const query = artistFirst ? `${artistFirst} top songs` : seedSong.title;
    const matches = await searchSongs(query, 15);
    matches.forEach(s => {
      if (s.id !== seedSong.id && !seenIds.has(s.id)) {
        seenIds.add(s.id);
        results.push(s);
      }
    });

    // Also fetch genre matches
    const genreMatches = await searchSongs(`${seedSong.language || 'romantic'} love pop songs`, 10);
    genreMatches.forEach(s => {
      if (s.id !== seedSong.id && !seenIds.has(s.id)) {
        seenIds.add(s.id);
        results.push(s);
      }
    });
  }

  // 2. Vibe Radar: Generated from recently played songs
  else if (type === 'vibe-radar' || (!seedSong && recentSongs.length > 0)) {
    playlistTitle = 'Your Vibe Radar';
    playlistDescription = 'Fresh matching tracks curated from your recent listening history';
    gradient = 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)';

    // Extract unique recent artists
    const recentArtists = [];
    recentSongs.forEach(s => {
      if (s.artist) {
        const primary = s.artist.split(/[,&]/)[0].trim();
        if (primary && !recentArtists.includes(primary)) {
          recentArtists.push(primary);
        }
      }
    });

    // Take top 3 recent artists and query their latest and matching tracks
    const selectedArtists = recentArtists.slice(0, 3);
    for (const artist of selectedArtists) {
      const artistMatches = await searchSongs(`${artist} hits`, 8);
      artistMatches.forEach(s => {
        if (!seenIds.has(s.id)) {
          seenIds.add(s.id);
          results.push(s);
        }
      });
    }

    // Add acoustic / chill match if needed
    if (results.length < 15) {
      const chillMatches = await searchSongs('popular acoustic studio hits', 10);
      chillMatches.forEach(s => {
        if (!seenIds.has(s.id)) {
          seenIds.add(s.id);
          results.push(s);
        }
      });
    }
  }

  // 3. Acoustic Sessions
  else if (type === 'acoustics') {
    playlistTitle = 'Acoustic Sessions';
    playlistDescription = 'Pure, stripped-back studio acoustics and unplugged performances';
    gradient = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    const acousticHits = await searchSongs('acoustic guitar unplugged studio songs', 25);
    acousticHits.forEach(s => {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        results.push(s);
      }
    });
  }

  // 4. Global Pulse (Chart-toppers & viral hits)
  else {
    playlistTitle = 'Global Pulse';
    playlistDescription = 'The biggest chart-toppers and viral hits streaming right now';
    gradient = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    const trendingHits = await getTrendingSongs(25);
    trendingHits.forEach(s => {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        results.push(s);
      }
    });
  }

  // Fallback if empty
  if (results.length === 0) {
    results = await getTrendingSongs(20);
  }

  // Shuffle results slightly for variety while keeping top matches
  const topSlice = results.slice(0, 5);
  const remaining = results.slice(5).sort(() => 0.5 - Math.random());
  const finalSongs = [...topSlice, ...remaining].slice(0, 25);

  return {
    id: `auto_${type}_${Date.now()}`,
    type,
    title: playlistTitle,
    description: playlistDescription,
    gradient,
    songCount: finalSongs.length,
    generatedAt: new Date().toISOString(),
    songs: finalSongs
  };
}
