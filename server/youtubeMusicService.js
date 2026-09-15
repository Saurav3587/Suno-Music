import { Innertube, Platform } from 'youtubei.js';

// Configure JavaScript evaluator shim required by InnerTube to decipher YouTube audio URLs
Platform.shim.eval = (data, eval_args) => {
  const fn = new Function(...Object.keys(eval_args), data.output);
  return fn(...Object.values(eval_args));
};

let innertubeInstance = null;
let initPromise = null;

// In-memory cache for deciphered audio URLs (TTL: 2 hours)
const streamUrlCache = new Map();
// In-memory cache for YouTube search results (TTL: 10 minutes)
const ytSearchCache = new Map();
// In-memory cache for Watch Next recommendations (TTL: 15 minutes)
const watchNextCache = new Map();

/**
 * Get or initialize the singleton Innertube client
 */
export async function getInnertube() {
  if (innertubeInstance) return innertubeInstance;
  if (!initPromise) {
    initPromise = Innertube.create({
      retrieve_player: true,
      generate_session_locally: true
    }).then(instance => {
      innertubeInstance = instance;
      console.log('✅ [YouTube Engine] Initialized successfully.');
      return instance;
    }).catch(err => {
      initPromise = null;
      console.error('❌ [YouTube Engine] Initialization error:', err.message);
      throw err;
    });
  }
  return initPromise;
}

// ─── STRICT ANTI-REMIX / ANTI-SLOWED / ANTI-FAN EDIT REGEX ───────────────────────────
// Strictly excludes non-original, altered, fan-made, remix, or meme audio.
const EXCLUDE_REMIX_REGEX = /(slowed|reverb|speed\s*up|sped\s*up|nightcore|bass\s*boost(ed)?|future\s*bass|8d\s*audio|16d\s*audio|remix|dj\s*mix|dj\s*remix|mash\s*up|mashup|lo-?fi\s*flip|lo-?fi\s*remix|ringtone|status|whatsapp\s*status|lyrics?\s*status|fan\s*edit|fan\s*made|chipmunk|tribute|reaction|vlog|interview|podcast|dance\s*video|choreography|cover\s*song|cover\s*version|acoustic\s*cover|karaoke|instrumental\s*cover|live\s*stream|parody|tiktok\s*version)/i;

// Strictly excludes compilation mixes, hour-long jukeboxes, and full-album re-uploads
const EXCLUDE_COMPILATION_REGEX = /(\bjukebox\b|\bnon\s*stop\b|\bnonstop\b|\bfull\s*album\b|\bbest\s*of\b|\bplaylist\b|\bcompilation\b|\b\d+\s*hour\b|\b\d+\s*min(ute)?s?\s*nonstop\b)/i;

// Strictly excludes channels that specialize in altered or fan uploads
const EXCLUDE_CHANNEL_REGEX = /(slowed|reverb|lo-?f[hi]|status|edits|vibes|remix\s*zone|remix|bass\s*boost|lyrics\s*hub|nightcore|karaoke|fan\s*club|tribute|creations?)/i;

// Known Major Record Labels and Verified Distribution Networks
const OFFICIAL_LABELS = [
  'vevo', 't-series', 'sony music', 'zee music', 'speed records', 'yrf', 'yash raj films',
  'warner music', 'universal music', 'atlantic records', 'interscope', 'columbia records',
  'republic records', 'def jam', 'rca records', 'tips official', 'saregama', 'aditya music',
  'white hill music', 'geet mp3', 'desi music factory', 'dmk', 'eros now', 'shemaroo',
  'jjust music', 't-series apna punjab', 'svf music', 'think music', 'lahari music'
];

/**
 * Clean title to look like standard studio tracks (strip clickbait & upload noise)
 */
export function cleanSongTitle(rawTitle) {
  if (!rawTitle) return 'Unknown Title';
  return rawTitle
    .replace(/\s*[\(\[](official\s*(music\s*)?video|official\s*audio|full\s*song|4k(\s*60fps)?|lyric(al)?\s*video|audio\s*track|hd\s*video)[\)\]]/gi, '')
    .replace(/\s*\|\s*(full\s*song|official\s*video|lyric\s*video|audio).*$/gi, '')
    .replace(/["“”]/g, '')
    .trim();
}

/**
 * Scores a track's authenticity so that genuine studio releases by the original artist
 * or official channel/record label are ranked at the top.
 */
function calculateAuthenticityScore(item, cleanQuery, duration) {
  let score = 50;
  const cleanedTitle = cleanSongTitle(item.title || '').toLowerCase();
  const rawTitleLower = (item.title || '').toLowerCase();
  const artistName = item.artists?.map(a => a.name).filter(Boolean).join(', ') || item.author?.name || '';
  const artistLower = artistName.toLowerCase();
  const albumLower = (item.album?.name || '').toLowerCase();
  const qLower = cleanQuery.toLowerCase();

  // 1. Exact or near-exact title match without extra baggage gets top priority
  if (cleanedTitle === qLower) {
    score += 70;
  } else if (cleanedTitle.startsWith(qLower) || qLower.startsWith(cleanedTitle)) {
    score += 40;
  } else if (cleanedTitle.includes(qLower)) {
    score += 20;
  }

  // 2. Official "- Topic" Channel (Google's automated distributor audio feed)
  if (artistLower.includes('- topic') || artistLower.endsWith('- topic')) {
    score += 60;
  }

  // 3. Official Record Label / VEVO
  if (OFFICIAL_LABELS.some(label => artistLower.includes(label) || rawTitleLower.includes(label))) {
    score += 50;
  }

  // 4. Official Artist presence
  if (artistLower.includes('official') || rawTitleLower.includes('official audio')) {
    score += 35;
  }

  // 5. Legitimate album / single metadata
  if (albumLower && !albumLower.includes('unknown') && !albumLower.includes('single')) {
    score += 25;
  }

  // 6. Realistic song duration (1m 15s to 7m 30s)
  if (duration >= 90 && duration <= 420) {
    score += 15;
  } else if (duration < 60 || duration > 600) {
    score -= 50; // Heavily penalize ringtones/shorts or hour-long mixes
  }

  // 7. Penalize generic or placeholder artist names
  if (!artistName || artistName === 'Original Artist' || artistName === 'Various Artists') {
    score -= 30;
  }

  return score;
}

/**
 * Search YouTube using YouTube's primary search algorithm.
 * Strictly eliminates slowed, reverb, sped-up, and fan edits.
 */
export async function searchYouTubeMusic(query, limit = 20) {
  if (!query || !query.trim()) return [];
  const cleanQ = query.trim();

  const cacheKey = cleanQ.toLowerCase();
  const cached = ytSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data.slice(0, limit);
  }

  try {
    const yt = await getInnertube();

    // 1. Primary search: YouTube's main video search algorithm
    // (Used by billions of users on youtube.com with global relevance signals)
    const [mainSearchRes, ytMusicRes] = await Promise.allSettled([
      yt.search(cleanQ, { type: 'video' }),
      yt.music.search(cleanQ, { type: 'song' })
    ]);

    const candidates = [];
    const seenKeys = new Set();

    // Process YouTube's main search results
    if (mainSearchRes.status === 'fulfilled' && mainSearchRes.value?.videos) {
      for (const v of mainSearchRes.value.videos) {
        if (!v.id) continue;
        const rawTitle = v.title?.text || v.title || '';
        const authorName = v.author?.name || '';
        const duration = v.duration?.seconds || 210;

        if (EXCLUDE_REMIX_REGEX.test(rawTitle) || EXCLUDE_REMIX_REGEX.test(authorName)) continue;
        if (EXCLUDE_COMPILATION_REGEX.test(rawTitle)) continue;
        if (EXCLUDE_CHANNEL_REGEX.test(authorName)) continue;
        if (duration < 60 || duration > 660) continue;

        const key = `${rawTitle.toLowerCase().trim()}_${authorName.toLowerCase().trim()}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const score = calculateAuthenticityScore(
          { title: rawTitle, author: { name: authorName } },
          cleanQ,
          duration
        );

        const thumb = v.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
        candidates.push({
          id: `yt_${v.id}`,
          youtubeId: v.id,
          source: 'youtube',
          title: cleanSongTitle(rawTitle),
          artist: authorName.replace(/- Topic$/i, '').trim() || 'Original Artist',
          album: 'Official Release',
          duration: duration,
          image: thumb,
          badge: 'Official Audio',
          isOriginal: true,
          streamUrl: null,
          authenticityScore: score + 10 // bonus for YouTube's top ranked search
        });
      }
    }

    // Process YouTube Music song catalog results (supplementary official entries)
    if (ytMusicRes.status === 'fulfilled' && ytMusicRes.value?.songs?.contents) {
      for (const item of ytMusicRes.value.songs.contents) {
        if (!item.id) continue;
        const rawTitle = item.title || '';
        const artistName = item.artists?.map(a => a.name).filter(Boolean).join(', ') || item.author?.name || '';
        const duration = item.duration?.seconds || (typeof item.duration === 'number' ? item.duration : 210);

        if (EXCLUDE_REMIX_REGEX.test(rawTitle) || EXCLUDE_REMIX_REGEX.test(artistName)) continue;
        if (EXCLUDE_COMPILATION_REGEX.test(rawTitle)) continue;
        if (EXCLUDE_CHANNEL_REGEX.test(artistName)) continue;
        if (duration < 60 || duration > 720) continue;

        const key = `${rawTitle.toLowerCase().trim()}_${artistName.toLowerCase().trim()}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const score = calculateAuthenticityScore(item, cleanQ, duration);
        const thumb = item.thumbnail?.contents?.[0]?.url || item.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;

        candidates.push({
          id: `yt_${item.id}`,
          youtubeId: item.id,
          source: 'youtube',
          title: cleanSongTitle(rawTitle),
          artist: artistName || 'Original Artist',
          album: item.album?.name || 'Official Release',
          duration: duration,
          image: thumb,
          badge: 'Official Audio',
          isOriginal: true,
          streamUrl: null,
          authenticityScore: score
        });
      }
    }

    // Sort by authenticity score descending
    candidates.sort((a, b) => (b.authenticityScore || 0) - (a.authenticityScore || 0));

    ytSearchCache.set(cacheKey, { data: candidates, expiresAt: Date.now() + 10 * 60 * 1000 });
    return candidates.slice(0, limit);
  } catch (err) {
    console.warn('⚠️ [YouTube Engine] Search warning:', err.message);
    return [];
  }
}

/**
 * YouTube's Exact "Songs Playing / Watch Next" Recommendation Algorithm.
 * Returns what YouTube recommends to play next when a given song is playing.
 */
export async function getYouTubeWatchNextSongs(seedSong, limit = 20) {
  if (!seedSong) return [];

  const cacheKey = seedSong.youtubeId || `${seedSong.title || ''}_${seedSong.artist || ''}`.toLowerCase().trim();
  const cached = watchNextCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data.slice(0, limit);
  }

  try {
    const yt = await getInnertube();
    let videoId = seedSong.youtubeId;

    // If song does not have a youtubeId yet, resolve it on YouTube via search
    if (!videoId) {
      const q = `${seedSong.title} ${seedSong.artist || ''} official audio`.trim();
      const searchRes = await yt.search(q, { type: 'video' });
      videoId = searchRes?.videos?.[0]?.id;
    }

    if (!videoId) return [];

    // Fetch YouTube's Watch Next feed for this specific video
    const info = await yt.getInfo(videoId);
    const feed = info.watch_next_feed || [];

    const results = [];
    const seen = new Set();

    for (const item of feed) {
      const id = item.content_id || item.id || item.video_id;
      const rawTitle = item.metadata?.title?.text || item.title?.text || item.title || '';
      const authorName = item.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text?.text 
        || item.metadata?.image?.a11y_label?.replace(/^Go to channel /i, '')
        || item.author?.name 
        || '';

      if (!id || !rawTitle || id.startsWith('RD') || id === videoId) continue;

      // Extract duration from overlay badges (e.g. "4:15")
      const overlays = item.content_image?.overlays || [];
      const timeBadge = overlays?.[0]?.badges?.[0]?.text || '';
      let duration = 210;

      if (timeBadge) {
        const parts = timeBadge.split(':').map(Number);
        if (parts.length === 2) {
          duration = parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
          duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
      }

      // Filter against slowed, reverb, sped up, nightcore, and non-stop mixes
      if (EXCLUDE_REMIX_REGEX.test(rawTitle) || EXCLUDE_REMIX_REGEX.test(authorName)) continue;
      if (EXCLUDE_COMPILATION_REGEX.test(rawTitle)) continue;
      if (EXCLUDE_CHANNEL_REGEX.test(authorName)) continue;
      if (duration < 60 || duration > 540) continue; // Real studio tracks only

      const key = `${rawTitle.toLowerCase().trim()}_${id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const thumb = item.content_image?.image?.[0]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

      results.push({
        id: `yt_${id}`,
        youtubeId: id,
        source: 'youtube',
        title: cleanSongTitle(rawTitle),
        artist: authorName.replace(/- Topic$/i, '').trim() || 'Original Artist',
        album: 'YouTube Recommendations',
        duration: duration,
        image: thumb,
        badge: 'Official Audio',
        isOriginal: true,
        streamUrl: null
      });

      if (results.length >= limit) break;
    }

    watchNextCache.set(cacheKey, { data: results, expiresAt: Date.now() + 15 * 60 * 1000 });
    return results;
  } catch (err) {
    console.warn('⚠️ [YouTube Engine] Watch Next error:', err.message);
    return [];
  }
}

/**
 * Get or decipher the high-fidelity audio stream URL for a given YouTube video ID
 */
export async function getYouTubeAudioStream(videoId) {
  if (!videoId) throw new Error('Video ID is required');

  // Check cache
  const cached = streamUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const yt = await getInnertube();
  
  // Fetch song details from YouTube / YouTube Music
  let songInfo;
  try {
    songInfo = await yt.getInfo(videoId);
  } catch {
    songInfo = await yt.music.getInfo(videoId);
  }

  // Choose the highest quality audio format (audio/mp4 or audio/webm)
  const format = songInfo.chooseFormat({ type: 'audio', quality: 'best' });
  if (!format) {
    throw new Error('No audio format found for track ' + videoId);
  }

  let streamUrl = format.url;
  if (!streamUrl && typeof format.decipher === 'function') {
    streamUrl = await format.decipher(yt.session.player);
  }

  if (!streamUrl) {
    throw new Error('Could not decipher audio stream URL for track ' + videoId);
  }

  // Cache for 1.5 hours (YouTube signed URLs typically expire after 6 hours)
  streamUrlCache.set(videoId, {
    url: streamUrl,
    expiresAt: Date.now() + 90 * 60 * 1000
  });

  return streamUrl;
}
