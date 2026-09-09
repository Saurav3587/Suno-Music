import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  console.log('Gemini AI initialized (gemini-1.5-flash)');
} else {
  console.warn('⚠️  GEMINI_API_KEY not set — AI DJ features disabled. Get a free key at https://aistudio.google.com/apikey');
}

// =============================================
// MUSIC-SPECIALIZED SYSTEM PROMPT
// =============================================
const MUSIC_SYSTEM_PROMPT = `You are the AI DJ for "Suno Music", an Indian-focused music streaming app. You have deep expertise in:

🎵 INDIAN MUSIC:
- Bollywood (Arijit Singh, Pritam, Vishal Mishra, Shreya Ghoshal, AR Rahman, KK, Mohit Chauhan)
- Punjabi (Diljit Dosanjh, AP Dhillon, Karan Aujla, Shubh, Sidhu Moose Wala, Guru Randhawa)
- Indian Indie (Anuv Jain, Prateek Kuhad, The Local Train, When Chai Met Toast, Zaeden)
- Sufi/Ghazal (Rahat Fateh Ali Khan, Nusrat Fateh Ali Khan, Kailash Kher)
- Desi Hip-Hop (Divine, MC Stan, Seedhe Maut, KR$NA, King, Raftaar)
- South Indian (Anirudh Ravichander, Sid Sriram, AR Rahman Tamil/Telugu works)

🌍 GLOBAL MUSIC:
- Pop (Ed Sheeran, Taylor Swift, The Weeknd, Charlie Puth, Dua Lipa)
- R&B, Hip-Hop, Rock, Electronic, K-Pop

PERSONALITY:
- You're warm, enthusiastic, and speak like a music-loving friend
- Mix Hindi/English naturally (e.g., "Bhai, this vibe is 🔥")
- Keep responses SHORT (2-3 sentences max)
- Use emojis sparingly but effectively
- Never be generic — always reference specific songs, artists, or moods`;


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
 * Interpret a natural language music request into structured search queries
 */
export async function interpretUserMusicRequest(userMessage, currentTrack = null) {
  if (!model) {
    return { query: userMessage, mood: 'unknown', response: "AI DJ is offline — searching directly for your request!" };
  }

  try {
    const context = currentTrack
      ? `Currently playing: "${currentTrack.title}" by ${currentTrack.artist}`
      : 'Nothing playing right now';

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `${MUSIC_SYSTEM_PROMPT}

TASK: The user said: "${userMessage}"
${context}

Interpret their request and respond in this EXACT JSON format (no markdown, no code blocks):
{
  "query": "The best search query to find what they want (specific artist + genre + mood)",
  "mood": "The mood they're going for",
  "response": "A short, friendly 1-sentence response acknowledging their request (conversational, use their language)"
}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
        responseMimeType: 'application/json'
      }
    });

    const text = result.response.text();
    const parsed = JSON.parse(text);

    return {
      query: parsed.query || userMessage,
      mood: parsed.mood || 'unknown',
      response: parsed.response || `Searching for: ${userMessage}`
    };
  } catch (err) {
    console.warn('Gemini chat interpretation failed:', err.message);
    return { query: userMessage, mood: 'unknown', response: `On it! Searching for "${userMessage}" 🎵` };
  }
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
  let insight = 'Enjoying the music flow ✨';

  if (/arijit|atif|vishal mishra|jubin|darshan|mithoon/i.test(combined)) {
    mood = 'romantic';
    insight = `In a ${artist} romantic zone — keeping the soulful melodies flowing 💫`;
  } else if (/diljit|ap dhillon|karan aujla|shubh|sidhu|badshah|honey/i.test(combined)) {
    mood = 'energetic';
    insight = `Punjabi energy mode on! Keeping the beats heavy 🔥`;
  } else if (/anuv|prateek|local train|chai met|zaeden/i.test(combined)) {
    mood = 'chill';
    insight = `Indie acoustic vibes — soft, warm, and dreamy 🌙`;
  } else if (/divine|mc stan|seedhe|raftaar|king/i.test(combined)) {
    mood = 'hype';
    insight = `Desi hip-hop mode — raw bars and heavy drops 🎤`;
  } else if (artist) {
    insight = `Vibing with ${artist} — finding more in this lane ✨`;
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
    return `More from ${curArtist} — keeping the flow going ✨`;
  }
  if (nextArtist) {
    return `${nextArtist}'s "${nextTitle}" matches your current vibe perfectly 🎵`;
  }
  return `This one fits your current mood — enjoy! 🎶`;
}
