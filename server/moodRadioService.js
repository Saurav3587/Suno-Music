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
 * Generates an intelligent, cohesive queue of 20-30 songs of the EXACT same mood & genre as the seed song
 */
export async function generateSimilarMoodQueue(seedSong, candidateTracks = []) {
  if (!seedSong) return { mood: 'general', moodLabel: 'All Songs', songs: [] };

  const detected = detectSongMoodAndGenre(seedSong);

  // 1. Filter existing candidate tracks matching this mood/vibe
  const matchingCandidates = (candidateTracks || []).filter(t => {
    if (!t || t.id === seedSong.id) return false;
    const itemMood = detectSongMoodAndGenre(t);
    return itemMood.id === detected.id;
  });

  // 2. Fetch high-quality direct 320k studio master tracks for this exact mood in parallel (fast ~280ms)
  const moodPromises = (detected.queries || []).slice(0, 3).map(q => searchSongs(q, 6).catch(() => []));

  // 3. Fetch YouTube Watch Next with a 1.8s timeout guard so it never stalls queue generation
  const ytPromise = Promise.race([
    getYouTubeWatchNextSongs(seedSong, 15).catch(() => []),
    new Promise(resolve => setTimeout(() => resolve([]), 1800))
  ]);

  const [moodResults, ytWatchNextSongs] = await Promise.all([
    Promise.all(moodPromises),
    ytPromise
  ]);

  const fetchedMoodTracks = (moodResults || []).flat();

  // Assemble queue: [seedSong, ...matchingCandidates, ...fetchedMoodTracks, ...ytWatchNextSongs]
  const combined = [seedSong, ...matchingCandidates, ...fetchedMoodTracks, ...(ytWatchNextSongs || [])];
  const deduped = deduplicateTrackList(combined, { maxCount: 35 });

  return {
    mood: detected.id,
    moodLabel: detected.label || (ytWatchNextSongs?.length > 0 ? `Radio • ${seedSong.title}` : 'Similar Songs'),
    songs: deduped
  };
}
