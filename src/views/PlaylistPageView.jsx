import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  Play,
  Shuffle,
  Bookmark,
  Check,
  Heart,
  Music,
  Trash2,
  Share2,
  Clock,
  Sparkles
} from 'lucide-react';
import SongRow from '../components/SongRow';
import { useMusic } from '../context/MusicContext';
import { useUser } from '../context/UserContext';

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

function fmtDuration(seconds) {
  if (!seconds || isNaN(seconds)) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

export default function PlaylistPageView({
  playlist: inputPlaylist,
  onBack,
  onOpenAddToPlaylist,
  onSearchArtist
}) {
  const { playSong, likedSongs } = useMusic();
  const { playlists, deletePlaylist, createPlaylist, addSongToPlaylist, userName } = useUser();

  const [fetchedData, setFetchedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  // Determine category
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

  // Fetch online tracks if needed
  useEffect(() => {
    if (!inputPlaylist) return;
    if (isLiked || isUserPlaylist) return;

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
        console.error('Failed to load playlist:', err);
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
  const songs = rawSongs.filter((s, idx, arr) => {
    if (!s) return false;
    const idKey = s.id || `${s.title}-${s.artist}`;
    return arr.findIndex(item => (item?.id || `${item?.title}-${item?.artist}`) === idKey) === idx;
  });

  const totalSecs = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const durLabel = fmtDuration(totalSecs);

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

  const handleDeletePlaylist = () => {
    if (window.confirm(`Are you sure you want to delete "${currentPlaylist.name}"?`)) {
      deletePlaylist(currentPlaylist.id);
      if (onBack) onBack();
    }
  };

  // Determine cover art
  const coverArt = useMemo(() => {
    if (isLiked) {
      return (
        <div className="playlist-page-cover liked">
          <Heart size={56} color="#ffffff" fill="#ffffff" />
        </div>
      );
    }

    const imgs = songs.filter(s => s?.image).slice(0, 4);
    if (imgs.length >= 4) {
      return (
        <div className="playlist-page-cover mosaic">
          {imgs.map((s, i) => (
            <img key={i} src={s.image} alt="" />
          ))}
        </div>
      );
    }

    const singleImg = currentPlaylist?.cover || (imgs.length > 0 ? imgs[0].image : null);
    if (singleImg) {
      return (
        <div className="playlist-page-cover">
          <img src={singleImg} alt={currentPlaylist?.name} />
        </div>
      );
    }

    return (
      <div className="playlist-page-cover placeholder">
        <Music size={50} color="rgba(255,255,255,0.4)" />
      </div>
    );
  }, [isLiked, songs, currentPlaylist]);

  const isYt = currentPlaylist?.source === 'youtube';
  const isSaavn = currentPlaylist?.source === 'saavn';
  const isSp = !isYt && !isSaavn && !isUserPlaylist && !isLiked;
  const heroBg = currentPlaylist?.cover || (songs[0]?.image) || null;

  return (
    <div className="playlist-page-view">
      {/* Dynamic Ambient Background Blur */}
      {heroBg && (
        <div
          className="playlist-page-ambient"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
      )}

      {/* Top Header Bar inside page */}
      <div className="playlist-page-topbar">
        {onBack && (
          <button className="playlist-back-btn" onClick={onBack} title="Go back">
            <ChevronLeft size={22} />
            <span>Back</span>
          </button>
        )}

        <div className="playlist-page-topbar-title">
          {currentPlaylist?.name}
        </div>

        <div className="playlist-page-topbar-actions">
          {isUserPlaylist && !isLiked && (
            <button
              className="playlist-action-btn-circle delete"
              onClick={handleDeletePlaylist}
              title="Delete Playlist"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Hero Header Section */}
      <div className="playlist-page-hero">
        <div className="playlist-hero-cover-container">
          {coverArt}
        </div>

        <div className="playlist-hero-details">
          <div className="playlist-hero-badge-row">
            {isLiked ? (
              <span className="playlist-hero-badge liked">
                <Heart size={13} fill="#ff3b68" color="#ff3b68" />
                <span>Liked Songs</span>
              </span>
            ) : isUserPlaylist ? (
              <span className="playlist-hero-badge user">
                <Music size={13} />
                <span>Personal Playlist</span>
              </span>
            ) : isYt ? (
              <span className="playlist-hero-badge yt">
                <YoutubeIcon size={14} />
                <span>YouTube Music</span>
              </span>
            ) : (
              <span className="playlist-hero-badge spotify">
                <SpotifyIcon size={14} />
                <span>Spotify Verified</span>
              </span>
            )}

            {currentPlaylist?.badge && !isLiked && !isUserPlaylist && (
              <span className="playlist-hero-subbadge">{currentPlaylist.badge}</span>
            )}
          </div>

          <h1 className="playlist-hero-title">{currentPlaylist?.name || 'Playlist'}</h1>

          {currentPlaylist?.description && (
            <p className="playlist-hero-desc">{currentPlaylist.description}</p>
          )}

          <div className="playlist-hero-meta">
            <span className="playlist-hero-author">
              {isLiked || isUserPlaylist ? (userName || 'You') : (currentPlaylist?.author || 'Spotify Curated')}
            </span>
            <span className="meta-dot">•</span>
            <span>{songs.length} songs</span>
            {durLabel && (
              <>
                <span className="meta-dot">•</span>
                <span>{durLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="playlist-page-actions">
        <button
          className="playlist-play-all-btn"
          onClick={handlePlayAll}
          disabled={loading || songs.length === 0}
          title="Play playlist"
        >
          <Play size={22} fill="#08070d" strokeWidth={0} style={{ marginLeft: '3px' }} />
        </button>

        <button
          className="playlist-shuffle-btn"
          onClick={handleShuffle}
          disabled={loading || songs.length === 0}
          title="Shuffle play"
        >
          <Shuffle size={20} />
        </button>

        {!isUserPlaylist && !isLiked && (
          <button
            className={`playlist-save-btn ${savedToLibrary ? 'saved' : ''}`}
            onClick={handleSaveToLibrary}
            title={savedToLibrary ? 'Saved to Your Library' : 'Save to Your Library'}
          >
            {savedToLibrary ? <Check size={18} /> : <Bookmark size={18} />}
            <span>{savedToLibrary ? 'Saved' : 'Save to Library'}</span>
          </button>
        )}
      </div>

      {/* Tracks Table / List */}
      <div className="playlist-page-tracks">
        {loading ? (
          <div className="playlist-loading-state">
            <div className="equalizer">
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
            <span>Fetching full studio audio tracks...</span>
          </div>
        ) : songs.length > 0 ? (
          <div className="playlist-tracks-container">
            {/* Table Header on wider screens */}
            <div className="playlist-tracks-header">
              <span className="th-num">#</span>
              <span className="th-title">Title</span>
              <span className="th-actions">Actions</span>
            </div>

            {songs.map((song, i) => (
              <SongRow
                key={song.id || `${song.title}-${i}`}
                song={song}
                index={i}
                playlist={songs}
                onAddToPlaylist={onOpenAddToPlaylist}
                onSearchArtist={onSearchArtist}
              />
            ))}
          </div>
        ) : (
          <div className="playlist-empty-state">
            <Music size={40} color="rgba(255,255,255,0.3)" />
            <p>No songs found in this playlist yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
