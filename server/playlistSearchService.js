import yts from 'yt-search';
import { Innertube } from 'youtubei.js';
import { normalizeSong } from './decrypt.js';
import { SPOTIFY_PLAYLIST_MAP, getSpotifyPlaylistByKeyOrId } from './spotifyService.js';
import { deduplicateTrackList } from './dedupService.js';

let innertubeInstance = null;
let innertubeInitPromise = null;

async function getInnertube() {
  if (innertubeInstance) return innertubeInstance;
  if (!innertubeInitPromise) {
    innertubeInitPromise = Innertube.create().then(yt => {
      innertubeInstance = yt;
      return yt;
    }).catch(err => {
      console.warn('Innertube init failed:', err.message);
      innertubeInitPromise = null;
      return null;
    });
  }
  return innertubeInitPromise;
}

/**
 * Searches across YouTube Music, JioSaavn, and Spotify playlists matching the query
 */
export async function searchAllPlaylists(query, limit = 12) {
  if (!query || !query.trim()) return [];

  const cleanQuery = query.trim();
  const results = [];

  // 1. YouTube Music Playlists
  const ytPromise = (async () => {
    try {
      const searchRes = await yts(`${cleanQuery} playlist`);
      const playlists = (searchRes?.playlists || []).slice(0, 6).map(p => ({
        id: `yt_pl_${p.listId}`,
        listId: p.listId,
        name: p.title?.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
        cover: p.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
        trackCount: p.videoCount || 25,
        source: 'youtube',
        badge: 'YouTube Music',
        author: p.author?.name || 'YouTube Music'
      }));
      return playlists;
    } catch (e) {
      console.warn('YouTube playlist search error:', e.message);
      return [];
    }
  })();

  // 2. JioSaavn Official Curated Playlists
  const saavnPromise = (async () => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=search.getPlaylistResults&q=${encodeURIComponent(cleanQuery)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=6`;
      const res = await fetch(url);
      const data = await res.json();
      const playlists = (data?.results || []).map(p => ({
        id: `saavn_pl_${p.id}`,
        listId: p.id,
        name: p.title?.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
        cover: (p.image || '').replace('150x150', '500x500') || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
        trackCount: parseInt(p.more_info?.song_count || '25', 10),
        source: 'saavn',
        badge: 'Studio 320k',
        author: p.more_info?.subtitle || 'JioSaavn Curated'
      }));
      return playlists;
    } catch (e) {
      console.warn('JioSaavn playlist search error:', e.message);
      return [];
    }
  })();

  // 3. Spotify Official Flagship Playlists matching query keywords
  const spotifyMatches = Object.values(SPOTIFY_PLAYLIST_MAP)
    .filter(pl => {
      const text = `${pl.title} ${pl.description} ${pl.category} ${pl.badge}`.toLowerCase();
      const qLower = cleanQuery.toLowerCase();
      const tokens = qLower.split(/\s+/);
      return tokens.some(tok => tok.length > 2 && text.includes(tok));
    })
    .slice(0, 4)
    .map(pl => ({
      id: `sp_pl_${pl.key}`,
      key: pl.key,
      name: pl.title,
      cover: pl.cover,
      trackCount: pl.trackCount || 50,
      source: 'spotify',
      badge: pl.badge || 'Spotify',
      author: 'Spotify Official'
    }));

  const [ytList, saavnList] = await Promise.all([ytPromise, saavnPromise]);

  // Interleave and de-duplicate by name
  const combined = [];
  const seen = new Set();

  const allItems = [...ytList, ...saavnList, ...spotifyMatches];
  for (const pl of allItems) {
    const key = (pl.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(pl);
    }
  }

  return combined.slice(0, limit);
}

/**
 * Loads the full playable tracklist of any playlist (YouTube Music, JioSaavn, or Spotify)
 */
export async function getPlaylistDetails(playlistId, initialData = null) {
  if (!playlistId) throw new Error('Missing playlist ID');

  // Case 1: YouTube Music Playlist
  if (playlistId.startsWith('yt_pl_')) {
    const listId = playlistId.replace('yt_pl_', '');
    try {
      const yt = await getInnertube();
      if (yt) {
        const pl = await yt.getPlaylist(listId);
        const videos = (pl?.videos || []).slice(0, 50).map(v => {
          const videoId = v.content_id || v.id;
          const title = v.metadata?.title?.text || v.metadata?.title || v.title?.text || 'Unknown Video';
          const author = v.metadata?.metadata?.lines?.[0]?.text || v.author?.name || 'YouTube Artist';
          const thumb = v.content_image?.image?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          return {
            id: `yt_${videoId}`,
            youtubeId: videoId,
            title: title.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
            artist: author,
            album: pl.info?.title || 'YouTube Music Playlist',
            image: thumb,
            source: 'youtube',
            streamUrl: null
          };
        }).filter(v => v.youtubeId);

        return {
          id: playlistId,
          listId,
          name: pl.info?.title || initialData?.name || 'YouTube Music Playlist',
          cover: initialData?.cover || (videos[0]?.image) || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
          badge: 'YouTube Music',
          source: 'youtube',
          trackCount: videos.length,
          songs: videos
        };
      }
    } catch (err) {
      console.warn('Innertube getPlaylist error:', err.message);
    }

    // Fallback: search videos by playlist title
    if (initialData?.name) {
      try {
        const searchRes = await yts(initialData.name);
        const videos = (searchRes?.videos || []).slice(0, 25).map(v => ({
          id: `yt_${v.videoId}`,
          youtubeId: v.videoId,
          title: v.title,
          artist: v.author?.name || 'YouTube Artist',
          album: initialData.name,
          image: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          duration: v.seconds || 0,
          source: 'youtube',
          streamUrl: null
        }));
        return {
          id: playlistId,
          name: initialData.name,
          cover: initialData.cover,
          badge: 'YouTube Music',
          source: 'youtube',
          trackCount: videos.length,
          songs: videos
        };
      } catch (e) {}
    }
  }

  // Case 2: JioSaavn Official Playlist
  if (playlistId.startsWith('saavn_pl_')) {
    const listId = playlistId.replace('saavn_pl_', '');
    const url = `https://www.jiosaavn.com/api.php?__call=playlist.getDetails&listid=${listId}&_format=json&_marker=0&api_version=4&ctx=web6dot0`;
    const res = await fetch(url);
    const data = await res.json();
    const rawList = data.list || [];
    const songs = rawList.map(normalizeSong).filter(s => s && s.streamUrl);
    const deduped = deduplicateTrackList(songs, { maxCount: 50 });

    return {
      id: playlistId,
      name: data.title?.replace(/&quot;/g, '"').replace(/&#039;/g, "'") || initialData?.name || 'Curated Playlist',
      cover: (data.image || '').replace('150x150', '500x500') || initialData?.cover,
      badge: 'Studio 320k',
      source: 'saavn',
      trackCount: deduped.length,
      songs: deduped
    };
  }

  // Case 3: Spotify Playlist
  const spotifyKey = playlistId.replace('sp_pl_', '');
  return await getSpotifyPlaylistByKeyOrId(spotifyKey);
}
