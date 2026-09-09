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

// ─────────────────────────────────────────────────────────────────────────────
// Mood / Genre palette (rotates to keep the feed fresh on every regenerate)
// ─────────────────────────────────────────────────────────────────────────────
const MOOD_PALETTE = [
  { mood: 'Chill Vibes',   queries: ['chill relaxing songs', 'lo-fi chill beats'] },
  { mood: 'High Energy',   queries: ['high energy upbeat songs', 'power workout hits'] },
  { mood: 'Acoustic',      queries: ['acoustic guitar unplugged songs', 'acoustic cover hits'] },
  { mood: 'Focus Flow',    queries: ['focus deep work instrumental', 'study playlist calm'] },
  { mood: 'Party Night',   queries: ['party pop dance songs', 'club banger hits'] },
  { mood: 'Romantic',      queries: ['romantic love songs hindi', 'romantic english ballads'] },
  { mood: 'Hip-Hop',       queries: ['hip hop rap hits', 'trap beats rap'] },
  { mood: 'Indie',         queries: ['indie alternative songs', 'indie pop hits'] },
  { mood: 'Bollywood',     queries: ['bollywood top hits', 'latest bollywood songs'] },
  { mood: 'Devotional',    queries: ['devotional bhajan songs', 'spiritual songs'] },
];

/**
 * Shared dedup + interleave helper.
 * Pulls up to `perBucket` items from each bucket in round-robin fashion,
 * then Fisher-Yates shuffles the remainder.
 */
function interleaveAndShuffle(buckets, totalLimit = 25, perBucket = 5) {
  const seen = new Set();
  const result = [];

  // Round-robin pass: take perBucket from each bucket
  const maxRounds = Math.ceil(totalLimit / buckets.length);
  for (let round = 0; round < maxRounds && result.length < totalLimit; round++) {
    for (const bucket of buckets) {
      if (result.length >= totalLimit) break;
      const item = bucket[round];
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    }
  }

  // Fisher-Yates shuffle to randomise ordering
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates an Auto-Playlist based on recent listening history and matching artists.
 * All four modes (vibe-radar, radio, acoustics, global) now use parallel fetching
 * + interleave + Fisher-Yates shuffle for a fresh mixed feed every time.
 */
export async function generateAutoPlaylist({ recentSongs = [], type = 'vibe-radar', seedSong = null }) {
  let playlistTitle = 'Auto Mix';
  let playlistDescription = 'Generated automatically just for you';
  let gradient = 'linear-gradient(135deg, #ff4b72 0%, #7b2cbf 100%)';

  // Rotating mood index based on current minute — changes naturally over time
  const moodIndex = Math.floor(Date.now() / 60000) % MOOD_PALETTE.length;
  const activeMood = MOOD_PALETTE[moodIndex];

  // ── 1. VIBE RADAR ────────────────────────────────────────────────────────────
  if (type === 'vibe-radar') {
    playlistTitle = `Your Vibe Radar · ${activeMood.mood}`;
    playlistDescription = `Multi-source mix: your artists + ${activeMood.mood} vibes + trending discoveries`;
    gradient = 'linear-gradient(135deg, #ff758c 0%, #c471ed 50%, #12c2e9 100%)';

    // Extract up to 5 unique primary artists from recent history
    const recentArtists = [];
    recentSongs.forEach(s => {
      if (s.artist) {
        const primary = s.artist.split(/[,&]/)[0].trim();
        if (primary && !recentArtists.includes(primary)) recentArtists.push(primary);
      }
    });
    const topArtists = recentArtists.slice(0, 5);

    // Build all queries to fire in parallel
    const artistQueries = topArtists.map(a => searchSongs(`${a} hits songs`, 8));
    const mood1 = searchSongs(activeMood.queries[0], 10);
    const mood2 = searchSongs(activeMood.queries[1] || activeMood.queries[0], 8);
    const discovery = searchSongs('new music discoveries popular', 8);
    const trending  = getTrendingSongs(10);

    // Fire ALL in parallel — massive speed improvement
    const allResults = await Promise.all([...artistQueries, mood1, mood2, discovery, trending]);

    // Interleave & shuffle across all buckets
    const finalSongs = interleaveAndShuffle(allResults, 25, 5);

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

  // ── 2. ARTIST RADIO ──────────────────────────────────────────────────────────
  if (type === 'radio' && seedSong) {
    const artistFirst = seedSong.artist ? seedSong.artist.split(/[,&]/)[0].trim() : '';
    const language    = seedSong.language || '';
    playlistTitle       = `Radio: ${artistFirst || seedSong.title}`;
    playlistDescription = `Endless flow inspired by ${artistFirst} — matching artist, mood & genre`;
    gradient = 'linear-gradient(135deg, #e056fd 0%, #686de0 100%)';

    // Parallel: artist top songs, artist similar style, language/mood match, mood palette
    const [artistTop, artistSimilar, langMatch, moodMatch, trendMatch] = await Promise.all([
      searchSongs(artistFirst ? `${artistFirst} top songs`   : seedSong.title, 10),
      searchSongs(artistFirst ? `${artistFirst} similar songs` : seedSong.title, 8),
      searchSongs(language ? `${language} ${activeMood.queries[0]}` : activeMood.queries[0], 8),
      searchSongs(activeMood.queries[1] || activeMood.queries[0], 6),
      getTrendingSongs(8),
    ]);

    // Exclude the seed song itself from all buckets
    const filterSeed = arr => arr.filter(s => s.id !== seedSong?.id);
    const finalSongs = interleaveAndShuffle(
      [filterSeed(artistTop), filterSeed(artistSimilar), filterSeed(langMatch), filterSeed(moodMatch), filterSeed(trendMatch)],
      25, 5
    );

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

  // ── 3. ACOUSTIC CHILL ────────────────────────────────────────────────────────
  if (type === 'acoustics') {
    playlistTitle       = 'Acoustic Sessions';
    playlistDescription = 'Pure, stripped-back studio acoustics and unplugged performances';
    gradient = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';

    const [a1, a2, a3, a4] = await Promise.all([
      searchSongs('acoustic guitar unplugged studio songs', 10),
      searchSongs('acoustic cover hits popular', 10),
      searchSongs('soft acoustic folk singer songwriter', 8),
      searchSongs('unplugged live session intimate', 8),
    ]);

    const finalSongs = interleaveAndShuffle([a1, a2, a3, a4], 25, 7);
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

  // ── 4. GLOBAL PULSE ──────────────────────────────────────────────────────────
  playlistTitle       = 'Global Pulse';
  playlistDescription = 'The biggest chart-toppers and viral hits streaming right now';
  gradient = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';

  const [trending1, trending2, viral] = await Promise.all([
    getTrendingSongs(15),
    searchSongs('global top hits viral songs 2024', 10),
    searchSongs('trending worldwide pop songs', 10),
  ]);

  const finalSongs = interleaveAndShuffle([trending1, trending2, viral], 25, 9);
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


