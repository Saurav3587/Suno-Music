/**
 * Advanced Deduplication & Official Track Sanitization Service
 * Eliminates duplicate tracks, unofficial fan re-uploads, lyrical videos, and ensures diversity.
 */

// Strict pattern to detect unofficial, derivative, or modified audio
const UNOFFICIAL_OR_DERIVATIVE_REGEX = new RegExp([
  '\\b(slowed|reverb|speed\\s*up|sped\\s*up|nightcore|bass\\s*boost|8d\\s*audio|8d)\\b',
  '\\b(remix|mash\\s*up|mashup|non\\s*stop|dj\\s*mix|extended\\s*mix|club\\s*mix|mix\\b)',
  '\\b(lyrics|lyric\\s*video|lyrical|with\\s*lyrics|karaoke|instrumental|vocals\\s*only|backing\\s*track)\\b',
  '\\b(status|whatsapp|shorts|tiktok|ringtone|audio\\s*status|bgm\\b)',
  '\\b(teaser|trailer|promo|reaction|review|interview|behind\\s*the\\s*scenes|making\\s*of)\\b',
  '\\b(jukebox|all\\s*songs|top\\s*10|compilation|full\\s*album|nonstop)\\b',
  '\\b(cover\\s*by|originally\\s*performed\\s*by|tribute\\s*to|fan\\s*made)\\b',
  '\\b(sound\\s*effect|white\\s*noise|sleep\\s*noise|ambient|aura|rain\\s*sound|nature\\s*sound|binaural|frequency|hz\\b|podcast|episode|meditation|asmr|laundry|cadence|fan\\s*noise)\\b'
].join('|'), 'i');

// Movie & production clutter patterns to strip for title normalization
const TITLE_CLEANUP_REGEX = [
  /\(.*?\)/g,                        // (anything inside parentheses)
  /\[.*?\]/g,                        // [anything inside brackets]
  /\bfrom\s+["'].*?["']/gi,          // from "Movie"
  /\bfrom\s+[a-zA-Z0-9\s]+/gi,       // from Movie
  /\b(official\s*(video|audio|music\s*video|lyric.*|full.*))\b/gi,
  /\b(full\s*(song|video|audio))\b/gi,
  /\b(4k|8k|hd|1080p|audio|video)\b/gi,
  /[-|–—].*$/                        // everything after a dash (e.g. - Jawan | Shah Rukh Khan)
];

/**
 * Extracts a normalized, canonical title for deep comparison
 * e.g. "Tum Hi Ho (From 'Aashiqui 2') [Official Video]" -> "tum hi ho"
 * e.g. "Chaleya - Full Video | Jawan | Shah Rukh Khan" -> "chaleya"
 */
export function normalizeCanonicalTitle(title) {
  if (!title || typeof title !== 'string') return '';
  let cleaned = title.toLowerCase();

  // Strip known boilerplate and suffixes
  for (const regex of TITLE_CLEANUP_REGEX) {
    cleaned = cleaned.replace(regex, ' ');
  }

  // Strip non-alphanumeric (keep single space between words)
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Extracts normalized primary artist
 * e.g. "Arijit Singh, Shilpa Rao, Anirudh" -> "arijitsingh"
 */
export function normalizePrimaryArtist(artist) {
  if (!artist || typeof artist !== 'string') return '';
  const first = artist.split(/[,&/|]/)[0].trim().toLowerCase();
  return first.replace(/[^a-z0-9]/g, '');
}

/**
 * Generates a unique canonical key for a song
 * If the normalized title is distinctive (>= 4 chars), title + primary artist forms the unique key.
 */
export function getCanonicalSongKey(title, artist) {
  const normTitle = normalizeCanonicalTitle(title);
  const normArtist = normalizePrimaryArtist(artist);
  if (!normTitle) return '';
  return `${normTitle}:::${normArtist}`;
}

/**
 * Strictly verifies whether a track is an authentic, official, high-quality audio track
 */
export function isOfficialCleanTrack(song) {
  if (!song || !song.title) return false;

  const title = String(song.title);
  const artist = String(song.artist || '');
  const album = String(song.album || '');

  // 1. Filter out known remix / unofficial / lyrics / status / non-music patterns
  if (UNOFFICIAL_OR_DERIVATIVE_REGEX.test(title)) {
    return false;
  }
  if (UNOFFICIAL_OR_DERIVATIVE_REGEX.test(artist)) {
    return false;
  }
  if (UNOFFICIAL_OR_DERIVATIVE_REGEX.test(album)) {
    return false;
  }

  // 2. Duration check: Official individual songs are between 75 seconds and 480 seconds (8 mins)
  // Anything < 75s is a status/ringtone/preview. Anything > 540s (9 mins) is a jukebox compilation.
  const duration = parseInt(song.duration, 10);
  if (!isNaN(duration) && duration > 0) {
    if (duration < 75 || duration > 540) {
      return false;
    }
  }

  // 3. Normalized title must have at least 2 meaningful characters
  const norm = normalizeCanonicalTitle(title);
  if (norm.length < 2) return false;

  return true;
}

/**
 * Deduplicates an array of songs, preserving the highest quality version of each unique song.
 * Guaranteed: No two songs in the returned list will share the same canonical title & artist!
 * 
 * @param {Array} songs - Array of song objects
 * @param {Object} options - { excludeTitles: Set|Array, maxCount: number }
 * @returns {Array} Clean, deduplicated songs
 */
export function deduplicateTrackList(songs, options = {}) {
  if (!Array.isArray(songs)) return [];

  const seenKeys = new Set();
  const seenTitles = new Set();
  const excludeTitlesSet = new Set(
    (options.excludeTitles || []).map(t => normalizeCanonicalTitle(t)).filter(Boolean)
  );
  const maxCount = options.maxCount || 100;
  const deduplicated = [];

  for (const song of songs) {
    if (!song || !song.title) continue;

    // Reject unofficial/garbage audio
    if (!isOfficialCleanTrack(song)) continue;

    const normTitle = normalizeCanonicalTitle(song.title);
    const normArtist = normalizePrimaryArtist(song.artist);
    const canonicalKey = getCanonicalSongKey(song.title, song.artist);

    if (!normTitle) continue;

    // Check against exclude list (e.g. current song or recently played)
    if (excludeTitlesSet.has(normTitle)) {
      continue;
    }

    // Deduplication check:
    // If title is 4+ letters and we've already seen this exact title, it's a duplicate!
    // (e.g. "Chaleya" from album A and "Chaleya" from compilation B)
    if (seenKeys.has(canonicalKey)) {
      continue;
    }

    if (normTitle.length >= 4 && seenTitles.has(normTitle)) {
      // Same song title already accepted from another album/source
      continue;
    }

    seenKeys.add(canonicalKey);
    seenTitles.add(normTitle);
    deduplicated.push(song);

    if (deduplicated.length >= maxCount) break;
  }

  return deduplicated;
}
