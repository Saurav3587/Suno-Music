import { searchSongs, getTrendingSongs } from './autoPlaylistService.js';

/**
 * Clean & direct song recommendations without complex algorithmic scoring or graphs.
 * Simply returns popular songs by the given artist or trending songs.
 */
export async function getHybridRecommendations({ seedSong = null, limit = 10 }) {
  try {
    const artist = seedSong?.artist ? seedSong.artist.split(/[,&]/)[0].trim() : '';
    if (artist) {
      const results = await searchSongs(`${artist} songs`, limit);
      const filtered = results.filter(s => s.id !== seedSong?.id);
      if (filtered.length > 0) return filtered;
    }
    return await getTrendingSongs(limit);
  } catch (err) {
    console.error('Recommendations error:', err.message);
    return await getTrendingSongs(limit).catch(() => []);
  }
}
