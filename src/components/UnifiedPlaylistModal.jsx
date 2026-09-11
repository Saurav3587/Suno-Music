import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  X,
  Play,
  Shuffle,
  Bookmark,
  Check,
  Heart,
  Music,
  Trash2,
  Disc3,
  Sparkles,
  Share2
} from 'lucide-react';
import SongRow from './SongRow';
import { useMusic } from '../context/MusicContext';
import { useUser } from '../context/UserContext';

/* ─── Source Icons ─── */
const SpotifyIcon = ({ size = 15, color = '#1db954' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.307c-.218.358-.686.471-1.044.253-2.864-1.75-6.47-2.146-10.718-1.176-.411.094-.823-.16-.917-.571-.094-.411.16-.823.571-.917 4.654-1.063 8.647-.611 11.855 1.348.358.218.471.686.253 1.063zm1.472-3.276c-.275.447-.86.589-1.307.314-3.28-2.016-8.28-2.599-12.16-1.421-.502.152-1.037-.133-1.189-.635-.152-.502.133-1.037.635-1.189 4.433-1.344 9.94-.7-13.626 1.564.447.275.589.86.314 1.307zm.126-3.41c-3.933-2.336-10.426-2.55-14.204-1.403-.604.183-1.246-.162-1.429-.766-.183-.604.162-1.246.766-1.429 4.343-1.318 11.516-1.069 16.037 1.614.542.322.721 1.026.399 1.568-.322.542-1.026.721-1.568.399z" />
  </svg>
);

const YoutubeIcon = ({ size = 16, color = '#ff0000' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" fill={color} />
    <polygon points="10 15 15 12 10 9" fill="#ffffff" />
  </svg>
);

/* ─── Duration Helper ─── */
function fmtDuration(seconds) {
  if (!seconds || isNaN(seconds)) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default function UnifiedPlaylistModal({ playlist: inputPlaylist, onClose, onOpenAddToPlaylist }) {
  const { playSong, likedSongs } = useMusic();
  const { playlists, deletePlaylist, removeSongFromPlaylist, createPlaylist, addSongToPlaylist, userName } = useUser();

  const [fetchedData, setFetchedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  // Determine playlist category
  const isLiked = inputPlaylist?.isLiked || inputPlaylist?.id === '__liked__';
  const matchingUserPl = useMemo(() => {
    if (isLiked || !inputPlaylist?.id) return null;
    return playlists.find(p => p.id === inputPlaylist.id) || null;
  }, [playlists, inputPlaylist, isLiked]);

  const isUserPlaylist = Boolean(inputPlaylist?.isUserPlaylist || matchingUserPl);

  // Current reactive playlist data
  const currentPlaylist = useMemo(() => {
    if (!inputPlaylist) return null;
    if (isLiked) {
      return {
        id: '__liked__',
        name: 'Liked Songs',
        description: 'Your favorite tracks saved with heart',
        badge: 'Favorites',
        isLiked: true,
        songs: likedSongs
      };
    }
    if (matchingUserPl) {
      return {
        ...matchingUserPl,
        isUserPlaylist: true
      };
    }
    if (fetchedData) {
      return {
        ...inputPlaylist,
        ...fetchedData
      };
    }
    return inputPlaylist;
  }, [inputPlaylist, isLiked, likedSongs, matchingUserPl, fetchedData]);

  // Fetch online tracks if needed (Spotify / YouTube / Studio 320k)
  useEffect(() => {
    if (!inputPlaylist) return;
    if (isLiked || isUserPlaylist) return;

    // Check if songs are already provided
    if (Array.isArray(inputPlaylist.songs) && inputPlaylist.songs.length > 0) {
      return;
    }

    const keyOrId = inputPlaylist.key || inputPlaylist.id;
    if (!keyOrId) return;

    let isMounted = true;
    const fetchOnlinePlaylist = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/spotify/playlist/${keyOrId}`);
        const data = await res.json();
        if (isMounted && data && !data.error) {
          setFetchedData(data);
        }
      } catch (err) {
        console.error('Failed to load online playlist:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOnlinePlaylist();
    return () => {
      isMounted = false;
    };
  }, [inputPlaylist, isLiked, isUserPlaylist]);

  if (!inputPlaylist) return null;

  const rawSongs = currentPlaylist?.songs || [];
  // Deduplicate songs by id or title
  const songs = rawSongs.filter((s, idx, arr) => {
    if (!s) return false;
    const idKey = s.id || `${s.title}-${s.artist}`;
    return arr.findIndex(item => (item?.id || `${item?.title}-${item?.artist}`) === idKey) === idx;
  });

  const totalSecs = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const durLabel = fmtDuration(totalSecs);

  // Playback Handlers
  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs);
    }
  };

  const handleShuffle = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled);
    }
  };

  // Save public playlist to library
  const handleSaveToLibrary = () => {
    if (!currentPlaylist || savedToLibrary) return;
    const newPl = createPlaylist(currentPlaylist.name || 'Saved Playlist');
    if (newPl && songs.length > 0) {
      songs.slice(0, 40).forEach(song => {
        addSongToPlaylist(newPl.id, song);
      });
      setSavedToLibrary(true);
      setTimeout(() => setSavedToLibrary(false), 3500);
    }
  };

  // Delete user playlist
  const handleDeletePlaylist = () => {
    if (window.confirm(`Are you sure you want to delete "${currentPlaylist.name}"?`)) {
      deletePlaylist(currentPlaylist.id);
      onClose();
    }
  };

  // Determine cover art
  const coverArt = useMemo(() => {
    if (isLiked) {
      return (
        <div className="unified-playlist-cover liked">
          <Heart size={44} color="#ffffff" fill="#ffffff" />
        </div>
      );
    }

    const imgs = songs.filter(s => s?.image).slice(0, 4);
    if (imgs.length >= 4) {
      return (
        <div className="unified-playlist-cover mosaic">
          {imgs.map((s, i) => (
            <img key={i} src={s.image} alt="" />
          ))}
        </div>
      );
    }

    const singleImg = currentPlaylist?.cover || (imgs.length > 0 ? imgs[0].image : null);
    if (singleImg) {
      return (
        <div className="unified-playlist-cover">
          <img src={singleImg} alt={currentPlaylist.name} />
        </div>
      );
    }

    return (
      <div className="unified-playlist-cover placeholder">
        <Music size={40} color="rgba(255,255,255,0.4)" />
      </div>
    );
  }, [isLiked, songs, currentPlaylist]);

  const isYt = currentPlaylist?.source === 'youtube';
  const isSaavn = currentPlaylist?.source === 'saavn';
  const isSp = !isYt && !isSaavn && !isUserPlaylist && !isLiked;

  return (
    <div className="unified-playlist-overlay" onClick={onClose}>
      <div className="unified-playlist-sheet" onClick={e => e.stopPropagation()}>
        {/* Ambient Top Glow from cover art */}
        {currentPlaylist?.cover && (
          <div
            className="unified-playlist-ambient"
            style={{ backgroundImage: `url(${currentPlaylist.cover})` }}
          />
        )}

        {/* Grabber Bar */}
        <div className="unified-sheet-grabber" />

        {/* Top Navigation Bar */}
        <header className="unified-playlist-header">
          <button className="unified-back-pill" onClick={onClose}>
            <ChevronLeft size={20} />
            <span>Back</span>
          </button>

          <div className="unified-header-title">
            <span>{currentPlaylist?.name}</span>
          </div>

          <div className="unified-header-actions">
            {isUserPlaylist && !isLiked && (
              <button
                className="unified-icon-btn delete"
                onClick={handleDeletePlaylist}
                title="Delete Playlist"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button className="unified-icon-btn close" onClick={onClose} title="Close">
              <X size={19} />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="unified-playlist-body">
          {/* Hero Section */}
          <div className="unified-hero-section">
            <div className="unified-hero-art-wrapper">
              {coverArt}
            </div>

            <div className="unified-hero-info">
              {/* Badge */}
              <div className="unified-hero-badge-row">
                {isLiked ? (
                  <span className="unified-badge liked">
                    <Heart size={11} fill="currentColor" /> Favorites
                  </span>
                ) : isUserPlaylist ? (
                  <span className="unified-badge user">
                    <Music size={11} /> Your Library
                  </span>
                ) : isYt ? (
                  <span className="unified-badge yt">
                    <YoutubeIcon size={12} color="#ff3333" /> YouTube Music
                  </span>
                ) : isSaavn ? (
                  <span className="unified-badge saavn">
                    <Sparkles size={11} /> Studio 320k
                  </span>
                ) : (
                  <span className="unified-badge spotify">
                    <SpotifyIcon size={12} /> Spotify Official
                  </span>
                )}
              </div>

              <h1 className="unified-hero-title">{currentPlaylist?.name}</h1>

              {currentPlaylist?.description && (
                <p className="unified-hero-desc">{currentPlaylist.description}</p>
              )}

              <div className="unified-hero-meta">
                <span>{currentPlaylist?.author || (isUserPlaylist ? `By ${userName}` : 'Curated')}</span>
                <span>•</span>
                <span>{songs.length} {songs.length === 1 ? 'song' : 'songs'}</span>
                {durLabel && (
                  <>
                    <span>•</span>
                    <span>{durLabel}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Row: Play All, Shuffle, Save to Library */}
          <div className="unified-action-row">
            <button
              className="unified-play-all-btn"
              onClick={handlePlayAll}
              disabled={songs.length === 0}
            >
              <Play size={18} fill="#ffffff" strokeWidth={0} />
              <span>Play All</span>
            </button>

            <button
              className="unified-shuffle-btn"
              onClick={handleShuffle}
              disabled={songs.length === 0}
              title="Shuffle"
            >
              <Shuffle size={18} />
            </button>

            {!isUserPlaylist && !isLiked && (
              <button
                className={`unified-save-btn ${savedToLibrary ? 'saved' : ''}`}
                onClick={handleSaveToLibrary}
                disabled={songs.length === 0 || savedToLibrary}
              >
                {savedToLibrary ? (
                  <>
                    <Check size={16} />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Bookmark size={16} />
                    <span>Add to Library</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Song Rows List */}
          <div className="unified-tracklist">
            {loading ? (
              <div className="unified-loading-state">
                <Disc3 size={32} className="spin-slow" color="#ff3b68" />
                <p>Loading master tracklist...</p>
              </div>
            ) : songs.length === 0 ? (
              <div className="unified-empty-state">
                <Music size={42} style={{ opacity: 0.35, marginBottom: '10px' }} />
                <h3>No songs in this playlist</h3>
                <p>
                  {isLiked
                    ? 'Tap the heart on any song to save it here.'
                    : 'Search any track and tap the "+" button to add songs here.'}
                </p>
              </div>
            ) : (
              songs.map((song, i) => (
                <div key={`${song.id || 'track'}-${i}`} className="unified-song-row-wrapper">
                  <SongRow
                    song={song}
                    index={i}
                    playlist={songs}
                    onAddToPlaylist={onOpenAddToPlaylist}
                  />
                  {/* Remove button for user playlists */}
                  {isUserPlaylist && !isLiked && (
                    <button
                      className="unified-song-remove-btn"
                      onClick={() => removeSongFromPlaylist(currentPlaylist.id, song.id)}
                      title="Remove from playlist"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
