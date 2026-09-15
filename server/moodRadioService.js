import { searchSongs } from './autoPlaylistService.js';
import { deduplicateTrackList } from './dedupService.js';
import { getYouTubeWatchNextSongs } from './youtubeMusicService.js';

const MOOD_RULES = [
  {
    id: 'bhakti',
    label: 'Divine & Bhakti',
    regex: /(bhajan|bhakti|aarti|chalisa|krishna|shiva|shiv|ram|hanuman|ganesh|mata|devi|khatu|shyam|govind|radha|radhe|vrindavan|mahadev|shambhu|om|har har|shankara|kedarnath|divine|chant|mantra|spiritual|kirtan|darshan|ganga|guru|waheguru|gurbani|aradhana|prarthana|raghuwanshi|anuradha paudwal|lakha|anup jalota|mahakal|bholenath|damru|rudra|narayan|vishnu|balaji|sai baba|tirupati|jai shri ram|ganpati|bajrangbali|shri ram|coke studio bharat.*arz)/i,
    queries: (song) => {
      const text = ((song.title || '') + ' ' + (song.artist || '')).toLowerCase();
      if (/shiv|mahadev|shambhu|shankara|kedarnath/i.test(text)) {
        return ['shiv bhajan', 'har har shambhu', 'shiv tandav stotram', 'namo namo kedarnath'];
      }
      if (/krishna|radha|radhe|govind|vrindavan/i.test(text)) {
        return ['krishna bhajan', 'achutam keshavam', 'radhe radhe barsane', 'shri krishna govind'];
      }
      if (/ram|hanuman|chalisa|bajrangbali/i.test(text)) {
        return ['ram siya ram', 'hanuman chalisa', 'mangal bhavan amangal hari', 'ram aayenge'];
      }
      return ['krishna bhajan', 'shiv bhajan', 'ram siya ram', 'peaceful bhajan hindi'];
    }
  },
  {
    id: 'sad',
    label: 'Sad & Heartbroken',
    regex: /(sad|dard|judai|judaai|heartbreak|channa mereya|agar tum saath ho|kabira|tadap|tanhai|alvida|adhuri kahani|tujhe bhula diya|bekhayali|khairiyat|ae dil hai mushkil|qismat|b praak|jaani|broken|alone|crying|rona|aansu|bhula dena|dil tod|tumko chaahunga|tera chehra|jag ghoomeya sad|humdard|roye|mann bharryaa|filhall|dhokha|bewafa|tanha|dua karo|kaun tujhe|tera zikr|humnava mere)/i,
    queries: (song) => {
      const artist = (song.artist || '').toLowerCase();
      if (artist.includes('b praak') || artist.includes('jaani')) {
        return ['b praak sad songs', 'filhall', 'qismat b praak', 'channa mereya'];
      }
      return ['arijit singh sad', 'b praak sad', 'channa mereya', 'agar tum saath ho'];
    }
  },
  {
    id: 'punjabi',
    label: 'Punjabi Hits',
    regex: /(punjabi|diljit|ap dhillon|karan aujla|shubh|sidhu moose wala|hustinder|amrit maan|jordan sandhu|cheques|elevated|lover|born to shine|softly|tauba tauba|gaddi|jatt|pind|yaari|bhangra|chorni|white brown black|excuses|with you|dhurandhar|arjan vailly|wavy|low fade|boy friend)/i,
    queries: (song) => ['karan aujla hits', 'ap dhillon', 'diljit dosanjh', 'shubh punjabi']
  },
  {
    id: 'acoustic_indie',
    label: 'Indie & Acoustics',
    regex: /(acoustic|unplugged|anuv jain|prateek kuhad|when chai met toast|the local train|baarishein|kasoor|alag aasmaan|zaeden|indie|ocean|reprise|guitar|lo-fi|lofi|strings)/i,
    queries: (song) => ['anuv jain acoustic', 'prateek kuhad acoustic', 'hindi acoustic unplugged', 'soft indie guitar hindi']
  },
  {
    id: 'sufi',
    label: 'Sufi & Qawwali',
    regex: /(sufi|qawwali|khwaja|kun faya kun|nusrat|rahat|kailash kher|chaap tilak|afreen|ar rahman sufi|dama dam mast qalandar|ali maula|tere bin nahi lagda|rashke qamar|sajda|mast magan|khawaja mere khawaja|saiyyan|teri deewani|chhap tilak)/i,
    queries: (song) => ['kun faya kun', 'nusrat fateh ali khan sufi', 'rahat sufi songs', 'coke studio sufi']
  },
  {
    id: 'party',
    label: 'Party & Dance',
    regex: /(party|dance|club|remix|dj|badshah|honey singh|neha kakkar|nach|kala chashma|kar gayi chull|hookah bar|abhi toh party|proper patola|makhna|chittiyan kalaiyaan|bom diggy|garmi|sheila ki jawani|chammak challo|balam pichkari|aayi nai|ankhiyon se goli)/i,
    queries: (song) => ['badshah party hits', 'bollywood party dance', 'hindi club dance hits', 'honey singh party']
  },
  {
    id: 'retro',
    label: 'Evergreen Classics',
    regex: /(kishore kumar|mohammed rafi|lata mangeshkar|mukesh|rd burman|r\.d\. burman|asha bhosle|alka yagnik|kumar sanu|udit narayan|sonu nigam 90s|90s|retro|evergreen|purane gaane|chura ke dil|tujhe dekha to|pehla nasha|roop tera mastana)/i,
    queries: (song) => ['kumar sanu alka yagnik hits', 'evergreen 90s hindi songs', 'kishore kumar romantic hits', '90s romantic bollywood']
  },
  {
    id: 'western_pop',
    label: 'Global Pop & Acoustic',
    regex: /(ed sheeran|taylor swift|the weeknd|justin bieber|billie eilish|coldplay|post malone|dua lipa|drake|adele|charlie puth|shawn mendes|maroon 5|bruno mars|ariana grande|tame impala|malcolm todd|katy perry|karol g)/i,
    queries: (song) => {
      const primaryArtist = (song.artist || '').split(/[,&]/)[0].trim();
      return [`${primaryArtist} hits`, 'global acoustic pop', 'billboard hot hits', 'chill english pop'];
    }
  },
  {
    id: 'romantic',
    label: 'Romantic Melodies',
    regex: /(ishq|pyaar|pyar|mohabbat|love|romantic|apna bana le|kesariya|hawayein|raataan lambiyan|pehle bhi main|saiyaara|tum hi ho|gehra hua|tera mera rishta|ve junoon|baarish|sanam|deewana|dhadkan|chaahat|dil diya gallan|humsafar|nazm nazm|samjhawan|raabta|soch na sake|vaaron|rabba|zaalima|tere hawaale|lut gaye)/i,
    queries: (song) => ['arijit romantic', 'latest hindi love songs', 'romantic bollywood hits', 'soulful romantic hindi']
  }
];

/**
 * Detects the mood and genre classification of any song
 */
export function detectSongMoodAndGenre(song = {}) {
  const text = `${song.title || ''} ${song.artist || ''} ${song.album || ''}`.toLowerCase();

  for (const rule of MOOD_RULES) {
    if (rule.regex.test(text)) {
      return {
        id: rule.id,
        label: rule.label,
        queries: rule.queries(song)
      };
    }
  }

  // Fallback: artist-driven radio
  const primaryArtist = (song.artist || '').split(/[,&]/)[0].trim();
  return {
    id: 'artist_radio',
    label: primaryArtist ? `${primaryArtist} Radio` : 'Similar Songs',
    queries: primaryArtist ? [`${primaryArtist} songs`, `${primaryArtist} hits`] : ['top hindi hits']
  };
}

export function getCanonicalTitle(str) {
  if (!str) return '';
  let s = String(str).toLowerCase();
  // Strip parenthesized and bracketed content
  s = s.replace(/\(.*?\)/g, ' ').replace(/\[.*?\]/g, ' ');

  // Remove common YouTube and label prefixes
  s = s.replace(/^(full\s*(song|video|audio)?|video\s*song|lyrical(\s*video)?|official\s*(video|audio|music\s*video|track)?|audio|song|t-series|zee music)\s*[:|\-–—]\s*/gi, ' ');

  // If there are delimiters, pick the most relevant song title segment
  const parts = s.split(/[:|\-–—]/).map(p => p.trim()).filter(Boolean);
  const junkWords = /^(official|video|audio|full|song|lyric|lyrical|t-series|zee music|music video|cover|remix|hd|4k|mp3|film version)$/i;
  let best = '';
  for (const part of parts) {
    const cleaned = part.replace(/\b(official\s*(video|audio|music\s*video|lyric.*|full.*|track)|full\s*(song|video|audio)|video\s*song|lyric(al)?\s*(video|song)?|audio\s*song|song|audio|video)\b/gi, '').trim();
    if (cleaned.length >= 2 && !junkWords.test(cleaned)) {
      best = cleaned;
      break;
    }
  }
  if (!best && parts.length > 0) best = parts[0];

  return best.replace(/[^a-z0-9]/gi, '').toLowerCase().trim();
}


/**
 * Generates an intelligent, cohesive queue matching the seed song's genre & mood,
 * seamlessly blended with the user's recent listening history and favored artists,
 * strictly filtering out previously heard songs so tracks never repeat.
 */
export async function generateSimilarMoodQueue(seedSong, candidateTracks = [], recentSongs = [], playedTitles = []) {
  if (!seedSong) return { mood: 'general', moodLabel: 'All Songs', songs: [] };

  const detected = detectSongMoodAndGenre(seedSong);
  const seedArtist = (seedSong.artist || '').split(/[,&]/)[0].trim();

  // 1. Build Anti-Repetition Exclusion Set:
  // Disallow already played titles, recent listening history, and the seed song itself.
  const disallowed = new Set();
  const seedNorm = getCanonicalTitle(seedSong.title);
  if (seedNorm) disallowed.add(seedNorm);

  if (Array.isArray(playedTitles)) {
    for (const pt of playedTitles) {
      const norm = getCanonicalTitle(pt);
      if (norm) disallowed.add(norm);
    }
  }

  // Only disallow the immediate last 3 recent songs so the very last tracks don't replay immediately
  if (Array.isArray(recentSongs)) {
    for (const rs of recentSongs.slice(0, 3)) {
      if (!rs || !rs.title) continue;
      const norm = getCanonicalTitle(rs.title);
      if (norm) disallowed.add(norm);
    }
  }

  // 2. Extract User's Favorite Artists in this specific mood/genre:
  const recentMatchingArtists = [];
  const seenArtistNames = new Set();
  if (seedArtist) seenArtistNames.add(seedArtist.toLowerCase());

  if (Array.isArray(recentSongs)) {
    for (const rs of recentSongs) {
      if (!rs || !rs.title) continue;
      const rsMood = detectSongMoodAndGenre(rs);
      const rsArtist = (rs.artist || '').split(/[,&]/)[0].trim();

      if (rsMood.id === detected.id && rsArtist && !seenArtistNames.has(rsArtist.toLowerCase())) {
        seenArtistNames.add(rsArtist.toLowerCase());
        recentMatchingArtists.push(rsArtist);
      }
    }
  }

  // 3. Build diverse queries combining Mood/Genre + User's Taste:
  const queriesToRun = [];

  // A. Same artist in this genre
  if (seedArtist) {
    queriesToRun.push(`${seedArtist} ${detected.label || 'songs'}`);
  }

  // B. User's top favorite artists matching this genre
  if (recentMatchingArtists.length > 0) {
    queriesToRun.push(`${recentMatchingArtists[0]} ${detected.label || 'hits'}`);
    if (recentMatchingArtists.length > 1) {
      queriesToRun.push(`${recentMatchingArtists[1]} ${detected.label || 'songs'}`);
    }
  }

  // C. Curated flagship genre queries
  if (detected.queries && detected.queries.length > 0) {
    for (const q of detected.queries) {
      if (!queriesToRun.includes(q) && queriesToRun.length < 4) {
        queriesToRun.push(q);
      }
    }
  }

  // 4. Fetch Studio 320k tracks in parallel across all queries (fast ~280ms)
  const queryPromises = queriesToRun.map(q => searchSongs(q, 8).catch(() => []));

  // 5. Fetch YouTube Watch Next recommendations with a 1.8s timeout guard
  const ytPromise = Promise.race([
    getYouTubeWatchNextSongs(seedSong, 14).catch(() => []),
    new Promise(resolve => setTimeout(() => resolve([]), 1800))
  ]);

  const [queryResults, ytWatchNextSongs] = await Promise.all([
    Promise.all(queryPromises),
    ytPromise
  ]);

  const fetchedGenreTracks = (queryResults || []).flat();

  // 6. Filter candidate tracks from current view
  const matchingCandidates = (candidateTracks || []).filter(t => {
    if (!t || t.id === seedSong.id) return false;
    const itemMood = detectSongMoodAndGenre(t);
    return itemMood.id === detected.id;
  });

  // 7. Apply strict anti-repetition filter:
  const filteredCandidates = matchingCandidates.filter(t => !disallowed.has(getCanonicalTitle(t.title)));
  const filteredGenreTracks = fetchedGenreTracks.filter(t => !disallowed.has(getCanonicalTitle(t.title)));
  const filteredYt = (ytWatchNextSongs || []).filter(t => !disallowed.has(getCanonicalTitle(t.title)));

  // Combine fresh unplayed discoveries: interleave genre studio tracks and watch-next recommendations
  const discoveryTracks = [];
  const maxLen = Math.max(filteredGenreTracks.length, filteredYt.length, filteredCandidates.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < filteredGenreTracks.length) discoveryTracks.push(filteredGenreTracks[i]);
    if (i < filteredYt.length) discoveryTracks.push(filteredYt[i]);
    if (i < filteredCandidates.length && i < 2) discoveryTracks.push(filteredCandidates[i]);
  }

  let combinedPool = [
    seedSong,
    ...discoveryTracks
  ];

  // If the strict filter left very few songs, relax recent songs check (but NEVER re-add playedTitles or seedSong)
  if (combinedPool.length < 10) {
    const sessionDisallowed = new Set();
    if (seedNorm) sessionDisallowed.add(seedNorm);
    if (Array.isArray(playedTitles)) {
      for (const pt of playedTitles) {
        const norm = getCanonicalTitle(pt);
        if (norm) sessionDisallowed.add(norm);
      }
    }
    const relaxedGenreTracks = fetchedGenreTracks.filter(t => !sessionDisallowed.has(getCanonicalTitle(t.title)));
    combinedPool = [
      seedSong,
      ...discoveryTracks,
      ...relaxedGenreTracks
    ];
  }


  const deduped = deduplicateTrackList(combinedPool, { maxCount: 40 });

  const moodLabel = detected.label
    ? (recentMatchingArtists.length > 0 ? `${detected.label} • For You` : detected.label)
    : (seedArtist ? `${seedArtist} Radio` : 'Similar Songs');

  return {
    mood: detected.id,
    moodLabel,
    songs: deduped
  };
}
