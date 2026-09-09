import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
  console.log('Gemini AI initialized (gemini-3.5-flash)');
} else {
  console.warn('GEMINI_API_KEY not set - AI DJ features disabled. Get a free key at https://aistudio.google.com/apikey');
}

// =============================================
// MUSIC-SPECIALIZED SYSTEM PROMPT
// =============================================
const MUSIC_SYSTEM_PROMPT = `You are the AI DJ for "Suno Music", an Indian-focused music streaming app. You have deep expertise in:

INDIAN MUSIC:
- Bollywood (Arijit Singh, Pritam, Vishal Mishra, Shreya Ghoshal, AR Rahman, KK, Mohit Chauhan)
- Punjabi (Diljit Dosanjh, AP Dhillon, Karan Aujla, Shubh, Sidhu Moose Wala, Guru Randhawa)
- Indian Indie (Anuv Jain, Prateek Kuhad, The Local Train, When Chai Met Toast, Zaeden)
- Sufi/Ghazal (Rahat Fateh Ali Khan, Nusrat Fateh Ali Khan, Kailash Kher)
- Desi Hip-Hop (Divine, MC Stan, Seedhe Maut, KR$NA, King, Raftaar)
- South Indian (Anirudh Ravichander, Sid Sriram, AR Rahman Tamil/Telugu works)

GLOBAL MUSIC:
- Pop (Ed Sheeran, Taylor Swift, The Weeknd, Charlie Puth, Dua Lipa)
- R&B, Hip-Hop, Rock, Electronic, K-Pop

PERSONALITY:
- You are warm, enthusiastic, and speak like a music-loving friend
- Keep responses SHORT (1-2 sentences max)
- CRITICAL RULE: NEVER use emojis in your responses. Zero emojis allowed.
- Always reference specific music styles, feelings, or moods naturally`;


/**
 * Analyze the user's current listening session and return mood insights + smart search queries
 */
export async function analyzeListeningSession(currentTrack, recentHistory = [], likedSongs = []) {
  if (!model) {
    return getDefaultSessionInsight(currentTrack);
  }

  try {
    const sessionSummary = buildSessionSummary(currentTrack, recentHistory, likedSongs);

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `${MUSIC_SYSTEM_PROMPT}

TASK: Analyze this listening session and suggest what should play next.

${sessionSummary}

Respond in this EXACT JSON format (no markdown, no code blocks):
{
  "mood": "one-word mood (e.g., romantic, energetic, melancholic, chill, party)",
  "insight": "A short 1-2 sentence insight about the user's current vibe (conversational, warm)",
  "searchQueries": ["3-4 specific search queries to find matching songs, e.g., 'Arijit Singh romantic ballads', 'late night Hindi acoustic'"],
  "suggestedArtists": ["2-3 artists that would fit this session perfectly"]
}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
        responseMimeType: 'application/json'
      }
    });

    const text = result.response.text();
    const parsed = JSON.parse(text);

    return {
      mood: parsed.mood || 'vibing',
      insight: parsed.insight || '',
      searchQueries: Array.isArray(parsed.searchQueries) ? parsed.searchQueries.slice(0, 4) : [],
      suggestedArtists: Array.isArray(parsed.suggestedArtists) ? parsed.suggestedArtists.slice(0, 3) : []
    };
  } catch (err) {
    console.warn('Gemini session analysis failed:', err.message);
    return getDefaultSessionInsight(currentTrack);
  }
}


/**
 * Generate a natural-language explanation for why a song was recommended
 */
export async function getAIRecommendationReasoning(currentSong, nextSong, recentHistory = []) {
  if (!model) {
    return getDefaultReasoning(currentSong, nextSong);
  }

  try {
    const prompt = `${MUSIC_SYSTEM_PROMPT}

TASK: Explain in 1-2 SHORT sentences why this next song is a great follow-up. Be specific about the musical connection.

Currently playing: "${currentSong?.title || 'Unknown'}" by ${currentSong?.artist || 'Unknown'}
Up next: "${nextSong?.title || 'Unknown'}" by ${nextSong?.artist || 'Unknown'}
${recentHistory.length > 0 ? `Recent vibes: ${recentHistory.slice(0, 5).map(s => `"${s.title}" by ${s.artist}`).join(', ')}` : ''}

Respond with ONLY the explanation text (no JSON, no quotes, no markdown). Keep it under 30 words.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 80
      }
    });

    const text = result.response.text().trim();
    // Strip any accidental quotes or markdown
    return text.replace(/^["'`]+|["'`]+$/g, '').replace(/^\*+|\*+$/g, '').trim() || getDefaultReasoning(currentSong, nextSong);
  } catch (err) {
    console.warn('Gemini reasoning failed:', err.message);
    return getDefaultReasoning(currentSong, nextSong);
  }
}


/**
 * Interpret a user's mood request and generate structured search queries tailored strictly to that mood
 */
export async function interpretMoodRequest(userMood, currentTrack = null) {
  const cleanMood = (userMood || '').trim();

  // Curated mood presets for instant reliable fallback
  const MOOD_FALLBACKS = {
    romantic: {
      mood: 'Romantic',
      response: 'Setting up a heartfelt romantic playlist for you.',
      queries: ['Arijit Singh romantic hits', 'bollywood love songs', 'romantic hindi indie acoustic', 'latest romantic hits']
    },
    chill: {
      mood: 'Chill & Relax',
      response: 'Queuing smooth, relaxed vibes to help you unwind.',
      queries: ['hindi indie chill songs', 'acoustic chill bollywood', 'prateek kuhad anuv jain', 'lofi hindi chill']
    },
    sad: {
      mood: 'Sad & Melancholic',
      response: 'Here are deeply emotional, soulful songs for your mood.',
      queries: ['sad emotional hindi songs', 'Arijit Singh heartbreak songs', 'melancholic acoustic hindi', 'slow sad bollywood']
    },
    party: {
      mood: 'Party & Dance',
      response: 'Turning up the energy with high-beat party anthems.',
      queries: ['punjabi party hits', 'bollywood dance party club', 'badshah honey singh party', 'upbeat club hindi hits']
    },
    energetic: {
      mood: 'Energetic & Workout',
      response: 'Pumping high-tempo beats to keep your adrenaline high.',
      queries: ['punjabi gym workout songs', 'high energy motivation hindi', 'fast rap hip hop desi', 'hard workout beats']
    },
    'late night': {
      mood: 'Late Night',
      response: 'Soothing late night melodies for the midnight hours.',
      queries: ['late night hindi acoustic', 'midnight drives hindi', 'deep hindi indie', 'slowed and reverb hindi']
    },
    focus: {
      mood: 'Focus & Calm',
      response: 'Calm, steady melodies to help you concentrate.',
      queries: ['peaceful instrumental acoustic hindi', 'calm focus music', 'ambient acoustic chill', 'soothing study melodies']
    },
    nostalgic: {
      mood: 'Nostalgic 90s & 2000s',
      response: 'Taking you back in time with timeless golden melodies.',
      queries: ['90s bollywood golden hits', '2000s hindi nostalgia songs', 'classic bollywood romance', 'mohit chauhan kk golden era']
    },
    happy: {
      mood: 'Happy & Joyful',
      response: 'Spreading good vibes with uplifting, feel-good music.',
      queries: ['feel good happy hindi songs', 'cheerful bollywood hits', 'upbeat acoustic pop', 'sunshine happy vibe hindi']
    },
    devotional: {
      mood: 'Peaceful & Devotional',
      response: 'Peaceful, soul-soothing devotional melodies.',
      queries: ['peaceful bhajan hindi', 'meditation spiritual melodies', 'soothing flute instrumental', 'divine chants and prayers']
    }
  };

  const lower = cleanMood.toLowerCase();
  let matchedKey = Object.keys(MOOD_FALLBACKS).find(k => lower.includes(k));
  if (!matchedKey) {
    if (/love|crush|date|valentine|ishq/i.test(lower)) matchedKey = 'romantic';
    else if (/relax|calm|peace|unwind|soft|lo-fi|lofi/i.test(lower)) matchedKey = 'chill';
    else if (/cry|depress|broken|heartbreak|alone|grief|pain|dard|gam/i.test(lower)) matchedKey = 'sad';
    else if (/club|dance|celebrate|banger|dj|nach/i.test(lower)) matchedKey = 'party';
    else if (/gym|running|cardio|adrenaline|pump|power|josh/i.test(lower)) matchedKey = 'energetic';
    else if (/sleep|midnight|night|dark|raat/i.test(lower)) matchedKey = 'late night';
    else if (/study|work|read|coding/i.test(lower)) matchedKey = 'focus';
    else if (/old|retro|vintage|90s|2000s|memories|purane/i.test(lower)) matchedKey = 'nostalgic';
    else if (/joy|cheerful|smile|fun|khush/i.test(lower)) matchedKey = 'happy';
  }

  const baseFallback = matchedKey
    ? MOOD_FALLBACKS[matchedKey]
    : {
        mood: cleanMood || 'Music Vibe',
        response: `Playing handpicked songs matching your ${cleanMood || 'selected'} mood.`,
        queries: [`${cleanMood} songs`, `${cleanMood} hindi hits`, `${cleanMood} playlist`]
      };

  if (!model) {
    return baseFallback;
  }

  try {
    const prompt = `You are the AI DJ for "Suno Music", an Indian-focused music streaming platform.
CRITICAL RULE: DO NOT USE ANY EMOJIS UNDER ANY CIRCUMSTANCE.

The user is telling you their MOOD: "${cleanMood}".
Generate structured search queries to curate a playlist matching this exact mood.

Respond in this EXACT JSON format (no markdown, no backticks, no code blocks):
{
  "mood": "Short descriptive title of the mood (e.g. Heartbroken & Melancholic, Upbeat Punjabi Party, Late Night Chill)",
  "response": "A 1-sentence friendly confirmation acknowledging this mood and stating what music is being queued. Absolutely NO emojis.",
  "queries": [
    "search query 1 (artist/style for this mood)",
    "search query 2 (genre and vibe for this mood)",
    "search query 3 (popular hits for this mood)",
    "search query 4 (complementary style for this mood)"
  ]
}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 250,
        responseMimeType: 'application/json'
      }
    });

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    // Strip any accidental emojis
    const cleanResponse = (parsed.response || baseFallback.response).replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F0F5}\u{1F200}-\u{1F270}]/gu, '').trim();

    return {
      mood: parsed.mood || baseFallback.mood,
      response: cleanResponse,
      queries: Array.isArray(parsed.queries) && parsed.queries.length > 0 ? parsed.queries.slice(0, 4) : baseFallback.queries
    };
  } catch (err) {
    console.warn('Gemini mood interpretation failed:', err.message);
    return baseFallback;
  }
}

/**
 * Interpret a natural language music request into structured search queries
 */
export async function interpretUserMusicRequest(userMessage, currentTrack = null) {
  const moodResult = await interpretMoodRequest(userMessage, currentTrack);
  return {
    query: moodResult.queries?.[0] || userMessage,
    mood: moodResult.mood,
    response: moodResult.response,
    queries: moodResult.queries
  };
}


/**
 * Check if Gemini is configured and available
 */
export function isAIAvailable() {
  return !!model;
}


// =============================================
// HELPER FUNCTIONS
// =============================================

function buildSessionSummary(currentTrack, recentHistory, likedSongs) {
  const lines = [];

  if (currentTrack) {
    lines.push(`Currently playing: "${currentTrack.title}" by ${currentTrack.artist || 'Unknown'}`);
  }

  if (recentHistory.length > 0) {
    const recent = recentHistory.slice(0, 8).map(s => `"${s.title}" by ${s.artist || '?'}`);
    lines.push(`Recent history (last ${recent.length} songs): ${recent.join(' → ')}`);
  }

  if (likedSongs.length > 0) {
    const liked = likedSongs.slice(0, 5).map(s => `"${s.title}" by ${s.artist || '?'}`);
    lines.push(`Liked songs (sample): ${liked.join(', ')}`);

    // Extract liked artists for pattern
    const artistCounts = {};
    likedSongs.forEach(s => {
      const primary = (s.artist || '').split(/[,&]/)[0].trim().toLowerCase();
      if (primary) artistCounts[primary] = (artistCounts[primary] || 0) + 1;
    });
    const topLikedArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count} likes)`);
    if (topLikedArtists.length > 0) {
      lines.push(`Top liked artists: ${topLikedArtists.join(', ')}`);
    }
  }

  // Time-of-day context
  const hour = new Date().getHours();
  let timeVibe = 'daytime';
  if (hour >= 22 || hour < 5) timeVibe = 'late night';
  else if (hour >= 18) timeVibe = 'evening';
  else if (hour >= 14) timeVibe = 'afternoon';
  else if (hour >= 6) timeVibe = 'morning';
  lines.push(`Time: ${timeVibe} (${hour}:00)`);

  return lines.join('\n');
}


function getDefaultSessionInsight(currentTrack) {
  const artist = currentTrack?.artist?.split(/[,&]/)[0]?.trim() || '';
  const title = currentTrack?.title || '';

  // Basic vibe detection without LLM
  const combined = `${title} ${artist}`.toLowerCase();
  let mood = 'vibing';
  let insight = 'Enjoying the music flow.';

  if (/arijit|atif|vishal mishra|jubin|darshan|mithoon/i.test(combined)) {
    mood = 'romantic';
    insight = `In a ${artist} romantic zone — keeping the soulful melodies flowing.`;
  } else if (/diljit|ap dhillon|karan aujla|shubh|sidhu|badshah|honey/i.test(combined)) {
    mood = 'energetic';
    insight = `Punjabi energy mode on, keeping the beats heavy.`;
  } else if (/anuv|prateek|local train|chai met|zaeden/i.test(combined)) {
    mood = 'chill';
    insight = `Indie acoustic vibes — soft, warm, and dreamy.`;
  } else if (/divine|mc stan|seedhe|raftaar|king/i.test(combined)) {
    mood = 'hype';
    insight = `Desi hip-hop mode — raw bars and heavy drops.`;
  } else if (artist) {
    insight = `Vibing with ${artist} — finding more in this lane.`;
  }

  return {
    mood,
    insight,
    searchQueries: artist ? [`${artist} top songs`, `songs like ${title}`] : ['trending Hindi songs'],
    suggestedArtists: []
  };
}


function getDefaultReasoning(currentSong, nextSong) {
  const curArtist = currentSong?.artist?.split(/[,&]/)[0]?.trim() || '';
  const nextArtist = nextSong?.artist?.split(/[,&]/)[0]?.trim() || '';
  const nextTitle = nextSong?.title || 'this track';

  if (curArtist && nextArtist && curArtist.toLowerCase() === nextArtist.toLowerCase()) {
    return `More from ${curArtist} — keeping the flow going.`;
  }
  if (nextArtist) {
    return `${nextArtist}'s "${nextTitle}" matches your current vibe perfectly.`;
  }
  return `This one fits your current mood — enjoy.`;
}
