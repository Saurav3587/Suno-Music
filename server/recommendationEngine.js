import { searchSongs, getTrendingSongs, getRomanticHits } from './autoPlaylistService.js';
import { getSpotifyCharts } from './spotifyService.js';
import { deduplicateTrackList, normalizeCanonicalTitle, isOfficialCleanTrack, getCanonicalSongKey } from './dedupService.js';
import yts from 'yt-search';

// Strict filter against low-quality modified audio (slowed, reverb, sped up, mashups, non-stop mixes)
const EXCLUDE_REMIX_REGEX = /(slowed|reverb|speed\s*up|sped\s*up|nightcore|bass\s*boost|8d\s*audio|remix|mash\s*up|mashup|non\s*stop|tiktok|ringtone|dj\s*mix|extended\s*mix|club\s*mix|status|whatsapp)/i;
const EXCLUDE_NON_MUSIC_REGEX = /(sound effect|white noise|sleep noise|ambient|aura|rain sound|nature sound|binaural|frequency|hz\b|podcast|episode|meditation noise|asmr|laundry|cadence|fan noise|karaoke|vocals only|backing track|originally performed by|tribute)/i;

/**
 * Spotify India Collaborative Artist Affinity Graph:
 * Comprehensive mapping of Indian & Global artists, their co-listeners, collaborators, and acoustic/stylistic peers.
 * Heavily weighted on the Indian musical landscape (Bollywood, Punjabi, Indian Indie, Sufi, South Indian)
 * with seamless bridges to compatible Global artists.
 */
const ARTIST_AFFINITY_GRAPH = {
  // === BOLLYWOOD SOULFUL MELODIC / ROMANTIC ACOUSTIC ===
  'arijit singh': [
    'atif aslam', 'pritam', 'mohit chauhan', 'vishal mishra', 'shreya ghoshal', 
    'jubin nautiyal', 'ar rahman', 'b praak', 'darshan raval', 'jasleen royal', 
    'anuv jain', 'prateek kuhad', 'kk', 'papon', 'mithoon', 'sonu nigam', 'shaan', 
    'javed ali', 'lucky ali', 'stebin ben', 'armaan malik', 'sachin-jigar'
  ],
  'atif aslam': [
    'arijit singh', 'mohit chauhan', 'mustafa zahid', 'ali zafar', 'shreya ghoshal', 
    'rahat fateh ali khan', 'pritam', 'jal', 'kk', 'shafqat amanat ali', 'mithoon', 'bilal saeed'
  ],
  'pritam': [
    'arijit singh', 'mohit chauhan', 'atif aslam', 'kk', 'vishal-shekhar', 
    'amit trivedi', 'sachin-jigar', 'shankar-ehsaan-loy', 'mithoon', 'javed ali'
  ],
  'shreya ghoshal': [
    'arijit singh', 'sunidhi chauhan', 'mohit chauhan', 'sonu nigam', 'shankar mahadevan', 
    'ar rahman', 'pritam', 'vishal mishra', 'javed ali', 'armaan malik', 'shreya'
  ],
  'mohit chauhan': [
    'arijit singh', 'atif aslam', 'lucky ali', 'kk', 'papon', 'pritam', 
    'ar rahman', 'silk route', 'shafqat amanat ali', 'rabbi shergill'
  ],
  'kk': [
    'mohit chauhan', 'arijit singh', 'shaan', 'sonu nigam', 'lucky ali', 
    'pritam', 'vishal-shekhar', 'krishnakumar kunnath'
  ],
  'sonu nigam': [
    'shaan', 'kk', 'udit narayan', 'kumar sanu', 'alka yagnik', 
    'sunidhi chauhan', 'shreya ghoshal', 'arijit singh', 'shankar mahadevan'
  ],
  'lucky ali': [
    'mohit chauhan', 'kk', 'papon', 'anuv jain', 'prateek kuhad', 'silk route', 'strings'
  ],
  'vishal mishra': [
    'arijit singh', 'jubin nautiyal', 'b praak', 'darshan raval', 'mithoon', 
    'akhil sachdeva', 'stebin ben', 'rochak kohli'
  ],
  'jubin nautiyal': [
    'arijit singh', 'vishal mishra', 'rochak kohli', 'armaan malik', 
    'darshan raval', 'payal dev', 'tulsi kumar'
  ],
  'darshan raval': [
    'arijit singh', 'armaan malik', 'vishal mishra', 'jubin nautiyal', 
    'asit tripathy', 'stebin ben', 'neha kakkar'
  ],
  'mithoon': [
    'arijit singh', 'atif aslam', 'mohit chauhan', 'sayeed quadri', 
    'vishal mishra', 'mustafa zahid'
  ],
  'armaan malik': [
    'amaal mallik', 'darshan raval', 'arijit singh', 'ed sheeran', 'sanam', 'rochak kohli'
  ],
  'ar rahman': [
    'arijit singh', 'mohit chauhan', 'javed ali', 'hariharan', 'shreya ghoshal', 
    'amit trivedi', 'sid sriram', 'benny dayal', 'jonita gandhi'
  ],
  'javed ali': [
    'ar rahman', 'arijit singh', 'mohit chauhan', 'kailash kher', 'pritam', 'sonu nigam'
  ],
  'papon': [
    'mohit chauhan', 'arijit singh', 'lucky ali', 'angaraag mahanta', 'shreya ghoshal'
  ],
  'b praak': [
    'jaani', 'arijit singh', 'vishal mishra', 'harrdy sandhu', 'ammy virk', 'jassie gill'
  ],

  // === INDIAN INDIE / SINGER-SONGWRITER / ACOUSTIC ===
  'anuv jain': [
    'prateek kuhad', 'jasleen royal', 'zaeden', 'the local train', 'osho jain', 
    'achint', 'raghav chaitanya', 'twin strings', 'arijit singh', 'bharat chauhan'
  ],
  'prateek kuhad': [
    'anuv jain', 'jasleen royal', 'the local train', 'when chai met toast', 
    'zaeden', 'ed sheeran', 'osho jain', 'lifafa', 'parekh & singh'
  ],
  'the local train': [
    'anuv jain', 'prateek kuhad', 'when chai met toast', 'parvaaz', 'lifafa', 'lucky ali', 'yellow diary'
  ],
  'jasleen royal': [
    'anuv jain', 'prateek kuhad', 'b praak', 'arijit singh', 'rochak kohli', 'stebin ben'
  ],
  'when chai met toast': [
    'prateek kuhad', 'anuv jain', 'the local train', 'sanam', 'twin strings', 'vance joy'
  ],
  'zaeden': [
    'anuv jain', 'prateek kuhad', 'lost stories', 'ritviz', 'king', 'armaan malik'
  ],
  'ritviz': [
    'nucleya', 'lost stories', 'zaeden', 'seedhe maut', 'king'
  ],

  // === PUNJABI URBAN / POP / DRILL & DESI HIP-HOP ===
  'diljit dosanjh': [
    'karan aujla', 'ap dhillon', 'shubh', 'sidhu moose wala', 'amrinder gill', 
    'guru randhawa', 'badshah', 'ed sheeran', 'b praak', 'honey singh'
  ],
  'karan aujla': [
    'diljit dosanjh', 'shubh', 'ap dhillon', 'sidhu moose wala', 'deep jandu', 'ikky', 'badshah'
  ],
  'ap dhillon': [
    'gurinder gill', 'shinda kahlon', 'diljit dosanjh', 'karan aujla', 'shubh', 'intense'
  ],
  'shubh': [
    'ap dhillon', 'karan aujla', 'diljit dosanjh', 'sidhu moose wala'
  ],
  'sidhu moose wala': [
    'karan aujla', 'shubh', 'diljit dosanjh', 'amrit maan', 'prem dhillon', 'jordan sandhu'
  ],
  'guru randhawa': [
    'badshah', 'honey singh', 'diljit dosanjh', 'harrdy sandhu', 'mika singh'
  ],
  'badshah': [
    'honey singh', 'diljit dosanjh', 'karan aujla', 'raftaar', 'ikka', 'divine', 'king'
  ],
  'honey singh': [
    'badshah', 'raftaar', 'diljit dosanjh', 'guru randhawa', 'alfaaz', 'lil golu'
  ],
  'divine': [
    'naezy', 'mc stan', 'seedhe maut', 'kr$na', 'raftaar', 'badshah', 'king', 'karan aujla'
  ],
  'king': [
    'divine', 'badshah', 'mc stan', 'seedhe maut', 'zaeden', 'anuv jain'
  ],
  'seedhe maut': [
    'kr$na', 'raftaar', 'divine', 'mc stan', 'prabh deep'
  ],

  // === SOUTH INDIAN CINEMATIC & INDIE ===
  'anirudh ravichander': [
    'ar rahman', 'sid sriram', 'yuvan shankar raja', 'devi sri prasad', 'santhosh narayanan', 'jonita gandhi'
  ],
  'sid sriram': [
    'ar rahman', 'anirudh ravichander', 'yuvan shankar raja', 'chinmayi', 'pradeep kumar', 'haricharan'
  ],

  // === GLOBAL ARTISTS WITH HIGH INDIAN AFFINITY / CROSSOVERS ===
  'ed sheeran': [
    'diljit dosanjh', 'armaan malik', 'taylor swift', 'shawn mendes', 'james arthur', 
    'prateek kuhad', 'lewis capaldi', 'coldplay', 'george ezra', 'vance joy', 'dean lewis'
  ],
  'coldplay': [
    'arijit singh', 'the local train', 'onerepublic', 'the fray', 'keane', 'imagine dragons', 'ed sheeran'
  ],
  'taylor swift': [
    'ed sheeran', 'olivia rodrigo', 'sabrina carpenter', 'phoebe bridgers', 'gracie abrams', 'lana del rey'
  ],
  'the weeknd': [
    'post malone', 'drake', 'sza', 'khalid', 'bruno mars', 'ap dhillon', 'travis scott'
  ],
  'dua lipa': [
    'calvin harris', 'charlie puth', 'bebe rexha', 'ava max', 'miley cyrus'
  ],
  'post malone': [
    'the weeknd', 'swae lee', 'juice wrld', 'twenty one pilots', 'halsey', 'khalid'
  ],
  'charlie puth': [
    'shawn mendes', 'dua lipa', 'bruno mars', 'maroon 5', 'justin bieber'
  ],
  'shawn mendes': [
    'charlie puth', 'ed sheeran', 'camila cabello', 'justin bieber'
  ],
  'justin bieber': [
    'shawn mendes', 'charlie puth', 'the weeknd', 'ed sheeran', 'dan + shay'
  ]
};

// Comprehensive list of prominent Indian artists to recognize Indian culture & language
const INDIAN_ARTIST_IDENTIFIERS = [
  'arijit', 'atif', 'shreya', 'mohit chauhan', 'vishal mishra', 'jubin', 'darshan raval', 
  'anuv jain', 'prateek kuhad', 'diljit', 'karan aujla', 'ap dhillon', 'shubh', 'sidhu', 
  'pritam', 'ar rahman', 'mithoon', 'sonu nigam', 'badshah', 'b praak', 'jasleen royal',
  'kk', 'papon', 'neha kakkar', 'tony kakkar', 'armaan malik', 'amaal mallik', 'shaan',
  'javed ali', 'udit narayan', 'kumar sanu', 'alka yagnik', 'sunidhi', 'kailash kher',
  'rahat fateh ali', 'nusrat fateh ali', 'anirudh', 'sid sriram', 'yuvan shankar raja',
  'divine', 'king', 'seedhe maut', 'mc stan', 'raftaar', 'ikka', 'honey singh', 'zaeden',
  'ritviz', 'the local train', 'when chai met toast', 'sanam', 'twin strings', 'harrdy sandhu',
  'ammy virk', 'jassie gill', 'sachin-jigar', 'amit trivedi', 'vishal-shekhar', 'rochak kohli'
];

/**
 * Analyzes track metadata to classify its micro-vibe, cultural scene, acoustic texture, and energy.
 * This mirrors Spotify India's Audio Spectrogram & Genre Classifier.
 */
export function detectVibeProfile(track) {
  if (!track) {
    return { vibe: 'bollywood-melodic', language: 'indian', isAcoustic: false, energy: 'medium' };
  }

  const title = (track.title || '').toLowerCase();
  const artist = (track.artist || '').toLowerCase();
  const album = (track.album || '').toLowerCase();
  const combined = `${title} ${artist} ${album}`;

  // 1. Acoustic / Unplugged Texture Check
  const isAcoustic = track.isAcoustic || /(acoustic|unplugged|piano\s*version|stripped|guitar|instrumental|strings|orchestral|live\s*acoustic|reprise)/i.test(combined);

  // 2. Language & Cultural Scene Detection
  const hasIndianArtist = INDIAN_ARTIST_IDENTIFIERS.some(name => combined.includes(name));
  const hasIndianKeywords = /(hindi|punjabi|bollywood|sufi|ghazal|qawwali|kesariya|tum\s*hi\s*ho|tera|meri|dil|ishq|pyar|geet|sajna|channa|rabba|naina|yaari|raataan|apna|tujhe|hawa|pehla|kahani|deewana)/i.test(combined);
  const isIndian = hasIndianArtist || hasIndianKeywords;

  const isPunjabi = /(punjabi|dhillon|aujla|diljit|sidhu|shubh|bhangra|dhol|jatt|pind|patiala|karan)/i.test(combined);
  const isIndie = /(anuv\s*jain|prateek\s*kuhad|the\s*local\s*train|when\s*chai|zaeden|lifafa|twin\s*strings|indie)/i.test(combined);
  const isSufi = /(sufi|qawwali|ghazal|rahat|nusrat|kailash|ali\s*zafar|khwaja|kun\s*faya)/i.test(combined);
  const isDesiHipHop = /(divine|mc\s*stan|seedhe\s*maut|kr\$na|raftaar|ikka|king\b|gully)/i.test(combined);

  // 3. Micro-Vibe Categorization
  let vibe = 'bollywood-melodic';
  let energy = 'medium';

  if (isIndie || (isIndian && isAcoustic)) {
    vibe = 'indian-indie';
    energy = 'low';
  } else if (isSufi) {
    vibe = 'sufi-spiritual';
    energy = 'medium';
  } else if (isPunjabi) {
    vibe = 'punjabi-hits';
    energy = 'high';
  } else if (isDesiHipHop) {
    vibe = 'desi-hiphop';
    energy = 'high';
  } else if (isIndian) {
    if (isAcoustic || /(sad|heartbreak|dard|tanhai|judai|alvida|tujhe|roye)/i.test(combined)) {
      vibe = 'bollywood-romantic';
      energy = 'low';
    } else {
      vibe = 'bollywood-melodic';
      energy = 'medium';
    }
  } else if (isAcoustic || /(chill|unplugged|indie|folk|coffee|campfire|gentle|warm)/i.test(combined)) {
    vibe = 'acoustic-chill';
    energy = 'low';
  } else if (/(sad|cry|heartbreak|alone|broken|goodbye|miss\s*you|tears|grief|memories)/i.test(combined)) {
    vibe = 'emotional-ballad';
    energy = 'low';
  } else if (/(r&b|rnb|synth|synthwave|after\s*hours|night|lofi|lo-fi|midnight|chillhop)/i.test(combined)) {
    vibe = 'rnb-synthwave';
    energy = 'medium';
  } else if (/(rock|guitar|alternative|indie\s*rock|anthem|drums)/i.test(combined)) {
    vibe = 'rock-alternative';
    energy = 'high';
  } else {
    vibe = 'upbeat-pop';
    energy = 'high';
  }

  return {
    vibe,
    language: isIndian ? 'indian' : 'global',
    isAcoustic,
    energy
  };
}

/**
 * Returns adjacent artists from our collaborative graph or falls back to query expansion
 */
function getAdjacentArtists(artist) {
  if (!artist) return [];
  const clean = artist.toLowerCase().trim();
  for (const [key, neighbors] of Object.entries(ARTIST_AFFINITY_GRAPH)) {
    if (clean.includes(key) || key.includes(clean)) {
      return neighbors;
    }
  }
  return [];
}

/**
 * Core Two-Tower Recommendation & Autoplay Algorithm:
 * Heavily focused on Indian music (Bollywood, Punjabi, Indian Indie, Sufi),
 * with foreign hits naturally integrated via crossover bridges just like Spotify India's brain.
 */
export async function getHybridRecommendations({
  seedSong = null,
  recentHistory = [],
  likedArtists = [],
  skippedArtists = [],
  mode = 'autoplay',
  limit = 8
}) {
  const recentIds = new Set(recentHistory.map(s => s.id || s.title?.toLowerCase()));
  const recentTitles = new Set(recentHistory.map(s => s.title?.toLowerCase().trim()));
  const recentCanonicalTitles = new Set(recentHistory.map(s => normalizeCanonicalTitle(s.title)).filter(Boolean));
  const skippedSet = new Set(skippedArtists.map(a => a.toLowerCase().trim()));
  const likedSet = new Set(likedArtists.map(a => a.toLowerCase().trim()));

  const candidates = [];
  const candidateKeys = new Set();
  const candidateCanonicalTitles = new Set();

  const seedCanonicalTitle = seedSong ? normalizeCanonicalTitle(seedSong.title) : '';
  const seedVibeProfile = detectVibeProfile(seedSong);
  const isSeedIndian = seedVibeProfile.language === 'indian';

  const addCandidate = (song, sourceRank = 0, recommendationReason = 'Algorithmic Transition') => {
    if (!song || !song.title) return;

    // Reject unofficial, low-quality, slowed/reverb, or non-music audio
    if (!isOfficialCleanTrack(song)) return;

    const normTitle = normalizeCanonicalTitle(song.title);
    if (!normTitle) return;

    // Strict Anti-Repeat Rule 1: NEVER recommend the current seed song
    if (seedCanonicalTitle && (normTitle === seedCanonicalTitle || normTitle.includes(seedCanonicalTitle) || (seedCanonicalTitle.length >= 4 && seedCanonicalTitle.includes(normTitle)))) {
      return;
    }

    // Strict Anti-Repeat Rule 2: NEVER repeat any track from recent history (last 25 tracks)
    if (recentCanonicalTitles.has(normTitle)) {
      return;
    }

    // Strict Anti-Repeat Rule 3: NEVER add duplicates of already queued candidates
    if (candidateCanonicalTitles.has(normTitle)) {
      return;
    }

    const key = getCanonicalSongKey(song.title, song.artist);
    if (candidateKeys.has(key)) return;
    candidateKeys.add(key);
    candidateCanonicalTitles.add(normTitle);
    candidates.push({ song, sourceRank, recommendationReason });
  };

  const primaryArtist = seedSong?.artist ? seedSong.artist.split(/[,&]/)[0].trim() : '';

  // === TOWER 1: CANDIDATE GENERATION (SPOTIFY INDIA BRAIN) ===

  // 1. Studio Master Co-Listening Flow (Direct 320k CD Streams, Zero YouTube Embed Errors)
  if (seedSong) {
    try {
      const adjacentArtists = getAdjacentArtists(primaryArtist);
      const flowArtist = adjacentArtists[0] || (primaryArtist ? `${primaryArtist} hits` : 'Arijit Singh');
      const studioRadioTracks = await searchSongs(`${flowArtist} top songs`, 6);
      studioRadioTracks.forEach(s => {
        addCandidate({
          ...s,
          badge: 'Spotify 320k',
          source: 'studio'
        }, 3, `Artist Radio Flow (${flowArtist})`);
      });

      // Query 1B: If acoustic or indie, query studio acoustic tracks
      if (seedVibeProfile.isAcoustic || seedVibeProfile.vibe === 'acoustic-chill' || seedVibeProfile.vibe === 'indian-indie') {
        const acousticTracks = await searchSongs(`${primaryArtist} unplugged acoustic`, 4);
        acousticTracks.forEach(s => {
          addCandidate({
            ...s,
            badge: 'Spotify 320k',
            source: 'studio',
            isAcoustic: true
          }, 3, 'Matching Acoustic Texture');
        });
      }
    } catch (e) {
      console.warn('Studio candidate generation warning:', e.message);
    }
  }

  // 2. Spotify India Collaborative Artist Neighborhood (320kbps CD Masters)
  const adjacent = getAdjacentArtists(primaryArtist);
  const defaultIndianNeighbors = ['Arijit Singh', 'Pritam', 'Atif Aslam', 'Mohit Chauhan', 'Diljit Dosanjh', 'Anuv Jain'];
  const targetArtists = adjacent.length > 0 
    ? adjacent.slice(0, 4) 
    : (primaryArtist ? [primaryArtist] : defaultIndianNeighbors.slice(0, 3));

  for (const art of targetArtists) {
    try {
      const vibeSearchSuffix = seedVibeProfile.isAcoustic ? 'acoustic hits' : 'top hits';
      const studioTracks = await searchSongs(`${art} ${vibeSearchSuffix}`, 4);
      studioTracks.forEach(s => {
        addCandidate({
          ...s,
          badge: 'Spotify 320k',
          source: 'studio'
        }, 2, `Collaborative Artist Graph: ${art}`);
      });
    } catch (e) {
      // Continue next artist
    }
  }

  // 3. User Taste Integration (Liked Artists matching current vibe)
  const userMatchingLikedArtists = likedArtists.filter(art => {
    const artAdj = getAdjacentArtists(art);
    return artAdj.includes(primaryArtist.toLowerCase()) || art.toLowerCase().includes(primaryArtist.toLowerCase());
  });

  for (const likedArt of userMatchingLikedArtists.slice(0, 2)) {
    try {
      const userMatches = await searchSongs(`${likedArt} best songs`, 3);
      userMatches.forEach(s => {
        addCandidate({
          ...s,
          badge: 'Spotify 320k',
          source: 'studio'
        }, 3, `Because you love ${likedArt}`);
      });
    } catch (e) {
      // Continue
    }
  }

  // 4. Spotify India Flagship Charts (Top 50 - India & Curated Hits)
  if (candidates.length < 8) {
    // 4A. Spotify Top 50 - India (Primary Indian Focus)
    try {
      const spotifyIndiaChart = await getSpotifyCharts('top-india');
      const chartTracks = spotifyIndiaChart.tracks || [];
      const freshIndiaTracks = chartTracks
        .filter(t => !recentTitles.has(t.title.toLowerCase().trim()))
        .slice(0, 8);

      for (const track of freshIndiaTracks) {
        const studioMatches = await searchSongs(`${track.title} ${track.artist}`, 2);
        if (studioMatches.length > 0) {
          addCandidate({
            ...studioMatches[0],
            badge: 'Spotify 320k',
            source: 'spotify-resolved'
          }, 3, "Spotify Top 50 India");
        }
      }
    } catch (e) {
      console.warn('Spotify Top 50 India chart warning:', e.message);
    }

    // 4B. Foreign Global Hits (Select 2-3 tracks for global balance when playing non-Indian seed)
    if (!isSeedIndian) {
      try {
        const globalChart = await getSpotifyCharts('top-hits');
        const globalTracks = (globalChart.tracks || [])
          .filter(t => !recentTitles.has(t.title.toLowerCase().trim()))
          .slice(0, 3);

        for (const track of globalTracks) {
          const studioMatches = await searchSongs(`${track.title} ${track.artist}`, 2);
          if (studioMatches.length > 0) {
            addCandidate({
              ...studioMatches[0],
              badge: 'Spotify 320k',
              source: 'spotify-resolved'
            }, 1, "Spotify Global Hits");
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }

  // Fallback candidates: Indian Superhits Top 50 + Romantic Classics
  if (candidates.length < 5) {
    try {
      const romanticFallback = await getRomanticHits(8);
      romanticFallback.forEach(s => addCandidate({ ...s, badge: 'Spotify 320k' }, 0, 'Indian Melodic Classics'));
      const trendingFallback = await getTrendingSongs(6);
      trendingFallback.forEach(s => addCandidate({ ...s, badge: 'Spotify 320k' }, 0, 'Trending India'));
    } catch (e) {
      // Continue
    }
  }

  // === TOWER 2: MULTI-FACTOR SCORING & RE-RANKING (SPOTIFY INDIA LOGIC) ===

  const scored = candidates.map(({ song, sourceRank, recommendationReason }) => {
    let score = 50;
    const titleLower = (song.title || '').toLowerCase().trim();
    const artistLower = (song.artist || '').toLowerCase().trim();
    const candProfile = detectVibeProfile(song);
    const isCandIndian = candProfile.language === 'indian';

    // 1. Apple Music / Spotify Anti-Loop Rule: Strictly drop songs played recently
    if (recentIds.has(song.id) || recentTitles.has(titleLower)) {
      score -= 100; // Block: Never replay songs from recent history
    }

    // 2. Real-Time Skip Penalty: Down-rank artists skipped within 15 seconds
    for (const skipped of skippedSet) {
      if (artistLower.includes(skipped)) {
        score -= 45;
      }
    }

    // 3. User Taste Affinity Boost: Boost artists user explicitly saved/liked
    for (const liked of likedSet) {
      if (artistLower.includes(liked)) {
        score += 30;
      }
    }

    // 4. SPOTIFY INDIA CORE LEANING:
    // Natural baseline boost for Indian music (+15 points), keeping Indian music front and center.
    if (isCandIndian) {
      score += 15;
    }

    // 5. Vibe & Mood Continuity (The Core Secret of Spotify / YT Music):
    if (seedSong) {
      // 5A. Language & Scene Continuity:
      if (isSeedIndian && isCandIndian) {
        score += 30; // Perfect Indian music continuity
      } else if (isSeedIndian && !isCandIndian) {
        // If user is playing an Indian song, heavily penalize switching to unrelated foreign pop
        // unless it's a known acoustic crossover (like Ed Sheeran acoustic or Coldplay)
        const isCrossover = /ed\s*sheeran|coldplay/i.test(artistLower);
        score -= isCrossover ? 10 : 35;
      } else if (!isSeedIndian && !isCandIndian) {
        score += 25; // Foreign pop continues into foreign pop
      } else if (!isSeedIndian && isCandIndian) {
        // If seed is global acoustic (e.g. Ed Sheeran), Indian indie acoustic (Prateek Kuhad, Anuv Jain) is a welcome crossover!
        if (candProfile.vibe === 'indian-indie' || candProfile.isAcoustic) {
          score += 15;
        } else {
          score -= 10;
        }
      }

      // 5B. Micro-vibe alignment (+30 points)
      if (candProfile.vibe === seedVibeProfile.vibe) {
        score += 30;
      } else if (
        (candProfile.vibe === 'bollywood-romantic' && seedVibeProfile.vibe === 'bollywood-melodic') ||
        (candProfile.vibe === 'bollywood-melodic' && seedVibeProfile.vibe === 'bollywood-romantic') ||
        (candProfile.vibe === 'indian-indie' && seedVibeProfile.vibe === 'acoustic-chill') ||
        (candProfile.vibe === 'acoustic-chill' && seedVibeProfile.vibe === 'indian-indie')
      ) {
        // Soft mood harmony
        score += 20;
      } else if (
        (seedVibeProfile.vibe === 'bollywood-romantic' && candProfile.vibe === 'punjabi-hits') ||
        (seedVibeProfile.vibe === 'acoustic-chill' && candProfile.vibe === 'desi-hiphop')
      ) {
        // Conflicting tempo clash (e.g. sad romantic melody jumping into high tempo drill)
        score -= 30;
      }

      // 5C. Acoustic Texture Continuity (+25 points)
      if (seedVibeProfile.isAcoustic && candProfile.isAcoustic) {
        score += 25;
      } else if (seedVibeProfile.isAcoustic && !candProfile.isAcoustic) {
        score -= 15;
      } else if (!seedVibeProfile.isAcoustic && candProfile.isAcoustic) {
        score -= 5;
      }

      // 5D. Energy Dynamics Match (+15 points)
      if (candProfile.energy === seedVibeProfile.energy) {
        score += 15;
      }
    }

    // 6. Source rank bias
    score += sourceRank * 5;

    // Attach enriched metadata
    const enrichedSong = {
      ...song,
      vibeMatched: candProfile.vibe,
      recommendationReason
    };

    return { song: enrichedSong, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Filter out penalized tracks (score <= 0)
  const filtered = scored
    .filter(item => item.score > 0)
    .map(item => item.song);

  // 7. Spacing & Anti-Monopoly Guard:
  // Prevent more than 2 songs from the same artist in the autoplay stream
  const finalQueue = [];
  const artistCounts = new Map();
  let lastArtist = '';

  for (const song of filtered) {
    const curArtist = (song.artist || '').split(/[,&]/)[0].trim().toLowerCase();
    const count = artistCounts.get(curArtist) || 0;

    // Do not allow 2 songs by the exact same artist immediately back-to-back
    if (curArtist === lastArtist) {
      continue;
    }

    // Do not allow more than 2 songs total by the same artist in this batch
    if (count >= 2) {
      continue;
    }

    artistCounts.set(curArtist, count + 1);
    lastArtist = curArtist;
    finalQueue.push(song);

    if (finalQueue.length >= limit * 2) break;
  }

  // Final Strict Canonical Deduplication & Anti-Repeat Pass
  return deduplicateTrackList(finalQueue, {
    excludeTitles: [seedSong?.title, ...recentHistory.map(s => s.title)].filter(Boolean),
    maxCount: limit
  });
}
