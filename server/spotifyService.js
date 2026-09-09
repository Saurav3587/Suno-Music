import { searchSongs } from './autoPlaylistService.js';
import yts from 'yt-search';

export const SPOTIFY_PLAYLIST_MAP = {
  // India & Desi Hits
  'top-india': {
    id: '37i9dQZEVXbLZ52XmnySJg',
    key: 'top-india',
    category: 'india',
    badge: '#1 in India',
    title: 'Top 50 - India',
    description: 'Your daily update of the most played tracks in India on Spotify',
    cover: 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_in_default.jpg',
    trackCount: 50
  },
  'bollywood-central': {
    id: '37i9dQZF1DWXtlo6ENS92N',
    key: 'bollywood-central',
    category: 'india',
    badge: 'Bollywood Hits',
    title: 'Bollywood Central',
    description: 'The definitive sound of Bollywood cinema and chartbusters',
    cover: 'https://image-cdn-fa.spotifycdn.com/image/ab67706f00000001c91d2c7e07fc388937756b1a',
    trackCount: 50
  },
  'hot-hits-punjabi': {
    id: '37i9dQZF1DWXVJK4aT7pmk',
    key: 'hot-hits-punjabi',
    category: 'india',
    badge: 'Top Punjabi',
    title: 'Hot Hits Punjabi',
    description: 'Catch the hottest Punjabi tracks ruling the speakers',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f000000011844ecb7345e5ab1ea549f1e',
    trackCount: 50
  },

  // Global & Regional Charts
  'top-hits': {
    id: '37i9dQZF1DXcBWIGoYBM5M',
    key: 'top-hits',
    category: 'charts',
    badge: 'Global Flagship',
    title: "Today's Top Hits",
    description: 'The hottest tracks on Spotify right now worldwide',
    cover: 'https://image-cdn-fa.spotifycdn.com/image/ab67706f00000001810d3464499e998c3faf8b9e',
    trackCount: 50
  },
  'global-50': {
    id: '37i9dQZEVXbMDoHDwVN2tF',
    key: 'global-50',
    category: 'charts',
    badge: 'Daily Top 50',
    title: 'Top 50 - Global',
    description: 'Your daily update of the most played tracks worldwide',
    cover: 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_global_default.jpg',
    trackCount: 50
  },
  'top-songs-global': {
    id: '37i9dQZEVXbNG2KDcFcKOF',
    key: 'top-songs-global',
    category: 'charts',
    badge: 'Weekly Top 50',
    title: 'Top Songs - Global',
    description: 'The most popular songs across the globe this week',
    cover: 'https://charts-images.scdn.co/assets/locale_en/regional/weekly/region_global_default.jpg',
    trackCount: 50
  },
  'top-50-usa': {
    id: '37i9dQZEVXbLRQDuF5jeBp',
    key: 'top-50-usa',
    category: 'charts',
    badge: '#1 in USA',
    title: 'Top 50 - USA',
    description: 'Your daily update of the most played tracks in the United States',
    cover: 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_us_default.jpg',
    trackCount: 50
  },
  'top-songs-usa': {
    id: '37i9dQZEVXbLp5XoPON0wI',
    key: 'top-songs-usa',
    category: 'charts',
    badge: 'Weekly USA',
    title: 'Top Songs - USA',
    description: 'The most streamed songs in the US this week',
    cover: 'https://charts-images.scdn.co/assets/locale_en/regional/weekly/region_us_default.jpg',
    trackCount: 50
  },
  'top-50-uk': {
    id: '37i9dQZEVXbLnolsZ8PSNw',
    key: 'top-50-uk',
    category: 'charts',
    badge: '#1 in UK',
    title: 'Top 50 - United Kingdom',
    description: 'Your daily update of the most played tracks in the UK',
    cover: 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_gb_default.jpg',
    trackCount: 50
  },
  'viral-hits': {
    id: '37i9dQZF1DX2L0iB23Enbq',
    key: 'viral-hits',
    category: 'charts',
    badge: 'Viral 50',
    title: 'Viral Hits',
    description: 'Viral, trending songs buzzing all over social feeds',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f00000001204335eb7d241ef0dbf5c5ad',
    trackCount: 50
  },

  // Genres (Hip-Hop, Pop, R&B, Latin, K-Pop)
  'rapcaviar': {
    id: '37i9dQZF1DX0XUsuxWHRQd',
    key: 'rapcaviar',
    category: 'genres',
    badge: '#1 Hip-Hop',
    title: 'RapCaviar',
    description: "New music from Kendrick Lamar, Drake, Travis Scott and hip-hop's heaviest hitters",
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f0000000177877784c6d096035553b667',
    trackCount: 50
  },
  'pop-rising': {
    id: '37i9dQZF1DWUa8ZRTfalHk',
    key: 'pop-rising',
    category: 'genres',
    badge: 'Next Pop Hits',
    title: 'Pop Rising',
    description: "Who's next in pop. The future chart-toppers you need to hear today",
    cover: 'https://image-cdn-fa.spotifycdn.com/image/ab67706f0000000172e446610f3c0c7609d18c95',
    trackCount: 100
  },
  'are-and-be': {
    id: '37i9dQZF1DX4SBhb3fqCJd',
    key: 'are-and-be',
    category: 'genres',
    badge: 'R&B / Soul',
    title: 'RNB X',
    description: 'The definitive vibe for modern contemporary R&B and soul',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f00000001bb68abe189320131379b5593',
    trackCount: 50
  },
  'viva-latino': {
    id: '37i9dQZF1DX10zKzsJ2jva',
    key: 'viva-latino',
    category: 'genres',
    badge: 'Top Latin',
    title: 'Viva Latino',
    description: "Today's top Latin hits and reggaeton from Bad Bunny, Karol G, and Feid",
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f00000001466015e5447e89059d42a7be',
    trackCount: 50
  },
  'kpop-on': {
    id: '37i9dQZF1DX9tPFwDMOaN1',
    key: 'kpop-on',
    category: 'genres',
    badge: 'Global K-Pop',
    title: 'K-Pop ON! (온)',
    description: 'Your ultimate destination for premier K-Pop hits, bops, and debuts',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f00000001de461abff600e16a54cd6d6b',
    trackCount: 50
  },

  // Moods & Focus
  'lofi-beats': {
    id: '37i9dQZF1DWWQRwui0ExPn',
    key: 'lofi-beats',
    category: 'moods',
    badge: 'Chill & Study',
    title: 'lofi beats',
    description: 'Beats to relax, study, and code to. Instrumental perfection',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f00000001266beb50b0032b0f140a749e',
    trackCount: 100
  },
  'deep-focus': {
    id: '37i9dQZF1DWZeKCadgRdKQ',
    key: 'deep-focus',
    category: 'moods',
    badge: 'Work & Focus',
    title: 'Deep Focus',
    description: 'Atmospheric ambient and post-rock music to help you concentrate',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f000000016020f2f6476db518ef747da4',
    trackCount: 100
  },
  'peaceful-piano': {
    id: '37i9dQZF1DX4sWSpwq3LiO',
    key: 'peaceful-piano',
    category: 'moods',
    badge: 'Relax & Sleep',
    title: 'Peaceful Piano',
    description: 'Relax and indulge with beautiful, peaceful piano melodies',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f0000000170e1fb7db7b45809d6a80377',
    trackCount: 100
  },
  'beast-mode': {
    id: '37i9dQZF1DX70RN3TfWWJh',
    key: 'beast-mode',
    category: 'moods',
    badge: 'Gym & Energy',
    title: 'Workout (Beast Mode)',
    description: 'High energy bass-heavy gym tracks to power through your workout',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f00000001681908e31127979d43c8dbc6',
    trackCount: 100
  },

  // Decades & Classics
  'all-out-2010s': {
    id: '37i9dQZF1DX5Ejj0EkURtP',
    key: 'all-out-2010s',
    category: 'decades',
    badge: '2010s Anthems',
    title: 'All Out 2010s',
    description: 'The biggest, most iconic songs that defined the 2010s decade',
    cover: 'https://image-cdn-fa.spotifycdn.com/image/ab67706f00000001ddeb90231491c14812b062ff',
    trackCount: 100
  },
  'all-out-2000s': {
    id: '37i9dQZF1DX4o1oenSJRJd',
    key: 'all-out-2000s',
    category: 'decades',
    badge: '2000s Throwbacks',
    title: 'All Out 2000s',
    description: 'Essential nostalgic hits from the turn of the millennium',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f00000001043bfef44142136749fc2917',
    trackCount: 100
  },
  'rock-classics': {
    id: '37i9dQZF1DWXRqgorJj26U',
    key: 'rock-classics',
    category: 'decades',
    badge: 'Legends of Rock',
    title: 'Rock Classics',
    description: 'Rock legends & timeless anthems that will live forever',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f00000001694bf33281695f3b7542a09a',
    trackCount: 100
  },
  'jazz-classics': {
    id: '37i9dQZF1DXbITWG1ZJKYt',
    key: 'jazz-classics',
    category: 'decades',
    badge: 'Timeless Jazz',
    title: 'Jazz Classics',
    description: 'Miles Davis, Coltrane, Ella Fitzgerald and the finest jazz legends',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f00000001d6717501a3dc7fdef7aa1694',
    trackCount: 100
  },
  'classical-essentials': {
    id: '37i9dQZF1DWWEJlAGA9gs0',
    key: 'classical-essentials',
    category: 'decades',
    badge: 'Classical Masters',
    title: 'Classical Essentials',
    description: 'Greatest orchestral and instrumental classical masterpieces',
    cover: 'https://image-cdn-ak.spotifycdn.com/image/ab67706f00000001762f5045eac92a372596acca',
    trackCount: 100
  }
};

const EXCLUDE_REMIX_REGEX = /(slowed|reverb|speed\s*up|sped\s*up|nightcore|bass\s*boost|8d\s*audio|remix|mash\s*up|mashup|non\s*stop|tiktok|ringtone|dj\s*mix|extended\s*mix|club\s*mix|status|whatsapp)/i;

/**
 * Parses any Spotify URL or URI to extract the resource type and ID
 */
export function parseSpotifyUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();

  // Match: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?...
  // Match: https://open.spotify.com/intl-es/track/02HyFYmpzt02VJ8k0CqxKj?...
  const webMatch = clean.match(/open\.spotify\.com\/(?:[a-zA-Z-]+\/)?(playlist|album|track)\/([a-zA-Z0-9]+)/i);
  if (webMatch) {
    return { type: webMatch[1].toLowerCase(), id: webMatch[2] };
  }

  // Match: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
  const uriMatch = clean.match(/spotify:(playlist|album|track):([a-zA-Z0-9]+)/i);
  if (uriMatch) {
    return { type: uriMatch[1].toLowerCase(), id: uriMatch[2] };
  }

  return null;
}

/**
 * Fetches playlist or album data from Spotify official embed service
 */
export async function getSpotifyEntity(type, id) {
  try {
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!res.ok) throw new Error(`Spotify embed returned status ${res.status}`);
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
    if (!match) throw new Error('Could not parse Spotify embed data');

    const nextData = JSON.parse(match[1]);
    const entity = nextData.props?.pageProps?.state?.data?.entity;
    if (!entity) throw new Error('No entity found in Spotify data');

    const rawTracks = entity.trackList || [];
    const tracks = rawTracks.map((t, idx) => ({
      spotifyId: t.uri ? t.uri.replace('spotify:track:', '') : `sp_${idx}`,
      title: t.title,
      artist: t.subtitle,
      duration: Math.round((t.duration || 0) / 1000),
      previewUrl: t.audioPreview?.url || null
    }));

    return {
      id: entity.id || id,
      type: entity.type || type,
      name: entity.name || entity.title || 'Spotify Playlist',
      description: entity.subtitle || entity.description || 'Curated by Spotify',
      cover: entity.visualIdentity?.image?.[0]?.url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
      trackCount: tracks.length,
      tracks
    };
  } catch (err) {
    console.error(`getSpotifyEntity (${type}/${id}) error:`, err.message);
    throw err;
  }
}

/**
 * Resolves a Spotify track (title + artist) to a playable 320kbps CD stream or YouTube audio
 */
export async function resolveTrackToPlayable(track) {
  if (!track || !track.title) return null;

  const searchQuery = `${track.title} ${track.artist || ''}`.trim();

  // 1. Try 320kbps Lossless Studio Master from JioSaavn first
  try {
    const results = await searchSongs(searchQuery, 5);
    if (results.length > 0) {
      const match = results[0];
      return {
        ...match,
        spotifyId: track.spotifyId,
        source: 'spotify-resolved',
        badge: 'Spotify 320k',
        isSpotify: true
      };
    }
  } catch (err) {
    // Continue to YouTube fallback
  }

  // 2. Fallback to clean YouTube audio
  try {
    const ytRes = await yts(`${searchQuery} audio`);
    const cleanVideo = (ytRes.videos || []).find(v => !EXCLUDE_REMIX_REGEX.test(v.title));
    if (cleanVideo) {
      return {
        id: `yt_${cleanVideo.videoId}`,
        youtubeId: cleanVideo.videoId,
        source: 'youtube',
        isAcoustic: /(acoustic|unplugged|cover)/i.test(cleanVideo.title),
        title: track.title,
        artist: track.artist || cleanVideo.author?.name || 'Unknown Artist',
        album: 'Spotify Stream',
        duration: cleanVideo.seconds || track.duration || 0,
        image: cleanVideo.thumbnail || `https://i.ytimg.com/vi/${cleanVideo.videoId}/hqdefault.jpg`,
        streamUrl: null,
        badge: 'YouTube Music'
      };
    }
  } catch (err) {
    console.warn(`Failed to resolve track ${searchQuery}:`, err.message);
  }

  return null;
}

/**
 * Fetches one of Spotify's official flagship charts or playlists
 */
export async function getSpotifyCharts(chartType = 'top-hits') {
  const chartConfig = SPOTIFY_PLAYLIST_MAP[chartType] || SPOTIFY_PLAYLIST_MAP['top-hits'];
  const entity = await getSpotifyEntity('playlist', chartConfig.id);
  return {
    ...entity,
    name: chartConfig.title,
    description: chartConfig.description,
    cover: chartConfig.cover || entity.cover,
    badge: chartConfig.badge || 'Official Spotify',
    category: chartConfig.category || 'charts',
    chartType
  };
}

/**
 * Returns the catalog of all official Spotify playlists
 */
export function getOfficialPlaylistsList(category) {
  const all = Object.values(SPOTIFY_PLAYLIST_MAP);
  if (!category || category === 'all') return all;
  return all.filter(p => p.category === category);
}

/**
 * Fetches and resolves a Spotify playlist by its map key or raw Spotify ID
 */
export async function getSpotifyPlaylistByKeyOrId(keyOrId) {
  const config = SPOTIFY_PLAYLIST_MAP[keyOrId];
  const playlistId = config ? config.id : keyOrId;

  const entity = await getSpotifyEntity('playlist', playlistId);
  return {
    ...entity,
    name: config?.title || entity.name,
    description: config?.description || entity.description,
    cover: config?.cover || entity.cover,
    badge: config?.badge || 'Official Spotify',
    category: config?.category || 'charts',
    key: config?.key || keyOrId
  };
}

