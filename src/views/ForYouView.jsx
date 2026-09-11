import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Play, Radio, Flame, Moon, Compass } from 'lucide-react';
import SongRow from '../components/SongRow';
import { useMusic } from '../context/MusicContext';
import { useUser } from '../context/UserContext';

export default function ForYouView({ onOpenAddToPlaylist, onSearchArtist }) {
  const { recentSongs, playSong } = useMusic();
  const { userName } = useUser();

  const [activeType, setActiveType] = useState('vibe-radar');
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(false);

  const playlistTypes = [
    { id: 'vibe-radar', label: 'Vibe Radar', icon: Compass, color: '#ff758c' },
    { id: 'radio', label: 'Artist Radio', icon: Radio, color: '#e056fd' },
    { id: 'global', label: 'Global Pulse', icon: Flame, color: '#ff3b68' },
    { id: 'acoustics', label: 'Acoustic Chill', icon: Moon, color: '#4facfe' }
  ];

  // Fetch or regenerate the auto-playlist
  const loadPlaylist = async (type = activeType) => {
    setLoading(true);
    try {
      const seed = recentSongs.length > 0 ? recentSongs[0] : null;
      const res = await fetch('/api/auto-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentSongs: recentSongs.slice(0, 10),
          type,
          seedSong: seed
        })
      });
      const data = await res.json();
      setPlaylist(data);
    } catch (err) {
      console.error('Failed to generate auto playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylist(activeType);
  }, [activeType]);

  const handlePlayAll = () => {
    if (playlist && playlist.songs && playlist.songs.length > 0) {
      playSong(playlist.songs[0], playlist.songs);
    }
  };

  return (
    <div>
      <header className="top-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="#ff3b68" />
          <span>Smart Mixes for {userName}</span>
        </h2>
      </header>

      {/* Playlist Type Selector Tabs */}
      <div className="genre-pills-row" style={{ marginTop: '8px' }}>
        {playlistTypes.map(t => {
          const Icon = t.icon;
          const isActive = activeType === t.id;
          return (
            <button
              key={t.id}
              className={`genre-pill ${isActive ? 'active' : ''}`}
              onClick={() => setActiveType(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hero Auto Playlist Banner */}
      {playlist && (
        <div
          className="auto-banner"
          style={{ background: playlist.gradient }}
        >
          <div className="auto-banner-badge">
            <Sparkles size={13} />
            <span>AI Auto-Generated • {playlist.songCount} Matching Songs</span>
          </div>

          <h1 className="auto-banner-title">{playlist.title}</h1>
          <p className="auto-banner-desc">{playlist.description}</p>

          <div className="auto-banner-actions">
            <button
              className="auto-play-btn"
              onClick={handlePlayAll}
              disabled={loading || !playlist.songs?.length}
            >
              <Play size={18} fill="#08060d" strokeWidth={0} />
              <span>Play All</span>
            </button>

            <button
              className="auto-refresh-btn"
              onClick={() => loadPlaylist(activeType)}
              disabled={loading}
              title="Regenerate with fresh matches"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Matching...' : 'Refresh Mix'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Explanation helper */}
      <div style={{
        margin: '0 18px 12px 18px',
        padding: '10px 14px',
        borderRadius: '14px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '0.78rem',
        color: 'rgba(255, 255, 255, 0.65)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Sparkles size={14} color="#ff85a2" style={{ flexShrink: 0 }} />
        <span>
          {recentSongs.length > 0
            ? `Generated from your recent listening (${recentSongs.slice(0, 2).map(s => s.title).join(', ')}) & matching artists.`
            : 'Start listening to any songs to train your personalized auto-mix recommendations!'}
        </span>
      </div>

      {/* Song List */}
      <div style={{ paddingBottom: '30px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.5)' }}>
            <div className="equalizer" style={{ justifyContent: 'center', marginBottom: '12px' }}>
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
            <span>Generating fresh matching songs...</span>
          </div>
        ) : playlist?.songs?.length > 0 ? (
          playlist.songs.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              playlist={playlist.songs}
              onAddToPlaylist={onOpenAddToPlaylist}
              onSearchArtist={onSearchArtist}
            />
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
            <p>No songs found for this mix yet. Click Refresh to try again!</p>
          </div>
        )}
      </div>
    </div>
  );
}
