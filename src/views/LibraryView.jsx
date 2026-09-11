import React, { useState, useMemo } from 'react';
import {
  Heart, Plus, Play, Trash2,
  ArrowLeft, Music, Shuffle
} from 'lucide-react';
import SongRow from '../components/SongRow';
import { useUser } from '../context/UserContext';
import { useMusic } from '../context/MusicContext';

/* ─── Mosaic Cover: 2×2 grid of first 4 song images ─── */
function MosaicCover({ songs, className = '' }) {
  const imgs = songs.filter(s => s.image).slice(0, 4);
  if (imgs.length >= 4) {
    return (
      <div className={`playlist-mosaic ${className}`}>
        {imgs.map((s, i) => (
          <img key={i} src={s.image} alt="" />
        ))}
      </div>
    );
  }
  if (imgs.length > 0) {
    return <img src={imgs[0].image} alt="" className={`playlist-single-cover ${className}`} />;
  }
  return (
    <div className="playlist-liked-cover" style={{ fontSize: '1.8rem' }}>
      <Music size={36} color="rgba(255,255,255,0.5)" />
    </div>
  );
}

/* ─── Cover for Liked Songs (gradient heart) ─── */
function LikedCover({ songs, size = 'card' }) {
  const imgs = songs.filter(s => s.image).slice(0, 4);
  if (imgs.length >= 4 && size === 'hero') {
    return (
      <div className="playlist-mosaic" style={{ width: '100%', height: '100%' }}>
        {imgs.map((s, i) => <img key={i} src={s.image} alt="" />)}
      </div>
    );
  }
  return (
    <div className="playlist-liked-cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Heart size={30} color="#fff" fill="#ff3b68" />
    </div>
  );
}

/* ─── Format seconds to mm:ss or h:mm:ss ─── */
function fmtDuration(seconds) {
  if (!seconds || isNaN(seconds)) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function totalDuration(songs) {
  const total = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  return fmtDuration(total);
}

/* ─── Playlist Detail View ─── */
function PlaylistDetail({ playlist, isLiked, onBack, onOpenAddToPlaylist, userName }) {
  const { playSong } = useMusic();
  const { removeSongFromPlaylist } = useUser();

  const rawSongs = playlist.songs || [];
  const songs = useMemo(() => {
    const seen = new Set();
    return rawSongs.filter(s => {
      if (!s) return false;
      const idKey = s.id || `${s.title}-${s.artist}`;
      if (seen.has(idKey)) return false;
      seen.add(idKey);
      return true;
    });
  }, [rawSongs]);


  const heroBg = songs[0]?.image || playlist.cover;
  const dur = totalDuration(songs);

  const handlePlay = () => {
    if (songs.length > 0) playSong(songs[0], songs);
  };

  const handleShuffle = () => {
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    if (shuffled.length > 0) playSong(shuffled[0], shuffled);
  };

  return (
    <div className="playlist-detail-wrapper">
      {/* ── Hero ── */}
      <div className="playlist-hero">
        {/* Blurred bg */}
        <div
          className="playlist-hero-bg"
          style={{ backgroundImage: `url(${heroBg})` }}
        />

        {/* Back button */}
        <button className="playlist-hero-back" onClick={onBack}>
          <ArrowLeft size={18} /> Library
        </button>

        {/* Cover art */}
        <div className="playlist-hero-cover">
          {isLiked ? (
            <LikedCover songs={songs} size="hero" />
          ) : songs.filter(s => s.image).length >= 4 ? (
            <MosaicCover songs={songs} />
          ) : (
            <img
              src={songs[0]?.image || playlist.cover}
              alt={playlist.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>

        {/* Title + meta */}
        <div className="playlist-hero-text">
          <div className="playlist-hero-title">{playlist.name}</div>
          <div className="playlist-hero-meta">
            {isLiked ? 'Auto-generated · ' : ''}
            {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            {dur ? ` · ${dur}` : ''}
            {userName ? ` · By ${userName}` : ''}
          </div>

          {/* Play + Shuffle */}
          {songs.length > 0 && (
            <div className="playlist-hero-btns">
              <button className="playlist-play-btn" onClick={handlePlay}>
                <Play size={16} fill="#ffffff" strokeWidth={0} />
                Play
              </button>
              <button className="playlist-shuffle-btn" onClick={handleShuffle}>
                <Shuffle size={15} />
                Shuffle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Song List ── */}
      <div className="playlist-songs-list">
        {songs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.35)' }}>
            <Music size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontWeight: 600 }}>No songs yet</p>
            <p style={{ fontSize: '0.82rem', marginTop: '6px', color: 'rgba(255,255,255,0.4)' }}>
              {isLiked ? 'Tap the heart on any track to save it here.' : 'Search any song and tap + to add it here!'}
            </p>
          </div>
        ) : (
          songs.map((song, i) => (
            <div key={`${song.id || 'track'}-${i}`} style={{ position: 'relative' }}>
              <SongRow
                song={song}
                index={i}
                playlist={songs}
                onAddToPlaylist={onOpenAddToPlaylist}
              />
              {/* Remove button (not on liked songs) */}
              {!isLiked && (
                <button
                  onClick={() => removeSongFromPlaylist(playlist.id, song.id)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.25)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Remove from playlist"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Main LibraryView ─── */
export default function LibraryView({
  onOpenAddToPlaylist,
  onOpenPlaylistId,
  onClearPendingPlaylistId,
  onOpenPlaylist = null,
  onSearchArtist = null
}) {
  const { playlists = [], deletePlaylist, createPlaylist, userName } = useUser();
  const { likedSongs = [], recentSongs = [], playSong, openPlaylist: globalOpenPlaylist } = useMusic();
  const handleSelectPlaylist = onOpenPlaylist || globalOpenPlaylist;

  const [activeFilter, setActiveFilter] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  /* Virtual "Liked Songs" playlist always pinned at top */
  const likedPlaylist = useMemo(() => ({
    id: '__liked__',
    name: 'Liked Songs',
    songs: likedSongs,
    isLiked: true,
    cover: null
  }), [likedSongs]);

  // Auto-open a playlist by ID (for deep-link from Home)
  React.useEffect(() => {
    if (onOpenPlaylistId) {
      if (onOpenPlaylistId === '__liked__') {
        handleSelectPlaylist(likedPlaylist);
      } else {
        const pl = playlists.find(p => p.id === onOpenPlaylistId);
        if (pl) handleSelectPlaylist({ ...pl, isUserPlaylist: true });
      }
      if (onClearPendingPlaylistId) onClearPendingPlaylistId();
    }
  }, [onOpenPlaylistId, playlists, likedPlaylist]);

  const handleCreatePlaylist = (e) => {
    e.preventDefault();
    if (newTitle.trim()) {
      createPlaylist(newTitle.trim());
      setNewTitle('');
      setIsCreating(false);
    }
  };

  const handleOpenPlaylist = (pl) => {
    if (pl.id === '__liked__') {
      handleSelectPlaylist(likedPlaylist);
    } else {
      const fresh = playlists.find(p => p.id === pl.id) || pl;
      handleSelectPlaylist({ ...fresh, isUserPlaylist: true });
    }
  };

  const handlePlayCard = (e, pl) => {
    e.stopPropagation();
    const songs = pl.id === '__liked__' ? likedSongs : pl.songs;
    if (songs.length > 0) playSong(songs[0], songs);
  };

  /* Filtered view */
  const filteredPlaylists = useMemo(() => {
    if (activeFilter === 'liked') return [];
    if (activeFilter === 'history') return [];
    return playlists;
  }, [playlists, activeFilter]);

  return (
    <div>
      {/* ── Header ── */}
      <header className="top-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
            Your Library
          </h2>
          <button
            onClick={() => setIsCreating(true)}
            className="action-btn"
            title="Create new playlist"
          >
            <Plus size={22} />
          </button>
        </div>
      </header>

      {/* ── Filter Pills ── */}
      <div className="library-filter-row">
        {[
          { id: 'all', label: 'All' },
          { id: 'playlists', label: 'Playlists' },
          { id: 'liked',   label: 'Liked Songs' },
          { id: 'history', label: 'Recent' },
        ].map(f => (
          <button
            key={f.id}
            className={`library-filter-pill ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>


      {/* ── Create Playlist Inline Form ── */}
      {isCreating && (
        <form onSubmit={handleCreatePlaylist} style={{ margin: '0 16px 12px 16px', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Playlist name..."
            className="romantic-input"
            style={{ marginBottom: 0 }}
            autoFocus
            required
          />
          <button type="submit" className="primary-btn" style={{ width: 'auto', padding: '0 18px' }}>
            Create
          </button>
          <button type="button" onClick={() => { setIsCreating(false); setNewTitle(''); }}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '12px', padding: '0 14px', cursor: 'pointer' }}>
            Cancel
          </button>
        </form>
      )}

      {/* ── Playlists Grid ── */}
      {(activeFilter === 'all' || activeFilter === 'playlists') && (
        <div className="playlist-grid">
          {/* Liked Songs — always pinned first */}
          <div
            className="playlist-card liked-songs-card"
            onClick={() => handleOpenPlaylist(likedPlaylist)}
          >
            <LikedCover songs={likedSongs} />
            <button
              className="playlist-card-play-overlay"
              onClick={e => handlePlayCard(e, likedPlaylist)}
            >
              <Play size={16} fill="#ffffff" strokeWidth={0} />
            </button>
            <div className="playlist-card-info">
              <div className="playlist-card-name">Liked Songs</div>
              <div className="playlist-card-meta">{likedSongs.length} songs · Auto</div>
            </div>
          </div>

          {/* User playlists */}
          {filteredPlaylists.map(pl => {
            const imgs = pl.songs.filter(s => s.image);
            return (
              <div
                key={pl.id}
                className="playlist-card"
                onClick={() => handleOpenPlaylist(pl)}
              >
                {/* Cover */}
                {imgs.length >= 4 ? (
                  <MosaicCover songs={pl.songs} />
                ) : imgs.length > 0 ? (
                  <img src={imgs[0].image} alt={pl.name} className="playlist-single-cover" />
                ) : (
                  <img src={pl.cover} alt={pl.name} className="playlist-single-cover" />
                )}

                {/* Quick-play overlay */}
                <button
                  className="playlist-card-play-overlay"
                  onClick={e => handlePlayCard(e, pl)}
                >
                  <Play size={16} fill="#ffffff" strokeWidth={0} />
                </button>

                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                  style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.55)', border: 'none',
                    borderRadius: '8px', color: 'rgba(255,255,255,0.55)',
                    width: '26px', height: '26px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 3
                  }}
                  title="Delete playlist"
                >
                  <Trash2 size={12} />
                </button>

                <div className="playlist-card-info">
                  <div className="playlist-card-name">{pl.name}</div>
                  <div className="playlist-card-meta">{pl.songs.length} songs</div>
                </div>
              </div>
            );
          })}

          {/* Empty state for user playlists */}
          {filteredPlaylists.length === 0 && (
            <div
              onClick={() => setIsCreating(true)}
              className="playlist-card"
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                minHeight: '160px', gap: '8px',
                border: '1.5px dashed rgba(255,59,104,0.3)',
                background: 'rgba(255,59,104,0.05)'
              }}
            >
              <Plus size={24} color="#ff85a2" />
              <span style={{ fontSize: '0.80rem', color: '#ff85a2', fontWeight: 600, textAlign: 'center', padding: '0 12px' }}>
                Create your first playlist
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Liked Songs tab ── */}
      {activeFilter === 'liked' && (
        <div>
          {/* Mini hero for liked */}
          <div style={{
            margin: '0 16px 16px', padding: '16px', borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(153,51,255,0.2) 0%, rgba(255,59,104,0.2) 100%)',
            border: '1px solid rgba(162,56,255,0.25)',
            display: 'flex', gap: '14px', alignItems: 'center'
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '12px', flexShrink: 0,
              background: 'linear-gradient(135deg, #9933ff 0%, #ff3b68 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><Heart size={28} color="#fff" fill="#ff3b68" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: '3px' }}>
                Liked Songs
              </div>
              <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)' }}>
                {likedSongs.length} songs you've hearted
              </div>
              {likedSongs.length > 0 && (
                <button
                  onClick={() => likedSongs.length > 0 && playSong(likedSongs[0], likedSongs)}
                  style={{
                    marginTop: '10px', background: 'var(--gradient-romantic)',
                    border: 'none', borderRadius: '100px', color: '#fff',
                    padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer'
                  }}
                >
                  <Play size={12} fill="#ffffff" strokeWidth={0} /> Play All
                </button>
              )}
            </div>
          </div>

          {likedSongs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'rgba(255,255,255,0.35)' }}>
              <Heart size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
              <p style={{ fontWeight: 600 }}>No favorites yet!</p>
              <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>Tap the heart on any track to save it here.</p>
            </div>
          ) : (
            likedSongs.map((song, i) => (
              <SongRow
                key={`${song.id || 'liked'}-${i}`}
                song={song}
                index={i}
                playlist={likedSongs}
                onAddToPlaylist={onOpenAddToPlaylist}
              />
            ))
          )}
        </div>
      )}

      {/* ── Recent tab ── */}
      {activeFilter === 'history' && (
        <div>
          {recentSongs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'rgba(255,255,255,0.35)' }}>
              <Clock size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
              <p style={{ fontWeight: 600 }}>No history yet.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>Listen to any song for 45s+ and it'll appear here.</p>
            </div>
          ) : (
            recentSongs.map((song, i) => (
              <SongRow
                key={`${song.id || 'recent'}-${i}`}
                song={song}
                index={i}
                playlist={recentSongs}
                onAddToPlaylist={onOpenAddToPlaylist}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
