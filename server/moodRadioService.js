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

/**
 * Generates an intelligent, cohesive queue matching the seed song's genre & mood,
 * seamlessly blended with the user's recent listening history and favored artists.
 */
export async function generateSimilarMoodQueue(seedSong, candidateTracks = [], recentSongs = []) {
  if (!seedSong) return { mood: 'general', moodLabel: 'All Songs', songs: [] };

  const detected = detectSongMoodAndGenre(seedSong);
  const seedArtist = (seedSong.artist || '').split(/[,&]/)[0].trim();

  // 1. Analyze User's Recent Listening Taste:
  // Extract user's favored artists and recent songs that match this exact mood/genre
  const matchingRecentSongs = [];
  const recentMatchingArtists = [];
  const seenArtistNames = new Set();
  if (seedArtist) seenArtistNames.add(seedArtist.toLowerCase());

  if (Array.isArray(recentSongs)) {
    for (const rs of recentSongs) {
      if (!rs || !rs.title || rs.id === seedSong.id) continue;
      const rsMood = detectSongMoodAndGenre(rs);
      const rsArtist = (rs.artist || '').split(/[,&]/)[0].trim();

      // Prioritize recent songs that share the exact mood & genre of the seed song
      if (rsMood.id === detected.id) {
        matchingRecentSongs.push(rs);
        if (rsArtist && !seenArtistNames.has(rsArtist.toLowerCase())) {
          seenArtistNames.add(rsArtist.toLowerCase());
          recentMatchingArtists.push(rsArtist);
        }
      } else if (rsArtist && !seenArtistNames.has(rsArtist.toLowerCase())) {
        seenArtistNames.add(rsArtist.toLowerCase());
      }
    }
  }

  // 2. Filter existing candidate tracks (from current search / view) matching this mood
  const matchingCandidates = (candidateTracks || []).filter(t => {
    if (!t || t.id === seedSong.id) return false;
    const itemMood = detectSongMoodAndGenre(t);
    return itemMood.id === detected.id;
  });

  // 3. Build queries combining the Mood/Genre + User's Recent Listening Affinity:
  const queriesToRun = [];

  // A. Same artist in this mood/genre
  if (seedArtist) {
    queriesToRun.push(`${seedArtist} ${detected.label || 'songs'}`);
  }

  // B. User's top recent artist matching this genre (personalized taste blending!)
  if (recentMatchingArtists.length > 0) {
    const topFavArtist = recentMatchingArtists[0];
    queriesToRun.push(`${topFavArtist} ${detected.label || 'hits'}`);
  }

  // C. Curated flagship mood queries
  if (detected.queries && detected.queries.length > 0) {
    queriesToRun.push(detected.queries[0]);
    if (detected.queries.length > 1 && queriesToRun.length < 3) {
      queriesToRun.push(detected.queries[1]);
    }
  }

  // 4. Fetch direct 320k studio master tracks in parallel (fast ~280ms)
  const queryPromises = queriesToRun.slice(0, 3).map(q => searchSongs(q, 6).catch(() => []));

  // 5. Fetch YouTube Watch Next recommendations with a 1.8s timeout guard
  const ytPromise = Promise.race([
    getYouTubeWatchNextSongs(seedSong, 12).catch(() => []),
    new Promise(resolve => setTimeout(() => resolve([]), 1800))
  ]);

  const [queryResults, ytWatchNextSongs] = await Promise.all([
    Promise.all(queryPromises),
    ytPromise
  ]);

  const fetchedGenreTracks = (queryResults || []).flat();

  // 6. Assemble in a cohesive, clean progression:
  // [seedSong, ...immediate candidates (up to 3), ...recent favorites in this genre (up to 4), ...genre tracks, ...yt recommendations]
  const combined = [
    seedSong,
    ...matchingCandidates.slice(0, 3),
    ...matchingRecentSongs.slice(0, 4),
    ...fetchedGenreTracks,
    ...(ytWatchNextSongs || [])
  ];

  const deduped = deduplicateTrackList(combined, { maxCount: 35 });

  const moodLabel = detected.label
    ? (recentMatchingArtists.length > 0 ? `${detected.label} • For You` : detected.label)
    : (seedArtist ? `${seedArtist} Radio` : 'Similar Songs');

  return {
    mood: detected.id,
    moodLabel,
    songs: deduped
  };
}
