import React, { useState, useEffect } from 'react';
import { Play, Disc3, Sparkles } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

const CATEGORY_CHIPS = [
  { id: 'all',     label: 'All' },
  { id: 'india',   label: 'India & Desi' },
  { id: 'charts',  label: 'Top Charts' },
  { id: 'genres',  label: 'Rap & Pop' },
  { id: 'moods',   label: 'Chill & Focus' },
  { id: 'decades', label: 'Classics' }
];

export default function SpotifyPlaylistsSection({ onSelectPlaylist }) {
  const { playSong } = useMusic();
  const [playlists, setPlaylists] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [playingPlaylistKey, setPlayingPlaylistKey] = useState(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/spotify/playlists');
        const data = await res.json();
        if (data && data.playlists) {
          setPlaylists(data.playlists);
        }
      } catch (err) {
        console.error('Failed to load playlists:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  const filteredPlaylists = activeCategory === 'all'
    ? playlists
    : playlists.filter(p => p.category === activeCategory);

  // Quick 1-click play of the playlist
  const handleQuickPlay = async (e, playlist) => {
    e.stopPropagation();
    try {
      setPlayingPlaylistKey(playlist.key);
      const res = await fetch(`/api/spotify/playlist/${playlist.key}`);
      const data = await res.json();
      if (data && data.songs && data.songs.length > 0) {
        playSong(data.songs[0], data.songs);
      }
    } catch (err) {
      console.error('Failed to quick play playlist:', err);
    } finally {
      setPlayingPlaylistKey(null);
    }
  };

  return (
    <div style={{ marginBottom: '18px' }}>
      {/* Section Header */}
      <div className="section-header" style={{ marginTop: '14px', marginBottom: '8px' }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={19} color="#ff3b68" />
          <span>Featured Curated Mixes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="section-subtitle" style={{ color: '#ff758c', fontWeight: 700 }}>
            {playlists.length || 24} Playlists
          </span>
        </div>
      </div>

      {/* Category Pills */}
      <div style={{
        display: 'flex',
        gap: '7px',
        overflowX: 'auto',
        margin: '0 -16px',
        padding: '2px 16px 10px 16px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {CATEGORY_CHIPS.map(chip => (
          <button
            key={chip.id}
            onClick={() => setActiveCategory(chip.id)}
            style={{
              whiteSpace: 'nowrap',
              padding: '6px 14px',
              borderRadius: '100px',
              border: activeCategory === chip.id ? '1px solid rgba(255, 59, 104, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeCategory === chip.id ? 'rgba(255, 59, 104, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: activeCategory === chip.id ? '#ff758c' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.78rem',
              fontWeight: activeCategory === chip.id ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Playlists Horizontal Row */}
      <div className="horizontal-scroll-row">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '148px',
                minWidth: '148px',
                maxWidth: '148px',
                height: '208px',
                flex: '0 0 148px',
                borderRadius: '18px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                opacity: 0.5
              }}
            >
              <div style={{ width: '100%', height: '128px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.07)', marginBottom: '8px' }} />
              <div style={{ width: '75%', height: '14px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.07)', marginBottom: '4px' }} />
              <div style={{ width: '50%', height: '11px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.04)' }} />
            </div>
          ))
        ) : (
          filteredPlaylists.map(pl => (
            <div
              key={pl.key}
              onClick={() => onSelectPlaylist(pl)}
              style={{
                width: '148px',
                minWidth: '148px',
                maxWidth: '148px',
                height: '216px',
                flex: '0 0 148px',
                borderRadius: '18px',
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '9px',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                position: 'relative',
                userSelect: 'none'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.45)';
                e.currentTarget.style.borderColor = 'rgba(255, 59, 104, 0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              {/* Cover Image with 1-Click Play Overlay */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '130px',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '8px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
              }}>
                <img
                  src={pl.cover}
                  alt={pl.title}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  onError={e => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80';
                  }}
                />

                {/* Curated Badge Pill Top Left */}
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  borderRadius: '100px',
                  padding: '3px 7px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Sparkles size={10} color="#ff758c" />
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#ff758c' }}>
                    {pl.badge || 'Curated'}
                  </span>
                </div>

                {/* 1-Click Play Overlay Button */}
                <button
                  onClick={e => handleQuickPlay(e, pl)}
                  title={`Play ${pl.title}`}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ff3b68, #a238ff)',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, filter 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none'; }}
                >
                  {playingPlaylistKey === pl.key ? (
                    <Disc3 size={18} className="spin-slow" />
                  ) : (
                    <Play size={15} fill="#ffffff" strokeWidth={0} />
                  )}
                </button>
              </div>

              {/* Text Meta */}
              <div style={{
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: '3px'
              }}>
                {pl.title}
              </div>

              <div style={{
                fontSize: '0.72rem',
                color: 'rgba(255, 255, 255, 0.55)',
                lineHeight: 1.25,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '26px'
              }}>
                {pl.description}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
